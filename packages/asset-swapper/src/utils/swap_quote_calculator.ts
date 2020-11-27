import { SignedOrder } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { constants } from '../constants';
import {
    CalculateSwapQuoteOpts,
    MarketBuySwapQuote,
    MarketOperation,
    MarketSellSwapQuote,
    SwapQuote,
    SwapQuoteInfo,
    SwapQuoteOrdersBreakdown,
    SwapQuoterError,
} from '../types';

import { MarketOperationUtils } from './market_operation_utils';
import { SOURCE_FLAGS } from './market_operation_utils/constants';
import {
    CoFiXFillData,
    ERC20BridgeSource,
    FeeSchedule,
    FillData,
    GetMarketOrdersOpts,
    OptimizedMarketOrder,
} from './market_operation_utils/types';
import { QuoteReport } from './quote_report_generator';
import { QuoteFillResult, simulateBestCaseFill, simulateWorstCaseFill } from './quote_simulation';
import { getTokenFromAssetData, isSupportedAssetDataInOrders } from './utils';

// TODO(dave4506) How do we want to reintroduce InsufficientAssetLiquidityError?
export class SwapQuoteCalculator {
    private readonly _marketOperationUtils: MarketOperationUtils;

    constructor(marketOperationUtils: MarketOperationUtils) {
        this._marketOperationUtils = marketOperationUtils;
    }

    public async calculateMarketSellSwapQuoteAsync(
        prunedOrders: SignedOrder[],
        takerAssetFillAmount: BigNumber,
        gasPrice: BigNumber,
        opts: CalculateSwapQuoteOpts,
    ): Promise<MarketSellSwapQuote> {
        return (await this._calculateSwapQuoteAsync(
            prunedOrders,
            takerAssetFillAmount,
            gasPrice,
            MarketOperation.Sell,
            opts,
        )) as MarketSellSwapQuote;
    }

    public async calculateMarketBuySwapQuoteAsync(
        prunedOrders: SignedOrder[],
        takerAssetFillAmount: BigNumber,
        gasPrice: BigNumber,
        opts: CalculateSwapQuoteOpts,
    ): Promise<MarketBuySwapQuote> {
        return (await this._calculateSwapQuoteAsync(
            prunedOrders,
            takerAssetFillAmount,
            gasPrice,
            MarketOperation.Buy,
            opts,
        )) as MarketBuySwapQuote;
    }

    public async calculateBatchMarketBuySwapQuoteAsync(
        batchPrunedOrders: SignedOrder[][],
        takerAssetFillAmounts: BigNumber[],
        gasPrice: BigNumber,
        opts: CalculateSwapQuoteOpts,
    ): Promise<Array<MarketBuySwapQuote | undefined>> {
        return (await this._calculateBatchBuySwapQuoteAsync(
            batchPrunedOrders,
            takerAssetFillAmounts,
            gasPrice,
            MarketOperation.Buy,
            opts,
        )) as Array<MarketBuySwapQuote | undefined>;
    }

