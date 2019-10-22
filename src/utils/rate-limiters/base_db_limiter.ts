import { assert } from '@0x/assert';

import { MetaTransactionRateLimiterResponse } from '../../types';

import { DatabaseKeysUsedForRateLimiter, MetaTransactionRateLimiterContext } from './types';

export abstract class MetaTransactionBaseDbRateLimiter {
    public readonly _dbField: string;

    public static isValidDBFieldOrThrow(dbField: string): void {
        assert.doesBelongToStringEnum('dbField', dbField, DatabaseKeysUsedForRateLimiter);
    }

    constructor(dbField: string) {
        MetaTransactionBaseDbRateLimiter.isValidDBFieldOrThrow(dbField);
        this._dbField = dbField;
    }

    public abstract isAllowedAsync(
        context: MetaTransactionRateLimiterContext,
    ): Promise<MetaTransactionRateLimiterResponse>;

    public getKeyFromContextOrThrow(context: MetaTransactionRateLimiterContext): string {
        switch (this._dbField) {
            case DatabaseKeysUsedForRateLimiter.ApiKey:
                return context.apiKey;
            case DatabaseKeysUsedForRateLimiter.TakerAddress:
                return context.takerAddress;
            default:
                throw new Error(`unsupported field configured for meta transaction rate limit: ${this._dbField}`);
        }
    }
}
