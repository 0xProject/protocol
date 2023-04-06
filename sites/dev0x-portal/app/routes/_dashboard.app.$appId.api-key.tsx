import { json, redirect } from '@remix-run/node';
import { useActionData, useNavigate, useOutletContext } from '@remix-run/react';
import { format, formatDistanceToNow } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import * as Drawer from '../components/Drawer';
import { RefreshCcw01 } from '../icons/RefreshCcw01';
import * as RotateApiKeyConfirmDialog from '../components/RotateApiKeyConfirmDialog';
import { getSignedInUser } from '../auth.server';
import { validateFormData } from '../utils/utils';
import { createAppKey, deleteAppKey, getAppById } from '../data/zippo.server';
import { BlurredInputWithCopy } from '../components/BlurredInputWithCopy';

import type { ActionArgs } from '@remix-run/node';
import type { AppOutletContext } from './_dashboard.app.$appId';
import type { ErrorWithGeneral } from '../types';

const actionFromModel = z.object({
    name: z.string(),
    keyId: z.string(),
    appId: z.string(),
});
type ActionInput = z.TypeOf<typeof actionFromModel>;
type Errors = ErrorWithGeneral<Record<keyof ActionInput, string>>;

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);
    if (!user) {
        throw redirect('/create-account', { headers });
    }

    const formData = await request.formData();
    const { body, errors } = validateFormData<ActionInput>({
        formData,
        schema: actionFromModel,
    });

    if (errors !== null) {
        console.warn(errors);
        return json({ errors: { general: 'Something went wrong. Try again. ' } as Errors }, { headers });
    }
    const app = await getAppById(body.appId);
    if (app.result === 'ERROR') {
        console.warn(app.error);
        return json({ errors: { general: 'Something went wrong. Try again. ' } as Errors }, { headers });
    }

    if (app.data.name !== body.name) {
        return json(
            {
                errors: {
                    name: 'App name does not match',
                } as Errors,
            },
            { headers },
        );
    }

    //TODO: replace it with a single endpoint once zippo implements it
    const deleteAppKeyResult = await deleteAppKey(body.keyId);
    if (deleteAppKeyResult.result === 'ERROR') {
        return json({ errors: { general: 'Cannot remove key' } as Errors }, { headers });
    }

    const createAppKeyResult = await createAppKey({
        appId: body.appId,
        teamId: user.teamId,
    });
    if (createAppKeyResult.result === 'ERROR') {
        return json({ errors: { general: 'Cannot create new key' } as Errors }, { headers });
    }

    return json({ errors: null }, { headers });
}

export default function AppSettings() {
    const navigate = useNavigate();
    const actionData = useActionData<typeof action>();
    const { app } = useOutletContext<AppOutletContext>();
    const apiKey = app.apiKeys[0];

    const containerRef = useRef<HTMLDivElement>(null);
    const [containerRefValue, setContainerRefValue] = useState<HTMLDivElement | null>();

    const [rotateApiKeyDialogOpen, setRotateApiKeyDialogOpen] = useState(false);

    useEffect(() => {
        if (actionData?.errors === null) {
            setRotateApiKeyDialogOpen(false);
        }
    }, [actionData]);

    useEffect(() => {
        setContainerRefValue(containerRef.current);
    }, [setContainerRefValue]);

    const createdAt = Date.parse(apiKey.createdAt.toString());

    return (
        <>
            <Drawer.Root
                open={true}
                onOpenChange={(open) => {
                    if (!open) {
                        navigate(-1);
                    }
                }}
            >
                <Drawer.Content position="right" className="flex w-[694px] flex-col" ref={containerRef}>
                    <div className="flex-1 px-10 py-11">
                        <BackButton />
                        <div className="text-2.5xl font-sans">Your API Key</div>
                        <div className="sa">
                            This key will allow you to authenticate API requests to 0x.{' '}
                            <span className="text-grey-400">
                                Specify the key in your requests via the 0x-api-key header parameter.
                            </span>
                        </div>
                        <BlurredInputWithCopy className="relative mt-6 mb-14" name="api-key" value={apiKey.apiKey} />
                        <div className="flex items-center">
                            <div className="mr-16">
                                <div className="text-grey-400 mb-2 font-sans text-base">Created on</div>
                                <div className="font-sans text-lg font-medium" title={format(createdAt, 'PPPppp')}>
                                    {formatDistanceToNow(createdAt, { addSuffix: true })}
                                </div>
                            </div>
                            {/* <div>
                            <div className='text-grey-400 font-medium" mb-2 font-sans text-base'>
                                Last request to this API key
                            </div>
                            <div className="font-sans text-lg font-medium">-</div>
                        </div> */}
                        </div>
                    </div>
                    <div className="border-grey-200 border-t border-solid p-6">
                        <RotateApiKeyConfirmDialog.Root
                            open={rotateApiKeyDialogOpen}
                            onOpenChange={setRotateApiKeyDialogOpen}
                        >
                            <RotateApiKeyConfirmDialog.Trigger asChild>
                                <Button color="red" size="md" startIcon={<RefreshCcw01 />}>
                                    Rotate API Key
                                </Button>
                            </RotateApiKeyConfirmDialog.Trigger>
                            <RotateApiKeyConfirmDialog.Content
                                appName={app.name}
                                generalError={actionData?.errors?.general}
                                nameError={actionData?.errors?.name}
                                keyId={apiKey.id}
                                appId={app.id}
                                portalProps={{ container: containerRefValue }}
                            />
                        </RotateApiKeyConfirmDialog.Root>
                    </div>
                </Drawer.Content>
            </Drawer.Root>
        </>
    );
}
