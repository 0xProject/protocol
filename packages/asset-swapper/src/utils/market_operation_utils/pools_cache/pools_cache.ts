import { Pool } from '@balancer-labs/sor/dist/types';
export { Pool };
export interface CacheValue {
    timestamp: number;
    pools: Pool[];
}

// tslint:disable:custom-no-magic-numbers
const FIVE_SECONDS_MS = 5 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 1000;
// tslint:enable:custom-no-magic-numbers

export abstract class PoolsCache {
    constructor(protected readonly _cache: { [key: string]: CacheValue }) {}

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
        cacheExpiryMs?: number,
    ): string[] | undefined {
        const key = JSON.stringify([takerToken, makerToken]);
        const value = this._cache[key];
        if (cacheExpiryMs === undefined) {
            return value === undefined ? [] : value.pools.map(pool => pool.id);
        }
        const minTimestamp = Date.now() - cacheExpiryMs;
        if (value === undefined || value.timestamp < minTimestamp) {
            return undefined;
        } else {
            return value.pools.map(pool => pool.id);
        }
    }

    public isFresh(takerToken: string, makerToken: string): boolean {
        const cached = this.getCachedPoolAddressesForPair(takerToken, makerToken, ONE_DAY_MS);
        return cached !== undefined && cached.length > 0;
    }

    protected async _getAndSaveFreshPoolsForPairAsync(
        takerToken: string,
        makerToken: string,
        cacheExpiryMs: number = FIVE_SECONDS_MS,
    ): Promise<Pool[]> {
        const key = JSON.stringify([takerToken, makerToken]);
        const value = this._cache[key];
        const minTimestamp = Date.now() - cacheExpiryMs;
        if (value === undefined || value.timestamp < minTimestamp) {
            const pools = await this._fetchPoolsForPairAsync(takerToken, makerToken);
            this._cachePoolsForPair(takerToken, makerToken, pools);
        }
        return this._cache[key].pools;
    }

    protected _cachePoolsForPair(takerToken: string, makerToken: string, pools: Pool[]): void {
        const key = JSON.stringify([takerToken, makerToken]);
        this._cache[key] = {
            pools,
            timestamp: Date.now(),
        };
    }

    protected abstract _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]>;
}
