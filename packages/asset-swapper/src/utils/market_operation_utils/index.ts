import { FillQuoteTransformerOrderType, RfqOrder } from '@0x/protocol-utils';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as _ from 'lodash';

import { DEFAULT_INFO_LOGGER, INVALID_SIGNATURE } from '../../constants';
import {
    AssetSwapperContractAddresses,
    MarketOperation,
    NativeOrderWithFillableAmounts,
    SignedNativeOrder,
} from '../../types';
import { QuoteRequestor } from '../quote_requestor';
import {
    getNativeAdjustedFillableAmountsFromMakerAmount,
    getNativeAdjustedFillableAmountsFromTakerAmount,
    getNativeAdjustedMakerFillAmount,
} from '../utils';

import { generateQuoteReport, QuoteReport } from './../quote_report_generator';
import { getComparisonPrices } from './comparison_price';
import {
    BUY_SOURCE_FILTER_BY_CHAIN_ID,
    DEFAULT_GET_MARKET_ORDERS_OPTS,
    FEE_QUOTE_SOURCES_BY_CHAIN_ID,
    NATIVE_FEE_TOKEN_AMOUNT_BY_CHAIN_ID,
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
    SOURCE_FLAGS,
    ZERO_AMOUNT,
} from './constants';
import { createFills } from './fills';
import { getBestTwoHopQuote } from './multihop_utils';
import { createOrdersFromTwoHopSample } from './orders';
import { PathPenaltyOpts } from './path';
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

export class MarketOperationUtils {
    private readonly _sellSources: SourceFilters;
    private readonly _buySources: SourceFilters;
    private readonly _feeSources: SourceFilters;
    private readonly _nativeFeeToken: string;
    private readonly _nativeFeeTokenAmount: BigNumber;

    private static _computeQuoteReport(
        quoteRequestor: QuoteRequestor | undefined,
        marketSideLiquidity: MarketSideLiquidity,
        optimizerResult: OptimizerResult,
        comparisonPrice?: BigNumber | undefined,
    ): QuoteReport {
        const { side, quotes } = marketSideLiquidity;
        const { liquidityDelivered } = optimizerResult;
        return generateQuoteReport(side, quotes.nativeOrders, liquidityDelivered, comparisonPrice, quoteRequestor);
    }

    constructor(
        private readonly _sampler: DexOrderSampler,
        private readonly contractAddresses: AssetSwapperContractAddresses,
        private readonly _orderDomain: OrderDomain,
    ) {
        this._buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[_sampler.chainId];
        this._sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[_sampler.chainId];
        this._feeSources = new SourceFilters(FEE_QUOTE_SOURCES_BY_CHAIN_ID[_sampler.chainId]);
        this._nativeFeeToken = NATIVE_FEE_TOKEN_BY_CHAIN_ID[_sampler.chainId];
        this._nativeFeeTokenAmount = NATIVE_FEE_TOKEN_AMOUNT_BY_CHAIN_ID[_sampler.chainId];
    }

