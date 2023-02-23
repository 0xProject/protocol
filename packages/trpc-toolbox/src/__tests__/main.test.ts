import { inferRouterContext, inferRouterMeta, initTRPC } from '@trpc/server';
import { z } from 'zod';
import { defineTrpcRouter, TProcedureTree } from '../main';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

// https://github.com/type-challenges/type-challenges/blob/main/utils/index.d.ts
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

// describe `defineTrpcRouter`

// define router setup
const myRouterProcedures = {
    greeter: {
        greet: {
            type: 'query',
            input: z.coerce.number(),
            output: z.object({ greeting: z.string() }),
        },
    },
} satisfies TProcedureTree;

// Define rpc setup
type RpcSetup = {
    ctx: { userName: string };
    meta: { hasAuth: boolean };
};

/**
 * This is what you'd export from your router definition workspace
 */
type TMyRouter = defineTrpcRouter<typeof myRouterProcedures, RpcSetup>;

// describe router creation
// it creates a typed router
const t = initTRPC.context<inferRouterContext<TMyRouter>>().meta<inferRouterMeta<TMyRouter>>().create();
t.router({
    greeter: t.router({
        greet: t.procedure
            .input(myRouterProcedures.greeter.greet.input)
            .output(myRouterProcedures.greeter.greet.output)
            .query(({ input, ctx }) => {
                return { greeting: `Hello ${ctx.userName} ${input} times!` };
            }),
    }),
}) satisfies TMyRouter;

// it fails with an invalid return type
t.router({
    greeter: t.router({
        greet: t.procedure
            .input(myRouterProcedures.greeter.greet.input)
            .output(myRouterProcedures.greeter.greet.output)
            // @ts-expect-error - return type should be { greeting: string } but is { greeting: number }
            .query(({ input }) => {
                return { greeting: /* should be a string */ 4206969 + input };
            }),
    }),
}) satisfies TMyRouter;

// it fails if the router structure doesn't match
t.router({
    // @ts-expect-error - `greet` should be inside `greeter`
    greet: t.procedure
        .input(myRouterProcedures.greeter.greet.input)
        .output(myRouterProcedures.greeter.greet.output)
        .query(({ input }) => {
            return { greeting: `Hello ${input} times!` };
        }),
}) satisfies TMyRouter;

// it produces the correct trpc setups
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type routerCases = [
    // it sets the router context
    Expect<Equal<inferRouterContext<TMyRouter>, { userName: string }>>,
    // it sets the router meta
    Expect<Equal<inferRouterMeta<TMyRouter>, { hasAuth: boolean }>>,
];

// describe client creation
const client = createTRPCProxyClient<TMyRouter>({
    links: [
        httpBatchLink({
            url: 'http://localhost:3000/trpc',
        }),
    ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type clientCases = [
    // it has the correct input type
    Expect<Equal<Parameters<typeof client.greeter.greet.query>[0], number>>,
    // it has the correct return type (not sure why it's a union of the same thing)
    Expect<Equal<ReturnType<typeof client.greeter.greet.query>, Promise<{ greeting: string } | { greeting: string }>>>,
];
