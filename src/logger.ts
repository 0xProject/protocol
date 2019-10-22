import { pino } from '@0x/api-utils';

import { LOGGER_INCLUDE_TIMESTAMP, LOG_LEVEL, MAX_ORDER_EXPIRATION_BUFFER_SECONDS } from './config';
import { ONE_SECOND_MS } from './constants';
import { ExpiredOrderError } from './errors';
import { SRAOrder } from './types';

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
 * If the max age of expired orders exceeds the configured threshold, this function
 * logs an error capturing the details of the expired orders
 */
export function alertOnExpiredOrders(expired: SRAOrder[], details?: string): void {
    const maxExpirationTimeSeconds = Date.now() / ONE_SECOND_MS + MAX_ORDER_EXPIRATION_BUFFER_SECONDS;
    let idx = 0;
    if (
        expired.find((order, i) => {
            idx = i;
            return order.order.expiry.toNumber() > maxExpirationTimeSeconds;
        })
    ) {
        const error = new ExpiredOrderError(expired[idx].order, MAX_ORDER_EXPIRATION_BUFFER_SECONDS, details);
        logger.error(error);
    }
}
