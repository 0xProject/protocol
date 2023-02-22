import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { z } from 'zod';

/**
 * Validation shape for getting a user by ID.
 */
export const userGetByIdInputShape = z.string().cuid();

/**
 * Input type to get a user by ID.
 */
export type UserGetByIdInput = z.infer<typeof userGetByIdInputShape>;

/**
 * Validation shape for creating a user.
 */
export const userCreateInputShape = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    email: z.string().email().optional(),
    image: z.string().url().optional(),
});

/**
 * Input type to create a user.
 */
export type UserCreateInput = z.infer<typeof userCreateInputShape>;

const defaultUserSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    name: true,
    email: true,
    image: true,
    createdAt: true,
    updatedAt: true,
});

/**
 * Get a user by ID.
 *
 * @param input User ID
 */
export async function getById(input: UserGetByIdInput) {
    return prisma.user.findUnique({
        where: { id: input },
        select: defaultUserSelect,
    });
}

/**
 * Create a new user.
 *
 * @param input User information
 */
export async function create(input: UserCreateInput) {
    // for now, we automatically create a new team for every new user
    const integratorTeam = await createIntegratorTeam();

    return prisma.user.create({
        data: {
            ...input,
            integratorTeamId: integratorTeam.id,
        },
        select: defaultUserSelect,
    });
}

//TODO: replace this with actual team creation method import
function createIntegratorTeam() {
    return prisma.integratorTeam.create({
        data: {
            name: 'My Team',
            image: '',
        },
    });
}
