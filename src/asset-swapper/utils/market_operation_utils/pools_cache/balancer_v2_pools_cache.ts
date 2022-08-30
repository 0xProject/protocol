import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
// import { parsePoolData } from '@balancer-labs'; // TODO - upgrade to v2
import { Pool } from 'balancer-labs-sor-v1/dist/types';
import { gql, request } from 'graphql-request';

import { DEFAULT_WARNING_LOGGER } from '../../../constants';
import { LogFunction } from '../../../types';
import { BALANCER_MAX_POOLS_FETCHED, BALANCER_TOP_POOLS_FETCHED } from '../constants';

import { parsePoolData } from './balancer_sor_v2';
import { NoOpPoolsCache } from './no_op_pools_cache';
import { AbstractPoolsCache, CacheValue, PoolsCache } from './pools_cache';

const BEETHOVEN_X_SUBGRAPH_URL_BY_CHAIN = new Map<ChainId, string>([
    [ChainId.Fantom, 'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx'],
]);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface BalancerPoolResponse {
    id: string;
    swapFee: string;
    tokens: { address: string; decimals: number; balance: string; weight: string; symbol: string }[];
    tokensList: string[];
    totalWeight: string;
    totalShares: string;
    amp: string | null;
}

export class BalancerV2PoolsCache extends AbstractPoolsCache {
    public static createBeethovenXPoolCache(chainId: ChainId): PoolsCache {
        const subgraphUrl = BEETHOVEN_X_SUBGRAPH_URL_BY_CHAIN.get(chainId);
        if (subgraphUrl === undefined) {
            return new NoOpPoolsCache();
        }

        return new BalancerV2PoolsCache(subgraphUrl);
    }

    private static _parseSubgraphPoolData(pool: any, takerToken: string, makerToken: string): Pool {
        const tToken = pool.tokens.find((t: any) => t.address === takerToken);
        const mToken = pool.tokens.find((t: any) => t.address === makerToken);
        const swap = pool.swaps && pool.swaps[0];
        const tokenAmountOut = swap ? swap.tokenAmountOut : undefined;
        const tokenAmountIn = swap ? swap.tokenAmountIn : undefined;
        const spotPrice =
            tokenAmountOut && tokenAmountIn ? new BigNumber(tokenAmountOut).div(tokenAmountIn) : undefined; // TODO: xianny check

        return {
            id: pool.id,
            balanceIn: new BigNumber(tToken.balance),
            balanceOut: new BigNumber(mToken.balance),
            weightIn: new BigNumber(tToken.weight),
            weightOut: new BigNumber(mToken.weight),
            swapFee: new BigNumber(pool.swapFee),
            spotPrice,
        };
    }

    private constructor(
        private readonly subgraphUrl: string,
        private readonly maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
        private readonly _topPoolsFetched: number = BALANCER_TOP_POOLS_FETCHED,
        private readonly _warningLogger: LogFunction = DEFAULT_WARNING_LOGGER,
        cache: Map<string, CacheValue> = new Map(),
    ) {
        super(cache);
        void this._loadTopPoolsAsync();
        // Reload the top pools every 12 hours
        setInterval(async () => void this._loadTopPoolsAsync(), ONE_DAY_MS / 2);
    }

    protected async _fetchTopPoolsAsync(): Promise<BalancerPoolResponse[]> {
        const query = gql`
            query fetchTopPools($topPoolsFetched: Int!) {
                pools(
                    first: $topPoolsFetched
                    where: { totalLiquidity_gt: 0 }
                    orderBy: swapsCount
                    orderDirection: desc
                ) {
                    id
                    swapFee
                    totalWeight
                    tokensList
                    amp
                    totalShares
                    tokens {
                        id
                        address
                        balance
                        decimals
                        symbol
                        weight
                    }
                }
            }
        `;

        const { pools } = await request<{ pools: BalancerPoolResponse[] }>(this.subgraphUrl, query, {
            topPoolsFetched: this._topPoolsFetched,
        });

        return pools;
    }
    protected async _loadTopPoolsAsync(): Promise<void> {
        const fromToPools: {
            [from: string]: { [to: string]: Pool[] };
        } = {};

        let pools: BalancerPoolResponse[];
        try {
            pools = await this._fetchTopPoolsAsync();
        } catch (err) {
            this._warningLogger(err, 'Failed to fetch top pools for Balancer V2');
            return;
        }

        for (const pool of pools) {
            const { tokensList } = pool;
            for (const from of tokensList) {
                for (const to of tokensList.filter((t) => t.toLowerCase() !== from.toLowerCase())) {
                    fromToPools[from] = fromToPools[from] || {};
                    fromToPools[from][to] = fromToPools[from][to] || [];

                    try {
                        // The list of pools must be relevant to `from` and `to`  for `parsePoolData`
                        const [poolData] = parsePoolData({ [pool.id]: pool as any }, from, to);
                        fromToPools[from][to].push(
                            BalancerV2PoolsCache._parseSubgraphPoolData(poolData[pool.id], from, to),
                        );
                        // Cache this as we progress through
                        const expiresAt = Date.now() + this._cacheTimeMs;
                        this._cachePoolsForPair(from, to, fromToPools[from][to], expiresAt);
                    } catch (err) {
                        this._warningLogger(err, `Failed to load Balancer V2 top pools`);
                        // soldier on
                    }
                }
            }
        }
    }
    protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        const query = gql`
        query getPools {
            pools(
              first: ${this.maxPoolsFetched},
              where: {
                tokensList_contains: ["${takerToken}", "${makerToken}"]
              }
            ) {
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
        try {
            const { pools } = await request(this.subgraphUrl, query);
            return pools.map((pool: any) => BalancerV2PoolsCache._parseSubgraphPoolData(pool, takerToken, makerToken));
        } catch (e) {
            return [];
        }
    }
}
