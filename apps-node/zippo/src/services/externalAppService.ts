import { Prisma } from 'integrator-db';
import prisma from '../prisma';
import { z } from 'zod';
import { zippoRouterDefinition } from 'zippo-interface';

const defaultExternalAppSelect = Prisma.validator<Prisma.IntegratorExternalAppSelect>()({
    id: true,
    name: true,
    description: true,
    image: true,
    createdAt: true,
    updatedAt: true,
    integratorTeamId: true,
});

/**
 * Get a list of external apps for a given team ID.
 *
 * @param integratorTeamId Team ID
 */
export async function list(
    integratorTeamId: z.infer<typeof zippoRouterDefinition.externalApp.list.input>,
): Promise<z.infer<typeof zippoRouterDefinition.externalApp.list.output>> {
    return prisma.integratorExternalApp.findMany({
        where: { integratorTeamId },
        select: defaultExternalAppSelect,
    });
}

/**
 * Get an external app by ID.
 *
 * @param id External App ID
 */
export async function getById(
    id: z.infer<typeof zippoRouterDefinition.externalApp.getById.input>,
): Promise<z.infer<typeof zippoRouterDefinition.externalApp.getById.output>> {
    return prisma.integratorExternalApp.findUnique({
        where: { id },
        select: defaultExternalAppSelect,
    });
}

/**
 * Create a new external app.
 *
 * @param parameters external app information
 */
export async function create(parameters: z.infer<typeof zippoRouterDefinition.externalApp.create.input>) {
    const integratorTeam = await prisma.integratorTeam.findUnique({
        where: { id: parameters.integratorTeamId },
        select: { id: true },
    });
    if (!integratorTeam) {
        throw new Error('Invalid team ID');
    }

    return prisma.integratorExternalApp.create({
        data: { ...parameters },
        select: defaultExternalAppSelect,
    });
}

/**
 * Update an existing external app.
 *
 * @param id External App ID
 * @param parameters external app information
 */
export async function update(
    id: z.output<typeof zippoRouterDefinition.externalApp.update.input>['id'],
    parameters: Omit<z.infer<typeof zippoRouterDefinition.externalApp.update.input>, 'id'>,
) {
    return prisma.integratorExternalApp.update({
        where: { id },
        data: { ...parameters, approvedAt: null },
        select: defaultExternalAppSelect,
    });
}

/**
 * Approve metadata for an existing external app and alert kafka bus.
 *
 * @param id External App ID
 */
export async function approve(id: z.infer<typeof zippoRouterDefinition.externalApp.getById.input>) {
    // TODO: send kafka event to alert downstream systems

    return prisma.integratorExternalApp.update({
        where: { id },
        data: { approvedAt: new Date() },
        select: defaultExternalAppSelect,
    });
}
