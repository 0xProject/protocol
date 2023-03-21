import { Prisma } from 'integrator-db';
import prisma from '../prisma';
import { z } from 'zod';
import { zippoRouterDefinition } from 'zippo-interface';
import { randomUUID } from 'crypto';
import {
    deprovisionIntegratorAccess,
    provisionIntegratorAccess,
    provisionIntegratorKey,
    revokeIntegratorKey,
} from '../gateway';

const defaultAppSelect = Prisma.validator<Prisma.IntegratorAppSelect>()({
    id: true,
    name: true,
    description: true,
    affiliateAddress: true,
    category: true,
    createdAt: true,
    updatedAt: true,
    integratorTeamId: true,
    apiKeys: true,
    integratorAccess: true,
});

/**
 * Get a list of apps for a given team ID.
 *
 * @param integratorTeamId Team ID
 */
export async function list(
    integratorTeamId: z.infer<typeof zippoRouterDefinition.app.list.input>,
): Promise<z.infer<typeof zippoRouterDefinition.app.list.output>> {
    return prisma.integratorApp.findMany({
        where: { integratorTeamId },
        select: defaultAppSelect,
    });
}

/**
 * Get an app by ID.
 *
 * @param id App ID
 */
export async function get(
    id: z.infer<typeof zippoRouterDefinition.app.getById.input>,
): Promise<z.infer<typeof zippoRouterDefinition.app.getById.output>> {
    return prisma.integratorApp.findUnique({
        where: { id },
        select: defaultAppSelect,
    });
}

/**
 * Create a new app.
 *
 * @param parameters App information
 */
export async function create(parameters: z.infer<typeof zippoRouterDefinition.app.create.input>) {
    const integratorTeam = await prisma.integratorTeam.findUnique({
        where: { id: parameters.integratorTeamId },
        select: { id: true },
    });
    if (!integratorTeam) {
        throw new Error('Invalid team ID');
    }

    const integratorApp = await prisma.integratorApp.create({
        data: { ...parameters },
        select: defaultAppSelect,
    });

    const apiKey = await generateAndProvisionApiKey(integratorTeam.id, integratorApp.id);

    await prisma.integratorApiKey.create({
        data: {
            integratorAppId: integratorApp.id,
            apiKey,
            description: `${parameters.name} API Key`,
        },
    });

    // make sure to return updated entity that has the new key
    return prisma.integratorApp.findUnique({
        where: { id: integratorApp.id },
        select: defaultAppSelect,
    });
}

/**
 * Update an existing app.
 *
 * @param id App ID
 * @param parameters App information
 */
export async function update(
    id: z.output<typeof zippoRouterDefinition.app.update.input>['id'],
    parameters: Omit<z.infer<typeof zippoRouterDefinition.app.update.input>, 'id'>,
) {
    return prisma.integratorApp.update({
        where: { id },
        data: { ...parameters },
        select: defaultAppSelect,
    });
}

/**
 * Provision an app on the API gateway for the given route-tag/rate-limit pairs.
 *
 * @param id App ID
 * @param routeTags List of route tags
 * @param rateLimits List of rate limits
 */
export async function provisionAccess(
    id: z.output<typeof zippoRouterDefinition.app.provisionAccess.input>['id'],
    routeTags: z.output<typeof zippoRouterDefinition.app.provisionAccess.input>['routeTags'],
    rateLimits: z.output<typeof zippoRouterDefinition.app.provisionAccess.input>['rateLimits'],
) {
    if (routeTags.length !== rateLimits.length) {
        throw new Error('route tag and rate limit arguments must be the same length');
    }

    const integratorApp = await prisma.integratorApp.findUnique({
        where: { id },
        select: { id: true, integratorTeamId: true },
    });
    if (!integratorApp) {
        throw new Error('Invalid app ID');
    }

    if (!(await provisionIntegratorAccess(integratorApp.integratorTeamId, id, routeTags, rateLimits))) {
        throw new Error('Unable to provision access');
    }

    const provisionAccessPromises = routeTags.map(async (routeTag, i) => {
        return prisma.integratorAccess.upsert({
            where: {
                integratorAppId_routeTag: {
                    integratorAppId: integratorApp.id,
                    routeTag,
                },
            },
            create: {
                integratorAppId: integratorApp.id,
                routeTag,
                rateLimit: JSON.stringify(rateLimits[i]),
            },
            update: {
                rateLimit: JSON.stringify(rateLimits[i]),
            },
        });
    });
    await Promise.all(provisionAccessPromises);

    return prisma.integratorApp.findUnique({
        where: { id: integratorApp.id },
        select: defaultAppSelect,
    });
}

