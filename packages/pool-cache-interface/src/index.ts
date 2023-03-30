import type { defineTrpcRouter } from 'trpc-toolbox';

// Fee denominated in hundredths of a bip .
export type UniswapV3Fee = 100 | 500 | 3000 | 10000;

export interface UniswapV3Pool {
    poolAddress: string;
    // Pool fee
    fee: UniswapV3Fee;
    // Normalized liquidity score [0, 100]
    score: number;
}

export interface UniswapV3PoolCache {
    // Unix timestamp when pool data was fetched (in seconds).
    //`timestamp` is undefined when there was no cache.
    timestamp: number | null;
    // Pools sorted by the liquidity score (descending).
    pools: UniswapV3Pool[];
}

export interface GetPoolCacheOfPairsOutput {
    // The order corresponds to the order of `GetPoolCacheOfPairsInput.uniswapV3Pairs`.
    uniswapV3Cache: UniswapV3PoolCache[];
}

export interface TokenPair {
    // Token A address (the order doesn't matter).
    tokenA: string;
    // Token B address (the order doesn't matter).
    tokenB: string;
}

export interface GetPoolCacheOfPairsInput {
    chainId: number;
    uniswapV3Pairs: TokenPair[];
}

type RouterProcedures = {
    getPoolCacheOfPairs: {
        type: 'query';
        input: GetPoolCacheOfPairsInput;
        output: GetPoolCacheOfPairsOutput;
    };
};

export type PoolCacheRouter = defineTrpcRouter<RouterProcedures>;
