import { defineTrpcRouter, TProcedureTree } from 'trpc-toolbox';
import { z } from 'zod';

/**
 * API representation the `User` model in integrator-db
 */
const user = z.object({
    name: z.string(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    id: z.string().uuid(),
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
} satisfies TProcedureTree;

export type TZippoRouter = defineTrpcRouter<typeof zippoRouterDefinition>;
