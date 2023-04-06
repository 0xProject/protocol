import { defineTrpcRouter, TProcedureTree } from 'trpc-toolbox';
import { z } from 'zod';

export enum TZippoRouteTag {
    SwapV1 = 'swap_v1_route',
    SwapV1Prices = 'swap_v1_prices_route',
    OrderbookV1 = 'orderbook_v1_route',
    MetatxnV1 = 'metatxn_v1_route',
    MetatxnV2 = 'metatxn_v2_route',
    TxrelayV1 = 'txrelay_v1_route',
}

export interface TZippoRateLimit {
    second?: number;
    minute?: number;
    hour?: number;
    day?: number;
}

export interface TZippoZeroExHeaders {
    team_id: string;
    app_id: string;
    tier?: string | null;
    app_properties?: string | null;
    affiliate_address?: string | null;
    legacy_integrator_id?: string | null;
}

const tierModel = z.enum(['dev', 'growth', 'enterprise']);
export type TZippoTier = z.infer<typeof tierModel>;

/**
 * API representation the `User` model in integrator-db prisma schema
 */
const user = z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    id: z.string().cuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    integratorTeamId: z.string().cuid(),
});

/**
 * API representation the `IntegratorTeam` model in integrator-db prisma schema
 */
const team = z.object({
    id: z.string().cuid(),
    image: z.string().nullable(),
    name: z.string(),
    productType: z.string(),
    tier: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

/**
 * API representation the `IntegratorApiKey` model in integrator-db prisma schema
 */
const apiKey = z.object({
    id: z.string().cuid(),
    apiKey: z.string().uuid(),
    description: z.string().nullable(),
    disabled: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
    integratorAppId: z.string().cuid(),
});

/**
 * API representation the `IntegratorAccess` model in integrator-db prisma schema
 */
const integratorAccess = z.object({
    routeTag: z.string(),
    rateLimit: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    integratorAppId: z.string().cuid(),
});

/**
 * API representation the `IntegratorExternalApp` model in integrator-db prisma schema
 */
const externalApp = z.object({
    id: z.string().cuid(),
    name: z.string(),
    description: z.string().nullable(),
    image: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    integratorTeamId: z.string().cuid(),
});

/**
 * API representation the `IntegratorApp` model in integrator-db prisma schema
 */
const app = z.object({
    id: z.string().cuid(),
    name: z.string(),
    description: z.string().nullable(),
    affiliateAddress: z.string().nullable(),
    legacyIntegratorId: z.string().uuid().nullable(),
    category: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    integratorTeamId: z.string().cuid(),
    apiKeys: z.array(apiKey),
    integratorAccess: z.array(integratorAccess),
    integratorExternalApp: externalApp.nullable(),
});

/**
 * API representation the `Session` model in integrator-db prisma schema
 */
const session = z.object({
    id: z.string().cuid(),
    sessionToken: z.string(),
    userId: z.string().cuid(),
    expires: z.date(),
});

/**
 * API representation of a Mailgun `MessagesSendResult`
 */
const messageSendResult = z.object({
    id: z.string().optional(),
    message: z.string().optional(),
    status: z.number(),
    details: z.string().optional(),
});

export const zippoRouterDefinition = {
    user: {
        getById: {
            // Get a user by ID
            input: z.string().cuid().describe('The user ID'),
            output: user.strip().nullable().describe('The user, or null if not found'),
            type: 'query',
        },
        getByEmail: {
            // Get a user by email
            input: z.string().email().describe('The user email'),
            output: user.strip().nullable().describe('The user, or null if not found'),
            type: 'query',
        },
        create: {
            // Create a new user
            input: z
                .object({
                    firstName: z.string().min(1, { message: 'First name is required' }),
                    lastName: z.string().min(1, { message: 'Last name is required' }),
                    email: z.string().email().optional(),
                    image: z.string().url().optional(),
                    password: z.string().min(1, { message: 'Password is required' }),
                    integratorTeamId: z.string().cuid().optional(),
                    integratorTeam: z
                        .object({
                            name: z.string().min(1, { message: 'Name is required' }),
                            image: z.string().url().optional(),
                            productType: z.string().min(1, { message: 'Product type is required' }),
                            tier: tierModel.optional().default('dev'),
                        })
                        .optional(),
                })
                .describe('The information needed to create a user'),
            output: user.strip().nullable().describe('The newly created user, or null'),
            type: 'mutation',
        },
        update: {
            // Update an existing team
            input: z
                .object({
                    firstName: z.string().min(1, { message: 'First name is required' }),
                    lastName: z.string().min(1, { message: 'Last name is required' }),
                    email: z.string().email().optional(),
                    image: z.string().url().optional(),
                    password: z.string().min(1, { message: 'Password is required' }),
                })
                .partial()
                .merge(z.object({ id: z.string().cuid().describe('The user ID') })),
            output: user.strip().nullable().describe('The updated user'),
            type: 'mutation',
        },
        verifyEmail: {
            // Verify a user email
            input: z
                .object({
                    verificationToken: z.string({ required_error: 'Verification token is required' }).cuid(),
                    email: z.string({ required_error: 'Email is required' }).email({ message: 'Invalid email' }),
                })
                .describe('The information needed to verify a user email'),
            output: user.strip().nullable().describe('The updated user, emailVerifiedAt will be set to current date'),
            type: 'mutation',
        },
        resetPassword: {
            // Reset a user password
            input: z
                .object({
                    verificationToken: z.string({ required_error: 'Verification token is required' }).cuid(),
                    password: z.string({ required_error: 'Password is required' }),
                })
                .describe('The information needed perform a password reset'),
            output: user.strip().nullable().describe('The updated user, or null'),
            type: 'mutation',
        },
        sendPasswordResetEmail: {
            //send a email to allow a user to change their password
            input: z
                .object({
                    userId: z.string().cuid().describe('The user ID'),
                    verifyUrl: z.string().url().describe('The password reset URL to put in the email'),
                })
                .describe('The information needed to send a password reset email'),
            output: messageSendResult.strip().nullable().describe('The message resolution.'),
            type: 'mutation',
        },
        sendEmailVerifyEmail: {
            //send an email to verify an email address
            input: z
                .object({
                    userId: z.string().cuid().describe('The user ID'),
                    newEmail: z
                        .string({ required_error: 'Email address is required' })
                        .email({ message: 'Invalid email' }),
                    verifyUrl: z.string().url().describe('The email verify URL to put in the email'),
                })
                .describe('The information needed to send an email address verification email'),
            output: messageSendResult.strip().nullable().describe('The message resolution.'),
            type: 'mutation',
        },
        sendEmail: {
            //send a link either for password reset or email verification
            input: z
                .object({
                    userId: z.string().cuid().describe('The user ID'),
                    subject: z.string({ required_error: 'Email subject is required' }),
                    template: z.string({ required_error: 'Mailgun template is required' }),
                    emailVars: z.record(z.string()).optional(),
                })
                .describe('The information needed to send a an email to the user'),
            output: messageSendResult.strip().nullable().describe('The message resolution.'),
            type: 'mutation',
        },
    },
    session: {
        login: {
            // Generate session token
            input: z
                .object({
                    email: z.string({ required_error: 'Email is required' }).email(),
                    password: z.string({ required_error: 'Password is required' }),
                })
                .describe('The information needed to generate a session token'),
            output: session.strip().nullable().describe('The newly created session token'),
            type: 'mutation',
        },
        logout: {
            // Delete session token
            input: z.string().describe('Session token'),
            type: 'mutation',
        },
        getSession: {
            // Fetch a session token
            input: z.string({ required_error: 'User Id is required' }).cuid().describe('Get session token for userId'),
            output: session.strip().nullable().describe('Returns session token info'),
            type: 'query',
        },
    },
    team: {
        getById: {
            // Get a team by its ID
            input: z.string().cuid().describe('The team ID'),
            output: team.strip().nullable().describe('The team, or null if not found'),
            type: 'query',
        },
        create: {
            // Create a new team
            input: z.object({
                name: z.string().min(1, { message: 'Name is required' }),
                image: z.string().url().optional(),
                productType: z.string().min(1, { message: 'Project type is required' }),
                tier: tierModel.optional().default('dev'),
            }),
            output: team.strip().nullable().describe('The newly created team'),
            type: 'mutation',
        },
        update: {
            // Update an existing team
            input: z
                .object({
                    name: z.string().min(1).optional(),
                    image: z.string().url().optional(),
                    productType: z.string().optional(),
                    tier: tierModel.optional(),
                })
                .partial()
                .merge(z.object({ id: z.string().cuid().describe('The team ID') })),
            output: team.strip().nullable().describe('The updated team'),
            type: 'mutation',
        },
    },
    externalApp: {
        list: {
            // Get a list of external apps for a given team
            input: z.string().cuid().describe('The team ID'),
            output: z.array(externalApp.strip().describe('The list of external apps')),
            type: 'query',
        },
        getById: {
            // Get an external app by its ID
            input: z.string().cuid().describe('The external app ID'),
            output: externalApp.strip().nullable().describe('The external app, or null if not found'),
            type: 'query',
        },
        create: {
            // Create a new external app
            input: z.object({
                integratorTeamId: z.string().cuid(),
                name: z.string().min(1, { message: 'Name is required' }),
                description: z.string().optional(),
                image: z.string().optional(),
            }),
            output: externalApp.nullable().describe('The newly created external app'),
            type: 'mutation',
        },
        update: {
            // Update an existing external app
            input: z
                .object({
                    name: z.string().min(1, { message: 'Name is required' }),
                    description: z.string().optional(),
                    image: z.string().optional(),
                })
                .partial()
                .merge(z.object({ id: z.string().cuid().describe('The external app ID') })),
            output: externalApp.nullable().describe('The updated external app'),
            type: 'mutation',
        },
        approve: {
            // Approve an existing external app
            input: z.string().cuid().describe('The external app ID'),
            output: externalApp.nullable().describe('The updated external app'),
            type: 'mutation',
        },
    },
    app: {
        list: {
            // Get a list of apps for a given team
            input: z.string().cuid().describe('The team ID'),
            output: z.array(app.strip().describe('The list of apps')),
            type: 'query',
        },
        getById: {
            // Get an app by its ID
            input: z.string().cuid().describe('The app ID'),
            output: app.strip().nullable().describe('The app, or null if not found'),
            type: 'query',
        },
        create: {
            // Create a new app
            input: z.object({
                integratorTeamId: z.string().cuid(),
                name: z.string().min(1, { message: 'Name is required' }),
                description: z.string().optional(),
                affiliateAddress: z.string().optional(),
                legacyIntegratorId: z.string().optional(),
                category: z.string().optional(),
                apiKey: z.string().optional(),
                integratorExternalAppId: z.string().cuid().optional(),
                integratorExternalApp: z
                    .object({
                        name: z.string().min(1, { message: 'Name is required' }),
                        description: z.string().optional(),
                        image: z.string().url().optional(),
                    })
                    .optional(),
            }),
            output: app.nullable().describe('The newly created app'),
            type: 'mutation',
        },
        update: {
            // Update an existing app
            input: z
                .object({
                    name: z.string().min(1, { message: 'Name is required' }),
                    description: z.string().optional(),
                    affiliateAddress: z.string().optional(),
                    legacyIntegratorId: z.string().optional(),
                    category: z.string().optional(),
                    integratorExternalAppId: z.string().cuid().optional(),
                })
                .partial()
                .merge(z.object({ id: z.string().cuid().describe('The app ID') })),
            output: app.nullable().describe('The updated app'),
            type: 'mutation',
        },
        provisionAccess: {
            // Provision access for an app to a given set of route-tag/rate-limit pairs
            input: z.object({
                id: z.string().cuid().describe('The app ID'),
                routeTags: z.array(z.nativeEnum(TZippoRouteTag)),
                rateLimits: z.array(
                    z
                        .object({
                            second: z.number().optional(),
                            minute: z.number().optional(),
                            hour: z.number().optional(),
                            day: z.number().optional(),
                        })
                        .partial(),
                ),
            }),
            output: app.nullable().describe('The updated app'),
            type: 'mutation',
        },
        deprovisionAccess: {
            // De-provision access for an app to a given set of route-tags
            input: z.object({
                id: z.string().cuid().describe('The app ID'),
                routeTags: z.array(z.nativeEnum(TZippoRouteTag)),
            }),
            output: app.nullable().describe('The updated app'),
            type: 'mutation',
        },
        key: {
            create: {
                // Create a new app api key
                input: z.object({
                    integratorTeamId: z.string().cuid(),
                    integratorAppId: z.string().cuid(),
                    description: z.string().optional(),
                    apiKey: z.string().optional(),
                }),
                output: app.nullable().describe('The app with the new key'),
                type: 'mutation',
            },
            update: {
                // Update an existing app api key
                input: z
                    .object({
                        description: z.string().optional(),
                    })
                    .partial()
                    .merge(z.object({ id: z.string().cuid().describe('The key ID') })),
                output: app.nullable().describe('The app with the updated key'),
                type: 'mutation',
            },
            delete: {
                // Delete an app api key
                input: z.string().cuid().describe('The key ID'),
                output: app.nullable().describe('The app with the removed key'),
                type: 'mutation',
            },
        },
    },
} satisfies TProcedureTree;

export type TZippoRouter = defineTrpcRouter<typeof zippoRouterDefinition>;
