import { Form, useActionData, useLoaderData, useNavigation, useSubmit } from '@remix-run/react';
import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { json, redirect } from '@remix-run/server-runtime';
import { useCallback, useRef, useState } from 'react';
import { z } from 'zod';
import { getSignedInUser, sessionStorage } from '../auth.server';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import type { OnChainTagParams } from '../data/zippo.server';
import { addProvisionAccess, createApp, getTeam } from '../data/zippo.server';
import { ArrowNarrowRight } from '../icons/ArrowNarrowRight';
import type { CreateAppFlowType, ErrorWithGeneral } from '../types';
import { PRODUCT_TO_ZIPPO_ROUTE_TAG, validateFormData } from '../utils/utils';
import { makeMultipageHandler } from '../utils/utils.server';

const zodExplorerTagSchema = z.object({
    tagName: z.optional(z.string().min(1, 'Tag name is required')),
    skipped: z.coerce.boolean().optional(),
});

type ActionInput = z.TypeOf<typeof zodExplorerTagSchema>;

type Errors = ErrorWithGeneral<Record<keyof ActionInput, string>>;

export async function action({ request }: ActionArgs) {
    const [user] = await getSignedInUser(request);
    if (!user) throw redirect('/login'); // shouldn't happen
    const formData = await request.formData();

    const { body, errors } = validateFormData<ActionInput>({
        formData: formData,
        schema: zodExplorerTagSchema,
    });

    if (errors) {
        return json({ errors: errors as Errors, values: body });
    }
    if (body.skipped && body.tagName) {
        return json({ errors: { tagName: 'Tag name is required' } as Errors, values: body });
    }
    if (!body.skipped && !body.tagName) {
        return json({ errors: { general: 'Tag name is required' } as Errors, values: body });
    }

    // at this point we know that the user has either skipped the tag selection or selected a tag

    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    const sessionHandler = makeMultipageHandler<CreateAppFlowType>({ session, namespace: 'create-app' });
    const previousData = sessionHandler.getPage(0);
    if (body.skipped) {
        sessionHandler.setPage(1, { skipped: true });
    } else {
        sessionHandler.setPage(1, { skipped: false, tagName: body.tagName as string });
    }

    if (!previousData) {
        throw redirect('/apps/create-app');
    }

    // at this point we are creating the app and the api key to be displayed on the next page

    const teamRes = await getTeam({ userId: user.id });

    if (teamRes.result === 'ERROR') {
        // handle errors
        return json({ errors: { general: 'Error getting team' } as Errors, values: body });
    }

    let onChainTag: OnChainTagParams | undefined = undefined;

    if (!body.skipped) {
        onChainTag = {
            name: body.tagName as string,
            teamId: teamRes.data.id,
        };
    }

    const res = await createApp({
        appName: previousData.appName,
        teamId: teamRes.data.id,
        onChainTag,
        onChainTagId: undefined,
    });

    if (res.result === 'ERROR') {
        return json({ errors: { general: 'Error creating app' } as Errors, values: body });
    }

    const routeTags = previousData.products.map((product) => PRODUCT_TO_ZIPPO_ROUTE_TAG[product]);

    // console.log(productToZippoTag, previousData.products, routeTags);

    const rateLimits = previousData.products.map(() => ({ minute: 3 }));

    const provisionRes = await addProvisionAccess({
        appId: res.data.id,
        routeTags,
        rateLimits,
    });

    if (provisionRes.result === 'ERROR') {
        return json({ errors: { general: 'Error adding provision access' } as Errors, values: body });
    }

    // const apiKeyRes = await generateAPIKey({ appId: res.data.id, teamId: teamRes.data.id });

    // if (apiKeyRes.result === 'ERROR') {
    //     return json({ errors: { general: 'Error creating api key' } as Errors, values: body });
    // }

    sessionHandler.setPage(2, { apiKey: res.data.apiKeys[0].apiKey, appId: res.data.id });

    const header = await sessionStorage.commitSession(session);

    throw redirect('/apps/create-app/api-key', { headers: { 'Set-Cookie': header } });
}

export async function loader({ request }: LoaderArgs) {
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    const sessionHandler = makeMultipageHandler<CreateAppFlowType>({ session, namespace: 'create-app' });
    const previousData = sessionHandler.getPage(0);
    const currentData = sessionHandler.getPage(1);
    const lastPage = sessionHandler.getPage(2);

    if (!previousData) {
        throw redirect('/apps/create-app');
    }
    if (lastPage) {
        throw redirect('/apps/create-app/api-key');
    }

    return json({ data: currentData?.skipped === false ? currentData.tagName : null });
}

export default function ExplorerTag() {
    const { data } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();

    const [tagName, setTagName] = useState(actionData?.values.tagName || data || '');

    const navigation = useNavigation();

    const skipRef = useRef<HTMLFormElement>(null);

    const submit = useSubmit();

    const skip = useCallback(() => {
        if (skipRef.current) {
            submit(skipRef.current);
        }
    }, [skipRef, submit]);

    return (
        <div className="flex h-full flex-col pt-8">
            <div className="px-10 ">
                <BackButton />
                <h2 className="text-2.5xl text-grey-900 font-sans leading-[120%] antialiased">0x Explorer Tag</h2>
                <hr className="text-grey-200 mt-4 mb-[52px]" />
            </div>
            <div className="mb-10 px-10">
                <h3 className=" mb-2 text-lg font-medium leading-[26px] text-black antialiased">
                    Enable on-chain analytics
                </h3>
                <p className="text-grey-400 mb-2 text-base antialiased">
                    Submit a unique name and logo to identify transaction data from this app on 0x Explorer. You may use
                    the same label for all your apps.
                </p>
                <a href="#" className="text-base text-blue-700 antialiased">
                    Learn more about 0x Explorer tags.
                </a>
            </div>
            <Form method="post" hidden ref={skipRef}>
                {/* used for the "Skip functionality" */}
                <input type="hidden" name="skipped" value="true" />
            </Form>
            <Form method="post" className="flex flex-grow flex-col justify-between">
                <div className="px-10">
                    <TextInput
                        label="Tag Name"
                        name="tagName"
                        placeholder="Enter Tag name"
                        id="inp-tag-name"
                        className="mb-10"
                        onChange={(e) => setTagName(e.target.value)}
                        error={actionData?.errors?.tagName}
                        initialValue={tagName}
                    />
                </div>
                <div className="flex-grow" />
                <div className="flex p-6 ">
                    <Button
                        type="button"
                        onClick={skip}
                        size="md"
                        className="w-1/4 justify-center"
                        disabled={navigation.state !== 'idle'}
                        color="grey"
                    >
                        Skip
                    </Button>
                    <Button
                        size="md"
                        className="ml-4 w-full justify-center"
                        type="submit"
                        disabled={navigation.state !== 'idle' || tagName === ''}
                    >
                        Continue
                        <ArrowNarrowRight height={24} width={24} className="ml-2" />
                    </Button>
                </div>
            </Form>
        </div>
    );
}
