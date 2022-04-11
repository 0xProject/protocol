import { BigNumber, V4RFQIndicativeQuote } from '@0x/asset-swapper';

import { ONE_SECOND_MS } from '../constants';
import { FirmOtcQuote, IndicativeQuote } from '../types';

/**
 * Selects the best quote from an array of quotes.
 *
 * Ignores quotes that:
 *  - are for the wrong pair
 *  - cannot fill 100% of the requested amount
 *  - expire in less than the validity window
 *
 * And selects the one with the best price
 */
export function getBestQuote<T extends IndicativeQuote | FirmOtcQuote>(
    quotes: T[],
    isSelling: boolean,
    takerToken: string,
    makerToken: string,
    assetFillAmount: BigNumber,
    validityWindowMs: number,
): T | null {
    const validityWindowSeconds = validityWindowMs / ONE_SECOND_MS;
    const sortedQuotes = quotes
        .filter((q) => getTakerToken(q) === takerToken && getMakerToken(q) === makerToken)
        .filter((q) => {
            const requestedAmount = isSelling ? getTakerAmount(q) : getMakerAmount(q);
            return requestedAmount.gte(assetFillAmount);
        })
        .filter((q) => !willQuoteExpireIn(q, validityWindowSeconds))
        .sort((a, b) => {
            // Want the most amount of maker tokens for each taker token
            const aPrice = getMakerAmount(a).div(getTakerAmount(a));
            const bPrice = getMakerAmount(b).div(getTakerAmount(b));
            return bPrice.minus(aPrice).toNumber();
        });

    // No quotes found
    if (sortedQuotes.length === 0) {
        return null;
    }

    // Get the best quote
    return sortedQuotes[0];
}

/// Private getter functions

const getTakerToken = (quote: V4RFQIndicativeQuote | FirmOtcQuote): string => {
    return isFirmQuote(quote) ? quote.order.takerToken : quote.takerToken;
};

const getMakerToken = (quote: V4RFQIndicativeQuote | FirmOtcQuote): string => {
    return isFirmQuote(quote) ? quote.order.makerToken : quote.makerToken;
};

const getTakerAmount = (quote: V4RFQIndicativeQuote | FirmOtcQuote): BigNumber => {
    return isFirmQuote(quote) ? quote.order.takerAmount : quote.takerAmount;
};

const getMakerAmount = (quote: V4RFQIndicativeQuote | FirmOtcQuote): BigNumber => {
    return isFirmQuote(quote) ? quote.order.makerAmount : quote.makerAmount;
};

const willQuoteExpireIn = (quote: V4RFQIndicativeQuote | FirmOtcQuote, secondsFromNow: number): boolean => {
    if (isFirmQuote(quote)) {
        return quote.order.willExpire(secondsFromNow);
    }

    // Handle indicative quote
    const nowSeconds = new BigNumber(Date.now()).div(ONE_SECOND_MS);
    const expirationCutoff = nowSeconds.plus(secondsFromNow);
    return quote.expiry.lt(expirationCutoff);
};

const isFirmQuote = (quote: V4RFQIndicativeQuote | FirmOtcQuote): quote is FirmOtcQuote => {
    return (quote as FirmOtcQuote).order !== undefined;
};
