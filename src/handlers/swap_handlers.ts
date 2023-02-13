import { isAPIError, isRevertError } from '@0x/api-utils';
import { isNativeSymbolOrAddress, isNativeWrappedSymbolOrAddress } from '@0x/token-metadata';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as express from 'express';
import { StatusCodes } from 'http-status-codes';
import { Kafka, Producer } from 'kafkajs';
import _ = require('lodash');
import { Counter, Histogram } from 'prom-client';

import { ChainId, ERC20BridgeSource, RfqRequestOpts, SwapQuoterError } from '../asset-swapper';
import {
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
} from '../asset-swapper/utils/market_operation_utils/constants';
import { constants } from '../asset-swapper/constants';
import {
    CHAIN_ID,
    getIntegratorByIdOrThrow,
    getIntegratorIdForApiKey,
    KAFKA_BROKERS,
    MATCHA_INTEGRATOR_ID,
    PROMETHEUS_REQUEST_BUCKETS,
    RFQT_API_KEY_WHITELIST,
    RFQT_INTEGRATOR_IDS,
    RFQT_REGISTRY_PASSWORDS,
    ZERO_EX_GAS_API_URL,
} from '../config';
import {
    AFFILIATE_DATA_SELECTOR,
    DEFAULT_ENABLE_SLIPPAGE_PROTECTION,
    DEFAULT_PRICE_IMPACT_PROTECTION_PERCENTAGE,
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    ONE_SECOND_MS,
    SWAP_DOCS_URL,
} from '../constants';
import {
    InternalServerError,
    RevertAPIError,
    ValidationError,
    ValidationErrorCodes,
    ValidationErrorReasons,
} from '../errors';
import { schemas } from '../schemas';
import { ISwapService, GetSwapPriceResponse, GetSwapQuoteParams, GetSwapQuoteResponse } from '../types';
import { findTokenAddressOrThrowApiError } from '../utils/address_utils';
import { estimateArbitrumL1CalldataGasCost } from '../utils/l2_gas_utils';
import { parseUtils } from '../utils/parse_utils';
import { publishQuoteReport } from '../utils/quote_report_utils';
import { schemaUtils } from '../utils/schema_utils';
import { GasPriceUtils } from '../asset-swapper';

let kafkaProducer: Producer | undefined;
if (KAFKA_BROKERS !== undefined) {
    const kafka = new Kafka({
        clientId: '0x-api',
        brokers: KAFKA_BROKERS,
    });

    kafkaProducer = kafka.producer();
    kafkaProducer.connect();
}

const BEARER_REGEX = /^Bearer\s(.{36})$/;
const REGISTRY_SET: Set<string> = new Set(RFQT_REGISTRY_PASSWORDS);
const REGISTRY_ENDPOINT_FETCHED = new Counter({
    name: 'swap_handler_registry_endpoint_fetched',
    help: 'Requests to the swap handler',
    labelNames: ['identifier'],
});

const HTTP_SWAP_RESPONSE_TIME = new Histogram({
    name: 'http_swap_response_time',
    help: 'The response time of a HTTP Swap request',
    buckets: PROMETHEUS_REQUEST_BUCKETS,
});

const HTTP_SWAP_REQUESTS = new Counter({
    name: 'swap_requests',
    help: 'Total number of swap requests',
    labelNames: ['endpoint', 'chain_id', 'api_key', 'integrator_id'],
});

const PRICE_IMPACT_PROTECTION_SPECIFIED = new Counter({
    name: 'price_impact_protection_specified',
    help: 'price impact protection was specified by client',
});