    /**
     * Gets the liquidity available for a market sell operation
     * @param nativeOrders Native orders. Assumes LimitOrders not RfqOrders
     * @param takerAmount Amount of taker asset to sell.
     * @param opts Options object.
     * @return MarketSideLiquidity.
     */
    public async getMarketSellLiquidityAsync(
        nativeOrders: SignedNativeOrder[],
        takerAmount: BigNumber,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<MarketSideLiquidity> {
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const { makerToken, takerToken } = nativeOrders[0].order;
        const sampleAmounts = getSampleAmounts(takerAmount, _opts.numSamples, _opts.sampleDistributionBase);

        const requestFilters = new SourceFilters().exclude(_opts.excludedSources).include(_opts.includedSources);
        const quoteSourceFilters = this._sellSources.merge(requestFilters);
        const feeSourceFilters = this._feeSources.exclude(_opts.excludedFeeSources);

        // Can't sample Balancer or Cream on-chain without the pools cache
        const sourcesWithCaches = [ERC20BridgeSource.BalancerV2, ERC20BridgeSource.Balancer, ERC20BridgeSource.Cream];
        const excludeSources: ERC20BridgeSource[] = sourcesWithCaches.filter(
            s => !this._sampler.poolsCaches[s]!.isFresh(takerToken, makerToken),
        );
        // tslint:disable-next-line:promise-function-async
        const cacheRefreshPromises: Array<Promise<any[]>> = excludeSources.map(s =>
            this._sampler.poolsCaches[s]!.getFreshPoolsForPairAsync(takerToken, makerToken),
        );

        // Used to determine whether the tx origin is an EOA or a contract
        const txOrigin = (_opts.rfqt && _opts.rfqt.txOrigin) || NULL_ADDRESS;

        // Call the sampler contract.
        const samplerPromise = this._sampler.executeAsync(
            this._sampler.getTokenDecimals([makerToken, takerToken]),
            // Get native order fillable amounts.
            this._sampler.getLimitOrderFillableTakerAmounts(nativeOrders, this.contractAddresses.exchangeProxy),
            // Get ETH -> maker token price.
            this._sampler.getMedianSellRate(
                feeSourceFilters.sources,
                makerToken,
                this._nativeFeeToken,
                this._nativeFeeTokenAmount,
            ),
            // Get ETH -> taker token price.
            this._sampler.getMedianSellRate(
                feeSourceFilters.sources,
                takerToken,
                this._nativeFeeToken,
                this._nativeFeeTokenAmount,
            ),
            // Get sell quotes for taker -> maker.
            this._sampler.getSellQuotes(
                quoteSourceFilters.exclude(excludeSources).sources,
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
            this._sampler.isAddressContract(txOrigin),
        );
        const [
            [
                tokenDecimals,
                orderFillableTakerAmounts,
                outputAmountPerEth,
                inputAmountPerEth,
                dexQuotes,
                rawTwoHopQuotes,
                isTxOriginContract,
            ],
        ] = await Promise.all([samplerPromise, cacheRefreshPromises]);

        // Filter out any invalid two hop quotes where we couldn't find a route
        const twoHopQuotes = rawTwoHopQuotes.filter(
            q => q && q.fillData && q.fillData.firstHopSource && q.fillData.secondHopSource,
        );

        const [makerTokenDecimals, takerTokenDecimals] = tokenDecimals;

        const isRfqSupported = !!(_opts.rfqt && !isTxOriginContract);
        const limitOrdersWithFillableAmounts = nativeOrders.map((order, i) => ({
            ...order,
            ...getNativeAdjustedFillableAmountsFromTakerAmount(order, orderFillableTakerAmounts[i]),
        }));

        return {
            side: MarketOperation.Sell,
            inputAmount: takerAmount,
            inputToken: takerToken,
            outputToken: makerToken,
            outputAmountPerEth,
            inputAmountPerEth,
            quoteSourceFilters,
            makerTokenDecimals: makerTokenDecimals.toNumber(),
            takerTokenDecimals: takerTokenDecimals.toNumber(),
            quotes: {
                nativeOrders: limitOrdersWithFillableAmounts,
                rfqtIndicativeQuotes: [],
                twoHopQuotes,
                dexQuotes,
            },
            isRfqSupported,
        };
    }

    /**
     * Gets the liquidity available for a market buy operation
     * @param nativeOrders Native orders. Assumes LimitOrders not RfqOrders
     * @param makerAmount Amount of maker asset to buy.
     * @param opts Options object.
     * @return MarketSideLiquidity.
     */
    public async getMarketBuyLiquidityAsync(
        nativeOrders: SignedNativeOrder[],
        makerAmount: BigNumber,
        opts?: Partial<GetMarketOrdersOpts>,
    ): Promise<MarketSideLiquidity> {
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const { makerToken, takerToken } = nativeOrders[0].order;
        const sampleAmounts = getSampleAmounts(makerAmount, _opts.numSamples, _opts.sampleDistributionBase);

        const requestFilters = new SourceFilters().exclude(_opts.excludedSources).include(_opts.includedSources);
        const quoteSourceFilters = this._buySources.merge(requestFilters);
        const feeSourceFilters = this._feeSources.exclude(_opts.excludedFeeSources);

        // Can't sample Balancer or Cream on-chain without the pools cache
        const sourcesWithCaches = [ERC20BridgeSource.BalancerV2, ERC20BridgeSource.Balancer, ERC20BridgeSource.Cream];
        const excludeCacheSources: ERC20BridgeSource[] = sourcesWithCaches.filter(
            s => !this._sampler.poolsCaches[s]!.isFresh(takerToken, makerToken),
        );
        // tslint:disable-next-line:promise-function-async
        const cacheRefreshPromises: Array<Promise<any[]>> = excludeCacheSources.map(s =>
            this._sampler.poolsCaches[s]!.getFreshPoolsForPairAsync(takerToken, makerToken),
        );

        // Used to determine whether the tx origin is an EOA or a contract
        const txOrigin = (_opts.rfqt && _opts.rfqt.txOrigin) || NULL_ADDRESS;

        // Call the sampler contract.
        const samplerPromise = this._sampler.executeAsync(
            this._sampler.getTokenDecimals([makerToken, takerToken]),
            // Get native order fillable amounts.
            this._sampler.getLimitOrderFillableMakerAmounts(nativeOrders, this.contractAddresses.exchangeProxy),
            // Get ETH -> makerToken token price.
            this._sampler.getMedianSellRate(
                feeSourceFilters.sources,
                makerToken,
                this._nativeFeeToken,
                this._nativeFeeTokenAmount,
            ),
            // Get ETH -> taker token price.
            this._sampler.getMedianSellRate(
                feeSourceFilters.sources,
                takerToken,
                this._nativeFeeToken,
                this._nativeFeeTokenAmount,
            ),
            // Get buy quotes for taker -> maker.
            this._sampler.getBuyQuotes(
                quoteSourceFilters.exclude(excludeCacheSources).sources,
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
            this._sampler.isAddressContract(txOrigin),
        );

        const [
            [
                tokenDecimals,
                orderFillableMakerAmounts,
                ethToMakerAssetRate,
                ethToTakerAssetRate,
                dexQuotes,
                rawTwoHopQuotes,
                isTxOriginContract,
            ],
        ] = await Promise.all([samplerPromise, cacheRefreshPromises]);

        // Filter out any invalid two hop quotes where we couldn't find a route
        const twoHopQuotes = rawTwoHopQuotes.filter(
            q => q && q.fillData && q.fillData.firstHopSource && q.fillData.secondHopSource,
        );

        const [makerTokenDecimals, takerTokenDecimals] = tokenDecimals;
        const isRfqSupported = !isTxOriginContract;

        const limitOrdersWithFillableAmounts = nativeOrders.map((order, i) => ({
            ...order,
            ...getNativeAdjustedFillableAmountsFromMakerAmount(order, orderFillableMakerAmounts[i]),
        }));

        return {
            side: MarketOperation.Buy,
            inputAmount: makerAmount,
            inputToken: makerToken,
            outputToken: takerToken,
            outputAmountPerEth: ethToTakerAssetRate,
            inputAmountPerEth: ethToMakerAssetRate,
            quoteSourceFilters,
            makerTokenDecimals: makerTokenDecimals.toNumber(),
            takerTokenDecimals: takerTokenDecimals.toNumber(),
            quotes: {
                nativeOrders: limitOrdersWithFillableAmounts,
                rfqtIndicativeQuotes: [],
                twoHopQuotes,
                dexQuotes,
            },
            isRfqSupported,
        };
    }

    /**
     * gets the orders required for a batch of market buy operations by (potentially) merging native orders with
     * generated bridge orders.
     *
     * NOTE: Currently `getBatchMarketBuyOrdersAsync()` does not support external liquidity providers.
     *
     * @param batchNativeOrders Batch of Native orders. Assumes LimitOrders not RfqOrders
     * @param makerAmounts Array amount of maker asset to buy for each batch.
     * @param opts Options object.
     * @return orders.
     */
    public async getBatchMarketBuyOrdersAsync(
        batchNativeOrders: SignedNativeOrder[][],
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
                this._sampler.getLimitOrderFillableMakerAmounts(orders, this.contractAddresses.exchangeProxy),
            ),
            ...batchNativeOrders.map(orders =>
                this._sampler.getMedianSellRate(
                    feeSourceFilters.sources,
                    orders[0].order.takerToken,
                    this._nativeFeeToken,
                    this._nativeFeeTokenAmount,
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
                this._sampler.getTokenDecimals([orders[0].order.makerToken, orders[0].order.takerToken]),
            ),
        ];

        const executeResults = await this._sampler.executeBatchAsync(ops);
        const batchOrderFillableMakerAmounts = executeResults.splice(0, batchNativeOrders.length) as BigNumber[][];
        const batchEthToTakerAssetRate = executeResults.splice(0, batchNativeOrders.length) as BigNumber[];
        const batchDexQuotes = executeResults.splice(0, batchNativeOrders.length) as DexSample[][][];
        const batchTokenDecimals = executeResults.splice(0, batchNativeOrders.length) as number[][];
        const inputAmountPerEth = ZERO_AMOUNT;

        return Promise.all(
            batchNativeOrders.map(async (nativeOrders, i) => {
                if (nativeOrders.length === 0) {
                    throw new Error(AggregationError.EmptyOrders);
                }
                const { makerToken, takerToken } = nativeOrders[0].order;
                const orderFillableMakerAmounts = batchOrderFillableMakerAmounts[i];
                const outputAmountPerEth = batchEthToTakerAssetRate[i];
                const dexQuotes = batchDexQuotes[i];
                const makerAmount = makerAmounts[i];
                try {
                    const optimizerResult = await this._generateOptimizedOrdersAsync(
                        {
                            side: MarketOperation.Buy,
                            inputToken: makerToken,
                            outputToken: takerToken,
                            inputAmount: makerAmount,
                            outputAmountPerEth,
                            inputAmountPerEth,
                            quoteSourceFilters,
                            makerTokenDecimals: batchTokenDecimals[i][0],
                            takerTokenDecimals: batchTokenDecimals[i][1],
                            quotes: {
                                nativeOrders: nativeOrders.map((o, k) => ({
                                    ...o,
                                    ...getNativeAdjustedFillableAmountsFromMakerAmount(o, orderFillableMakerAmounts[k]),
                                })),
                                dexQuotes,
                                rfqtIndicativeQuotes: [],
                                twoHopQuotes: [],
                            },
                            isRfqSupported: false,
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
            outputAmountPerEth,
            inputAmountPerEth,
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

        const augmentedRfqtIndicativeQuotes: NativeOrderWithFillableAmounts[] = rfqtIndicativeQuotes.map(
            q =>
                // tslint:disable-next-line: no-object-literal-type-assertion
                ({
                    order: { ...new RfqOrder({ ...q }) },
                    signature: INVALID_SIGNATURE,
                    fillableMakerAmount: new BigNumber(q.makerAmount),
                    fillableTakerAmount: new BigNumber(q.takerAmount),
                    fillableTakerFeeAmount: ZERO_AMOUNT,
                    type: FillQuoteTransformerOrderType.Rfq,
                } as NativeOrderWithFillableAmounts),
        );

        // Convert native orders and dex quotes into `Fill` objects.
        const fills = createFills({
            side,
            orders: [...nativeOrders, ...augmentedRfqtIndicativeQuotes],
            dexQuotes,
            targetInput: inputAmount,
            outputAmountPerEth,
            inputAmountPerEth,
            excludedSources: opts.excludedSources,
            feeSchedule: opts.feeSchedule,
        });

        // Find the optimal path.
        const penaltyOpts: PathPenaltyOpts = {
            outputAmountPerEth,
            inputAmountPerEth,
            exchangeProxyOverhead: opts.exchangeProxyOverhead || (() => ZERO_AMOUNT),
        };

        // NOTE: For sell quotes input is the taker asset and for buy quotes input is the maker asset
        const takerAmountPerEth = side === MarketOperation.Sell ? inputAmountPerEth : outputAmountPerEth;
        const makerAmountPerEth = side === MarketOperation.Sell ? outputAmountPerEth : inputAmountPerEth;

        // Find the unoptimized best rate to calculate savings from optimizer
        const _unoptimizedPath = fillsToSortedPaths(fills, side, inputAmount, penaltyOpts)[0];
        const unoptimizedPath = _unoptimizedPath ? _unoptimizedPath.collapse(orderOpts) : undefined;

        // Find the optimal path
        const optimalPath = await findOptimalPathAsync(side, fills, inputAmount, opts.runLimit, penaltyOpts);
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
                takerAmountPerEth,
                makerAmountPerEth,
            };
        }

        // If there is no optimal path AND we didn't return a MultiHop quote, then throw
        if (optimalPath === undefined) {
            throw new Error(AggregationError.NoOptimalPath);
        }

        // Generate a fallback path if sources requiring a fallback (fragile) are in the optimal path.
        // Native is relatively fragile (limit order collision, expiry, or lack of available maker balance)
        // LiquidityProvider is relatively fragile (collision)
        const fragileSources = [ERC20BridgeSource.Native, ERC20BridgeSource.LiquidityProvider];
        const fragileFills = optimalPath.fills.filter(f => fragileSources.includes(f.source));
        if (opts.allowFallback && fragileFills.length !== 0) {
            // We create a fallback path that is exclusive of Native liquidity
            // This is the optimal on-chain path for the entire input amount
            const sturdyFills = fills.filter(p => p.length > 0 && !fragileSources.includes(p[0].source));
            const sturdyOptimalPath = await findOptimalPathAsync(side, sturdyFills, inputAmount, opts.runLimit, {
                ...penaltyOpts,
                exchangeProxyOverhead: (sourceFlags: number) =>
                    // tslint:disable-next-line: no-bitwise
                    penaltyOpts.exchangeProxyOverhead(sourceFlags | optimalPath.sourceFlags),
            });
            // Calculate the slippage of on-chain sources compared to the most optimal path
            // if within an acceptable threshold we enable a fallback to prevent reverts
            if (
                sturdyOptimalPath !== undefined &&
                (fragileFills.length === optimalPath.fills.length ||
                    sturdyOptimalPath.adjustedSlippage(optimalPathRate) <= maxFallbackSlippage)
            ) {
                optimalPath.addFallback(sturdyOptimalPath);
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
            takerAmountPerEth,
            makerAmountPerEth,
        };
    }

    /**
     * @param nativeOrders: Assumes LimitOrders not RfqOrders
     */
    public async getOptimizerResultAsync(
        nativeOrders: SignedNativeOrder[],
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
        const marketSideLiquidity: MarketSideLiquidity = await marketLiquidityFnAsync(nativeOrders, amount, _opts);
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
                _opts.exchangeProxyOverhead,
            ).wholeOrder;
        }

        // If RFQ liquidity is enabled, make a request to check RFQ liquidity against the first optimizer result
        const { rfqt } = _opts;
        if (
            marketSideLiquidity.isRfqSupported &&
            rfqt &&
            rfqt.quoteRequestor &&
            marketSideLiquidity.quoteSourceFilters.isAllowed(ERC20BridgeSource.Native)
        ) {
            // Timing of RFQT lifecycle
            const timeStart = new Date().getTime();
            const { makerToken, takerToken } = nativeOrders[0].order;
            if (rfqt.isIndicative) {
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
                const deltaTime = new Date().getTime() - timeStart;
                DEFAULT_INFO_LOGGER({
                    rfqQuoteType: 'indicative',
                    deltaTime,
                });
                // Re-run optimizer with the new indicative quote
                if (indicativeQuotes.length > 0) {
                    marketSideLiquidity.quotes.rfqtIndicativeQuotes = indicativeQuotes;
                    optimizerResult = await this._generateOptimizedOrdersAsync(marketSideLiquidity, optimizerOpts);
                }
            } else {
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
                const deltaTime = new Date().getTime() - timeStart;
                DEFAULT_INFO_LOGGER({
                    rfqQuoteType: 'firm',
                    deltaTime,
                });
                if (firmQuotes.length > 0) {
                    // Compute the RFQ order fillable amounts. This is done by performing a "soft" order
                    // validation and by checking order balances that are monitored by our worker.
                    // If a firm quote validator does not exist, then we assume that all orders are valid.
                    const rfqTakerFillableAmounts =
                        rfqt.firmQuoteValidator === undefined
                            ? firmQuotes.map(signedOrder => signedOrder.order.takerAmount)
                            : await rfqt.firmQuoteValidator.getRfqtTakerFillableAmountsAsync(
                                  firmQuotes.map(q => new RfqOrder(q.order)),
                              );

                    const quotesWithOrderFillableAmounts: NativeOrderWithFillableAmounts[] = firmQuotes.map(
                        (order, i) => ({
                            ...order,
                            fillableTakerAmount: rfqTakerFillableAmounts[i],
                            // Adjust the maker amount by the available taker fill amount
                            fillableMakerAmount: getNativeAdjustedMakerFillAmount(
                                order.order,
                                rfqTakerFillableAmounts[i],
                            ),
                            fillableTakerFeeAmount: ZERO_AMOUNT,
                        }),
                    );
                    marketSideLiquidity.quotes.nativeOrders = [
                        ...quotesWithOrderFillableAmounts,
                        ...marketSideLiquidity.quotes.nativeOrders,
                    ];

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
