import { APIOrder } from '@0x/types';
import * as pino from 'pino';

import { LOGGER_INCLUDE_TIMESTAMP, MAX_ORDER_EXPIRATION_BUFFER_SECONDS } from './config';
import { ONE_SECOND_MS } from './constants';
import { ExpiredOrderError } from './errors';

export const logger = pino({
    useLevelLabels: true,
    timestamp: LOGGER_INCLUDE_TIMESTAMP,
});

/**
 * If the max age of expired orders exceeds the configured threshold, this function
 * logs an error capturing the details of the expired orders
 */
export function alertOnExpiredOrders(expired: APIOrder[], details?: string): void {
    const maxExpirationTimeSeconds = Date.now() / ONE_SECOND_MS + MAX_ORDER_EXPIRATION_BUFFER_SECONDS;
    let idx = 0;
    if (
        expired.find((order, i) => {
            idx = i;
            return order.order.expirationTimeSeconds.gt(maxExpirationTimeSeconds);
        })
    ) {
        const error = new ExpiredOrderError(expired[idx].order, MAX_ORDER_EXPIRATION_BUFFER_SECONDS, details);
        logger.error(error);
    }
}
