import { env } from '../env';
import { logger } from '../logger';
import { ZippoRouteTag, ZippoRateLimit } from './types';
import {
    kongEnsureAcl,
    kongEnsureConsumer,
    kongEnsureKey,
    kongEnsureRateLimit,
    kongEnsureRequestTransformer,
    kongRemoveAcl,
    kongRemoveConsumer,
    kongRemoveKey,
    kongRemoveRateLimit,
} from './kongGateway';

/**
 * Provision an API key for an integrator project
 * @param integratorId Integrator ID
 * @param projectId Project ID
 * @param key API key
 */
export async function provisionIntegratorKey(integratorId: string, projectId: string, key: string): Promise<boolean> {
    const kongConsumer = await kongEnsureConsumer(projectId);
    if (!kongConsumer) {
        logger.error({ integratorId, projectId }, 'Unable to add kong consumer');
        return false;
    }
    if (!(await kongEnsureRequestTransformer(projectId, integratorId))) {
        logger.error({ integratorId, projectId }, 'Unable to add request transformer');
    }
    const kongKey = await kongEnsureKey(projectId, key);
    if (!kongKey) {
        logger.error({ integratorId, projectId }, 'Unable to add kong key');
        return false;
    }

    return true;
}

/**
 * Provision a new integrator project with access to specific route(s) with rate limits
 * @param integratorId Integrator ID
 * @param projectId Project ID
 * @param routes List of routes to provision access
 * @param rateLimits Rate limits to apply to routes
 */
export async function provisionIntegratorAccess(
    integratorId: string,
    projectId: string,
    routes: ZippoRouteTag[],
    rateLimits: ZippoRateLimit[],
): Promise<boolean> {
    if (routes.length != rateLimits.length) {
        throw new Error('route and rateLimit array lengths must match.');
    }

    const kongConsumer = await kongEnsureConsumer(projectId);
    if (!kongConsumer) {
        logger.error({ integratorId, projectId }, 'Unable to add kong consumer');
        return false;
    }
    if (!(await kongEnsureRequestTransformer(projectId, integratorId))) {
        logger.error({ integratorId, projectId }, 'Unable to add request transformer');
    }

    const grantAccessPromises = routes.map(async (route, i) => {
        const routeInfo = env.ZIPPO_ROUTE_MAP[route];
        let isSuccess = true;
        if (routeInfo) {
            const kongAcl = await kongEnsureAcl(projectId, routeInfo.groupName);
            if (!kongAcl) {
                logger.error({ integratorId, projectId, groupName: routeInfo.groupName }, 'Unable to add ACL to route');
                isSuccess = false;
            }

            const rateLimitPromises = routeInfo.routeNames.map(async (routeName) => {
                const kongRateLimit = await kongEnsureRateLimit(projectId, routeName, rateLimits[i]);
                if (!kongRateLimit) {
                    logger.error({ integratorId, projectId, routeName }, 'Unable to add rate limit to route');
                    return false;
                }
                return true;
            });
            const rateLimitResults = await Promise.all(rateLimitPromises);

            return isSuccess && !rateLimitResults.includes(false); // if any result failed return false
        }
        throw new Error('Route not found in route map.');
    });

    const results = await Promise.all(grantAccessPromises);

    return !results.includes(false); // if any result failed return false
}

/**
 * Deprovision integrator project access for specific route(s)
 * @param integratorId Integrator ID
 * @param projectId Project ID
 * @param routes List of routes in which to deprovision access
 */
export async function deprovisionIntegratorAccess(
    integratorId: string,
    projectId: string,
    routes: ZippoRouteTag[],
): Promise<boolean> {
    const revokeAccessPromises = routes.map(async (route) => {
        let isSuccess = true;
        const routeInfo = env.ZIPPO_ROUTE_MAP[route];
        if (routeInfo) {
            if (!(await kongRemoveAcl(projectId, routeInfo.groupName))) {
                logger.error(
                    { integratorId, projectId, groupName: routeInfo.groupName },
                    'Unable to remove ACL from route',
                );
                isSuccess = false;
            }

            const rateLimitPromises = routeInfo.routeNames.map(async (routeName) => {
                if (!(await kongRemoveRateLimit(projectId, routeName))) {
                    logger.error({ integratorId, projectId, routeName }, 'Unable to remove rate limit from route');
                    return false;
                }
                return true;
            });
            const rateLimitResults = await Promise.all(rateLimitPromises);

            return isSuccess && !rateLimitResults.includes(false); // if any result failed return false
        }
        throw new Error('Route not found in route map.');
    });

    const results = await Promise.all(revokeAccessPromises);

    return !results.includes(false); // if any result failed return false
}

/**
 * Remove an integrator's project completely from the platform
 * @param integratorId Integrator ID
 * @param projectId Project ID
 */
export async function removeIntegrator(integratorId: string, projectId: string): Promise<boolean> {
    const result = await kongRemoveConsumer(projectId);
    if (!result) {
        logger.error({ integratorId, projectId }, 'Unable to remove consumer');
    }
    return result;
}

/**
 * Revoke a specific integrator project key
 * @param integratorId Integrator ID
 * @param projectId Project ID
 * @param key API Key
 */
export async function revokeIntegratorKey(integratorId: string, projectId: string, key: string): Promise<boolean> {
    const result = kongRemoveKey(projectId, key);
    if (!result) {
        logger.error({ integratorId, projectId }, 'Unable to remove key');
    }
    return result;
}
