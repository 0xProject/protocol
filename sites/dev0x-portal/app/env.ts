import { z } from 'zod';

const envSchema = z
    .object({
        SESSION_SECRET: z.string(),
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
        ZIPPO_URL: z.string().url(),
        ZIPPO_API_KEY: z.string(),
        BASE_URL: z.string().url().optional(),
        SENTRY_DSN: z.string().url().optional(),
        VERCEL_URL: z.string().optional(),
    })
    .refine(
        (data) => {
            return data.BASE_URL || data.VERCEL_URL;
        },
        {
            message: 'Either BASE_URL or VERCEL_URL must be set',
        },
    );

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 4));
    process.exit(1);
}
export const env = parsed.data;
