import type { Simplify } from 'type-fest';
import type { TZippoRouteTag } from 'zippo-interface';
import type { ZippoApp } from './data/zippo.server';

export type ClientApp = Rename<
    Pick<ZippoApp, 'id' | 'description' | 'integratorTeamId' | 'name' | 'apiKeys'>,
    { integratorTeamId: 'teamId' }
> & {
    onChainTag?: { name: string; color?: string };
    productAccess?: TZippoRouteTag[];
    brandColor?: string;
};

type SuccessResult<T> = {
    result: 'SUCCESS';
    data: T;
};

type ErrorResult = {
    result: 'ERROR';
    error: Error;
};

export type Result<T> = SuccessResult<T> | ErrorResult;

export type CreateAppFlowType = [
    { appName: string; products: string[] },
    (
        | {
              skipped: false;
              tagName: string;
              //@TODO add logo
          }
        | { skipped: true }
    ),
    {
        apiKey: string;
        appId: string;
    },
];

export type ErrorWithGeneral<T extends Record<string, string>> = { general?: string } & Partial<T>;

type RenameRecord<T extends Record<string, any>> = Partial<Record<keyof T extends string ? keyof T : never, string>>;

type Remap<T extends Record<string, any>, PM extends keyof T, M extends Record<PM, string>> = {
    // maps the old keys in M to the new keys
    // meaning, if M is { a: 'c' } then the result is { c: T['a'] }
    [K in keyof M as M[K]]: K extends keyof T ? T[K] : never;
};

/**
 * Type that allows to rename keys of a record.
 * The first type argument is the record to rename keys of.
 * The second type argument is a record that maps the old keys to the new keys
 * .
 * @example
 * type A = { a: string; b: number };
 * type B = Rename<A, { a: 'c' }>;
 * B is now { c: string; b: number }
 */
export type Rename<T extends Record<string, any>, M extends RenameRecord<T>> = Simplify<
    Omit<T, keyof M extends string ? keyof M : never> &
        Remap<T, keyof M extends string ? keyof M : never, M extends Record<string, string> ? M : never>
>;

export type PUBLIC_ENV = {
    SENTRY_DSN: string;
    SENTRY_ENV: string;
};
