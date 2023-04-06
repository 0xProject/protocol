import { json, redirect } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { getSignedInUser } from '../auth.server';
import { AppBar } from '../components/AppBar';
import { addProvisionAccess, appsList, createApp, NO_TEAM_MARKER } from '../data/zippo.server';

import type { LoaderArgs, MetaFunction } from '@remix-run/node';
import type { ClientApp } from '../types';
import { TZippoRouteTag } from 'zippo-interface';

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
    let demoApp = null;
    // Let's create demo app if it no present, no error handling we will show button on the next page to retry this action
    if (list.data.filter((app) => app.description === '__test_key').length === 0) {
        const result = await createApp({
            appName: 'Demo App',
            description: '__test_key',
            teamId: user.teamId,
            onChainTag: undefined,
            onChainTagId: undefined,
        });
        if (result.result === 'SUCCESS') {
            demoApp = result.data;
            // Add access to swap-api and orderbook-api
            const accessResult = await addProvisionAccess({
                appId: result.data.id,
                routeTags: [TZippoRouteTag.SwapV1, TZippoRouteTag.OrderbookV1],
                rateLimits: [{ second: 2 }, { second: 2 }],
            });

            if (accessResult.result === 'ERROR') {
                console.error(`Error while adding access to demo app: ${accessResult.error}`);
            }
        }
    }

    const apps = demoApp ? [...list.data, demoApp] : list.data;

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
