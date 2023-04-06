import { addMinutes } from 'date-fns';
import { client } from './trpc.server';
import type { User } from '../auth.server';
import type { Result } from '../types';
import type { RouterInputs, RouterOutputs } from './trpc.server';
import type { ClientApp, Rename } from '../types';
import { getBaseUrl } from '../utils/utils.server';
import type { TZippoRouteTag } from 'zippo-interface';

export const NO_TEAM_MARKER = '__not_init' as const;

export type ZippoApp = NonNullable<RouterOutputs['app']['getById']>;

export type OnChainTagParams = Rename<RouterInputs['externalApp']['create'], { integratorTeamId: 'teamId' }>;

const zippoAppToClientApp = (zippoApp: ZippoApp): ClientApp => {
    return {
        id: zippoApp.id,
        name: zippoApp.name,
        description: zippoApp.description,
        apiKeys: zippoApp.apiKeys,
        teamId: zippoApp.integratorTeamId,
        productAccess: zippoApp.integratorAccess.map((access) => access.routeTag as TZippoRouteTag),
        onChainTag: zippoApp.integratorExternalApp ? { name: zippoApp.integratorExternalApp.name } : undefined,
    };
};

export async function doesSessionExist({
    userId,
    sessionToken,
}: {
    userId: string;
    sessionToken: string;
}): Promise<Result<boolean>> {
    try {
        const session = await client.session.getSession.query(sessionToken);
        if (!session) {
            return {
                result: 'ERROR',
                error: new Error('Invalid session'),
            };
        }

        if (session.userId !== userId) {
            return {
                result: 'ERROR',
                error: new Error('Invalid session'),
            };
        }

        return {
            result: 'SUCCESS',
            data: true,
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function createUserWithEmailAndPassword({
    firstName,
    lastName,
    email,
    password,
}: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}): Promise<Result<string>> {
    // currently stubbed, but this is where we would check with the backend to create a new user

    try {
        const result = await client.user.create.mutate({
            firstName,
            lastName,
            email,
            password,
        });
        if (!result) {
            return {
                result: 'ERROR',
                error: new Error('Failed to create user'),
            };
        }
        return {
            result: 'SUCCESS',
            data: result.id,
        };
    } catch (e) {
        console.warn(e);
        if (e instanceof Error && e.message.includes('Unique constraint failed on the fields: (`email`)')) {
            return {
                result: 'ERROR',
                error: new Error('User already exists'),
            };
        }

        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function sendVerificationEmail({
    email,
    userId,
}: {
    email: string;
    userId: string;
}): Promise<Result<void>> {
    console.log('Verification email sent');
    try {
        await client.user.sendEmailVerifyEmail.mutate({
            newEmail: email,
            userId,
            verifyUrl: `${getBaseUrl()}/create-account/verify-email?email=${encodeURIComponent(email)}`,
        });
        return { result: 'SUCCESS', data: undefined };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function verifyEmailVerificationToken({
    email,
    token,
}: {
    email: string;
    token: string;
}): Promise<boolean> {
    try {
        const result = await client.user.verifyEmail.mutate({ email, verificationToken: token });
        if (!result) {
            return false;
        }
        return true;
    } catch (e) {
        console.warn(e);
        return false;
    }
}

export async function createTeam({
    userId,
    teamName,
    productType,
}: {
    userId: string;
    teamName: string;
    productType: string;
}): Promise<Result<string>> {
    // Currently, ZIPPO auto creates teams on user creation, so instead of actually creating a team,
    // we update the user's team to the team name and team type provided

    try {
        const zippoUser = await client.user.getById.query(userId);
        if (!zippoUser) {
            return {
                result: 'ERROR',
                error: new Error('User not found'),
            };
        }
        const result = await client.team.update.mutate({ id: zippoUser.integratorTeamId, name: teamName, productType });

        if (!result) {
            return {
                result: 'ERROR',
                error: new Error('Failed to create team'),
            };
        }
        return {
            result: 'SUCCESS',
            data: result.name,
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function sendResetPasswordEmail({
    userId,
    email,
}: {
    userId: string;
    email: string;
}): Promise<Result<boolean>> {
    try {
        await client.user.sendPasswordResetEmail.mutate({
            userId,
            verifyUrl: `${getBaseUrl()}/reset-password/set-password?email=${encodeURIComponent(email)}`,
        });
        return {
            result: 'SUCCESS',
            data: true,
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function resetPassword({
    password,
    verificationToken,
}: {
    password: string;
    verificationToken: string;
}): Promise<Result<boolean>> {
    try {
        const result = await client.user.resetPassword.mutate({ password, verificationToken });
        if (!result) {
            return {
                result: 'ERROR',
                error: new Error('Invalid token'),
            };
        }
        return {
            result: 'SUCCESS',
            data: true,
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function getUserByEmail({ email }: { email: string }): Promise<Result<User>> {
    try {
        const user = await client.user.getByEmail.query(email);
        if (!user) {
            return {
                result: 'ERROR',
                error: new Error('User not found'),
            };
        }
        return {
            result: 'SUCCESS',
            data: {
                id: user.id,
                email: user.email!, // we only allow signup via email
                teamId: user.integratorTeamId,
                sessionToken: user.integratorTeamId,
                expiresAt: addMinutes(new Date(), 15).toISOString(),
            },
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function loginWithEmailAndPassword({
    email,
    password,
}: {
    email: string;
    password: string;
}): Promise<Result<User>> {
    try {
        const session = await client.session.login.mutate({ email, password });
        if (!session) {
            return {
                result: 'ERROR',
                error: new Error('Invalid email or password'),
            };
        }
        const user = await client.user.getById.query(session.userId);

        // we should have a user and a session at this point
        if (!user) {
            return {
                result: 'ERROR',
                error: new Error('Unknown error'),
            };
        }

        const team = await client.team.getById.query(user.integratorTeamId);

        return {
            result: 'SUCCESS',
            data: {
                id: user.id,
                email: user.email!, // we only allow signup via email
                teamName: team?.name,
                sessionToken: session.sessionToken,
                expiresAt: addMinutes(new Date(), 15).toISOString(),
                teamId: user.integratorTeamId,
            },
        };
    } catch (error) {
        console.warn(error);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function invalidateZippoSession({ sessionToken }: { sessionToken: string }): Promise<void> {
    try {
        await client.session.logout.mutate(sessionToken);
    } catch (e) {
        console.warn(e);
    }
}

export async function getTeam({
    userId,
}: {
    userId: string;
    // i hate this but i want to tie it to the return type of the query
}): Promise<Result<Exclude<RouterOutputs['team']['getById'], null>>> {
    try {
        const user = await client.user.getById.query(userId);
        if (!user) {
            return {
                result: 'ERROR',
                error: new Error('User not found'),
            };
        }
        const team = await client.team.getById.query(user.integratorTeamId);
        if (!team) {
            return {
                result: 'ERROR',
                error: new Error('Team not found'),
            };
        }
        return {
            result: 'SUCCESS',
            data: team,
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function getTeamById({
    teamId,
}: {
    teamId: string;
}): Promise<Result<Awaited<Exclude<RouterOutputs['team']['getById'], null>>>> {
    try {
        const team = await client.team.getById.query(teamId);
        if (!team) {
            return {
                result: 'ERROR',
                error: new Error('Team not found'),
            };
        }
        return {
            result: 'SUCCESS',
            data: team,
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function createApp({
    appName,
    teamId,
    onChainTag,
    onChainTagId,
    ...rest
}: Rename<
    RouterInputs['app']['create'],
    {
        integratorTeamId: 'teamId';
        name: 'appName';
        integratorExternalApp: 'onChainTag';
        integratorExternalAppId: 'onChainTagId';
    }
>): Promise<Result<ClientApp>> {
    try {
        const app = await client.app.create.mutate({
            integratorTeamId: teamId,
            name: appName,
            integratorExternalApp: onChainTag,
            integratorExternalAppId: onChainTagId,
            ...rest,
        });

        if (!app) {
            return {
                result: 'ERROR',
                error: new Error('Failed to create app'),
            };
        }

        return {
            result: 'SUCCESS',
            data: zippoAppToClientApp(app),
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function updateApp({
    appId,
    onChainTagId,
    ...rest
}: Rename<RouterInputs['app']['update'], { id: 'appId'; integratorExternalAppId: 'onChainTagId' }>): Promise<
    Result<ClientApp>
> {
    try {
        const app = await client.app.update.mutate({ id: appId, integratorExternalAppId: onChainTagId, ...rest });
        if (!app) {
            return {
                result: 'ERROR',
                error: new Error('Failed to update app'),
            };
        }

        return {
            result: 'SUCCESS',
            data: zippoAppToClientApp(app),
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function createOnChainTag({
    teamId,
    ...rest
}: OnChainTagParams): Promise<Result<Awaited<Exclude<RouterOutputs['externalApp']['create'], null>>>> {
    try {
        const externalApp = await client.externalApp.create.mutate({ integratorTeamId: teamId, ...rest });
        if (!externalApp) {
            return {
                result: 'ERROR',
                error: new Error('Failed to create external app'),
            };
        }
        return {
            result: 'SUCCESS',
            data: externalApp,
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error while creating onchain tag'),
        };
    }
}

export async function updateProvisionAccess({
    appId,
    rateLimits,
    routeTags,
}: Rename<RouterInputs['app']['provisionAccess'], { id: 'appId' }>): Promise<Result<ClientApp>> {
    try {
        const appRes = await client.app.getById.query(appId);

        if (!appRes) {
            return {
                result: 'ERROR',
                error: new Error('Failed to update app'),
            };
        }

        const routeTagsWithRateLimits = routeTags.map((routeTag, idx) => {
            return {
                routeTag,
                rateLimit: rateLimits[idx],
            };
        });

        const currentProducts = appRes.integratorAccess.map((access) => access.routeTag);

        const productsToDelete = currentProducts.filter((product) => !routeTags.includes(product as TZippoRouteTag));

        const productsToAdd = routeTagsWithRateLimits.filter((product) => !currentProducts.includes(product.routeTag));

        try {
            await client.app.provisionAccess.mutate({
                id: appId,
                rateLimits: productsToAdd.map((product) => product.rateLimit),
                routeTags: productsToAdd.map((product) => product.routeTag) as TZippoRouteTag[],
            });
        } catch (e) {
            console.warn(e);
            return {
                result: 'ERROR',
                error: new Error('Failed to add products'),
            };
        }
        try {
            await client.app.deprovisionAccess.mutate({
                id: appId,
                routeTags: productsToDelete as TZippoRouteTag[],
            });
        } catch (e) {
            console.warn(e);
            return {
                result: 'ERROR',
                error: new Error('Failed to remove products'),
            };
        }

        const updatedApp = await client.app.getById.query(appId);

        if (!updatedApp) {
            return {
                result: 'ERROR',
                error: new Error('Failed to retrieve updated app'),
            };
        }

        return {
            result: 'SUCCESS',
            data: zippoAppToClientApp(updatedApp),
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function addProvisionAccess({
    appId,
    rateLimits,
    routeTags,
}: Rename<RouterInputs['app']['provisionAccess'], { id: 'appId' }>): Promise<Result<ClientApp>> {
    try {
        const res = await client.app.provisionAccess.mutate({ id: appId, rateLimits, routeTags });
        if (!res) {
            return {
                result: 'ERROR',
                error: new Error('Failed to provision access'),
            };
        }
        return {
            result: 'SUCCESS',
            data: zippoAppToClientApp(res),
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function generateAPIKey({
    appId,
    teamId,
    description,
}: Rename<RouterInputs['app']['key']['create'], { integratorAppId: 'appId'; integratorTeamId: 'teamId' }>): Promise<
    Result<string>
> {
    try {
        const res = await client.app.key.create.mutate({
            integratorAppId: appId,
            integratorTeamId: teamId,
            description,
        });
        if (!res || !res.apiKeys || !res.apiKeys.length) {
            return {
                result: 'ERROR',
                error: new Error('Failed to create API key'),
            };
        }
        const newestKey = res.apiKeys[res.apiKeys.length - 1];
        return {
            result: 'SUCCESS',
            data: newestKey.apiKey,
        };
    } catch (e) {
        console.warn(e);
        return {
            result: 'ERROR',
            error: new Error('Unknown error'),
        };
    }
}

export async function appsList(integratorTeamId: RouterInputs['app']['list']): Promise<Result<ClientApp[]>> {
    try {
        const apps = await client.app.list.query(integratorTeamId);
        if (!apps || !apps.length) {
            return {
                result: 'SUCCESS',
                data: [],
            };
        }
        return {
            result: 'SUCCESS',
            data: apps.map(zippoAppToClientApp),
        };
    } catch (error) {
        console.warn(error);
        return {
            result: 'ERROR',
            error: new Error('Failed to fetch apps'),
        };
    }
}
export async function getAppById(id: RouterInputs['app']['getById']): Promise<Result<ClientApp>> {
    try {
        const app = await client.app.getById.query(id);
        if (!app) {
            return {
                result: 'ERROR',
                error: new Error('App not found'),
            };
        }
        return {
            result: 'SUCCESS',
            data: zippoAppToClientApp(app),
        };
    } catch (error) {
        console.warn(error);
        return {
            result: 'ERROR',
            error: new Error('Failed to fetch app'),
        };
    }
}

export async function deleteAppKey(id: RouterInputs['app']['key']['delete']): Promise<Result<ClientApp>> {
    try {
        const app = await client.app.key.delete.mutate(id);
        if (!app) {
            return {
                result: 'ERROR',
                error: new Error('Key not found'),
            };
        }
        return {
            result: 'SUCCESS',
            data: zippoAppToClientApp(app),
        };
    } catch (error) {
        console.warn(error);
        return {
            result: 'ERROR',
            error: new Error('Failed to delete key'),
        };
    }
}

export async function createAppKey({
    appId,
    teamId,
    description,
}: Rename<RouterInputs['app']['key']['create'], { integratorTeamId: 'teamId'; integratorAppId: 'appId' }>): Promise<
    Result<ClientApp>
> {
    try {
        const app = await client.app.key.create.mutate({
            integratorAppId: appId,
            integratorTeamId: teamId,
            description,
        });
        if (!app) {
            return {
                result: 'ERROR',
                error: new Error('Failed to create key'),
            };
        }
        return {
            result: 'SUCCESS',
            data: zippoAppToClientApp(app),
        };
    } catch (error) {
        console.warn(error);
        return {
            result: 'ERROR',
            error: new Error('Failed to create key'),
        };
    }
}