export class SwapHandlers {
    private readonly _swapService: ISwapService;
    public static root(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Swap API. Visit ${SWAP_DOCS_URL} for details about this API.`;
        res.status(StatusCodes.OK).send({ message });
    }

    public static getLiquiditySources(_req: express.Request, res: express.Response): void {
        const sources = SELL_SOURCE_FILTER_BY_CHAIN_ID[CHAIN_ID].sources
            .map((s) => (s === ERC20BridgeSource.Native ? '0x' : s))
            .sort((a, b) => a.localeCompare(b));
        res.status(StatusCodes.OK).send({ records: sources });
    }

    public static getRfqRegistry(req: express.Request, res: express.Response): void {
        const auth = req.header('Authorization');
        REGISTRY_ENDPOINT_FETCHED.labels(auth || 'N/A').inc();
        if (auth === undefined) {
            return res.status(StatusCodes.UNAUTHORIZED).end();
        }
        const authTokenRegex = auth.match(BEARER_REGEX);
        if (!authTokenRegex) {
            return res.status(StatusCodes.UNAUTHORIZED).end();
        }
        const authToken = authTokenRegex[1];
        if (!REGISTRY_SET.has(authToken)) {
            return res.status(StatusCodes.UNAUTHORIZED).end();
        }
        res.status(StatusCodes.OK).send(RFQT_INTEGRATOR_IDS).end();
    }

    constructor(swapService: ISwapService) {
        this._swapService = swapService;
    }

    public async getQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const begin = Date.now();
        const params = parseSwapQuoteRequestParams(req, 'quote');
        const quote = await this._getSwapQuoteAsync(params);
        if (params.rfqt !== undefined) {
            req.log.info({
                firmQuoteServed: {
                    taker: params.takerAddress,
                    affiliateAddress: params.affiliateAddress,
                    // TODO (MKR-123): remove once the log consumers have been updated
                    apiKey: params.integrator?.integratorId,
                    integratorId: params.integrator?.integratorId,
                    integratorLabel: params.integrator?.label,
                    origin: params.origin,
                    rawApiKey: params.apiKey,
                    buyToken: params.buyToken,
                    sellToken: params.sellToken,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    // makers: quote.orders.map(order => order.makerAddress),
                },
            });
        }

        if (quote.extendedQuoteReportSources && kafkaProducer) {
            const quoteId = getQuoteIdFromSwapQuote(quote);
            publishQuoteReport(
                {
                    quoteId,
                    taker: params.takerAddress,
                    quoteReportSources: quote.extendedQuoteReportSources,
                    submissionBy: 'taker',
                    decodedUniqueId: quote.decodedUniqueId,
                    buyTokenAddress: quote.buyTokenAddress,
                    sellTokenAddress: quote.sellTokenAddress,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    integratorId: params.integrator?.integratorId,
                    blockNumber: quote.blockNumber,
                    slippage: params.slippagePercentage,
                    estimatedGas: quote.estimatedGas,
                    enableSlippageProtection: params.enableSlippageProtection,
                    expectedSlippage: quote.expectedSlippage,
                    estimatedPriceImpact: quote.estimatedPriceImpact,
                    priceImpactProtectionPercentage: params.priceImpactProtectionPercentage,
                },
                true,
                kafkaProducer,
            );
        }
        const response = _.omit(
            {
                ...quote,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
                orders: quote.orders.map((o: any) => _.omit(o, 'fills')),
            },
            'quoteReport',
            'extendedQuoteReportSources',
            'blockNumber',
        );
        const duration = (new Date().getTime() - begin) / ONE_SECOND_MS;

        HTTP_SWAP_RESPONSE_TIME.observe(duration);
        HTTP_SWAP_REQUESTS.labels(
            'quote',
            CHAIN_ID.toString(),
            params.apiKey !== undefined ? params.apiKey : 'N/A',
            params.integrator?.integratorId || 'N/A',
        ).inc();
        res.status(StatusCodes.OK).send(response);
    }

    public async getQuotePriceAsync(req: express.Request, res: express.Response): Promise<void> {
        const params = parseSwapQuoteRequestParams(req, 'price');
        const quote = await this._getSwapQuoteAsync({ ...params });
        req.log.info({
            indicativeQuoteServed: {
                taker: params.takerAddress,
                affiliateAddress: params.affiliateAddress,
                // TODO (MKR-123): remove once the log source is updated
                apiKey: params.integrator?.integratorId,
                integratorId: params.integrator?.integratorId,
                integratorLabel: params.integrator?.label,
                origin: params.origin,
                rawApiKey: params.apiKey,
                buyToken: params.buyToken,
                sellToken: params.sellToken,
                buyAmount: params.buyAmount,
                sellAmount: params.sellAmount,
                // makers: quote.orders.map(o => o.makerAddress),
            },
        });

        const response: GetSwapPriceResponse = _.pick(
            quote,
            'chainId',
            'price',
            'estimatedPriceImpact',
            'value',
            'gasPrice',
            'gas',
            'estimatedGas',
            'protocolFee',
            'minimumProtocolFee',
            'buyTokenAddress',
            'buyAmount',
            'sellTokenAddress',
            'sellAmount',
            'sources',
            'allowanceTarget',
            'sellTokenToEthRate',
            'buyTokenToEthRate',
            'expectedSlippage',
        );

        if (quote.extendedQuoteReportSources && kafkaProducer) {
            const quoteId = getQuoteIdFromSwapQuote(quote);
            publishQuoteReport(
                {
                    quoteId,
                    taker: params.takerAddress,
                    quoteReportSources: quote.extendedQuoteReportSources,
                    submissionBy: 'taker',
                    decodedUniqueId: quote.decodedUniqueId,
                    buyTokenAddress: quote.buyTokenAddress,
                    sellTokenAddress: quote.sellTokenAddress,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    integratorId: params.integrator?.integratorId,
                    slippage: params.slippagePercentage,
                    blockNumber: quote.blockNumber,
                    estimatedGas: quote.estimatedGas,
                    enableSlippageProtection: params.enableSlippageProtection,
                    expectedSlippage: quote.expectedSlippage,
                    estimatedPriceImpact: quote.estimatedPriceImpact,
                    priceImpactProtectionPercentage: params.priceImpactProtectionPercentage,
                },
                false,
                kafkaProducer,
            );
        }

        HTTP_SWAP_REQUESTS.labels(
            'price',
            CHAIN_ID.toString(),
            params.apiKey !== undefined ? params.apiKey : 'N/A',
            params.integrator?.integratorId || 'N/A',
        ).inc();

        res.status(StatusCodes.OK).send(response);
    }

    private async _getSwapQuoteAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse> {
        try {
            let swapQuote: GetSwapQuoteResponse;
            if (params.isUnwrap) {
                swapQuote = await this._swapService.getSwapQuoteForUnwrapAsync(params);
            } else if (params.isWrap) {
                swapQuote = await this._swapService.getSwapQuoteForWrapAsync(params);
            } else {
                swapQuote = await this._swapService.calculateSwapQuoteAsync(params);
            }

            // Add additional L1 gas cost.
            if (CHAIN_ID === ChainId.Arbitrum) {
                const gasUtils = GasPriceUtils.getInstance(
                    constants.PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
                    ZERO_EX_GAS_API_URL,
                );
                const gasPrices = await gasUtils.getGasPriceEstimationOrDefault({
                    fast: 100_000_000, // 0.1 gwei in wei
                });

                const l1GasCostEstimate = new BigNumber(
                    estimateArbitrumL1CalldataGasCost({
                        l2GasPrice: gasPrices.fast,
                        l1CalldataPricePerUnit: gasPrices.l1CalldataPricePerUnit,
                        calldata: swapQuote.data,
                    }),
                );
                swapQuote.estimatedGas = swapQuote.estimatedGas.plus(l1GasCostEstimate);
                swapQuote.gas = swapQuote.gas.plus(l1GasCostEstimate);
            }

            return swapQuote;
        } catch (e) {
            // If this is already a transformed error then just re-throw
            if (isAPIError(e)) {
                throw e;
            }
            // Wrap a Revert error as an API revert error
            if (isRevertError(e)) {
                throw new RevertAPIError(e);
            }
            const errorMessage: string = e.message;
            // TODO AssetSwapper can throw raw Errors or InsufficientAssetLiquidityError
            if (
                errorMessage.startsWith(SwapQuoterError.InsufficientAssetLiquidity) ||
                errorMessage.startsWith('NO_OPTIMAL_PATH')
            ) {
                throw new ValidationError([
                    {
                        field: params.sellAmount ? 'sellAmount' : 'buyAmount',
                        code: ValidationErrorCodes.ValueOutOfRange,
                        reason: SwapQuoterError.InsufficientAssetLiquidity,
                        description:
                            'We are not able to fulfill an order for this token pair at the requested amount due to a lack of liquidity',
                    },
                ]);
            }
            if (errorMessage.startsWith(SwapQuoterError.AssetUnavailable)) {
                throw new ValidationError([
                    {
                        field: 'token',
                        code: ValidationErrorCodes.ValueOutOfRange,
                        reason: e.message,
                    },
                ]);
            }
            throw new InternalServerError(e.message);
        }
    }
}

const parseSwapQuoteRequestParams = (req: express.Request, endpoint: 'price' | 'quote'): GetSwapQuoteParams => {
    // HACK typescript typing does not allow this valid json-schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
    schemaUtils.validateSchema(req.query, schemas.swapQuoteRequestSchema as any);
    const apiKey: string | undefined = req.header('0x-api-key');
    const origin: string | undefined = req.header('origin');
    let integratorId: string | undefined;
    if (apiKey) {
        integratorId = getIntegratorIdForApiKey(apiKey);
    }

    // Parse string params
    const { takerAddress, affiliateAddress } = req.query;

    // Parse boolean params and defaults

    // The /quote and /price endpoints should have different default behavior on skip validation
    const defaultSkipValidation = endpoint === 'quote' ? false : true;

    // Allow the query parameter skipValidation to override the default
    let skipValidation =
        req.query.skipValidation === undefined ? defaultSkipValidation : req.query.skipValidation === 'true';

    if (endpoint === 'quote' && integratorId !== undefined && integratorId === MATCHA_INTEGRATOR_ID) {
        // NOTE: force skip validation to false if the quote comes from Matcha
        // NOTE: allow skip validation param if the quote comes from unknown integrators (without API keys or Simbot)
        skipValidation = false;
    }

    // Whether the entire callers balance should be sold, used for contracts where the
    // amount available is non-deterministic
    const shouldSellEntireBalance = req.query.shouldSellEntireBalance === 'true' ? true : false;
    const isDebugEnabled = req.query.debug === 'true' ? true : false;

    // Parse tokens and eth wrap/unwraps
    const sellTokenRaw = req.query.sellToken as string;
    const buyTokenRaw = req.query.buyToken as string;
    const isNativeSell = isNativeSymbolOrAddress(sellTokenRaw, CHAIN_ID);
    const isNativeBuy = isNativeSymbolOrAddress(buyTokenRaw, CHAIN_ID);
    // NOTE: Internally all Native token (like ETH) trades are for their wrapped equivalent (ie WETH), we just wrap/unwrap automatically
    const sellToken = findTokenAddressOrThrowApiError(
        isNativeSell ? NATIVE_FEE_TOKEN_BY_CHAIN_ID[CHAIN_ID] : sellTokenRaw,
        'sellToken',
        CHAIN_ID,
    ).toLowerCase();
    const buyToken = findTokenAddressOrThrowApiError(
        isNativeBuy ? NATIVE_FEE_TOKEN_BY_CHAIN_ID[CHAIN_ID] : buyTokenRaw,
        'buyToken',
        CHAIN_ID,
    ).toLowerCase();
    const isWrap = isNativeSell && isNativeWrappedSymbolOrAddress(buyToken, CHAIN_ID);
    const isUnwrap = isNativeWrappedSymbolOrAddress(sellToken, CHAIN_ID) && isNativeBuy;
    // if token addresses are the same but a unwrap or wrap operation is requested, ignore error
    if (!isUnwrap && !isWrap && sellToken === buyToken) {
        throw new ValidationError(
            ['buyToken', 'sellToken'].map((field) => {
                return {
                    field,
                    code: ValidationErrorCodes.RequiredField,
                    reason: 'buyToken and sellToken must be different',
                };
            }),
        );
    }

    if (sellToken === NULL_ADDRESS || buyToken === NULL_ADDRESS) {
        throw new ValidationError(
            ['buyToken', 'sellToken'].map((field) => {
                return {
                    field,
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: 'Invalid token combination',
                };
            }),
        );
    }

    // Parse number params
    const sellAmount = req.query.sellAmount === undefined ? undefined : new BigNumber(req.query.sellAmount as string);
    const buyAmount = req.query.buyAmount === undefined ? undefined : new BigNumber(req.query.buyAmount as string);
    const gasPrice = req.query.gasPrice === undefined ? undefined : new BigNumber(req.query.gasPrice as string);
    const slippagePercentage =
        req.query.slippagePercentage === undefined
            ? DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE
            : Number.parseFloat(req.query.slippagePercentage as string);
    if (slippagePercentage > 1) {
        throw new ValidationError([
            {
                field: 'slippagePercentage',
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: ValidationErrorReasons.PercentageOutOfRange,
            },
        ]);
    }

    let priceImpactProtectionPercentage = DEFAULT_PRICE_IMPACT_PROTECTION_PERCENTAGE;
    if (req.query.priceImpactProtectionPercentage !== undefined) {
        PRICE_IMPACT_PROTECTION_SPECIFIED.inc();
        priceImpactProtectionPercentage = Number.parseFloat(req.query.priceImpactProtectionPercentage as string);
        if (priceImpactProtectionPercentage > 1) {
            throw new ValidationError([
                {
                    field: 'priceImpactProtectionPercentage',
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: ValidationErrorReasons.PercentageOutOfRange,
                    description: 'priceImpactProtectionPercentage should be between 0 and 1.0',
                },
            ]);
        }
    }

    // Parse sources
    const { excludedSources, includedSources, nativeExclusivelyRFQT } = parseUtils.parseRequestForExcludedSources(
        {
            excludedSources: req.query.excludedSources as string | undefined,
            includedSources: req.query.includedSources as string | undefined,
            intentOnFilling: req.query.intentOnFilling as string | undefined,
            takerAddress: takerAddress as string,
            apiKey,
        },
        RFQT_API_KEY_WHITELIST,
        endpoint,
    );

    const isAllExcluded = Object.values(ERC20BridgeSource).every((s) => excludedSources.includes(s));
    if (isAllExcluded) {
        throw new ValidationError([
            {
                field: 'excludedSources',
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: 'Request excluded all sources',
            },
        ]);
    }

    const rfqt: Pick<RfqRequestOpts, 'intentOnFilling' | 'isIndicative' | 'nativeExclusivelyRFQ'> | undefined = (() => {
        if (apiKey) {
            if (endpoint === 'quote' && takerAddress) {
                return {
                    intentOnFilling: req.query.intentOnFilling === 'true',
                    isIndicative: false,
                    nativeExclusivelyRFQT,
                };
            } else if (endpoint === 'price') {
                return {
                    intentOnFilling: false,
                    isIndicative: true,
                    nativeExclusivelyRFQT,
                };
            }
        }
        return undefined;
    })();

    const affiliateFee = parseUtils.parseAffiliateFeeOptions(req);
    const integrator = integratorId ? getIntegratorByIdOrThrow(integratorId) : undefined;

    const enableSlippageProtection = parseOptionalBooleanParam(
        req.query.enableSlippageProtection as string,
        DEFAULT_ENABLE_SLIPPAGE_PROTECTION,
    );

    // Log the request if it passes all validations
    req.log.info({
        type: 'swapRequest',
        endpoint,
        excludedSources,
        nativeExclusivelyRFQT,
        // TODO (MKR-123): Remove once the log source has been updated.
        apiKey: integratorId || 'N/A',
        integratorId: integratorId || 'N/A',
        integratorLabel: integrator?.label || 'N/A',
        rawApiKey: apiKey || 'N/A',
        enableSlippageProtection,
        priceImpactProtectionPercentage,
    });

    return {
        affiliateAddress: affiliateAddress as string,
        affiliateFee,
        apiKey,
        buyAmount,
        buyToken,
        endpoint,
        excludedSources,
        gasPrice,
        includedSources,
        integrator,
        isETHBuy: isNativeBuy,
        isETHSell: isNativeSell,
        isUnwrap,
        isWrap,
        metaTransactionVersion: undefined,
        origin,
        rfqt,
        sellAmount,
        sellToken,
        shouldSellEntireBalance,
        skipValidation,
        slippagePercentage,
        takerAddress: takerAddress as string,
        enableSlippageProtection,
        priceImpactProtectionPercentage,
        isDebugEnabled,
    };
};

/**
 * If undefined, use the default value, else parse the value as a boolean.
 */

function parseOptionalBooleanParam(param: string | undefined, defaultValue: boolean): boolean {
    if (param === undefined || param === '') {
        return defaultValue;
    }
    return param === 'true';
}

/*
 * Extract the quote ID from the quote filldata
 */
function getQuoteIdFromSwapQuote(quote: GetSwapQuoteResponse): string {
    const bytesPos = quote.data.indexOf(AFFILIATE_DATA_SELECTOR);
    const quoteIdOffset = 118; // Offset of quoteId from Affiliate data selector
    const startingIndex = bytesPos + quoteIdOffset;
    const quoteId = quote.data.slice(startingIndex, startingIndex + 10);
    return quoteId;
}
