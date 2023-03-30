import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { json, redirect } from '@remix-run/server-runtime';
import { useState } from 'react';
import { z } from 'zod';
import { sessionStorage } from '../auth.server';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { MultiSelectCard } from '../components/MultiselectCard';
import { MultiSelectGroup } from '../components/MultiSelectGroup';
import { TextInput } from '../components/TextInput';
import { Book } from '../icons/Book';
import { Swap } from '../icons/Swap';
import type { CreateAppFlowType, ErrorWithGeneral } from '../types';
import { makeMultipageHandler } from '../utils/utils.server';
import { validateFormData } from '../utils/utils';
import { ArrowNarrowRight } from '../icons/ArrowNarrowRight';

const zodAppDetailsSchema = z.object({
    name: z.string().min(1, 'App name is required'),
    products: z
        .array(z.enum(['swap-api', 'orderbook-api', 'token-registry', 'transaction-history', 'tx-relay']))
        .min(1, 'Please select at least one product'),
});

type ActionInput = z.TypeOf<typeof zodAppDetailsSchema>;

type Errors = ErrorWithGeneral<Record<keyof ActionInput, string>>;

export async function action({ request }: ActionArgs) {
    const formData = await request.formData();

    const { body, errors } = validateFormData<ActionInput>({
        formData: formData,
        schema: zodAppDetailsSchema,
    });

    if (errors) {
        return json({ errors: errors as Errors, values: body });
    }

    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    const sessionHandler = makeMultipageHandler<CreateAppFlowType>({ session, namespace: 'create-app' });
    sessionHandler.setPage(0, { appName: body.name, products: body.products });

    const header = await sessionStorage.commitSession(session);

    throw redirect('/apps/create-app/explorer-tag', { headers: { 'Set-Cookie': header } });
}

export async function loader({ request }: LoaderArgs) {
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    const sessionHandler = makeMultipageHandler<CreateAppFlowType>({ session, namespace: 'create-app' });
    const currentData = sessionHandler.getPage(0);
    const lastPage = sessionHandler.getPage(2);
    if (lastPage) {
        throw redirect('/apps/create-app/api-key');
    }
    return json({ data: currentData || null });
}

export default function AppDetails() {
    const { data } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();

    const navigation = useNavigation();

    const [appName, setAppName] = useState(actionData?.values.name || data?.appName || '');
    const [selectedProducts, setSelectedProducts] = useState(
        new Set(actionData?.values.products || data?.products || ['swap-api', 'orderbook-api']),
    );

    return (
        <div className="flex h-full flex-col pt-8">
            <div className="px-10 ">
                <BackButton />
                <h2 className="text-2.5xl text-grey-900 font-sans leading-[120%] antialiased">App Details</h2>
                <hr className="text-grey-200 mt-4 mb-[52px]" />
            </div>
            <Form method="post" className="flex flex-grow flex-col justify-between">
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
                <div className="flex-grow" />
                <div className="p-6">
                    <Button
                        size="md"
                        className="w-full justify-center"
                        type="submit"
                        disabled={navigation.state !== 'idle' || appName === '' || selectedProducts.size === 0}
                    >
                        Continue
                        <ArrowNarrowRight height={24} width={24} className="ml-2" />
                    </Button>
                </div>
            </Form>
        </div>
    );
}
