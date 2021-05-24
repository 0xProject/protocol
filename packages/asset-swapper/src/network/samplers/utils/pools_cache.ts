import { Pool } from '@balancer-labs/sor/dist/types';

export { Pool };

export interface CacheValue {
    expiresAt: number;
    pools: Pool[];
}

export const ONE_SECOND_MS = 1000;
export const ONE_HOUR_IN_SECONDS = 60 * 60;

// Cache results for 30mins
const DEFAULT_CACHE_TIME_MS = (ONE_HOUR_IN_SECONDS / 2) * ONE_SECOND_MS;

const DEFAULT_TIMEOUT_MS = ONE_SECOND_MS;

export abstract class PoolsCache {
    protected static _isExpired(value: CacheValue): boolean {
        return Date.now() >= value.expiresAt;
    }

    private readonly _refreshPromises: { [pairId: string]: Promise<Pool[]> } = {};

    constructor(
        protected readonly _cache: { [key: string]: CacheValue },
        protected readonly _cacheTimeMs: number = DEFAULT_CACHE_TIME_MS,
    ) {}

    public async getFreshPoolsForPairAsync(
        takerToken: string,
        makerToken: string,
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<Pool[]> {
        // Only allow one outstanding refresh per pair at a time.
        const pairId = [takerToken, makerToken].sort().join('/');
        if (this._refreshPromises[pairId]) {
            return this._refreshPromises[pairId];
        }
        return this._refreshPromises[pairId] = (async () => {
            const timeout = new Promise<Pool[]>(resolve => setTimeout(resolve, timeoutMs, []));
            const r = await Promise.race([this._getAndSaveFreshPoolsForPairAsync(takerToken, makerToken), timeout]);
            delete this._refreshPromises[pairId];
            return r;
        })();
    }

    public getCachedPoolAddressesForPair(
        takerToken: string,
        makerToken: string,
        ignoreExpired: boolean = true,
    ): string[] | undefined {
        const key = JSON.stringify([takerToken, makerToken]);
        const value = this._cache[key];
        if (ignoreExpired) {
            return value === undefined ? [] : value.pools.map(pool => pool.id);
        }
        if (!value) {
            return undefined;
        }
        if (PoolsCache._isExpired(value)) {
            // Auto-refresh the pools if expired.
            this.getFreshPoolsForPairAsync(takerToken, makerToken)
                .catch(err => console.error(err));
            return undefined;
        }
        return (value || []).pools.map(pool => pool.id);
    }

    public isFresh(takerToken: string, makerToken: string): boolean {
        const cached = this.getCachedPoolAddressesForPair(takerToken, makerToken, false);
        return cached !== undefined;
    }

    protected async _getAndSaveFreshPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        const key = JSON.stringify([takerToken, makerToken]);
        const value = this._cache[key];
        if (value === undefined || value.expiresAt >= Date.now()) {
            const pools = await this._fetchPoolsForPairAsync(takerToken, makerToken);
            const expiresAt = Date.now() + this._cacheTimeMs;
            this._cachePoolsForPair(takerToken, makerToken, pools, expiresAt);
        }
        return this._cache[key].pools;
    }

    protected _cachePoolsForPair(takerToken: string, makerToken: string, pools: Pool[], expiresAt: number): void {
        const key = JSON.stringify([takerToken, makerToken]);
        this._cache[key] = {
            pools,
            expiresAt,
        };
    }

    protected abstract _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]>;
}