    private async _calculateBatchBuySwapQuoteAsync(
        batchPrunedOrders: SignedOrder[][],
        assetFillAmounts: BigNumber[],
        gasPrice: BigNumber,
        operation: MarketOperation,
        opts: CalculateSwapQuoteOpts,
    ): Promise<Array<SwapQuote | undefined>> {
        const optimizerResults = await this._marketOperationUtils.getBatchMarketBuyOrdersAsync(
            batchPrunedOrders,
            assetFillAmounts,
            opts,
        );

        const batchSwapQuotes = await Promise.all(
            optimizerResults.map(async (result, i) => {
                if (result) {
                    const { makerAssetData, takerAssetData } = batchPrunedOrders[i][0];
                    return createSwapQuote(
                        makerAssetData,
                        takerAssetData,
                        result.optimizedOrders,
                        operation,
                        assetFillAmounts[i],
                        gasPrice,
                        opts.gasSchedule,
                        result.marketSideLiquidity.makerTokenDecimals,
                        result.marketSideLiquidity.takerTokenDecimals,
                    );
                } else {
                    return undefined;
                }
            }),
        );
        return batchSwapQuotes;
    }
    private async _calculateSwapQuoteAsync(
        prunedOrders: SignedOrder[],
        assetFillAmount: BigNumber,
        gasPrice: BigNumber,
        operation: MarketOperation,
        opts: CalculateSwapQuoteOpts,
    ): Promise<SwapQuote> {
        // checks if maker asset is ERC20 and taker asset is ERC20
        if (!isSupportedAssetDataInOrders(prunedOrders)) {
            throw Error(SwapQuoterError.AssetDataUnsupported);
        }
        // since prunedOrders do not have fillState, we will add a buffer of fillable orders to consider that some native are orders are partially filled

        let optimizedOrders: OptimizedMarketOrder[];
        let quoteReport: QuoteReport | undefined;
        let sourceFlags: number = 0;
        let makerTokenDecimals: number;
        let takerTokenDecimals: number;

        // Scale fees by gas price and additional fees
        const _opts: GetMarketOrdersOpts = {
            ...opts,
            feeSchedule: _.mapKeys(opts.feeSchedule, (gasCost, source) => {
                if (gasCost === undefined) {
                    return () => 0;
                }
                // CoFiX has an additional constant fee in ETH
                if (source === ERC20BridgeSource.CoFiX) {
                    return (fillData: CoFiXFillData) => gasPrice.times(gasCost(fillData)).plus(fillData.feeInWei);
                }
                return (fillData?: FillData) => gasPrice.times(gasCost(fillData));
            }),
            exchangeProxyOverhead: flags => gasPrice.times(opts.exchangeProxyOverhead(flags)),
        };

        const result =
            operation === MarketOperation.Buy
                ? await this._marketOperationUtils.getMarketBuyOrdersAsync(prunedOrders, assetFillAmount, _opts)
                : await this._marketOperationUtils.getMarketSellOrdersAsync(prunedOrders, assetFillAmount, _opts);

        optimizedOrders = result.optimizedOrders;
        quoteReport = result.quoteReport;
        sourceFlags = result.sourceFlags;
        makerTokenDecimals = result.marketSideLiquidity.makerTokenDecimals;
        takerTokenDecimals = result.marketSideLiquidity.takerTokenDecimals;

        // assetData information for the result
        const { makerAssetData, takerAssetData } = prunedOrders[0];
        const swapQuote =
            sourceFlags === SOURCE_FLAGS[ERC20BridgeSource.MultiHop]
                ? createTwoHopSwapQuote(
                      makerAssetData,
                      takerAssetData,
                      optimizedOrders,
                      operation,
                      assetFillAmount,
                      gasPrice,
                      opts.gasSchedule,
                      makerTokenDecimals,
                      takerTokenDecimals,
                      quoteReport,
                  )
                : createSwapQuote(
                      makerAssetData,
                      takerAssetData,
                      optimizedOrders,
                      operation,
                      assetFillAmount,
                      gasPrice,
                      opts.gasSchedule,
                      makerTokenDecimals,
                      takerTokenDecimals,
                      quoteReport,
                  );
        // Use the raw gas, not scaled by gas price
        const exchangeProxyOverhead = opts.exchangeProxyOverhead(sourceFlags).toNumber();
        swapQuote.bestCaseQuoteInfo.gas += exchangeProxyOverhead;
        swapQuote.worstCaseQuoteInfo.gas += exchangeProxyOverhead;
        return swapQuote;
    }
}

function createSwapQuote(
    makerAssetData: string,
    takerAssetData: string,
    optimizedOrders: OptimizedMarketOrder[],
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: FeeSchedule,
    makerTokenDecimals: number,
    takerTokenDecimals: number,
    quoteReport?: QuoteReport,
): SwapQuote {
    const bestCaseFillResult = simulateBestCaseFill({
        gasPrice,
        orders: optimizedOrders,
        side: operation,
        fillAmount: assetFillAmount,
        opts: { gasSchedule },
    });

    const worstCaseFillResult = simulateWorstCaseFill({
        gasPrice,
        orders: optimizedOrders,
        side: operation,
        fillAmount: assetFillAmount,
        opts: { gasSchedule },
    });

    const quoteBase = {
        takerAssetData,
        makerAssetData,
        gasPrice,
        bestCaseQuoteInfo: fillResultsToQuoteInfo(bestCaseFillResult),
        worstCaseQuoteInfo: fillResultsToQuoteInfo(worstCaseFillResult),
        sourceBreakdown: getSwapQuoteOrdersBreakdown(bestCaseFillResult.fillAmountBySource),
        orders: optimizedOrders,
        quoteReport,
        isTwoHop: false,
    };

    if (operation === MarketOperation.Buy) {
        return {
            ...quoteBase,
            type: MarketOperation.Buy,
            makerAssetFillAmount: assetFillAmount,
            makerTokenDecimals,
            takerTokenDecimals,
        };
    } else {
        return {
            ...quoteBase,
            type: MarketOperation.Sell,
            takerAssetFillAmount: assetFillAmount,
            makerTokenDecimals,
            takerTokenDecimals,
        };
    }
}

