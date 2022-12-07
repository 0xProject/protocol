import { BigNumber, V4RFQIndicativeQuote } from '@0x/asset-swapper';
import { Counter } from 'prom-client';

import { ONE_SECOND_MS } from '../core/constants';
import { logger } from '../logger';
import { FirmOtcQuote, IndicativeQuote } from '../core/types';

import { toPairString } from '../core/pair_utils';

const RFQM_MAKER_BLOCKED_FOR_LOW_MAKER_BALANCE = new Counter({
    name: 'rfqm_maker_blocked_for_low_maker_balance',
    help: 'A maker get blocked because of low maker balance',
    labelNames: ['maker_uri', 'chain_id', 'pair_key'],
});

/**
 * Selects the best quote from an array of quotes.
 *
 * Ignores quotes that:
 *  - are for the wrong pair
 *  - cannot fill 100% of the requested amount
 *  - expire in less than the validity window
 *  - cannot be filled by the maker due to insufficient balances, if quotedMakerBalances is present
 *      (only for firm quotes)
 *
 * And selects the one with the best price.
 */
export function getBestQuote<T extends IndicativeQuote | FirmOtcQuote>(
    quotes: T[],
    isSelling: boolean,
    takerToken: string,
    makerToken: string,
    assetFillAmount: BigNumber,
    validityWindowMs: number,
    quotedMakerBalances?: BigNumber[],
): T | null {
    // If maker balances are provided, quotes in which maker addresses cannot provide sufficient
    // balances to fully fill the order are filtered out
    let isMakerFillablePredicate = (_q: T, _idx: number) => true;
    if (quotedMakerBalances) {
        if (quotes.length !== quotedMakerBalances.length) {
            throw new Error('Quotes do not match with provided maker balances');
        }
        isMakerFillablePredicate = (q: T, idx: number) => {
            if (isFirmQuote(q) && q.order.makerAmount.gt(quotedMakerBalances[idx])) {
                RFQM_MAKER_BLOCKED_FOR_LOW_MAKER_BALANCE.labels(
                    q.makerUri,
                    q.order.chainId.toString(),
                    toPairString(getMakerToken(q), getTakerToken(q)),
                ).inc();
                logger.warn(
                    {
                        maker: q.makerUri,
                        makerBalance: quotedMakerBalances[idx],
                        order: q.order,
                    },
                    'Quote has insufficient maker balance',
                );
                return false;
            }
            return true;
        };
    }

    const validityWindowSeconds = validityWindowMs / ONE_SECOND_MS;
    const sortedQuotes = quotes
        .filter(isMakerFillablePredicate)
        .filter((q) => getTakerToken(q) === takerToken && getMakerToken(q) === makerToken)
        .filter((q) => {
            const requestedAmount = isSelling ? getTakerAmount(q) : getMakerAmount(q);
            return requestedAmount.eq(assetFillAmount);
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
