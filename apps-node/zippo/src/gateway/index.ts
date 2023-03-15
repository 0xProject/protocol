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
 * Provision an API key for an integrator app
 * @param integratorId Integrator ID
 * @param appId App ID
 * @param key API key
 */
export async function provisionIntegratorKey(integratorId: string, appId: string, key: string): Promise<boolean> {
    const kongConsumer = await kongEnsureConsumer(appId);
    if (!kongConsumer) {
        logger.error({ integratorId, appId }, 'Unable to add kong consumer');
        return false;
    }
    if (!(await kongEnsureRequestTransformer(appId, integratorId))) {
        logger.error({ integratorId, appId }, 'Unable to add request transformer');
    }
    const kongKey = await kongEnsureKey(appId, key);
    if (!kongKey) {
        logger.error({ integratorId, appId }, 'Unable to add kong key');
        return false;
    }

    return true;
}

/**
 * Provision a new integrator app with access to specific route(s) with rate limits
 * @param integratorId Integrator ID
 * @param appId App ID
 * @param routes List of routes to provision access
 * @param rateLimits Rate limits to apply to routes
 */
export async function provisionIntegratorAccess(
    integratorId: string,
    appId: string,
    routes: ZippoRouteTag[],
    rateLimits: ZippoRateLimit[],
): Promise<boolean> {
    if (routes.length != rateLimits.length) {
        throw new Error('route and rateLimit array lengths must match.');
    }

    const kongConsumer = await kongEnsureConsumer(appId);
    if (!kongConsumer) {
        logger.error({ integratorId, appId }, 'Unable to add kong consumer');
        return false;
    }
    if (!(await kongEnsureRequestTransformer(appId, integratorId))) {
        logger.error({ integratorId, appId }, 'Unable to add request transformer');
    }

    const grantAccessPromises = routes.map(async (route, i) => {
        const routeInfo = env.ZIPPO_ROUTE_MAP[route];
        let isSuccess = true;
        if (routeInfo) {
            const kongAcl = await kongEnsureAcl(appId, routeInfo.groupName);
            if (!kongAcl) {
                logger.error({ integratorId, appId, groupName: routeInfo.groupName }, 'Unable to add ACL to route');
                isSuccess = false;
            }

            const rateLimitPromises = routeInfo.routeNames.map(async (routeName) => {
                const kongRateLimit = await kongEnsureRateLimit(appId, routeName, rateLimits[i]);
                if (!kongRateLimit) {
                    logger.error({ integratorId, appId, routeName }, 'Unable to add rate limit to route');
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
 * Deprovision integrator app access for specific route(s)
 * @param integratorId Integrator ID
 * @param appId App ID
 * @param routes List of routes in which to deprovision access
 */
export async function deprovisionIntegratorAccess(
    integratorId: string,
    appId: string,
    routes: ZippoRouteTag[],
): Promise<boolean> {
    const revokeAccessPromises = routes.map(async (route) => {
        let isSuccess = true;
        const routeInfo = env.ZIPPO_ROUTE_MAP[route];
        if (routeInfo) {
            if (!(await kongRemoveAcl(appId, routeInfo.groupName))) {
                logger.error(
                    { integratorId, appId, groupName: routeInfo.groupName },
                    'Unable to remove ACL from route',
                );
                isSuccess = false;
            }

            const rateLimitPromises = routeInfo.routeNames.map(async (routeName) => {
                if (!(await kongRemoveRateLimit(appId, routeName))) {
                    logger.error({ integratorId, appId, routeName }, 'Unable to remove rate limit from route');
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
 * Remove an integrator's app completely from the platform
 * @param integratorId Integrator ID
 * @param appId App ID
 */
export async function removeIntegrator(integratorId: string, appId: string): Promise<boolean> {
    const result = await kongRemoveConsumer(appId);
    if (!result) {
        logger.error({ integratorId, appId }, 'Unable to remove consumer');
    }
    return result;
}

/**
 * Revoke a specific integrator app key
 * @param integratorId Integrator ID
 * @param appId App ID
 * @param key API Key
 */
export async function revokeIntegratorKey(integratorId: string, appId: string, key: string): Promise<boolean> {
    const result = kongRemoveKey(appId, key);
    if (!result) {
        logger.error({ integratorId, appId }, 'Unable to remove key');
    }
    return result;
}
