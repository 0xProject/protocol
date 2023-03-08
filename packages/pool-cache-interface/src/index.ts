import type { defineTrpcRouter } from 'trpc-toolbox';

export type Protocol = 'uniswap-v3';

interface PoolBase {
    protocol: Protocol;
    // Normalized liquidity score [0, 100]
    score: number;
}

export interface UniswapV3Pool extends PoolBase {
    protocol: 'uniswap-v3';
    poolAddress: string;
    // Fee denominated in hundredths of a bip .
    fee: 100 | 500 | 3000 | 10000;
}

export type Pool = UniswapV3Pool;

export interface PoolCache {
    // Unix timestamp when pool data was fetched (in seconds).
    timestamp: number;
    // Pools sorted by the liquidity score (descending).
    pools: Pool[];
}

export interface GetPoolCacheOfPairInput {
    chainId: number;
    protocol: Protocol;
    // Token 0 address (the order doesn't matter).
    token0: string;
    // Token 1 address (the order doesn't matter).
    token1: string;
}

type RouterProcedures = {
    getPoolCacheOfPair: {
        type: 'query';
        input: GetPoolCacheOfPairInput;
        output: PoolCache;
    };
};

export type PoolCacheRouter = defineTrpcRouter<RouterProcedures>;
