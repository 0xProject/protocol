import { EthCallPoolFetcher } from '../../pool-fetcher/eth-call-pool-fetcher';
import * as _ from 'lodash';
import { Map } from 'immutable';

const USDC_ADDR = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const WETH_ADDR = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const USDT_ADDR = '0xdac17f958d2ee523a2206206994597c13d831ec7';

describe('EthCallPoolFetcher Integration Test', () => {
    const fetcher = new EthCallPoolFetcher(Map([[1, 'https://cloudflare-eth.com']]));

    describe('Uniswap V3', () => {
        test('Returns USDC/WETH pools on Ethereum', async () => {
            const cache = await fetcher.getPoolsOfPairs({
                chainId: 1,
                uniswapV3Pairs: [
                    {
                        tokenA: USDC_ADDR,
                        tokenB: WETH_ADDR,
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
            const cache = await fetcher.getPoolsOfPairs({
                chainId: 1,
                uniswapV3Pairs: [
                    {
                        tokenA: USDC_ADDR,
                        tokenB: USDT_ADDR,
                    },
                ],
            });

            expect(cache.uniswapV3Cache).toHaveLength(1);

            const usdcUsdtCache = cache.uniswapV3Cache[0];
            expect(usdcUsdtCache.timestamp).toBeLessThan(Date.now() + 60_000);

            // At least 2 pool should exist (1bps, 5bps pool).
            expect(usdcUsdtCache.pools.length).toBeGreaterThanOrEqual(2);

            const topTwoPools = _.take(usdcUsdtCache.pools, 2);

            // 1bps and 5bps pool should be the top pool.
            expect(topTwoPools.map((p) => p.fee)).toEqual(expect.arrayContaining([100, 500]));
        });
    });

    // TODO: add tests for more tokens and more chains
});
