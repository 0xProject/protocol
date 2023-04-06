import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    POOL_CACHE_PORT: z.coerce.number().positive().default(3001),
    REDIS_URL: z.string(),
    ENABLE_PROMETHEUS_METRICS: z.coerce.boolean().default(false),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    // RPC URLs
    ETHEREUM_RPC_URL: z.string().url().optional(),
    POLYGON_RPC_URL: z.string().url().optional(),
    ARBITRUM_RPC_URL: z.string().url().optional(),
    // TODO: add more RPC URLs.
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 4));
    process.exit(1);
}

if (parsed.data.NODE_ENV === 'production') {
    const { ETHEREUM_RPC_URL, POLYGON_RPC_URL, ARBITRUM_RPC_URL } = parsed.data;
    if ([ETHEREUM_RPC_URL, POLYGON_RPC_URL, ARBITRUM_RPC_URL].find((url) => url === undefined) !== undefined) {
        console.error('All RPC URLs are required in production', JSON.stringify(parsed.data, null, 4));
        process.exit(1);
    }
}

if (parsed.data.NODE_ENV !== 'production') {
    console.log('configured environment: ', JSON.stringify(parsed.data, null, 4));
}

export const env = parsed.data;
