import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { FillQuoteTransformerOrderType, LimitOrder } from '@0x/protocol-utils';
import { BigNumber, providerUtils } from '@0x/utils';
import Axios, { AxiosInstance } from 'axios';
import { SupportedProvider, ZeroExProvider } from 'ethereum-types';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import * as _ from 'lodash';

import { constants, INVALID_SIGNATURE, KEEP_ALIVE_TTL } from './constants';
import {
    Address,
    AssetSwapperContractAddresses,
    MarketBuySwapQuote,
    MarketOperation,
    OrderPrunerPermittedFeeTypes,
    RfqRequestOpts,
    SignedNativeOrder,
    SwapQuote,
    SwapQuoteInfo,
    SwapQuoteHop,
    SwapQuoteOrder,
    SwapQuoteGenericBridgeOrder,
    SwapQuoteNativeOrder,
    SwapQuoteOrdersBreakdown,
    SwapQuoteRequestOpts,
    SwapQuoterOpts,
    SwapQuoterRfqOpts,
} from './types';
import { assert } from './utils/assert';
import { MarketOperationUtils } from './utils/market_operation_utils';
import { ZERO_AMOUNT } from './utils/market_operation_utils/constants';
import { SamplerClient } from './utils/market_operation_utils/sampler';
import { SourceFilters } from './utils/market_operation_utils/source_filters';
import {
    ERC20BridgeSource,
    GetMarketOrdersOpts,
    MarketDepth,
    MarketDepthSide,
    MarketSideLiquidity,
    OptimizedHop,
    OptimizedOrder,
    OptimizedBridgeOrder,
    OptimizedLimitOrder,
    OptimizedRfqOrder,
    OptimizedGenericBridgeOrder,
    OptimizerResultWithReport,
} from './utils/market_operation_utils/types';
import { ProtocolFeeUtils } from './utils/protocol_fee_utils';
import { QuoteRequestor } from './utils/quote_requestor';
import { QuoteFillResult, simulateBestCaseFill, simulateWorstCaseFill } from './utils/quote_simulation';

export abstract class Orderbook {
    public abstract getOrdersAsync(
        makerToken: string,
        takerToken: string,
        pruneFn?: (o: SignedNativeOrder) => boolean,
    ): Promise<SignedNativeOrder[]>;
    public abstract getBatchOrdersAsync(
        makerTokens: string[],
        takerToken: string,
        pruneFn?: (o: SignedNativeOrder) => boolean,
    ): Promise<SignedNativeOrder[][]>;
    // tslint:disable-next-line:prefer-function-over-method
    public async destroyAsync(): Promise<void> {
        return;
    }
}

// tslint:disable:max-classes-per-file
export class SwapQuoter {
    public readonly provider: ZeroExProvider;
    public readonly orderbook: Orderbook;
    public readonly expiryBufferMs: number;
    public readonly chainId: number;
    public readonly permittedOrderFeeTypes: Set<OrderPrunerPermittedFeeTypes>;
    private readonly _contractAddresses: AssetSwapperContractAddresses;
    private readonly _protocolFeeUtils: ProtocolFeeUtils;
    private readonly _marketOperationUtils: MarketOperationUtils;
    private readonly _rfqtOptions?: SwapQuoterRfqOpts;
    private readonly _quoteRequestorHttpClient: AxiosInstance;
    private readonly _integratorIdsSet: Set<string>;

