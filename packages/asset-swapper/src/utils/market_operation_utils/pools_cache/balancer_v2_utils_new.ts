import { ChainId } from '@0x/contract-addresses';

import { DEFAULT_WARNING_LOGGER } from '../../../constants';
import { LogFunction } from '../../../types';
import {
    BALANCER_MAX_POOLS_FETCHED,
    BALANCER_TOP_POOLS_FETCHED,
    BALANCER_V2_SUBGRAPH_URL_BY_CHAIN,
} from '../constants';
import { BalancerSwapInfo } from '../types';

import { CacheValue, SwapInfoCache } from './pair_swaps_cache';
// TO DO - Some of these functions aren't exposed from SOR yet - update SOR/SDK to expose if we agree this is a useful approach
import { SwapOptions, PoolFilter, SwapTypes, SubgraphPoolDataService, RouteProposer, formatSwaps } from 'sorV2';

// tslint:disable-next-line:custom-no-magic-numbers
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface BalancerPoolResponse {
    poolType: string;
    id: string;
    tokens: Array<{ address: string; }>;
    tokensList: string[];
}

export class BalancerV2SwapInfoCache extends SwapInfoCache {
    // Options used when finding paths.
    swapOptions: SwapOptions = {
        gasPrice: parseFixed('50', 9),
        swapGas: BigNumber.from('35000'),
        poolTypeFilter: PoolFilter.All,
        maxPools: 4,
        timestamp: Math.floor(Date.now() / 1000),
        forceRefresh: false,
    };
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
        // SOR RouteProposer finds paths between a token pair using direct/multihop/linearPool routes (function will be exposed via SDK/SOR)
        this.routeProposer = new RouteProposer();
        // Uses Subgraph to retrieve up to date pool data (function will be exposed via SDK/SOR)
        this.poolDataService = new SubgraphPoolDataService(this.subgraphUrl);
        void this._loadTopPoolsAsync();
        // Reload the top pools every 12 hours
        setInterval(async () => void this._loadTopPoolsAsync(), ONE_DAY_MS / 2);
    }

    /**
     * Retrieves swap steps and assets for a token pair.
     * @param pool 
     * @param takerToken 
     * @param makerToken 
     * @returns 
    */
    private _getPoolPairSwapInfo(pools: BalancerPoolResponse[], takerToken: string, makerToken: string): BalancerSwapInfo[] {
        /*
        Uses Balancer SOR/SDK functions to construct available paths for pair.
        Paths can be direct, i.e. both tokens are in same pool or multihop.
        Will also create paths for the new Balancer Linear pools.
        */
        // TO DO - This is just pseudo code to demonstrate potential option. Will need to expose functions from SOR/SDK.
        // find available paths
        const paths = this.routeProposer.getCandidatePaths(
            takerToken,
            makerToken,
            SwapTypes.SwapExactIn,
            pools,
            this.swapOptions
        );

        // TO DO - Further filtering of these paths could be done using the already computed pathLimit which would determine if a path is valid for a specific trade amount.

        if (paths.length == 0) return [];

        // Helper function exposed from SDK/SOR that formats and returns swapSteps and assets
        return formatSwaps(paths);
    }

    protected async _loadTopPoolsAsync(): Promise<void> {
        const fromToSwapInfo: {
            [from: string]: { [to: string]: BalancerSwapInfo[] };
        } = {};

        const pools = this.poolDataService.fetchPools();

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
                            const pairSwapInfo = this._getPoolPairSwapInfo(pools, from, to);
                            fromToSwapInfo[from][to] = pairSwapInfo;
                            this._cacheSwapInfoForPair(from, to, fromToSwapInfo[from][to], expiresAt);
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
     * Finds swap info (swap steps and assets) for a token pair. 
     * @param takerToken 
     * @param makerToken 
     * @returns 
     */
    protected async _fetchSwapInfoForPairAsync(takerToken: string, makerToken: string): Promise<BalancerSwapInfo[]> {
        try {            
            // retrieve up to date pools from SG
            const pools = this.poolDataService.fetchPools();
            return this._getPoolPairSwapInfo(pools, takerToken, makerToken);
        } catch (e) {
            return [];
        }
    }
}