/**
 * De-provision an app on the API gateway for the given route-tag/rate-limit pairs.
 *
 * @param id App ID
 * @param routeTags List of route tags
 */
export async function deprovisionAccess(
    id: z.output<typeof zippoRouterDefinition.app.deprovisionAccess.input>['id'],
    routeTags: z.output<typeof zippoRouterDefinition.app.deprovisionAccess.input>['routeTags'],
) {
    const integratorApp = await prisma.integratorApp.findUnique({
        where: { id },
        select: { id: true, integratorTeamId: true },
    });
    if (!integratorApp) {
        throw new Error('Invalid app ID');
    }

    if (!(await deprovisionIntegratorAccess(integratorApp.integratorTeamId, id, routeTags))) {
        throw new Error('Unable to deprovision access');
    }

    await prisma.integratorAccess.deleteMany({
        where: {
            integratorAppId: integratorApp.id,
            routeTag: { in: routeTags },
        },
    });

    return prisma.integratorApp.findUnique({
        where: { id: integratorApp.id },
        select: defaultAppSelect,
    });
}

/**
 * Create a new app api key.
 *
 * @param parameters API key information
 */
export async function createApiKey(parameters: z.infer<typeof zippoRouterDefinition.app.key.create.input>) {
    const integratorApp = await prisma.integratorApp.findUnique({
        where: { id: parameters.integratorAppId },
        select: { id: true, integratorTeamId: true },
    });
    if (!integratorApp || integratorApp.integratorTeamId !== parameters.integratorTeamId) {
        throw new Error('Invalid app ID');
    }

    const { integratorTeamId, ...apiKeyParameters } = parameters;

    const apiKey = await generateAndProvisionApiKey(integratorApp.integratorTeamId, integratorApp.id);

    await prisma.integratorApiKey.create({
        data: {
            ...apiKeyParameters,
            apiKey,
        },
    });

    return prisma.integratorApp.findUnique({
        where: { id: integratorApp.id },
        select: defaultAppSelect,
    });
}

/**
 * Update an existing app api key.
 *
 * @param id API key ID
 * @param parameters API key information
 */
export async function updateApiKey(
    id: z.output<typeof zippoRouterDefinition.app.key.update.input>['id'],
    parameters: Omit<z.infer<typeof zippoRouterDefinition.app.key.update.input>, 'id'>,
) {
    const integratorApiKey = await prisma.integratorApiKey.findUnique({
        where: { id },
    });
    if (!integratorApiKey) {
        throw new Error('Invalid API key ID');
    }

    await prisma.integratorApiKey.update({
        where: { id },
        data: { ...parameters },
    });

    return prisma.integratorApp.findUnique({
        where: { id: integratorApiKey.integratorAppId },
        select: defaultAppSelect,
    });
}

/**
 * Delete an existing app api key.
 *
 * @param id API key ID
 */
export async function deleteApiKey(id: z.infer<typeof zippoRouterDefinition.app.key.delete.input>) {
    const integratorApiKey = await prisma.integratorApiKey.findUnique({
        where: { id },
        include: { app: true },
    });
    if (!integratorApiKey) {
        throw new Error('Invalid API key ID');
    }

    await revokeIntegratorKey(
        integratorApiKey.app.integratorTeamId,
        integratorApiKey.integratorAppId,
        integratorApiKey.apiKey,
    );

    await prisma.integratorApiKey.delete({
        where: { id },
    });

    return prisma.integratorApp.findUnique({
        where: { id: integratorApiKey.integratorAppId },
        select: defaultAppSelect,
    });
}

async function generateAndProvisionApiKey(integratorTeamId: string, integratorAppId: string) {
    const newApiKey = randomUUID();

    if (!(await provisionIntegratorKey(integratorTeamId, integratorAppId, newApiKey))) {
        throw new Error('Unable to provision API key');
    }

    return newApiKey;
}
