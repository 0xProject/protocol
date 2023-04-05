import { Response } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import * as Sentry from '@sentry/remix';
import isbot from 'isbot';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
import { PassThrough } from 'stream';
import { env, sentryEnvironment } from './env.server';
import { Head } from './root';

import type { EntryContext } from '@remix-run/node';

Sentry.init({
    dsn: env.VERCEL_ENV === 'production' ? env.SENTRY_DSN : undefined,
    environment: sentryEnvironment,
    tracesSampleRate: 1,
});

const ABORT_DELAY = 5000;

export default function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
) {
    const callbackName = isbot(request.headers.get('user-agent')) ? 'onAllReady' : 'onShellReady';
    // swap out default component with <Head>
    const defaultRoot = remixContext.routeModules.root;
    remixContext.routeModules.root = {
        ...defaultRoot,
        default: Head,
    };

    let head = renderToString(<RemixServer context={remixContext} url={request.url} />);

    // restore the default root component
    remixContext.routeModules.root = defaultRoot;

    return new Promise((resolve, reject) => {
        let didError = false;

        const { pipe, abort } = renderToPipeableStream(<RemixServer context={remixContext} url={request.url} />, {
            [callbackName]: () => {
                const body = new PassThrough();

                responseHeaders.set('Content-Type', 'text/html');

                resolve(
                    new Response(body, {
                        headers: responseHeaders,
                        status: didError ? 500 : responseStatusCode,
                    }),
                );
                body.write(
                    `<!DOCTYPE html><html><head><!--start head-->${head}<!--end head--></head><body><div id="root">`,
                );
                pipe(body);
                body.write(`</div></body></html>`);
            },
            onShellError: (err: unknown) => {
                reject(err);
            },
            onError: (error: unknown) => {
                didError = true;

                console.error(error);
            },
        });

        setTimeout(abort, ABORT_DELAY);
    });
}
