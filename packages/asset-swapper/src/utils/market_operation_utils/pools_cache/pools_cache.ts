import { Pool } from 'balancer-labs-sor-v1/dist/types';

import { ONE_HOUR_IN_SECONDS, ONE_SECOND_MS } from '../constants';
export { Pool };
export interface CacheValue {
    expiresAt: number;
    pools: Pool[];
}

// tslint:disable:custom-no-magic-numbers
// Cache results for 30mins
const DEFAULT_CACHE_TIME_MS = (ONE_HOUR_IN_SECONDS / 2) * ONE_SECOND_MS;
const DEFAULT_TIMEOUT_MS = 3000;
// tslint:enable:custom-no-magic-numbers

export abstract class PoolsCache {
    protected static _getKey(takerToken: string, makerToken: string): string {
        return `${takerToken}-${makerToken}`;
    }

    protected static _isExpired(value: CacheValue): boolean {
        return Date.now() >= value.expiresAt;
    }

    constructor(
        protected readonly _cache: Map<string, CacheValue>,
        protected readonly _cacheTimeMs: number = DEFAULT_CACHE_TIME_MS,
    ) {}

    public async getFreshPoolsForPairAsync(
        takerToken: string,
        makerToken: string,
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<Pool[]> {
        const timeout = new Promise<Pool[]>(resolve => setTimeout(resolve, timeoutMs, []));
        return Promise.race([this._getAndSaveFreshPoolsForPairAsync(takerToken, makerToken), timeout]);
    }

    public getCachedPoolAddressesForPair(
        takerToken: string,
        makerToken: string,
        ignoreExpired: boolean = true,
    ): string[] | undefined {
        const key = PoolsCache._getKey(takerToken, makerToken);
        const value = this._cache.get(key);
        if (ignoreExpired) {
            return value === undefined ? [] : value.pools.map(pool => pool.id);
        }
        if (!value) {
            return undefined;
        }
        if (PoolsCache._isExpired(value)) {
            return undefined;
        }
        return (value || []).pools.map(pool => pool.id);
    }

    public isFresh(takerToken: string, makerToken: string): boolean {
        const cached = this.getCachedPoolAddressesForPair(takerToken, makerToken, false);
        return cached !== undefined;
    }

    protected async _getAndSaveFreshPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        const key = PoolsCache._getKey(takerToken, makerToken);
        const value = this._cache.get(key);
        if (value === undefined || value.expiresAt >= Date.now()) {
            const pools = await this._fetchPoolsForPairAsync(takerToken, makerToken);
            const expiresAt = Date.now() + this._cacheTimeMs;
            this._cachePoolsForPair(takerToken, makerToken, pools, expiresAt);
        }
        return this._cache.get(key)!.pools;
    }

    protected _cachePoolsForPair(takerToken: string, makerToken: string, pools: Pool[], expiresAt: number): void {
        const key = PoolsCache._getKey(takerToken, makerToken);
        this._cache.set(key, { pools, expiresAt });
    }

    protected abstract _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]>;
}
