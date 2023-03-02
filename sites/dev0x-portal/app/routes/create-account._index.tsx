import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { json, redirect } from '@remix-run/server-runtime';
import { getSignedInUser, sessionStorage } from '../auth.server';
import { TextInput } from '../components/TextInput';
import { validateFormData } from '../utils/utils';
import { z } from 'zod';
import { Button } from '../components/Button';

const firstPageFormModel = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
});

type ActionInput = z.TypeOf<typeof firstPageFormModel>;

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }

    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    const createAccountSession = session.get('createAccount');

    return json(
        createAccountSession
            ? {
                  firstName: createAccountSession.firstName as string,
                  lastName: createAccountSession.lastName as string,
                  email: createAccountSession.email as string,
              }
            : null,
        200,
    );
}

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        return redirect('/apps', { headers });
    }

    const formData = await request.formData();

    const { body, errors } = validateFormData<ActionInput>({
        formData: formData,
        schema: firstPageFormModel,
    });

    if (errors) {
        return json({ errors, values: body });
    }

    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    session.set('createAccount', {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
    });

    throw redirect('/create-account/set-password', {
        headers: {
            'Set-Cookie': await sessionStorage.commitSession(session),
        },
    });
}

export const handle = {
    showNavSwitch: true,
};

export default function CreateAccount() {
    const actionData = useActionData<typeof action>();
    const maybeSessionInfo = useLoaderData<typeof loader>();

    return (
        <main className="bg-white h-full min-h-full w-full min-w-screen flex flex-col">
            <div className="w-full h-full flex justify-center">
                <div className="w-full max-w-[456px] mt-40">
                    <h1 className="text-2.5xl text-black mb-6">Create an account</h1>
                    <Form method="post" className="flex flex-col gap-x-[18px] gap-y-4 w-full">
                        <div className="grid grid-cols-2 gap-[18px] w-full max-w-full">
                            <TextInput
                                placeholder="Enter first name"
                                name="firstName"
                                id="firstName"
                                label="First name"
                                hiddenLabel
                                error={actionData?.errors.firstName}
                                className="w-full"
                                initialValue={actionData?.values?.firstName || maybeSessionInfo?.firstName}
                            />
                            <TextInput
                                placeholder="Enter last name"
                                name="lastName"
                                id="lastName"
                                label="Last name"
                                hiddenLabel
                                error={actionData?.errors.lastName}
                                className="w-full"
                                initialValue={actionData?.values?.lastName || maybeSessionInfo?.lastName}
                            />
                        </div>
                        <TextInput
                            placeholder="What's your work email"
                            name="email"
                            id="email"
                            label="E-Mail address"
                            hiddenLabel
                            className="w-full"
                            error={actionData?.errors.email}
                            initialValue={actionData?.values?.email || maybeSessionInfo?.email}
                        />
                        <Button type="submit" className="col-span-2">
                            Continue →
                        </Button>
                    </Form>
                    <p className="mt-20 text-grey-400 text-center">
                        Do you have an account?{' '}
                        <Link className="text-black" to="/login">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