    /**
     * Instantiates a new SwapQuoter instance
     * @param   supportedProvider   The Provider instance you would like to use for interacting with the Ethereum network.
     * @param   orderbook           An object that conforms to Orderbook, see type for definition.
     * @param   options             Initialization options for the SwapQuoter. See type definition for details.
     *
     * @return  An instance of SwapQuoter
     */
    constructor(supportedProvider: SupportedProvider, orderbook: Orderbook, options: SwapQuoterOpts) {
        const {
            chainId,
            expiryBufferMs,
            permittedOrderFeeTypes,
            rfqt,
        } = options;
        const provider = providerUtils.standardizeOrThrow(supportedProvider);
        assert.isValidOrderbook('orderbook', orderbook);
        this.chainId = chainId;
        this.provider = provider;
        this.orderbook = orderbook;
        this.expiryBufferMs = expiryBufferMs;
        this.permittedOrderFeeTypes = permittedOrderFeeTypes;

        this._rfqtOptions = rfqt;
        this._contractAddresses = options.contractAddresses || {
            ...getContractAddressesForChainOrThrow(chainId),
        };
        this._protocolFeeUtils = ProtocolFeeUtils.getInstance(
            constants.PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS,
            options.ethGasStationUrl,
        );

        this._marketOperationUtils = new MarketOperationUtils(
            SamplerClient.createFromChainIdAndEndpoint(
                this.chainId,
                options.samplerServiceUrl,
            ),
        );

        this._quoteRequestorHttpClient = Axios.create({
            httpAgent: new HttpAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
            httpsAgent: new HttpsAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
            ...(rfqt ? rfqt.axiosInstanceOpts : {}),
        });

        const integratorIds = this._rfqtOptions?.integratorsWhitelist.map(integrator => integrator.integratorId) || [];
        this._integratorIdsSet = new Set(integratorIds);
    }

    public async getBatchMarketBuySwapQuoteAsync(
        makerTokens: string[],
        targetTakerToken: string,
        makerTokenBuyAmounts: BigNumber[],
        options: Partial<SwapQuoteRequestOpts> = {},
    ): Promise<MarketBuySwapQuote[]> {
        makerTokenBuyAmounts.map((a, i) => assert.isBigNumber(`makerAssetBuyAmounts[${i}]`, a));
        let gasPrice: BigNumber;
        if (!!options.gasPrice) {
            gasPrice = options.gasPrice;
            assert.isBigNumber('gasPrice', gasPrice);
        } else {
            gasPrice = await this.getGasPriceEstimationOrThrowAsync();
        }

        const allOrders = await this.orderbook.getBatchOrdersAsync(
            makerTokens,
            targetTakerToken,
            this._limitOrderPruningFn,
        );

        // Orders could be missing from the orderbook, so we create a dummy one as a placeholder
        allOrders.forEach((orders: SignedNativeOrder[], i: number) => {
            if (!orders || orders.length === 0) {
                allOrders[i] = [createDummyOrder(makerTokens[i], targetTakerToken)];
            }
        });

        const opts = { ...constants.DEFAULT_SWAP_QUOTE_REQUEST_OPTS, ...options };
        const optimizerResults = await this._marketOperationUtils.getBatchMarketBuyOrdersAsync(
            allOrders,
            makerTokenBuyAmounts,
            opts as GetMarketOrdersOpts,
        );

        const batchSwapQuotes = await Promise.all(
            optimizerResults.map(async (result, i) => {
                if (result) {
                    const { makerToken, takerToken } = allOrders[i][0].order;
                    return createSwapQuote(
                        result,
                        makerToken,
                        takerToken,
                        MarketOperation.Buy,
                        makerTokenBuyAmounts[i],
                        gasPrice,
                        opts.bridgeSlippage,
                    );
                } else {
                    return undefined;
                }
            }),
        );
        return batchSwapQuotes.filter(x => x !== undefined) as MarketBuySwapQuote[];
    }

