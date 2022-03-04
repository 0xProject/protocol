// tslint:disable:max-file-line-count
import { isAPIError, isRevertError } from '@0x/api-utils';
import { ERC20BridgeSource, RfqRequestOpts, SwapQuoterError } from '@0x/asset-swapper';
import {
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
} from '@0x/asset-swapper/lib/src/utils/market_operation_utils/constants';
import {
    findTokenAddressOrThrow,
    getTokenMetadataIfExists,
    isNativeSymbolOrAddress,
    isNativeWrappedSymbolOrAddress,
    TokenMetadatasForChains,
} from '@0x/token-metadata';
import { MarketOperation } from '@0x/types';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import { Kafka, Producer } from 'kafkajs';
import _ = require('lodash');
import { Counter, Histogram } from 'prom-client';

import {
    CHAIN_ID,
    getIntegratorByIdOrThrow,
    getIntegratorIdForApiKey,
    KAFKA_BROKERS,
    MATCHA_INTEGRATOR_ID,
    NATIVE_WRAPPED_TOKEN_SYMBOL,
    PLP_API_KEY_WHITELIST,
    RFQT_API_KEY_WHITELIST,
    RFQT_INTEGRATOR_IDS,
    RFQT_REGISTRY_PASSWORDS,
} from '../config';
import {
    AFFILIATE_DATA_SELECTOR,
    DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE,
    MARKET_DEPTH_DEFAULT_DISTRIBUTION,
    MARKET_DEPTH_MAX_SAMPLES,
    ONE_SECOND_MS,
    PROMETHEUS_REQUEST_BUCKETS,
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
import { SwapService } from '../services/swap_service';
import { GetSwapPriceResponse, GetSwapQuoteParams, GetSwapQuoteResponse } from '../types';
import { findTokenAddressOrThrowApiError } from '../utils/address_utils';
import { paginationUtils } from '../utils/pagination_utils';
import { parseUtils } from '../utils/parse_utils';
import { priceComparisonUtils } from '../utils/price_comparison_utils';
import { quoteReportUtils } from '../utils/quote_report_utils';
import { schemaUtils } from '../utils/schema_utils';
import { serviceUtils } from '../utils/service_utils';

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

export class SwapHandlers {
    private readonly _swapService: SwapService;
    public static root(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Swap API. Visit ${SWAP_DOCS_URL} for details about this API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    // tslint:disable-next-line:prefer-function-over-method
    public static getTokens(_req: express.Request, res: express.Response): void {
        const tokens = TokenMetadatasForChains.map((tm) => ({
            symbol: tm.symbol,
            address: tm.tokenAddresses[CHAIN_ID],
            name: tm.name,
            decimals: tm.decimals,
        }));
        const filteredTokens = tokens.filter((t) => t.address !== NULL_ADDRESS);
        res.status(HttpStatus.OK).send({ records: filteredTokens });
    }

    public static getLiquiditySources(_req: express.Request, res: express.Response): void {
        const sources = SELL_SOURCE_FILTER_BY_CHAIN_ID[CHAIN_ID].sources
            .map((s) => (s === ERC20BridgeSource.Native ? '0x' : s))
            .sort((a, b) => a.localeCompare(b));
        res.status(HttpStatus.OK).send({ records: sources });
    }

    public static getRfqRegistry(req: express.Request, res: express.Response): void {
        const auth = req.header('Authorization');
        REGISTRY_ENDPOINT_FETCHED.labels(auth || 'N/A').inc();
        if (auth === undefined) {
            return res.status(HttpStatus.UNAUTHORIZED).end();
        }
        const authTokenRegex = auth.match(BEARER_REGEX);
        if (!authTokenRegex) {
            return res.status(HttpStatus.UNAUTHORIZED).end();
        }
        const authToken = authTokenRegex[1];
        if (!REGISTRY_SET.has(authToken)) {
            return res.status(HttpStatus.UNAUTHORIZED).end();
        }
        res.status(HttpStatus.OK).send(RFQT_INTEGRATOR_IDS).end();
    }

    constructor(swapService: SwapService) {
        this._swapService = swapService;
    }

    public async getTokenPricesAsync(req: express.Request, res: express.Response): Promise<void> {
        const symbolOrAddress = (req.query.sellToken as string) || 'WETH';
        const baseAsset = getTokenMetadataIfExists(symbolOrAddress, CHAIN_ID);
        if (!baseAsset) {
            throw new ValidationError([
                {
                    field: 'sellToken',
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: `Could not find token ${symbolOrAddress}`,
                },
            ]);
        }
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const unitAmount = new BigNumber(1);
        const tokenPrices = await this._swapService.getTokenPricesAsync(baseAsset, unitAmount, page, perPage);
        res.status(HttpStatus.OK).send(tokenPrices);
    }

    public async getQuoteAsync(req: express.Request, res: express.Response): Promise<void> {
        const begin = Date.now();
        const params = parseSwapQuoteRequestParams(req, 'quote');
        const quote = await this._getSwapQuoteAsync(params, req);
        if (params.rfqt !== undefined) {
            req.log.info({
                firmQuoteServed: {
                    taker: params.takerAddress,
                    // TODO (MKR-123): remove once the log consumers have been updated
                    apiKey: params.integrator?.integratorId,
                    integratorId: params.integrator?.integratorId,
                    rawApiKey: params.apiKey,
                    buyToken: params.buyToken,
                    sellToken: params.sellToken,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    // makers: quote.orders.map(order => order.makerAddress),
                },
            });
            if (quote.quoteReport && params.rfqt && params.rfqt.intentOnFilling) {
                quoteReportUtils.logQuoteReport(
                    {
                        quoteReport: quote.quoteReport,
                        submissionBy: 'taker',
                        decodedUniqueId: quote.decodedUniqueId,
                        buyTokenAddress: quote.buyTokenAddress,
                        sellTokenAddress: quote.sellTokenAddress,
                        buyAmount: params.buyAmount,
                        sellAmount: params.sellAmount,
                        integratorId: params.integrator?.integratorId,
                        slippage: undefined,
                    },
                    req.log,
                );
            }

            if (quote.extendedQuoteReportSources && kafkaProducer) {
                const quoteId = getQuoteIdFromSwapQuote(quote);
                quoteReportUtils.publishQuoteReport(
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
                    },
                    true,
                    kafkaProducer,
                );
            }
        }
        const response = _.omit(
            {
                ...quote,
                orders: quote.orders.map((o: any) => _.omit(o, 'fills')),
            },
            'quoteReport',
            'extendedQuoteReportSources',
            'priceComparisonsReport',
            'decodedUniqueId',
        );
        if (params.includePriceComparisons && quote.priceComparisonsReport) {
            const side = params.sellAmount ? MarketOperation.Sell : MarketOperation.Buy;
            const priceComparisons = priceComparisonUtils.getPriceComparisonFromQuote(CHAIN_ID, side, quote);
            response.priceComparisons = priceComparisons?.map((sc) => priceComparisonUtils.renameNative(sc));
        }
        const duration = (new Date().getTime() - begin) / ONE_SECOND_MS;
        HTTP_SWAP_RESPONSE_TIME.observe(duration);
        res.status(HttpStatus.OK).send(response);
    }

    // tslint:disable-next-line:prefer-function-over-method
    public async getQuotePriceAsync(req: express.Request, res: express.Response): Promise<void> {
        const params = parseSwapQuoteRequestParams(req, 'price');
        const quote = await this._getSwapQuoteAsync({ ...params }, req);
        req.log.info({
            indicativeQuoteServed: {
                taker: params.takerAddress,
                // TODO (MKR-123): remove once the log source is updated
                apiKey: params.integrator?.integratorId,
                integratorId: params.integrator?.integratorId,
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
            'expectedBuyAmount',
            'expectedSellAmount',
        );

        if (params.includePriceComparisons && quote.priceComparisonsReport) {
            const marketSide = params.sellAmount ? MarketOperation.Sell : MarketOperation.Buy;
            response.priceComparisons = priceComparisonUtils
                .getPriceComparisonFromQuote(CHAIN_ID, marketSide, quote)
                ?.map((sc) => priceComparisonUtils.renameNative(sc));
        }

        if (quote.extendedQuoteReportSources && kafkaProducer) {
            const quoteId = getQuoteIdFromSwapQuote(quote);
            quoteReportUtils.publishQuoteReport(
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
                },
                false,
                kafkaProducer,
            );
        }

        res.status(HttpStatus.OK).send(response);
    }

    public async getMarketDepthAsync(req: express.Request, res: express.Response): Promise<void> {
        // NOTE: Internally all ETH trades are for WETH, we just wrap/unwrap automatically
        const buyTokenSymbolOrAddress = isNativeSymbolOrAddress(req.query.buyToken as string, CHAIN_ID)
            ? NATIVE_WRAPPED_TOKEN_SYMBOL
            : (req.query.buyToken as string);
        const sellTokenSymbolOrAddress = isNativeSymbolOrAddress(req.query.sellToken as string, CHAIN_ID)
            ? NATIVE_WRAPPED_TOKEN_SYMBOL
            : (req.query.sellToken as string);

        if (buyTokenSymbolOrAddress === sellTokenSymbolOrAddress) {
            throw new ValidationError([
                {
                    field: 'buyToken',
                    code: ValidationErrorCodes.InvalidAddress,
                    reason: `Invalid pair ${sellTokenSymbolOrAddress}/${buyTokenSymbolOrAddress}`,
                },
            ]);
        }
        const response = await this._swapService.calculateMarketDepthAsync({
            buyToken: findTokenAddressOrThrow(buyTokenSymbolOrAddress, CHAIN_ID),
            sellToken: findTokenAddressOrThrow(sellTokenSymbolOrAddress, CHAIN_ID),
            sellAmount: new BigNumber(req.query.sellAmount as string),
            // tslint:disable-next-line:radix custom-no-magic-numbers
            numSamples: req.query.numSamples ? parseInt(req.query.numSamples as string) : MARKET_DEPTH_MAX_SAMPLES,
            sampleDistributionBase: req.query.sampleDistributionBase
                ? parseFloat(req.query.sampleDistributionBase as string)
                : MARKET_DEPTH_DEFAULT_DISTRIBUTION,
            excludedSources:
                req.query.excludedSources === undefined
                    ? []
                    : parseUtils.parseStringArrForERC20BridgeSources((req.query.excludedSources as string).split(',')),
            includedSources:
                req.query.includedSources === undefined
                    ? []
                    : parseUtils.parseStringArrForERC20BridgeSources((req.query.includedSources as string).split(',')),
        });
        res.status(HttpStatus.OK).send(response);
    }

    private async _getSwapQuoteAsync(params: GetSwapQuoteParams, req: express.Request): Promise<GetSwapQuoteResponse> {
        try {
            let swapQuote: GetSwapQuoteResponse;
            if (params.isUnwrap) {
                swapQuote = await this._swapService.getSwapQuoteForUnwrapAsync(params);
            } else if (params.isWrap) {
                swapQuote = await this._swapService.getSwapQuoteForWrapAsync(params);
            } else {
                swapQuote = await this._swapService.calculateSwapQuoteAsync(params);
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
    schemaUtils.validateSchema(req.query, schemas.swapQuoteRequestSchema as any);
    const apiKey: string | undefined = req.header('0x-api-key');
    let integratorId: string | undefined;
    if (apiKey) {
        integratorId = getIntegratorIdForApiKey(apiKey);
    }

    // Parse string params
    const { takerAddress, affiliateAddress } = req.query;

    // Parse boolean params and defaults
    // tslint:disable:boolean-naming

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

    const includePriceComparisons = req.query.includePriceComparisons === 'true' ? true : false;
    // Whether the entire callers balance should be sold, used for contracts where the
    // amount available is non-deterministic
    const shouldSellEntireBalance = req.query.shouldSellEntireBalance === 'true' ? true : false;
    // tslint:enable:boolean-naming

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

    // Parse sources
    // tslint:disable-next-line: boolean-naming
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

    // Determine if any other sources should be excluded. This usually has an effect
    // if an API key is not present, or the API key is ineligible for PLP.
    const updatedExcludedSources = serviceUtils.determineExcludedSources(
        excludedSources,
        apiKey,
        PLP_API_KEY_WHITELIST,
    );

    const isAllExcluded = Object.values(ERC20BridgeSource).every((s) => updatedExcludedSources.includes(s));
    if (isAllExcluded) {
        throw new ValidationError([
            {
                field: 'excludedSources',
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: 'Request excluded all sources',
            },
        ]);
    }

    // Log the request if it passes all validations
    req.log.info({
        type: 'swapRequest',
        endpoint,
        updatedExcludedSources,
        nativeExclusivelyRFQT,
        // TODO (MKR-123): Remove once the log source has been updated.
        apiKey: integratorId || 'N/A',
        integratorId: integratorId || 'N/A',
        rawApiKey: apiKey || 'N/A',
    });

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

    return {
        endpoint,
        takerAddress: takerAddress as string,
        sellToken,
        buyToken,
        sellAmount,
        buyAmount,
        slippagePercentage,
        gasPrice,
        excludedSources: updatedExcludedSources,
        includedSources,
        affiliateAddress: affiliateAddress as string,
        rfqt,
        skipValidation,
        apiKey,
        integrator,
        affiliateFee,
        includePriceComparisons,
        shouldSellEntireBalance,
        isMetaTransaction: false,
        isETHSell: isNativeSell,
        isETHBuy: isNativeBuy,
        isUnwrap,
        isWrap,
    };
};

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
