import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
import {
    formatSequence,
    getTokenAddressesForSwap,
    NewPath,
    parseToPoolsDict,
    PoolDictionary,
    RouteProposer,
    SwapTypes,
    SorConfig,
    TokenPriceService,
    SOR,
} from '@balancer-labs/sor';
import { JsonRpcProvider } from '@ethersproject/providers';

import { DEFAULT_WARNING_LOGGER } from '../../../constants';
import { LogFunction } from '../../../types';
import { BALANCER_V2_SUBGRAPH_URL_BY_CHAIN, ONE_SECOND_MS } from '../constants';
import { BalancerSwapInfo, BalancerSwaps } from '../types';

import { CacheValue, EMPTY_BALANCER_SWAPS, SwapInfoCache } from './pair_swaps_cache';
import { SubgraphPoolDataService } from './sgPoolDataService';

const ONE_DAY_MS = 24 * 60 * 60 * ONE_SECOND_MS;

type BalancerChains =
    | ChainId.Mainnet
    | ChainId.Goerli
    | ChainId.Polygon
    | ChainId.Fantom
    | ChainId.Optimism
    | ChainId.Arbitrum;

const SOR_CONFIG: Record<BalancerChains, SorConfig & { poolsToIgnore?: string[] }> = {
    [ChainId.Mainnet]: {
        chainId: ChainId.Mainnet,
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        wETHwstETH: {
            id: '0x32296969ef14eb0c6d29669c550d4a0449130230000200000000000000000080',
            address: '0x32296969ef14eb0c6d29669c550d4a0449130230',
        },
        connectingTokens: [
            {
                symbol: 'wEth',
                address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            },
            {
                symbol: 'wstEth',
                address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
            },
            {
                symbol: 'DOLA',
                address: '0x865377367054516e17014ccded1e7d814edc9ce4',
            },
        ],
        poolsToIgnore: [
            '0xbd482ffb3e6e50dc1c437557c3bea2b68f3683ee', // a pool made by an external dev who was playing with a novel rate provider mechanism in production.
        ],
        lbpRaisingTokens: [
            '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
        ],
    },
    [ChainId.Polygon]: {
        chainId: ChainId.Polygon,
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        weth: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
        connectingTokens: [
            {
                symbol: 'weth',
                address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
            },
            {
                symbol: 'bbrz2',
                address: '0xe22483774bd8611be2ad2f4194078dac9159f4ba',
            }, // Joins Stables<>BRZ via https://app.balancer.fi/#/polygon/pool/0x4a0b73f0d13ff6d43e304a174697e3d5cfd310a400020000000000000000091c
        ],
        poolsToIgnore: [
            '0x600bd01b6526611079e12e1ff93aba7a3e34226f', // This pool has rateProviders with incorrect scaling
        ],
        lbpRaisingTokens: [
            '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
            '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
            '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
        ],
    },
    [ChainId.Arbitrum]: {
        chainId: ChainId.Arbitrum,
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        weth: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
        connectingTokens: [
            {
                symbol: 'weth',
                address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
            },
        ],
        lbpRaisingTokens: [
            '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
            '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', // USDC
            '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
        ],
    },
    [ChainId.Goerli]: {
        chainId: ChainId.Goerli,
        vault: '0x65748e8287ce4b9e6d83ee853431958851550311',
        weth: '0x9a1000d492d40bfccbc03f413a48f5b6516ec0fd',
        connectingTokens: [
            {
                symbol: 'weth',
                address: '0xdfcea9088c8a88a76ff74892c1457c17dfeef9c1',
            },
        ],
    },
    [ChainId.Optimism]: {
        chainId: ChainId.Optimism,
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        weth: '0x4200000000000000000000000000000000000006',
        connectingTokens: [
            {
                symbol: 'weth',
                address: '0x4200000000000000000000000000000000000006',
            },
        ],
        lbpRaisingTokens: [
            '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', // DAI
            '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC
            '0x4200000000000000000000000000000000000006', // WETH
        ],
    },
    [ChainId.Fantom]: {
        chainId: ChainId.Fantom,
        vault: '0x20dd72ed959b6147912c2e529f0a0c651c33c9ce',
        weth: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
        connectingTokens: [
            {
                symbol: 'weth',
                address: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
            },
        ],
    },
};

class MockTokenPriceService implements TokenPriceService {
    public async getNativeAssetPriceInToken(): Promise<string> {
        return '';
    }
}

export class BalancerV2SwapInfoCache extends SwapInfoCache {
    private static readonly _MAX_POOLS_PER_PATH = 4;
    // TODO: Balancer V2 Multiplexing results in an increased revert rate
    // re-enable multiplexing and set _MAX_CANDIDATE_PATHS_PER_PAIR to 2
    // when resolved.
    private static readonly _MAX_CANDIDATE_PATHS_PER_PAIR = 1;
    private readonly _routeProposer: RouteProposer;
    private readonly _poolDataService: SubgraphPoolDataService;

    constructor(
        chainId: ChainId,
        subgraphUrl: string | null = BALANCER_V2_SUBGRAPH_URL_BY_CHAIN[chainId],
        private readonly _warningLogger: LogFunction = DEFAULT_WARNING_LOGGER,
        cache: { [key: string]: CacheValue } = {},
    ) {
        super(cache);
        const provider = new JsonRpcProvider('');
        this._poolDataService = new SubgraphPoolDataService({
            chainId,
            subgraphUrl,
            poolsToIgnore: SOR_CONFIG[chainId as BalancerChains].poolsToIgnore,
        });
        const sor = new SOR(
            provider,
            SOR_CONFIG[chainId as BalancerChains],
            this._poolDataService,
            new MockTokenPriceService(),
        );

        // The RouteProposer finds paths between a token pair using direct/multihop/linearPool routes
        this._routeProposer = sor.routeProposer;
        // Uses Subgraph to retrieve up to date pool data required for routeProposer

        void this._loadTopPoolsAsync();
        // Reload the top pools every 12 hours
        setInterval(async () => void this._loadTopPoolsAsync(), ONE_DAY_MS / 2);
    }

