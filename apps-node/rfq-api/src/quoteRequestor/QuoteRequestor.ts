import { schemas, SchemaValidator } from '@0x/json-schemas';
import { FillQuoteTransformerOrderType, Signature } from '@0x/protocol-utils';
import { MarketOperation } from '@0x/types';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import axios, { AxiosInstance } from 'axios';

import { Integrator, RFQ_PRICE_ENDPOINT_TIMEOUT_MS } from '../config';
import { ONE_SECOND_MS } from '../core/constants';
import { toPairString } from '../core/pair_utils';
import { Fee, SignedNativeOrder } from '../core/types';
import { logger } from '../logger';
import {
    TakerRequestQueryParamsUnnested,
    V4RFQFirmQuote,
    V4SignedRfqOrder,
    V4RFQIndicativeQuote,
} from '../quote-server/types';
import { RfqMakerAssetOfferings } from '../utils/rfq_maker_manager';

import { returnQuoteFromAltMMAsync } from './altMmImplementaionUtils';
import { AltQuoteModel, AltRfqMakerAssetOfferings } from './altMmTypes';
import { RfqMakerBlacklist } from './rfqMakerBlacklist';

// Matches value at
// https://github.com/0xProject/protocol/blob/d3d4a08f917a084f72b649fc1b0b322c22f98129/packages/asset-swapper/src/constants.ts#L34
const EXPIRY_BUFFER_MS = 120000;
const MAKER_TIMEOUT_STREAK_LENGTH = 10;
const MAKER_TIMEOUT_BLACKLIST_DURATION_MINUTES = 10;
const FILL_RATIO_WARNING_LEVEL = 0.99;
const rfqMakerBlacklist = new RfqMakerBlacklist(MAKER_TIMEOUT_STREAK_LENGTH, MAKER_TIMEOUT_BLACKLIST_DURATION_MINUTES);

// Stables
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
const BUSD = '0x4fabb145d64652a948d72533023f6e7a623c7c53';
const TUSD = '0x0000000000085d4780b73119b644ae5ecd22b376';

// Other assets
const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const MATIC = '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0';
const DISABLED_RFQT_V1_TOKENS = [USDC, USDT, DAI, BUSD, TUSD, WETH, WBTC, MATIC];
const DISABLED_RFQT_V1_PAIRS_SET = new Set(
    DISABLED_RFQT_V1_TOKENS.flatMap((token) =>
        DISABLED_RFQT_V1_TOKENS.filter((t) => t !== token).map((otherToken) => toPairString(token, otherToken)),
    ),
);

enum RfqPairType {
    Standard = 'standard',
    Alt = 'alt',
}

interface TypedMakerUrl {
    url: string;
    pairType: RfqPairType;
}

export interface RfqRequestOpts {
    takerAddress: string;
    txOrigin: string;
    integrator: Integrator;
    intentOnFilling: boolean;
    isIndicative?: boolean;
    makerEndpointMaxResponseTimeMs?: number;
    nativeExclusivelyRFQ?: boolean;
    altRfqAssetOfferings?: AltRfqMakerAssetOfferings;
    isLastLook?: boolean;
    fee?: Fee;
}

interface RfqQuote<T> {
    response: T;
    makerUri: string;
}

export interface V4RFQIndicativeQuoteMM extends V4RFQIndicativeQuote {
    makerUri: string;
}

export type SignedNativeOrderMM = SignedNativeOrder & { makerUri?: string };

export interface MetricsProxy {
    /**
     * Increments a counter that is tracking valid Firm Quotes that are dropped due to low expiration.
     * @param isLastLook mark if call is coming from RFQM
     * @param maker the maker address
     */
    incrementExpirationToSoonCounter(isLastLook: boolean, maker: string): void;

    /**
     * Keeps track of summary statistics for expiration on Firm Quotes.
     * @param isLastLook mark if call is coming from RFQM
     * @param maker the maker address
     * @param expirationTimeSeconds the expiration time in seconds
     */
    measureExpirationForValidOrder(isLastLook: boolean, maker: string, expirationTimeSeconds: BigNumber): void;

