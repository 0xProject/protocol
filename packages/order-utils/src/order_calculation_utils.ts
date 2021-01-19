import { CommonOrderFields as Order, LimitOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { constants } from './constants';

export const orderCalculationUtils = {
    /**
     * Given an amount of taker asset, calculate the the amount of maker asset
     * @param order The order
     * @param makerFillAmount the amount of taker asset
     */
    getMakerFillAmount(order: Order, takerFillAmount: BigNumber): BigNumber {
        // Round down because exchange rate favors Maker
        const makerFillAmount = takerFillAmount
            .multipliedBy(order.makerAmount)
            .div(order.takerAmount)
            .integerValue(BigNumber.ROUND_FLOOR);
        return makerFillAmount;
    },
    /**
     * Given an amount of maker asset, calculate the equivalent amount in taker asset
     * @param order The order
     * @param makerFillAmount the amount of maker asset
     */
    getTakerFillAmount(order: Order, makerFillAmount: BigNumber): BigNumber {
        // Round up because exchange rate favors Maker
        const takerFillAmount = makerFillAmount
            .multipliedBy(order.takerAmount)
            .div(order.makerAmount)
            .integerValue(BigNumber.ROUND_CEIL);
        return takerFillAmount;
    },
    /**
     * Given an amount of taker asset, calculate the fee amount required for the taker
     * @param order The order
     * @param takerFillAmount the amount of taker asset
     */
    getTakerFeeAmount(order: LimitOrderFields, takerFillAmount: BigNumber): BigNumber {
        // Round down because Taker fee rate favors Taker
        const takerFeeAmount = takerFillAmount
            .multipliedBy(order.takerTokenFeeAmount)
            .div(order.takerAmount)
            .integerValue(BigNumber.ROUND_FLOOR);
        return takerFeeAmount;
    },
    /**
     * Given a desired amount of ZRX from a fee order, calculate the amount of taker asset required to fill.
     * Also calculate how much ZRX needs to be purchased in order to fill the desired amount plus the taker fee amount
     * @param order The order
     * @param makerFillAmount the amount of maker asset
     */
    getTakerFillAmountForFeeOrder(order: LimitOrderFields, makerFillAmount: BigNumber): [BigNumber, BigNumber] {
        // For each unit of TakerAsset we buy (MakerAsset - TakerFee)
        const adjustedTakerFillAmount = makerFillAmount
            .multipliedBy(order.takerAmount)
            .div(order.makerAmount.minus(order.takerTokenFeeAmount))
            .integerValue(BigNumber.ROUND_CEIL);
        // The amount that we buy will be greater than makerFillAmount, since we buy some amount for fees.
        const adjustedMakerFillAmount = orderCalculationUtils.getMakerFillAmount(order, adjustedTakerFillAmount);
        return [adjustedTakerFillAmount, adjustedMakerFillAmount];
    },
};
