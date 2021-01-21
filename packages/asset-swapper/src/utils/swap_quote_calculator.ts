import { FillQuoteTransformerOrderType, LimitOrder, RfqOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { constants } from '../constants';
import { CalculateSwapQuoteOpts, MarketOperation, SwapQuote, SwapQuoteInfo, SwapQuoteOrdersBreakdown } from '../types';

import { MarketOperationUtils } from './market_operation_utils';
import { SOURCE_FLAGS } from './market_operation_utils/constants';
import {
    ERC20BridgeSource,
    FeeSchedule,
    FillData,
    GetMarketOrdersOpts,
    OptimizedMarketOrder,
    OptimizerResultWithReport,
    SignedNativeOrder,
} from './market_operation_utils/types';
import { QuoteFillResult, simulateBestCaseFill, simulateWorstCaseFill } from './quote_simulation';

// TODO(dave4506) How do we want to reintroduce InsufficientAssetLiquidityError?
export class SwapQuoteCalculator {
    private readonly _marketOperationUtils: MarketOperationUtils;

    constructor(marketOperationUtils: MarketOperationUtils) {
        this._marketOperationUtils = marketOperationUtils;
    }

    public async calculateBatchBuySwapQuoteAsync(
        batchPrunedOrders: SignedNativeOrder[][],
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
                    const { makerToken, takerToken } = batchPrunedOrders[i][0].order;
                    return createSwapQuote(
                        result,
                        makerToken,
                        takerToken,
                        operation,
                        assetFillAmounts[i],
                        gasPrice,
                        opts.gasSchedule,
                    );
                } else {
                    return undefined;
                }
            }),
        );
        return batchSwapQuotes;
    }
    public async calculateSwapQuoteAsync(
        orders: SignedNativeOrder[],
        assetFillAmount: BigNumber,
        gasPrice: BigNumber,
        operation: MarketOperation,
        opts: CalculateSwapQuoteOpts,
    ): Promise<SwapQuote> {
        // Since prunedOrders do not have fillState, we will add a buffer of fillable orders to consider that
        //     some native are orders are partially filled.
        // Scale fees by gas price.
        const _opts: GetMarketOrdersOpts = {
            ...opts,
            feeSchedule: _.mapValues(opts.feeSchedule, gasCost => (fillData?: FillData) =>
                gasCost === undefined ? 0 : gasPrice.times(gasCost(fillData)),
            ),
            exchangeProxyOverhead: flags => gasPrice.times(opts.exchangeProxyOverhead(flags)),
        };
        const result = await this._marketOperationUtils.getMarketSideOrdersAsync(
            orders,
            assetFillAmount,
            operation,
            _opts,
        );

        const { makerToken, takerToken } = orders[0].order;
        const swapQuote = createSwapQuote(
            result,
            makerToken,
            takerToken,
            operation,
            assetFillAmount,
            gasPrice,
            opts.gasSchedule,
        );

        // Use the raw gas, not scaled by gas price
        const exchangeProxyOverhead = opts.exchangeProxyOverhead(result.sourceFlags).toNumber();
        swapQuote.bestCaseQuoteInfo.gas += exchangeProxyOverhead;
        swapQuote.worstCaseQuoteInfo.gas += exchangeProxyOverhead;

        return swapQuote;
    }
}

