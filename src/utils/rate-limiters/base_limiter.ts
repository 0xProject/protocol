import { MetaTransactionRateLimiterResponse } from '../../types';

import { MetaTransactionRateLimiterContext } from './types';

export abstract class MetaTransactionRateLimiter {
    public abstract isAllowedAsync(
        context: MetaTransactionRateLimiterContext,
    ): Promise<MetaTransactionRateLimiterResponse>;
}
