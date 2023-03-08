import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { poolCacheRouter } from './routers';

createHTTPServer({
    router: poolCacheRouter,
    createContext() {
        return {};
    },
}).listen(3000);
