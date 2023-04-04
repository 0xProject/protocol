import { GetPoolCacheOfPairsOutput, UniswapV3Pool } from 'pool-cache-interface';
import { CacheClient } from '../../cache/types';
import { PoolCacheService } from '../../services/pool-cache-service';
import { getTimestampInSeconds } from '../../utils/time';

const POOL_A_B_500: UniswapV3Pool = {
    fee: 500,
    poolAddress: 'a-b-500',
    score: 100,
};

const POOL_A_B_3000: UniswapV3Pool = {
    fee: 3000,
    poolAddress: 'a-b-3000',
    score: 50,
};

const POOL_C_D_100: UniswapV3Pool = {
    fee: 100,
    poolAddress: 'c-d-100',
    score: 100,
};

const POOL_C_D_500: UniswapV3Pool = {
    fee: 500,
    poolAddress: 'c-d-500',
    score: 42,
};

function createMockCacheClient(output: GetPoolCacheOfPairsOutput): jest.Mocked<CacheClient> {
    return {
        set: jest.fn().mockReturnValue(Promise.resolve('OK')),
        get: jest.fn().mockReturnValue(Promise.resolve(output)),
        destroy: jest.fn(),
    };
}

describe('PoolCacheService', () => {
    test('Returns pool cache as CacheClient returns', async () => {
        const mockCacheClient = createMockCacheClient({
            uniswapV3Cache: [
                {
                    timestamp: 4321,
                    pools: [POOL_A_B_500, POOL_A_B_3000],
                },
            ],
        });
        const service = new PoolCacheService({
            poolFetcher: jest.mocked({ get: jest.fn() }),
            cacheClient: mockCacheClient,
        });

        const poolCache = await service.get({ chainId: 42, uniswapV3Pairs: [{ tokenA: 'a', tokenB: 'b' }] });

        expect(poolCache).toEqual({
            uniswapV3Cache: [
                {
                    timestamp: 4321,
                    pools: [POOL_A_B_500, POOL_A_B_3000],
                },
            ],
        });
        expect(mockCacheClient.get).toHaveBeenCalledTimes(1);
    });

    test('Refreshes pool cache on cache miss', async () => {
        const mockPoolFetcher = jest.mocked({ get: jest.fn() });
        const mockCacheClient = createMockCacheClient({
            uniswapV3Cache: [
                {
                    timestamp: null, // cache miss
                    pools: [],
                },
            ],
        });

        const service = new PoolCacheService({
            poolFetcher: mockPoolFetcher,
            cacheClient: mockCacheClient,
        });

        await service.get({ chainId: 42, uniswapV3Pairs: [{ tokenA: 'a', tokenB: 'b' }] });

        expect(mockPoolFetcher.get).toHaveBeenCalledTimes(1);
        expect(mockCacheClient.set).toHaveBeenCalledTimes(1);
    });

    test('Does not refresh pool caches when caches are not stale', async () => {
        const mockPoolFetcher = jest.mocked({ get: jest.fn() });
        const mockCacheClient = createMockCacheClient({
            uniswapV3Cache: [
                {
                    timestamp: getTimestampInSeconds(), // fresh
                    pools: [POOL_A_B_500, POOL_A_B_3000],
                },

                {
                    timestamp: getTimestampInSeconds() - 60 * 60 * 3, // fresh (only 3 hours ago)
                    pools: [POOL_A_B_500, POOL_A_B_3000],
                },
            ],
        });
        const service = new PoolCacheService({
            poolFetcher: mockPoolFetcher,
            cacheClient: mockCacheClient,
        });

        await service.get({
            chainId: 42,
            uniswapV3Pairs: [
                { tokenA: 'a', tokenB: 'b' },
                { tokenA: 'c', tokenB: 'd' },
            ],
        });

        expect(mockPoolFetcher.get).not.toHaveBeenCalled();
        expect(mockCacheClient.set).not.toHaveBeenCalled();
    });

    test('Refreshes pool caches when one of the them is stale', async () => {
        const mockPoolFetcher = jest.mocked({ get: jest.fn() });
        const mockCacheClient = createMockCacheClient({
            uniswapV3Cache: [
                {
                    timestamp: getTimestampInSeconds(), // fresh
                    pools: [POOL_A_B_500, POOL_A_B_3000],
                },

                {
                    timestamp: getTimestampInSeconds() - 60 * 60 * 6.5, // stale (6.5 hours ago)
                    pools: [POOL_C_D_100, POOL_C_D_500],
                },
            ],
        });
        const service = new PoolCacheService({
            poolFetcher: mockPoolFetcher,
            cacheClient: mockCacheClient,
        });

        await service.get({
            chainId: 42,
            uniswapV3Pairs: [
                { tokenA: 'a', tokenB: 'b' },
                { tokenA: 'c', tokenB: 'd' },
            ],
        });

        expect(mockPoolFetcher.get).toHaveBeenCalledTimes(1);
        expect(mockCacheClient.set).toHaveBeenCalledTimes(1);
    });
});
