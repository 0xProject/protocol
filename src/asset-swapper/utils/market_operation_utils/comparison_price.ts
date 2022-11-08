import { Web3Wrapper } from '@0x/dev-utils';
import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber, logUtils } from '@0x/utils';

import { MarketOperation } from '../../types';

import { COMPARISON_PRICE_DECIMALS, SOURCE_FLAGS } from './constants';
import {
    ComparisonPrice,
    ERC20BridgeSource,
    ExchangeProxyOverhead,
    FeeEstimate,
    FeeSchedule,
    MarketSideLiquidity,
} from './types';

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
    exchangeProxyOverhead: ExchangeProxyOverhead,
): ComparisonPrice {
    let wholeOrder: BigNumber | undefined;
    let feeInEth: BigNumber | number;

    // HACK: get the fee penalty of a single 0x native order
    // The FeeSchedule function takes in a `FillData` object and returns a fee estimate in ETH
    // We don't have fill data here, we just want the cost of a single native order, so we pass in undefined
    // This works because the feeSchedule returns a constant for Native orders, this will need
    // to be tweaked if the feeSchedule for native orders uses the fillData passed in
    // 2 potential issues: there is no native fee schedule or the fee schedule depends on fill data
    if (feeSchedule[ERC20BridgeSource.Native] === undefined) {
        logUtils.warn('ComparisonPrice function did not find native order fee schedule');

        return { wholeOrder };
    } else {
        try {
            const fillFeeInEth = new BigNumber(
                (feeSchedule[ERC20BridgeSource.Native] as FeeEstimate)({ type: FillQuoteTransformerOrderType.Rfq }).fee,
            );
            const exchangeProxyOverheadInEth = new BigNumber(exchangeProxyOverhead(SOURCE_FLAGS.RfqOrder));
            feeInEth = fillFeeInEth.plus(exchangeProxyOverheadInEth);
        } catch {
            logUtils.warn('Native order fee schedule requires fill data');

            return { wholeOrder };
        }
    }

    // Calc native order fee penalty in output unit (maker units for sells, taker unit for buys)
    const feePenalty = !marketSideLiquidity.outputAmountPerEth.isZero()
        ? marketSideLiquidity.outputAmountPerEth.times(feeInEth)
        : // if it's a sell, the input token is the taker token
          marketSideLiquidity.inputAmountPerEth
              .times(feeInEth)
              .times(marketSideLiquidity.side === MarketOperation.Sell ? adjustedRate : adjustedRate.pow(-1));

    // the adjusted rate is defined as maker/taker
    // input is the taker token for sells, input is the maker token for buys
    const orderMakerAmount =
        marketSideLiquidity.side === MarketOperation.Sell ? adjustedRate.times(amount).plus(feePenalty) : amount;
    const orderTakerAmount =
        marketSideLiquidity.side === MarketOperation.Sell ? amount : amount.dividedBy(adjustedRate).minus(feePenalty);

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

    return { wholeOrder };
}
