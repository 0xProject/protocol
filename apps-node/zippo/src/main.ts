import { env } from './env';
import { logger } from './logger';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { initTRPC } from '@trpc/server';
import { zippoRouterDefinition, TZippoRouter } from 'zippo-interface';
import { create as userCreate, getById as userGetById } from './services/userService';
import { create as teamCreate, getById as teamGetById, update as teamUpdate } from './services/teamService';

const t = initTRPC.create();

const router = t.router({
    user: t.router({
        get: t.procedure
            .input(zippoRouterDefinition.user.get.input)
            .output(zippoRouterDefinition.user.get.output)
            .query(({ input }) => userGetById(input)),
        create: t.procedure
            .input(zippoRouterDefinition.user.create.input)
            .output(zippoRouterDefinition.user.create.output)
            .mutation(async ({ input }) => {
                return await userCreate(input);
            }),
    }),
    team: t.router({
        get: t.procedure
            .input(zippoRouterDefinition.team.get.input)
            .output(zippoRouterDefinition.team.get.output)
            .query(({ input }) => teamGetById(input)),
        create: t.procedure
            .input(zippoRouterDefinition.team.create.input)
            .output(zippoRouterDefinition.team.create.output)
            .mutation(async ({ input }) => {
                return await teamCreate(input);
            }),
        update: t.procedure
            .input(zippoRouterDefinition.team.update.input)
            .output(zippoRouterDefinition.team.update.output)
            .mutation(async ({ input }) => {
                const { id, ...parameters } = input;
                return await teamUpdate(id, parameters);
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
