import { Web3Wrapper } from '@0x/dev-utils';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { MarketOperation } from '../../types';

import { COMPARISON_PRICE_DECIMALS, SOURCE_FLAGS } from './constants';
import { ComparisonPrice, MarketSideLiquidity, OptimizerResult } from './types';

/**
 * Takes in an optimizer response and returns a price for RFQT MMs to beat
 * returns the price of the taker asset in terms of the maker asset
 * So the RFQT MM should aim for a higher price
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
    // the adjusted rate is defined as maker/taker
    // input is the taker token for sells, input is the maker token for buys
    const makerTakerOptimalRate = optimizerResult.adjustedRate;
    const takerMakerOptimalRate = optimizerResult.adjustedRate.pow(-1);

    // fees for a native order
    const fees = optimizerResult.exchangeProxyOverhead(SOURCE_FLAGS.Native);

    // Calc native order fee penalty in output unit (maker units for sells, taker unit for buys)
    const feePenalty = !marketSideLiquidity.ethToOutputRate.isZero()
        ? marketSideLiquidity.ethToOutputRate.times(fees)
        : // if it's a sell, the input token is the taker token
          marketSideLiquidity.ethToInputRate
              .times(fees)
              .times(marketSideLiquidity.side === MarketOperation.Sell ? makerTakerOptimalRate : takerMakerOptimalRate);

    let wholeOrder: BigNumber | undefined;

    let orderMakerAmount: BigNumber;
    let orderTakerAmount: BigNumber;
    if (marketSideLiquidity.side === MarketOperation.Sell) {
        orderTakerAmount = amount;

        orderMakerAmount = makerTakerOptimalRate.times(orderTakerAmount).plus(feePenalty);
    } else if (marketSideLiquidity.side === MarketOperation.Buy) {
        orderMakerAmount = amount;

        orderTakerAmount = takerMakerOptimalRate.times(orderMakerAmount).minus(feePenalty);
    } else {
        throw new Error(`Unexpected marketOperation ${marketSideLiquidity.side}`);
    }

    if (orderTakerAmount.gt(0)) {
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
