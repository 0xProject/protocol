import { inferRouterContext, inferRouterMeta, initTRPC } from '@trpc/server';
import { z } from 'zod';
import {
    PoolCacheRouter,
    UniswapV3PoolCache,
    UniswapV3Pool,
    GetPoolCacheOfPairsInput,
    GetPoolCacheOfPairsOutput,
    TokenPair,
} from 'pool-cache-interface';
import { implement } from './zod';
import { PoolCacheService } from '../services/pool-cache-service';
import { Counter, Histogram } from 'prom-client';

const POOL_CACHE_RESPONSE_TIME = new Histogram({
    name: 'pool_cache_response_time',
    help: 'The response time of a pool cache request in seconds',
    labelNames: ['procedure', 'chain_id'] as const,
    buckets: [0, 0.005, 0.001, 0.0025, 0.005, 0.1, 0.25, 0.5, 1, 2.5],
});

const POOL_CACHE_REQUESTS = new Counter({
    name: 'pool_cache_requests',
    help: 'Total number of pool cache requests',
    labelNames: ['procedure', 'chain_id'] as const,
});

const t = initTRPC.context<inferRouterContext<PoolCacheRouter>>().meta<inferRouterMeta<PoolCacheRouter>>().create();

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const ethereumAddress = z.string().regex(addressRegex, { message: 'Must be an ethereum address' });

const uniswapV3PoolShape = implement<UniswapV3Pool>().with({
    poolAddress: ethereumAddress,
    fee: z.union([z.literal(100), z.literal(500), z.literal(3000), z.literal(10000)]),
    score: z.number().nonnegative().lte(100),
});

const uniswapV3PoolCacheShape = implement<UniswapV3PoolCache>().with({
    timestamp: z.number().positive().nullable(),
    pools: uniswapV3PoolShape.array(),
});

const getPoolCacheOfPairsOutputShape = implement<GetPoolCacheOfPairsOutput>().with({
    uniswapV3Cache: uniswapV3PoolCacheShape.array(),
});

const tokenPairShape = implement<TokenPair>().with({
    tokenA: ethereumAddress,
    tokenB: ethereumAddress,
});

const getPoolCacheOfPairInputShape = implement<GetPoolCacheOfPairsInput>().with({
    chainId: z.number().positive(),
    uniswapV3Pairs: z.array(tokenPairShape),
});

function hasChainId(input: unknown): input is { chainId: number } {
    return typeof input === 'object' && input !== null && 'chainId' in input;
}

const metricsMiddleware = t.middleware(async ({ path, rawInput, next }) => {
    const start = Date.now();
    const result = await next();
    const durationInSeconds = (Date.now() - start) / 1000;
    if (hasChainId(rawInput)) {
        POOL_CACHE_RESPONSE_TIME.observe({ procedure: path, chain_id: rawInput.chainId }, durationInSeconds);
        POOL_CACHE_REQUESTS.inc({ procedure: path, chain_id: rawInput.chainId });
    }
    return result;
});

export function createPoolCacheRouter(service: PoolCacheService): PoolCacheRouter {
    return t.router({
        getPoolCacheOfPairs: t.procedure
            .use(metricsMiddleware)
            .input(getPoolCacheOfPairInputShape)
            .output(getPoolCacheOfPairsOutputShape)
            .query(({ input }) => {
                return service.get(input);
            }),
    }) satisfies PoolCacheRouter;
}
