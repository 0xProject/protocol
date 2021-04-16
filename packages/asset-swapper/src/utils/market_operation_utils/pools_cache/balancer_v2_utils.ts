// import { getPoolsWithTokens, parsePoolData } from '@balancer-labs/sor'; // TODO - upgrade to v2
import { BigNumber } from '@0x/utils';
import { Pool } from '@balancer-labs/sor/dist/types';
import { request } from 'graphql-request';

import { BALANCER_MAX_POOLS_FETCHED, BALANCER_V2_SUBGRAPH_URL } from '../constants';

import { CacheValue, PoolsCache } from './pools_cache';

export class BalancerV2PoolsCache extends PoolsCache {
    constructor(
        private readonly subgraphUrl: string = BALANCER_V2_SUBGRAPH_URL,
        cache: { [key: string]: CacheValue } = {},
        maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
    ) {
        super(cache, maxPoolsFetched);
    }

    // protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
    //     try {
    //         const poolData = (await getPoolsWithTokens(takerToken, makerToken)).pools;
    //         // Sort by maker token balance (descending)
    //         const pools = parsePoolData(poolData, takerToken, makerToken).sort((a, b) =>
    //             b.balanceOut.minus(a.balanceOut).toNumber(),
    //         );
    //         return pools.length > this.maxPoolsFetched ? pools.slice(0, this.maxPoolsFetched) : pools;
    //     } catch (err) {
    //         return [];
    //     }
    // }

    protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        const query = `
        query getPools {
            pools(where: {
              tokensList_contains: ["${takerToken}", "${makerToken}"]
            }) {
                id
                tokens {
                    address
                    balance
                    weight
                }
              swapFee
              swaps(
                orderBy: timestamp, orderDirection: desc, first: 1,
                  where:{
                  tokenIn: "${takerToken}",
                  tokenOut: "${makerToken}"
                }
              ) {
                tokenAmountIn
                tokenAmountOut
              }
            }
          }
          `;
        const { pools } = await request(this.subgraphUrl, query);
        return pools.map((pool: any) => {
            const tToken = pool.tokens.find((t: any) => t.address === takerToken);
            const mToken = pool.tokens.find((t: any) => t.address === makerToken);
            return {
                id: pool.id,
                balanceIn: new BigNumber(tToken.balance),
                balanceOut: new BigNumber(mToken.balance),
                weightIn: new BigNumber(tToken.weight),
                weightOut: new BigNumber(mToken.weight),
                swapFee: new BigNumber(pool.swapFee),
                spotPrice: new BigNumber(pool.swaps[0].tokenAmountOut / pool.swaps[0].tokenAmountIn), // TODO: xianny check
            };
        });
    }
}
