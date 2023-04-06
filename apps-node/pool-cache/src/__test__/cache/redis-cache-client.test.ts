import Redis from 'ioredis';
import { UniswapV3Pool } from 'pool-cache-interface';
import { RedisCacheClient } from '../../cache/redis-cache-client';
import { DOCKER_REDIS_URL, setupDependencies, TeardownDependenciesFn } from '../test-utils/dependencies';
import { Counter } from 'prom-client';

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

describe('RedisCacheClient', () => {
    let teardownDependenciesFn: TeardownDependenciesFn;
    let redis: Redis;
    let client: RedisCacheClient;

    const counterInc = jest.fn();
    Counter.prototype.inc = counterInc;

    beforeAll(async () => {
        teardownDependenciesFn = await setupDependencies(['redis']);
        redis = new Redis(DOCKER_REDIS_URL);
        client = new RedisCacheClient(DOCKER_REDIS_URL);
    });

    afterAll(() => {
        if (!teardownDependenciesFn()) {
            throw new Error('Failed to tear down dependencies');
        }
    });

    afterEach(async () => {
        // Remove all keys for the next test.
        await redis.flushall();
        jest.clearAllMocks();
    });

    describe('set', () => {
        test('Throws an error when input (keys) and output (values) lengths do not match', async () => {
            await expect(
                client.set(
                    {
                        chainId: 42,
                        uniswapV3Pairs: [
                            { tokenA: 'a', tokenB: 'b' },
                            { tokenA: 'c', tokenB: 'd' },
                        ],
                    },
                    {
                        uniswapV3Cache: [
                            {
                                timestamp: 42000,
                                pools: [POOL_A_B_500, POOL_A_B_3000],
                            },
                        ],
                    },
                ),
            ).rejects.toThrow('Invalid input');
        });

        test('Inserts an entry with an expected key (regression test)', async () => {
            await client.set(
                {
                    chainId: 42,
                    uniswapV3Pairs: [{ tokenA: 'a', tokenB: 'b' }],
                },
                {
                    uniswapV3Cache: [
                        {
                            timestamp: 42000,
                            pools: [POOL_A_B_500, POOL_A_B_3000],
                        },
                    ],
                },
            );

            const value = await redis.get('42-uniswapv3-a-b');
            expect(value).toBeTruthy();
        });
    });

    describe('set/get', () => {
        test('Returns pool cache from redis when it exists', async () => {
            await client.set(
                {
                    chainId: 42,
                    uniswapV3Pairs: [
                        { tokenA: 'a', tokenB: 'b' },
                        { tokenA: 'c', tokenB: 'd' },
                    ],
                },
                {
                    uniswapV3Cache: [
                        {
                            timestamp: 42000,
                            pools: [POOL_A_B_500, POOL_A_B_3000],
                        },
                        {
                            timestamp: 42000,
                            pools: [POOL_C_D_100, POOL_C_D_500],
                        },
                    ],
                },
            );

            const output = await client.get({
                chainId: 42,
                uniswapV3Pairs: [
                    { tokenA: 'a', tokenB: 'b' },
                    { tokenA: 'c', tokenB: 'd' },
                ],
            });

            expect(output).toEqual({
                uniswapV3Cache: [
                    {
                        timestamp: 42000,
                        pools: [POOL_A_B_500, POOL_A_B_3000],
                    },
                    {
                        timestamp: 42000,
                        pools: [POOL_C_D_100, POOL_C_D_500],
                    },
                ],
            });
            expect(counterInc).toBeCalledWith({ result: 'hit' }, 2);
        });

        test('Returns pool cache from redis when it exists (indifferent to the token a/b order)', async () => {
            await client.set(
                {
                    chainId: 42,
                    uniswapV3Pairs: [{ tokenA: 'a', tokenB: 'b' }],
                },
                {
                    uniswapV3Cache: [
                        {
                            timestamp: 42000,
                            pools: [POOL_A_B_500, POOL_A_B_3000],
                        },
                    ],
                },
            );

            const output = await client.get({
                chainId: 42,
                uniswapV3Pairs: [{ tokenA: 'b', tokenB: 'a' }], // reversed
            });

            expect(output).toEqual({
                uniswapV3Cache: [
                    {
                        timestamp: 42000,
                        pools: [POOL_A_B_500, POOL_A_B_3000],
                    },
                ],
            });
            expect(counterInc).toBeCalledWith({ result: 'hit' }, 1);
        });

        test('Returns pool cache with null timestamp if it does not exist', async () => {
            await client.set(
                {
                    chainId: 42,
                    uniswapV3Pairs: [{ tokenA: 'a', tokenB: 'b' }],
                },
                {
                    uniswapV3Cache: [
                        {
                            timestamp: 42000,
                            pools: [POOL_A_B_500, POOL_A_B_3000],
                        },
                    ],
                },
            );

            const output = await client.get({
                chainId: 42,
                uniswapV3Pairs: [
                    { tokenA: 'a', tokenB: 'b' },
                    { tokenA: 'c', tokenB: 'd' }, // cache miss
                ],
            });

            expect(output).toEqual({
                uniswapV3Cache: [
                    {
                        timestamp: 42000,
                        pools: [POOL_A_B_500, POOL_A_B_3000],
                    },
                    {
                        timestamp: null,
                        pools: [],
                    },
                ],
            });
            expect(counterInc).toBeCalledWith({ result: 'hit' }, 1);
            expect(counterInc).toBeCalledWith({ result: 'miss' }, 1);
        });
    });
});
