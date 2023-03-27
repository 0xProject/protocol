import { json, redirect } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { getSignedInUser } from '../auth.server';
import { AppBar } from '../components/AppBar';
import { getApps } from '../data/zippo.server';

import type { LoaderArgs } from '@remix-run/node';
import { NO_TEAM_MARKER } from '../data/zippo.server';

export const loader = async ({ request, params }: LoaderArgs) => {
    const [user, headers] = await getSignedInUser(request);
    if (!user) {
        throw redirect('/create-account', { headers });
    }

    if (user.team === NO_TEAM_MARKER) {
        throw redirect('/create-account/create-team', { headers });
    }
    const apps = await getApps();

    return json(
        {
            apps,
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
