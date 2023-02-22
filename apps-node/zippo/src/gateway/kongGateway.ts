import { env } from '../env';
import { KongConsumer, KongKey, KongAcl, KongPlugins, KongPlugin, ZippoRateLimit, KongKeys } from './types';
import axios, { AxiosResponse, AxiosHeaders } from 'axios';
import { StatusCodes } from 'http-status-codes';

const axiosInstance = axios.create({
    baseURL: env.KONG_ADMIN_URL,
    timeout: env.KONG_ADMIN_HTTP_TIMEOUT,
    headers: {
        Accept: 'application/json',
    },
});

/**
 * Get a consumer object from kong. Swallows errors and returns null.
 * @param projectId Kong consumer projectId
 */
export async function kongGetConsumer(projectId: string): Promise<KongConsumer | null> {
    try {
        const { data, status } = await kongGet<KongConsumer>(`/consumers/${projectId}`);
        return status === StatusCodes.OK ? data : null;
    } catch {
        return null;
    }
}

/**
 * Ensure a kong consumer exists.
 * @param projectId Kong consumer projectId
 */
export async function kongEnsureConsumer(projectId: string): Promise<KongConsumer | null> {
    const { data, status } = await kongPut<KongConsumer>(`/consumers/${projectId}`);
    return status === StatusCodes.OK ? data : null;
}

export async function kongRemoveConsumer(projectId: string): Promise<boolean> {
    try {
        const { status } = await kongDelete(`/consumers/${projectId}`);
        return status === StatusCodes.NO_CONTENT;
    } catch {
        return false;
    }
}

/**
 * Ensure the kong request-transformer plugin is configured for the project
 * @param projectId Kong consumer projectId
 * @param integratorId Integrator ID to map to projectId (used in request headers to backend services)
 */
export async function kongEnsureRequestTransformer(projectId: string, integratorId: string): Promise<boolean> {
    let foundPlugin;
    try {
        const { data, status } = await kongGet<KongPlugins>(`/consumers/${projectId}/plugins`);
        if (status !== StatusCodes.OK) {
            return false;
        }
        foundPlugin = data.data.find((plugin) => plugin.name === 'request-transformer');
    } catch {
        return false;
    }
    if (foundPlugin) {
        return true;
    }
    try {
        const req = {
            name: 'request-transformer',
            config: {
                rename: {
                    headers: ['X-Consumer-Username:0x-Project-Id'],
                },
                add: {
                    headers: ['0x-Integrator-Id:' + integratorId],
                },
            },
        };
        const { status } = await kongPost(`/consumers/${projectId}/plugins`, req);
        return status === StatusCodes.CREATED;
    } catch {
        return false;
    }
}

/**
 * Get a consumer API key object from kong. Swallows errors and returns null.
 * @param projectId Kong consumer projectId
 * @param key Kong API key
 */
export async function kongGetKey(projectId: string, key: string): Promise<KongKey | null> {
    try {
        const { data, status } = await kongGet<KongKeys>(`/consumers/${projectId}/key-auth`);
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
 * @param projectId Kong consumer projectId
 * @param key Kong API key
 */
export async function kongEnsureKey(projectId: string, key: string): Promise<KongKey | null> {
    const existingKey = await kongGetKey(projectId, key);
    if (existingKey) {
        const { data, status } = await kongPut<KongKey>(`/consumers/${projectId}/key-auth/${existingKey.id}`, { key });
        return status !== StatusCodes.OK ? null : data;
    } else {
        const { data, status } = await kongPost<KongKey>(`/consumers/${projectId}/key-auth`, { key });
        return status !== StatusCodes.CREATED ? null : data;
    }
}

/**
 * Remove a key from a consumer
 * @param projectId Kong consumer projectId
 * @param key Kong API key
 */
export async function kongRemoveKey(projectId: string, key: string): Promise<boolean> {
    try {
        const kongKey = await kongGetKey(projectId, key);
        if (!kongKey) {
            return false;
        }
        const { status } = await kongDelete(`/consumers/${projectId}/key-auth/${kongKey.id}`);
        return status === StatusCodes.NO_CONTENT;
    } catch {
        return false;
    }
}

/**
 * Get a consumer ACL membership. Swallows errors and returns null.
 * @param projectId Kong consumer projectId
 * @param group Kong ACL group
 */
export async function kongGetAcl(projectId: string, group: string): Promise<KongAcl | null> {
    try {
        const { data, status } = await kongGet<KongAcl>(`/consumers/${projectId}/acls/${group}`);
        return status === StatusCodes.OK ? data : null;
    } catch {
        return null;
    }
}

/**
 * Ensure a kong consumer ACL membership exists.
 * @param projectId Kong consumer projectId
 * @param group Kong ACL group
 */
export async function kongEnsureAcl(projectId: string, group: string): Promise<KongAcl | null> {
    const { data, status } = await kongPut<KongAcl>(`/consumers/${projectId}/acls/${group}`);
    return status === StatusCodes.OK ? data : null;
}

/**
 * Remove a consumer from an ACL membership.
 * @param projectId Kong consumer projectId
 * @param group Kong ACL group
 */
export async function kongRemoveAcl(projectId: string, group: string): Promise<boolean> {
    try {
        const kongAcl = await kongGetAcl(projectId, group);
        if (!kongAcl) {
            return false;
        }
        const { status } = await kongDelete(`/consumers/${projectId}/acls/${kongAcl.id}`);
        return status === StatusCodes.NO_CONTENT;
    } catch {
        return false;
    }
}

/**
 * Get a consumer rate limit. Swallows errors and returns null.
 * @param projectId Kong consumer projectId
 * @param routeName route name in which to fetch the rate limit
 */
export async function kongGetRateLimit(
    projectId: string,
    routeName: string,
): Promise<KongPlugin<ZippoRateLimit> | null> {
    try {
        const { data, status } = await kongGet<KongPlugins>(`/consumers/${projectId}/plugins`);
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
            ) as KongPlugin<ZippoRateLimit>) || null
        );
    } catch {
        return null;
    }
}

/**
 * Ensure a kong consumer has a rate limit for a specific route.
 * @param projectId Kong consumer projectId
 * @param routeName route name in which to apply rate limit
 * @param rateLimit rate limit
 */
export async function kongEnsureRateLimit(
    projectId: string,
    routeName: string,
    rateLimit: ZippoRateLimit,
): Promise<KongPlugin<ZippoRateLimit> | null> {
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

    const existingRateLimit = await kongGetRateLimit(projectId, routeName);
    if (existingRateLimit) {
        const { data, status } = await kongPut<KongPlugin<ZippoRateLimit>>(
            `/consumers/${projectId}/plugins/${existingRateLimit.id}`,
            req,
        );
        return status !== StatusCodes.OK ? null : data;
    } else {
        const { data, status } = await kongPost<KongPlugin<ZippoRateLimit>>(`/consumers/${projectId}/plugins`, req);
        return status !== StatusCodes.CREATED ? null : data;
    }
}

/**
 * Remove the rate limit for a specific route for a consumer
 * @param projectId Kong consumer projectId
 * @param routeName route name in which to remove rate limit
 */
export async function kongRemoveRateLimit(projectId: string, routeName: string): Promise<boolean> {
    try {
        const kongRateLimit = await kongGetRateLimit(projectId, routeName);
        if (!kongRateLimit) {
            return false;
        }
        const { status } = await kongDelete(`/consumers/${projectId}/plugins/${kongRateLimit.id}`);
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
