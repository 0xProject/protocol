import { json, redirect } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { getSignedInUser } from '../auth.server';
import { AppBar } from '../components/AppBar';
import { getApps } from '../data/zippo.server';

import { NO_TEAM_MARKER } from '../data/zippo.server';
import { Button, LinkButton } from '../components/Button';
import { Badge } from '../components/Badge';
import { HiddenText } from '../components/HiddenText';
import { SwapCodeBlock } from '../components/SwapCodeBlock';
import { AppsTable } from '../components/AppsTable';
import { GoToExplorer } from '../components/GoToExplorer';

import type { LoaderArgs, MetaFunction } from '@remix-run/node';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return {
        title: `${data.user.team} Dashboard | 0x`,
        description: `${data.user.team} Dashboard`,
    };
};

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
            apiKey: 'ar2fsadfq2f4fsda2egsdfas',
            user: {
                email: user.email,
                team: user.team,
            },
        },
        { headers },
    );
};

export default function AppsLayout() {
    const { apps, user, apiKey } = useLoaderData<typeof loader>();
    return (
        <>
            <AppBar apps={apps} user={user} />
            <div className="max-w-page-size mx-auto box-content px-24 pb-12">
                <div className="my-8 flex items-start">
                    <h1 className="text-grey-900 font-sans text-5xl font-thin slashed-zero">Welcome to 0x</h1>
                    <Badge color="grey" roundness="xl" className="ml-4 -mt-2" size="sm">
                        Beta
                    </Badge>
                </div>
                <div className="bg-grey-100 grid-cols-24 grid h-[276px] justify-between gap-4 rounded-2xl py-6">
                    <div className="col-span-5 pt-[1.125rem] pl-8">
                        <h2 className="text-grey-900 mb-2 font-sans text-xl font-medium leading-none">
                            Build a live app
                        </h2>
                        <p className="text-grey-400 mb-11 font-sans text-base font-thin">
                            Create an app to get a live API key with access to multiple 0x products.
                        </p>
                        <LinkButton size="md" className="ml-auto" to="/apps/create-app">
                            Create an app
                        </LinkButton>
                    </div>
                    <div className="col-span-4" />
                    <div className="col-span-4 pt-[1.125rem]">
                        <h2 className="text-grey-900 mb-2 font-sans text-xl font-medium leading-none">Test API key</h2>
                        <p className="text-grey-400 mb-14 max-w-[266px] font-sans text-base font-thin">
                            Make a sample request to any 0x product with the key below.
                        </p>
                        <div className="mt-11 flex items-center justify-between">
                            <div className="text-grey-700 mr-6 font-sans text-base font-normal">Text API key</div>
                            <HiddenText width={120} revealTooltipText="Reveal test key">
                                {apiKey}
                            </HiddenText>
                        </div>
                    </div>
                    <div className="col-span-1" />
                    <div className="col-span-10 pl-9 pr-6">
                        <SwapCodeBlock className="h-full" />
                    </div>
                </div>
                <AppsTable data={apps} className="mt-16 mb-24" />
                <Outlet />
                <GoToExplorer />
            </div>
        </>
    );
}
