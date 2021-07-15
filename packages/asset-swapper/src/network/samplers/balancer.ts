import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
import { getPoolsWithTokens, parsePoolData } from '@balancer-labs/sor';
import { Pool } from '@balancer-labs/sor/dist/types';
import { getPoolsWithTokens as getCreamPoolsWithTokens, parsePoolData as parseCreamPoolData } from 'cream-sor';
import { gql, request } from 'graphql-request';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, ERC20BridgeSource, FillData } from '../types';

import { CacheValue, PoolsCache } from './utils/pools_cache';

export interface BalancerFillData extends FillData {
    poolAddress: Address;
}

const BALANCER_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer';
const BALANCER_TOP_POOLS_FETCHED = 250;
const BALANCER_MAX_POOLS_FETCHED = 3;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface BalancerPoolResponse {
    id: string;
    swapFee: string;
    tokens: Array<{ address: Address; decimals: number; balance: string }>;
    tokensList: Address[];
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

    protected async _fetchPoolsForPairAsync(takerToken: Address, makerToken: Address): Promise<Pool[]> {
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

export class CreamPoolsCache extends PoolsCache {
    constructor(
        _cache: { [key: string]: CacheValue } = {},
        private readonly maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
    ) {
        super(_cache);
    }

    protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        try {
            const poolData = (await getCreamPoolsWithTokens(takerToken, makerToken)).pools;
            // Sort by maker token balance (descending)
            const pools = parseCreamPoolData(poolData, takerToken, makerToken).sort((a, b) =>
                b.balanceOut.minus(a.balanceOut).toNumber(),
            );
            return pools.slice(0, this.maxPoolsFetched);
        } catch (err) {
            return [];
        }
    }
}

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromBalancer'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromBalancer'];
type SamplerSellEthCall = SamplerEthCall<BalancerFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<BalancerFillData, BuyContractBuyFunction>;

export class BalancerSampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    BalancerFillData
> {
    public static async createAsync(chain: Chain, fork: ERC20BridgeSource): Promise<BalancerSampler> {
        if (chain.chainId !== ChainId.Mainnet) {
            throw new Error(`Balancer forks are only available on mainnet`);
        }
        let cache: PoolsCache;
        switch (fork) {
            case ERC20BridgeSource.Balancer:
                cache = new BalancerPoolsCache();
                break;
            case ERC20BridgeSource.Cream:
                cache = new CreamPoolsCache();
                break;
            default:
                throw new Error(`Invalid Balancer fork: ${fork}`);
        }
        return new BalancerSampler(chain, fork, cache);
    }

    protected constructor(chain: Chain, public readonly fork: ERC20BridgeSource, private readonly _cache: PoolsCache) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromBalancer',
            buyContractBuyFunctionName: 'sampleBuysFromBalancer',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        if (tokenAddressPath.length !== 2) {
            return false;
        }
        const [takerToken, makerToken] = tokenAddressPath;
        const pools = this._cache.getCachedPoolAddressesForPair(takerToken, makerToken) || [];
        return pools.length > 0;
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const pools = this._cache.getCachedPoolAddressesForPair(takerToken, makerToken) || [];
        return pools.map(poolAddress => ({
            args: [poolAddress, takerToken, makerToken, takerFillAmounts],
            getDexSamplesFromResult: samples =>
                takerFillAmounts.map((a, i) => ({
                    source: this.fork,
                    fillData: { poolAddress },
                    input: a,
                    output: samples[i],
                })),
        }));
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const pools = this._cache.getCachedPoolAddressesForPair(takerToken, makerToken) || [];
        return pools.map(poolAddress => ({
            args: [poolAddress, takerToken, makerToken, makerFillAmounts],
            getDexSamplesFromResult: samples =>
                makerFillAmounts.map((a, i) => ({
                    source: this.fork,
                    fillData: { poolAddress },
                    input: a,
                    output: samples[i],
                })),
        }));
    }
}
