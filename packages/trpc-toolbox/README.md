# trpc-toolbox

This package provides type utilities to work with trpc.

Specifically, it provides a way to describe your trpc setup in an
interface definition, then use it in the server implementation
and when creating a client.

## Defining a trpc router

Create your interface package:

```ts
import type { defineProcedure, defineTrpcRouter, TProcedureTree } from 'trpc-toolbox';
import { z } from 'zod';

// Define rpc setup
type RpcSetup = {
    ctx: { userName: string };
    meta: { hasAuth: boolean };
};

// Define router setup
export const myRouterProcedures = {
    greeter: {
        greet: {
            type: 'query',
            input: z.coerce.number(),
            output: z.object({ greeting: z.string() }),
        },
    },
} satisfies TProcedureTree; // Don't forget the `satisfies`! (requires TypeScript 4.9.x)

export type MyRouter = defineTrpcRouter<typeof myRouterProcedures, RpcSetup>;
```

## Implementing the router

In your router implementation, import your router settings and type.

```ts
import { inferRouterContext, inferRouterMeta, initTRPC } from '@trpc/server';
import { z } from 'zod';
import { TMyRouter, myRouterProcedures } from 'my-router-interface';

const t = initTRPC.context<inferRouterContext<TMyRouter>>().meta<inferRouterMeta<TMyRouter>>().create();
export const myRouter = t.router({
    greeter: t.router({
        greet: t.procedure
            .input(myRouterProcedures.greeter.greet.input)
            .output(myRouterProcedures.greeter.greet.output)
            .query(({ input, ctx }) => {
                return { greeting: `Hello ${ctx.userName} ${input} times!` };
            }),
    }),
}) satisfies TMyRouter; // Don't forget the `satisfies` for type safety!
```

## Creating a client

To create a typed client all you need is the router type:

```ts
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import { TMyRouter } from 'my-router-interface';
const client = createTRPCProxyClient<TMyRouter>({
    links: [
        httpBatchLink({
            url: 'http://localhost:3000/trpc',
        }),
    ],
});

const myGreeting /* { greeting: string } */ = await client.greeting.greet(93939939393932438032480285094573954809537);
```
