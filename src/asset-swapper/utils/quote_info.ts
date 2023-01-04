import { BigNumber } from '@0x/utils';
import {
    ERC20BridgeSource,
    GasSchedule,
    IPath,
    MarketOperation,
    OptimizedOrder,
    SwapQuoteInfo,
    SwapQuoteOrdersBreakdown,
} from '../types';
import { QuoteFillResult, simulateBestCaseFill, simulateWorstCaseFill } from './quote_simulation';
import * as _ from 'lodash';
import { constants } from '../constants';

interface QuoteInfo {
    bestCaseQuoteInfo: SwapQuoteInfo;
    worstCaseQuoteInfo: SwapQuoteInfo;
    sourceBreakdown: SwapQuoteOrdersBreakdown;
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
    // TODO: generalize calculateQuoteInfo to handle a mix multihop+multiplex.

    // NOTES: until multihop+multiplex is supported a path will have single hop order(s) xor a two hop order.
    if (path.hasTwoHop()) {
        return calculateTwoHopQuoteInfo(path.createOrders(), operation, gasSchedule, slippage);
    }

    return calculateSingleHopQuoteInfo(
        path.createOrders(),
        operation,
        assetFillAmount,
        gasPrice,
        gasSchedule,
        slippage,
    );
}

function calculateSingleHopQuoteInfo(
    optimizedOrders: OptimizedOrder[],
    operation: MarketOperation,
    assetFillAmount: BigNumber,
    gasPrice: BigNumber,
    gasSchedule: GasSchedule,
    slippage: number,
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
        opts: { gasSchedule, slippage },
    });

    return {
        bestCaseQuoteInfo: fillResultsToQuoteInfo(bestCaseFillResult, 0),
        worstCaseQuoteInfo: fillResultsToQuoteInfo(worstCaseFillResult, slippage),
        sourceBreakdown: getSwapQuoteOrdersBreakdown(bestCaseFillResult.fillAmountBySource),
    };
}

function calculateTwoHopQuoteInfo(
    optimizedOrders: OptimizedOrder[],
    operation: MarketOperation,
    gasSchedule: GasSchedule,
    slippage: number,
): { bestCaseQuoteInfo: SwapQuoteInfo; worstCaseQuoteInfo: SwapQuoteInfo; sourceBreakdown: SwapQuoteOrdersBreakdown } {
    const [firstHopOrder, secondHopOrder] = optimizedOrders;
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
        sourceBreakdown: {
            [ERC20BridgeSource.MultiHop]: {
                proportion: new BigNumber(1),
                intermediateToken: secondHopOrder.takerToken,
                hops: [firstHopOrder.source, secondHopOrder.source],
            },
        },
    };
}

function getSwapQuoteOrdersBreakdown(fillAmountBySource: { [source: string]: BigNumber }): SwapQuoteOrdersBreakdown {
    const totalFillAmount = BigNumber.sum(...Object.values(fillAmountBySource));
    const breakdown: SwapQuoteOrdersBreakdown = {};
    Object.entries(fillAmountBySource).forEach(([s, fillAmount]) => {
        const source = s as keyof SwapQuoteOrdersBreakdown;
        if (source === ERC20BridgeSource.MultiHop) {
            // TODO jacob has a different breakdown
        } else {
            breakdown[source] = fillAmount.div(totalFillAmount);
        }
    });
    return breakdown;
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
