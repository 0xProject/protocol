import { GetPoolCacheOfPairsInput, GetPoolCacheOfPairsOutput } from 'pool-cache-interface';

export interface PoolFetcher {
    get(input: GetPoolCacheOfPairsInput): Promise<GetPoolCacheOfPairsOutput>;
}
