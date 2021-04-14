import { schemas, SchemaValidator } from '@0x/json-schemas';
import { FillQuoteTransformerOrderType, Signature } from '@0x/protocol-utils';
import { TakerRequestQueryParams, V4RFQFirmQuote, V4RFQIndicativeQuote, V4SignedRfqOrder } from '@0x/quote-server';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import axios, { AxiosInstance } from 'axios';

import { constants } from '../constants';
import {
    AltQuoteModel,
    AltRfqMakerAssetOfferings,
    LogFunction,
    MarketOperation,
    RfqMakerAssetOfferings,
    RfqPairType,
    RfqRequestOpts,
    SignedNativeOrder,
    TypedMakerUrl,
} from '../types';

import { returnQuoteFromAltMMAsync } from './alt_mm_implementation_utils';
import { RfqMakerBlacklist } from './rfq_maker_blacklist';

const MAKER_TIMEOUT_STREAK_LENGTH = 10;
const MAKER_TIMEOUT_BLACKLIST_DURATION_MINUTES = 10;
const rfqMakerBlacklist = new RfqMakerBlacklist(MAKER_TIMEOUT_STREAK_LENGTH, MAKER_TIMEOUT_BLACKLIST_DURATION_MINUTES);

interface RfqQuote<T> {
    response: T;
    makerUri: string;
}

/**
 * Request quotes from RFQ-T providers
 */

function hasExpectedAddresses(comparisons: Array<[string, string]>): boolean {
    return comparisons.every(c => c[0].toLowerCase() === c[1].toLowerCase());
}

function convertIfAxiosError(error: any): Error | object /* axios' .d.ts has AxiosError.toJSON() returning object */ {
    if (error.hasOwnProperty('isAxiosError') && error.isAxiosError) {
        const { message, name, config } = error;
        const { headers, timeout, httpsAgent } = config;
        const { keepAlive, keepAliveMsecs, sockets } = httpsAgent;

        const socketCounts: { [key: string]: number } = {};
        for (const socket of Object.keys(sockets)) {
            socketCounts[socket] = sockets[socket].length;
        }

        return {
            message,
            name,
            config: {
                headers,
                timeout,
                httpsAgent: {
                    keepAlive,
                    keepAliveMsecs,
                    socketCounts,
                },
            },
        };
    } else {
        return error;
    }
}

function nativeDataToId(data: { signature: Signature }): string {
    const { v, r, s } = data.signature;
    return `${v}${r}${s}`;
}

export class QuoteRequestor {
    private readonly _schemaValidator: SchemaValidator = new SchemaValidator();
    private readonly _orderSignatureToMakerUri: { [signature: string]: string } = {};

    public static makeQueryParameters(
        txOrigin: string,
        takerAddress: string,
        marketOperation: MarketOperation,
        buyTokenAddress: string, // maker token
        sellTokenAddress: string, // taker token
        assetFillAmount: BigNumber,
        comparisonPrice?: BigNumber,
        isLastLook?: boolean | undefined,
    ): TakerRequestQueryParams {
        const { buyAmountBaseUnits, sellAmountBaseUnits } =
            marketOperation === MarketOperation.Buy
                ? {
                      buyAmountBaseUnits: assetFillAmount,
                      sellAmountBaseUnits: undefined,
                  }
                : {
                      sellAmountBaseUnits: assetFillAmount,
                      buyAmountBaseUnits: undefined,
                  };

        const requestParamsWithBigNumbers: Pick<
            TakerRequestQueryParams,
            | 'txOrigin'
            | 'takerAddress'
            | 'buyTokenAddress'
            | 'sellTokenAddress'
            | 'comparisonPrice'
            | 'isLastLook'
            | 'protocolVersion'
        > = {
            txOrigin,
            takerAddress,
            buyTokenAddress,
            sellTokenAddress,
            comparisonPrice: comparisonPrice === undefined ? undefined : comparisonPrice.toString(),
            protocolVersion: '4',
        };
        if (isLastLook) {
            requestParamsWithBigNumbers.isLastLook = isLastLook.toString();
        }

        // convert BigNumbers to strings
        // so they are digestible by axios
        if (sellAmountBaseUnits) {
            return {
                ...requestParamsWithBigNumbers,
                sellAmountBaseUnits: sellAmountBaseUnits.toString(),
            };
        } else if (buyAmountBaseUnits) {
            return {
                ...requestParamsWithBigNumbers,
                buyAmountBaseUnits: buyAmountBaseUnits.toString(),
            };
        } else {
            throw new Error('Neither "buyAmountBaseUnits" or "sellAmountBaseUnits" were defined');
        }
    }

