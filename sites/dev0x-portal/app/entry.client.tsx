import { RemixBrowser, useLocation, useMatches } from '@remix-run/react';
import { startTransition, StrictMode, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as Sentry from '@sentry/remix';
import type { PUBLIC_ENV } from './types';

declare global {
    interface Window {
        PUBLIC_ENV: PUBLIC_ENV;
    }
}

Sentry.init({
    dsn: window.PUBLIC_ENV.SENTRY_DSN,
    environment: window.PUBLIC_ENV.SENTRY_ENV,
    tracesSampleRate: 1,
    integrations: [
        new Sentry.BrowserTracing({
            routingInstrumentation: Sentry.remixRouterInstrumentation(useEffect, useLocation, useMatches),
        }),
    ],
});

startTransition(() => {
    hydrateRoot(
        document,
        <StrictMode>
            <RemixBrowser />
        </StrictMode>,
    );
});
