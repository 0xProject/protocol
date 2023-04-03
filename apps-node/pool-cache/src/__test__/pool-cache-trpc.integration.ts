import { EthCallPoolFetcher } from '../pool-fetcher/eth-call-pool-fetcher';
import { ChainId } from '../utils/constants';
import { Map } from 'immutable';
import { DOCKER_REDIS_URL, setupDependencies, TeardownDependenciesFn } from './test-utils/dependencies';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { PoolCacheRouter } from 'pool-cache-interface';
import Redis from 'ioredis';
import * as _ from 'lodash';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createPoolCacheRouter } from '../routers';
import { PoolCacheService } from '../services/pool-cache-service';
import { RedisCacheClient } from '../cache/redis-cache-client';
import { ETHEREUM } from './test-utils/constants';
import { getTimestampInSeconds } from '../utils/time';

const TRPC_SERVER_PORT = 1001;

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('PoolCache tRPC Integration Test', () => {
    let teardownDependenciesFn: TeardownDependenciesFn;
    let redis: Redis;
    let server: ReturnType<typeof createHTTPServer>;

    const client = createTRPCProxyClient<PoolCacheRouter>({
        links: [
            httpBatchLink({
                url: `http://localhost:${TRPC_SERVER_PORT}`,
            }),
        ],
    });

    beforeAll(async () => {
        teardownDependenciesFn = await setupDependencies(['redis']);
        redis = new Redis(DOCKER_REDIS_URL);
        server = createHTTPServer({
            router: createPoolCacheRouter(
                new PoolCacheService({
                    poolFetcher: new EthCallPoolFetcher(
                        Map([
                            // Infura Project: Continuous Integration
                            [ChainId.Ethereum, 'https://mainnet.infura.io/v3/1468c2ecb7f04f84a023cb71f03964c7'],
                        ]),
                    ),
                    cacheClient: new RedisCacheClient(DOCKER_REDIS_URL),
                }),
            ),
            createContext() {
                return {};
            },
        });
        server.listen(TRPC_SERVER_PORT);
    });

    afterAll(() => {
        if (!teardownDependenciesFn()) {
            throw new Error('Failed to tear down dependencies');
        }
        server.server.close();
    });

    afterEach(async () => {
        // Remove all keys for the next test.
        await redis.flushall();
    });

    test('Returns no pool cache on cache miss (Ethereum APE/ZRX)', async () => {
        const poolCache = await client.getPoolCacheOfPairs.query({
            chainId: ChainId.Ethereum,
            uniswapV3Pairs: [
                {
                    tokenA: ETHEREUM.APE,
                    tokenB: ETHEREUM.ZRX,
                },
            ],
        });

        expect(poolCache).toEqual({
            uniswapV3Cache: [
                {
                    timestamp: null,
                    pools: [],
                },
            ],
        });
    });

    test('Returns pool cache (Ethereum WETH/USDC, USDC/USDT) ', async () => {
        const WETH_USDC_PAIR = {
            tokenA: ETHEREUM.WETH,
            tokenB: ETHEREUM.USDC,
        };
        const USDC_USDT_PAIR = {
            tokenA: ETHEREUM.USDC,
            tokenB: ETHEREUM.USDT,
        };

        const poolCache0 = await client.getPoolCacheOfPairs.query({
            chainId: ChainId.Ethereum,
            uniswapV3Pairs: [WETH_USDC_PAIR, USDC_USDT_PAIR],
        });

        // Initially not cached (not in Redis).
        expect(poolCache0).toEqual({
            uniswapV3Cache: [
                {
                    timestamp: null,
                    pools: [],
                },
                {
                    timestamp: null,
                    pools: [],
                },
            ],
        });

        // Wait until pool information is fetched in the background.
        await sleep(2000);

        const poolCache1 = await client.getPoolCacheOfPairs.query({
            chainId: ChainId.Ethereum,
            uniswapV3Pairs: [WETH_USDC_PAIR, USDC_USDT_PAIR],
        });

        expect(poolCache1.uniswapV3Cache).toHaveLength(2);
        const [usdcWethCache, usdcUsdtCache] = poolCache1.uniswapV3Cache;

        // USDC/WETH
        expect(usdcWethCache.timestamp).toBeLessThan(getTimestampInSeconds() + 60);
        // All pools of 4 fee tiers are already created.
        expect(usdcWethCache.pools).toHaveLength(4);
        const topTwoUsdcWethPools = _.take(usdcWethCache.pools, 2);
        // 5bps and 30bps should be the top pools.
        expect(topTwoUsdcWethPools.map((p) => p.fee)).toEqual(expect.arrayContaining([500, 3000]));

        // USDC/USDT
        expect(usdcUsdtCache.timestamp).toBeLessThan(getTimestampInSeconds() + 60);
        const topTwoUsdcUsdtPools = _.take(usdcUsdtCache.pools, 2);
        // 1bps and 5bps pool should be the top pool.
        expect(topTwoUsdcUsdtPools.map((p) => p.fee)).toEqual(expect.arrayContaining([100, 500]));
    });
});
