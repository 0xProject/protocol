import { defineTrpcRouter, TProcedureTree } from 'trpc-toolbox';
import { z } from 'zod';

/**
 * API representation the `User` model in integrator-db prisma schema
 */
const user = z.object({
    name: z.string(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    id: z.string().cuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    integratorTeamId: z.string(),
});

/**
 * API representation the `IntegratorTeam` model in integrator-db prisma schema
 */
const team = z.object({
    id: z.string().cuid(),
    image: z.string().nullable(),
    name: z.string(),
    productType: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
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
                    name: z.string().min(1, { message: 'Name is required' }),
                    email: z.string().email().optional(),
                    image: z.string().url().optional(),
                    password: z.string().min(1, { message: 'Password is required' }),
                    integratorTeamId: z.string().cuid().optional(),
                    integratorTeam: z
                        .object({
                            name: z.string().min(1, { message: 'Name is required' }),
                            image: z.string().url().optional(),
                            productType: z.string().min(1, { message: 'Product type is required' }),
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
                    name: z.string().min(1, { message: 'Name is required' }),
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
            input: z.string().cuid().describe('Session token ID'),
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
        get: {
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
                })
                .partial()
                .merge(z.object({ id: z.string().cuid().describe('The team ID') })),
            output: team.strip().nullable().describe('The updated team'),
            type: 'mutation',
        },
    },
} satisfies TProcedureTree;

export type TZippoRouter = defineTrpcRouter<typeof zippoRouterDefinition>;
