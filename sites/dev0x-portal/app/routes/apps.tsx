import { json, redirect } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { getSignedInUser } from '../auth.server';
import { AppBar } from '../components/AppBar';
import { appsList, NO_TEAM_MARKER } from '../data/zippo.server';

import type { LoaderArgs, MetaFunction } from '@remix-run/node';
import type { ClientApp } from '../types';

export type AppsOutletContext = {
    apps: ClientApp[];
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return {
        title: `${data.user.team} Dashboard | 0x`,
        description: `${data.user.team} Dashboard`,
    };
};

export const loader = async ({ request, params }: LoaderArgs) => {
    const [user, headers] = await getSignedInUser(request);
    if (!user) throw redirect('/login'); // shouldn't happen

    if (user.teamName === NO_TEAM_MARKER) {
        throw redirect('/create-account/create-team', { headers });
    }

    const list = await appsList(user.teamId);
    if (list.result === 'ERROR') {
        throw list.error;
    }

    return json(
        {
            apps: list.data,
            user: {
                email: user.email,
                team: user.teamName,
            },
        },
        { headers },
    );
};

export default function AppsLayout() {
    const { apps, user } = useLoaderData<typeof loader>();
    return (
        <>
            <AppBar apps={apps} userEmail={user.email} userTeam={user.team} />
            <Outlet context={{ apps }} />
        </>
    );
}
