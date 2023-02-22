import { env } from './env';
import { logger } from './logger';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './routers';

logger.info(`Starting ZIPPO on port ${env.ZIPPO_PORT}`);

createHTTPServer({
    router: appRouter,
    createContext() {
        return {};
    },
}).listen(env.ZIPPO_PORT);
