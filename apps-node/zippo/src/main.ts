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

const t = initTRPC.create();

const router = t.router({
    user: t.router({
        getById: t.procedure
            .input(zippoRouterDefinition.user.getById.input)
            .output(zippoRouterDefinition.user.getById.output)
            .query(({ input }) => userGetById(input)),
        getByEmail: t.procedure
            .input(zippoRouterDefinition.user.getByEmail.input)
            .output(zippoRouterDefinition.user.getByEmail.output)
            .query(({ input }) => userGetByEmail(input)),
        create: t.procedure
            .input(zippoRouterDefinition.user.create.input)
            .output(zippoRouterDefinition.user.create.output)
            .mutation(async ({ input }) => {
                return await userCreate(input);
            }),
        update: t.procedure
            .input(zippoRouterDefinition.user.update.input)
            .output(zippoRouterDefinition.user.update.output)
            .mutation(async ({ input }) => {
                const { id, ...parameters } = input;
                return await userUpdate(id, parameters);
            }),
        sendPasswordResetEmail: t.procedure
            .input(zippoRouterDefinition.user.sendPasswordResetEmail.input)
            .output(zippoRouterDefinition.user.sendPasswordResetEmail.output)
            .mutation(async ({ input }) => {
                return await userSendPasswordResetEmail(input);
            }),
        sendEmailVerifyEmail: t.procedure
            .input(zippoRouterDefinition.user.sendEmailVerifyEmail.input)
            .output(zippoRouterDefinition.user.sendEmailVerifyEmail.output)
            .mutation(async ({ input }) => {
                return await userSendEmailVerifyEmail(input);
            }),
        sendEmail: t.procedure
            .input(zippoRouterDefinition.user.sendEmail.input)
            .output(zippoRouterDefinition.user.sendEmail.output)
            .mutation(async ({ input }) => {
                return await userSendEmail(input);
            }),
        verifyEmail: t.procedure
            .input(zippoRouterDefinition.user.verifyEmail.input)
            .output(zippoRouterDefinition.user.verifyEmail.output)
            .mutation(async ({ input }) => {
                return await userVerifyEmail(input);
            }),
        resetPassword: t.procedure
            .input(zippoRouterDefinition.user.resetPassword.input)
            .output(zippoRouterDefinition.user.resetPassword.output)
            .mutation(async ({ input }) => {
                return await userResetPassword(input);
            }),
    }),
    session: t.router({
        login: t.procedure
            .input(zippoRouterDefinition.session.login.input)
            .output(zippoRouterDefinition.session.login.output)
            .mutation(async ({ input }) => {
                return await userLogin(input);
            }),
        logout: t.procedure.input(zippoRouterDefinition.session.logout.input).mutation(async ({ input }) => {
            await userLogout(input);
        }),
        getSession: t.procedure
            .input(zippoRouterDefinition.session.getSession.input)
            .output(zippoRouterDefinition.session.getSession.output)
            .query(({ input }) => userGetSession(input)),
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

logger.debug(`Starting ZIPPO on port ${env.ZIPPO_PORT}`);
server.listen(env.ZIPPO_PORT);
