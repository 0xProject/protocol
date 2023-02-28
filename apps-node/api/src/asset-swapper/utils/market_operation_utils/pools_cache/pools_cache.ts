import { Pool } from 'balancer-labs-sor-v1/dist/types';

import { ONE_HOUR_IN_SECONDS, ONE_SECOND_MS } from '../constants';
export { Pool };
export interface CacheValue {
    expiresAt: number;
    pools: Pool[];
}

// Cache results for 30mins
const DEFAULT_CACHE_TIME_MS = (ONE_HOUR_IN_SECONDS / 2) * ONE_SECOND_MS;
const DEFAULT_TIMEOUT_MS = 3000;

export interface PoolsCache {
    getFreshPoolsForPairAsync(takerToken: string, makerToken: string, timeoutMs?: number): Promise<Pool[]>;
    getPoolAddressesForPair(takerToken: string, makerToken: string): string[];
    isFresh(takerToken: string, makerToken: string): boolean;
}

export abstract class AbstractPoolsCache implements PoolsCache {
    protected static _getKey(takerToken: string, makerToken: string): string {
        return `${takerToken}-${makerToken}`;
    }

    protected static _isExpired(value: CacheValue | undefined): boolean {
        if (value === undefined) {
            return true;
        }
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
        const timeout = new Promise<Pool[]>((resolve) => setTimeout(resolve, timeoutMs, []));
        return Promise.race([this._getAndSaveFreshPoolsForPairAsync(takerToken, makerToken), timeout]);
    }

    /**
     * Returns pool addresses (can be stale) for a pair.
     *
     * An empty array will be returned if cache does not exist.
     */
    public getPoolAddressesForPair(takerToken: string, makerToken: string): string[] {
        const value = this._getValue(takerToken, makerToken);
        return value === undefined ? [] : value.pools.map((pool) => pool.id);
    }

    public isFresh(takerToken: string, makerToken: string): boolean {
        const value = this._getValue(takerToken, makerToken);
        return !AbstractPoolsCache._isExpired(value);
    }

    protected _getValue(takerToken: string, makerToken: string): CacheValue | undefined {
        const key = AbstractPoolsCache._getKey(takerToken, makerToken);
        return this._cache.get(key);
    }

    protected async _getAndSaveFreshPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        const key = AbstractPoolsCache._getKey(takerToken, makerToken);
        const value = this._cache.get(key);
        if (!AbstractPoolsCache._isExpired(value)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
            return value!.pools;
        }

        const pools = await this._fetchPoolsForPairAsync(takerToken, makerToken);
        const expiresAt = Date.now() + this._cacheTimeMs;
        this._cachePoolsForPair(takerToken, makerToken, pools, expiresAt);
        return pools;
    }

    protected _cachePoolsForPair(takerToken: string, makerToken: string, pools: Pool[], expiresAt: number): void {
        const key = AbstractPoolsCache._getKey(takerToken, makerToken);
        this._cache.set(key, { pools, expiresAt });
    }

    protected abstract _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]>;
}
