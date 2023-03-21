import { env } from './env';
import { logger } from './logger';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { initTRPC } from '@trpc/server';
import { zippoRouterDefinition, TZippoRouter } from 'zippo-interface';
import {
    getById as userGetById,
    getByEmail as userGetByEmail,
    create as userCreate,
    update as userUpdate,
    login as userLogin,
    logout as userLogout,
    getSession as userGetSession,
    verifyEmail as userVerifyEmail,
    resetPassword as userResetPassword,
    sendEmail as userSendEmail,
    sendPasswordResetEmail as userSendPasswordResetEmail,
    sendEmailVerifyEmail as userSendEmailVerifyEmail,
} from './services/userService';
import { create as teamCreate, getById as teamGetById, update as teamUpdate } from './services/teamService';
import {
    create as appCreate,
    list as appList,
    get as appGet,
    update as appUpdate,
    createApiKey as appCreateApiKey,
    updateApiKey as appUpdateApiKey,
    deleteApiKey as appDeleteApiKey,
    provisionAccess as appProvisionAccess,
    deprovisionAccess as appDeprovisionAccess,
} from './services/appService';

const t = initTRPC.create();

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
    const start = Date.now();
    const result = await next();
    const durationMs = Date.now() - start;
    result.ok
        ? logger.info({ path, type, durationMs }, 'tRPC request succeeded')
        : logger.info({ path, type, durationMs }, 'tRPC request failed');
    return result;
});

const zippoProcedure = t.procedure.use(loggerMiddleware);

