import { json, redirect } from '@remix-run/node';
import { Outlet, useLoaderData, useParams } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';
import { Badge, isBadgeColor } from '../components/Badge';
import { LinkButton } from '../components/Button';
import { Key2 } from '../icons/Key2';
import { Settings4 } from '../icons/Settings4';
import { GoToExplorer } from '../components/GoToExplorer';
import { SwapCodeBlock } from '../components/SwapCodeBlock';
import { getApp } from '../data/zippo.server';

import type { LoaderArgs, MetaFunction } from '@remix-run/node';
import type { ComponentPropsWithoutRef } from 'react';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return {
        title: `${data.app.name} Dashboard | 0x`,
        description: `${data.app.name} Dashboard`,
    };
};

export const loader = async ({ params }: LoaderArgs) => {
    if (!params.appName) throw redirect('/apps');

    const app = await getApp(params.appName);

    if (!app) throw redirect('/apps');

    return json({
        app,
    });
};

function ViewDocsLink({ className, ...other }: ComponentPropsWithoutRef<'a'>) {
    return (
        <a
            className={twMerge('text-blue-brand font-sans text-base hover:opacity-80', className)}
            href="https://docs.0x.org/"
            rel="noreferrer"
            target="_blank"
            {...other}
        >
            View docs
        </a>
    );
}

export default function AppDashboard() {
    const { app } = useLoaderData<typeof loader>();
    const params = useParams();
    return (
        <>
            <div className="border-grey-200 border-b border-solid pt-8 pb-9">
                <div className="max-w-page-size mx-auto flex items-start justify-between">
                    <div>
                        <h1 className="text-5xl font-normal">{app.name}</h1>
                        <div className="mt-2 grid auto-cols-max grid-flow-col gap-4">
                            {app.onChainTag.map(({ name, color }) => {
                                const badgeColor = isBadgeColor(color) ? color : undefined;
                                if (badgeColor) {
                                    console.warn('Invalid color for Badge', color);
                                }
                                return (
                                    <Badge color={badgeColor} key={name}>
                                        {name}
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center">
                        <LinkButton
                            size="sm"
                            color="transparent"
                            endIcon={<Key2 className="relative -top-[1px]" />}
                            className="mr-4"
                            to={`/apps/${params.appName}/api-key`}
                        >
                            API Key
                        </LinkButton>
                        <LinkButton
                            size="sm"
                            color="transparent"
                            endIcon={<Settings4 className="relative -top-[1px]" />}
                            to={`/apps/${params.appName}/settings`}
                        >
                            Settings
                        </LinkButton>
                    </div>
                </div>
            </div>
            <div className="max-w-page-size bg-grey-100 mx-auto my-11 grid h-[236px] grid-cols-5 rounded-2xl p-5">
                <div className="p-4">
                    <h2 className="text-1.5lg mb-3.5 leading-none">Awaiting your first call</h2>
                    <div className="text-grey-700/50 mb-12 max-w-[200px] font-sans text-base">
                        Make your first live request with your API key.
                    </div>
                    <ViewDocsLink />
                </div>
                <SwapCodeBlock className="col-span-2" />
                <div className="col-span-2 flex justify-evenly pt-4">
                    <div className="min-w-max">
                        <h3 className="font-sans text-base">Build a gasless dApp</h3>
                        <ViewDocsLink className="mt-2 mb-5 inline-block" />
                        <img src="/assets/buildGaslessDApp.svg" alt="Gasless dApp" />
                    </div>
                    <div className="min-w-max">
                        <h3 className="font-sans text-base">Try Limit orders</h3>
                        <ViewDocsLink className="mt-2 mb-5 inline-block" />
                        <img src="/assets/tryLimitOrder.svg" alt="Limit order" />
                    </div>
                </div>
            </div>
            <GoToExplorer
                url="https://explorer.0x.org/apps"
                className="max-w-page-size mx-auto mb-44 p-9"
                buttonClassName="mt-6"
            />
            <Outlet />
        </>
    );
}
