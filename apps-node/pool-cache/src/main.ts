import express from 'express';
import * as trpcExpress from '@trpc/server/adapters/express';
import { Map } from 'immutable';
import { RedisCacheClient } from './cache/redis-cache-client';
import { EthCallPoolFetcher } from './pool-fetcher/eth-call-pool-fetcher';
import { createPoolCacheRouter } from './routers';
import { PoolCacheService } from './services/pool-cache-service';
import { ChainId } from './utils/constants';
import { env } from './env';
import { createDefaultServer, HttpServiceConfig } from '@0x/api-utils';
import { logger } from './logger';

const httpServiceConfig: HttpServiceConfig = {
    httpPort: env.POOL_CACHE_PORT,
    healthcheckHttpPort: env.POOL_CACHE_PORT,
    healthcheckPath: '/healthz',
    httpKeepAliveTimeout: 60_000, // 60s
    httpHeadersTimeout: 60_000, // 60s
    enablePrometheusMetrics: env.ENABLE_PROMETHEUS_METRICS,
    prometheusPort: 8080,
    prometheusPath: '/metrics',
};

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

const createContext = ({ req: _req, res: _res }: trpcExpress.CreateExpressContextOptions) => ({});

async function main() {
    const app = express();

    // TODO: implement destroy (gracefully disconnect redis, etc.)
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const destroy = async () => {};

    const server = createDefaultServer(httpServiceConfig, app, logger, destroy);

    const poolCacheRouter = createPoolCacheRouter(
        new PoolCacheService({
            poolFetcher: new EthCallPoolFetcher(getRpcUrlMap()),
            cacheClient: new RedisCacheClient(env.REDIS_URL),
        }),
    );

    app.use(
        '/trpc',
        trpcExpress.createExpressMiddleware({
            router: poolCacheRouter,
            createContext,
        }),
    );

    server.listen(env.POOL_CACHE_PORT);
}

main();
