import { Outlet, Form, useActionData, useNavigation, useOutletContext } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';
import { json, redirect } from '@remix-run/node';
import { Badge } from '../components/Badge';
import { SwapCodeBlock } from '../components/SwapCodeBlock';
import { AppsTable } from '../components/AppsTable';
import { GoToExplorer } from '../components/GoToExplorer';
import { Button, LinkButton } from '../components/Button';
import { useDemoApp } from '../hooks/useDemoApp';
import { getSignedInUser } from '../auth.server';
import { HiddenText } from '../components/HiddenText';
import { appsList, createApp } from '../data/zippo.server';

import type { ActionArgs } from '@remix-run/node';
import type { AppsOutletContext } from './_dashboard';
import { CopyButton } from '../components/CopyButton';

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (!user) {
        throw redirect('/login', { headers });
    }
    const list = await appsList(user.teamId);
    if (list.result === 'ERROR') {
        throw list.error;
    }
    const demoApp = list.data.filter((app) => app.description === '__test_key')[0];
    if (demoApp) {
        return json({ error: null, app: demoApp }, { headers });
    }
    const result = await createApp({
        appName: 'Demo App',
        description: '__test_key',
        teamId: user.teamId,
    });
    if (result.result === 'ERROR') {
        return json({ error: 'Fail to create test key. Try again later.' }, { headers });
    }
    return json({ error: null, app: result.data }, { headers });
}

export default function Apps() {
    const { apps } = useOutletContext<AppsOutletContext>();
    const demoApp = useDemoApp(apps);
    const actionData = useActionData<typeof action>();
    const navigation = useNavigation();

    const hasFormError = Boolean(actionData?.error);

    return (
        <div className="max-w-page-size mx-auto box-content px-24 pb-12">
            <div className="my-8 flex items-start">
                <h1 className="text-grey-900 font-sans text-5xl font-thin slashed-zero">Welcome to 0x</h1>
                <Badge color="grey" roundness="xl" className="ml-4 -mt-2" size="sm">
                    Beta
                </Badge>
            </div>
            <div className="bg-grey-100 grid-cols-24 grid h-[276px] justify-between gap-4 rounded-2xl py-6">
                <div className="col-span-5 pt-[1.125rem] pl-8">
                    <h2 className="text-grey-900 mb-2 font-sans text-xl font-medium leading-none">Build a live app</h2>
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
                    <p className="text-grey-400  max-w-[266px] font-sans text-base font-thin">
                        Make a sample request to any 0x product with the key below.
                    </p>

                    {demoApp ? (
                        <CopyButton className="mt-12" postCopyMessage="Test Key Copied">
                            {demoApp.apiKeys[0].apiKey}
                        </CopyButton>
                    ) : (
                        <div
                            className={twMerge(
                                'mt-10 flex flex-col',
                                hasFormError && navigation.state === 'idle' && ['mt-6'],
                            )}
                        >
                            {hasFormError && navigation.state === 'idle' && (
                                <div className="text-error-500 font-sans text-xs">{actionData?.error}</div>
                            )}
                            <Form method="post">
                                <Button size="md" type="submit" disabled={navigation.state === 'submitting'}>
                                    Create Test Key
                                </Button>
                            </Form>
                        </div>
                    )}
                </div>
                <div className="col-span-1" />
                <div className="col-span-10 pl-9 pr-6">
                    <SwapCodeBlock className="h-full" />
                </div>
            </div>
            <AppsTable data={apps} className="mt-16 mb-24" />
            <GoToExplorer />
            <Outlet />
        </div>
    );
}
