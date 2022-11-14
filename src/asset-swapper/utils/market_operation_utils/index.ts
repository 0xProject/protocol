import { FillQuoteTransformerOrderType, RfqOrder } from '@0x/protocol-utils';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as _ from 'lodash';
import { Counter } from 'prom-client';

import { SAMPLER_METRICS } from '../../../utils/sampler_metrics';
import { DEFAULT_INFO_LOGGER, INVALID_SIGNATURE } from '../../constants';
import {
    AltRfqMakerAssetOfferings,
    AssetSwapperContractAddresses,
    MarketOperation,
    NativeOrderWithFillableAmounts,
    SignedNativeOrder,
} from '../../types';
import { getAltMarketInfo } from '../alt_mm_implementation_utils';
import { QuoteRequestor, V4RFQIndicativeQuoteMM } from '../quote_requestor';
import { toSignedNativeOrder, toSignedNativeOrderWithFillableAmounts } from '../rfq_client_mappers';
import {
    getNativeAdjustedFillableAmountsFromMakerAmount,
    getNativeAdjustedFillableAmountsFromTakerAmount,
    getNativeAdjustedMakerFillAmount,
} from '../utils';

import {
    dexSampleToReportSource,
    ExtendedQuoteReportSources,
    generateExtendedQuoteReportSources,
    generateQuoteReport,
    multiHopSampleToReportSource,
    nativeOrderToReportEntry,
    PriceComparisonsReport,
    QuoteReport,
} from './../quote_report_generator';
import { getComparisonPrices } from './comparison_price';
import {
    BUY_SOURCE_FILTER_BY_CHAIN_ID,
    DEFAULT_GET_MARKET_ORDERS_OPTS,
    FEE_QUOTE_SOURCES_BY_CHAIN_ID,
    NATIVE_FEE_TOKEN_AMOUNT_BY_CHAIN_ID,
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
    ZERO_AMOUNT,
} from './constants';
import { IdentityFillAdjustor } from './identity_fill_adjustor';
import { PathPenaltyOpts } from './path';
import { PathOptimizer } from './path_optimizer';
import { DexOrderSampler, getSampleAmounts } from './sampler';
import { SourceFilters } from './source_filters';
import {
    AggregationError,
    DexSample,
    ERC20BridgeSource,
    GenerateOptimizedOrdersOpts,
    GetMarketOrdersOpts,
    MarketSideLiquidity,
    OptimizerResult,
    OptimizerResultWithReport,
} from './types';

