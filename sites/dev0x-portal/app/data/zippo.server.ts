import type { App } from '../types';
import { addMinutes } from 'date-fns';
import type { User } from '../auth.server';
import type { Result } from '../types';
import { client } from './trpc.server';

export const NO_TEAM_MARKER = '__not_init' as const;

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
            name: `${firstName} ${lastName}`,
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
        await client.user.sendEmailVerifyEmail.mutate({ newEmail: email, userId });
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

export async function sendResetPasswordEmail({ userId }: { userId: string }): Promise<Result<boolean>> {
    try {
        await client.user.sendPasswordResetEmail.mutate({ userId });
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
const APPS = [
    {
        name: 'Demo app',
        brandColor: '#01A74D',
        encodedUrlPathname: 'demo-app',
        onChainTag: [
            {
                name: 'Swap API',
                color: 'green',
            },
            {
                name: 'Orderbook',
                color: 'blue',
            },
        ],
    },
    {
        name: 'Coinbase wallet',
        brandColor: '#3A65EB',
        encodedUrlPathname: 'coinbase-wallet',
        onChainTag: [
            {
                name: 'Token Registry',
                color: 'brown',
            },
            {
                name: 'Tx History',
                color: 'purple',
            },
            {
                name: 'Tx Relay',
                color: 'yellow',
            },
        ],
    },
];
export async function getApps(): Promise<App[]> {
    return APPS;
}
export async function getApp(appPathName: string): Promise<App | undefined> {
    return APPS.find((app) => app.encodedUrlPathname === appPathName);
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
                team: user.integratorTeamId,
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
                team: team?.name ?? null,
                sessionToken: session.sessionToken,
                expiresAt: addMinutes(new Date(), 15).toISOString(),
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
