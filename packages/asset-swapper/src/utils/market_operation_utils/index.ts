import { CommonOrderFields, FillQuoteTransformerOrderType, RfqOrder, SignatureType } from '@0x/protocol-utils';
import { V4RFQIndicativeQuote } from '@0x/quote-server';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as _ from 'lodash';

import { DEFAULT_INFO_LOGGER, INVALID_SIGNATURE } from '../../constants';
import {
    Address,
    AssetSwapperContractAddresses,
    MarketOperation,
    SignedNativeOrder,
    SignedRfqOrder,
} from '../../types';
import { NativeOrderWithFillableAmounts } from '../native_orders';
import { QuoteRequestor } from '../quote_requestor';

import {
    dexSampleToReportSource,
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
    DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID,
    FEE_QUOTE_SOURCES_BY_CHAIN_ID,
    NATIVE_FEE_TOKEN_BY_CHAIN_ID,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
    ZERO_AMOUNT,
} from './constants';
import { createFills } from './fills';
import { getIntermediateTokens } from './multihop_utils';
import { Path, PathPenaltyOpts } from './path';
import { findOptimalPathJSAsync, findOptimalRustPathFromSamples } from './path_optimizer';
import { Sampler } from './sampler';
import { SourceFilters } from './source_filters';
import {
    AggregationError,
    DexSample,
    ERC20BridgeSource,
    ExchangeProxyOverhead,
    GenerateOptimizedOrdersOpts,
    GetMarketOrdersOpts,
    MarketSideLiquidity,
    OptimizerResult,
    OptimizerResultWithReport,
    OptimizedHop,
    OrderDomain,
    RawHopQuotes,
    TokenAmountPerEth,
} from './types';

const SHOULD_USE_RUST_ROUTER = process.env.RUST_ROUTER === 'true';
const RFQT_ORDER_GAS_COST = Number(process.env.RFQT_ORDER_GAS_COST || 0) || 100e3;

// tslint:disable:boolean-naming

export class MarketOperationUtils {
    private readonly _sellSources: SourceFilters;
    private readonly _buySources: SourceFilters;
    private readonly _feeSources: SourceFilters;
    private readonly _nativeFeeToken: string;

    private static _computeQuoteReport(
        quoteRequestor: QuoteRequestor | undefined,
        marketSideLiquidity: MarketSideLiquidity,
        optimizerResult: OptimizerResult,
        comparisonPrice?: BigNumber | undefined,
    ): QuoteReport {
        throw new Error(`Not implemented`);
        // const { side, quotes } = marketSideLiquidity;
        // const { liquidityDelivered } = optimizerResult;
        // return generateQuoteReport(side, quotes.nativeOrders, liquidityDelivered, comparisonPrice, quoteRequestor);
    }

    private static _computePriceComparisonsReport(
        quoteRequestor: QuoteRequestor | undefined,
        marketSideLiquidity: MarketSideLiquidity,
        comparisonPrice?: BigNumber | undefined,
    ): PriceComparisonsReport {
        throw new Error(`Not implemented`);
        // const { side, quotes } = marketSideLiquidity;
        // const dexSources = _.flatten(quotes.dexQuotes).map(quote => dexSampleToReportSource(quote, side));
        // const multiHopSources = quotes.twoHopQuotes.map(quote => multiHopSampleToReportSource(quote, side));
        // const nativeSources = quotes.nativeOrders.map(order =>
        //     nativeOrderToReportEntry(
        //         order.type,
        //         order as any,
        //         order.fillableTakerAmount,
        //         comparisonPrice,
        //         quoteRequestor,
        //     ),
        // );
        //
        // return { dexSources, multiHopSources, nativeSources };
    }