    /**
     * Returns the bids and asks liquidity for the entire market.
     * For certain sources (like AMM's) it is recommended to provide a practical maximum takerAssetAmount.
     * @param   makerTokenAddress The address of the maker asset
     * @param   takerTokenAddress The address of the taker asset
     * @param   takerAssetAmount  The amount to sell and buy for the bids and asks.
     *
     * @return  An object that conforms to MarketDepth that contains all of the samples and liquidity
     *          information for the source.
     */
    public async getBidAskLiquidityForMakerTakerAssetPairAsync(
        makerToken: string,
        takerToken: string,
        takerAssetAmount: BigNumber,
        options: Partial<SwapQuoteRequestOpts> = {},
    ): Promise<MarketDepth> {
        throw new Error(`Not implemented`);
        // assert.isString('makerToken', makerToken);
        // assert.isString('takerToken', takerToken);
        // const sourceFilters = new SourceFilters([], options.excludedSources, options.includedSources);
        //
        // let [sellOrders, buyOrders] = !sourceFilters.isAllowed(ERC20BridgeSource.Native)
        //     ? [[], []]
        //     : await Promise.all([
        //           this.orderbook.getOrdersAsync(makerToken, takerToken),
        //           this.orderbook.getOrdersAsync(takerToken, makerToken),
        //       ]);
        // if (!sellOrders || sellOrders.length === 0) {
        //     sellOrders = [createDummyOrder(makerToken, takerToken)];
        // }
        // if (!buyOrders || buyOrders.length === 0) {
        //     buyOrders = [createDummyOrder(takerToken, makerToken)];
        // }
        //
        // const getMarketDepthSide = (marketSideLiquidity: MarketSideLiquidity): MarketDepthSide => {
        //     const { dexQuotes, nativeOrders } = marketSideLiquidity.quotes;
        //     const { side } = marketSideLiquidity;
        //
        //     return [
        //         ...dexQuotes,
        //         nativeOrders.map(o => {
        //             return {
        //                 input: side === MarketOperation.Sell ? o.fillableTakerAmount : o.fillableMakerAmount,
        //                 output: side === MarketOperation.Sell ? o.fillableMakerAmount : o.fillableTakerAmount,
        //                 fillData: o,
        //                 source: ERC20BridgeSource.Native,
        //             };
        //         }),
        //     ];
        // };
        // const [bids, asks] = await Promise.all([
        //     this._marketOperationUtils.getMarketBuyLiquidityAsync(buyOrders, takerAssetAmount, options),
        //     this._marketOperationUtils.getMarketSellLiquidityAsync(sellOrders, takerAssetAmount, options),
        // ]);
        // return {
        //     bids: getMarketDepthSide(bids),
        //     asks: getMarketDepthSide(asks),
        //     makerTokenDecimals: asks.makerTokenDecimals,
        //     takerTokenDecimals: asks.takerTokenDecimals,
        // };
    }

    /**
     * Returns the recommended gas price for a fast transaction
     */
    public async getGasPriceEstimationOrThrowAsync(): Promise<BigNumber> {
        return this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
    }

    /**
     * Destroys any subscriptions or connections.
     */
    public async destroyAsync(): Promise<void> {
        await this._protocolFeeUtils.destroyAsync();
        await this.orderbook.destroyAsync();
    }

    /**
     * Utility function to get Ether token address
     */
    public getEtherToken(): string {
        return this._contractAddresses.etherToken;
    }

