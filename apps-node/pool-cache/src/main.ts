import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { Map } from 'immutable';
import { RedisCacheClient } from './cache/redis-cache-client';
import { EthCallPoolFetcher } from './pool-fetcher/eth-call-pool-fetcher';
import { createPoolCacheRouter } from './routers';
import { PoolCacheService } from './services/pool-cache-service';

createHTTPServer({
    router: createPoolCacheRouter(
        new PoolCacheService({
            poolFetcher: new EthCallPoolFetcher(
                // TODO: read from env and also verify
                Map([
                    [1, 'https://mainnet.infura.io/v3/1468c2ecb7f04f84a023cb71f03964c7'],
                    [137, 'https://polygon-mainnet.infura.io/v3/1468c2ecb7f04f84a023cb71f03964c7'],
                ]),
            ),
            // TODO: read from env
            cacheClient: new RedisCacheClient('//0.0.0.0:0101'),
        }),
    ),
    createContext() {
        return {};
    },
}).listen(3000);
