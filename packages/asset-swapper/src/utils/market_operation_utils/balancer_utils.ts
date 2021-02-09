import { getPoolsWithTokens, parsePoolData } from '@balancer-labs/sor';
import { Pool } from '@balancer-labs/sor/dist/types';

import { BALANCER_MAX_POOLS_FETCHED, BALANCER_SUBGRAPH_URL, BALANCER_TOP_POOLS_FETCHED } from './constants';

// tslint:disable:boolean-naming

interface CacheValue {
    timestamp: number;
    pools: Pool[];
}

// tslint:disable:custom-no-magic-numbers
const FIVE_SECONDS_MS = 5 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 1000;
// tslint:enable:custom-no-magic-numbers

interface BalancerPoolResponse {
    id: string;
    swapFee: string;
    tokens: Array<{ address: string; decimals: number; balance: string }>;
    tokensList: string[];
    totalWeight: string;
}

export class BalancerPoolsCache {
    constructor(
        private readonly _cache: { [key: string]: CacheValue } = {},
        private readonly maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
        private readonly subgraphUrl: string = BALANCER_SUBGRAPH_URL,
        private readonly topPoolsFetched: number = BALANCER_TOP_POOLS_FETCHED,
    ) {
        void this._loadTopPoolsAsync();
        // Reload the top pools every 12 hours
        setInterval(async () => void this._loadTopPoolsAsync(), ONE_DAY_MS / 2);
    }

    public async getPoolsForPairAsync(
        takerToken: string,
        makerToken: string,
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<Pool[]> {
        const timeout = new Promise<Pool[]>(resolve => setTimeout(resolve, timeoutMs, []));
        return Promise.race([this._getPoolsForPairAsync(takerToken, makerToken), timeout]);
    }

    public getCachedPoolAddressesForPair(
        takerToken: string,
        makerToken: string,
        cacheExpiryMs?: number,
    ): string[] | undefined {
        const key = JSON.stringify([takerToken, makerToken]);
        const value = this._cache[key];
        if (cacheExpiryMs === undefined) {
            return value === undefined ? [] : value.pools.map(pool => pool.id);
        }
        const minTimestamp = Date.now() - cacheExpiryMs;
        if (value === undefined || value.timestamp < minTimestamp) {
            return undefined;
        } else {
            return value.pools.map(pool => pool.id);
        }
    }

    public howToSampleBalancer(
        takerToken: string,
        makerToken: string,
        isAllowedSource: boolean,
    ): { onChain: boolean; offChain: boolean } {
        // If Balancer is excluded as a source, do not sample.
        if (!isAllowedSource) {
            return { onChain: false, offChain: false };
        }
        const cachedBalancerPools = this.getCachedPoolAddressesForPair(takerToken, makerToken, ONE_DAY_MS);
        // Sample Balancer on-chain (i.e. via the ERC20BridgeSampler contract) if:
        // - Cached values are not stale
        // - There is at least one Balancer pool for this pair
        const onChain = cachedBalancerPools !== undefined && cachedBalancerPools.length > 0;
        // Sample Balancer off-chain (i.e. via GraphQL query + `computeBalancerBuy/SellQuote`)
        // if cached values are stale
        const offChain = cachedBalancerPools === undefined;
        return { onChain, offChain };
    }

    protected async _getPoolsForPairAsync(
        takerToken: string,
        makerToken: string,
        cacheExpiryMs: number = FIVE_SECONDS_MS,
    ): Promise<Pool[]> {
        const key = JSON.stringify([takerToken, makerToken]);
        const value = this._cache[key];
        const minTimestamp = Date.now() - cacheExpiryMs;
        if (value === undefined || value.timestamp < minTimestamp) {
            const pools = await this._fetchPoolsForPairAsync(takerToken, makerToken);
            this._cachePoolsForPair(takerToken, makerToken, pools);
        }
        return this._cache[key].pools;
    }

    protected _cachePoolsForPair(takerToken: string, makerToken: string, pools: Pool[]): void {
        const key = JSON.stringify([takerToken, makerToken]);
        this._cache[key] = {
            pools,
            timestamp: Date.now(),
        };
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
