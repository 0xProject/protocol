import { Prisma } from 'integrator-db';
import prisma from '../prisma';
import { z } from 'zod';
import { zippoRouterDefinition } from 'zippo-interface';

const defaultTeamSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    name: true,
    image: true,
    createdAt: true,
    updatedAt: true,
});

const { team: teamRouterDefinition } = zippoRouterDefinition;

/**
 * Get a team by ID.
 */
export async function getById(id: z.output<typeof teamRouterDefinition.get.input>) {
    return prisma.integratorTeam.findUnique({
        where: { id },
        select: defaultTeamSelect,
    });
}

/**
 * Create a new team.
 *
 * @param input Team information
 */
export async function create(parameters: z.output<typeof teamRouterDefinition.create.input>) {
    return await prisma.integratorTeam.create({
        data: { ...parameters },
        select: defaultTeamSelect,
    });
}

/**
 * Update an existing team.
 *
 * @param input Team information
 */
export async function update(
    id: z.output<typeof teamRouterDefinition.update.input>['id'],
    parameters: Omit<z.infer<typeof teamRouterDefinition.update.input>, 'id'>,
) {
    return await prisma.integratorTeam.update({
        where: {
            id,
        },
        data: {
            ...parameters,
        },
        select: defaultTeamSelect,
    });
}