    /**
     * Get a `SwapQuote` containing all information relevant to fulfilling a swap between a desired ERC20 token address and ERC20 owned by a provided address.
     * You can then pass the `SwapQuote` to a `SwapQuoteConsumer` to execute a buy, or process SwapQuote for on-chain consumption.
     * @param   makerToken       The address of the maker asset
     * @param   takerToken       The address of the taker asset
     * @param   assetFillAmount  If a buy, the amount of maker asset to buy. If a sell, the amount of taker asset to sell.
     * @param   marketOperation  Either a Buy or a Sell quote
     * @param   options          Options for the request. See type definition for more information.
     *
     * @return  An object that conforms to SwapQuote that satisfies the request. See type definition for more information.
     */
    public async getSwapQuoteAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        options: Partial<SwapQuoteRequestOpts>,
    ): Promise<SwapQuote> {
        assert.isETHAddressHex('makerToken', makerToken);
        assert.isETHAddressHex('takerToken', takerToken);
        assert.isBigNumber('assetFillAmount', assetFillAmount);
        const opts = _.merge({}, constants.DEFAULT_SWAP_QUOTE_REQUEST_OPTS, options);
        let gasPrice: BigNumber;
        if (!!opts.gasPrice) {
            gasPrice = opts.gasPrice;
            assert.isBigNumber('gasPrice', gasPrice);
        } else {
            gasPrice = await this.getGasPriceEstimationOrThrowAsync();
        }

        const sourceFilters = new SourceFilters([], opts.excludedSources, opts.includedSources);

        opts.rfqt = this._validateRfqtOpts(sourceFilters, opts.rfqt);
        const rfqtOptions = this._rfqtOptions;

        // Get SRA orders (limit orders)
        const shouldSkipOpenOrderbook =
            !sourceFilters.isAllowed(ERC20BridgeSource.Native) ||
            (opts.rfqt && opts.rfqt.nativeExclusivelyRFQ === true);
        const nativeOrders = shouldSkipOpenOrderbook
            ? await Promise.resolve([])
            : await this.orderbook.getOrdersAsync(makerToken, takerToken, this._limitOrderPruningFn);

        // if no native orders, pass in a dummy order for the sampler to have required metadata for sampling
        if (nativeOrders.length === 0) {
            nativeOrders.push(createDummyOrder(makerToken, takerToken));
        }

        //  ** Prepare options for fetching market side liquidity **
        const calcOpts: GetMarketOrdersOpts = {
            ...opts,
            gasPrice,
            exchangeProxyOverhead: opts.exchangeProxyOverhead,
        };
        // pass the QuoteRequestor on if rfqt enabled
        if (calcOpts.rfqt !== undefined) {
            calcOpts.rfqt.quoteRequestor = new QuoteRequestor(
                rfqtOptions?.makerAssetOfferings || {},
                {},
                this._quoteRequestorHttpClient,
                rfqtOptions?.altRfqCreds,
                rfqtOptions?.warningLogger,
                rfqtOptions?.infoLogger,
                this.expiryBufferMs,
                rfqtOptions?.metricsProxy,
            );
        }

        const result: OptimizerResultWithReport = await this._marketOperationUtils.getOptimizerResultAsync(
            nativeOrders,
            assetFillAmount,
            marketOperation,
            calcOpts,
        );

        const swapQuote = createSwapQuote(
            result,
            makerToken,
            takerToken,
            marketOperation,
            assetFillAmount,
            gasPrice,
            opts.bridgeSlippage,
        );

        // Use the raw gas, not scaled by gas price
        const exchangeProxyOverhead = BigNumber.sum(
            ...result.hops.map(h => opts.exchangeProxyOverhead(h.sourceFlags)),
        ).toNumber();
        swapQuote.bestCaseQuoteInfo.gas += exchangeProxyOverhead;
        swapQuote.worstCaseQuoteInfo.gas += exchangeProxyOverhead;

        return swapQuote;
    }

    private readonly _limitOrderPruningFn = (limitOrder: SignedNativeOrder) => {
        const order = new LimitOrder(limitOrder.order);
        const isOpenOrder = order.taker === constants.NULL_ADDRESS;
        const willOrderExpire = order.willExpire(this.expiryBufferMs / constants.ONE_SECOND_MS); // tslint:disable-line:boolean-naming
        const isFeeTypeAllowed =
            this.permittedOrderFeeTypes.has(OrderPrunerPermittedFeeTypes.NoFees) &&
            order.takerTokenFeeAmount.eq(constants.ZERO_AMOUNT);
        return isOpenOrder && !willOrderExpire && isFeeTypeAllowed;
    }; // tslint:disable-line:semicolon

    private _isIntegratorIdWhitelisted(integratorId: string | undefined): boolean {
        if (!integratorId) {
            return false;
        }
        return this._integratorIdsSet.has(integratorId);
    }

    private _isTxOriginBlacklisted(txOrigin: string | undefined): boolean {
        if (!txOrigin) {
            return false;
        }
        const blacklistedTxOrigins = this._rfqtOptions ? this._rfqtOptions.txOriginBlacklist : new Set();
        return blacklistedTxOrigins.has(txOrigin.toLowerCase());
    }

    private _validateRfqtOpts(
        sourceFilters: SourceFilters,
        rfqt: RfqRequestOpts | undefined,
    ): RfqRequestOpts | undefined {
        if (!rfqt) {
            return rfqt;
        }
        // tslint:disable-next-line: boolean-naming
        const { integrator, nativeExclusivelyRFQ, intentOnFilling, txOrigin } = rfqt;
        // If RFQ-T is enabled and `nativeExclusivelyRFQ` is set, then `ERC20BridgeSource.Native` should
        // never be excluded.
        if (nativeExclusivelyRFQ === true && !sourceFilters.isAllowed(ERC20BridgeSource.Native)) {
            throw new Error('Native liquidity cannot be excluded if "rfqt.nativeExclusivelyRFQ" is set');
        }

        // If an integrator ID was provided, but the ID is not whitelisted, raise a warning and disable RFQ
        if (!this._isIntegratorIdWhitelisted(integrator.integratorId)) {
            if (this._rfqtOptions && this._rfqtOptions.warningLogger) {
                this._rfqtOptions.warningLogger(
                    {
                        ...integrator,
                    },
                    'Attempt at using an RFQ API key that is not whitelisted. Disabling RFQ for the request lifetime.',
                );
            }
            return undefined;
        }

        // If the requested tx origin is blacklisted, raise a warning and disable RFQ
        if (this._isTxOriginBlacklisted(txOrigin)) {
            if (this._rfqtOptions && this._rfqtOptions.warningLogger) {
                this._rfqtOptions.warningLogger(
                    {
                        txOrigin,
                    },
                    'Attempt at using a tx Origin that is blacklisted. Disabling RFQ for the request lifetime.',
                );
            }
            return undefined;
        }

        // Otherwise check other RFQ options
        if (
            intentOnFilling && // The requestor is asking for a firm quote
            this._isIntegratorIdWhitelisted(integrator.integratorId) && // A valid API key was provided
            sourceFilters.isAllowed(ERC20BridgeSource.Native) // Native liquidity is not excluded
        ) {
            if (!txOrigin || txOrigin === constants.NULL_ADDRESS) {
                throw new Error('RFQ-T firm quote requests must specify a tx origin');
            }
        }

        return rfqt;
    }
}
// tslint:disable-next-line: max-file-line-count

