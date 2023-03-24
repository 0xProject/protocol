import { toUniswapV3PoolCache } from '../../pool-fetcher/normalizer';
import { ZERO_ADDRESS } from '../../utils/constants';

describe('Normalizer', () => {
    describe('toUniswapV3PoolCache', () => {
        test('Throws an error on invalid `uniswapPoolStructs` length ', () => {
            expect(() =>
                toUniswapV3PoolCache([
                    {
                        fee: 100n,
                        poolAddress: ZERO_ADDRESS,
                        totalValueInToken1: 0n,
                    },
                ]),
            ).toThrowError('Invalid input: uniswapPoolStructs must be multiple of 4');
        });

        test('Filters out zero address pools ', () => {
            const cache = toUniswapV3PoolCache([
                {
                    fee: 100n,
                    poolAddress: ZERO_ADDRESS,
                    totalValueInToken1: 0n,
                },
                {
                    fee: 500n,
                    poolAddress: ZERO_ADDRESS,
                    totalValueInToken1: 0n,
                },
                {
                    fee: 3000n,
                    poolAddress: 'pair-0-30bps',
                    totalValueInToken1: 100_000n,
                },
                {
                    fee: 10000n,
                    poolAddress: 'pair-0-100bps',
                    totalValueInToken1: 30_000n,
                },
            ]);

            expect(cache).toEqual([
                {
                    pools: [
                        {
                            poolAddress: 'pair-0-30bps',
                            fee: 3000,
                            score: 100,
                        },
                        {
                            poolAddress: 'pair-0-100bps',
                            fee: 10000,
                            score: 30,
                        },
                    ],
                },
            ]);
        });

        test('Filter out zero tvl pools ', () => {
            const cache = toUniswapV3PoolCache([
                {
                    fee: 100n,
                    poolAddress: 'pair-0-1bps',
                    totalValueInToken1: 0n,
                },
                {
                    fee: 500n,
                    poolAddress: 'pair-0-5bps',
                    totalValueInToken1: 0n,
                },
                {
                    fee: 3000n,
                    poolAddress: 'pair-0-30bps',
                    totalValueInToken1: 100_000n,
                },
                {
                    fee: 10000n,
                    poolAddress: 'pair-0-100bps',
                    totalValueInToken1: 30_000n,
                },
            ]);

            expect(cache).toEqual([
                {
                    pools: [
                        {
                            poolAddress: 'pair-0-30bps',
                            fee: 3000,
                            score: 100,
                        },
                        {
                            poolAddress: 'pair-0-100bps',
                            fee: 10000,
                            score: 30,
                        },
                    ],
                },
            ]);
        });

        test('Returns pools normalized by score', () => {
            const cache = toUniswapV3PoolCache([
                // pair 0 pools:
                {
                    fee: 100n,
                    poolAddress: 'pair-0-1bps',
                    totalValueInToken1: 10_000n,
                },
                {
                    fee: 500n,
                    poolAddress: 'pair-0-5bps',
                    totalValueInToken1: 20_000n,
                },
                {
                    fee: 3000n,
                    poolAddress: 'pair-0-30bps',
                    totalValueInToken1: 100_000n,
                },
                {
                    fee: 10000n,
                    poolAddress: 'pair-0-100bps',
                    totalValueInToken1: 30_000n,
                },
                // pair 1 pools:
                {
                    fee: 100n,
                    poolAddress: 'pair-1-1bps',
                    totalValueInToken1: 100_000n,
                },
                {
                    fee: 500n,
                    poolAddress: 'pair-1-5bps',
                    totalValueInToken1: 42_000n,
                },
                {
                    fee: 3000n,
                    poolAddress: 'pair-1-30bps',
                    totalValueInToken1: 0n,
                },
                {
                    fee: 10000n,
                    poolAddress: 'pair-1-100bps',
                    totalValueInToken1: 1_000n,
                },
            ]);

            expect(cache).toEqual([
                // pair 0
                {
                    pools: [
                        {
                            poolAddress: 'pair-0-30bps',
                            fee: 3000,
                            score: 100,
                        },
                        {
                            poolAddress: 'pair-0-100bps',
                            fee: 10000,
                            score: 30,
                        },
                        {
                            poolAddress: 'pair-0-5bps',
                            fee: 500,
                            score: 20,
                        },
                        {
                            poolAddress: 'pair-0-1bps',
                            fee: 100,
                            score: 10,
                        },
                    ],
                },
                // pair 1
                {
                    pools: [
                        {
                            poolAddress: 'pair-1-1bps',
                            fee: 100,
                            score: 100,
                        },
                        {
                            fee: 500,
                            poolAddress: 'pair-1-5bps',
                            score: 42,
                        },
                        {
                            fee: 10000,
                            poolAddress: 'pair-1-100bps',
                            score: 1,
                        },
                    ],
                },
            ]);
        });
    });
});
