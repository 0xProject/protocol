import {
    AnyRootConfig,
    BuildProcedure,
    RootConfig,
    DefaultDataTransformer,
    TRPCError,
    ProcedureType,
} from '@trpc/server';
import { UnsetMarker } from '@trpc/server/dist/core/internals/utils';
import { RouterDef } from '@trpc/server/dist/core/router';
import { DefaultErrorData } from '@trpc/server/dist/error/formatter';
import { TRPCErrorShape, TRPC_ERROR_CODE_NUMBER } from '@trpc/server/rpc';
import { ProcedureRouterRecord } from '@trpc/server/src';
import type { z } from 'zod';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Setup interfaces for `initTRPC`
 */
export interface RpcSetup<TErrorData extends DefaultErrorData> {
    ctx?: object;
    meta?: object;
    errorData?: TErrorData;
}

/**
 * The definition of a procedure used in a trpc router
 */
export interface TProcedureDefinition {
    input: z.ZodType;
    output: z.ZodType;
    type: 'query' | 'mutation';
}

/**
 * A nested object of procedures for a router
 */
export type TProcedureTree = { [key: string]: TProcedureTree | TProcedureDefinition };

/**
 * Define a trpc router by specifying its procedures and RpcSetup
 */
export type defineTrpcRouter<
    TProcedures extends TProcedureTree,
    TRpcSetup extends RpcSetup<TErrorData>,
    TErrorData extends DefaultErrorData = DefaultErrorData,
> = defineRouter<
    {
        [TKey in keyof TProcedures]: TKey extends string
            ? TProcedures[TKey] extends infer TValue
                ? TValue extends TProcedureDefinition
                    ? defineProcedure<TValue['type'], TValue['input'], TValue['output']>
                    : TValue extends TProcedureTree
                    ? defineTrpcRouter<TValue, TRpcSetup, TErrorData>
                    : never
                : never
            : never;
    },
    TRpcSetup
>;

/**
 * Define a procedure with a zod input and zod output
 */
type defineProcedure<
    TType extends 'query' | 'mutation',
    TInput extends z.ZodType<any, z.ZodTypeDef, any>,
    TOutput extends z.ZodType<any, z.ZodTypeDef, any>,
> = BuildProcedure<
    TType,
    {
        _config: AnyRootConfig;
        _meta: any;
        _ctx_out: any;
        _input_in: TInput extends void ? UnsetMarker : z.input<TInput>;
        _input_out: TInput extends void ? UnsetMarker : z.output<TInput>;
        _output_in: z.input<TOutput>;
        _output_out: z.output<TOutput>;
    },
    z.output<TOutput>
>;

/**
 * Define a router by specifying its procedures and
 * RPC setup.
 */
type defineRouter<TProcedures extends ProcedureRouterRecord, TTrpcSetup extends RpcSetup<any>> = {
    _def: RouterDef<
        RootConfig<{
            ctx: TTrpcSetup extends { ctx: infer TCtx } ? TCtx : any;
            meta: TTrpcSetup extends { meta: infer TMeta } ? TMeta : any;
            errorShape: TRPCErrorShape<TRPC_ERROR_CODE_NUMBER, inferErrorData<TTrpcSetup>>;
            transformer: DefaultDataTransformer;
        }>,
        TProcedures
    >;
    createCaller: any;
    getErrorShape: (opts: {
        error: TRPCError;
        type: ProcedureType | 'unknown';
        path: string | undefined;
        input: unknown;
        ctx: undefined | TTrpcSetup extends { ctx: infer TCtx } ? TCtx : undefined;
    }) => TRPCErrorShape<TRPC_ERROR_CODE_NUMBER, inferErrorData<TTrpcSetup>>;
};

type inferErrorData<TRpcSetup extends RpcSetup<any>> = TRpcSetup['errorData'] extends infer TErrorData
    ? TErrorData extends DefaultErrorData
        ? TErrorData
        : DefaultErrorData
    : DefaultErrorData;