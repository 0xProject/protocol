import { CommonOrderFields, FillQuoteTransformerOrderType, LimitOrder, RfqOrder } from '@0x/protocol-utils';
import { V4RFQIndicativeQuote } from '@0x/quote-server';
import { SignedOrder } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { AssetSwapperContractAddresses, MarketOperation } from '../../types';
import { QuoteRequestor } from '../quote_requestor';
import { getPriceAwareRFQRolloutFlags } from '../utils';

import { generateQuoteReport, QuoteReport } from './../quote_report_generator';
import { getComparisonPrices } from './comparison_price';
import {
    BUY_SOURCE_FILTER,
    DEFAULT_GET_MARKET_ORDERS_OPTS,
    FEE_QUOTE_SOURCES,
    ONE_ETHER,
    SELL_SOURCE_FILTER,
    SOURCE_FLAGS,
    ZERO_AMOUNT,
} from './constants';
import { createFills } from './fills';
import { getBestTwoHopQuote } from './multihop_utils';
import { createOrdersFromTwoHopSample } from './orders';
import { findOptimalPathAsync } from './path_optimizer';
import { DexOrderSampler, getSampleAmounts } from './sampler';
import { SourceFilters } from './source_filters';
import {
    AggregationError,
    CollapsedFill,
    DexSample,
    ERC20BridgeSource,
    GenerateOptimizedOrdersOpts,
    GetMarketOrdersOpts,
    MarketSideLiquidity,
    OptimizerResult,
    OptimizerResultWithReport,
    OrderDomain,
} from './types';

// tslint:disable:boolean-naming

/**
 * Returns a indicative quotes or an empty array if RFQT is not enabled or requested
 * @param makerAssetData the maker asset data
 * @param takerAssetData the taker asset data
 * @param marketOperation Buy or Sell
 * @param assetFillAmount the amount to fill, in base units
 * @param opts market request options
 */
export function shouldIncludeIndicativeRfqt(opts: Partial<GetMarketOrdersOpts>): boolean {
    if (opts.rfqt && opts.rfqt.isIndicative === true && opts.rfqt.quoteRequestor) {
        return true;
    } else {
        return false;
    }
}

export class MarketOperationUtils {
    private readonly _wethAddress: string;
    private readonly _sellSources: SourceFilters;
    private readonly _buySources: SourceFilters;
    private readonly _feeSources = new SourceFilters(FEE_QUOTE_SOURCES);

    private static _computeQuoteReport(
        quoteRequestor: QuoteRequestor | undefined,
        marketSideLiquidity: MarketSideLiquidity,
        optimizerResult: OptimizerResult,
        comparisonPrice?: BigNumber | undefined,
    ): QuoteReport {
        const { side, quotes } = marketSideLiquidity;
        const { dexQuotes, twoHopQuotes, nativeOrders } = quotes;
        const { liquidityDelivered } = optimizerResult;
        return generateQuoteReport(
            side,
            _.flatten(dexQuotes),
            twoHopQuotes,
            nativeOrders,
            orderFillableAmounts,
            liquidityDelivered,
            comparisonPrice,
            quoteRequestor,
        );
    }

    constructor(
        private readonly _sampler: DexOrderSampler,
        private readonly contractAddresses: AssetSwapperContractAddresses,
        private readonly _orderDomain: OrderDomain,
    ) {
        this._wethAddress = contractAddresses.etherToken.toLowerCase();
        this._buySources = BUY_SOURCE_FILTER;
        this._sellSources = SELL_SOURCE_FILTER;
    }