    protected async _loadTopPoolsAsync(): Promise<void> {
        const fromToSwapInfo: {
            [from: string]: { [to: string]: BalancerSwaps };
        } = {};

        // Retrieve pool data from Subgraph
        const pools = await this._poolDataService.getPools();
        // timestamp is used for Element pools
        const timestamp = Math.floor(Date.now() / ONE_SECOND_MS);
        const poolsDict = parseToPoolsDict(pools, timestamp);

        for (const pool of pools) {
            const { tokensList } = pool;
            await null; // This loop can be CPU heavy so yield to event loop.
            for (const from of tokensList) {
                for (const to of tokensList.filter((t) => t.toLowerCase() !== from.toLowerCase())) {
                    fromToSwapInfo[from] = fromToSwapInfo[from] || {};
                    // If a record for pair already exists skip as all paths alreay found
                    if (fromToSwapInfo[from][to]) {
                        continue;
                    } else {
                        try {
                            const expiresAt = Date.now() + this._cacheTimeMs;
                            // Retrieve swap steps and assets for a token pair
                            // This only needs to be called once per pair as all paths will be created from single call
                            const pairSwapInfo = this._getPoolPairSwapInfo(poolsDict, from, to);
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
     * Will retrieve fresh pair and path data from Subgraph and return and array of swap info for pair..
     * @param takerToken Address of takerToken.
     * @param makerToken Address of makerToken.
     * @returns Swap data for pair consisting of assets and swap steps for ExactIn and ExactOut swap types.
     */
    protected async _fetchSwapInfoForPairAsync(takerToken: string, makerToken: string): Promise<BalancerSwaps> {
        try {
            // retrieve up to date pools from SG
            const pools = await this._poolDataService.getPools();

            // timestamp is used for Element pools
            const timestamp = Math.floor(Date.now() / ONE_SECOND_MS);
            const poolDictionary = parseToPoolsDict(pools, timestamp);
            return this._getPoolPairSwapInfo(poolDictionary, takerToken, makerToken);
        } catch (e) {
            return EMPTY_BALANCER_SWAPS;
        }
    }

    /**
     * Uses pool data from provided dictionary to find top swap paths for token pair.
     * @param pools Dictionary of pool data.
     * @param takerToken Address of taker token.
     * @param makerToken Address of maker token.
     * @returns Swap data for pair consisting of assets and swap steps for ExactIn and ExactOut swap types.
     */
    private _getPoolPairSwapInfo(pools: PoolDictionary, takerToken: string, makerToken: string): BalancerSwaps {
        /*
        Uses Balancer SDK to construct available paths for pair.
        Paths can be direct, i.e. both tokens are in same pool or multihop.
        Will also create paths for the new Balancer Linear pools.
        These are returned in order of available liquidity which is useful for filtering.
        */
        const paths = this._routeProposer.getCandidatePathsFromDict(
            takerToken,
            makerToken,
            SwapTypes.SwapExactIn,
            pools,
            BalancerV2SwapInfoCache._MAX_POOLS_PER_PATH,
        );

        if (paths.length === 0) {
            return EMPTY_BALANCER_SWAPS;
        }

        // Convert paths data to swap information suitable for queryBatchSwap. Only use top 2 liquid paths
        return formatSwaps(paths.slice(0, BalancerV2SwapInfoCache._MAX_CANDIDATE_PATHS_PER_PAIR));
    }
}

/**
 * Given an array of Balancer paths, returns swap information that can be passed to queryBatchSwap.
 * @param paths Array of Balancer paths.
 * @returns Formatted swap data consisting of assets and swap steps for ExactIn and ExactOut swap types.
 */
function formatSwaps(paths: NewPath[]): BalancerSwaps {
    const formattedSwapsExactIn: BalancerSwapInfo[] = [];
    const formattedSwapsExactOut: BalancerSwapInfo[] = [];
    let assets: string[];
    paths.forEach((path) => {
        // Add a swap amount for each swap so we can use formatSequence. (This will be overwritten with actual amount during query)
        path.swaps.forEach((s) => (s.swapAmount = '0'));
        const tokenAddresses = getTokenAddressesForSwap(path.swaps);
        // Formats for both ExactIn and ExactOut swap types
        const swapsExactIn = formatSequence(SwapTypes.SwapExactIn, path.swaps, tokenAddresses);
        const swapsExactOut = formatSequence(SwapTypes.SwapExactOut, path.swaps, tokenAddresses);
        assets = tokenAddresses;
        formattedSwapsExactIn.push({
            assets,
            swapSteps: swapsExactIn.map((s) => ({
                ...s,
                amount: new BigNumber(s.amount),
            })),
        });
        formattedSwapsExactOut.push({
            assets,
            swapSteps: swapsExactOut.map((s) => ({
                ...s,
                amount: new BigNumber(s.amount),
            })),
        });
    });
    const formattedSwaps: BalancerSwaps = {
        swapInfoExactIn: formattedSwapsExactIn,
        swapInfoExactOut: formattedSwapsExactOut,
    };
    return formattedSwaps;
}