    constructor(
        private readonly _sampler: Sampler,
        private readonly contractAddresses: AssetSwapperContractAddresses,
        private readonly _orderDomain: OrderDomain,
    ) {
        this._buySources = BUY_SOURCE_FILTER_BY_CHAIN_ID[_sampler.chainId];
        this._sellSources = SELL_SOURCE_FILTER_BY_CHAIN_ID[_sampler.chainId];
        this._feeSources = new SourceFilters(FEE_QUOTE_SOURCES_BY_CHAIN_ID[_sampler.chainId]);
        this._nativeFeeToken = NATIVE_FEE_TOKEN_BY_CHAIN_ID[_sampler.chainId];
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
        opts: GetMarketOrdersOpts,
    ): Promise<MarketSideLiquidity> {
        if (nativeOrders.length === 0) {
            throw new Error(AggregationError.EmptyOrders);
        }
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const { makerToken, takerToken } = nativeOrders[0].order;
        nativeOrders = nativeOrders.filter(o => o.order.makerAmount.gt(0));

        const requestFilters = new SourceFilters().exclude(_opts.excludedSources).include(_opts.includedSources);
        const quoteSourceFilters = this._sellSources.merge(requestFilters);
        const feeSourceFilters = this._feeSources.exclude(_opts.excludedFeeSources);

        const [multiHopLegs, multiHopAmounts] = quoteSourceFilters.isAllowed(ERC20BridgeSource.MultiHop)
            ? await this._getMultiHopSampleLegsAndAmountsAsync({
                takerToken,
                makerToken,
                side: MarketOperation.Sell,
                sources: quoteSourceFilters.sources,
                inputAmount: takerAmount,
            })
            : [[], []];

        const terminalTokens = [...new Set([
            takerToken,
            makerToken,
            ...multiHopLegs.map(leg => getTakerMakerTokenFromTokenPath(leg)).flat(1)
        ].map(t => t.toLowerCase()))];

        const [
            tokenInfos,
            tokenPricesPerEth,
            singleHopQuotes,
            multiHopQuotes,
        ] = await Promise.all([
            this._sampler.getTokenInfosAsync(
                [makerToken, takerToken],
            ),
            this._sampler.getPricesAsync(
                terminalTokens.map(t => [this._nativeFeeToken, t]),
                feeSourceFilters.sources,
            ),
            this._sampler.getSellLiquidityAsync(
                [takerToken, makerToken],
                takerAmount,
                quoteSourceFilters.sources,
            ),
            multiHopLegs.length
                ? Promise.all(multiHopLegs.map((hopPath, i) =>
                    this._sampler.getSellLiquidityAsync(
                        hopPath,
                        multiHopAmounts[i],
                        quoteSourceFilters.sources,
                    )
                ))
                : [],
            multiHopLegs.length
                ? this._sampler.getPricesAsync(
                    multiHopLegs.map(hopPath => [this._nativeFeeToken, hopPath.slice(-1)[0]]),
                    feeSourceFilters.sources,
                ) : [],
            multiHopLegs.length
                ? this._sampler.getPricesAsync(
                    multiHopLegs.map(hopPath => [this._nativeFeeToken, hopPath[0]]),
                    feeSourceFilters.sources,
                ) : [],
        ]);

        const [{ decimals: makerTokenDecimals }, { decimals: takerTokenDecimals }] = tokenInfos;

        const isRfqSupported = !!_opts.rfqt;

        return {
            side: MarketOperation.Sell,
            inputAmount: takerAmount,
            inputToken: takerToken,
            outputToken: makerToken,
            tokenAmountPerEth: Object.assign(
                {},
                ...terminalTokens.map((t, i) => ({ [t]: tokenPricesPerEth[i] })),
            ),
            quoteSourceFilters,
            makerTokenDecimals: makerTokenDecimals,
            takerTokenDecimals: takerTokenDecimals,
            gasPrice: opts.gasPrice,
            quotes: [
                {
                    inputToken: takerToken,
                    outputToken: makerToken,
                    dexQuotes: singleHopQuotes,
                    nativeOrders: [],
                },
                ...multiHopLegs.map((tokenPath, i) => ({
                    inputToken: tokenPath[0],
                    outputToken: tokenPath[tokenPath.length - 1],
                    nativeOrders: [],
                    rfqtIndicativeQuotes: [],
                    dexQuotes: multiHopQuotes[i],
                })),
            ],
            isRfqSupported,
        };
    }