const NO_CONVERSION_TO_NATIVE_FOUND = new Counter({
    name: 'no_conversion_to_native_found',
    help: 'unable to get conversion to native token',
});

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

    private static _computeExtendedQuoteReportSources(
        quoteRequestor: QuoteRequestor | undefined,
        marketSideLiquidity: MarketSideLiquidity,
        amount: BigNumber,
        optimizerResult: OptimizerResult,
        comparisonPrice?: BigNumber | undefined,
    ): ExtendedQuoteReportSources {
        const { side, quotes } = marketSideLiquidity;
        const { liquidityDelivered } = optimizerResult;
        return generateExtendedQuoteReportSources(
            side,
            quotes,
            liquidityDelivered,
            amount,
            comparisonPrice,
            quoteRequestor,
        );
    }

    private static _computePriceComparisonsReport(
        quoteRequestor: QuoteRequestor | undefined,
        marketSideLiquidity: MarketSideLiquidity,
        comparisonPrice?: BigNumber | undefined,
    ): PriceComparisonsReport {
        const { side, quotes } = marketSideLiquidity;
        const dexSources = _.flatten(quotes.dexQuotes).map((quote) => dexSampleToReportSource(quote, side));
        const multiHopSources = quotes.twoHopQuotes.map((quote) => multiHopSampleToReportSource(quote, side));
        const nativeSources = quotes.nativeOrders.map((order) =>
            nativeOrderToReportEntry(
                order.type,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
                order as any,
                order.fillableTakerAmount,
                comparisonPrice,
                quoteRequestor,
            ),
        );

        return { dexSources, multiHopSources, nativeSources };
    }

    constructor(
        private readonly _sampler: DexOrderSampler,
        private readonly contractAddresses: AssetSwapperContractAddresses,
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

        // Used to determine whether the tx origin is an EOA or a contract
        const txOrigin = (_opts.rfqt && _opts.rfqt.txOrigin) || NULL_ADDRESS;

        // Call the sampler contract.
        const samplerPromise = this._sampler.executeAsync(
            this._sampler.getBlockNumber(),
            this._sampler.getGasLeft(),
            this._sampler.getTokenDecimals([makerToken, takerToken]),
            // Get native order fillable amounts.
            this._sampler.getLimitOrderFillableTakerAmounts(nativeOrders, this.contractAddresses.exchangeProxy),
            // Get ETH -> maker token price.
            this._sampler.getBestNativeTokenSellRate(
                feeSourceFilters.sources,
                makerToken,
                this._nativeFeeToken,
                this._nativeFeeTokenAmount,
                _opts.feeSchedule,
            ),
            // Get ETH -> taker token price.
            this._sampler.getBestNativeTokenSellRate(
                feeSourceFilters.sources,
                takerToken,
                this._nativeFeeToken,
                this._nativeFeeTokenAmount,
                _opts.feeSchedule,
            ),
            // Get sell quotes for taker -> maker.
            this._sampler.getSellQuotes(quoteSourceFilters.sources, makerToken, takerToken, sampleAmounts),
            this._sampler.getTwoHopSellQuotes(
                quoteSourceFilters.isAllowed(ERC20BridgeSource.MultiHop) ? quoteSourceFilters.sources : [],
                makerToken,
                takerToken,
                takerAmount,
            ),
            this._sampler.isAddressContract(txOrigin),
            this._sampler.getGasLeft(),
        );

        // Refresh the cached pools asynchronously if required
        this._refreshPoolCacheIfRequiredAsync(takerToken, makerToken);

        const [
            blockNumber,
            gasBefore,
            tokenDecimals,
            orderFillableTakerAmounts,
            outputAmountPerEth,
            inputAmountPerEth,
            dexQuotes,
            rawTwoHopQuotes,
            isTxOriginContract,
            gasAfter,
        ] = await samplerPromise;

        if (outputAmountPerEth.isZero()) {
            DEFAULT_INFO_LOGGER({ token: makerToken }, 'output conversion to native token is zero');
            NO_CONVERSION_TO_NATIVE_FOUND.inc();
        }
        if (inputAmountPerEth.isZero()) {
            DEFAULT_INFO_LOGGER({ token: takerToken }, 'input conversion to native token is zero');
            NO_CONVERSION_TO_NATIVE_FOUND.inc();
        }

        // Log the gas metrics
        SAMPLER_METRICS.logGasDetails({ side: 'sell', gasBefore, gasAfter });
        SAMPLER_METRICS.logBlockNumber(blockNumber);

        // Filter out any invalid two hop quotes where we couldn't find a route
        const twoHopQuotes = rawTwoHopQuotes.filter(
            (q) => q && q.fillData && q.fillData.firstHopSource && q.fillData.secondHopSource,
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
            blockNumber: blockNumber.toNumber(),
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

        // Used to determine whether the tx origin is an EOA or a contract
        const txOrigin = (_opts.rfqt && _opts.rfqt.txOrigin) || NULL_ADDRESS;

        // Call the sampler contract.
        const samplerPromise = this._sampler.executeAsync(
            this._sampler.getBlockNumber(),
            this._sampler.getGasLeft(),
            this._sampler.getTokenDecimals([makerToken, takerToken]),
            // Get native order fillable amounts.
            this._sampler.getLimitOrderFillableMakerAmounts(nativeOrders, this.contractAddresses.exchangeProxy),
            // Get ETH -> makerToken token price.
            this._sampler.getBestNativeTokenSellRate(
                feeSourceFilters.sources,
                makerToken,
                this._nativeFeeToken,
                this._nativeFeeTokenAmount,
                _opts.feeSchedule,
            ),
            // Get ETH -> taker token price.
            this._sampler.getBestNativeTokenSellRate(
                feeSourceFilters.sources,
                takerToken,
                this._nativeFeeToken,
                this._nativeFeeTokenAmount,
                _opts.feeSchedule,
            ),
            // Get buy quotes for taker -> maker.
            this._sampler.getBuyQuotes(quoteSourceFilters.sources, makerToken, takerToken, sampleAmounts),
            this._sampler.getTwoHopBuyQuotes(
                quoteSourceFilters.isAllowed(ERC20BridgeSource.MultiHop) ? quoteSourceFilters.sources : [],
                makerToken,
                takerToken,
                makerAmount,
            ),
            this._sampler.isAddressContract(txOrigin),
            this._sampler.getGasLeft(),
        );

        // Refresh the cached pools asynchronously if required
        this._refreshPoolCacheIfRequiredAsync(takerToken, makerToken);

        const [
            blockNumber,
            gasBefore,
            tokenDecimals,
            orderFillableMakerAmounts,
            ethToMakerAssetRate,
            ethToTakerAssetRate,
            dexQuotes,
            rawTwoHopQuotes,
            isTxOriginContract,
            gasAfter,
        ] = await samplerPromise;

        SAMPLER_METRICS.logGasDetails({ side: 'buy', gasBefore, gasAfter });
        SAMPLER_METRICS.logBlockNumber(blockNumber);

        // Filter out any invalid two hop quotes where we couldn't find a route
        const twoHopQuotes = rawTwoHopQuotes.filter(
            (q) => q && q.fillData && q.fillData.firstHopSource && q.fillData.secondHopSource,
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
            blockNumber: blockNumber.toNumber(),
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
        opts: Partial<GetMarketOrdersOpts> & { gasPrice: BigNumber },
    ): Promise<(OptimizerResult | undefined)[]> {
        if (batchNativeOrders.length === 0) {
            throw new Error(AggregationError.EmptyOrders);
        }
        const _opts: GetMarketOrdersOpts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };

        const requestFilters = new SourceFilters().exclude(_opts.excludedSources).include(_opts.includedSources);
        const quoteSourceFilters = this._buySources.merge(requestFilters);

        const feeSourceFilters = this._feeSources.exclude(_opts.excludedFeeSources);

        const ops = [
            this._sampler.getBlockNumber(),
            ...batchNativeOrders.map((orders) =>
                this._sampler.getLimitOrderFillableMakerAmounts(orders, this.contractAddresses.exchangeProxy),
            ),
            ...batchNativeOrders.map((orders) =>
                this._sampler.getBestNativeTokenSellRate(
                    feeSourceFilters.sources,
                    orders[0].order.takerToken,
                    this._nativeFeeToken,
                    this._nativeFeeTokenAmount,
                    _opts.feeSchedule,
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
            ...batchNativeOrders.map((orders) =>
                this._sampler.getTokenDecimals([orders[0].order.makerToken, orders[0].order.takerToken]),
            ),
        ];

        const [blockNumberRaw, ...executeResults] = await this._sampler.executeBatchAsync(ops);
        const batchOrderFillableMakerAmounts = executeResults.splice(0, batchNativeOrders.length) as BigNumber[][];
        const batchEthToTakerAssetRate = executeResults.splice(0, batchNativeOrders.length) as BigNumber[];
        const batchDexQuotes = executeResults.splice(0, batchNativeOrders.length) as DexSample[][][];
        const batchTokenDecimals = executeResults.splice(0, batchNativeOrders.length) as number[][];
        const inputAmountPerEth = ZERO_AMOUNT;

        const blockNumber: number = (blockNumberRaw as BigNumber).toNumber();

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
                            blockNumber,
                        },
                        _opts,
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
        const { inputToken, outputToken, side, inputAmount, quotes, outputAmountPerEth, inputAmountPerEth } =
            marketSideLiquidity;
        const { nativeOrders, rfqtIndicativeQuotes, dexQuotes, twoHopQuotes } = quotes;

        const orderOpts = {
            side,
            inputToken,
            outputToken,
            contractAddresses: this.contractAddresses,
        };

        const augmentedRfqtIndicativeQuotes: NativeOrderWithFillableAmounts[] = rfqtIndicativeQuotes.map(
            (q) =>
                ({
                    order: { ...new RfqOrder({ ...q }) },
                    signature: INVALID_SIGNATURE,
                    fillableMakerAmount: new BigNumber(q.makerAmount),
                    fillableTakerAmount: new BigNumber(q.takerAmount),
                    fillableTakerFeeAmount: ZERO_AMOUNT,
                    type: FillQuoteTransformerOrderType.Rfq,
                } as NativeOrderWithFillableAmounts),
        );

        // Find the optimal path.
        const pathPenaltyOpts: PathPenaltyOpts = {
            outputAmountPerEth,
            inputAmountPerEth,
            exchangeProxyOverhead: opts.exchangeProxyOverhead || (() => ZERO_AMOUNT),
            gasPrice: opts.gasPrice,
        };

        // NOTE: For sell quotes input is the taker asset and for buy quotes input is the maker asset
        const takerAmountPerEth = side === MarketOperation.Sell ? inputAmountPerEth : outputAmountPerEth;
        const makerAmountPerEth = side === MarketOperation.Sell ? outputAmountPerEth : inputAmountPerEth;

        // Find the optimal path using Rust router.
        const pathOptimizer = new PathOptimizer({
            side,
            feeSchedule: opts.feeSchedule,
            chainId: this._sampler.chainId,
            neonRouterNumSamples: opts.neonRouterNumSamples,
            fillAdjustor: opts.fillAdjustor,
            pathPenaltyOpts,
            inputAmount,
        });
        const optimalPath = pathOptimizer.findOptimalPathFromSamples(dexQuotes, twoHopQuotes, [
            ...nativeOrders,
            ...augmentedRfqtIndicativeQuotes,
        ]);

        const optimalPathAdjustedRate = optimalPath ? optimalPath.adjustedRate() : ZERO_AMOUNT;

        // If there is no optimal path then throw.
        if (optimalPath === undefined) {
            //temporary logging for INSUFFICIENT_ASSET_LIQUIDITY
            DEFAULT_INFO_LOGGER({}, 'NoOptimalPath thrown in _generateOptimizedOrdersAsync');
            throw new Error(AggregationError.NoOptimalPath);
        }

        const finalizedPath = optimalPath.finalize(orderOpts);

        return {
            optimizedOrders: finalizedPath.orders,
            liquidityDelivered: finalizedPath.fills,
            sourceFlags: finalizedPath.sourceFlags,
            marketSideLiquidity,
            adjustedRate: optimalPathAdjustedRate,
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
        opts: Partial<GetMarketOrdersOpts> & { gasPrice: BigNumber },
    ): Promise<OptimizerResultWithReport> {
        const _opts: GetMarketOrdersOpts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const optimizerOpts: GenerateOptimizedOrdersOpts = {
            feeSchedule: _opts.feeSchedule,
            exchangeProxyOverhead: _opts.exchangeProxyOverhead,
            gasPrice: _opts.gasPrice,
            neonRouterNumSamples: _opts.neonRouterNumSamples,
            fillAdjustor: _opts.fillAdjustor,
        };

        if (nativeOrders.length === 0) {
            throw new Error(AggregationError.EmptyOrders);
        }

        // Compute an optimized path for on-chain DEX and open-orderbook. This should not include RFQ liquidity.
        let marketSideLiquidity: MarketSideLiquidity;
        if (side === MarketOperation.Sell) {
            marketSideLiquidity = await this.getMarketSellLiquidityAsync(nativeOrders, amount, _opts);
        } else {
            marketSideLiquidity = await this.getMarketBuyLiquidityAsync(nativeOrders, amount, _opts);
        }

        // Phase 1 Routing
        // We find an optimized path for ALL the DEX and open-orderbook liquidity
        let optimizerResult: OptimizerResult | undefined;
        try {
            optimizerResult = await this._generateOptimizedOrdersAsync(marketSideLiquidity, {
                ...optimizerOpts,
                fillAdjustor: new IdentityFillAdjustor(),
            });
        } catch (e) {
            // If no on-chain or off-chain Open Orderbook orders are present, a `NoOptimalPath` will be thrown.
            // If this happens at this stage, there is still a chance that an RFQ order is fillable, therefore
            // we catch the error and continue.
            if (e.message !== AggregationError.NoOptimalPath) {
                throw e;
            }
            //temporary logging for INSUFFICIENT_ASSET_LIQUIDITY
            DEFAULT_INFO_LOGGER({}, 'NoOptimalPath caught in phase 1 routing');
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

        // Phase 2 Routing
        // Mix in any off-chain RFQ quotes
        // Apply any fill adjustments i
        const phaseTwoOptimizerOpts = {
            ...optimizerOpts,
            // Pass in the FillAdjustor for Phase 2 adjustment, in the future we may perform this adjustment
            // in Phase 1.
            fillAdjustor: _opts.fillAdjustor,
        };

        const { rfqt } = _opts;
        if (
            marketSideLiquidity.isRfqSupported &&
            rfqt &&
            rfqt.quoteRequestor && // only needed for quote report
            marketSideLiquidity.quoteSourceFilters.isAllowed(ERC20BridgeSource.Native)
        ) {
            // Timing of RFQT lifecycle
            const timeStart = new Date().getTime();
            const { makerToken, takerToken } = nativeOrders[0].order;

            // Filter Alt Rfq Maker Asset Offerings to the current pair
            const filteredOfferings: AltRfqMakerAssetOfferings = {};
            if (rfqt.altRfqAssetOfferings) {
                const endpoints = Object.keys(rfqt.altRfqAssetOfferings);
                for (const endpoint of endpoints) {
                    // Get the current pair if being offered
                    const offering = getAltMarketInfo(rfqt.altRfqAssetOfferings[endpoint], makerToken, takerToken);
                    if (offering) {
                        filteredOfferings[endpoint] = [offering];
                    }
                }
            }

            if (rfqt.isIndicative) {
                // An indicative quote is being requested, and indicative quotes price-aware enabled
                // Make the RFQT request and then re-run the sampler if new orders come back.

                const [v1Prices, v2Prices] =
                    rfqt.rfqClient === undefined
                        ? [[], []]
                        : await Promise.all([
                              rfqt.rfqClient
                                  .getV1PricesAsync({
                                      altRfqAssetOfferings: filteredOfferings,
                                      assetFillAmount: amount,
                                      chainId: this._sampler.chainId,
                                      comparisonPrice: wholeOrderPrice,
                                      integratorId: rfqt.integrator.integratorId,
                                      intentOnFilling: rfqt.intentOnFilling,
                                      makerToken,
                                      marketOperation: side,
                                      takerAddress: rfqt.takerAddress,
                                      takerToken,
                                      txOrigin: rfqt.txOrigin,
                                  })
                                  .then((res) => res.prices),
                              rfqt.rfqClient.getV2PricesAsync({
                                  assetFillAmount: amount,
                                  chainId: this._sampler.chainId,
                                  integratorId: rfqt.integrator.integratorId,
                                  intentOnFilling: rfqt.intentOnFilling,
                                  makerToken,
                                  marketOperation: side,
                                  takerAddress: rfqt.takerAddress,
                                  takerToken,
                                  txOrigin: rfqt.txOrigin,
                              }),
                          ]);

                DEFAULT_INFO_LOGGER({ v2Prices, isEmpty: v2Prices?.length === 0 }, 'v2Prices from RFQ Client');

                const indicativeQuotes = v1Prices as V4RFQIndicativeQuoteMM[];
                const deltaTime = new Date().getTime() - timeStart;
                DEFAULT_INFO_LOGGER({
                    rfqQuoteType: 'indicative',
                    deltaTime,
                });

                // Re-run optimizer with the new indicative quote
                if (indicativeQuotes.length > 0) {
                    // Attach the indicative quotes to the market side liquidity
                    marketSideLiquidity.quotes.rfqtIndicativeQuotes = indicativeQuotes;

                    // Phase 2 Routing
                    const phase1OptimalSources = optimizerResult
                        ? optimizerResult.optimizedOrders.map((o) => o.source)
                        : [];
                    const phase2MarketSideLiquidity: MarketSideLiquidity = {
                        ...marketSideLiquidity,
                        quotes: {
                            ...marketSideLiquidity.quotes,
                            // Select only the quotes that were chosen in Phase 1
                            dexQuotes: marketSideLiquidity.quotes.dexQuotes.filter(
                                (q) => q.length > 0 && phase1OptimalSources.includes(q[0].source),
                            ),
                        },
                    };

                    optimizerResult = await this._generateOptimizedOrdersAsync(
                        phase2MarketSideLiquidity,
                        phaseTwoOptimizerOpts,
                    );
                }
            } else {
                // A firm quote is being requested, and firm quotes price-aware enabled.
                // Ensure that `intentOnFilling` is enabled and make the request.

                const [v1Quotes, v2Quotes] =
                    rfqt.rfqClient === undefined
                        ? [[], []]
                        : await Promise.all([
                              rfqt.rfqClient
                                  .getV1QuotesAsync({
                                      altRfqAssetOfferings: filteredOfferings,
                                      assetFillAmount: amount,
                                      chainId: this._sampler.chainId,
                                      comparisonPrice: wholeOrderPrice,
                                      integratorId: rfqt.integrator.integratorId,
                                      intentOnFilling: rfqt.intentOnFilling,
                                      makerToken,
                                      marketOperation: side,
                                      takerAddress: rfqt.takerAddress,
                                      takerToken,
                                      txOrigin: rfqt.txOrigin,
                                  })
                                  .then((res) => res.quotes),
                              rfqt.rfqClient.getV2QuotesAsync({
                                  assetFillAmount: amount,
                                  chainId: this._sampler.chainId,
                                  integratorId: rfqt.integrator.integratorId,
                                  intentOnFilling: rfqt.intentOnFilling,
                                  makerToken,
                                  marketOperation: side,
                                  takerAddress: rfqt.takerAddress,
                                  takerToken,
                                  txOrigin: rfqt.txOrigin,
                              }),
                          ]);

                DEFAULT_INFO_LOGGER({ v2Quotes, isEmpty: v2Quotes?.length === 0 }, 'v2Quotes from RFQ Client');

                const v1FirmQuotes = v1Quotes.map((quote) => {
                    // HACK: set the signature on quoteRequestor for future lookup (i.e. in Quote Report)
                    rfqt.quoteRequestor?.setMakerUriForSignature(quote.signature, quote.makerUri);
                    return toSignedNativeOrder(quote);
                });

                const v2QuotesWithOrderFillableAmounts = v2Quotes.map((quote) => {
                    // HACK: set the signature on quoteRequestor for future lookup (i.e. in Quote Report)
                    rfqt.quoteRequestor?.setMakerUriForSignature(quote.signature, quote.makerUri);
                    return toSignedNativeOrderWithFillableAmounts(quote);
                });

                const deltaTime = new Date().getTime() - timeStart;
                DEFAULT_INFO_LOGGER({
                    rfqQuoteType: 'firm',
                    deltaTime,
                });
                if (v1FirmQuotes.length > 0 || v2QuotesWithOrderFillableAmounts.length > 0) {
                    // Compute the RFQ order fillable amounts. This is done by performing a "soft" order
                    // validation and by checking order balances that are monitored by our worker.
                    // If a firm quote validator does not exist, then we assume that all orders are valid.
                    const v1RfqTakerFillableAmounts =
                        rfqt.firmQuoteValidator === undefined
                            ? v1FirmQuotes.map((signedOrder) => signedOrder.order.takerAmount)
                            : await rfqt.firmQuoteValidator.getRfqtTakerFillableAmountsAsync(
                                  v1FirmQuotes.map((q) => new RfqOrder(q.order)),
                              );

                    const v1QuotesWithOrderFillableAmounts: NativeOrderWithFillableAmounts[] = v1FirmQuotes.map(
                        (order, i) => ({
                            ...order,
                            fillableTakerAmount: v1RfqTakerFillableAmounts[i],
                            // Adjust the maker amount by the available taker fill amount
                            fillableMakerAmount: getNativeAdjustedMakerFillAmount(
                                order.order,
                                v1RfqTakerFillableAmounts[i],
                            ),
                            fillableTakerFeeAmount: ZERO_AMOUNT,
                        }),
                    );

                    const quotesWithOrderFillableAmounts = [
                        ...v1QuotesWithOrderFillableAmounts,
                        ...v2QuotesWithOrderFillableAmounts,
                    ];

                    // Attach the firm RFQt quotes to the market side liquidity
                    marketSideLiquidity.quotes.nativeOrders = [
                        ...quotesWithOrderFillableAmounts,
                        ...marketSideLiquidity.quotes.nativeOrders,
                    ];

                    // Re-run optimizer with the new firm quote. This is the second and last time
                    // we run the optimized in a block of code. In this case, we don't catch a potential `NoOptimalPath` exception
                    // and we let it bubble up if it happens.

                    // Phase 2 Routing
                    // Optimization: Filter by what is already currently in the Phase1 output as it doesn't
                    // seem possible that inclusion of RFQT could impact the sources chosen from Phase 1.
                    const phase1OptimalSources = optimizerResult
                        ? optimizerResult.optimizedOrders.map((o) => o.source)
                        : [];
                    const phase2MarketSideLiquidity: MarketSideLiquidity = {
                        ...marketSideLiquidity,
                        quotes: {
                            ...marketSideLiquidity.quotes,
                            // Select only the quotes that were chosen in Phase 1
                            dexQuotes: marketSideLiquidity.quotes.dexQuotes.filter(
                                (q) => q.length > 0 && phase1OptimalSources.includes(q[0].source),
                            ),
                        },
                    };
                    optimizerResult = await this._generateOptimizedOrdersAsync(
                        phase2MarketSideLiquidity,
                        phaseTwoOptimizerOpts,
                    );
                }
            }
        }

        // At this point we should have at least one valid optimizer result, therefore we manually raise
        // `NoOptimalPath` if no optimizer result was ever set.
        if (optimizerResult === undefined) {
            //temporary logging for INSUFFICIENT_ASSET_LIQUIDITY
            DEFAULT_INFO_LOGGER({}, 'NoOptimalPath thrown in phase 2 routing');
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

        // Always compute the Extended Quote Report
        const extendedQuoteReportSources: ExtendedQuoteReportSources | undefined =
            MarketOperationUtils._computeExtendedQuoteReportSources(
                _opts.rfqt ? _opts.rfqt.quoteRequestor : undefined,
                marketSideLiquidity,
                amount,
                optimizerResult,
                wholeOrderPrice,
            );

        let priceComparisonsReport: PriceComparisonsReport | undefined;
        if (_opts.shouldIncludePriceComparisonsReport) {
            priceComparisonsReport = MarketOperationUtils._computePriceComparisonsReport(
                _opts.rfqt ? _opts.rfqt.quoteRequestor : undefined,
                marketSideLiquidity,
                wholeOrderPrice,
            );
        }
        return { ...optimizerResult, quoteReport, extendedQuoteReportSources, priceComparisonsReport };
    }

    private async _refreshPoolCacheIfRequiredAsync(takerToken: string, makerToken: string): Promise<void> {
        _.values(this._sampler.poolsCaches)
            .filter((cache) => cache !== undefined && !cache.isFresh(takerToken, makerToken))
            .forEach((cache) => cache?.getFreshPoolsForPairAsync(takerToken, makerToken));
    }
}
