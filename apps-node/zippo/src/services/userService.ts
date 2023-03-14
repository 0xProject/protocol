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
    integratorTeamId: true,
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
    const { integratorTeamId, integratorTeam, ...userParameters } = createUserParameters;

    let teamEntity;

    // if we are given an explicit team ID - use that (if it exists in the db)
    if (integratorTeamId) {
        teamEntity = await prisma.integratorTeam.findUnique({
            where: { id: integratorTeamId },
        });
    }
    // else if we are given team parameters - use those to create a new team
    if (!teamEntity && integratorTeam) {
        teamEntity = await prisma.integratorTeam.create({
            data: { ...integratorTeam },
        });
    }
    // else fallback to creating a new team for this user
    if (!teamEntity) {
        teamEntity = await prisma.integratorTeam.create({
            data: { name: 'My Team' },
        });
    }

    return prisma.user.create({
        data: {
            ...userParameters,
            integratorTeamId: teamEntity.id,
        },
        select: defaultUserSelect,
    });
}
