import { Form, useActionData, useLoaderData, useNavigate, useNavigation, useOutletContext } from '@remix-run/react';
import * as Drawer from '../components/Drawer';
import { BackButton } from '../components/BackButton';
import { TextInput } from '../components/TextInput';
import { useCallback, useMemo, useRef, useState } from 'react';
import { MultiSelectGroup } from '../components/MultiSelectGroup';
import { MultiSelectCard } from '../components/MultiselectCard';
import { Swap } from '../icons/Swap';
import { Book } from '../icons/Book';
import { Button } from '../components/Button';
import type { AppOutletContext } from './_dashboard.app.$appId';
import { PRODUCT_TO_ZIPPO_ROUTE_TAG, ZIPPO_ROUTE_TAG_TO_PRODUCT, validateFormData } from '../utils/utils';
import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { json } from '@remix-run/server-runtime';
import { generateNonce, storeMockForApp } from '../utils/utils.server';
import { sessionStorage } from '../auth.server';
import { z } from 'zod';
import type { ErrorWithGeneral } from '../types';
import { getAppById, updateProvisionAccess } from '../data/zippo.server';
import { getSignedInUser } from '../auth.server';
import { Alert } from '../components/Alert';
import * as AppSettingsConfirmDialog from '../components/AppSettingsConfirmDialog';
import { ArrowRightIcon } from '@radix-ui/react-icons';

const updateAppModel = z.object({
    nonce: z.string().min(16, 'Invalid nonce'), // 16 bytes in hex
    name: z.string().min(1, 'App name is required'),
    tagName: z.string().optional(),
    products: z
        .enum(['swap-api', 'orderbook-api'])
        .or(z.array(z.enum(['swap-api', 'orderbook-api'])).min(1, 'Please select at least one product')),
});

type ActionInput = z.TypeOf<typeof updateAppModel>;

type Errors = ErrorWithGeneral<Record<keyof ActionInput, string>>;

export async function action({ request, params }: ActionArgs) {
    if (!params.appId) {
        throw redirect('/apps');
    }
    const [user, headers] = await getSignedInUser(request);

    const session = await sessionStorage.getSession(
        headers.has('Set-Cookie') ? headers.get('Set-Cookie') : request.headers.get('Cookie'),
    );

    if (!user) {
        throw redirect('/login', { headers });
    }

    const nonce = session.get('nonce');
    if (!nonce) {
        return json({ errors: { general: 'Invalid nonce' } as Errors }, { headers });
    }
    const formData = await request.formData();

    const { body, errors } = validateFormData<ActionInput>({
        formData: formData,
        schema: updateAppModel,
    });
    if (errors) {
        return json({ errors: errors as Errors, values: body }, { headers });
    }
    if (body.nonce !== nonce) {
        return json({ errors: { general: 'Invalid nonce' } as Errors, values: body }, { headers });
    }

    // as this is an "admin" like action, we verify if the session is still valid

    /**@TODO currently not possible as ZIPPO does currently not allow to verifiy specific tokens */
    // const sessionResult = await doesSessionExist({ userId: user.id, sessionToken: user.sessionToken });

    // if (sessionResult.result === 'ERROR' || sessionResult.data === false) {
    //     console.warn(`User with id ${user.id} tried to update app settings but their session was invalid`);
    //     await auth.logout(request, { redirectTo: '/login' });
    //     throw redirect('/login'); // throwing again to stop execution flow for the analyzer
    // }

    // we additionally want to verify that the user has access to this app
    const returnedApp = await getAppById(params.appId);

    if (returnedApp.result === 'ERROR') {
        return json({ errors: { general: 'Error fetching app' } as Errors, values: body }, { headers });
    }

    if (returnedApp.data.teamId !== user.teamId) {
        console.warn(`User with id ${user.id} tried to update app settings but they do not have access to this app`);
        return json({ errors: { general: 'You do not have access to this app' } as Errors, values: body }, { headers });
    }

    const productAccess = Array.isArray(body.products) ? body.products : [body.products];

    const updateResult = await updateProvisionAccess({
        appId: params.appId,
        routeTags: productAccess.map((product) => PRODUCT_TO_ZIPPO_ROUTE_TAG[product]),
        rateLimits: productAccess.map(() => {
            return { minute: 3 };
        }),
    });

    if (updateResult.result === 'ERROR') {
        return json(
            { errors: { general: 'Error updating app, please try again later' } as Errors, values: body },
            { headers },
        );
    }

    if (body.tagName && !returnedApp.data.onChainTag) {
        // we need to update the tag name
        storeMockForApp(
            {
                tagName: body.tagName,
                id: updateResult.data.id,
            },
            session,
        );
        headers.set('Set-Cookie', await sessionStorage.commitSession(session));
    }

    throw redirect(`/app/${params.appId}`, { headers });
}

export async function loader({ request }: LoaderArgs) {
    const nonce = generateNonce();
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    session.flash('nonce', nonce);
    const header = await sessionStorage.commitSession(session);
    return json({ nonce }, { headers: { 'Set-Cookie': header } });
}

