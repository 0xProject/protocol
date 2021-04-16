import { getPoolsWithTokens, parsePoolData } from '@balancer-labs/sor';
import { Pool } from '@balancer-labs/sor/dist/types';

import { BALANCER_MAX_POOLS_FETCHED, BALANCER_SUBGRAPH_URL, BALANCER_TOP_POOLS_FETCHED } from '../constants';

import { CacheValue, PoolsCache } from './pools_cache';

// tslint:disable:custom-no-magic-numbers
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
// tslint:enable:custom-no-magic-numbers

interface BalancerPoolResponse {
    id: string;
    swapFee: string;
    tokens: Array<{ address: string; decimals: number; balance: string }>;
    tokensList: string[];
    totalWeight: string;
}
export class BalancerPoolsCache extends PoolsCache {
    constructor(
        _cache: { [key: string]: CacheValue } = {},
        maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
        private readonly topPoolsFetched: number = BALANCER_TOP_POOLS_FETCHED,
        private readonly subgraphUrl: string = BALANCER_SUBGRAPH_URL,
    ) {
        super(_cache, maxPoolsFetched);
        void this._loadTopPoolsAsync();
        // Reload the top pools every 12 hours
        setInterval(async () => void this._loadTopPoolsAsync(), ONE_DAY_MS / 2);
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

    protected async _loadTopPoolsAsync(): Promise<void> {
        const fromToPools: {
            [from: string]: { [to: string]: Pool[] };
        } = {};

        const pools = await this._fetchTopPoolsAsync();
        pools.forEach(pool => {
            const { tokensList } = pool;
            for (const from of tokensList) {
                for (const to of tokensList.filter(t => t.toLowerCase() !== from.toLowerCase())) {
                    if (!fromToPools[from]) {
                        fromToPools[from] = {};
                    }
                    if (!fromToPools[from][to]) {
                        fromToPools[from][to] = [];
                    }
                    try {
                        // The list of pools must be relevant to `from` and `to`  for `parsePoolData`
                        const poolData = parsePoolData([pool], from, to);
                        fromToPools[from][to].push(poolData[0]);
                        // Cache this as we progress through
                        this._cachePoolsForPair(from, to, fromToPools[from][to]);
                    } catch {
                        // soldier on
                    }
                }
            }
        });
    }

    protected async _fetchTopPoolsAsync(): Promise<BalancerPoolResponse[]> {
        const query = `
      query {
          pools (first: ${
              this.topPoolsFetched
          }, where: {publicSwap: true, liquidity_gt: 0}, orderBy: swapsCount, orderDirection: desc) {
            id
            publicSwap
            swapFee
            totalWeight
            tokensList
            tokens {
              id
              address
              balance
              decimals
              symbol
              denormWeight
            }
          }
        }
    `;
        try {
            const response = await fetch(this.subgraphUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                }),
            });

            const { data } = await response.json();
            return data.pools;
        } catch (err) {
            return [];
        }
    }
}
