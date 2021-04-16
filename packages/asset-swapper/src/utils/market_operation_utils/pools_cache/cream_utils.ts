import { Pool } from '@balancer-labs/sor/dist/types';
import { getPoolsWithTokens, parsePoolData } from 'cream-sor';

import { BALANCER_MAX_POOLS_FETCHED } from '../constants';

import { CacheValue, PoolsCache } from './pools_cache';

export class CreamPoolsCache extends PoolsCache {
    constructor(_cache: { [key: string]: CacheValue } = {}, maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED) {
        super(_cache, maxPoolsFetched);
    }

    protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        try {
            const poolData = (await getPoolsWithTokens(takerToken, makerToken)).pools;
            // Sort by maker token balance (descending)
            const pools = parsePoolData(poolData, takerToken, makerToken).sort((a, b) =>
                b.balanceOut.minus(a.balanceOut).toNumber(),
            );
            return pools.length > this.maxPoolsFetched ? pools.slice(0, this.maxPoolsFetched) : pools;
        } catch (err) {
            return [];
        }
    }
}
