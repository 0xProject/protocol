import { env } from '../env';
import { KongConsumer, KongKey, KongAcl, KongPlugins, KongPlugin, KongKeys } from './types';
import axios, { AxiosResponse, AxiosHeaders } from 'axios';
import { StatusCodes } from 'http-status-codes';
import { TZippoRateLimit } from 'zippo-interface';

const axiosInstance = axios.create({
    baseURL: env.KONG_ADMIN_URL,
    timeout: env.KONG_ADMIN_HTTP_TIMEOUT,
    headers: {
        Accept: 'application/json',
    },
});

/**
 * Get a consumer object from kong. Swallows errors and returns null.
 * @param appId Kong consumer appId
 */
export async function kongGetConsumer(appId: string): Promise<KongConsumer | null> {
    try {
        const { data, status } = await kongGet<KongConsumer>(`/consumers/${appId}`);
        return status === StatusCodes.OK ? data : null;
    } catch {
        return null;
    }
}

/**
 * Ensure a kong consumer exists.
 * @param appId Kong consumer appId
 */
export async function kongEnsureConsumer(appId: string): Promise<KongConsumer | null> {
    const { data, status } = await kongPut<KongConsumer>(`/consumers/${appId}`);
    return status === StatusCodes.OK ? data : null;
}

export async function kongRemoveConsumer(appId: string): Promise<boolean> {
    try {
        const { status } = await kongDelete(`/consumers/${appId}`);
        return status === StatusCodes.NO_CONTENT;
    } catch {
        return false;
    }
}

/**
 * Ensure the kong zeroex-headers plugin is configured with the app/integrator IDs
 * @param appId Kong consumer appId
 * @param integratorId Integrator ID to map to appId (used in request headers to backend services)
 */
export async function kongEnsureZeroexHeaders(appId: string, integratorId: string): Promise<boolean> {
    let foundPlugin;
    try {
        const { data, status } = await kongGet<KongPlugins>(`/consumers/${appId}/plugins`);
        if (status !== StatusCodes.OK) {
            return false;
        }
        foundPlugin = data.data.find((plugin) => plugin.name === 'zeroex-headers');
    } catch {
        return false;
    }
    if (foundPlugin) {
        return true;
    }
    try {
        const req = {
            name: 'zeroex-headers',
            config: {
                integrator_id: integratorId,
                app_id: appId,
            },
        };
        const { status } = await kongPost(`/consumers/${appId}/plugins`, req);
        return status === StatusCodes.CREATED;
    } catch {
        return false;
    }
}

/**
 * Get a consumer API key object from kong. Swallows errors and returns null.
 * @param appId Kong consumer appId
 * @param key Kong API key
 */
export async function kongGetKey(appId: string, key: string): Promise<KongKey | null> {
    try {
        const { data, status } = await kongGet<KongKeys>(`/consumers/${appId}/key-auth`);
        if (status !== StatusCodes.OK) {
            return null;
        }
        return (data.data.find((keyInfo) => keyInfo.key === key) as KongKey) || null;
    } catch {
        return null;
    }
}

/**
 * Ensure a kong consumer API key exists.
 * @param appId Kong consumer appId
 * @param key Kong API key
 */
export async function kongEnsureKey(appId: string, key: string): Promise<KongKey | null> {
    const existingKey = await kongGetKey(appId, key);
    if (existingKey) {
        const { data, status } = await kongPut<KongKey>(`/consumers/${appId}/key-auth/${existingKey.id}`, { key });
        return status !== StatusCodes.OK ? null : data;
    } else {
        const { data, status } = await kongPost<KongKey>(`/consumers/${appId}/key-auth`, { key });
        return status !== StatusCodes.CREATED ? null : data;
    }
}

/**
 * Remove a key from a consumer
 * @param appId Kong consumer appId
 * @param key Kong API key
 */
export async function kongRemoveKey(appId: string, key: string): Promise<boolean> {
    try {
        const kongKey = await kongGetKey(appId, key);
        if (!kongKey) {
            return false;
        }
        const { status } = await kongDelete(`/consumers/${appId}/key-auth/${kongKey.id}`);
        return status === StatusCodes.NO_CONTENT;
    } catch {
        return false;
    }
}

/**
 * Get a consumer ACL membership. Swallows errors and returns null.
 * @param appId Kong consumer appId
 * @param group Kong ACL group
 */
export async function kongGetAcl(appId: string, group: string): Promise<KongAcl | null> {
    try {
        const { data, status } = await kongGet<KongAcl>(`/consumers/${appId}/acls/${group}`);
        return status === StatusCodes.OK ? data : null;
    } catch {
        return null;
    }
}

/**
 * Ensure a kong consumer ACL membership exists.
 * @param appId Kong consumer appId
 * @param group Kong ACL group
 */
