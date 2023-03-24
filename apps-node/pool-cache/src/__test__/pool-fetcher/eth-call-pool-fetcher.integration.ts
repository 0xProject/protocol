import { EthCallPoolFetcher } from '../../pool-fetcher/eth-call-pool-fetcher';
import * as _ from 'lodash';
import { Map } from 'immutable';

const ETHEREUM = {
    APE: '0x4d224452801aced8b2f0aebe155379bb5d594381',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    ZRX: '0xe41d2489571d322189246dafa5ebde1f4699f498',
};

const POLYGON = {
    WMATIC: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    WETH: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
};

const ARBITRUM = {
    WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    GMX: '0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a',
};

const ChainId = {
    Ethereum: 1,
    Polygon: 137,
    Arbitrum: 42161,
};

// 2023 May: This test isn't run as a part of CI.
// As these test run against real blockchains, they can be flaky (e.g. network error) or break overtime.
// Tests should be written in a way that they won't break in a near future.
describe('EthCallPoolFetcher Integration Test', () => {
    const fetcher = new EthCallPoolFetcher(
        Map([
            // Infura Project: Continuous Integration
            [ChainId.Ethereum, 'https://mainnet.infura.io/v3/1468c2ecb7f04f84a023cb71f03964c7'],
            [ChainId.Polygon, 'https://polygon-mainnet.infura.io/v3/1468c2ecb7f04f84a023cb71f03964c7'],
            [ChainId.Arbitrum, 'https://arbitrum-mainnet.infura.io/v3/1468c2ecb7f04f84a023cb71f03964c7'],
        ]),
    );

    describe('Uniswap V3', () => {
        test('Returns USDC/WETH pools on Ethereum', async () => {
            const cache = await fetcher.get({
                chainId: ChainId.Ethereum,
                uniswapV3Pairs: [
                    {
                        tokenA: ETHEREUM.USDC,
                        tokenB: ETHEREUM.WETH,
                    },
                ],
            });

            expect(cache.uniswapV3Cache).toHaveLength(1);

            const usdcWethCache = cache.uniswapV3Cache[0];
            expect(usdcWethCache.timestamp).toBeLessThan(Date.now() + 60_000);

            // All pools of 4 fee tiers are already created.
            expect(usdcWethCache.pools).toHaveLength(4);

            const topTwoPools = _.take(usdcWethCache.pools, 2);

            // 5bps and 30bps should be the top pools.
            expect(topTwoPools.map((p) => p.fee)).toEqual(expect.arrayContaining([500, 3000]));
        });

        test('Returns USDC/USDT pools on Ethereum', async () => {
            const cache = await fetcher.get({
                chainId: ChainId.Ethereum,
                uniswapV3Pairs: [
                    {
                        tokenA: ETHEREUM.USDC,
                        tokenB: ETHEREUM.USDT,
                    },
                ],
            });

            expect(cache.uniswapV3Cache).toHaveLength(1);

            const usdcUsdtCache = cache.uniswapV3Cache[0];
            expect(usdcUsdtCache.timestamp).toBeLessThan(Date.now() + 60_000);

            const topTwoPools = _.take(usdcUsdtCache.pools, 2);

            // 1bps and 5bps pool should be the top pool.
            expect(topTwoPools.map((p) => p.fee)).toEqual(expect.arrayContaining([100, 500]));
        });

        test('Returns no pool for APE/ZRX on Ethereum', async () => {
            const cache = await fetcher.get({
                chainId: 1,
                uniswapV3Pairs: [
                    {
                        tokenA: ETHEREUM.APE,
                        tokenB: ETHEREUM.ZRX,
                    },
                ],
            });

            expect(cache.uniswapV3Cache).toHaveLength(1);

            // There shouldn't be any APE/ZRX pool...
            expect(cache.uniswapV3Cache[0].pools).toHaveLength(0);
        });

        test('Returns WETH/WMATIC pools on Polygon', async () => {
            const cache = await fetcher.get({
                chainId: ChainId.Polygon,
                uniswapV3Pairs: [
                    {
                        tokenA: POLYGON.WETH,
                        tokenB: POLYGON.WMATIC,
                    },
                ],
            });

            expect(cache.uniswapV3Cache).toHaveLength(1);

            const wethMaticCache = cache.uniswapV3Cache[0];
            expect(wethMaticCache.timestamp).toBeLessThan(Date.now() + 60_000);

            const topTwoPools = _.take(wethMaticCache.pools, 2);

            // 5bps and 30bps pools should be the top pools.
            // https://info.uniswap.org/#/polygon/tokens/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270
            expect(topTwoPools.map((p) => p.fee)).toEqual(expect.arrayContaining([500, 3000]));
        });

        test('Returns WETH/GMX pools on Arbitrum', async () => {
            const cache = await fetcher.get({
                chainId: ChainId.Arbitrum,
                uniswapV3Pairs: [
                    {
                        tokenA: ARBITRUM.WETH,
                        tokenB: ARBITRUM.GMX,
                    },
                ],
            });

            expect(cache.uniswapV3Cache).toHaveLength(1);

            const wethGmxCache = cache.uniswapV3Cache[0];
            expect(wethGmxCache.timestamp).toBeLessThan(Date.now() + 60_000);

            const topTwoPools = _.take(wethGmxCache.pools, 2);

            // 30bps and 100bps pools should be the top pools.
            // https://info.uniswap.org/#/arbitrum/tokens/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a
            expect(topTwoPools.map((p) => p.fee)).toEqual(expect.arrayContaining([3000, 10000]));
        });
    });

    // TODO: add tests for more tokens and more chains
});
