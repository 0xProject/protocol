import { RFQTIndicativeQuote } from '@0x/quote-server';
import { SignedOrder } from '@0x/types';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
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
import {
    createOrdersFromTwoHopSample,
    createSignedOrdersFromRfqtIndicativeQuotes,
    createSignedOrdersWithFillableAmounts,
    getNativeOrderTokens,
} from './orders';
import { fillsToSortedPaths, findOptimalPathAsync } from './path_optimizer';
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
export async function getRfqtIndicativeQuotesAsync(
    makerAssetData: string,
    takerAssetData: string,
    marketOperation: MarketOperation,
    assetFillAmount: BigNumber,
    comparisonPrice: BigNumber | undefined,
    opts: Partial<GetMarketOrdersOpts>,
): Promise<RFQTIndicativeQuote[]> {
    if (opts.rfqt && opts.rfqt.isIndicative === true && opts.rfqt.quoteRequestor) {
        return opts.rfqt.quoteRequestor.requestRfqtIndicativeQuotesAsync(
            makerAssetData,
            takerAssetData,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            opts.rfqt,
        );
    } else {
        return Promise.resolve<RFQTIndicativeQuote[]>([]);
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
        const { side, dexQuotes, twoHopQuotes, orderFillableAmounts, nativeOrders } = marketSideLiquidity;
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
        nativeOrders: SignedOrder[],
        takerAmount: BigNumber,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<MarketSideLiquidity> {
        if (nativeOrders.length === 0) {
            throw new Error(AggregationError.EmptyOrders);
        }
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const [makerToken, takerToken] = getNativeOrderTokens(nativeOrders[0]);
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
            this._sampler.getOrderFillableTakerAmounts(nativeOrders, this.contractAddresses.exchange),
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
            !isPriceAwareRfqEnabled && quoteSourceFilters.isAllowed(ERC20BridgeSource.Native)
                ? getRfqtIndicativeQuotesAsync(
                      nativeOrders[0].makerAssetData,
                      nativeOrders[0].takerAssetData,
                      MarketOperation.Sell,
                      takerAmount,
                      undefined,
                      _opts,
                  )
                : Promise.resolve([]);

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
            dexQuotes: dexQuotes.concat([...offChainBalancerQuotes, ...offChainCreamQuotes]),
            nativeOrders,
            orderFillableAmounts,
            ethToOutputRate: ethToMakerAssetRate,
            ethToInputRate: ethToTakerAssetRate,
            rfqtIndicativeQuotes,
            twoHopQuotes,
            quoteSourceFilters,
            makerTokenDecimals: makerTokenDecimals.toNumber(),
            takerTokenDecimals: takerTokenDecimals.toNumber(),
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
        nativeOrders: SignedOrder[],
        makerAmount: BigNumber,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<MarketSideLiquidity> {
        if (nativeOrders.length === 0) {
            throw new Error(AggregationError.EmptyOrders);
        }
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const [makerToken, takerToken] = getNativeOrderTokens(nativeOrders[0]);
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
            this._sampler.getOrderFillableMakerAmounts(nativeOrders, this.contractAddresses.exchange),
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
            !isPriceAwareRfqEnabled && quoteSourceFilters.isAllowed(ERC20BridgeSource.Native)
                ? getRfqtIndicativeQuotesAsync(
                      nativeOrders[0].makerAssetData,
                      nativeOrders[0].takerAssetData,
                      MarketOperation.Buy,
                      makerAmount,
                      undefined,
                      _opts,
                  )
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
            dexQuotes: dexQuotes.concat(offChainBalancerQuotes, offChainCreamQuotes),
            nativeOrders,
            orderFillableAmounts,
            ethToOutputRate: ethToTakerAssetRate,
            ethToInputRate: ethToMakerAssetRate,
            rfqtIndicativeQuotes,
            twoHopQuotes,
            quoteSourceFilters,
            makerTokenDecimals: makerTokenDecimals.toNumber(),
            takerTokenDecimals: takerTokenDecimals.toNumber(),
        };
    }

    /**
     * gets the orders required for a market sell operation by (potentially) merging native orders with
     * generated bridge orders.
     * @param nativeOrders Native orders.
     * @param takerAmount Amount of taker asset to sell.
     * @param opts Options object.
     * @return object with optimized orders and a QuoteReport
     */
    public async getMarketSellOrdersAsync(
        nativeOrders: SignedOrder[],
        takerAmount: BigNumber,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<OptimizerResultWithReport> {
        return this._getMarketSideOrdersAsync(nativeOrders, takerAmount, MarketOperation.Sell, opts);
    }

    /**
     * gets the orders required for a market buy operation by (potentially) merging native orders with
     * generated bridge orders.
     * @param nativeOrders Native orders.
     * @param makerAmount Amount of maker asset to buy.
     * @param opts Options object.
     * @return object with optimized orders and a QuoteReport
     */
    public async getMarketBuyOrdersAsync(
        nativeOrders: SignedOrder[],
        makerAmount: BigNumber,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<OptimizerResultWithReport> {
        return this._getMarketSideOrdersAsync(nativeOrders, makerAmount, MarketOperation.Buy, opts);
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
        batchNativeOrders: SignedOrder[][],
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
                this._sampler.getOrderFillableMakerAmounts(orders, this.contractAddresses.exchange),
            ),
            ...batchNativeOrders.map(orders =>
                this._sampler.getMedianSellRate(
                    feeSourceFilters.sources,
                    getNativeOrderTokens(orders[0])[1],
                    this._wethAddress,
                    ONE_ETHER,
                ),
            ),
            ...batchNativeOrders.map((orders, i) =>
                this._sampler.getBuyQuotes(
                    quoteSourceFilters.sources,
                    getNativeOrderTokens(orders[0])[0],
                    getNativeOrderTokens(orders[0])[1],
                    [makerAmounts[i]],
                ),
            ),
            ...batchNativeOrders.map(orders =>
                this._sampler.getTokenDecimals(getNativeOrderTokens(orders[0])[0], getNativeOrderTokens(orders[0])[1]),
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
                const [makerToken, takerToken] = getNativeOrderTokens(nativeOrders[0]);
                const orderFillableAmounts = batchOrderFillableAmounts[i];
                const ethToTakerAssetRate = batchEthToTakerAssetRate[i];
                const dexQuotes = batchDexQuotes[i];
                const makerAmount = makerAmounts[i];
                try {
                    const optimizerResult = await this._generateOptimizedOrdersAsync(
                        {
                            side: MarketOperation.Buy,
                            nativeOrders,
                            orderFillableAmounts,
                            dexQuotes,
                            inputAmount: makerAmount,
                            ethToOutputRate: ethToTakerAssetRate,
                            ethToInputRate,
                            rfqtIndicativeQuotes: [],
                            inputToken: makerToken,
                            outputToken: takerToken,
                            twoHopQuotes: [],
                            quoteSourceFilters,
                            makerTokenDecimals: batchTokenDecimals[i][0],
                            takerTokenDecimals: batchTokenDecimals[i][1],
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
            nativeOrders,
            orderFillableAmounts,
            rfqtIndicativeQuotes,
            dexQuotes,
            ethToOutputRate,
            ethToInputRate,
        } = marketSideLiquidity;
        const maxFallbackSlippage = opts.maxFallbackSlippage || 0;

        const orderOpts = {
            side,
            inputToken,
            outputToken,
            orderDomain: this._orderDomain,
            contractAddresses: this.contractAddresses,
            bridgeSlippage: opts.bridgeSlippage || 0,
        };

        // Convert native orders and dex quotes into `Fill` objects.
        const fills = createFills({
            side,
            // Augment native orders with their fillable amounts.
            orders: [
                ...createSignedOrdersWithFillableAmounts(side, nativeOrders, orderFillableAmounts),
                ...createSignedOrdersFromRfqtIndicativeQuotes(rfqtIndicativeQuotes),
            ],
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

        // Find the unoptimized best rate to calculate savings from optimizer
        const _unoptimizedPath = fillsToSortedPaths(fills, side, inputAmount, optimizerOpts)[0];
        const unoptimizedPath = _unoptimizedPath ? _unoptimizedPath.collapse(orderOpts) : undefined;

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
                unoptimizedPath,
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
            unoptimizedPath,
            takerAssetToEthRate,
            makerAssetToEthRate,
        };
    }

    private async _getMarketSideOrdersAsync(
        nativeOrders: SignedOrder[],
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

        // If RFQ liquidity is enabled, make a request to check RFQ liquidity
        let wholeOrderPrice: BigNumber | undefined;
        const { rfqt } = _opts;
        if (rfqt && rfqt.quoteRequestor && marketSideLiquidity.quoteSourceFilters.isAllowed(ERC20BridgeSource.Native)) {
            // Calculate a suggested price. For now, this is simply the overall price of the aggregation.
            if (optimizerResult) {
                wholeOrderPrice = getComparisonPrices(
                    optimizerResult.adjustedRate,
                    amount,
                    marketSideLiquidity,
                    _opts.feeSchedule,
                ).wholeOrder;
            }

            const { isFirmPriceAwareEnabled, isIndicativePriceAwareEnabled } = getPriceAwareRFQRolloutFlags(
                rfqt.priceAwareRFQFlag,
            );

            if (rfqt.isIndicative && isIndicativePriceAwareEnabled) {
                // An indicative quote is beingh requested, and indicative quotes price-aware enabled. Make the RFQT request and then re-run the sampler if new orders come back.
                const indicativeQuotes = await getRfqtIndicativeQuotesAsync(
                    nativeOrders[0].makerAssetData,
                    nativeOrders[0].takerAssetData,
                    side,
                    amount,
                    wholeOrderPrice,
                    _opts,
                );
                // Re-run optimizer with the new indicative quote
                if (indicativeQuotes.length > 0) {
                    marketSideLiquidity = {
                        ...marketSideLiquidity,
                        rfqtIndicativeQuotes: indicativeQuotes,
                    };
                    optimizerResult = await this._generateOptimizedOrdersAsync(marketSideLiquidity, optimizerOpts);
                }
            } else if (!rfqt.isIndicative && isFirmPriceAwareEnabled) {
                // A firm quote is being requested, and firm quotes price-aware enabled. Ensure that `intentOnFilling` is enabled.
                if (rfqt.intentOnFilling) {
                    // Extra validation happens when requesting a firm quote, such as ensuring that the takerAddress
                    // is indeed valid.
                    if (!rfqt.takerAddress || rfqt.takerAddress === NULL_ADDRESS) {
                        throw new Error('RFQ-T requests must specify a taker address');
                    }
                    const firmQuotes = await rfqt.quoteRequestor.requestRfqtFirmQuotesAsync(
                        nativeOrders[0].makerAssetData,
                        nativeOrders[0].takerAssetData,
                        amount,
                        side,
                        wholeOrderPrice,
                        rfqt,
                    );
                    if (firmQuotes.length > 0) {
                        // Compute the RFQ order fillable amounts. This is done by performing a "soft" order
                        // validation and by checking order balances that are monitored by our worker.
                        // If a firm quote validator does not exist, then we assume that all orders are valid.
                        const firmQuoteSignedOrders = firmQuotes.map(quote => quote.signedOrder);
                        const rfqOrderFillableAmounts =
                            rfqt.firmQuoteValidator === undefined
                                ? firmQuoteSignedOrders.map(signedOrder => signedOrder.takerAssetAmount)
                                : await rfqt.firmQuoteValidator.getRfqtTakerFillableAmountsAsync(firmQuoteSignedOrders);

                        marketSideLiquidity = {
                            ...marketSideLiquidity,
                            nativeOrders: marketSideLiquidity.nativeOrders.concat(firmQuoteSignedOrders),
                            orderFillableAmounts: marketSideLiquidity.orderFillableAmounts.concat(
                                rfqOrderFillableAmounts,
                            ),
                        };

                        // Re-run optimizer with the new firm quote. This is the second and last time
                        // we run the optimized in a block of code. In this case, we don't catch a potential `NoOptimalPath` exception
                        // and we let it bubble up if it happens.
                        optimizerResult = await this._generateOptimizedOrdersAsync(marketSideLiquidity, optimizerOpts);
                    }
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
