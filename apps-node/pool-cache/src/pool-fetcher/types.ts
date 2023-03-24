import { GetPoolCacheOfPairsInput, GetPoolCacheOfPairsOutput } from 'pool-cache-interface';

export interface PoolFetcher {
    getPoolsOfPairs(input: GetPoolCacheOfPairsInput): Promise<GetPoolCacheOfPairsOutput>;
}
