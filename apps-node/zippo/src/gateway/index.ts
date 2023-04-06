import { env } from '../env';
import { logger } from '../logger';
import { TZippoRouteTag, TZippoRateLimit, TZippoZeroExHeaders } from 'zippo-interface';

import {
    kongEnsureAcl,
    kongEnsureConsumer,
    kongEnsureKey,
    kongEnsureRateLimit,
    kongEnsureZeroexHeaders,
    kongRemoveAcl,
    kongRemoveConsumer,
    kongRemoveKey,
    kongRemoveRateLimit,
} from './kongGateway';

/**
 * Provision an API key for an app
 * @param appId App ID
 * @param zeroExConfig the zeroex-headers config object
 * @param key API key
 */
export async function provisionAppKey(appId: string, zeroExConfig: TZippoZeroExHeaders, key: string): Promise<boolean> {
    logger.info({ appId }, 'Ensuring app is a kong consumer');
    const kongConsumer = await kongEnsureConsumer(appId);
    if (!kongConsumer) {
        logger.error({ appId }, 'Unable to add kong consumer');
        return false;
    }
    logger.info({ appId }, 'Ensuring app has zeroex headers');
    if (!(await kongEnsureZeroexHeaders(appId, zeroExConfig))) {
        logger.error({ appId }, 'Unable to add zeroex headers');
    }
    logger.info({ appId }, 'Ensuring app api key');
    const kongKey = await kongEnsureKey(appId, key);
    if (!kongKey) {
        logger.error({ appId }, 'Unable to add kong key');
        return false;
    }

    return true;
}

/**
 * Provision a new app with access to specific route(s) with rate limits
 * @param appId App ID
 * @param zeroExConfig the zeroex-headers config object
 * @param routes List of routes to provision access
 * @param rateLimits Rate limits to apply to routes
 */
export async function provisionAppAccess(
    appId: string,
    zeroExConfig: TZippoZeroExHeaders,
    routes: TZippoRouteTag[],
    rateLimits: TZippoRateLimit[],
): Promise<boolean> {
    if (routes.length != rateLimits.length) {
        throw new Error('route and rateLimit array lengths must match');
    }

    logger.info({ appId }, 'Ensuring app is a kong consumer');
    const kongConsumer = await kongEnsureConsumer(appId);
    if (!kongConsumer) {
        logger.error({ appId }, 'Unable to add kong consumer');
        return false;
    }
    logger.info({ appId }, 'Ensuring app has zeroex headers');
    if (!(await kongEnsureZeroexHeaders(appId, zeroExConfig))) {
        logger.error({ appId }, 'Unable to add zeroex headers');
    }

    const grantAccessPromises = routes.map(async (route, i) => {
        const routeInfo = env.ZIPPO_ROUTE_MAP[route];
        let isSuccess = true;
        if (routeInfo) {
            logger.info({ appId, route, groupName: routeInfo.groupName }, 'Ensuring app has group ACL');
            const kongAcl = await kongEnsureAcl(appId, routeInfo.groupName);
            if (!kongAcl) {
                logger.error({ appId, route, groupName: routeInfo.groupName }, 'Unable to add ACL to route');
                isSuccess = false;
            }

            const rateLimitPromises = routeInfo.routeNames.map(async (routeName) => {
                logger.info(
                    { appId, route, routeName, rateLimits: rateLimits[i] },
                    'Ensuring app has route rate-limit',
                );
                const kongRateLimit = await kongEnsureRateLimit(appId, routeName, rateLimits[i]);
                if (!kongRateLimit) {
                    logger.error({ appId, route, routeName }, 'Unable to add rate limit to route');
                    return false;
                }
                return true;
            });
            const rateLimitResults = await Promise.all(rateLimitPromises);

            return isSuccess && !rateLimitResults.includes(false); // if any result failed return false
        }
        throw new Error('Route not found in route map');
    });

    const results = await Promise.all(grantAccessPromises);

    return !results.includes(false); // if any result failed return false
}

/**
 * Deprovision app access for specific route(s)
 * @param appId App ID
 * @param routes List of routes in which to deprovision access
 */
export async function deprovisionAppAccess(appId: string, routes: TZippoRouteTag[]): Promise<boolean> {
    const revokeAccessPromises = routes.map(async (route) => {
        let isSuccess = true;
        const routeInfo = env.ZIPPO_ROUTE_MAP[route];
        if (routeInfo) {
            logger.info({ appId, route, groupName: routeInfo.groupName }, 'Removing app from group ACL');
            if (!(await kongRemoveAcl(appId, routeInfo.groupName))) {
                logger.error({ appId, route, groupName: routeInfo.groupName }, 'Unable to remove ACL from route');
                isSuccess = false;
            }

            const rateLimitPromises = routeInfo.routeNames.map(async (routeName) => {
                logger.info({ appId, route, routeName }, 'Removing app from route rate-limit');
                if (!(await kongRemoveRateLimit(appId, routeName))) {
                    logger.error({ appId, route, routeName }, 'Unable to remove rate limit from route');
                    return false;
                }
                return true;
            });
            const rateLimitResults = await Promise.all(rateLimitPromises);

            return isSuccess && !rateLimitResults.includes(false); // if any result failed return false
        }
        throw new Error('Route not found in route map');
    });

    const results = await Promise.all(revokeAccessPromises);

    return !results.includes(false); // if any result failed return false
}

/**
 * Remove an app completely from the platform
 * @param appId App ID
 */
export async function removeApp(appId: string): Promise<boolean> {
    logger.info({ appId }, 'Removing app as kong consumer');
    const result = await kongRemoveConsumer(appId);
    if (!result) {
        logger.error({ appId }, 'Unable to remove consumer');
    }
    return result;
}

/**
 * Revoke a specific app key
 * @param appId App ID
 * @param key API Key
 */
export async function revokeAppKey(appId: string, key: string): Promise<boolean> {
    logger.info({ appId }, 'Revoking app api key');
    const result = kongRemoveKey(appId, key);
    if (!result) {
        logger.error({ appId }, 'Unable to remove key');
    }
    return result;
}