function createTwoHopSwapQuote(
    makerAssetData: string,
    takerAssetData: string,
    optimizedOrders: OptimizedMarketOrder[],
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: FeeSchedule,
    makerTokenDecimals: number,
    takerTokenDecimals: number,
    quoteReport?: QuoteReport,
): SwapQuote {
    const [firstHopOrder, secondHopOrder] = optimizedOrders;
    const [firstHopFill] = firstHopOrder.fills;
    const [secondHopFill] = secondHopOrder.fills;
    const gas = new BigNumber(
        gasSchedule[ERC20BridgeSource.MultiHop]!({
            firstHopSource: _.pick(firstHopFill, 'source', 'fillData'),
            secondHopSource: _.pick(secondHopFill, 'source', 'fillData'),
        }),
    ).toNumber();

    const quoteBase = {
        takerAssetData,
        makerAssetData,
        gasPrice,
        bestCaseQuoteInfo: {
            makerAssetAmount: operation === MarketOperation.Sell ? secondHopFill.output : secondHopFill.input,
            takerAssetAmount: operation === MarketOperation.Sell ? firstHopFill.input : firstHopFill.output,
            totalTakerAssetAmount: operation === MarketOperation.Sell ? firstHopFill.input : firstHopFill.output,
            feeTakerAssetAmount: constants.ZERO_AMOUNT,
            protocolFeeInWeiAmount: constants.ZERO_AMOUNT,
            gas,
        },
        worstCaseQuoteInfo: {
            makerAssetAmount: secondHopOrder.makerAssetAmount,
            takerAssetAmount: firstHopOrder.takerAssetAmount,
            totalTakerAssetAmount: firstHopOrder.takerAssetAmount,
            feeTakerAssetAmount: constants.ZERO_AMOUNT,
            protocolFeeInWeiAmount: constants.ZERO_AMOUNT,
            gas,
        },
        sourceBreakdown: {
            [ERC20BridgeSource.MultiHop]: {
                proportion: new BigNumber(1),
                intermediateToken: getTokenFromAssetData(secondHopOrder.takerAssetData),
                hops: [firstHopFill.source, secondHopFill.source],
            },
        },
        orders: optimizedOrders,
        quoteReport,
        isTwoHop: true,
    };

    if (operation === MarketOperation.Buy) {
        return {
            ...quoteBase,
            type: MarketOperation.Buy,
            makerAssetFillAmount: assetFillAmount,
            makerTokenDecimals,
            takerTokenDecimals,
        };
    } else {
        return {
            ...quoteBase,
            type: MarketOperation.Sell,
            takerAssetFillAmount: assetFillAmount,
            makerTokenDecimals,
            takerTokenDecimals,
        };
    }
}

function getSwapQuoteOrdersBreakdown(fillAmountBySource: { [source: string]: BigNumber }): SwapQuoteOrdersBreakdown {
    const totalFillAmount = BigNumber.sum(...Object.values(fillAmountBySource));
    const breakdown: SwapQuoteOrdersBreakdown = {};
    Object.entries(fillAmountBySource).forEach(([source, fillAmount]) => {
        breakdown[source as keyof SwapQuoteOrdersBreakdown] = fillAmount.div(totalFillAmount);
    });
    return breakdown;
}

function fillResultsToQuoteInfo(fr: QuoteFillResult): SwapQuoteInfo {
    return {
        makerAssetAmount: fr.totalMakerAssetAmount,
        takerAssetAmount: fr.takerAssetAmount,
        totalTakerAssetAmount: fr.totalTakerAssetAmount,
        feeTakerAssetAmount: fr.takerFeeTakerAssetAmount,
        protocolFeeInWeiAmount: fr.protocolFeeAmount,
        gas: fr.gas,
    };
}
