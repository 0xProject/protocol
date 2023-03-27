import type { LinksFunction, MetaFunction } from '@remix-run/node';
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import { createPortal } from 'react-dom';
import { ClientOnly } from 'remix-utils';

import styles from './styles/tailwind.css';

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

export function Head() {
    return (
        <>
            <Meta />
            <Links />
        </>
    );
}

export default function App() {
    return (
        <>
            <ClientOnly>{() => createPortal(<Head />, document.head)}</ClientOnly>
            <Outlet />
            <ScrollRestoration />
            <Scripts />
            <LiveReload />
        </>
    );
}
