import { Prisma } from 'integrator-db';
import prisma from '../prisma';
import { z } from 'zod';
import { zippoRouterDefinition } from 'zippo-interface';

const defaultTeamSelect = Prisma.validator<Prisma.IntegratorTeamSelect>()({
    id: true,
    name: true,
    image: true,
    productType: true,
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
export async function create(input: z.output<typeof teamRouterDefinition.create.input>) {
    return prisma.integratorTeam.create({
        data: { ...input },
        select: defaultTeamSelect,
    });
}

/**
 * Update an existing team.
 *
 * @param id Team ID
 * @param input Team information
 */
export async function update(
    id: z.output<typeof teamRouterDefinition.update.input>['id'],
    input: Omit<z.infer<typeof teamRouterDefinition.update.input>, 'id'>,
) {
    return prisma.integratorTeam.update({
        where: {
            id,
        },
        data: {
            ...input,
        },
        select: defaultTeamSelect,
    });
}
