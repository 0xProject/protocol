import { Prisma } from 'integrator-db';
import prisma from '../prisma';
import { z } from 'zod';
import { zippoRouterDefinition } from 'zippo-interface';

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
export async function getById(
    id: z.infer<typeof zippoRouterDefinition.user.get.input>,
): Promise<z.infer<typeof zippoRouterDefinition.user.get.output>> {
    return prisma.user.findUnique({
        where: { id },
        select: defaultUserSelect,
    });
}

/**
 * Create a new user.
 */
export async function create(createUserParameters: z.infer<typeof zippoRouterDefinition.user.create.input>) {
    // for now, we automatically create a new team for every new user
    const integratorTeam = await createIntegratorTeam();

    return prisma.user.create({
        data: {
            ...createUserParameters,
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