export async function kongEnsureAcl(appId: string, group: string): Promise<KongAcl | null> {
    const { data, status } = await kongPut<KongAcl>(`/consumers/${appId}/acls/${group}`);
    return status === StatusCodes.OK ? data : null;
}

/**
 * Remove a consumer from an ACL membership.
 * @param appId Kong consumer appId
 * @param group Kong ACL group
 */
export async function kongRemoveAcl(appId: string, group: string): Promise<boolean> {
    try {
        const kongAcl = await kongGetAcl(appId, group);
        if (!kongAcl) {
            return false;
        }
        const { status } = await kongDelete(`/consumers/${appId}/acls/${kongAcl.id}`);
        return status === StatusCodes.NO_CONTENT;
    } catch {
        return false;
    }
}

/**
 * Get a consumer rate limit. Swallows errors and returns null.
 * @param appId Kong consumer appId
 * @param routeName route name in which to fetch the rate limit
 */
export async function kongGetRateLimit(appId: string, routeName: string): Promise<KongPlugin<TZippoRateLimit> | null> {
    try {
        const { data, status } = await kongGet<KongPlugins>(`/consumers/${appId}/plugins`);
        if (status !== StatusCodes.OK) {
            return null;
        }
        return (
            (data.data.find(
                (plugin) =>
                    plugin.name === 'rate-limiting' &&
                    plugin.tags &&
                    plugin.tags.length > 0 &&
                    plugin.tags.includes(`zippo_route:${routeName}`),
            ) as KongPlugin<TZippoRateLimit>) || null
        );
    } catch {
        return null;
    }
}

/**
 * Ensure a kong consumer has a rate limit for a specific route.
 * @param appId Kong consumer appId
 * @param routeName route name in which to apply rate limit
 * @param rateLimit rate limit
 */
export async function kongEnsureRateLimit(
    appId: string,
    routeName: string,
    rateLimit: TZippoRateLimit,
): Promise<KongPlugin<TZippoRateLimit> | null> {
    let redisConfig = {};
    if (env.ZIPPO_REDIS_URL) {
        const redisUrl = new URL(env.ZIPPO_REDIS_URL);
        redisConfig = {
            policy: 'redis',
            redis_host: redisUrl.hostname,
            redis_port: parseInt(redisUrl.port || '6379'),
            redis_username: redisUrl.username || null,
            redis_password: redisUrl.password || null,
            redis_database: redisUrl.pathname.length > 1 ? parseInt(redisUrl.pathname.substring(1)) : 0,
            redis_ssl: redisUrl.searchParams.get('ssl') === 'true',
            redis_ssl_verify: redisUrl.searchParams.get('ssl_verify') === 'true',
            redis_timeout: parseInt(redisUrl.searchParams.get('timeout') || '2000'),
        };
    }
    const req = {
        name: 'rate-limiting',
        route: { name: routeName },
        tags: [`zippo_route:${routeName}`],
        config: {
            ...rateLimit,
            ...redisConfig,
            error_message: 'Rate limit exceeded - see https://www.0x.org/rate-limit for more details',
        },
    };

    const existingRateLimit = await kongGetRateLimit(appId, routeName);
    if (existingRateLimit) {
        const { data, status } = await kongPut<KongPlugin<TZippoRateLimit>>(
            `/consumers/${appId}/plugins/${existingRateLimit.id}`,
            req,
        );
        return status !== StatusCodes.OK ? null : data;
    } else {
        const { data, status } = await kongPost<KongPlugin<TZippoRateLimit>>(`/consumers/${appId}/plugins`, req);
        return status !== StatusCodes.CREATED ? null : data;
    }
}

/**
 * Remove the rate limit for a specific route for a consumer
 * @param appId Kong consumer appId
 * @param routeName route name in which to remove rate limit
 */
export async function kongRemoveRateLimit(appId: string, routeName: string): Promise<boolean> {
    try {
        const kongRateLimit = await kongGetRateLimit(appId, routeName);
        if (!kongRateLimit) {
            return false;
        }
        const { status } = await kongDelete(`/consumers/${appId}/plugins/${kongRateLimit.id}`);
        return status === StatusCodes.NO_CONTENT;
    } catch {
        return false;
    }
}

function kongGet<T>(path: string): Promise<AxiosResponse<T>> {
    return axiosInstance.get<T>(path);
}

function kongPost<T, R extends Record<string, unknown> = {}>(path: string, req: R): Promise<AxiosResponse<T>> {
    return axiosInstance.post<T>(path, req, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

function kongPut<T, R extends Record<string, unknown> = {}>(path: string, req?: R): Promise<AxiosResponse<T>> {
    const headers = new AxiosHeaders();
    if (req != null) {
        headers.set('Content-Type', 'application/json');
    }
    return axiosInstance.put<T>(path, req, {
        headers,
    });
}

function kongDelete(path: string): Promise<AxiosResponse> {
    return axiosInstance.delete(path);
}
