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
    createdAt: z.date(),
    updatedAt: z.date(),
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
                    integratorTeamId: z.string().cuid().optional(),
                    integratorTeam: z
                        .object({
                            name: z.string().min(1, { message: 'Name is required' }),
                            image: z.string().url().optional(),
                        })
                        .optional(),
                })
                .describe('The information needed to create a user'),
            output: user.describe('The newly created user'),
            type: 'mutation',
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
            }),
            output: team.describe('The newly created team'),
            type: 'mutation',
        },
        update: {
            // Update an existing team
            input: z
                .object({
                    name: z.string().min(1, { message: 'Name is required' }),
                    image: z.string().url().optional(),
                })
                .partial()
                .merge(z.object({ id: z.string().cuid().describe('The team ID') })),
            output: team.describe('The updated team'),
            type: 'mutation',
        },
    },
} satisfies TProcedureTree;

export type TZippoRouter = defineTrpcRouter<typeof zippoRouterDefinition>;
