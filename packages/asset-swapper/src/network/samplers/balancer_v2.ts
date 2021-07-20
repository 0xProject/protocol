import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
import { Pool } from '@balancer-labs/sor/dist/types';
import { gql, request } from 'graphql-request';

import { DEFAULT_WARNING_LOGGER } from '../../constants';
import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, Bytes, ERC20BridgeSource, FillData } from '../types';
import { valueByChainId } from '../utils';

import { parsePoolData } from './utils/balancer_sor_v2';
import { CacheValue, PoolsCache } from './utils/pools_cache';

/**
 * Configuration info for a Balancer V2 pool.
 */
interface BalancerV2PoolInfo {
    poolId: Bytes;
    vault: Address;
}

export interface BalancerV2FillData extends FillData, BalancerV2PoolInfo {}

const BALANCER_V2_CONFIG_BY_CHAIN = valueByChainId(
    {
        [ChainId.Mainnet]: {
            vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
        },
        [ChainId.Polygon]: {
            vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
        },
    },
    {
        vault: NULL_ADDRESS,
        subgraphUrl: '',
    },
);

const BALANCER_TOP_POOLS_FETCHED = 250;
const BALANCER_MAX_POOLS_FETCHED = 3;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface BalancerV2PoolResponse {
    id: string;
    swapFee: string;
    tokens: Array<{ address: string; decimals: number; balance: string; weight: string; symbol: string }>;
    tokensList: string[];
    totalWeight: string;
    totalShares: string;
    amp: string | null;
}

export class BalancerV2PoolsCache extends PoolsCache {
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

    constructor(
        private readonly subgraphUrl: string,
        private readonly maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
        private readonly _topPoolsFetched: number = BALANCER_TOP_POOLS_FETCHED,
        private readonly _warningLogger: typeof DEFAULT_WARNING_LOGGER = DEFAULT_WARNING_LOGGER,
        cache: { [key: string]: CacheValue } = {},
    ) {
        super(cache);
        void this._loadTopPoolsAsync();
        // Reload the top pools every 12 hours
        setInterval(async () => void this._loadTopPoolsAsync(), ONE_DAY_MS / 2);
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

    protected async _fetchTopPoolsAsync(): Promise<BalancerV2PoolResponse[]> {
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

        const { pools } = await request<{ pools: BalancerV2PoolResponse[] }>(this.subgraphUrl, query, {
            topPoolsFetched: this._topPoolsFetched,
        });

        return pools;
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

const GAS_PER_SAMPLE = 500e3;

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromBalancerV2'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromBalancerV2'];
type SamplerSellEthCall = SamplerEthCall<BalancerV2FillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<BalancerV2FillData, BuyContractBuyFunction>;

export class BalancerV2Sampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    BalancerV2FillData
> {
    public static async createAsync(chain: Chain): Promise<BalancerV2Sampler> {
        const config = BALANCER_V2_CONFIG_BY_CHAIN[chain.chainId];
        if (!config.subgraphUrl) {
            throw new Error(`No BalancerV2 subgraph for chain ${chain.chainId}`);
        }
        return new BalancerV2Sampler(chain, new BalancerV2PoolsCache(config.subgraphUrl), config.vault);
    }

    protected constructor(chain: Chain, private readonly _cache: PoolsCache, private readonly _vaultAddress: Address) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromBalancerV2',
            buyContractBuyFunctionName: 'sampleBuysFromBalancerV2',
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
        return pools.map(poolId => ({
            args: [{ poolId, vault: this._vaultAddress }, takerToken, makerToken, takerFillAmounts],
            getDexSamplesFromResult: samples =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.BalancerV2,
                    fillData: { poolId, vault: this._vaultAddress },
                    input: a,
                    output: samples[i],
                })),
            gas: GAS_PER_SAMPLE * takerFillAmounts.length,
        }));
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const pools = this._cache.getCachedPoolAddressesForPair(takerToken, makerToken) || [];
        return pools.map(poolId => ({
            args: [{ poolId, vault: this._vaultAddress }, takerToken, makerToken, makerFillAmounts],
            getDexSamplesFromResult: samples =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.BalancerV2,
                    fillData: { poolId, vault: this._vaultAddress },
                    input: a,
                    output: samples[i],
                })),
            gas: GAS_PER_SAMPLE * makerFillAmounts.length,
        }));
    }
}
