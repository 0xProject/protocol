import { defineTrpcRouter, TProcedureTree } from 'trpc-toolbox';
import { z } from 'zod';

/**
 * API representation the `User` model in integrator-db prisma schema
 */
const user = z.object({
    name: z.string(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

/**
 * API representation the `IntegratorTeam` model in integrator-db prisma schema
 */
const team = z.object({
    id: z.string().uuid(),
    image: z.string().nullable(),
    name: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const zippoRouterDefinition = {
    user: {
        get: {
            // Get a user by ID
            input: z.string().cuid().describe('The user ID'),
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
                })
                .describe('The information needed to create a user'),
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

            type: 'mutation',
        },
    },
} satisfies TProcedureTree;

export type TZippoRouter = defineTrpcRouter<typeof zippoRouterDefinition>;
