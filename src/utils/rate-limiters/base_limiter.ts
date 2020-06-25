import { MetaTransactionRateLimiterResponse } from '../../types';

import { MetaTransactionRateLimiterContext } from './types';

export abstract class MetaTransactionRateLimiter {
    public abstract async isAllowedAsync(
        context: MetaTransactionRateLimiterContext,
    ): Promise<MetaTransactionRateLimiterResponse>;
}
