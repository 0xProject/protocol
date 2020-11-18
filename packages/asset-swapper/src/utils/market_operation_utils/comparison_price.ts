import { Web3Wrapper } from '@0x/dev-utils';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { MarketOperation } from '../../types';

import { COMPARISON_PRICE_DECIMALS } from './constants';
import { ComparisonPrice, ERC20BridgeSource, FeeEstimate, FeeSchedule, MarketSideLiquidity } from './types';

/**
 * Takes in an optimizer response and returns a price for RFQT MMs to beat
 * returns the price of the taker asset in terms of the maker asset
 * So the RFQT MM should aim for a higher price
 * @param adjustedRate the adjusted rate (accounting for fees) from the optimizer, maker/taker
 * @param amount the amount specified by the client
 * @param marketSideLiquidity the results from querying liquidity sources
 * @param feeSchedule the fee schedule passed to the Optimizer
 * @return ComparisonPrice object with the prices for RFQ MMs to beat
 */
export function getComparisonPrices(
    adjustedRate: BigNumber,
    amount: BigNumber,
    marketSideLiquidity: MarketSideLiquidity,
    feeSchedule: FeeSchedule,
): ComparisonPrice {
    // Calc native order fee penalty in output unit (maker units for sells, taker unit for buys)
    const feePenalty = !marketSideLiquidity.ethToOutputRate.isZero()
        ? marketSideLiquidity.ethToOutputRate.times((feeSchedule[ERC20BridgeSource.Native] as FeeEstimate)(undefined))
        : // if it's a sell, the input token is the taker token
          marketSideLiquidity.ethToInputRate
              .times((feeSchedule[ERC20BridgeSource.Native] as FeeEstimate)(undefined))
              .times(marketSideLiquidity.side === MarketOperation.Sell ? adjustedRate : adjustedRate.pow(-1));

    // the adjusted rate is defined as maker/taker
    // input is the taker token for sells, input is the maker token for buys
    const orderMakerAmount =
        marketSideLiquidity.side === MarketOperation.Sell ? adjustedRate.times(amount).plus(feePenalty) : amount;
    const orderTakerAmount =
        marketSideLiquidity.side === MarketOperation.Sell ? amount : amount.dividedBy(adjustedRate).minus(feePenalty);

    let wholeOrder: BigNumber | undefined;
    if (orderTakerAmount.gt(0) && orderMakerAmount.gt(0)) {
        const optimalMakerUnitAmount = Web3Wrapper.toUnitAmount(
            // round up maker amount -- err to giving more competitive price
            orderMakerAmount.integerValue(BigNumber.ROUND_UP),
            marketSideLiquidity.makerTokenDecimals,
        );
        const optimalTakerUnitAmount = Web3Wrapper.toUnitAmount(
            // round down taker amount -- err to giving more competitive price
            orderTakerAmount.integerValue(BigNumber.ROUND_DOWN),
            marketSideLiquidity.takerTokenDecimals,
        );
        wholeOrder = optimalMakerUnitAmount.div(optimalTakerUnitAmount).decimalPlaces(COMPARISON_PRICE_DECIMALS);
    }

    return {
        wholeOrder,
    };
}
