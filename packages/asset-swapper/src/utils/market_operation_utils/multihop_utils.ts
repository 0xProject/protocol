import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { DexSample } from '../../network/types';
import { TwoHopFillData } from '../../network/two_hop_sampler';
import { Omit } from '../../types';

import { ZERO_AMOUNT } from './constants';
import { getTwoHopAdjustedRate } from './rate_utils';
import {
    ExchangeProxyOverhead,
    FeeSchedule,
    MarketSideLiquidity,
} from './types';

/**
 * Returns the best two-hop quote and the fee-adjusted rate of that quote.
 */
export function getBestTwoHopQuote(
    marketSideLiquidity: Omit<MarketSideLiquidity, 'makerTokenDecimals' | 'takerTokenDecimals'>,
    feeSchedule?: FeeSchedule,
    exchangeProxyOverhead?: ExchangeProxyOverhead,
): { quote: DexSample<TwoHopFillData> | undefined; adjustedRate: BigNumber } {
    const { side, inputAmount, outputAmountPerEth, quotes } = marketSideLiquidity;
    const { twoHopQuotes } = quotes;
    // Ensure the expected data we require exists. In the case where all hops reverted
    // or there were no sources included that allowed for multi hop,
    // we can end up with empty, but not undefined, fill data
    const filteredQuotes = twoHopQuotes.filter(
        quote =>
            quote &&
            quote.fillData &&
            quote.fillData.firstHop.source &&
            quote.fillData.secondHop.source &&
            quote.output.isGreaterThan(ZERO_AMOUNT),
    );
    if (filteredQuotes.length === 0) {
        return { quote: undefined, adjustedRate: ZERO_AMOUNT };
    }
    const best = filteredQuotes
        .map(quote =>
            getTwoHopAdjustedRate(side, quote, inputAmount, outputAmountPerEth, feeSchedule, exchangeProxyOverhead),
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
                ),
                quote: filteredQuotes[0],
            },
        );
    return best;
}