// begin formatting and report generation functions
function createSwapQuote(
    optimizerResult: OptimizerResultWithReport,
    makerToken: string,
    takerToken: string,
    side: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    slippage: number,
): SwapQuote {
    const {
        hops,
        quoteReport,
        extendedQuoteReportSources,
        takerAmountPerEth,
        makerAmountPerEth,
        priceComparisonsReport,
    } = optimizerResult;

    const quoteHops = hops.map(hop => toSwapQuoteHop(hop, side, slippage));
    const { bestCaseQuoteInfo, worstCaseQuoteInfo, sourceBreakdown } =
        calculateQuoteInfo(quoteHops, side, assetFillAmount, gasPrice, slippage);

    // Put together the swap quote
    const { makerTokenDecimals, takerTokenDecimals, blockNumber } = optimizerResult.marketSideLiquidity;
    const swapQuote = {
        makerToken,
        takerToken,
        gasPrice,
        bestCaseQuoteInfo,
        worstCaseQuoteInfo,
        sourceBreakdown,
        makerTokenDecimals,
        takerTokenDecimals,
        takerAmountPerEth,
        makerAmountPerEth,
        quoteReport,
        extendedQuoteReportSources,
        priceComparisonsReport,
        blockNumber,
    };

    if (side === MarketOperation.Buy) {
        return {
            ...swapQuote,
            type: MarketOperation.Buy,
            makerTokenFillAmount: assetFillAmount,
            maxSlippage: slippage,
            hops: quoteHops,
        };
    } else {
        return {
            ...swapQuote,
            type: MarketOperation.Sell,
            takerTokenFillAmount: assetFillAmount,
            maxSlippage: slippage,
            hops: quoteHops,
        };
    }
}

function toSwapQuoteHop(hop: OptimizedHop, side: MarketOperation, slippage: number): SwapQuoteHop {
    const orders = hop.orders.map(o => toSwapQuoteOrder(o, side, slippage));
    const takerAmount = side === MarketOperation.Sell ? hop.inputAmount : hop.outputAmount;
    const makerAmount = side === MarketOperation.Sell ? hop.outputAmount : hop.inputAmount;
    return {
        orders,
        makerAmount: roundMakerAmount(side, makerAmount),
        takerAmount: roundTakerAmount(side, takerAmount),
        makerToken: side === MarketOperation.Sell ? hop.outputToken : hop.inputToken,
        takerToken: side === MarketOperation.Sell ? hop.inputToken : hop.outputToken,
        minMakerAmount: slipMakerAmount(side, makerAmount, slippage),
        maxTakerAmount: slipTakerAmount(side, takerAmount, slippage),
        sourceFlags: hop.sourceFlags,
    };
}

function roundMakerAmount(side: MarketOperation, makerAmount: BigNumber): BigNumber {
    const rm = side === MarketOperation.Sell ? BigNumber.ROUND_DOWN : BigNumber.ROUND_UP;
    return makerAmount.integerValue(rm);
}

