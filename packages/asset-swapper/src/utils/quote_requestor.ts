import { schemas, SchemaValidator } from '@0x/json-schemas';
import { FillQuoteTransformerOrderType, RfqOrder, Signature } from '@0x/protocol-utils';
import { TakerRequestQueryParams, V4RFQFirmQuote, V4RFQIndicativeQuote, V4SignedRfqOrder } from '@0x/quote-server';
import { BigNumber } from '@0x/utils';
import Axios, { AxiosInstance } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

import { constants } from '../constants';
import { LogFunction, MarketOperation, RfqtMakerAssetOfferings, RfqtRequestOpts } from '../types';

import { ONE_SECOND_MS } from './market_operation_utils/constants';
import { SignedNativeOrder } from './market_operation_utils/types';
import { RfqMakerBlacklist } from './rfq_maker_blacklist';

// tslint:disable-next-line: custom-no-magic-numbers
const KEEP_ALIVE_TTL = 5 * 60 * ONE_SECOND_MS;

export const quoteRequestorHttpClient: AxiosInstance = Axios.create({
    httpAgent: new HttpAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
    httpsAgent: new HttpsAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
});

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

function hasExpectedTokenAddresses(comparisons: Array<[string, string]>): boolean {
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

export class QuoteRequestor {
    private readonly _schemaValidator: SchemaValidator = new SchemaValidator();
    private readonly _orderSignatureToMakerUri: { [hash: string]: string } = {};

    public static makeQueryParameters(
        takerAddress: string,
        marketOperation: MarketOperation,
        buyTokenAddress: string, // maker token
        sellTokenAddress: string, // taker token
        assetFillAmount: BigNumber,
        comparisonPrice?: BigNumber,
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
            'buyTokenAddress' | 'sellTokenAddress' | 'takerAddress' | 'comparisonPrice' | 'protocolVersion'
        > = {
            takerAddress,
            comparisonPrice: comparisonPrice === undefined ? undefined : comparisonPrice.toString(),
            buyTokenAddress,
            sellTokenAddress,
            protocolVersion: '4',
        };

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

    constructor(
        private readonly _rfqtAssetOfferings: RfqtMakerAssetOfferings,
        private readonly _warningLogger: LogFunction = constants.DEFAULT_WARNING_LOGGER,
        private readonly _infoLogger: LogFunction = constants.DEFAULT_INFO_LOGGER,
        private readonly _expiryBufferMs: number = constants.DEFAULT_SWAP_QUOTER_OPTS.expiryBufferMs,
    ) {
        rfqMakerBlacklist.infoLogger = this._infoLogger;
    }

    public async requestRfqtFirmQuotesAsync(
        makerToken: string, // maker token
        takerToken: string, // taker token
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqtRequestOpts,
    ): Promise<SignedNativeOrder[]> {
        const _opts: RfqtRequestOpts = { ...constants.DEFAULT_RFQT_REQUEST_OPTS, ...options };
        if (
            _opts.takerAddress === undefined ||
            _opts.takerAddress === '' ||
            _opts.takerAddress === '0x' ||
            !_opts.takerAddress ||
            _opts.takerAddress === constants.NULL_ADDRESS
        ) {
            throw new Error('RFQ-T firm quotes require the presence of a taker address');
        }

        const quotesRaw = await this._getQuotesAsync<V4RFQFirmQuote>(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            _opts,
            'firm',
        );
        const quotes = quotesRaw.map(result => ({ ...result, response: result.response.signedOrder }));

        // validate
        const validationFunction = (o: V4SignedRfqOrder) => this._schemaValidator.isValid(o, schemas.orderSchema); //  TODO (xianny): might not be the right schema, placeholde
        const validQuotes = quotes.filter(result => {
            const order = result.response;
            if (!validationFunction(order)) {
                this._warningLogger(result, 'Invalid RFQ-T firm quote received, filtering out');
                return false;
            }
            if (
                !hasExpectedTokenAddresses([
                    [makerToken, order.makerToken],
                    [takerToken, order.takerToken],
                    [_opts.takerAddress, order.taker],
                ])
            ) {
                this._warningLogger(order, 'Unexpected token or taker address in RFQ-T order, filtering out');
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
            const order: SignedNativeOrder = {
                order: result.response,
                type: FillQuoteTransformerOrderType.Rfq,
                signature: result.response.signature,
            };
            this._orderSignatureToMakerUri[result.response.signature.toString()] = result.makerUri; // todo (xianny): hack
            return order;
        });
        return rfqQuotes;
    }

    public async requestRfqtIndicativeQuotesAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqtRequestOpts,
    ): Promise<V4RFQIndicativeQuote[]> {
        const _opts: RfqtRequestOpts = { ...constants.DEFAULT_RFQT_REQUEST_OPTS, ...options };
        // Originally a takerAddress was required for indicative quotes, but
        // now we've eliminated that requirement.  @0x/quote-server, however,
        // is still coded to expect a takerAddress.  So if the client didn't
        // send one, just use the null address to satisfy the quote server's
        // expectations.
        if (!_opts.takerAddress) {
            _opts.takerAddress = constants.NULL_ADDRESS;
        }
        const quotes = await this._getQuotesAsync<V4RFQIndicativeQuote>(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            _opts,
            'indicative',
        );

        // validate
        const validationFunction = (o: V4RFQIndicativeQuote) => this._isValidRfqtIndicativeQuoteResponse(o); //  TODO (xianny): might not be the right schema, placeholde
        const validQuotes = quotes.filter(result => {
            const order = result.response;
            if (!validationFunction(order)) {
                this._warningLogger(result, 'Invalid RFQ-T indicative quote received, filtering out');
                return false;
            }
            if (!hasExpectedTokenAddresses([[makerToken, order.makerToken], [takerToken, order.takerToken]])) {
                this._warningLogger(order, 'Unexpected token or taker address in RFQ-T order, filtering out');
                return false;
            }
            if (this._isExpirationTooSoon(new BigNumber(order.expiry))) {
                this._warningLogger(order, 'Expiry too soon in RFQ-T indicative quote, filtering out');
                return false;
            } else {
                return true;
            }
        });
        return validQuotes.map(r => r.response);
    }

    /**
     * Given an order signature, returns the makerUri that the order originated from
     */
    public getMakerUriForSignature(signature: Signature): string | undefined {
        return this._orderSignatureToMakerUri[signature.toString()]; // todo (xianny): hack
    }

    private _isValidRfqtIndicativeQuoteResponse(response: V4RFQIndicativeQuote): boolean {
        const hasValidMakerAssetAmount =
            response.makerAmount !== undefined &&
            this._schemaValidator.isValid(response.makerAmount, schemas.wholeNumberSchema);
        const hasValidTakerAssetAmount =
            response.takerAmount !== undefined &&
            this._schemaValidator.isValid(response.takerAmount, schemas.wholeNumberSchema);
        const hasValidMakerToken =
            response.makerToken !== undefined && this._schemaValidator.isValid(response.makerToken, schemas.hexSchema);
        const hasValidTakerToken =
            response.takerToken !== undefined && this._schemaValidator.isValid(response.takerToken, schemas.hexSchema);
        const hasValidExpirationTimeSeconds =
            response.expiry !== undefined && this._schemaValidator.isValid(response.expiry, schemas.wholeNumberSchema);
        if (
            hasValidMakerAssetAmount &&
            hasValidTakerAssetAmount &&
            hasValidMakerToken &&
            hasValidTakerToken &&
            hasValidExpirationTimeSeconds
        ) {
            return true;
        }
        return false;
    }

    private _makerSupportsPair(makerUrl: string, makerToken: string, takerToken: string): boolean {
        for (const assetPair of this._rfqtAssetOfferings[makerUrl]) {
            if (
                (assetPair[0] === makerToken && assetPair[1] === takerToken) ||
                (assetPair[0] === takerToken && assetPair[1] === makerToken)
            ) {
                return true;
            }
        }
        return false;
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
        options: RfqtRequestOpts,
        quoteType: 'firm' | 'indicative',
    ): Promise<Array<RfqQuote<ResponseT>>> {
        const requestParams = QuoteRequestor.makeQueryParameters(
            options.takerAddress,
            marketOperation,
            makerToken,
            takerToken,
            assetFillAmount,
            comparisonPrice,
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

        const makerUrls = Object.keys(this._rfqtAssetOfferings);
        const quotePromises = makerUrls.map(async url => {
            // filter out requests to skip
            const isBlacklisted = rfqMakerBlacklist.isMakerBlacklisted(url);
            const partialLogEntry = { url, quoteType, requestParams, isBlacklisted };
            if (isBlacklisted) {
                this._infoLogger({ rfqtMakerInteraction: { ...partialLogEntry } });
                return;
            } else if (!this._makerSupportsPair(url, makerToken, takerToken)) {
                return;
            } else {
                // make request to MMs
                const timeBeforeAwait = Date.now();
                const maxResponseTimeMs =
                    options.makerEndpointMaxResponseTimeMs === undefined
                        ? constants.DEFAULT_RFQT_REQUEST_OPTS.makerEndpointMaxResponseTimeMs!
                        : options.makerEndpointMaxResponseTimeMs;
                try {
                    const response = await quoteRequestorHttpClient.get<ResponseT>(`${url}/${quotePath}`, {
                        headers: { '0x-api-key': options.apiKey },
                        params: requestParams,
                        timeout: maxResponseTimeMs,
                    });
                    const latencyMs = Date.now() - timeBeforeAwait;
                    this._infoLogger({
                        rfqtMakerInteraction: {
                            ...partialLogEntry,
                            response: {
                                included: true,
                                apiKey: options.apiKey,
                                takerAddress: requestParams.takerAddress,
                                statusCode: response.status,
                                latencyMs,
                            },
                        },
                    });
                    rfqMakerBlacklist.logTimeoutOrLackThereof(url, latencyMs >= maxResponseTimeMs);
                    return { response: response.data, makerUri: url };
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
                                statusCode: err.response ? err.response.status : undefined,
                                latencyMs,
                            },
                        },
                    });
                    rfqMakerBlacklist.logTimeoutOrLackThereof(url, latencyMs >= maxResponseTimeMs);
                    this._warningLogger(
                        convertIfAxiosError(err),
                        `Failed to get RFQ-T ${quoteType} quote from market maker endpoint ${url} for API key ${
                            options.apiKey
                        } for taker address ${options.takerAddress}`,
                    );
                    return;
                }
            }
        });
        const results = (await Promise.all(quotePromises)).filter(x => x !== undefined);
        return results as Array<RfqQuote<ResponseT>>;
    }
}