function createSwapQuote(
    optimizerResult: OptimizerResultWithReport,
    makerToken: string,
    takerToken: string,
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: FeeSchedule,
): SwapQuote {
    const { optimizedOrders, quoteReport, sourceFlags, takerTokenToEthRate, makerTokenToEthRate } = optimizerResult;
    const isTwoHop = sourceFlags === SOURCE_FLAGS[ERC20BridgeSource.MultiHop];

    // Calculate quote info
    const { bestCaseQuoteInfo, worstCaseQuoteInfo, sourceBreakdown } = isTwoHop
        ? calculateTwoHopQuoteInfo(optimizedOrders, operation, gasSchedule)
        : calculateQuoteInfo(optimizedOrders, operation, assetFillAmount, gasPrice, gasSchedule);

    // Put together the swap quote
    const { makerTokenDecimals, takerTokenDecimals } = optimizerResult.marketSideLiquidity;
    const swapQuote = {
        makerToken,
        takerToken,
        gasPrice,
        orders: optimizedOrders,
        bestCaseQuoteInfo,
        worstCaseQuoteInfo,
        sourceBreakdown,
        makerTokenDecimals,
        takerTokenDecimals,
        takerTokenToEthRate,
        makerTokenToEthRate,
        quoteReport,
        isTwoHop,
    };

    if (operation === MarketOperation.Buy) {
        return {
            ...swapQuote,
            type: MarketOperation.Buy,
            makerAssetFillAmount: assetFillAmount,
        };
    } else {
        return {
            ...swapQuote,
            type: MarketOperation.Sell,
            takerAssetFillAmount: assetFillAmount,
        };
    }
}

function calculateQuoteInfo(
    optimizedOrders: OptimizedMarketOrder[],
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: FeeSchedule,
): { bestCaseQuoteInfo: SwapQuoteInfo; worstCaseQuoteInfo: SwapQuoteInfo; sourceBreakdown: SwapQuoteOrdersBreakdown } {
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

    return {
        bestCaseQuoteInfo: fillResultsToQuoteInfo(bestCaseFillResult),
        worstCaseQuoteInfo: fillResultsToQuoteInfo(worstCaseFillResult),
        sourceBreakdown: getSwapQuoteOrdersBreakdown(bestCaseFillResult.fillAmountBySource),
    };
}

function calculateTwoHopQuoteInfo(
    optimizedOrders: OptimizedMarketOrder[],
    operation: MarketOperation,
    gasSchedule: FeeSchedule,
): { bestCaseQuoteInfo: SwapQuoteInfo; worstCaseQuoteInfo: SwapQuoteInfo; sourceBreakdown: SwapQuoteOrdersBreakdown } {
    const [firstHopOrder, secondHopOrder] = optimizedOrders;
    const [firstHopFill] = firstHopOrder.fills;
    const [secondHopFill] = secondHopOrder.fills;
    const gas = new BigNumber(
        gasSchedule[ERC20BridgeSource.MultiHop]!({
            firstHopSource: _.pick(firstHopFill, 'source', 'fillData'),
            secondHopSource: _.pick(secondHopFill, 'source', 'fillData'),
        }),
    ).toNumber();
    return {
        bestCaseQuoteInfo: {
            makerAmount: operation === MarketOperation.Sell ? secondHopFill.output : secondHopFill.input,
            takerAmount: operation === MarketOperation.Sell ? firstHopFill.input : firstHopFill.output,
            totalTakerAmount: operation === MarketOperation.Sell ? firstHopFill.input : firstHopFill.output,
            feeTakerTokenAmount: constants.ZERO_AMOUNT,
            protocolFeeInWeiAmount: constants.ZERO_AMOUNT,
            gas,
        },
        worstCaseQuoteInfo: {
            makerAmount: secondHopOrder.makerTokenAmount,
            takerAmount: firstHopOrder.takerTokenAmount,
            totalTakerAmount: firstHopOrder.takerTokenAmount,
            feeTakerTokenAmount: constants.ZERO_AMOUNT,
            protocolFeeInWeiAmount: constants.ZERO_AMOUNT,
            gas,
        },
        sourceBreakdown: {
            [ERC20BridgeSource.MultiHop]: {
                proportion: new BigNumber(1),
                intermediateToken: secondHopOrder.takerToken,
                hops: [firstHopFill.source, secondHopFill.source],
            },
        },
    };
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
        makerAmount: fr.totalMakerAssetAmount,
        takerAmount: fr.takerAssetAmount,
        totalTakerAmount: fr.totalTakerAssetAmount,
        feeTakerTokenAmount: fr.takerFeeTakerAssetAmount,
        protocolFeeInWeiAmount: fr.protocolFeeAmount,
        gas: fr.gas,
    };
}
