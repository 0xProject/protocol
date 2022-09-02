import { pino } from '@0x/api-utils';
import { BigNumber } from '@0x/utils';
import { createHash } from 'crypto';

import { LOGGER_INCLUDE_TIMESTAMP, LOG_LEVEL } from './config';

export const logger = pino({
    formatters: {
        level: (label) => ({
            level: label,
        }),
    },
    level: LOG_LEVEL,
    timestamp: LOGGER_INCLUDE_TIMESTAMP,
});

/**
 * Converts the parameters of a swap request into a 16-character ID
 * which can be used in logging to associate price and quote requests.
 *
 * Used SHA1 because apparently it's the fastest:
 * https://medium.com/@chris_72272/what-is-the-fastest-node-js-hashing-algorithm-c15c1a0e164e
 *
 * `takerAddress` is an optional parameter so it's easy to put a price request
 * into the function. However, if `takerAddress` is not present, the function returns
 * `null`. The reasoning for this is so two common trades by different takers
 * (e.x.: sell 1 WMATIC for USDC) aren't given the same ID.
 */
export function createSwapId(parameters: {
    buyAmount?: BigNumber;
    buyToken: string;
    sellAmount?: BigNumber;
    sellToken: string;
    // If a taker address is not provided, the function returns `null`.
    takerAddress?: string;
}): string | null {
    const { takerAddress } = parameters;
    if (!takerAddress) {
        return null;
    }
    const idLength = 16;
    return createHash('sha1')
        .update(
            `${parameters.buyAmount?.toString() ?? ''}${parameters.buyToken}${parameters.sellAmount?.toString() ?? ''}${
                parameters.sellToken
            }${parameters.takerAddress}`,
        )
        .digest('hex')
        .slice(0, idLength);
}
