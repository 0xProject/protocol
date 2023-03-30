import { toUniswapPair, toUniswapV3Key } from '../../cache/keys';

describe('Keys', () => {
    describe('toUniswapV3Key', () => {
        test('Returns an exepcted key for cache (tokenA < tokenB)', () => {
            const key = toUniswapV3Key(4242, {
                tokenA: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                tokenB: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            });

            expect(key).toEqual(
                '4242-uniswapv3-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            );
        });

        test('Returns an exepcted key for cache (tokenA > tokenB)', () => {
            const key = toUniswapV3Key(4242, {
                tokenA: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                tokenB: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            });

            expect(key).toEqual(
                '4242-uniswapv3-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            );
        });
    });

    describe('toUniswapPair', () => {
        const testCasesTokenALessThanTokenB = [
            {
                pair: {
                    tokenA: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    tokenB: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
                expected: {
                    token0: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    token1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
            },
            {
                pair: {
                    tokenA: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    tokenB: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                },
                expected: {
                    token0: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    token1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                },
            },
            {
                pair: {
                    tokenA: '0x9000000000000000000000000000000000000000',
                    tokenB: '0xa000000000000000000000000000000000000000',
                },
                expected: {
                    token0: '0x9000000000000000000000000000000000000000',
                    token1: '0xa000000000000000000000000000000000000000',
                },
            },
            {
                pair: {
                    tokenA: '0x0000000000000000000000000000000000000042',
                    tokenB: '0x0000000000000000000000000000000000000043',
                },
                expected: {
                    token0: '0x0000000000000000000000000000000000000042',
                    token1: '0x0000000000000000000000000000000000000043',
                },
            },
        ];

        describe('tokenA < tokenB', () => {
            testCasesTokenALessThanTokenB.forEach(({ pair, expected }, i) => {
                test(`case ${i}`, () => {
                    const uniswapPair = toUniswapPair(pair);
                    expect(uniswapPair).toEqual(expected);
                });
            });
        });

        const testCasesTokenAGreaterThanTokenB = testCasesTokenALessThanTokenB.map(({ pair, expected }) => {
            return {
                pair: {
                    tokenA: pair.tokenB,
                    tokenB: pair.tokenA,
                },
                expected,
            };
        });

        describe('tokenA > tokenB', () => {
            testCasesTokenAGreaterThanTokenB.forEach(({ pair, expected }, i) => {
                test(`case ${i}`, () => {
                    const uniswapPair = toUniswapPair(pair);
                    expect(uniswapPair).toEqual(expected);
                });
            });
        });
    });
});
