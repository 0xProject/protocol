import { json, redirect } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { getSignedInUser } from '../auth.server';
import { AppBar } from '../components/AppBar';

import type { LoaderArgs } from '@remix-run/node';
import type { App } from '../types';

const allApps: App[] = [
    { name: 'Coinbase Wallet', encodedUrlPathname: 'coinbase-wallet' },
    { name: 'Second app', encodedUrlPathname: 'second-app' },
    { name: 'One more', encodedUrlPathname: 'one-more' },
];

export const loader = async ({ request, params }: LoaderArgs) => {
    const [user, headers] = await getSignedInUser(request);
    if (!user) {
        throw redirect('/create-account', { headers });
    }

    if (!user.team) {
        throw redirect('/create-account/create-team', { headers });
    }
    return json(
        {
            apps: allApps,
            user: {
                email: user.email,
                team: user.team,
            },
        },
        { headers },
    );
};

export default function AppsLayout() {
    const { apps, user } = useLoaderData<typeof loader>();
    return (
        <>
            <AppBar apps={apps} user={user} />
            <Outlet />
        </>
    );
}
