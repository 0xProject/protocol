import { FillQuoteTransformerOrderType, OtcOrder } from '@0x/protocol-utils';
import { BigNumber, SignedNativeOrder, V4RFQIndicativeQuote } from '../asset-swapper';
import { SignedOtcOrder } from '../asset-swapper/types';
import { ONE_SECOND_MS } from '../constants';

/**
 * Selects the best quote from an array of quotes.
 */
export function getBestQuote<T extends V4RFQIndicativeQuote | SignedNativeOrder>(
    quotes: T[],
    isSelling: boolean,
    takerToken: string,
    makerToken: string,
    assetFillAmount: BigNumber,
    validityWindowMs: number,
): T | null {
    // Filter out quotes that:
    // - are for the wrong pair
    // - cannot fill 100 % of the requested amount
    // - expire in less than the validity window
    //
    // And sort by best price
    const now = new BigNumber(Date.now());
    const expirationCutoff = now.plus(validityWindowMs).div(ONE_SECOND_MS);
    const sortedQuotes = quotes
        .filter((q) => getTakerToken(q) === takerToken && getMakerToken(q) === makerToken)
        .filter((q) => {
            const requestedAmount = isSelling ? getTakerAmount(q) : getMakerAmount(q);
            return requestedAmount.gte(assetFillAmount);
        })
        .filter((q) => getExpiry(q).gte(expirationCutoff))
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

/// Private Getter functions

const getTakerToken = (quote: V4RFQIndicativeQuote | SignedNativeOrder): string => {
    if (isSignedNativeOrder(quote)) {
        return quote.order.takerToken;
    }

    return quote.takerToken;
};

const getMakerToken = (quote: V4RFQIndicativeQuote | SignedNativeOrder): string => {
    if (isSignedNativeOrder(quote)) {
        return quote.order.makerToken;
    }

    return quote.makerToken;
};

const getTakerAmount = (quote: V4RFQIndicativeQuote | SignedNativeOrder): BigNumber => {
    if (isSignedNativeOrder(quote)) {
        return quote.order.takerAmount;
    }

    return quote.takerAmount;
};

const getMakerAmount = (quote: V4RFQIndicativeQuote | SignedNativeOrder): BigNumber => {
    if (isSignedNativeOrder(quote)) {
        return quote.order.makerAmount;
    }

    return quote.makerAmount;
};

const getExpiry = (quote: V4RFQIndicativeQuote | SignedNativeOrder): BigNumber => {
    if (isSignedNativeOrder(quote)) {
        if (isOtcOrder(quote)) {
            const { expiry } = OtcOrder.parseExpiryAndNonce(quote.order.expiryAndNonce);
            return expiry;
        }
        return quote.order.expiry;
    }

    return quote.expiry;
};

const isSignedNativeOrder = (quote: V4RFQIndicativeQuote | SignedNativeOrder): quote is SignedNativeOrder => {
    return (quote as SignedNativeOrder).order !== undefined;
};

const isOtcOrder = (order: SignedNativeOrder): order is SignedOtcOrder => {
    return order.type === FillQuoteTransformerOrderType.Otc;
};
