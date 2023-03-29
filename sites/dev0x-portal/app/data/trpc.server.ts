import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { TZippoRouter, TZippoRouteTag } from 'zippo-interface';
import { env } from '../env';

const makeClient = () =>
    createTRPCProxyClient<TZippoRouter>({
        links: [
            httpBatchLink({
                url: env.ZIPPO_URL,
                headers() {
                    return { apiKey: env.ZIPPO_API_KEY };
                },
            }),
        ],
    });

let trpcClient: ReturnType<typeof makeClient> | undefined;

declare global {
    var __trpc_client: ReturnType<typeof makeClient> | undefined;
}

if (env.NODE_ENV === 'development') {
    if (!global.__trpc_client) {
        global.__trpc_client = makeClient();
    }
    trpcClient = global.__trpc_client;
} else {
    trpcClient = makeClient();
}

export const client = trpcClient as ReturnType<typeof makeClient>;

export type RouterInputs = inferRouterInputs<TZippoRouter>;

export type RouterOutputs = inferRouterOutputs<TZippoRouter>;
