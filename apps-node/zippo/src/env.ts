import { z } from 'zod';
import * as dotenv from 'dotenv';
import { ZippoRouteTag } from './gateway/types';

dotenv.config();

const RouteMapShape = z.record(
    z.nativeEnum(ZippoRouteTag),
    z.object({
        tag: z.nativeEnum(ZippoRouteTag),
        routeNames: z.array(z.string()),
        groupName: z.string(),
    }),
);

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    ZIPPO_PORT: z.coerce.number().positive().default(2022),
    ZIPPO_REDIS_URL: z.string().url().nullable().default(null),
    ZIPPO_ROUTE_MAP: z.preprocess((val) => (typeof val === 'string' ? JSON.parse(val) : null), RouteMapShape),
    KONG_ADMIN_URL: z.string().url().default('http://127.0.0.1:8001'),
    KONG_ADMIN_HTTP_TIMEOUT: z.coerce.number().positive().default(1000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    MAILGUN_DEPLOY_URL: z.string().url().default('http://localhost:3000'),
    MAILGUN_KEY: z.string(),
    MAILGUN_DOMAIN: z.string().default('mg.0x.org'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 4));
    process.exit(1);
}

if (parsed.data.NODE_ENV !== 'production') {
    console.log('configured environment: ', JSON.stringify(parsed.data, null, 4));
}

export const env = parsed.data;
