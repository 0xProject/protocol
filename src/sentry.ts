import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { SamplingContext } from '@sentry/types';
import * as core from 'express-serve-static-core';

import { HEALTHCHECK_PATH } from './constants';

export interface SentryOptions {
    app: core.Express;
    paths: string[];
    environment: string;
    sampleRate: number;
    tracesSampleRate: number;
    dsn: string;
}

/**
 * Creates configuration for sentry.io.
 */
export function SentryInit(options: SentryOptions): void {
    Sentry.init({
        dsn: options.dsn,
        environment: options.environment,
        sampleRate: options.sampleRate,
        integrations: [
            new Sentry.Integrations.Http({
                tracing: true,
            }),
            new Tracing.Integrations.Express({
                app: options.app,
            }),
        ],
        // TODO
        // This naive whitelisting should be removed after we apply whitelisting
        // on the ingress controller side.
        //
        tracesSampler: (context: SamplingContext): number => {
            // Do not trace health check endpoint.
            //
            if (context?.transactionContext?.name.includes(HEALTHCHECK_PATH)) {
                return 0;
            }

            for (const path of options.paths) {
                if (context?.transactionContext?.name.includes(path)) {
                    return options.tracesSampleRate;
                }
            }

            return 0;
        },
    });

    options.app.use(Sentry.Handlers.requestHandler());
    options.app.use(Sentry.Handlers.tracingHandler());
}