export default function AppSettings() {
    const { app } = useOutletContext<AppOutletContext>();
    const { nonce } = useLoaderData<typeof loader>();

    const actionData = useActionData<typeof action>();

    const ref = useRef<HTMLFormElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const navigation = useNavigation();

    const [appName, setAppName] = useState(app.name);
    const [tagName, setTagName] = useState(app.onChainTag?.name ?? '');

    const [showConfirmationModal, setShowConfirmationModal] = useState(false);

    const tagNameFieldEnabled = useMemo(() => app.onChainTag?.name === undefined, [app]);

    const [selectedProducts, setSelectedProducts] = useState(
        new Set(app.productAccess?.map((product) => ZIPPO_ROUTE_TAG_TO_PRODUCT[product]?.id)),
    );

    const hasRemovedProducts = useMemo(() => {
        if (!app.productAccess) return false;
        if (app.productAccess.length > selectedProducts.size) {
            return true;
        }
        return app.productAccess.some((product) => !selectedProducts.has(ZIPPO_ROUTE_TAG_TO_PRODUCT[product]?.id));
    }, [app, selectedProducts]);

    const addedTag = useMemo(() => {
        if (!tagNameFieldEnabled) return false;
        return tagName !== '';
    }, [tagNameFieldEnabled, tagName]);

    const onSubmit = useCallback(() => {
        if (!ref.current) {
            console.warn('Form ref is not set');
            return;
        }
        if (hasRemovedProducts) {
            setShowConfirmationModal(true);
            return;
        }
        ref.current.submit();
    }, [ref, hasRemovedProducts]);

    return (
        <Drawer.Root
            open={true}
            onOpenChange={(open) => {
                if (!open) {
                    navigate(-1);
                }
            }}
        >
            <Drawer.Content position="right" className="w-[694px]" ref={containerRef}>
                <div className="flex h-full flex-col pt-8">
                    <div className="px-10 ">
                        <BackButton />
                        <h2 className="text-2.5xl text-grey-900 font-sans leading-[120%] antialiased">App Settings</h2>
                        <hr className="text-grey-200 mt-4 mb-[52px]" />
                    </div>
                    {actionData?.errors?.general && (
                        <div className="px-10">
                            <Alert variant="error" className="mb-4">
                                {actionData?.errors?.general}
                            </Alert>
                        </div>
                    )}
                    <Form method="post" className="flex flex-grow flex-col justify-between" ref={ref}>
                        <div className="px-10">
                            <TextInput
                                label="App Name"
                                name="name"
                                placeholder="Enter app name"
                                id="inp-app-name"
                                className="mb-10"
                                onChange={(e) => setAppName(e.target.value)}
                                error={actionData?.errors?.name}
                                initialValue={appName}
                            />
                            <MultiSelectGroup
                                label="What 0x products should be enabled?"
                                onChange={(e) => {
                                    const { value, checked } = e.target as HTMLInputElement;
                                    if (checked) {
                                        selectedProducts.add(value);
                                    } else {
                                        selectedProducts.delete(value);
                                    }
                                    setSelectedProducts(new Set(selectedProducts));
                                }}
                            >
                                <MultiSelectCard
                                    title="Swap API"
                                    description="Access efficient liquidity for powering token swaps"
                                    icon={<Swap />}
                                    id="swap-api"
                                    selected={selectedProducts.has('swap-api')}
                                    key="swap-api"
                                    className="h-full"
                                    name="products"
                                    value="swap-api"
                                />
                                <MultiSelectCard
                                    title="Orderbook API"
                                    description="Power limit orders in your application"
                                    icon={<Book />}
                                    id="orderbook-api"
                                    selected={selectedProducts.has('orderbook-api')}
                                    key="orderbook-api"
                                    className="h-full"
                                    name="products"
                                    value="orderbook-api"
                                />
                            </MultiSelectGroup>
                        </div>
                        <div className="mt-10 px-10">
                            <h3 className=" mb-4 text-lg font-medium leading-[26px] text-black antialiased">
                                0x Explorer tag
                            </h3>
                            <p className="text-grey-500 mb-6 text-sm antialiased">
                                To update the on-chain label for this app{' '}
                                <a
                                    href="#"
                                    className="inline-flex items-center text-base text-sm text-blue-700 antialiased"
                                >
                                    Contact us <ArrowRightIcon className="inline-block" />
                                </a>
                            </p>

                            <TextInput
                                label="Tag name"
                                name="tagName"
                                placeholder={tagNameFieldEnabled ? 'Enter Tag name' : tagName}
                                id="inp-tag-name"
                                className="mb-10"
                                disabled={!tagNameFieldEnabled}
                                onChange={(e) => setTagName(e.target.value)}
                                error={actionData?.errors?.tagName}
                                initialValue={tagNameFieldEnabled ? tagName : ''}
                            />
                        </div>
                        <input type="hidden" name="nonce" value={nonce} />
                        <div className="flex-grow" />
                        <div className="p-6">
                            <Button
                                size="md"
                                className="w-full justify-center"
                                type="button"
                                onClick={onSubmit}
                                disabled={navigation.state !== 'idle' || appName === '' || selectedProducts.size === 0}
                            >
                                {addedTag ? (
                                    <span className="flex items-center gap-2">
                                        Submit & Save <ArrowRightIcon className="inline-block" height={24} width={24} />
                                    </span>
                                ) : (
                                    'Save Settings'
                                )}
                            </Button>
                        </div>
                    </Form>
                    <AppSettingsConfirmDialog.Root
                        open={showConfirmationModal}
                        onOpenChange={(open) => {
                            if (!open) {
                                setShowConfirmationModal(false);
                            }
                        }}
                    >
                        <AppSettingsConfirmDialog.Content
                            appName={app.name}
                            portalProps={{ container: containerRef?.current }}
                            onConfirm={() => {
                                ref.current?.submit();
                            }}
                        />
                    </AppSettingsConfirmDialog.Root>
                </div>
            </Drawer.Content>
        </Drawer.Root>
    );
}