function roundTakerAmount(side: MarketOperation, takerAmount: BigNumber): BigNumber {
    const rm = side === MarketOperation.Sell ? BigNumber.ROUND_UP : BigNumber.ROUND_UP;
    return takerAmount.integerValue(rm);
}

function slipMakerAmount(side: MarketOperation, makerAmount: BigNumber, slippage: number): BigNumber {
    return roundMakerAmount(
        side,
        side === MarketOperation.Sell ? makerAmount.times(1 - slippage) : makerAmount,
    );
}

function slipTakerAmount(side: MarketOperation, takerAmount: BigNumber, slippage: number): BigNumber {
    return roundTakerAmount(
        side,
        side === MarketOperation.Sell ? takerAmount : takerAmount.times(1 + slippage),
    );
}

function toSwapQuoteOrder(order: OptimizedOrder, side: MarketOperation, slippage: number): SwapQuoteGenericBridgeOrder | SwapQuoteNativeOrder {
    const { inputToken, outputToken, inputAmount, outputAmount, ...rest } = order;
    const common = {
        ...rest,
        takerToken: side === MarketOperation.Sell ? inputToken : outputToken,
        makerToken: side === MarketOperation.Sell ? outputToken : inputToken,
        takerAmount: side === MarketOperation.Sell ? inputAmount : outputAmount,
        makerAmount: side === MarketOperation.Sell ? outputAmount : inputAmount,
    };
    if (isBridgeOrder(order)) {
        return {
            ...common,
            minMakerAmount: slipMakerAmount(
                side,
                side === MarketOperation.Sell
                    ? order.outputAmount
                    : order.inputAmount,
                slippage,
            ),
            maxTakerAmount: slipTakerAmount(
                side,
                side === MarketOperation.Sell
                    ? order.inputAmount
                    : order.outputAmount,
                slippage,
            ),
        };
    }
    return common as SwapQuoteNativeOrder;
}

function isBridgeOrder(order: OptimizedOrder): order is OptimizedGenericBridgeOrder {
    return order.type === FillQuoteTransformerOrderType.Bridge;
}

function calculateQuoteInfo(
    hops: SwapQuoteHop[],
    side: MarketOperation,
    fillAmount: BigNumber,
    gasPrice: BigNumber,
    slippage: number,
): { bestCaseQuoteInfo: SwapQuoteInfo; worstCaseQuoteInfo: SwapQuoteInfo; sourceBreakdown: SwapQuoteOrdersBreakdown } {
    const getNextFillAmount = (fillResults: QuoteFillResult[]) => {
        if (fillResults.length === 0) {
            return fillAmount;
        }
        const lastFillResult = fillResults[fillResults.length - 1];
        const { totalTakerAssetAmount, makerAssetAmount } =  lastFillResult;
        return side === MarketOperation.Sell
            ? makerAssetAmount : totalTakerAssetAmount;
    };

    const bestCaseFillResults = [];
    const worstCaseFillResults = [];
    const tokenPath = [];
    for (const [i, hop] of hops.entries()) {
        if (i === 0 || i < hops.length - 1) {
            if (side == MarketOperation.Sell) {
                tokenPath.push(hop.takerToken);
            } else {
                tokenPath.unshift(hop.makerToken);
            }
        }
        if (i === tokenPath.length - 1) {
            if (side === MarketOperation.Sell) {
                tokenPath.push(hop.makerToken);
            } else {
                tokenPath.unshift(hop.takerToken);
            }
        }
        const bestCaseFillResult = simulateBestCaseFill({
            gasPrice,
            side,
            orders: hop.orders,
            fillAmount: getNextFillAmount(bestCaseFillResults),
            opts: {},
        });
        bestCaseFillResults.push(bestCaseFillResult);

        const worstCaseFillResult = simulateWorstCaseFill({
            gasPrice,
            side,
            orders: hop.orders,
            fillAmount: getNextFillAmount(worstCaseFillResults),
            opts: { slippage },
        });
        worstCaseFillResults.push(worstCaseFillResult);
    }

    const combinedBestCaseFillResult = combineQuoteFillResults(side, bestCaseFillResults);
    const combinedWorstCaseFillResult = combineQuoteFillResults(side, worstCaseFillResults);
    const sourceBreakdown = getSwapQuoteOrdersBreakdown(side, tokenPath, bestCaseFillResults);
    return {
        sourceBreakdown,
        bestCaseQuoteInfo: fillResultsToQuoteInfo(combinedBestCaseFillResult),
        worstCaseQuoteInfo: fillResultsToQuoteInfo(combinedWorstCaseFillResult),
    };
}

