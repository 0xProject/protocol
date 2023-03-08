import { inferRouterContext, inferRouterMeta, initTRPC } from '@trpc/server';
import { z } from 'zod';
import { defineTrpcRouter, TProcedureTree } from '../main';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

// https://github.com/type-challenges/type-challenges/blob/main/utils/index.d.ts
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

// describe `defineTrpcRouter`

// define router setup
type RouterProcedures = {
    greeter: {
        greet: {
            type: 'query';
            input: { times: number };
            output: { greeting: string };
        };
    };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type itIsARouterProcedure = Expect<RouterProcedures extends TProcedureTree ? true : never>;

// Define rpc setup
type RpcSetup = {
    ctx: { userName: string };
    meta: { hasAuth: boolean };
};

/**
 * This is what you'd export from your router definition workspace
 */
type TRouter = defineTrpcRouter<RouterProcedures, RpcSetup>;

// describe router creation
// it creates a typed router
const t = initTRPC.context<inferRouterContext<TRouter>>().meta<inferRouterMeta<TRouter>>().create();
t.router({
    greeter: t.router({
        greet: t.procedure
            .input(z.object({ times: z.number() }))
            .output(z.object({ greeting: z.string() }))
            .meta({ hasAuth: true })
            .query(({ input, ctx }) => {
                return { greeting: `Hello ${ctx.userName} ${input} times!` };
            }),
    }),
}) satisfies TRouter;

// it fails with an invalid return type
t.router({
    greeter: t.router({
        greet: t.procedure
            .input(z.object({ times: z.number() }))
            .output(z.object({ greeting: z.string() }))
            // @ts-expect-error - return type should be { greeting: string } but is { greeting: number }
            .query(({ input }) => {
                return { greeting: /* should be a string */ 4206969 + input.times };
            }),
    }),
}) satisfies TRouter;

// it fails if the router structure doesn't match
t.router({
    // @ts-expect-error - `greet` should be inside `greeter`
    greet: t.procedure
        .input(z.object({ times: z.number() }))
        .output(z.object({ greeting: z.string() }))
        .query(({ input }) => {
            return { greeting: `Hello ${input} times!` };
        }),
}) satisfies TRouter;

// it enforces `meta` type
t.router({
    greeter: t.router({
        greet: t.procedure
            .input(z.object({ times: z.number() }))
            .output(z.object({ greeting: z.string() }))
            // @ts-expect-error - `isBadField` is not a valid meta field
            .meta({ isBadField: true })
            .query(({ input, ctx }) => {
                return { greeting: `Hello ${ctx.userName} ${input} times!` };
            }),
    }),
}) satisfies TRouter;

// it enforces `ctx` type
t.router({
    greeter: t.router({
        greet: t.procedure
            .input(z.object({ times: z.number() }))
            .output(z.object({ greeting: z.string() }))
            .meta({ hasAuth: true })
            .query(({ input, ctx }) => {
                // @ts-expect-error - `fieldDoesNotExist` is not a valid ctx field
                ctx.fieldDoesNotExist;
                return { greeting: `Hello ${ctx.userName} ${input} times!` };
            }),
    }),
}) satisfies TRouter;

// it fails if a zod input/output doesn't match
t.router({
    greeter: t.router({
        greet: t.procedure
            .input(z.object({ times: z.coerce.string() }))
            .output(z.object({ greeting: z.string() }))
            .query(({ input, ctx }) => {
                return { greeting: `Hello ${ctx.userName} ${input} times!` };
            }),
    }),
    // @ts-expect-error - input `times` should be `number` but is `string`
}) satisfies TRouter;

// it produces the correct trpc setups
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type routerCases = [
    // it sets the router context
    Expect<Equal<inferRouterContext<TRouter>, { userName: string }>>,
    // it sets the router meta
    Expect<Equal<inferRouterMeta<TRouter>, { hasAuth: boolean }>>,
];

// describe client creation
const client = createTRPCProxyClient<TRouter>({
    links: [
        httpBatchLink({
            url: 'http://localhost:3000/trpc',
        }),
    ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type clientCases = [
    // it has the correct input type
    Expect<Equal<Parameters<typeof client.greeter.greet.query>[0]['times'], number>>,
    // it has the correct return type (not sure why it's a union of the same thing)
    Expect<Equal<ReturnType<typeof client.greeter.greet.query>, Promise<{ greeting: string } | { greeting: string }>>>,
];

// describe procedure with no input

type TNoInputProcedureRouter = defineTrpcRouter<
    {
        increment: {
            type: 'mutation';
            output: { count: number };
        };
    },
    // eslint-disable-next-line @typescript-eslint/ban-types
    { ctx: {}; meta: {} }
>;

// it creates a typed router
const tNoInputRpc = initTRPC
    .context<inferRouterContext<TNoInputProcedureRouter>>()
    .meta<inferRouterMeta<TNoInputProcedureRouter>>()
    .create();
let count = 0;
tNoInputRpc.router({
    increment: tNoInputRpc.procedure.mutation(() => {
        count += 1;
        return { count };
    }),
}) satisfies TNoInputProcedureRouter;

// describe with zod validators

const input = z.object({ times: z.number() });
const output = z.object({ countString: z.string() });

type TZodRouter = defineTrpcRouter<{
    increment: {
        type: 'mutation';
        input: typeof input;
        output: typeof output;
    };
}>;

const tZodRpc = initTRPC.context<inferRouterContext<TZodRouter>>().meta<inferRouterMeta<TZodRouter>>().create();

// it creates a typed router
tZodRpc.router({
    increment: tZodRpc.procedure
        .input(input)
        .output(output)
        .mutation(({ input }) => {
            count *= input.times;
            return { countString: `Count is ${count}` };
        }),
}) satisfies TZodRouter;

// it fails if a validator is not specified
tZodRpc.router({
    increment: tZodRpc.procedure.input(input).mutation(({ input }) => {
        count *= input.times;
        return { countString: `Count is ${count}` };
    }),
    // @ts-expect-error - output validator is not specified
}) satisfies TZodRouter;

// it fails if a validator isn't correct
tZodRpc.router({
    increment: tZodRpc.procedure
        .input(input)
        .output(z.object({ count: z.number() }))
        // @ts-expect-error - output validator is not correct
        .mutation(({ input }) => {
            count *= input.times;
            return { countString: `Count is ${count}` };
        }),
    // @ts-expect-error - output validator is not correct
}) satisfies TZodRouter;
