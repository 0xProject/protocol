import { ChainId } from '@0x/contract-addresses';
import { Pool } from 'balancer-labs-sor-v1/dist/types';
import { getPoolsWithTokens, parsePoolData } from 'cream-sor';

import { BALANCER_MAX_POOLS_FETCHED } from '../constants';

import { NoOpPoolsCache } from './no_op_pools_cache';
import { AbstractPoolsCache, CacheValue, PoolsCache } from './pools_cache';

export class CreamPoolsCache extends AbstractPoolsCache {
    public static create(chainId: ChainId): PoolsCache {
        if (chainId !== ChainId.Mainnet) {
            return new NoOpPoolsCache();
        }

        return new CreamPoolsCache();
    }
    protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        try {
            const poolData = (await getPoolsWithTokens(takerToken, makerToken)).pools;
            // Sort by maker token balance (descending)
            const pools = parsePoolData(poolData, takerToken, makerToken).sort((a, b) =>
                b.balanceOut.minus(a.balanceOut).toNumber(),
            );
            return pools.slice(0, this.maxPoolsFetched);
        } catch (err) {
            return [];
        }
    }
    private constructor(
        _cache: Map<string, CacheValue> = new Map(),
        private readonly maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
    ) {
        super(_cache);
    }
}
