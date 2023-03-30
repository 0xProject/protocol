import { TokenPair } from 'pool-cache-interface';

export function toUniswapV3Key(chainId: number, tokenPair: TokenPair): string {
    const { token0, token1 } = toUniswapPair(tokenPair);
    return `${chainId}-uniswapv3-${token0}-${token1}`;
}

/**
 * Converts {@link TokenPair} into a Uniswap style pair.
 * @param pair A {@link TokenPair} pair.
 * @returns A Uniswap style pair where token0 < token1 lexicographically (addresses are lower-cased).
 */
export function toUniswapPair(pair: TokenPair): { token0: string; token1: string } {
    const tokenA = pair.tokenA.toLocaleLowerCase();
    const tokenB = pair.tokenB.toLocaleLowerCase();

    if (tokenA < tokenB) {
        return {
            token0: tokenA,
            token1: tokenB,
        };
    }

    return {
        token0: tokenB,
        token1: tokenA,
    };
}