const router = t.router({
    user: t.router({
        getById: zippoProcedure
            .input(zippoRouterDefinition.user.getById.input)
            .output(zippoRouterDefinition.user.getById.output)
            .query(({ input }) => userGetById(input)),
        getByEmail: zippoProcedure
            .input(zippoRouterDefinition.user.getByEmail.input)
            .output(zippoRouterDefinition.user.getByEmail.output)
            .query(({ input }) => userGetByEmail(input)),
        create: zippoProcedure
            .input(zippoRouterDefinition.user.create.input)
            .output(zippoRouterDefinition.user.create.output)
            .mutation(async ({ input }) => {
                return userCreate(input);
            }),
        update: zippoProcedure
            .input(zippoRouterDefinition.user.update.input)
            .output(zippoRouterDefinition.user.update.output)
            .mutation(async ({ input }) => {
                const { id, ...parameters } = input;
                return await userUpdate(id, parameters);
            }),
        sendPasswordResetEmail: zippoProcedure
            .input(zippoRouterDefinition.user.sendPasswordResetEmail.input)
            .output(zippoRouterDefinition.user.sendPasswordResetEmail.output)
            .mutation(async ({ input }) => {
                return await userSendPasswordResetEmail(input);
            }),
        sendEmailVerifyEmail: zippoProcedure
            .input(zippoRouterDefinition.user.sendEmailVerifyEmail.input)
            .output(zippoRouterDefinition.user.sendEmailVerifyEmail.output)
            .mutation(async ({ input }) => {
                return await userSendEmailVerifyEmail(input);
            }),
        sendEmail: zippoProcedure
            .input(zippoRouterDefinition.user.sendEmail.input)
            .output(zippoRouterDefinition.user.sendEmail.output)
            .mutation(async ({ input }) => {
                return await userSendEmail(input);
            }),
        verifyEmail: zippoProcedure
            .input(zippoRouterDefinition.user.verifyEmail.input)
            .output(zippoRouterDefinition.user.verifyEmail.output)
            .mutation(async ({ input }) => {
                return await userVerifyEmail(input);
            }),
        resetPassword: zippoProcedure
            .input(zippoRouterDefinition.user.resetPassword.input)
            .output(zippoRouterDefinition.user.resetPassword.output)
            .mutation(async ({ input }) => {
                return await userResetPassword(input);
            }),
    }),
    session: t.router({
        login: zippoProcedure
            .input(zippoRouterDefinition.session.login.input)
            .output(zippoRouterDefinition.session.login.output)
            .mutation(async ({ input }) => {
                return await userLogin(input);
            }),
        logout: zippoProcedure.input(zippoRouterDefinition.session.logout.input).mutation(async ({ input }) => {
            await userLogout(input);
        }),
        getSession: zippoProcedure
            .input(zippoRouterDefinition.session.getSession.input)
            .output(zippoRouterDefinition.session.getSession.output)
            .query(({ input }) => userGetSession(input)),
    }),
    team: t.router({
        getById: zippoProcedure
            .input(zippoRouterDefinition.team.getById.input)
            .output(zippoRouterDefinition.team.getById.output)
            .query(({ input }) => teamGetById(input)),
        create: zippoProcedure
            .input(zippoRouterDefinition.team.create.input)
            .output(zippoRouterDefinition.team.create.output)
            .mutation(async ({ input }) => {
                return teamCreate(input);
            }),
        update: zippoProcedure
            .input(zippoRouterDefinition.team.update.input)
            .output(zippoRouterDefinition.team.update.output)
            .mutation(async ({ input }) => {
                const { id, ...parameters } = input;
                return teamUpdate(id, parameters);
            }),
    }),
    app: t.router({
        list: zippoProcedure
            .input(zippoRouterDefinition.app.list.input)
            .output(zippoRouterDefinition.app.list.output)
            .query(({ input }) => appList(input)),
        getById: zippoProcedure
            .input(zippoRouterDefinition.app.getById.input)
            .output(zippoRouterDefinition.app.getById.output)
            .query(({ input }) => appGet(input)),
        create: zippoProcedure
            .input(zippoRouterDefinition.app.create.input)
            .output(zippoRouterDefinition.app.create.output)
            .mutation(async ({ input }) => {
                return appCreate(input);
            }),
        update: zippoProcedure
            .input(zippoRouterDefinition.app.update.input)
            .output(zippoRouterDefinition.app.update.output)
            .mutation(async ({ input }) => {
                const { id, ...parameters } = input;
                return appUpdate(id, parameters);
            }),
        provisionAccess: zippoProcedure
            .input(zippoRouterDefinition.app.provisionAccess.input)
            .output(zippoRouterDefinition.app.provisionAccess.output)
            .mutation(async ({ input }) => {
                const { id, routeTags, rateLimits } = input;
                return appProvisionAccess(id, routeTags, rateLimits);
            }),
        deprovisionAccess: zippoProcedure
            .input(zippoRouterDefinition.app.deprovisionAccess.input)
            .output(zippoRouterDefinition.app.deprovisionAccess.output)
            .mutation(async ({ input }) => {
                const { id, routeTags } = input;
                return appDeprovisionAccess(id, routeTags);
            }),
        key: t.router({
            create: zippoProcedure
                .input(zippoRouterDefinition.app.key.create.input)
                .output(zippoRouterDefinition.app.key.create.output)
                .mutation(async ({ input }) => {
                    return appCreateApiKey(input);
                }),
            update: zippoProcedure
                .input(zippoRouterDefinition.app.key.update.input)
                .output(zippoRouterDefinition.app.key.update.output)
                .mutation(async ({ input }) => {
                    const { id, ...parameters } = input;
                    return appUpdateApiKey(id, parameters);
                }),
            delete: zippoProcedure
                .input(zippoRouterDefinition.app.key.delete.input)
                .output(zippoRouterDefinition.app.key.delete.output)
                .mutation(async ({ input }) => {
                    return appDeleteApiKey(input);
                }),
        }),
    }),
}) satisfies TZippoRouter;

const server = createHTTPServer({
    router,
    createContext() {
        return {};
    },
});

logger.debug(`Starting ZIPPO on port ${env.ZIPPO_PORT}`);
server.listen(env.ZIPPO_PORT);
