import { GetPoolCacheOfPairsInput, GetPoolCacheOfPairsOutput } from 'pool-cache-interface';

export interface CacheClient {
    set(input: GetPoolCacheOfPairsInput, output: GetPoolCacheOfPairsOutput): Promise<'OK'>;
    get(input: GetPoolCacheOfPairsInput): Promise<GetPoolCacheOfPairsOutput>;
    destroy(): Promise<void>;
}
