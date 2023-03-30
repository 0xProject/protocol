import { json, redirect } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { getSignedInUser, sessionStorage } from '../auth.server';
import { AppBar } from '../components/AppBar';
import { appsList, createApp, NO_TEAM_MARKER } from '../data/zippo.server';

import type { LoaderArgs, MetaFunction } from '@remix-run/node';
import type { ClientApp } from '../types';
import { enhanceAppWithMockedData } from '../utils/utils.server';

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
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    if (user.teamName === NO_TEAM_MARKER) {
        throw redirect('/create-account/create-team', { headers });
    }

    const list = await appsList(user.teamId);
    if (list.result === 'ERROR') {
        throw list.error;
    }
    let demoApp = null;
    // Let's create demo app if it no present, no error handling we will show button on the next page to retry this action
    if (list.data.filter((app) => app.description === '__test_key').length === 0) {
        const result = await createApp({
            appName: 'Demo App',
            description: '__test_key',
            teamId: user.teamId,
        });
        if (result.result === 'SUCCESS') {
            demoApp = result.data;
        }
    }

    const apps = (demoApp ? [...list.data, demoApp] : list.data).map((app) => enhanceAppWithMockedData(app, session));

    return json(
        {
            apps,
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
