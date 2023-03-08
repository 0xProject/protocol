import { env } from './env';
import { logger } from './logger';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { initTRPC } from '@trpc/server';
import { zippoRouterDefinition, TZippoRouter } from 'zippo-interface';
import { create as userCreate, getById as userGetById } from './services/userService';

const t = initTRPC.create();

const router = t.router({
    user: t.router({
        get: t.procedure
            .input(zippoRouterDefinition.user.get.input)
            .output(zippoRouterDefinition.user.get.output)
            .query(({ input }) => userGetById(input)),
        create: t.procedure.input(zippoRouterDefinition.user.create.input).mutation(({ input }) => {
            userCreate(input);
        }),
    }),
}) satisfies TZippoRouter;

const server = createHTTPServer({
    router,
    createContext() {
        return {};
    },
});

logger.debug(`🔥 Starting ZIPPO on port ${env.ZIPPO_PORT}`);
server.listen(env.ZIPPO_PORT);
