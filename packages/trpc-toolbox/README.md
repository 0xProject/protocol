# trpc-toolbox

This package provides type utilities to work with trpc.

Specifically, it provides a way to describe your trpc setup in an
interface definition, then use it in the server implementation
and when creating a client.

## Defining a trpc router

Create your interface package:

```ts
import type { defineTrpcRouter, TProcedureTree } from 'trpc-toolbox';

// Define rpc setup
type RpcSetup = {
    ctx: { userName: string };
    meta: { hasAuth: boolean };
};

// Define router setup
type RouterProcedures = {
    greeter: {
        greet: {
            type: 'query';
            input: { times: number };
            output: { greeting: string };
        };
    };
};

export type TRouter = defineTrpcRouter<RouterProcedures, RpcSetup>;
```

## Implementing the router

In your router implementation, import your router settings and type.

```ts
import { inferRouterContext, inferRouterMeta, initTRPC } from '@trpc/server';
import { z } from 'zod';
import { TRouter } from 'my-router-interface';

const t = initTRPC.context<inferRouterContext<TRouter>>().meta<inferRouterMeta<TRouter>>().create();
export const router = t.router({
    greeter: t.router({
        greet: t.procedure
            .input(z.object({ times: z.number() }))
            .output(z.object({ greeting: z.string() }))
            .query(({ input, ctx }) => {
                return { greeting: `Hello ${ctx.userName} ${input.times} times!` };
            }),
    }),
}) satisfies TRouter; // Don't forget the `satisfies` for type safety!
```

## Creating a client

To create a typed client all you need is the router type:

```ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import { TRouter } from 'my-router-interface';
const client = createTRPCProxyClient<TRouter>({
    links: [
        httpBatchLink({
            url: 'http://localhost:3000/trpc',
        }),
    ],
});

const myGreeting /* { greeting: string } */ = await client.greeting.greet({
    times: 93939939393932438032480285094573954809537,
});
```
