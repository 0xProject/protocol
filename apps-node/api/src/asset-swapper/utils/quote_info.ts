import { BigNumber } from '@0x/utils';
import {
    ERC20BridgeSource,
    GasSchedule,
    IPath,
    MarketOperation,
    OptimizedOrder,
    SwapQuoteInfo,
    SwapQuoteSourceBreakdown,
} from '../types';
import { QuoteFillResult, simulateBestCaseFill, simulateWorstCaseFill } from './quote_simulation';
import * as _ from 'lodash';
import { constants } from '../constants';

interface QuoteInfo {
    bestCaseQuoteInfo: SwapQuoteInfo;
    worstCaseQuoteInfo: SwapQuoteInfo;
    sourceBreakdown: SwapQuoteSourceBreakdown;
}

interface MultiHopFill {
    amount: BigNumber;
    // intermediateToken should be an array but keeping it as a string for backward compatibility
    intermediateToken: string;
    hops: ERC20BridgeSource[];
}

export function calculateQuoteInfo(params: {
    path: IPath;
    operation: MarketOperation;
    assetFillAmount: BigNumber;
    gasPrice: BigNumber;
    gasSchedule: GasSchedule;
    slippage: number;
}): QuoteInfo {
    const { path, operation, assetFillAmount, gasPrice, gasSchedule, slippage } = params;
    const { nativeOrders, bridgeOrders, twoHopOrders } = path.getOrdersByType();
    const singleHopOrders = [...nativeOrders, ...bridgeOrders];

    const singleHopQuoteInfo = calculateSingleHopQuoteInfo(
        singleHopOrders,
        operation,
        assetFillAmount,
        gasPrice,
        gasSchedule,
        slippage,
    );
    const twoHopQuoteInfos = twoHopOrders.map((order) =>
        calculateTwoHopQuoteInfo(order, operation, gasSchedule, slippage),
    );

    return {
        bestCaseQuoteInfo: mergeSwapQuoteInfos(
            singleHopQuoteInfo.bestCaseQuoteInfo,
            ...twoHopQuoteInfos.map((info) => info.bestCaseQuoteInfo),
        ),
        worstCaseQuoteInfo: mergeSwapQuoteInfos(
            singleHopQuoteInfo.worstCaseQuoteInfo,
            ...twoHopQuoteInfos.map((info) => info.worstCaseQuoteInfo),
        ),
        sourceBreakdown: calculateSwapQuoteOrdersBreakdown(
            singleHopQuoteInfo.fillAmountBySource,
            twoHopQuoteInfos.map((info) => info.multiHopFill),
        ),
    };
}

function calculateSingleHopQuoteInfo(
    optimizedOrders: readonly OptimizedOrder[],
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: GasSchedule,
    slippage: number,
): {
    bestCaseQuoteInfo: SwapQuoteInfo;
    worstCaseQuoteInfo: SwapQuoteInfo;
    fillAmountBySource: { [source: string]: BigNumber };
} {
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
        opts: { gasSchedule, slippage },
    });

    return {
        bestCaseQuoteInfo: fillResultsToQuoteInfo(bestCaseFillResult, 0),
        worstCaseQuoteInfo: fillResultsToQuoteInfo(worstCaseFillResult, slippage),
        fillAmountBySource: bestCaseFillResult.fillAmountBySource,
    };
}

function calculateTwoHopQuoteInfo(
    twoHopOrder: { firstHopOrder: OptimizedOrder; secondHopOrder: OptimizedOrder },
    operation: MarketOperation,
    gasSchedule: GasSchedule,
    slippage: number,
): { bestCaseQuoteInfo: SwapQuoteInfo; worstCaseQuoteInfo: SwapQuoteInfo; multiHopFill: MultiHopFill } {
    const { firstHopOrder, secondHopOrder } = twoHopOrder;
    const gas = new BigNumber(
        gasSchedule[ERC20BridgeSource.MultiHop]({
            firstHopSource: _.pick(firstHopOrder, 'source', 'fillData'),
            secondHopSource: _.pick(secondHopOrder, 'source', 'fillData'),
        }),
    ).toNumber();
    const isSell = operation === MarketOperation.Sell;

    return {
        bestCaseQuoteInfo: {
            makerAmount: secondHopOrder.makerAmount,
            takerAmount: firstHopOrder.takerAmount,
            totalTakerAmount: firstHopOrder.takerAmount,
            protocolFeeInWeiAmount: constants.ZERO_AMOUNT,
            gas,
            slippage: 0,
        },
        // TODO jacob consolidate this with quote simulation worstCase
        worstCaseQuoteInfo: {
            makerAmount: isSell
                ? secondHopOrder.makerAmount.times(1 - slippage).integerValue()
                : secondHopOrder.makerAmount,
            takerAmount: isSell
                ? firstHopOrder.takerAmount
                : firstHopOrder.takerAmount.times(1 + slippage).integerValue(BigNumber.ROUND_UP),
            totalTakerAmount: isSell
                ? firstHopOrder.takerAmount
                : firstHopOrder.takerAmount.times(1 + slippage).integerValue(BigNumber.ROUND_UP),
            protocolFeeInWeiAmount: constants.ZERO_AMOUNT,
            gas,
            slippage,
        },
        multiHopFill: {
            amount: firstHopOrder.takerAmount,
            intermediateToken: secondHopOrder.takerToken,
            hops: [firstHopOrder.source, secondHopOrder.source],
        },
    };
}
function mergeSwapQuoteInfos(...swapQuoteInfos: readonly SwapQuoteInfo[]): SwapQuoteInfo {
    if (swapQuoteInfos.length == 0) {
        throw new Error('swapQuoteInfos.length should be at least one');
    }
    const slippages = _.uniq(swapQuoteInfos.map((info) => info.slippage));
    if (slippages.length != 1) {
        throw new Error(`slippages of swapQuoteInfos vary: ${slippages}`);
    }

    const slippage = swapQuoteInfos[0].slippage;
    return {
        takerAmount: BigNumber.sum(...swapQuoteInfos.map((info) => info.takerAmount)),
        totalTakerAmount: BigNumber.sum(...swapQuoteInfos.map((info) => info.totalTakerAmount)),
        makerAmount: BigNumber.sum(...swapQuoteInfos.map((info) => info.makerAmount)),
        protocolFeeInWeiAmount: BigNumber.sum(...swapQuoteInfos.map((info) => info.protocolFeeInWeiAmount)),
        gas: _.sum(swapQuoteInfos.map((info) => info.gas)),
        // fillAmountBySource:
        slippage,
    };
}

function calculateSwapQuoteOrdersBreakdown(
    fillAmountBySource: { [source: string]: BigNumber },
    multihopFills: MultiHopFill[],
): SwapQuoteSourceBreakdown {
    const totalFillAmount = BigNumber.sum(
        ...Object.values(fillAmountBySource),
        ...multihopFills.map((fill) => fill.amount),
    );

    return {
        singleSource: _.mapValues(fillAmountBySource, (amount) => amount.div(totalFillAmount)),
        multihop: multihopFills.map((fill) => ({
            proportion: fill.amount.div(totalFillAmount),
            intermediateToken: fill.intermediateToken,
            hops: fill.hops,
        })),
    };
}

function fillResultsToQuoteInfo(fr: QuoteFillResult, slippage: number): SwapQuoteInfo {
    return {
        makerAmount: fr.totalMakerAssetAmount,
        takerAmount: fr.takerAssetAmount,
        totalTakerAmount: fr.totalTakerAssetAmount,
        protocolFeeInWeiAmount: fr.protocolFeeAmount,
        gas: fr.gas,
        slippage,
    };
}
