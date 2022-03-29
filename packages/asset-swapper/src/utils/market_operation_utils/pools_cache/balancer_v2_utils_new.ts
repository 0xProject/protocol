import { ChainId } from '@0x/contract-addresses';

import { DEFAULT_WARNING_LOGGER } from '../../../constants';
import { LogFunction } from '../../../types';
import {
    BALANCER_MAX_POOLS_FETCHED,
    BALANCER_TOP_POOLS_FETCHED,
    BALANCER_V2_SUBGRAPH_URL_BY_CHAIN,
} from '../constants';
import { BalancerSwapInfo, BalancerBatchSwapStep } from '../types';

import { CacheValue, SwapInfoCache } from './pair_swaps_cache';
import { SubgraphPoolDataService } from './sgPoolDataService';
import {
    BalancerSDK,
    BalancerSdkConfig,
    Network,
    SwapTypes,
    RouteProposer,
    NewPath,
    parseToPoolsDict,
    PoolDictionary,
    formatSequence,
    getTokenAddressesForSwap,
} from '@balancer-labs/sdk';

// tslint:disable-next-line:custom-no-magic-numbers
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface BalancerPoolResponse {
    poolType: string;
    id: string;
    tokens: Array<{ address: string; }>;
    tokensList: string[];
}

export class BalancerV2SwapInfoCache extends SwapInfoCache {
    routeProposer: RouteProposer;
    poolDataService: SubgraphPoolDataService;

    constructor(
        chainId: ChainId,
        private readonly subgraphUrl: string = BALANCER_V2_SUBGRAPH_URL_BY_CHAIN[chainId],
        private readonly maxPoolsFetched: number = BALANCER_MAX_POOLS_FETCHED,
        private readonly _topPoolsFetched: number = BALANCER_TOP_POOLS_FETCHED,
        private readonly _warningLogger: LogFunction = DEFAULT_WARNING_LOGGER,
        cache: { [key: string]: CacheValue } = {},
    ) {
        super(cache);
        const config: BalancerSdkConfig = {
            network: Network[ChainId[chainId]],
            rpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA}`,
        };
        const balancerSdk = new BalancerSDK(config);
        // The RouteProposer finds paths between a token pair using direct/multihop/linearPool routes
        this.routeProposer = balancerSdk.sor.routeProposer;
        // Uses Subgraph to retrieve up to date pool data required for routeProposer
        this.poolDataService = new SubgraphPoolDataService({
            chainId: chainId,
            subgraphUrl: this.subgraphUrl,
        });
        void this._loadTopPoolsAsync();
        // Reload the top pools every 12 hours
        setInterval(async () => void this._loadTopPoolsAsync(), ONE_DAY_MS / 2);
    }

    /**
     * Given an array of Balancer paths, returns an array of swap information that can be passed to queryBatchSwap.
     * @param {NewPath[]} paths Array of Balancer paths.
     * @returns {BalancerSwapInfo[]} Array of formatted swap data consisting of assets and swap steps.
     */
    private formatSwaps(paths: NewPath[]): BalancerSwapInfo[] {
        const formattedSwaps: BalancerSwapInfo[] = [];
        let assets: string[];
        let swapSteps: BalancerBatchSwapStep[];
        paths.forEach((path) => {
            // Add a swap amount for each swap so we can use formatSequence. (This will be overwritten with actual amount during query)
            path.swaps.forEach((s) => (s.swapAmount = '0'));
            const tokenAddresses = getTokenAddressesForSwap(path.swaps);
            const formatted = formatSequence(
                SwapTypes.SwapExactIn,
                path.swaps,
                tokenAddresses
            );
            assets = tokenAddresses;
            swapSteps = formatted;
            formattedSwaps.push({
                assets,
                swapSteps,
            });
        });
        return formattedSwaps;
    }

    /**
     * Uses pool data from provided dictionary to find top swap paths for token pair.
     * @param {PoolDictionary} pools Dictionary of pool data.
     * @param {string} takerToken Address of taker token.
     * @param {string} makerToken Address of maker token.
     * @returns {BalancerSwapInfo[]} Array of swap data for pair consisting of assets and swap steps.
     */
    private _getPoolPairSwapInfo(
        pools: PoolDictionary,
        takerToken: string,
        makerToken: string
    ): BalancerSwapInfo[] {
        /*
        Uses Balancer SDK to construct available paths for pair.
        Paths can be direct, i.e. both tokens are in same pool or multihop.
        Will also create paths for the new Balancer Linear pools.
        These are returned in order of available liquidity which is useful for filtering.
        */
        const maxPools = 4;
        const paths = this.routeProposer.getCandidatePathsFromDict(
            takerToken,
            makerToken,
            SwapTypes.SwapExactIn,
            pools,
            maxPools
        );

        if (paths.length == 0) return [];

        // Convert paths data to swap information suitable for queryBatchSwap. Only use top 3 liquid paths
        return this.formatSwaps(paths.slice(0, 3));
    }

    protected async _loadTopPoolsAsync(): Promise<void> {
        const fromToSwapInfo: {
            [from: string]: { [to: string]: BalancerSwapInfo[] };
        } = {};

        // Retrieve pool data from Subgraph
        const pools = await this.poolDataService.getPools();
        // timestamp is used for Element pools
        const timestamp = Math.floor(Date.now() / 1000);
        const poolsDict = parseToPoolsDict(pools, timestamp);

        for (const pool of pools) {
            const { tokensList } = pool;
            for (const from of tokensList) {
                for (const to of tokensList.filter(t => t.toLowerCase() !== from.toLowerCase())) {
                    fromToSwapInfo[from] = fromToSwapInfo[from] || {};
                    // If a record for pair already exists skip as all paths alreay found 
                    if (fromToSwapInfo[from][to]) continue;
                    else{
                        try {
                            const expiresAt = Date.now() + this._cacheTimeMs;
                            // Retrieve swap steps and assets for a token pair
                            // This only needs to be called once per pair as all paths will be created from single call
                            const pairSwapInfo = this._getPoolPairSwapInfo(
                                poolsDict,
                                from,
                                to
                            );
                            fromToSwapInfo[from][to] = pairSwapInfo;
                            this._cacheSwapInfoForPair(
                                from,
                                to,
                                fromToSwapInfo[from][to],
                                expiresAt
                            );
                        } catch (err) {
                            this._warningLogger(err, `Failed to load Balancer V2 top pools`);
                            // soldier on
                        }
                    }
                }
            }
        }
    }

    /**
     * Will retrieve fresh pair and path data from Subgraph and return and array of swap info for pair..
     * @param {string} takerToken Address of takerToken.
     * @param {string} makerToken Address of makerToken.
     * @returns {BalancerSwapInfo[]} Array of swap data for pair consisting of assets and swap steps.
    */
    protected async _fetchSwapInfoForPairAsync(
        takerToken: string,
        makerToken: string
    ): Promise<BalancerSwapInfo[]> {
        try {
            // retrieve up to date pools from SG
            const pools = await this.poolDataService.getPools();

            // timestamp is used for Element pools
            const timestamp = Math.floor(Date.now() / 1000);
            const poolDictionary = parseToPoolsDict(pools, timestamp);
            return this._getPoolPairSwapInfo(
                poolDictionary,
                takerToken,
                makerToken
            );
        } catch (e) {
            return [];
        }
    }
}