    /**
     * Increments a counter that tracks when an order is not fully fillable.
     * @param isLastLook mark if call is coming from RFQM
     * @param maker the maker address
     * @param expirationTimeSeconds the expiration time in seconds
     */
    incrementFillRatioWarningCounter(isLastLook: boolean, maker: string): void;

    /**
     * Logs the outcome of a network (HTTP) interaction with a market maker.
     *
     * @param interaction.isLastLook true if the request is RFQM
     * @param interaction.integrator the integrator that is requesting the RFQ quote
     * @param interaction.url the URL of the market maker
     * @param interaction.quoteType indicative or firm quote
     * @param interaction.statusCode the statusCode returned by a market maker
     * @param interaction.latencyMs the latency of the HTTP request (in ms)
     * @param interaction.included if a firm quote that was returned got included in the next step of processing.
     *                             NOTE: this does not mean that the request returned a valid fillable order. It just
     *                             means that the network response was successful.
     */
    logRfqMakerNetworkInteraction(interaction: {
        isLastLook: boolean;
        integrator: Integrator;
        url: string;
        quoteType: 'firm' | 'indicative';
        statusCode: number | undefined;
        latencyMs: number;
        included: boolean;
        sellTokenAddress: string;
        buyTokenAddress: string;
    }): void;
}

/**
 * Request quotes from RFQ-T providers
 */

function hasExpectedAddresses(comparisons: [string, string][]): boolean {
    return comparisons.every((c) => c[0].toLowerCase() === c[1].toLowerCase());
}

// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertIfAxiosError(error: any): Error | object /* axios' .d.ts has AxiosError.toJSON() returning object */ {
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line no-prototype-builtins
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
        fee?: Fee | undefined,
    ): TakerRequestQueryParamsUnnested {
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
            TakerRequestQueryParamsUnnested,
            | 'txOrigin'
            | 'takerAddress'
            | 'buyTokenAddress'
            | 'sellTokenAddress'
            | 'comparisonPrice'
            | 'isLastLook'
            | 'protocolVersion'
            | 'feeAmount'
            | 'feeToken'
            | 'feeType'
        > = {
            txOrigin,
            takerAddress,
            buyTokenAddress,
            sellTokenAddress,
            comparisonPrice: comparisonPrice === undefined ? undefined : comparisonPrice.toString(),
            protocolVersion: '4',
        };
        if (isLastLook) {
            if (fee === undefined) {
                throw new Error(`isLastLook cannot be passed without a fee parameter`);
            }
            requestParamsWithBigNumbers.isLastLook = isLastLook.toString();
            requestParamsWithBigNumbers.feeAmount = fee.amount.toString();
            requestParamsWithBigNumbers.feeToken = fee.token;
            requestParamsWithBigNumbers.feeType = fee.type;
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

    /**
     * Gets both standard RFQ makers and "alternative" RFQ makers and combines them together
     * in a single configuration map. If an integration key whitelist is present, it will be used
     * to filter a specific makers.
     *
     * @param options the RfqmRequestOptions passed in
     * @param assetOfferings the RFQM or RFQT maker offerings
     * @returns a list of TypedMakerUrl instances
     */
    public static getTypedMakerUrlsAndWhitelist(
        options: { integrator: Integrator; altRfqAssetOfferings?: AltRfqMakerAssetOfferings },
        assetOfferings: RfqMakerAssetOfferings,
    ): TypedMakerUrl[] {
        const standardUrls = Object.keys(assetOfferings).map((mm: string): TypedMakerUrl => {
            return { pairType: RfqPairType.Standard, url: mm };
        });
        const altUrls = options.altRfqAssetOfferings
            ? Object.keys(options.altRfqAssetOfferings).map((mm: string): TypedMakerUrl => {
                  return { pairType: RfqPairType.Alt, url: mm };
              })
            : [];

        let typedMakerUrls = standardUrls.concat(altUrls);

        // If there is a whitelist, only allow approved maker URLs
        if (options.integrator.whitelistIntegratorUrls !== undefined) {
            const whitelist = new Set(options.integrator.whitelistIntegratorUrls.map((key) => key.toLowerCase()));
            typedMakerUrls = typedMakerUrls.filter((makerUrl) => whitelist.has(makerUrl.url.toLowerCase()));
        }
        return typedMakerUrls;
    }

    public static getDurationUntilExpirationMs(expirationTimeSeconds: BigNumber): BigNumber {
        const expirationTimeMs = expirationTimeSeconds.times(ONE_SECOND_MS);
        const currentTimeMs = new BigNumber(Date.now());
        return BigNumber.max(expirationTimeMs.minus(currentTimeMs), 0);
    }

    private static _makerSupportsPair(
        typedMakerUrl: TypedMakerUrl,
        makerToken: string,
        takerToken: string,
        altMakerAssetOfferings: AltRfqMakerAssetOfferings | undefined,
        assetOfferings: RfqMakerAssetOfferings | undefined,
    ): boolean {
        // Turn off RFQt v1 for these pairs
        if (DISABLED_RFQT_V1_PAIRS_SET.has(toPairString(makerToken, takerToken))) {
            return false;
        }
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
        private readonly _quoteRequestorHttpClient: AxiosInstance,
        private readonly _altRfqCreds?: { altRfqApiKey: string; altRfqProfile: string },
        private readonly _expiryBufferMs: number = EXPIRY_BUFFER_MS,
        private readonly _metrics?: MetricsProxy,
    ) {}

    public async requestRfqtFirmQuotesAsync(
        makerToken: string, // maker token
        takerToken: string, // taker token
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
    ): Promise<SignedNativeOrder[]> {
        const _opts: RfqRequestOpts = { makerEndpointMaxResponseTimeMs: RFQ_PRICE_ENDPOINT_TIMEOUT_MS, ...options };
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

    public async requestRfqtIndicativeQuotesAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
    ): Promise<V4RFQIndicativeQuoteMM[]> {
        const _opts: RfqRequestOpts = { makerEndpointMaxResponseTimeMs: RFQ_PRICE_ENDPOINT_TIMEOUT_MS, ...options };
        // Originally a takerAddress was required for indicative quotes, but
        // now we've eliminated that requirement.  @0x/quote-server, however,
        // is still coded to expect a takerAddress.  So if the client didn't
        // send one, just use the null address to satisfy the quote server's
        // expectations.
        if (!_opts.takerAddress) {
            _opts.takerAddress = NULL_ADDRESS;
        }
        if (!_opts.txOrigin) {
            _opts.txOrigin = NULL_ADDRESS;
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

    private _isValidRfqtIndicativeQuoteResponse(response: V4RFQIndicativeQuoteMM): boolean {
        const requiredKeys: (keyof V4RFQIndicativeQuoteMM)[] = [
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

    private async _getQuotesAsync<ResponseT>(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
        quoteType: 'firm' | 'indicative',
        assetOfferings: RfqMakerAssetOfferings,
    ): Promise<RfqQuote<ResponseT>[]> {
        const requestParams = QuoteRequestor.makeQueryParameters(
            options.txOrigin,
            options.takerAddress,
            marketOperation,
            makerToken,
            takerToken,
            assetFillAmount,
            comparisonPrice,
            options.isLastLook,
            options.fee,
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

        const timeoutMs = options.makerEndpointMaxResponseTimeMs || RFQ_PRICE_ENDPOINT_TIMEOUT_MS;
        const bufferMs = 20;

        // Set Timeout on CancelToken
        const cancelTokenSource = axios.CancelToken.source();
        setTimeout(() => {
            cancelTokenSource.cancel('timeout via cancel token');
        }, timeoutMs + bufferMs);

        const typedMakerUrls = QuoteRequestor.getTypedMakerUrlsAndWhitelist(options, assetOfferings);
        const quotePromises = typedMakerUrls.map(async (typedMakerUrl) => {
            // filter out requests to skip
            const isBlacklisted = rfqMakerBlacklist.isMakerBlacklisted(typedMakerUrl.url);
            const partialLogEntry = { url: typedMakerUrl.url, quoteType, requestParams, isBlacklisted };
            const { isLastLook, integrator } = options;
            const { sellTokenAddress, buyTokenAddress } = requestParams;
            if (isBlacklisted) {
                this._metrics?.logRfqMakerNetworkInteraction({
                    isLastLook: false,
                    url: typedMakerUrl.url,
                    quoteType,
                    statusCode: undefined,
                    sellTokenAddress,
                    buyTokenAddress,
                    latencyMs: 0,
                    included: false,
                    integrator,
                });
                logger.info({ rfqtMakerInteraction: { ...partialLogEntry } });
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
                            headers: {
                                '0x-api-key': options.integrator.integratorId,
                                '0x-integrator-id': options.integrator.integratorId,
                            },
                            params: requestParams,
                            timeout: timeoutMs,
                            cancelToken: cancelTokenSource.token,
                        });
                        const latencyMs = Date.now() - timeBeforeAwait;
                        this._metrics?.logRfqMakerNetworkInteraction({
                            isLastLook: isLastLook || false,
                            url: typedMakerUrl.url,
                            quoteType,
                            statusCode: response.status,
                            sellTokenAddress,
                            buyTokenAddress,
                            latencyMs,
                            included: true,
                            integrator,
                        });
                        logger.info({
                            rfqtMakerInteraction: {
                                ...partialLogEntry,
                                response: {
                                    included: true,
                                    apiKey: options.integrator.integratorId,
                                    takerAddress: requestParams.takerAddress,
                                    txOrigin: requestParams.txOrigin,
                                    statusCode: response.status,
                                    latencyMs,
                                },
                            },
                        });
                        rfqMakerBlacklist.logTimeoutOrLackThereof(typedMakerUrl.url, latencyMs >= timeoutMs);
                        return {
                            response: { ...response.data, makerUri: typedMakerUrl.url },
                            makerUri: typedMakerUrl.url,
                        };
                    } else {
                        if (this._altRfqCreds === undefined) {
                            throw new Error(`don't have credentials for alt MM`);
                        }
                        const quote = await returnQuoteFromAltMMAsync<ResponseT>(
                            typedMakerUrl.url,
                            this._altRfqCreds.altRfqApiKey,
                            this._altRfqCreds.altRfqProfile,
                            options.integrator.integratorId,
                            quoteType === 'firm' ? AltQuoteModel.Firm : AltQuoteModel.Indicative,
                            makerToken,
                            takerToken,
                            timeoutMs,
                            options.altRfqAssetOfferings || {},
                            requestParams,
                            this._quoteRequestorHttpClient,
                            cancelTokenSource.token,
                        );

                        const latencyMs = Date.now() - timeBeforeAwait;
                        this._metrics?.logRfqMakerNetworkInteraction({
                            isLastLook: isLastLook || false,
                            url: typedMakerUrl.url,
                            quoteType,
                            statusCode: quote.status,
                            sellTokenAddress,
                            buyTokenAddress,
                            latencyMs,
                            included: true,
                            integrator,
                        });
                        logger.info({
                            rfqtMakerInteraction: {
                                ...partialLogEntry,
                                response: {
                                    included: true,
                                    apiKey: options.integrator.integratorId,
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
                    this._metrics?.logRfqMakerNetworkInteraction({
                        isLastLook: isLastLook || false,
                        url: typedMakerUrl.url,
                        quoteType,
                        statusCode: err.response?.status,
                        sellTokenAddress,
                        buyTokenAddress,
                        latencyMs,
                        included: false,
                        integrator,
                    });
                    logger.info({
                        rfqtMakerInteraction: {
                            ...partialLogEntry,
                            response: {
                                included: false,
                                apiKey: options.integrator.integratorId,
                                takerAddress: requestParams.takerAddress,
                                txOrigin: requestParams.txOrigin,
                                statusCode: err.response ? err.response.status : undefined,
                                latencyMs,
                            },
                        },
                    });
                    rfqMakerBlacklist.logTimeoutOrLackThereof(typedMakerUrl.url, latencyMs >= timeoutMs);
                    logger.warn(
                        convertIfAxiosError(err),
                        `Failed to get RFQ-T ${quoteType} quote from market maker endpoint ${typedMakerUrl.url} for integrator ${options.integrator.integratorId} (${options.integrator.label}) for taker address ${options.takerAddress} and tx origin ${options.txOrigin}`,
                    );
                    return;
                }
            }
        });

        const results = (await Promise.all(quotePromises)).filter((x) => x !== undefined);
        return results as RfqQuote<ResponseT>[];
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
        const quotes = quotesRaw.map((result) => ({ ...result, response: result.response.signedOrder }));

        // validate
        const validationFunction = (o: V4SignedRfqOrder) => {
            try {
                // Handle the validate throwing, i.e if it isn't an object or json response
                return this._schemaValidator.isValid(o, schemas.v4RfqSignedOrderSchema);
            } catch (e) {
                return false;
            }
        };
        const validQuotes = quotes.filter((result) => {
            const order = result.response;
            if (!validationFunction(order)) {
                logger.warn(result, 'Invalid RFQ-T firm quote received, filtering out');
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
                logger.warn(order, 'Unexpected token, tx origin or taker address in RFQ-T order, filtering out');
                return false;
            }
            const isLastLook = Boolean(options.isLastLook);
            const msRemainingUntilExpiration = QuoteRequestor.getDurationUntilExpirationMs(new BigNumber(order.expiry));
            const isExpirationTooSoon = msRemainingUntilExpiration.lt(this._expiryBufferMs);
            if (isExpirationTooSoon) {
                logger.warn(order, 'Expiry too soon in RFQ-T firm quote, filtering out');
                this._metrics?.incrementExpirationToSoonCounter(isLastLook, order.maker);
                return false;
            } else {
                const secondsRemaining = msRemainingUntilExpiration.div(ONE_SECOND_MS);
                this._metrics?.measureExpirationForValidOrder(isLastLook, order.maker, secondsRemaining);
                const takerAmount = new BigNumber(order.takerAmount);
                const fillRatio = takerAmount.div(assetFillAmount);
                if (fillRatio.lt(1) && fillRatio.gte(FILL_RATIO_WARNING_LEVEL)) {
                    logger.warn(
                        {
                            makerUri: result.makerUri,
                            fillRatio,
                            assetFillAmount,
                            takerToken,
                            makerToken,
                            takerAmount: order.takerAmount,
                            makerAmount: order.makerAmount,
                        },
                        'Fill ratio in warning range',
                    );
                    this._metrics?.incrementFillRatioWarningCounter(isLastLook, order.maker);
                }
                return true;
            }
        });

        // Save the maker URI for later and return just the order
        const rfqQuotes = validQuotes.map((result) => {
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
    ): Promise<V4RFQIndicativeQuoteMM[]> {
        // fetch quotes
        const rawQuotes = await this._getQuotesAsync<V4RFQIndicativeQuoteMM>(
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
        const validationFunction = (o: V4RFQIndicativeQuoteMM) => this._isValidRfqtIndicativeQuoteResponse(o);
        const validQuotes = rawQuotes.filter((result) => {
            const order = result.response;
            if (!validationFunction(order)) {
                logger.warn(result, 'Invalid RFQ indicative quote received, filtering out');
                return false;
            }
            if (
                !hasExpectedAddresses([
                    [makerToken, order.makerToken],
                    [takerToken, order.takerToken],
                ])
            ) {
                logger.warn(order, 'Unexpected token or taker address in RFQ order, filtering out');
                return false;
            }
            const msRemainingUntilExpiration = QuoteRequestor.getDurationUntilExpirationMs(new BigNumber(order.expiry));
            const isExpirationTooSoon = msRemainingUntilExpiration.lt(this._expiryBufferMs);
            if (isExpirationTooSoon) {
                logger.warn(order, 'Expiry too soon in RFQ indicative quote, filtering out');
                return false;
            } else {
                return true;
            }
        });
        const quotes = validQuotes.map((r) => r.response);
        quotes.forEach((q) => {
            q.makerAmount = new BigNumber(q.makerAmount);
            q.takerAmount = new BigNumber(q.takerAmount);
            q.expiry = new BigNumber(q.expiry);
        });
        return quotes;
    }
}