import { CommonOrderFields, FillQuoteTransformerOrderType, LimitOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { NativeOrderFillableAmountFields, SignedNativeOrder } from '../types';

import { ZERO_AMOUNT } from './market_operation_utils/constants';

/**
 * Given an amount of taker asset, calculate the the amount of maker asset
 * @param order The order
 * @param makerFillAmount the amount of taker asset
 */
export function getNativeAdjustedMakerFillAmount(order: CommonOrderFields, takerFillAmount: BigNumber): BigNumber {
    // Round down because exchange rate favors Maker
    const makerFillAmount = takerFillAmount
        .multipliedBy(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_FLOOR);
    return makerFillAmount;
}
/**
 * Given an amount of maker asset, calculate the equivalent amount in taker asset
 * @param order The order
 * @param makerFillAmount the amount of maker asset
 */
export function getNativeAdjustedTakerFillAmount(order: CommonOrderFields, makerFillAmount: BigNumber): BigNumber {
    // Round up because exchange rate favors Maker
    const takerFillAmount = makerFillAmount
        .multipliedBy(order.takerAmount)
        .div(order.makerAmount)
        .integerValue(BigNumber.ROUND_CEIL);
    return takerFillAmount;
}

/**
 * Given an amount of taker asset, calculate the fee amount required for the taker
 * @param order The order
 * @param takerFillAmount the amount of taker asset
 */
export function getNativeAdjustedTakerFeeAmount(order: LimitOrderFields, takerFillAmount: BigNumber): BigNumber {
    // Round down because Taker fee rate favors Taker
    const takerFeeAmount = takerFillAmount
        .multipliedBy(order.takerTokenFeeAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_FLOOR);
    return takerFeeAmount;
}

const EMPTY_FILLABLE_AMOUNTS: NativeOrderFillableAmountFields = {
    fillableMakerAmount: ZERO_AMOUNT,
    fillableTakerAmount: ZERO_AMOUNT,
    fillableTakerFeeAmount: ZERO_AMOUNT,
};

export function getNativeAdjustedFillableAmountsFromTakerAmount(
    order: SignedNativeOrder,
    takerFillableAmount: BigNumber,
): NativeOrderFillableAmountFields {
    if (takerFillableAmount.isZero()) {
        return EMPTY_FILLABLE_AMOUNTS;
    }
    return {
        fillableTakerAmount: takerFillableAmount,
        fillableMakerAmount: getNativeAdjustedMakerFillAmount(order.order, takerFillableAmount),
        fillableTakerFeeAmount:
            order.type === FillQuoteTransformerOrderType.Limit
                ? getNativeAdjustedTakerFeeAmount(order.order as LimitOrderFields, takerFillableAmount)
                : ZERO_AMOUNT,
    };
}

export function getNativeAdjustedFillableAmountsFromMakerAmount(
    order: SignedNativeOrder,
    makerFillableAmount: BigNumber,
): NativeOrderFillableAmountFields {
    if (makerFillableAmount.isZero()) {
        return EMPTY_FILLABLE_AMOUNTS;
    }
    const takerFillableAmount = getNativeAdjustedTakerFillAmount(order.order, makerFillableAmount);
    return {
        fillableMakerAmount: makerFillableAmount,
        fillableTakerAmount: takerFillableAmount,
        fillableTakerFeeAmount:
            order.type === FillQuoteTransformerOrderType.Limit
                ? getNativeAdjustedTakerFeeAmount(order.order as LimitOrderFields, takerFillableAmount)
                : ZERO_AMOUNT,
    };
}
