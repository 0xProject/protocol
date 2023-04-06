import { GetPoolCacheOfPairsInput, GetPoolCacheOfPairsOutput, UniswapV3PoolCache } from 'pool-cache-interface';
import Redis from 'ioredis';
import { toUniswapV3Key } from './keys';
import * as _ from 'lodash';
import { CacheClient } from './types';
import { Counter } from 'prom-client';

const REDIS_CACHE_LOOKUP = new Counter({
    name: 'redis_cache_lookups',
    help: 'The Redis cache lookup count.',
    labelNames: ['result'] as const,
});

export class RedisCacheClient implements CacheClient {
    redis: Redis;

    constructor(redisUri: string) {
        this.redis = new Redis(redisUri);
    }

    async set(input: GetPoolCacheOfPairsInput, output: GetPoolCacheOfPairsOutput): Promise<'OK'> {
        if (input.uniswapV3Pairs.length !== output.uniswapV3Cache.length) {
            throw new Error(
                'Invalid input: the length of uniswapV3Pairs is different from the length of uniswapV3Cache',
            );
        }

        const uniswapKeys = input.uniswapV3Pairs.map((pair) => toUniswapV3Key(input.chainId, pair));
        const uniswapValues = output.uniswapV3Cache.map((cache) => JSON.stringify(cache));
        return this.redis.mset(_.flatten(_.zip(uniswapKeys, uniswapValues)));
    }

    async get(input: GetPoolCacheOfPairsInput): Promise<GetPoolCacheOfPairsOutput> {
        const uniswapKeys = input.uniswapV3Pairs.map((pair) => toUniswapV3Key(input.chainId, pair));

        const uniswapValues = await this.redis.mget(uniswapKeys);

        const cacheHitCount = uniswapValues.filter((value) => value !== null).length;
        const cacheMissCount = uniswapValues.length - cacheHitCount;
        if (cacheHitCount > 0) {
            REDIS_CACHE_LOOKUP.inc({ result: 'hit' }, cacheHitCount);
        }
        if (cacheMissCount > 0) {
            REDIS_CACHE_LOOKUP.inc({ result: 'miss' }, cacheMissCount);
        }

        return {
            uniswapV3Cache: uniswapValues.map(RedisCacheClient.toUniswapV3PoolCache),
        };
    }

    async destroy(): Promise<void> {
        // https://redis.io/commands/quit/
        await this.redis.quit();
    }

    private static toUniswapV3PoolCache(value: string | null): UniswapV3PoolCache {
        if (value === null) {
            return {
                timestamp: null,
                pools: [],
            };
        }

        try {
            return JSON.parse(value) as UniswapV3PoolCache;
        } catch {
            // TODO: this shouldn't happen. log this once logger is added.
            return {
                timestamp: null,
                pools: [],
            };
        }
    }
}
