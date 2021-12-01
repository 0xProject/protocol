import { BigNumber } from '@0x/utils';
import {
    CommonOrderFields,
    FillQuoteTransformerOrderType,
    LimitOrderFields,
    RfqOrderFields,
    Signature,
} from '@0x/protocol-utils';

import { SignedNativeOrder } from '../types';

export interface SignedOrder<T> {
    order: T;
    type: FillQuoteTransformerOrderType.Limit | FillQuoteTransformerOrderType.Rfq;
    signature: Signature;
}

export type NativeOrderWithFillableAmounts = SignedNativeOrder & NativeOrderFillableAmountFields & {
    gasCost: number;
};

/**
 * fillableMakerAmount: Amount of makerAsset that is fillable
 * fillableTakerAmount: Amount of takerAsset that is fillable
 * fillableTakerFeeAmount: Amount of takerFee paid to fill fillableTakerAmount
 */
export interface NativeOrderFillableAmountFields {
    fillableMakerAmount: BigNumber;
    fillableTakerAmount: BigNumber;
    fillableTakerFeeAmount: BigNumber;
}

/**
 * Given an amount of taker asset, calculate the the amount of maker asset
 * @param order The order
 * @param makerFillAmount the amount of taker asset
 */
export function getNativeMakerFillAmount(order: CommonOrderFields, takerFillAmount: BigNumber): BigNumber {
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
export function getNativeTakerFillAmount(order: CommonOrderFields, makerFillAmount: BigNumber): BigNumber {
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
export function getNativeTakerFeeFillAmount(order: LimitOrderFields, takerFillAmount: BigNumber): BigNumber {
    // Round down because Taker fee rate favors Taker
    const takerFeeAmount = takerFillAmount
        .multipliedBy(order.takerTokenFeeAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_FLOOR);
    return takerFeeAmount;
}
