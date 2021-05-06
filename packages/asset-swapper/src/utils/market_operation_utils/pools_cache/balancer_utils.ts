import { getPoolsWithTokens, parsePoolData } from '@balancer-labs/sor';
import { Pool } from '@balancer-labs/sor/dist/types';
import { gql, request } from 'graphql-request';

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
        private readonly _subgraphUrl: string = BALANCER_SUBGRAPH_URL,
        cache: { [key: string]: CacheValue } = {},
        private readonly maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
        private readonly _topPoolsFetched: number = BALANCER_TOP_POOLS_FETCHED,
    ) {
        super(cache);
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
        for (const pool of pools) {
            const { tokensList } = pool;
            for (const from of tokensList) {
                for (const to of tokensList.filter(t => t.toLowerCase() !== from.toLowerCase())) {
                    fromToPools[from] = fromToPools[from] || {};
                    fromToPools[from][to] = fromToPools[from][to] || [];

                    try {
                        // The list of pools must be relevant to `from` and `to`  for `parsePoolData`
                        const poolData = parsePoolData([pool], from, to);
                        fromToPools[from][to].push(poolData[0]);
                        // Cache this as we progress through
                        const expiresAt = Date.now() + this._cacheTimeMs;
                        this._cachePoolsForPair(from, to, fromToPools[from][to], expiresAt);
                    } catch {
                        // soldier on
                    }
                }
            }
        }
    }

    protected async _fetchTopPoolsAsync(): Promise<BalancerPoolResponse[]> {
        const query = gql`
            query fetchTopPools($topPoolsFetched: Int!) {
                pools(
                    first: $topPoolsFetched
                    where: { publicSwap: true, liquidity_gt: 0 }
                    orderBy: swapsCount
                    orderDirection: desc
                ) {
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
            const { pools } = await request(this._subgraphUrl, query, { topPoolsFetched: this._topPoolsFetched });
            return pools;
        } catch (err) {
            return [];
        }
    }
}
