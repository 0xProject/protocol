import { BigNumber } from '@0x/utils';

import { Omit } from '../../types';

import { ZERO_AMOUNT } from './constants';
import { getTwoHopAdjustedRate } from './rate_utils';
import {
    DexSample,
    ExchangeProxyOverhead,
    FeeSchedule,
    FillAdjustor,
    MarketSideLiquidity,
    MultiHopFillData,
} from './types';

/**
 * Returns the best two-hop quote and the fee-adjusted rate of that quote.
 */
export function getBestTwoHopQuote(
    marketSideLiquidity: Omit<MarketSideLiquidity, 'makerTokenDecimals' | 'takerTokenDecimals'>,
    feeSchedule: FeeSchedule,
    exchangeProxyOverhead: ExchangeProxyOverhead,
    fillAdjustor: FillAdjustor,
): { quote: DexSample<MultiHopFillData> | undefined; adjustedRate: BigNumber } {
    const { side, inputAmount, outputAmountPerEth, quotes } = marketSideLiquidity;
    const { twoHopQuotes } = quotes;
    // Ensure the expected data we require exists. In the case where all hops reverted
    // or there were no sources included that allowed for multi hop,
    // we can end up with empty, but not undefined, fill data
    const filteredQuotes = twoHopQuotes.filter(
        (quote) =>
            quote &&
            quote.fillData &&
            quote.fillData.firstHopSource &&
            quote.fillData.secondHopSource &&
            quote.output.isGreaterThan(ZERO_AMOUNT),
    );
    if (filteredQuotes.length === 0) {
        return { quote: undefined, adjustedRate: ZERO_AMOUNT };
    }
    const best = filteredQuotes
        .map((quote) =>
            getTwoHopAdjustedRate(
                side,
                quote,
                inputAmount,
                outputAmountPerEth,
                feeSchedule,
                exchangeProxyOverhead,
                fillAdjustor,
            ),
        )
        .reduce(
            (prev, curr, i) =>
                curr.isGreaterThan(prev.adjustedRate) ? { adjustedRate: curr, quote: filteredQuotes[i] } : prev,
            {
                adjustedRate: getTwoHopAdjustedRate(
                    side,
                    filteredQuotes[0],
                    inputAmount,
                    outputAmountPerEth,
                    feeSchedule,
                    exchangeProxyOverhead,
                    fillAdjustor,
                ),
                quote: filteredQuotes[0],
            },
        );
    return best;
}
