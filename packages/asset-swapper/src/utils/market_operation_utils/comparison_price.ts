import { Web3Wrapper } from '@0x/dev-utils';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { MarketOperation } from '../../types';

import { COMPARISON_PRICE_DECIMALS } from './constants';
import {
    CollapsedFill,
    ComparisonPrice,
    DexSample,
    MarketSideLiquidity,
    MultiHopFillData,
    NativeCollapsedFill,
    OptimizerResult,
} from './types';

export interface FillInfo {
    makerAmount: BigNumber;
    takerAmount: BigNumber;
}

/**
 * Takes in an optimizer response and returns a price for RFQ MMs to beat
 * returns the price of the maker asset in terms of the maker asset
 * @param optimizerResult the output of the optimizer, contains the best orders
 * @param amount the amount specified by the client
 * @param marketSideLiquidity the results from querying liquidity sources
 * @return ComparisonPrice object with the prices for RFQ MMs to beat
 */
export function getComparisonPrices(
    optimizerResult: OptimizerResult,
    amount: BigNumber,
    marketSideLiquidity: MarketSideLiquidity,
): ComparisonPrice {
    let wholeOrder: BigNumber | undefined;

    let fillArray: FillInfo[];
    // tslint:disable-next-line:prefer-conditional-expression
    if (Array.isArray(optimizerResult.liquidityDelivered)) {
        fillArray = optimizerResult.liquidityDelivered.map(collapsedFill =>
            _collapsedFillToFillInfo(collapsedFill, marketSideLiquidity.side),
        );
    } else {
        fillArray = [_MultiHopToFillInfo(optimizerResult.liquidityDelivered, marketSideLiquidity.side)];
    }

    // sort optimized orders from best to worst price from the taker's perspective
    // you want the most units of the maker asset per unit of taker asset
    // or the least units of taker asset per unit of maker asset
    const takerSortedFills = _.orderBy(fillArray, fill => fill.takerAmount.div(fill.makerAmount), ['asc']);

    let remainingAmount = amount;
    let optimalMakerAmount = new BigNumber(0);
    let optimalTakerAmount = new BigNumber(0);

    for (const fill of takerSortedFills) {
        if (marketSideLiquidity.side === MarketOperation.Buy) {
            const amountConsumed = BigNumber.min(fill.makerAmount, remainingAmount);
            optimalMakerAmount = optimalMakerAmount.plus(amountConsumed);
            optimalTakerAmount = optimalTakerAmount.plus(amountConsumed.times(fill.makerAmount.div(fill.takerAmount)));
            remainingAmount = remainingAmount.minus(amountConsumed);
        } else if (marketSideLiquidity.side === MarketOperation.Sell) {
            const amountConsumed = BigNumber.min(fill.takerAmount, remainingAmount);
            optimalTakerAmount = optimalTakerAmount.plus(amountConsumed);
            optimalMakerAmount = optimalMakerAmount.plus(amountConsumed.times(fill.takerAmount.div(fill.makerAmount)));
            remainingAmount = remainingAmount.minus(amountConsumed);
        }
        if (remainingAmount.lte(0)) {
            break;
        }
    }

    if (optimalMakerAmount.gt(0)) {
        const totalMakerAmountUnitAmount = Web3Wrapper.toUnitAmount(
            optimalMakerAmount,
            marketSideLiquidity.makerTokenDecimals,
        );
        const totalTakerAmountUnitAmount = Web3Wrapper.toUnitAmount(
            optimalTakerAmount,
            marketSideLiquidity.takerTokenDecimals,
        );
        wholeOrder = totalMakerAmountUnitAmount
            .div(totalTakerAmountUnitAmount)
            .decimalPlaces(COMPARISON_PRICE_DECIMALS);
    }

    return {
        wholeOrder,
    };
}

function _collapsedFillToFillInfo(collapsedFill: CollapsedFill, marketOperation: MarketOperation): FillInfo {
    const possibleNativeCollapsedFill = collapsedFill as NativeCollapsedFill;
    // check if it's a native order
    if (possibleNativeCollapsedFill.fillData && possibleNativeCollapsedFill.fillData.order) {
        return {
            makerAmount: possibleNativeCollapsedFill.fillData.order.fillableMakerAssetAmount,
            takerAmount: possibleNativeCollapsedFill.fillData.order.fillableTakerAssetAmount,
        };
    } else if (marketOperation === MarketOperation.Buy) {
        return {
            makerAmount: collapsedFill.input,
            takerAmount: collapsedFill.output,
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            makerAmount: collapsedFill.output,
            takerAmount: collapsedFill.input,
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}

function _MultiHopToFillInfo(ds: DexSample<MultiHopFillData>, marketOperation: MarketOperation): FillInfo {
    // input and output map to different values
    // based on the market operation
    if (marketOperation === MarketOperation.Buy) {
        return {
            makerAmount: ds.input,
            takerAmount: ds.output,
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            makerAmount: ds.output,
            takerAmount: ds.input,
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}
