import { GetPoolCacheOfPairsInput, GetPoolCacheOfPairsOutput } from 'pool-cache-interface';
import { CacheClient } from '../cache/types';
import * as _ from 'lodash';
import { PoolFetcher } from '../pool-fetcher/types';

const MAX_STALENESS_IN_SEC = 60 * 60 * 6; // 6 hours in seconds

export class PoolCacheService {
    poolFetcher: PoolFetcher;
    cacheClient: CacheClient;

    constructor({ poolFetcher, cacheClient }: { poolFetcher: PoolFetcher; cacheClient: CacheClient }) {
        this.poolFetcher = poolFetcher;
        this.cacheClient = cacheClient;
    }

    async get(input: GetPoolCacheOfPairsInput): Promise<GetPoolCacheOfPairsOutput> {
        const output = await this.cacheClient.get(input);

        // Update the cache for the next request if needed, but don't wait for it to finish.
        if (PoolCacheService.needRefresh(output)) {
            this.fetchThenCache(input);
        }

        return output;
    }

    async fetchThenCache(input: GetPoolCacheOfPairsInput): Promise<'OK'> {
        const output = await this.poolFetcher.get(input);
        return this.cacheClient.set(input, output);
    }

    private static needRefresh(output: GetPoolCacheOfPairsOutput): boolean {
        const nowSec = Date.now() / 1000;
        // cache miss (represented as timestamp === null) or cache is stale
        return _.some(
            output.uniswapV3Cache,
            (cache) => cache.timestamp === null || nowSec - cache.timestamp > MAX_STALENESS_IN_SEC,
        );
    }
}