    private async _getMultiHopSampleLegsAndAmountsAsync(opts: {
        side: MarketOperation,
        takerToken: Address,
        makerToken: Address,
        sources: ERC20BridgeSource[],
        inputAmount: BigNumber,
        hopAmountScaling?: number,
    }): Promise<[Address[][], BigNumber[]]> {
        const {
            side,
            takerToken,
            makerToken,
            sources,
            inputAmount,
        } = opts;
        const hopAmountScaling = opts.hopAmountScaling === undefined ? 1.25 : opts.hopAmountScaling;

        const getIntermediateTokenPaths = (_takerToken: Address, _makerToken: Address, maxPathLength: number): Address[][] => {
            if (maxPathLength < 2) {
                return [];
            }
            const hopTokens = getIntermediateTokens(
                _makerToken,
                _takerToken,
                DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID[this._sampler.chainId],
            );
            const shortHops = hopTokens.map(t => [
                [_takerToken, t],
                [t, _makerToken],
            ]).flat(1);
            // Find inner hops for each leg.
            const deepHops = shortHops.map(([t, m]) =>
                getIntermediateTokenPaths(t, m, maxPathLength - 1)
                    .filter(innerPath => !innerPath.includes(_takerToken))
                    .filter(innerPath => !innerPath.includes(_makerToken))
                    .map(innerPath => innerPath[0] === t ? [...innerPath, m] : [t, ...innerPath]),
            ).flat(1);
            const paths = [ ...shortHops, ...deepHops ];
            // Prune duplicate paths.
            return paths.filter(p => !paths.find(o => p !== o && o.every((_v, i) => p[i] === o[i])));
        };
        const hopTokenPaths = getIntermediateTokenPaths(takerToken, makerToken, 3);
        if (!hopTokenPaths.length) {
            return [[],[]];
        }
        const hopTokenPathPrices = await this._sampler.getPricesAsync(
            hopTokenPaths,
            sources,
        );
        let bestTwoHopTokenPaths;
        let bestTwoHopTokenPrices;
        let bestTwoHopTotalPrice = ZERO_AMOUNT;
        for (const [firstHopIndex, firstHop] of hopTokenPaths.entries()) {
            const firstHopPrice = hopTokenPathPrices[firstHopIndex];
            const [firstHopTakerToken, firstHopMakerToken] = getTakerMakerTokenFromTokenPath(firstHop);
            if (firstHopTakerToken !== takerToken) {
                continue;
            }
            for (const [secondHopIndex, secondHop] of hopTokenPaths.entries()) {
                const secondHopPrice = hopTokenPathPrices[secondHopIndex];
                if (firstHop === secondHop) {
                    continue;
                }
                const [secondHopTakerToken, secondHopMakerToken] = getTakerMakerTokenFromTokenPath(secondHop);
                if (secondHopMakerToken !== makerToken) {
                    continue;
                }
                if (firstHopMakerToken !== secondHopTakerToken) {
                    continue;
                }
                const tokenPrices = [firstHopPrice, secondHopPrice];
                const totalPrice = tokenPrices.reduce((a, v) => a.times(v));
                if (bestTwoHopTokenPaths) {
                    if (totalPrice.lt(bestTwoHopTotalPrice)) {
                        continue;
                    }
                }
                bestTwoHopTokenPaths = [firstHop, secondHop];
                bestTwoHopTokenPrices = tokenPrices;
                bestTwoHopTotalPrice = totalPrice;
            }
        }
        if (!bestTwoHopTokenPaths || !bestTwoHopTokenPrices) {
            return [[], []];
        }

        const amounts = [inputAmount.integerValue()];
        if (side === MarketOperation.Buy) {
            // Reverse paths list and prices and invert prices for buys.
            bestTwoHopTokenPaths.reverse();
            bestTwoHopTokenPrices =
                bestTwoHopTokenPrices.map(p => new BigNumber(1).dividedBy(p)).reverse();
        }
        for (let i = 0; i < bestTwoHopTokenPrices.length - 1; ++i) {
            const lastAmount = amounts[amounts.length - 1];
            const prevPrice = bestTwoHopTokenPrices[i];
            amounts.push(lastAmount.times(prevPrice).times(hopAmountScaling).integerValue());
        }
        return [bestTwoHopTokenPaths, amounts];
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
        opts: GetMarketOrdersOpts,
    ): Promise<MarketSideLiquidity> {
        if (nativeOrders.length === 0) {
            throw new Error(AggregationError.EmptyOrders);
        }
        const _opts = { ...DEFAULT_GET_MARKET_ORDERS_OPTS, ...opts };
        const { makerToken, takerToken } = nativeOrders[0].order;
        nativeOrders = nativeOrders.filter(o => o.order.makerAmount.gt(0));

        const requestFilters = new SourceFilters().exclude(_opts.excludedSources).include(_opts.includedSources);
        const quoteSourceFilters = this._buySources.merge(requestFilters);
        const feeSourceFilters = this._feeSources.exclude(_opts.excludedFeeSources);

        const [multiHopLegs, multiHopAmounts] = quoteSourceFilters.isAllowed(ERC20BridgeSource.MultiHop)
            ? await this._getMultiHopSampleLegsAndAmountsAsync({
                takerToken,
                makerToken,
                side: MarketOperation.Buy,
                sources: quoteSourceFilters.sources,
                inputAmount: makerAmount,
            })
            : [[], []];


        const terminalTokens = [...new Set([
            takerToken,
            makerToken,
            ...multiHopLegs.map(leg => getTakerMakerTokenFromTokenPath(leg)).flat(1)
        ].map(t => t.toLowerCase()))];

        const [
            tokenInfos,
            tokenPricesPerEth,
            singleHopQuotes,
            multiHopQuotes,
        ] = await Promise.all([
            this._sampler.getTokenInfosAsync(
                [makerToken, takerToken],
            ),
            this._sampler.getPricesAsync(
                terminalTokens.map(t => [this._nativeFeeToken, t]),
                feeSourceFilters.sources,
            ),
            this._sampler.getBuyLiquidityAsync(
                [takerToken, makerToken],
                makerAmount,
                quoteSourceFilters.sources,
            ),
            multiHopLegs.length
                ? Promise.all(multiHopLegs.map((hopPath, i) =>
                    this._sampler.getBuyLiquidityAsync(
                        hopPath,
                        multiHopAmounts[i],
                        quoteSourceFilters.sources,
                    )
                ))
                : [],
            multiHopLegs.length
                ? this._sampler.getPricesAsync(
                    multiHopLegs.map(hopPath => [this._nativeFeeToken, hopPath.slice(-1)[0]]),
                    feeSourceFilters.sources,
                ) : [],
            multiHopLegs.length
                ? this._sampler.getPricesAsync(
                    multiHopLegs.map(hopPath => [this._nativeFeeToken, hopPath[0]]),
                    feeSourceFilters.sources,
                ) : [],
        ]);

        const [{ decimals: makerTokenDecimals }, { decimals: takerTokenDecimals }] = tokenInfos;

        const isRfqSupported = !!_opts.rfqt;

        return {
            side: MarketOperation.Buy,
            inputAmount: makerAmount,
            inputToken: makerToken,
            outputToken: takerToken,
            tokenAmountPerEth: Object.assign(
                {},
                ...terminalTokens.map((t, i) => ({ [t]: tokenPricesPerEth[i] })),
            ),
            quoteSourceFilters,
            makerTokenDecimals: makerTokenDecimals,
            takerTokenDecimals: takerTokenDecimals,
            gasPrice: opts.gasPrice,
            quotes: [
                {
                    inputToken: makerToken,
                    outputToken: takerToken,
                    dexQuotes: singleHopQuotes,
                    nativeOrders: [],
                },
                ...multiHopLegs.map((tokenPath, i) => ({
                    inputToken: tokenPath[tokenPath.length - 1],
                    outputToken: tokenPath[0],
                    nativeOrders: [],
                    rfqtIndicativeQuotes: [],
                    dexQuotes: multiHopQuotes[i],
                })),
            ],
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
        opts: GetMarketOrdersOpts,
    ): Promise<Array<OptimizerResult | undefined>> {
        throw new Error(`No implementado`);
    }

    public async _generateOptimizedOrdersAsync(
        marketSideLiquidity: MarketSideLiquidity,
        opts: GenerateOptimizedOrdersOpts,
    ): Promise<OptimizerResult> {
        const {
            side,
            inputAmount,
            inputToken,
            outputToken,
            quotes,
            tokenAmountPerEth,
        } = marketSideLiquidity;

        const bestHopRoute = await this._findBestOptimizedHopRouteAsync(
            side,
            inputToken,
            outputToken,
            inputAmount,
            quotes,
            {
                tokenAmountPerEth,
                exchangeProxyOverhead: opts.exchangeProxyOverhead,
                slippage: opts.bridgeSlippage,
                gasPrice: opts.gasPrice,
                runLimit: opts.runLimit,
                maxFallbackSlippage: opts.maxFallbackSlippage,
            },
        );
        if (!bestHopRoute) {
            throw new Error(AggregationError.NoOptimalPath);
        }

        // TODO: Find the unoptimized best rate to calculate savings from optimizer

        const [takerToken, makerToken] = side === MarketOperation.Sell
            ? [inputToken, outputToken]
            : [outputToken, inputToken];
        return {
            hops: bestHopRoute,
            adjustedRate: getHopRouteOverallRate(bestHopRoute),
            // liquidityDelivered: collapsedPath.collapsedFills as CollapsedFill[],
            marketSideLiquidity,
            takerAmountPerEth: tokenAmountPerEth[takerToken],
            makerAmountPerEth: tokenAmountPerEth[makerToken],
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
            bridgeSlippage: _opts.bridgeSlippage,
            maxFallbackSlippage: _opts.maxFallbackSlippage,
            excludedSources: _opts.excludedSources,
            allowFallback: _opts.allowFallback,
            exchangeProxyOverhead: _opts.exchangeProxyOverhead,
            gasPrice: _opts.gasPrice,
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
                opts.gasPrice,
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
                    injectRfqLiquidity(
                        marketSideLiquidity.quotes,
                        side,
                        indicativeQuotes.map(indicativeRfqQuoteToSignedNativeOrder),
                        [],
                        RFQT_ORDER_GAS_COST,
                    );
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
                    injectRfqLiquidity(marketSideLiquidity.quotes, side, firmQuotes, rfqTakerFillableAmounts, RFQT_ORDER_GAS_COST);

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
            // quoteReport = MarketOperationUtils._computeQuoteReport(
            //     _opts.rfqt ? _opts.rfqt.quoteRequestor : undefined,
            //     marketSideLiquidity,
            //     optimizerResult,
            //     wholeOrderPrice,
            // );
        }

        let priceComparisonsReport: PriceComparisonsReport | undefined;
        if (_opts.shouldIncludePriceComparisonsReport) {
            priceComparisonsReport = MarketOperationUtils._computePriceComparisonsReport(
                _opts.rfqt ? _opts.rfqt.quoteRequestor : undefined,
                marketSideLiquidity,
                wholeOrderPrice,
            );
        }
        return { ...optimizerResult, quoteReport, priceComparisonsReport };
    }

    private async _createOptimizedHopAsync(opts: {
        side: MarketOperation;
        outputAmountPerEth: BigNumber;
        inputAmountPerEth: BigNumber;
        inputToken: Address;
        outputToken: Address;
        inputAmount: BigNumber;
        dexQuotes: DexSample[][];
        nativeOrders: NativeOrderWithFillableAmounts[];
        slippage: number;
        gasPrice: BigNumber;
        exchangeProxyOverhead: ExchangeProxyOverhead;
        runLimit?: number;
        maxFallbackSlippage: number;
    }): Promise<OptimizedHop | null> {

        let path = await this._findOptimalPathFromSamples({
            side: opts.side,
            nativeOrders: opts.nativeOrders,
            dexQuotes: opts.dexQuotes,
            inputAmount: opts.inputAmount,
            outputAmountPerEth: opts.outputAmountPerEth,
            inputAmountPerEth: opts.inputAmountPerEth,
            gasPrice: opts.gasPrice,
            runLimit: opts.runLimit,
            exchangeProxyOverhead: opts.exchangeProxyOverhead,
        });
        // Convert native orders and dex quotes into `Fill` objects.
        if (!path) {
            return null;
        }

        if (doesPathNeedFallback(path)) {
            path = await this._addFallbackToPath({
                path,
                side: opts.side,
                dexQuotes: opts.dexQuotes,
                inputAmount: opts.inputAmount,
                outputAmountPerEth: opts.outputAmountPerEth,
                inputAmountPerEth: opts.inputAmountPerEth,
                gasPrice: opts.gasPrice,
                runLimit: opts.runLimit,
                maxFallbackSlippage: opts.maxFallbackSlippage,
                exchangeProxyOverhead: opts.exchangeProxyOverhead,
            });
        }

        const orders = path.collapse({
            side: opts.side,
            inputToken: opts.inputToken,
            outputToken: opts.outputToken,
        }).orders;

        return {
            orders,
            inputToken: opts.inputToken,
            outputToken: opts.outputToken,
            inputAmount: path.size().input,
            outputAmount: path.size().output,
            adjustedCompleteRate: path.adjustedCompleteMakerToTakerRate(),
            sourceFlags: path.sourceFlags,
        };
    }

    private async _findOptimalPathFromSamples(opts: {
        side: MarketOperation;
        outputAmountPerEth: BigNumber;
        inputAmountPerEth: BigNumber;
        inputAmount: BigNumber;
        dexQuotes: DexSample[][];
        nativeOrders: NativeOrderWithFillableAmounts[];
        gasPrice: BigNumber;
        exchangeProxyOverhead: ExchangeProxyOverhead;
        runLimit?: number;
    }): Promise<Path | undefined | null> {
        // Find the optimal path.
        const penaltyOpts: PathPenaltyOpts = {
            outputAmountPerEth: opts.outputAmountPerEth,
            inputAmountPerEth: opts.inputAmountPerEth,
            exchangeProxyOverhead: opts.exchangeProxyOverhead || (() => ZERO_AMOUNT),
            gasPrice: opts.gasPrice,
        };

        // Find the optimal path using Rust router if enabled, otherwise fallback to JS Router
        if (SHOULD_USE_RUST_ROUTER) {
            return findOptimalRustPathFromSamples(
                opts.side,
                opts.dexQuotes,
                opts.nativeOrders,
                opts.inputAmount,
                penaltyOpts,
                opts.gasPrice,
                this._sampler.chainId,
            );
        };

        const fills = createFills({
            side: opts.side,
            orders: opts.nativeOrders,
            dexQuotes: opts.dexQuotes,
            targetInput: opts.inputAmount,
            outputAmountPerEth: opts.outputAmountPerEth,
            inputAmountPerEth: opts.inputAmountPerEth,
            gasPrice: opts.gasPrice,
        });
        return findOptimalPathJSAsync(opts.side, fills, opts.inputAmount, opts.runLimit, penaltyOpts);
    }

    private async _addFallbackToPath(opts: {
        path: Path;
        side: MarketOperation;
        outputAmountPerEth: BigNumber;
        inputAmountPerEth: BigNumber;
        inputAmount: BigNumber;
        dexQuotes: DexSample[][];
        gasPrice: BigNumber;
        exchangeProxyOverhead: ExchangeProxyOverhead;
        runLimit?: number;
        maxFallbackSlippage: number;
    }): Promise<Path> {
        const { path } = opts;
        const pathRate = path ? path.adjustedRate() : ZERO_AMOUNT;
        // Generate a fallback path if sources requiring a fallback (fragile) are in the optimal path.
        // Native is relatively fragile (limit order collision, expiry, or lack of available maker balance)
        // LiquidityProvider is relatively fragile (collision)
        const fragileSources = [ERC20BridgeSource.Native, ERC20BridgeSource.LiquidityProvider];
        const fragileFills = path.fills.filter(f => fragileSources.includes(f.source));
        // We create a fallback path that is exclusive of Native liquidity
        const sturdySamples = opts.dexQuotes
            .filter(ss => ss.length > 0 && !fragileSources.includes(ss[0].source));
        // This is the optimal on-chain path for the entire input amount
        let sturdyPath = await this._findOptimalPathFromSamples({
            side: opts.side,
            nativeOrders: [],
            dexQuotes: sturdySamples,
            inputAmount: opts.inputAmount,
            outputAmountPerEth: opts.outputAmountPerEth,
            inputAmountPerEth: opts.inputAmountPerEth,
            gasPrice: opts.gasPrice,
            runLimit: opts.runLimit,
            exchangeProxyOverhead: (sourceFlags: bigint) =>
                opts.exchangeProxyOverhead(sourceFlags | path.sourceFlags),
        });
        // Calculate the slippage of on-chain sources compared to the most optimal path
        // if within an acceptable threshold we enable a fallback to prevent reverts
        if (sturdyPath &&
            (fragileFills.length === path.fills.length ||
                sturdyPath.adjustedSlippage(pathRate) <= opts.maxFallbackSlippage)
        ) {
            return Path.clone(path).addFallback(sturdyPath);
        }
        return path;
    }

    // Find the and create the best sequence of OptimizedHops for a swap.
    async _findBestOptimizedHopRouteAsync(
        side: MarketOperation,
        inputToken: Address,
        outputToken: Address,
        inputAmount: BigNumber,
        hopQuotes: RawHopQuotes[],
        opts: {
            tokenAmountPerEth?: TokenAmountPerEth,
            exchangeProxyOverhead?: ExchangeProxyOverhead,
            slippage?: number,
            gasPrice?: BigNumber,
            runLimit?: number,
            maxFallbackSlippage?: number,
        } = {},
    ): Promise<OptimizedHop[] | undefined> {
        const findRoutes = (firstHop: RawHopQuotes, _hopQuotes: RawHopQuotes[] = hopQuotes): RawHopQuotes[][] => {
            if (firstHop.inputToken === inputToken && firstHop.outputToken === outputToken) {
                return [[firstHop]]; // Direct A -> B
            }
            const otherHopQuotes = _hopQuotes.filter(h => h !== firstHop);
            const r = [];
            for (const h of otherHopQuotes) {
                if (h.inputToken === firstHop.outputToken) {
                    if (h.outputToken === outputToken) {
                        r.push([firstHop, h]);
                    } else {
                        r.push(...findRoutes(h, otherHopQuotes).map(route => [firstHop, ...route]));
                    }
                }
            }
            return r;
        };
        const firstHops = hopQuotes.filter(h => h.inputToken === inputToken);
        const routes = firstHops.map(firstHop => findRoutes(firstHop)).flat(1);

        const tokenAmountPerEth = opts.tokenAmountPerEth || {};
        const slippage = opts.slippage || 0;
        const gasPrice = opts.gasPrice || ZERO_AMOUNT;
        const runLimit = opts.runLimit;
        const maxFallbackSlippage = opts.maxFallbackSlippage || 0;
        const exchangeProxyOverhead = opts.exchangeProxyOverhead || (() => ZERO_AMOUNT);
        const hopRoutes = (await Promise.all(routes.map(async route => {
            let hopInputAmount = inputAmount;
            const hops = [];
            // const _route = side === MarketOperation.Sell ? route : route.slice().reverse();
            for (const hopQuotes of route) {
                const hop = await this._createOptimizedHopAsync({
                    side,
                    slippage,
                    gasPrice,
                    exchangeProxyOverhead,
                    runLimit,
                    maxFallbackSlippage,
                    inputAmount: hopInputAmount,
                    dexQuotes: hopQuotes.dexQuotes,
                    nativeOrders: hopQuotes.nativeOrders,
                    inputToken: hopQuotes.inputToken,
                    outputToken: hopQuotes.outputToken,
                    inputAmountPerEth: tokenAmountPerEth[hopQuotes.inputToken] || ZERO_AMOUNT,
                    outputAmountPerEth: tokenAmountPerEth[hopQuotes.outputToken] || ZERO_AMOUNT,
                });
                if (!hop) {
                    // This hop could not satisfy the input amount so the
                    // whole route is invalid.
                    return [];
                }
                // Output of this hop will be the input for the next hop.
                hopInputAmount = hop.outputAmount;
                hops.push(hop);
            }
            return hops;
        }))).filter(routes => routes.length);
        if (hopRoutes.length === 0) {
            return;
        }
        // Pick the route with the best rate.
        let bestHopRoute;
        let bestHopRouteTotalRate;
        for (const route of hopRoutes) {
            const rate = getHopRouteOverallRate(route);
            if (!bestHopRouteTotalRate || rate.gt(bestHopRouteTotalRate)) {
                bestHopRoute = route;
                bestHopRouteTotalRate = rate;
            }
        }
        return bestHopRoute;
    }
}

function doesPathNeedFallback(path: Path): boolean {
    const fragileSources = [ERC20BridgeSource.Native, ERC20BridgeSource.LiquidityProvider];
    return !!path.fills.find(f => fragileSources.includes(f.source));
}


// Compute the overall adjusted rate for a multihop path.
function getHopRouteOverallRate(multiHopPaths: OptimizedHop[]): BigNumber {
    return multiHopPaths.reduce(
        (a, h) => a = a.times(h.adjustedCompleteRate),
        new BigNumber(1),
    );
}

function indicativeRfqQuoteToSignedNativeOrder(iq: V4RFQIndicativeQuote): SignedRfqOrder {
    return {
        order: {
            chainId: 1,
            verifyingContract: NULL_ADDRESS,
            expiry: iq.expiry,
            maker: NULL_ADDRESS,
            taker: NULL_ADDRESS,
            txOrigin: NULL_ADDRESS,
            makerToken: iq.makerToken,
            takerToken: iq.takerToken,
            makerAmount: iq.makerAmount,
            takerAmount: iq.takerAmount,
            pool: '0x0',
            salt: ZERO_AMOUNT,
        },
        signature: {
            r: '0x0',
            s: '0x0',
            v: 0,
            signatureType: SignatureType.Invalid,
        },
        type: FillQuoteTransformerOrderType.Rfq,
    };
}

function injectRfqLiquidity(
    quotes: RawHopQuotes[],
    side: MarketOperation,
    orders: SignedRfqOrder[],
    orderFillableTakerAmounts: BigNumber[] = [],
    gasCostPerOrder: number,
): void {
    if (orders.length === 0) {
        return;
    }
    const { makerToken, takerToken } = orders[0].order;
    const fullOrders = orders.map((o, i) => ({
        ...o,
        fillableTakerAmount: orderFillableTakerAmounts[i] || ZERO_AMOUNT,
        fillableMakerAmount: getNativeOrderMakerFillAmount(
            o.order,
            orderFillableTakerAmounts[i],
        ),
        fillableTakerFeeAmount: ZERO_AMOUNT,
        gasCost: gasCostPerOrder,
    }));
    const inputToken = side === MarketOperation.Sell ? takerToken : makerToken;
    const outputToken = side === MarketOperation.Sell ? makerToken : takerToken;
    // Insert into compatible hop quotes.
    let wasInserted = false;
    for (const q of quotes) {
        if (q.inputToken === inputToken && q.outputToken === outputToken) {
            q.nativeOrders.push(...fullOrders);
            wasInserted = true;
        }
    }
    // If there were no compatible hop quotes, create one.
    if (!wasInserted) {
        quotes.push({
            inputToken,
            outputToken,
            dexQuotes: [],
            nativeOrders: fullOrders,
        });
    }
}

function getTakerMakerTokenFromTokenPath(tokenPath: Address[]): [Address, Address] {
    return [tokenPath[0], tokenPath[tokenPath.length - 1]];
}

function getNativeOrderMakerFillAmount(order: CommonOrderFields, takerFillAmount: BigNumber): BigNumber {
    // Round down because exchange rate favors Maker
    return takerFillAmount
        .multipliedBy(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_DOWN);
}
