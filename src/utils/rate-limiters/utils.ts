import { MetaTransactionRateLimiterRejectedResponse, MetaTransactionRateLimiterResponse } from './types';

/**
 * Type guard that checks if the response is a MetaTransactionRateLimiterRejectedResponse
 * @param rateLimitResponse rate limiter response
 */
export function isRateLimitedMetaTransactionResponse(
    rateLimitResponse: MetaTransactionRateLimiterResponse,
): rateLimitResponse is MetaTransactionRateLimiterRejectedResponse {
    return (rateLimitResponse as MetaTransactionRateLimiterRejectedResponse).reason !== undefined;
}
