import { Response } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import * as Sentry from '@sentry/remix';
import isbot from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'stream';
import { env, sentryEnvironment } from './env.server';

import type { EntryContext } from '@remix-run/node';

Sentry.init({
    dsn: env.VERCEL_ENV === 'production' ? env.SENTRY_DSN : undefined,
    environment: sentryEnvironment,
    tracesSampleRate: 1,
});

const ABORT_DELAY = 5_000;

export default function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
) {
    return isbot(request.headers.get('user-agent'))
        ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
        : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
}

function handleBotRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
) {
    return new Promise((resolve, reject) => {
        const { pipe, abort } = renderToPipeableStream(
            <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
            {
                onAllReady() {
                    const body = new PassThrough();

                    responseHeaders.set('Content-Type', 'text/html');

                    resolve(
                        new Response(body, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        }),
                    );

                    pipe(body);
                },
                onShellError(error: unknown) {
                    reject(error);
                },
                onError(error: unknown) {
                    responseStatusCode = 500;
                    console.error(error);
                },
            },
        );

        setTimeout(abort, ABORT_DELAY);
    });
}

function handleBrowserRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
) {
    return new Promise((resolve, reject) => {
        const { pipe, abort } = renderToPipeableStream(
            <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
            {
                onShellReady() {
                    const body = new PassThrough();

                    responseHeaders.set('Content-Type', 'text/html');

                    resolve(
                        new Response(body, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        }),
                    );

                    pipe(body);
                },
                onShellError(error: unknown) {
                    reject(error);
                },
                onError(error: unknown) {
                    console.error(error);
                    responseStatusCode = 500;
                },
            },
        );

        setTimeout(abort, ABORT_DELAY);
    });
}
