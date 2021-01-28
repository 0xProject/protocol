import {
    CommonOrderFields,
    FillQuoteTransformerOrderType,
    LimitOrderFields,
    LimitOrderFields as Order,
    RfqOrderFields,
} from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { constants } from '../constants';
import { NativeOrderFillableAmountFields } from '../types';

import { ZERO_AMOUNT } from './market_operation_utils/constants';
import { SignedOrder } from './market_operation_utils/types';

// tslint:disable: no-unnecessary-type-assertion completed-docs

export function numberPercentageToEtherTokenAmountPercentage(percentage: number): BigNumber {
    return Web3Wrapper.toBaseUnitAmount(constants.ONE_AMOUNT, constants.ETHER_TOKEN_DECIMALS).multipliedBy(percentage);
}

export function getAdjustedTakerAmountFromFees<T extends Order>(order: T): BigNumber {
    return order.takerAmount.plus(order.takerTokenFeeAmount);
}

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

export function getNativeAdjustedFillableAmountsFromTakerAmount(
    order: SignedOrder<LimitOrderFields | RfqOrderFields>,
    takerFillAmount: BigNumber,
): NativeOrderFillableAmountFields {
    return {
        fillableTakerAmount: takerFillAmount,
        fillableMakerAmount: getNativeAdjustedMakerFillAmount(order.order, takerFillAmount),
        fillableTakerFeeAmount:
            order.type === FillQuoteTransformerOrderType.Limit
                ? getNativeAdjustedTakerFeeAmount(order.order as LimitOrderFields, takerFillAmount)
                : ZERO_AMOUNT,
    };
}

export function getNativeAdjustedFillableAmountsFromMakerAmount(
    order: SignedOrder<LimitOrderFields | RfqOrderFields>,
    makerFillAmount: BigNumber,
): NativeOrderFillableAmountFields {
    const fillableTakerAmount = getNativeAdjustedTakerFillAmount(order.order, makerFillAmount);
    return {
        fillableMakerAmount: makerFillAmount,
        fillableTakerAmount,
        fillableTakerFeeAmount:
            order.type === FillQuoteTransformerOrderType.Limit
                ? getNativeAdjustedTakerFeeAmount(order.order as LimitOrderFields, fillableTakerAmount)
                : ZERO_AMOUNT,
    };
}
