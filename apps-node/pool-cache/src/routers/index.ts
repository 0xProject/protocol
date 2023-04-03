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

export function createPoolCacheRouter(service: PoolCacheService): PoolCacheRouter {
    return t.router({
        getPoolCacheOfPairs: t.procedure
            .input(getPoolCacheOfPairInputShape)
            .output(getPoolCacheOfPairsOutputShape)
            .query(({ input }) => {
                return service.get(input);
            }),
    }) satisfies PoolCacheRouter;
}
