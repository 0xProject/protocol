import { inferRouterContext, inferRouterMeta, initTRPC } from '@trpc/server';
import { z } from 'zod';
import { PoolCache, PoolCacheRouter, UniswapV3Pool, GetPoolCacheOfPairInput } from 'pool-cache-interface';
import { implement } from './zod';

const t = initTRPC.context<inferRouterContext<PoolCacheRouter>>().meta<inferRouterMeta<PoolCacheRouter>>().create();

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const ethereumAddress = z.string().regex(addressRegex, { message: 'Must be an ethereum address' });

const uniswapV3PoolShape = implement<UniswapV3Pool>().with({
    protocol: z.literal('uniswap-v3'),
    poolAddress: ethereumAddress,
    fee: z.union([z.literal(100), z.literal(500), z.literal(3000), z.literal(10000)]),
    score: z.number().positive().lte(100),
});

const poolShape = uniswapV3PoolShape;

const poolCacheShape = implement<PoolCache>().with({
    timestamp: z.number().positive(),
    pools: poolShape.array(),
});

const getPoolCacheOfPairInputShape = implement<GetPoolCacheOfPairInput>().with({
    chainId: z.number().positive(),
    protocol: z.literal('uniswap-v3'),
    token0: ethereumAddress,
    token1: ethereumAddress,
});

export const poolCacheRouter = t.router({
    getPoolCacheOfPair: t.procedure
        .input(getPoolCacheOfPairInputShape)
        .output(poolCacheShape)
        .query(({ input: _input }) => {
            // TODO: implement
            return {
                timestamp: 42000,
                pools: [],
            };
        }),
}) satisfies PoolCacheRouter;