function combineQuoteFillResults(side: MarketOperation, fillResults: QuoteFillResult[]): QuoteFillResult {
    if (fillResults.length === 0) {
        throw new Error(`Empty fillResults array`);
    }
    const orderedFillResults = side === MarketOperation.Sell ? fillResults : fillResults.slice().reverse();
    const lastResult = orderedFillResults[orderedFillResults.length - 1];
    const r = {
        ...orderedFillResults[0],
       makerAssetAmount: lastResult.makerAssetAmount,
       totalMakerAssetAmount: lastResult.totalMakerAssetAmount,
   };
    for (const fr of orderedFillResults.slice(1)) {
        r.gas += fr.gas + 30e3;
        r.protocolFeeAmount = r.protocolFeeAmount.plus(fr.protocolFeeAmount);
    }
    return r;
}

function getSwapQuoteOrdersBreakdown(side: MarketOperation, tokenPath: Address[], hopFillResults: QuoteFillResult[]): SwapQuoteOrdersBreakdown {
    const cumulativeFillRatioBySource: Partial<{ [key in ERC20BridgeSource]: number }> = {};
    for (const hop of hopFillResults) {
        const hopTotalFillAmount = side === MarketOperation.Sell
            ? hop.totalTakerAssetAmount
            : hop.totalMakerAssetAmount;
        for (const [source, sourceFillAmount] of Object.entries(hop.fillAmountBySource)) {
            cumulativeFillRatioBySource[source as ERC20BridgeSource] =
                (cumulativeFillRatioBySource[source as ERC20BridgeSource] || 0)
                + sourceFillAmount.div(hopTotalFillAmount).toNumber();
        }
    }
    const globalFillRatiosSum = Object.values(cumulativeFillRatioBySource).reduce((a, v) => a! + v!, 0);
    if (!globalFillRatiosSum) {
        return {};
    }
    const breakdown: SwapQuoteOrdersBreakdown = {};
    for (const [source, fillRatio] of Object.entries(cumulativeFillRatioBySource)) {
        (breakdown as any)[source] = fillRatio! / globalFillRatiosSum;
    }
    const hopBreakdowns = hopFillResults.map(hop => {
        const hopTotalFillAmount = side === MarketOperation.Sell
            ? hop.totalTakerAssetAmount
            : hop.totalMakerAssetAmount;
        return Object.assign(
            {},
            ...Object.entries(hop.fillAmountBySource).map(([source, sourceFillAmount]) => ({
                [source as ERC20BridgeSource]: sourceFillAmount.div(hopTotalFillAmount).toNumber(),
            })),
        );
    });
    if (hopFillResults.length > 1) {
        return {
            [ERC20BridgeSource.MultiHop]: {
                proportion: 1,
                tokenPath: tokenPath,
                breakdowns: side === MarketOperation.Sell ? hopBreakdowns : hopBreakdowns.reverse(),
            },
        };
    }
    return breakdown;
}

function fillResultsToQuoteInfo(fr: QuoteFillResult): SwapQuoteInfo {
    return {
        makerAmount: fr.totalMakerAssetAmount,
        takerAmount: fr.takerAssetAmount,
        totalTakerAmount: fr.totalTakerAssetAmount,
        feeTakerTokenAmount: fr.takerFeeTakerAssetAmount,
        protocolFeeInWeiAmount: fr.protocolFeeAmount,
        gas: fr.gas,
    };
}

function createDummyOrder(makerToken: string, takerToken: string): SignedNativeOrder {
    return {
        type: FillQuoteTransformerOrderType.Limit,
        order: {
            ...new LimitOrder({
                makerToken,
                takerToken,
                makerAmount: ZERO_AMOUNT,
                takerAmount: ZERO_AMOUNT,
                takerTokenFeeAmount: ZERO_AMOUNT,
            }),
        },
        signature: INVALID_SIGNATURE,
    };
}