    private static _makerSupportsPair(
        typedMakerUrl: TypedMakerUrl,
        makerToken: string,
        takerToken: string,
        altMakerAssetOfferings: AltRfqMakerAssetOfferings | undefined,
        assetOfferings: RfqMakerAssetOfferings | undefined,
    ): boolean {
        if (typedMakerUrl.pairType === RfqPairType.Standard && assetOfferings) {
            for (const assetPair of assetOfferings[typedMakerUrl.url]) {
                if (
                    (assetPair[0] === makerToken && assetPair[1] === takerToken) ||
                    (assetPair[0] === takerToken && assetPair[1] === makerToken)
                ) {
                    return true;
                }
            }
        } else if (typedMakerUrl.pairType === RfqPairType.Alt && altMakerAssetOfferings) {
            for (const altAssetPair of altMakerAssetOfferings[typedMakerUrl.url]) {
                if (
                    (altAssetPair.baseAsset === makerToken && altAssetPair.quoteAsset === takerToken) ||
                    (altAssetPair.baseAsset === takerToken && altAssetPair.quoteAsset === makerToken)
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    constructor(
        private readonly _rfqtAssetOfferings: RfqMakerAssetOfferings,
        private readonly _rfqmAssetOfferings: RfqMakerAssetOfferings,
        private readonly _quoteRequestorHttpClient: AxiosInstance,
        private readonly _altRfqCreds?: { altRfqApiKey: string; altRfqProfile: string },
        private readonly _warningLogger: LogFunction = constants.DEFAULT_WARNING_LOGGER,
        private readonly _infoLogger: LogFunction = constants.DEFAULT_INFO_LOGGER,
        private readonly _expiryBufferMs: number = constants.DEFAULT_SWAP_QUOTER_OPTS.expiryBufferMs,
    ) {
        rfqMakerBlacklist.infoLogger = this._infoLogger;
    }

    public async requestRfqmFirmQuotesAsync(
        makerToken: string, // maker token
        takerToken: string, // taker token
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
    ): Promise<SignedNativeOrder[]> {
        const _opts: RfqRequestOpts = {
            ...constants.DEFAULT_RFQT_REQUEST_OPTS,
            ...options,
            isLastLook: true,
        };

        return this._fetchAndValidateFirmQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            _opts,
            this._rfqmAssetOfferings,
        );
    }

    public async requestRfqtFirmQuotesAsync(
        makerToken: string, // maker token
        takerToken: string, // taker token
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
    ): Promise<SignedNativeOrder[]> {
        const _opts: RfqRequestOpts = { ...constants.DEFAULT_RFQT_REQUEST_OPTS, ...options };
        if (!_opts.txOrigin || [undefined, '', '0x', NULL_ADDRESS].includes(_opts.txOrigin)) {
            throw new Error('RFQ-T firm quotes require the presence of a tx origin');
        }

        return this._fetchAndValidateFirmQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            _opts,
            this._rfqtAssetOfferings,
        );
    }

    public async requestRfqmIndicativeQuotesAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
    ): Promise<V4RFQIndicativeQuote[]> {
        const _opts: RfqRequestOpts = {
            ...constants.DEFAULT_RFQT_REQUEST_OPTS,
            ...options,
            isLastLook: true,
        };

        return this._fetchAndValidateIndicativeQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            _opts,
            this._rfqmAssetOfferings,
        );
    }

    public async requestRfqtIndicativeQuotesAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
    ): Promise<V4RFQIndicativeQuote[]> {
        const _opts: RfqRequestOpts = { ...constants.DEFAULT_RFQT_REQUEST_OPTS, ...options };
        // Originally a takerAddress was required for indicative quotes, but
        // now we've eliminated that requirement.  @0x/quote-server, however,
        // is still coded to expect a takerAddress.  So if the client didn't
        // send one, just use the null address to satisfy the quote server's
        // expectations.
        if (!_opts.takerAddress) {
            _opts.takerAddress = constants.NULL_ADDRESS;
        }
        if (!_opts.txOrigin) {
            _opts.txOrigin = constants.NULL_ADDRESS;
        }
        return this._fetchAndValidateIndicativeQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            _opts,
            this._rfqtAssetOfferings,
        );
    }

    /**
     * Given an order signature, returns the makerUri that the order originated from
     */
    public getMakerUriForSignature(signature: Signature): string | undefined {
        return this._orderSignatureToMakerUri[nativeDataToId({ signature })];
    }

    private _isValidRfqtIndicativeQuoteResponse(response: V4RFQIndicativeQuote): boolean {
        const requiredKeys: Array<keyof V4RFQIndicativeQuote> = [
            'makerAmount',
            'takerAmount',
            'makerToken',
            'takerToken',
            'expiry',
        ];

        for (const k of requiredKeys) {
            if (response[k] === undefined) {
                return false;
            }
        }
        // TODO (jacob): I have a feeling checking 5 schemas is slower then checking one
        const hasValidMakerAssetAmount = this._schemaValidator.isValid(response.makerAmount, schemas.wholeNumberSchema);
        const hasValidTakerAssetAmount = this._schemaValidator.isValid(response.takerAmount, schemas.wholeNumberSchema);
        const hasValidMakerToken = this._schemaValidator.isValid(response.makerToken, schemas.hexSchema);
        const hasValidTakerToken = this._schemaValidator.isValid(response.takerToken, schemas.hexSchema);
        const hasValidExpirationTimeSeconds = this._schemaValidator.isValid(response.expiry, schemas.wholeNumberSchema);
        if (
            !hasValidMakerAssetAmount ||
            !hasValidTakerAssetAmount ||
            !hasValidMakerToken ||
            !hasValidTakerToken ||
            !hasValidExpirationTimeSeconds
        ) {
            return false;
        }
        return true;
    }

    private _isExpirationTooSoon(expirationTimeSeconds: BigNumber): boolean {
        const expirationTimeMs = expirationTimeSeconds.times(constants.ONE_SECOND_MS);
        const currentTimeMs = new BigNumber(Date.now());
        return expirationTimeMs.isLessThan(currentTimeMs.plus(this._expiryBufferMs));
    }

    private async _getQuotesAsync<ResponseT>(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
        quoteType: 'firm' | 'indicative',
        assetOfferings: RfqMakerAssetOfferings,
    ): Promise<Array<RfqQuote<ResponseT>>> {
        const requestParams = QuoteRequestor.makeQueryParameters(
            options.txOrigin,
            options.takerAddress,
            marketOperation,
            makerToken,
            takerToken,
            assetFillAmount,
            comparisonPrice,
            options.isLastLook,
        );

        const quotePath = (() => {
            switch (quoteType) {
                case 'firm':
                    return 'quote';
                case 'indicative':
                    return 'price';
                default:
                    throw new Error(`Unexpected quote type ${quoteType}`);
            }
        })();

        const standardUrls = Object.keys(assetOfferings).map(
            (mm: string): TypedMakerUrl => {
                return { pairType: RfqPairType.Standard, url: mm };
            },
        );
        const altUrls = options.altRfqAssetOfferings
            ? Object.keys(options.altRfqAssetOfferings).map(
                  (mm: string): TypedMakerUrl => {
                      return { pairType: RfqPairType.Alt, url: mm };
                  },
              )
            : [];

        const typedMakerUrls = standardUrls.concat(altUrls);

        const timeoutMs =
            options.makerEndpointMaxResponseTimeMs ||
            constants.DEFAULT_RFQT_REQUEST_OPTS.makerEndpointMaxResponseTimeMs!;
        const bufferMs = 20;

        // Set Timeout on CancelToken
        const cancelTokenSource = axios.CancelToken.source();
        setTimeout(() => {
            cancelTokenSource.cancel('timeout via cancel token');
        }, timeoutMs + bufferMs);

        const quotePromises = typedMakerUrls.map(async typedMakerUrl => {
            // filter out requests to skip
            const isBlacklisted = rfqMakerBlacklist.isMakerBlacklisted(typedMakerUrl.url);
            const partialLogEntry = { url: typedMakerUrl.url, quoteType, requestParams, isBlacklisted };
            if (isBlacklisted) {
                this._infoLogger({ rfqtMakerInteraction: { ...partialLogEntry } });
                return;
            } else if (
                !QuoteRequestor._makerSupportsPair(
                    typedMakerUrl,
                    makerToken,
                    takerToken,
                    options.altRfqAssetOfferings,
                    assetOfferings,
                )
            ) {
                return;
            } else {
                // make request to MM
                const timeBeforeAwait = Date.now();
                try {
                    if (typedMakerUrl.pairType === RfqPairType.Standard) {
                        const response = await this._quoteRequestorHttpClient.get(`${typedMakerUrl.url}/${quotePath}`, {
                            headers: { '0x-api-key': options.apiKey },
                            params: requestParams,
                            timeout: timeoutMs,
                            cancelToken: cancelTokenSource.token,
                        });
                        const latencyMs = Date.now() - timeBeforeAwait;
                        this._infoLogger({
                            rfqtMakerInteraction: {
                                ...partialLogEntry,
                                response: {
                                    included: true,
                                    apiKey: options.apiKey,
                                    takerAddress: requestParams.takerAddress,
                                    txOrigin: requestParams.txOrigin,
                                    statusCode: response.status,
                                    latencyMs,
                                },
                            },
                        });
                        rfqMakerBlacklist.logTimeoutOrLackThereof(typedMakerUrl.url, latencyMs >= timeoutMs);
                        return { response: response.data, makerUri: typedMakerUrl.url };
                    } else {
                        if (this._altRfqCreds === undefined) {
                            throw new Error(`don't have credentials for alt MM`);
                        }
                        const quote = await returnQuoteFromAltMMAsync<ResponseT>(
                            typedMakerUrl.url,
                            this._altRfqCreds.altRfqApiKey,
                            this._altRfqCreds.altRfqProfile,
                            options.apiKey,
                            quoteType === 'firm' ? AltQuoteModel.Firm : AltQuoteModel.Indicative,
                            makerToken,
                            takerToken,
                            timeoutMs,
                            options.altRfqAssetOfferings || {},
                            requestParams,
                            this._quoteRequestorHttpClient,
                            this._warningLogger,
                            cancelTokenSource.token,
                        );

                        const latencyMs = Date.now() - timeBeforeAwait;
                        this._infoLogger({
                            rfqtMakerInteraction: {
                                ...partialLogEntry,
                                response: {
                                    included: true,
                                    apiKey: options.apiKey,
                                    takerAddress: requestParams.takerAddress,
                                    txOrigin: requestParams.txOrigin,
                                    statusCode: quote.status,
                                    latencyMs,
                                },
                            },
                        });
                        rfqMakerBlacklist.logTimeoutOrLackThereof(typedMakerUrl.url, latencyMs >= timeoutMs);
                        return { response: quote.data, makerUri: typedMakerUrl.url };
                    }
                } catch (err) {
                    // log error if any
                    const latencyMs = Date.now() - timeBeforeAwait;
                    this._infoLogger({
                        rfqtMakerInteraction: {
                            ...partialLogEntry,
                            response: {
                                included: false,
                                apiKey: options.apiKey,
                                takerAddress: requestParams.takerAddress,
                                txOrigin: requestParams.txOrigin,
                                statusCode: err.response ? err.response.status : undefined,
                                latencyMs,
                            },
                        },
                    });
                    rfqMakerBlacklist.logTimeoutOrLackThereof(typedMakerUrl.url, latencyMs >= timeoutMs);
                    this._warningLogger(
                        convertIfAxiosError(err),
                        `Failed to get RFQ-T ${quoteType} quote from market maker endpoint ${
                            typedMakerUrl.url
                        } for API key ${options.apiKey} for taker address ${options.takerAddress} and tx origin ${
                            options.txOrigin
                        }`,
                    );
                    return;
                }
            }
        });

        const results = (await Promise.all(quotePromises)).filter(x => x !== undefined);
        return results as Array<RfqQuote<ResponseT>>;
    }
    private async _fetchAndValidateFirmQuotesAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
        assetOfferings: RfqMakerAssetOfferings,
    ): Promise<SignedNativeOrder[]> {
        const quotesRaw = await this._getQuotesAsync<V4RFQFirmQuote>(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            options,
            'firm',
            assetOfferings,
        );
        const quotes = quotesRaw.map(result => ({ ...result, response: result.response.signedOrder }));

        // validate
        const validationFunction = (o: V4SignedRfqOrder) => {
            try {
                // Handle the validate throwing, i.e if it isn't an object or json response
                return this._schemaValidator.isValid(o, schemas.v4RfqSignedOrderSchema);
            } catch (e) {
                return false;
            }
        };
        const validQuotes = quotes.filter(result => {
            const order = result.response;
            if (!validationFunction(order)) {
                this._warningLogger(result, 'Invalid RFQ-T firm quote received, filtering out');
                return false;
            }
            if (
                !hasExpectedAddresses([
                    [makerToken, order.makerToken],
                    [takerToken, order.takerToken],
                    [options.takerAddress, order.taker],
                    [options.txOrigin, order.txOrigin],
                ])
            ) {
                this._warningLogger(
                    order,
                    'Unexpected token, tx origin or taker address in RFQ-T order, filtering out',
                );
                return false;
            }
            if (this._isExpirationTooSoon(new BigNumber(order.expiry))) {
                this._warningLogger(order, 'Expiry too soon in RFQ-T firm quote, filtering out');
                return false;
            } else {
                return true;
            }
        });

        // Save the maker URI for later and return just the order
        const rfqQuotes = validQuotes.map(result => {
            const { signature, ...rest } = result.response;
            const order: SignedNativeOrder = {
                order: {
                    ...rest,
                    makerAmount: new BigNumber(result.response.makerAmount),
                    takerAmount: new BigNumber(result.response.takerAmount),
                    expiry: new BigNumber(result.response.expiry),
                    salt: new BigNumber(result.response.salt),
                },
                type: FillQuoteTransformerOrderType.Rfq,
                signature,
            };
            this._orderSignatureToMakerUri[nativeDataToId(result.response)] = result.makerUri;
            return order;
        });
        return rfqQuotes;
    }

    private async _fetchAndValidateIndicativeQuotesAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
        assetOfferings: RfqMakerAssetOfferings,
    ): Promise<V4RFQIndicativeQuote[]> {
        // fetch quotes
        const rawQuotes = await this._getQuotesAsync<V4RFQIndicativeQuote>(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            options,
            'indicative',
            assetOfferings,
        );

        // validate
        const validationFunction = (o: V4RFQIndicativeQuote) => this._isValidRfqtIndicativeQuoteResponse(o);
        const validQuotes = rawQuotes.filter(result => {
            const order = result.response;
            if (!validationFunction(order)) {
                this._warningLogger(result, 'Invalid RFQ indicative quote received, filtering out');
                return false;
            }
            if (!hasExpectedAddresses([[makerToken, order.makerToken], [takerToken, order.takerToken]])) {
                this._warningLogger(order, 'Unexpected token or taker address in RFQ order, filtering out');
                return false;
            }
            if (this._isExpirationTooSoon(new BigNumber(order.expiry))) {
                this._warningLogger(order, 'Expiry too soon in RFQ indicative quote, filtering out');
                return false;
            } else {
                return true;
            }
        });
        const quotes = validQuotes.map(r => r.response);
        quotes.forEach(q => {
            q.makerAmount = new BigNumber(q.makerAmount);
            q.takerAmount = new BigNumber(q.takerAmount);
            q.expiry = new BigNumber(q.expiry);
        });
        return quotes;
    }
}