    /**
     * Gets the liquidity available for a market sell operation
     * @param nativeOrders Native orders.
     * @param takerAmount Amount of taker asset to sell.
     * @param opts Options object.
     * @return MarketSideLiquidity.
     */
    public async getMarketSellLiquidityAsync(
        nativeOrders: { order: LimitOrder | RfqOrder; orderType: FillQuoteTransformerOrderType }[],
        takerAmount: BigNumber,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<MarketSideLiquidity> {
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const { makerToken, takerToken } = nativeOrders[0].order;
        const sampleAmounts = getSampleAmounts(takerAmount, _opts.numSamples, _opts.sampleDistributionBase);

        const requestFilters = new SourceFilters().exclude(_opts.excludedSources).include(_opts.includedSources);
        const quoteSourceFilters = this._sellSources.merge(requestFilters);
        const feeSourceFilters = this._feeSources.exclude(_opts.excludedFeeSources);

        const {
            onChain: sampleBalancerOnChain,
            offChain: sampleBalancerOffChain,
        } = this._sampler.balancerPoolsCache.howToSampleBalancer(
            takerToken,
            makerToken,
            quoteSourceFilters.isAllowed(ERC20BridgeSource.Balancer),
        );

        const {
            onChain: sampleCreamOnChain,
            offChain: sampleCreamOffChain,
        } = this._sampler.creamPoolsCache.howToSampleCream(
            takerToken,
            makerToken,
            quoteSourceFilters.isAllowed(ERC20BridgeSource.Cream),
        );

        const offChainSources = [
            ...(!sampleCreamOnChain ? [ERC20BridgeSource.Cream] : []),
            ...(!sampleBalancerOnChain ? [ERC20BridgeSource.Balancer] : []),
        ];

        // Call the sampler contract.
        const samplerPromise = this._sampler.executeAsync(
            this._sampler.getTokenDecimals(makerToken, takerToken),
            // Get native order fillable amounts.
            this._sampler.getOrderFillableTakerAmounts(
                nativeOrders.map(o => o.order),
                this.contractAddresses.exchange,
            ),
            // Get ETH -> maker token price.
            this._sampler.getMedianSellRate(feeSourceFilters.sources, makerToken, this._wethAddress, ONE_ETHER),
            // Get ETH -> taker token price.
            this._sampler.getMedianSellRate(feeSourceFilters.sources, takerToken, this._wethAddress, ONE_ETHER),
            // Get sell quotes for taker -> maker.
            this._sampler.getSellQuotes(
                quoteSourceFilters.exclude(offChainSources).sources,
                makerToken,
                takerToken,
                sampleAmounts,
            ),
            this._sampler.getTwoHopSellQuotes(
                quoteSourceFilters.isAllowed(ERC20BridgeSource.MultiHop) ? quoteSourceFilters.sources : [],
                makerToken,
                takerToken,
                takerAmount,
            ),
        );

        const isPriceAwareRfqEnabled =
            _opts.rfqt && getPriceAwareRFQRolloutFlags(_opts.rfqt.priceAwareRFQFlag).isIndicativePriceAwareEnabled;
        const rfqtPromise =
            !isPriceAwareRfqEnabled &&
            quoteSourceFilters.isAllowed(ERC20BridgeSource.Native) &&
            shouldIncludeIndicativeRfqt(_opts)
                ? _opts.rfqt?.quoteRequestor?.requestRfqtIndicativeQuotesAsync(
                      makerToken,
                      takerToken,
                      takerAmount,
                      MarketOperation.Sell,
                      undefined,
                      _opts.rfqt,
                  ) || []
                : Promise.resolve([] as V4RFQIndicativeQuote[]);

        const offChainBalancerPromise = sampleBalancerOffChain
            ? this._sampler.getBalancerSellQuotesOffChainAsync(makerToken, takerToken, sampleAmounts)
            : Promise.resolve([]);

        const offChainCreamPromise = sampleCreamOffChain
            ? this._sampler.getCreamSellQuotesOffChainAsync(makerToken, takerToken, sampleAmounts)
            : Promise.resolve([]);

        const [
            [tokenDecimals, orderFillableAmounts, ethToMakerAssetRate, ethToTakerAssetRate, dexQuotes, twoHopQuotes],
            rfqtIndicativeQuotes,
            offChainBalancerQuotes,
            offChainCreamQuotes,
        ] = await Promise.all([samplerPromise, rfqtPromise, offChainBalancerPromise, offChainCreamPromise]);

        const [makerTokenDecimals, takerTokenDecimals] = tokenDecimals;
        return {
            side: MarketOperation.Sell,
            inputAmount: takerAmount,
            inputToken: takerToken,
            outputToken: makerToken,
            ethToOutputRate: ethToMakerAssetRate,
            ethToInputRate: ethToTakerAssetRate,
            quoteSourceFilters,
            makerTokenDecimals: makerTokenDecimals.toNumber(),
            takerTokenDecimals: takerTokenDecimals.toNumber(),
            quotes: {
                nativeOrders: nativeOrders.map((order, i) => ({
                    ...order,
                    orderFillableAmount: orderFillableAmounts[i],
                })),
                rfqtIndicativeQuotes,
                twoHopQuotes,
                dexQuotes: dexQuotes.concat([...offChainBalancerQuotes, ...offChainCreamQuotes]),
            },
        };
    }

    /**
     * Gets the liquidity available for a market buy operation
     * @param nativeOrders Native orders.
     * @param makerAmount Amount of maker asset to buy.
     * @param opts Options object.
     * @return MarketSideLiquidity.
     */
    public async getMarketBuyLiquidityAsync(
        nativeOrders: { order: LimitOrder | RfqOrder; orderType: FillQuoteTransformerOrderType }[],
        makerAmount: BigNumber,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<MarketSideLiquidity> {
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const { makerToken, takerToken } = nativeOrders[0].order;
        const sampleAmounts = getSampleAmounts(makerAmount, _opts.numSamples, _opts.sampleDistributionBase);

        const requestFilters = new SourceFilters().exclude(_opts.excludedSources).include(_opts.includedSources);
        const quoteSourceFilters = this._buySources.merge(requestFilters);
        const feeSourceFilters = this._feeSources.exclude(_opts.excludedFeeSources);

        const {
            onChain: sampleBalancerOnChain,
            offChain: sampleBalancerOffChain,
        } = this._sampler.balancerPoolsCache.howToSampleBalancer(
            takerToken,
            makerToken,
            quoteSourceFilters.isAllowed(ERC20BridgeSource.Balancer),
        );

        const {
            onChain: sampleCreamOnChain,
            offChain: sampleCreamOffChain,
        } = this._sampler.creamPoolsCache.howToSampleCream(
            takerToken,
            makerToken,
            quoteSourceFilters.isAllowed(ERC20BridgeSource.Cream),
        );

        const offChainSources = [
            ...(!sampleCreamOnChain ? [ERC20BridgeSource.Cream] : []),
            ...(!sampleBalancerOnChain ? [ERC20BridgeSource.Balancer] : []),
        ];

        // Call the sampler contract.
        const samplerPromise = this._sampler.executeAsync(
            this._sampler.getTokenDecimals(makerToken, takerToken),
            // Get native order fillable amounts.
            this._sampler.getOrderFillableMakerAmounts(
                nativeOrders.map(o => o.order),
                this.contractAddresses.exchange,
            ),
            // Get ETH -> makerToken token price.
            this._sampler.getMedianSellRate(feeSourceFilters.sources, makerToken, this._wethAddress, ONE_ETHER),
            // Get ETH -> taker token price.
            this._sampler.getMedianSellRate(feeSourceFilters.sources, takerToken, this._wethAddress, ONE_ETHER),
            // Get buy quotes for taker -> maker.
            this._sampler.getBuyQuotes(
                quoteSourceFilters.exclude(offChainSources).sources,
                makerToken,
                takerToken,
                sampleAmounts,
            ),
            this._sampler.getTwoHopBuyQuotes(
                quoteSourceFilters.isAllowed(ERC20BridgeSource.MultiHop) ? quoteSourceFilters.sources : [],
                makerToken,
                takerToken,
                makerAmount,
            ),
        );
        const isPriceAwareRfqEnabled =
            _opts.rfqt && getPriceAwareRFQRolloutFlags(_opts.rfqt.priceAwareRFQFlag).isIndicativePriceAwareEnabled;
        const rfqtPromise =
            !isPriceAwareRfqEnabled &&
            quoteSourceFilters.isAllowed(ERC20BridgeSource.Native) &&
            shouldIncludeIndicativeRfqt(_opts)
                ? _opts.rfqt?.quoteRequestor?.requestRfqtIndicativeQuotesAsync(
                      makerToken,
                      takerToken,
                      makerAmount,
                      MarketOperation.Buy,
                      undefined,
                      _opts.rfqt,
                  ) || []
                : Promise.resolve([]);
        const offChainBalancerPromise = sampleBalancerOffChain
            ? this._sampler.getBalancerBuyQuotesOffChainAsync(makerToken, takerToken, sampleAmounts)
            : Promise.resolve([]);

        const offChainCreamPromise = sampleCreamOffChain
            ? this._sampler.getCreamBuyQuotesOffChainAsync(makerToken, takerToken, sampleAmounts)
            : Promise.resolve([]);

        const [
            [tokenDecimals, orderFillableAmounts, ethToMakerAssetRate, ethToTakerAssetRate, dexQuotes, twoHopQuotes],
            rfqtIndicativeQuotes,
            offChainBalancerQuotes,
            offChainCreamQuotes,
        ] = await Promise.all([samplerPromise, rfqtPromise, offChainBalancerPromise, offChainCreamPromise]);
        const [makerTokenDecimals, takerTokenDecimals] = tokenDecimals;
        return {
            side: MarketOperation.Buy,
            inputAmount: makerAmount,
            inputToken: makerToken,
            outputToken: takerToken,
            ethToOutputRate: ethToTakerAssetRate,
            ethToInputRate: ethToMakerAssetRate,
            quoteSourceFilters,
            makerTokenDecimals: makerTokenDecimals.toNumber(),
            takerTokenDecimals: takerTokenDecimals.toNumber(),
            quotes: {
                nativeOrders: nativeOrders.map((order, i) => ({
                    ...order,
                    orderFillableAmount: orderFillableAmounts[i],
                })),
                rfqtIndicativeQuotes,
                twoHopQuotes,
                dexQuotes: dexQuotes.concat(offChainBalancerQuotes, offChainCreamQuotes),
            },
        };
    }

    /**
     * gets the orders required for a batch of market buy operations by (potentially) merging native orders with
     * generated bridge orders.
     *
     * NOTE: Currently `getBatchMarketBuyOrdersAsync()` does not support external liquidity providers.
     *
     * @param batchNativeOrders Batch of Native orders.
     * @param makerAmounts Array amount of maker asset to buy for each batch.
     * @param opts Options object.
     * @return orders.
     */
    public async getBatchMarketBuyOrdersAsync(
        batchNativeOrders: { order: RfqOrder | LimitOrder; orderType: FillQuoteTransformerOrderType }[][],
        makerAmounts: BigNumber[],
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<Array<OptimizerResult | undefined>> {
        if (batchNativeOrders.length === 0) {
            throw new Error(AggregationError.EmptyOrders);
        }
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };

        const requestFilters = new SourceFilters().exclude(_opts.excludedSources).include(_opts.includedSources);
        const quoteSourceFilters = this._buySources.merge(requestFilters);

        const feeSourceFilters = this._feeSources.exclude(_opts.excludedFeeSources);

        const ops = [
            ...batchNativeOrders.map(orders =>
                this._sampler.getOrderFillableMakerAmounts(
                    orders.map(o => o.order),
                    this.contractAddresses.exchange,
                ),
            ),
            ...batchNativeOrders.map(orders =>
                this._sampler.getMedianSellRate(
                    feeSourceFilters.sources,
                    orders[0].order.takerToken,
                    this._wethAddress,
                    ONE_ETHER,
                ),
            ),
            ...batchNativeOrders.map((orders, i) =>
                this._sampler.getBuyQuotes(
                    quoteSourceFilters.sources,
                    orders[0].order.makerToken,
                    orders[0].order.takerToken,
                    [makerAmounts[i]],
                ),
            ),
            ...batchNativeOrders.map(orders =>
                this._sampler.getTokenDecimals(orders[0].order.makerToken, orders[0].order.takerToken),
            ),
        ];

        const executeResults = await this._sampler.executeBatchAsync(ops);
        const batchOrderFillableAmounts = executeResults.splice(0, batchNativeOrders.length) as BigNumber[][];
        const batchEthToTakerAssetRate = executeResults.splice(0, batchNativeOrders.length) as BigNumber[];
        const batchDexQuotes = executeResults.splice(0, batchNativeOrders.length) as DexSample[][][];
        const batchTokenDecimals = executeResults.splice(0, batchNativeOrders.length) as number[][];
        const ethToInputRate = ZERO_AMOUNT;

        return Promise.all(
            batchNativeOrders.map(async (nativeOrders, i) => {
                if (nativeOrders.length === 0) {
                    throw new Error(AggregationError.EmptyOrders);
                }
                const { makerToken, takerToken } = nativeOrders[0].order;
                const orderFillableAmounts = batchOrderFillableAmounts[i];
                const ethToTakerAssetRate = batchEthToTakerAssetRate[i];
                const dexQuotes = batchDexQuotes[i];
                const makerAmount = makerAmounts[i];
                try {
                    const optimizerResult = await this._generateOptimizedOrdersAsync(
                        {
                            side: MarketOperation.Buy,
                            inputToken: makerToken,
                            outputToken: takerToken,
                            inputAmount: makerAmount,
                            ethToOutputRate: ethToTakerAssetRate,
                            ethToInputRate,
                            quoteSourceFilters,
                            makerTokenDecimals: batchTokenDecimals[i][0],
                            takerTokenDecimals: batchTokenDecimals[i][1],
                            quotes: {
                                nativeOrders: nativeOrders.map((o, k) => ({
                                    ...o,
                                    orderFillableAmount: orderFillableAmounts[k],
                                })),
                                dexQuotes,
                                rfqtIndicativeQuotes: [],
                                twoHopQuotes: [],
                            },
                        },
                        {
                            bridgeSlippage: _opts.bridgeSlippage,
                            maxFallbackSlippage: _opts.maxFallbackSlippage,
                            excludedSources: _opts.excludedSources,
                            feeSchedule: _opts.feeSchedule,
                            allowFallback: _opts.allowFallback,
                        },
                    );
                    return optimizerResult;
                } catch (e) {
                    // It's possible for one of the pairs to have no path
                    // rather than throw NO_OPTIMAL_PATH we return undefined
                    return undefined;
                }
            }),
        );
    }

    public async _generateOptimizedOrdersAsync(
        marketSideLiquidity: MarketSideLiquidity,
        opts: GenerateOptimizedOrdersOpts,
    ): Promise<OptimizerResult> {
        const {
            inputToken,
            outputToken,
            side,
            inputAmount,
            quotes,
            ethToOutputRate,
            ethToInputRate,
        } = marketSideLiquidity;
        const { nativeOrders, rfqtIndicativeQuotes, dexQuotes } = quotes;
        const maxFallbackSlippage = opts.maxFallbackSlippage || 0;

        const orderOpts = {
            side,
            inputToken,
            outputToken,
            orderDomain: this._orderDomain,
            contractAddresses: this.contractAddresses,
            bridgeSlippage: opts.bridgeSlippage || 0,
        };

        const augmentedRfqtIndicativeQuotes = rfqtIndicativeQuotes.map(q => ({
            order: new RfqOrder(q),
            orderFillableAmount: q.takerAmount,
            orderType: FillQuoteTransformerOrderType.Rfq,
        }));

        // Convert native orders and dex quotes into `Fill` objects.
        const fills = createFills({
            side,
            orders: [...nativeOrders, ...augmentedRfqtIndicativeQuotes],
            dexQuotes,
            targetInput: inputAmount,
            ethToOutputRate,
            ethToInputRate,
            excludedSources: opts.excludedSources,
            feeSchedule: opts.feeSchedule,
        });

        // Find the optimal path.
        const optimizerOpts = {
            ethToOutputRate,
            ethToInputRate,
            exchangeProxyOverhead: opts.exchangeProxyOverhead || (() => ZERO_AMOUNT),
        };

        // NOTE: For sell quotes input is the taker asset and for buy quotes input is the maker asset
        const takerAssetToEthRate = side === MarketOperation.Sell ? ethToInputRate : ethToOutputRate;
        const makerAssetToEthRate = side === MarketOperation.Sell ? ethToOutputRate : ethToInputRate;

        // Find the optimal path
        const optimalPath = await findOptimalPathAsync(side, fills, inputAmount, opts.runLimit, optimizerOpts);
        const optimalPathRate = optimalPath ? optimalPath.adjustedRate() : ZERO_AMOUNT;

        const { adjustedRate: bestTwoHopRate, quote: bestTwoHopQuote } = getBestTwoHopQuote(
            marketSideLiquidity,
            opts.feeSchedule,
            opts.exchangeProxyOverhead,
        );
        if (bestTwoHopQuote && bestTwoHopRate.isGreaterThan(optimalPathRate)) {
            const twoHopOrders = createOrdersFromTwoHopSample(bestTwoHopQuote, orderOpts);
            return {
                optimizedOrders: twoHopOrders,
                liquidityDelivered: bestTwoHopQuote,
                sourceFlags: SOURCE_FLAGS[ERC20BridgeSource.MultiHop],
                marketSideLiquidity,
                adjustedRate: bestTwoHopRate,
                takerAssetToEthRate,
                makerAssetToEthRate,
            };
        }

        // If there is no optimal path AND we didn't return a MultiHop quote, then throw
        if (optimalPath === undefined) {
            throw new Error(AggregationError.NoOptimalPath);
        }

        // Generate a fallback path if native orders are in the optimal path.
        const nativeFills = optimalPath.fills.filter(f => f.source === ERC20BridgeSource.Native);
        if (opts.allowFallback && nativeFills.length !== 0) {
            // We create a fallback path that is exclusive of Native liquidity
            // This is the optimal on-chain path for the entire input amount
            const nonNativeFills = fills.filter(p => p.length > 0 && p[0].source !== ERC20BridgeSource.Native);
            const nonNativeOptimalPath = await findOptimalPathAsync(side, nonNativeFills, inputAmount, opts.runLimit);
            // Calculate the slippage of on-chain sources compared to the most optimal path
            if (
                nonNativeOptimalPath !== undefined &&
                (nativeFills.length === optimalPath.fills.length ||
                    nonNativeOptimalPath.adjustedSlippage(optimalPathRate) <= maxFallbackSlippage)
            ) {
                optimalPath.addFallback(nonNativeOptimalPath);
            }
        }
        const collapsedPath = optimalPath.collapse(orderOpts);

        return {
            optimizedOrders: collapsedPath.orders,
            liquidityDelivered: collapsedPath.collapsedFills as CollapsedFill[],
            sourceFlags: collapsedPath.sourceFlags,
            marketSideLiquidity,
            adjustedRate: optimalPathRate,
            takerAssetToEthRate,
            makerAssetToEthRate,
        };
    }

    public async getMarketSideOrdersAsync(
        nativeOrders: { order: RfqOrder | LimitOrder; orderType: FillQuoteTransformerOrderType }[],
        amount: BigNumber,
        side: MarketOperation,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<OptimizerResultWithReport> {
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const optimizerOpts: GenerateOptimizedOrdersOpts = {
            bridgeSlippage: _opts.bridgeSlippage,
            maxFallbackSlippage: _opts.maxFallbackSlippage,
            excludedSources: _opts.excludedSources,
            feeSchedule: _opts.feeSchedule,
            allowFallback: _opts.allowFallback,
            exchangeProxyOverhead: _opts.exchangeProxyOverhead,
        };

        if (nativeOrders.length === 0) {
            throw new Error(AggregationError.EmptyOrders);
        }

        // Compute an optimized path for on-chain DEX and open-orderbook. This should not include RFQ liquidity.
        const marketLiquidityFnAsync =
            side === MarketOperation.Sell
                ? this.getMarketSellLiquidityAsync.bind(this)
                : this.getMarketBuyLiquidityAsync.bind(this);
        let marketSideLiquidity: MarketSideLiquidity = await marketLiquidityFnAsync(nativeOrders, amount, _opts);
        let optimizerResult: OptimizerResult | undefined;
        try {
            optimizerResult = await this._generateOptimizedOrdersAsync(marketSideLiquidity, optimizerOpts);
        } catch (e) {
            // If no on-chain or off-chain Open Orderbook orders are present, a `NoOptimalPath` will be thrown.
            // If this happens at this stage, there is still a chance that an RFQ order is fillable, therefore
            // we catch the error and continue.
            if (e.message !== AggregationError.NoOptimalPath) {
                throw e;
            }
        }

        // Calculate a suggested price. For now, this is simply the overall price of the aggregation.
        // We can use this as a comparison price for RFQ
        let wholeOrderPrice: BigNumber | undefined;
        if (optimizerResult) {
            wholeOrderPrice = getComparisonPrices(
                optimizerResult.adjustedRate,
                amount,
                marketSideLiquidity,
                _opts.feeSchedule,
            ).wholeOrder;
        }

        // If RFQ liquidity is enabled, make a request to check RFQ liquidity against the first optimizer result
        const { rfqt } = _opts;
        if (rfqt && rfqt.quoteRequestor && marketSideLiquidity.quoteSourceFilters.isAllowed(ERC20BridgeSource.Native)) {
            const { isFirmPriceAwareEnabled, isIndicativePriceAwareEnabled } = getPriceAwareRFQRolloutFlags(
                rfqt.priceAwareRFQFlag,
            );
            const { makerToken, takerToken } = nativeOrders[0].order;

            if (rfqt.isIndicative && isIndicativePriceAwareEnabled) {
                // An indicative quote is being requested, and indicative quotes price-aware enabled
                // Make the RFQT request and then re-run the sampler if new orders come back.
                const indicativeQuotes = await rfqt.quoteRequestor.requestRfqtIndicativeQuotesAsync(
                    makerToken,
                    takerToken,
                    amount,
                    side,
                    wholeOrderPrice,
                    rfqt,
                );
                // Re-run optimizer with the new indicative quote
                if (indicativeQuotes.length > 0) {
                    marketSideLiquidity.quotes.rfqtIndicativeQuotes = indicativeQuotes;
                    optimizerResult = await this._generateOptimizedOrdersAsync(marketSideLiquidity, optimizerOpts);
                }
            } else if (!rfqt.isIndicative && isFirmPriceAwareEnabled && rfqt.intentOnFilling) {
                // A firm quote is being requested, and firm quotes price-aware enabled.
                // Ensure that `intentOnFilling` is enabled and make the request.
                const firmQuotes = await rfqt.quoteRequestor.requestRfqtFirmQuotesAsync(
                    makerToken,
                    takerToken,
                    amount,
                    side,
                    wholeOrderPrice,
                    rfqt,
                );
                if (firmQuotes.length > 0) {
                    // Compute the RFQ order fillable amounts. This is done by performing a "soft" order
                    // validation and by checking order balances that are monitored by our worker.
                    // If a firm quote validator does not exist, then we assume that all orders are valid.
                    const rfqOrderFillableAmounts =
                        rfqt.firmQuoteValidator === undefined
                            ? firmQuotes.map(signedOrder => signedOrder.takerAmount)
                            : await rfqt.firmQuoteValidator.getRfqtTakerFillableAmountsAsync(firmQuotes);

                    const quotesWithOrderFillableAmounts = firmQuotes.map((order, i) => ({
                        order,
                        orderFillableAmount: rfqOrderFillableAmounts[i],
                        orderType: FillQuoteTransformerOrderType.Rfq,
                    }));
                    marketSideLiquidity.quotes.nativeOrders.concat(quotesWithOrderFillableAmounts);

                    // Re-run optimizer with the new firm quote. This is the second and last time
                    // we run the optimized in a block of code. In this case, we don't catch a potential `NoOptimalPath` exception
                    // and we let it bubble up if it happens.
                    optimizerResult = await this._generateOptimizedOrdersAsync(marketSideLiquidity, optimizerOpts);
                }
            }
        }

        // At this point we should have at least one valid optimizer result, therefore we manually raise
        // `NoOptimalPath` if no optimizer result was ever set.
        if (optimizerResult === undefined) {
            throw new Error(AggregationError.NoOptimalPath);
        }

        // Compute Quote Report and return the results.
        let quoteReport: QuoteReport | undefined;
        if (_opts.shouldGenerateQuoteReport) {
            quoteReport = MarketOperationUtils._computeQuoteReport(
                _opts.rfqt ? _opts.rfqt.quoteRequestor : undefined,
                marketSideLiquidity,
                optimizerResult,
                wholeOrderPrice,
            );
        }
        return { ...optimizerResult, quoteReport };
    }
}

// tslint:disable: max-file-line-count
