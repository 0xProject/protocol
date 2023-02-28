import { ONE_HOUR_IN_SECONDS, ONE_SECOND_MS } from '../constants';
import { BalancerSwaps } from '../types';

export interface CacheValue {
    expiresAt: number;
    balancerSwaps: BalancerSwaps;
}

// Cache results for 30mins
const DEFAULT_CACHE_TIME_MS = (ONE_HOUR_IN_SECONDS / 2) * ONE_SECOND_MS;
const DEFAULT_TIMEOUT_MS = ONE_SECOND_MS;
export const EMPTY_BALANCER_SWAPS = { swapInfoExactIn: [], swapInfoExactOut: [] };

/**
 * Caches SwapInfo for a pair of tokens.
 * SwapInfo includes swap steps and asset information for those swap steps.
 */
export abstract class SwapInfoCache {
    protected static _isExpired(value: CacheValue): boolean {
        return Date.now() >= value.expiresAt;
    }
    constructor(
        protected readonly _cache: { [key: string]: CacheValue },
        protected readonly _cacheTimeMs: number = DEFAULT_CACHE_TIME_MS,
    ) {}

    public async getFreshPoolsForPairAsync(
        takerToken: string,
        makerToken: string,
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<BalancerSwaps> {
        const timeout = new Promise<BalancerSwaps>((resolve) => setTimeout(resolve, timeoutMs, []));
        return Promise.race([this._getAndSaveFreshSwapInfoForPairAsync(takerToken, makerToken), timeout]);
    }

    public getCachedSwapInfoForPair(
        takerToken: string,
        makerToken: string,
        ignoreExpired = true,
    ): BalancerSwaps | undefined {
        const key = JSON.stringify([takerToken, makerToken]);
        const value = this._cache[key];
        if (ignoreExpired) {
            return value === undefined ? EMPTY_BALANCER_SWAPS : value.balancerSwaps;
        }
        if (!value) {
            return undefined;
        }
        if (SwapInfoCache._isExpired(value)) {
            return undefined;
        }
        return value.balancerSwaps;
    }

    public isFresh(takerToken: string, makerToken: string): boolean {
        const cached = this.getCachedSwapInfoForPair(takerToken, makerToken, false);
        return cached !== undefined;
    }

    protected async _getAndSaveFreshSwapInfoForPairAsync(
        takerToken: string,
        makerToken: string,
    ): Promise<BalancerSwaps> {
        const key = JSON.stringify([takerToken, makerToken]);
        const value = this._cache[key];
        if (value === undefined || value.expiresAt >= Date.now()) {
            const swapInfo = await this._fetchSwapInfoForPairAsync(takerToken, makerToken);
            const expiresAt = Date.now() + this._cacheTimeMs;
            this._cacheSwapInfoForPair(takerToken, makerToken, swapInfo, expiresAt);
        }
        return this._cache[key].balancerSwaps;
    }

    protected _cacheSwapInfoForPair(
        takerToken: string,
        makerToken: string,
        swapInfo: BalancerSwaps,
        expiresAt: number,
    ): void {
        const key = JSON.stringify([takerToken, makerToken]);
        this._cache[key] = {
            expiresAt,
            balancerSwaps: swapInfo,
        };
    }

    protected abstract _fetchSwapInfoForPairAsync(takerToken: string, makerToken: string): Promise<BalancerSwaps>;
}
