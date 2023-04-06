import { json } from '@remix-run/node';
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import { createPortal } from 'react-dom';
import { ClientOnly } from 'remix-utils';
import { withSentry } from '@sentry/remix';
import styles from './styles/tailwind.css';
import { env, sentryEnvironment } from './env.server';
import type { LinksFunction, MetaFunction } from '@remix-run/node';
import type { PUBLIC_ENV } from './types';

export const meta: MetaFunction = () => ({
    charset: 'utf-8',
    title: '0x',
    viewport: 'width=device-width,initial-scale=1',
});

export const links: LinksFunction = () => [
    { rel: 'stylesheet', href: styles },
    //Preload only critical font
    {
        rel: 'preload',
        as: 'font',
        href: '/fonts/PolySans-Neutral.woff2',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
    },
];

export async function loader() {
    return json({
        ENV: {
            SENTRY_ENV: sentryEnvironment,
            SENTRY_DSN: env.SENTRY_DSN,
        } as PUBLIC_ENV,
    });
}

export function Head() {
    return (
        <>
            <Meta />
            <Links />
        </>
    );
}

function App() {
    const data = useLoaderData<typeof loader>();
    return (
        <>
            <ClientOnly>{() => createPortal(<Head />, document.head)}</ClientOnly>
            <Outlet />
            <script
                dangerouslySetInnerHTML={{
                    __html: `window.PUBLIC_ENV = ${JSON.stringify(data.ENV)}`,
                }}
            />
            <Scripts />
            <ScrollRestoration />
            <Scripts />
            <LiveReload />
        </>
    );
}

export default withSentry(App);
