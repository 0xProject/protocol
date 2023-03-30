import { GetPoolCacheOfPairsInput, GetPoolCacheOfPairsOutput } from 'pool-cache-interface';
import { PoolFetcher } from './types';
import { PoolFetcher as OnChainPoolFetcher, PoolFetcher__factory as OnChainPoolFetcher__factory } from '../typechain';
import { toUniswapV3PoolCache } from './normalizer';
import { Map } from 'immutable';
import { deployedBytecode } from '../artifacts';
import { StateOverrideJsonRpcProvider } from '../ethers/provider';
import { getTimestampInSeconds } from '../utils/time';

const POOL_FETCHER_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000042';

export class EthCallPoolFetcher implements PoolFetcher {
    chainIdToOnChainPoolFetcher: Map<number, OnChainPoolFetcher>;

    constructor(chanIdToUrl: Map<number, string>) {
        this.chainIdToOnChainPoolFetcher = chanIdToUrl.mapEntries(([chainId, url]) => {
            const provider = new StateOverrideJsonRpcProvider(url);
            provider.setStateOverride({
                [POOL_FETCHER_CONTRACT_ADDRESS]: {
                    code: deployedBytecode.PoolFetcher,
                },
            });
            const onChainPoolFetcher = OnChainPoolFetcher__factory.connect(POOL_FETCHER_CONTRACT_ADDRESS, provider);

            return [chainId, onChainPoolFetcher];
        });
    }

    async get(input: GetPoolCacheOfPairsInput): Promise<GetPoolCacheOfPairsOutput> {
        const onChainPoolFetcher = this.chainIdToOnChainPoolFetcher.get(input.chainId);

        if (onChainPoolFetcher === undefined) {
            throw new Error(`Unsupported chain ${input.chainId}`);
        }

        const timestamp = getTimestampInSeconds();
        const uniswapPoolStructs = await onChainPoolFetcher.batchFetch(input.uniswapV3Pairs);
        return {
            uniswapV3Cache: toUniswapV3PoolCache(uniswapPoolStructs).map((cache) => ({ ...cache, timestamp })),
        };
    }
}
