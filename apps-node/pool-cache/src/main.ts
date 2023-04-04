import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { Map } from 'immutable';
import { RedisCacheClient } from './cache/redis-cache-client';
import { EthCallPoolFetcher } from './pool-fetcher/eth-call-pool-fetcher';
import { createPoolCacheRouter } from './routers';
import { PoolCacheService } from './services/pool-cache-service';
import { ChainId } from './utils/constants';
import { env } from './env';

function getRpcUrlMap(): Map<number, string> {
    const entries: [number, string | undefined][] = [
        [ChainId.Ethereum, env.ETHEREUM_RPC_URL],
        [ChainId.Polygon, env.POLYGON_RPC_URL],
        [ChainId.Arbitrum, env.ARBITRUM_RPC_URL],
    ];

    const isUrlDefined = (tuple: [number, string | undefined]): tuple is [number, string] => {
        const [, url] = tuple;
        return url !== undefined;
    };

    return Map(entries.filter(isUrlDefined));
}

createHTTPServer({
    router: createPoolCacheRouter(
        new PoolCacheService({
            poolFetcher: new EthCallPoolFetcher(getRpcUrlMap()),
            cacheClient: new RedisCacheClient(env.REDIS_URL),
        }),
    ),
    createContext() {
        return {};
    },
}).listen(env.POOL_CACHE_PORT);
