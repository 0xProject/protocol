import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, useActionData } from '@remix-run/react';
import React from 'react';
import { AuthorizationError } from 'remix-auth';
import { z } from 'zod';

import type { User } from '../auth.server';
import { auth, sessionStorage } from '../auth.server';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { OnboardingAppBar } from '../components/OnboardingAppBar';
import { TextInput } from '../components/TextInput';
import { Eye } from '../icons/Eye';
import { EyeOff } from '../icons/EyeOff';
import { validateFormData } from '../utils/utils';

const zodLoginModel = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

type ActionInput = z.TypeOf<typeof zodLoginModel>;

type LoaderError = { message: string } | null;
export const loader = async ({ request }: LoaderArgs) => {
    await auth.isAuthenticated(request, { successRedirect: '/apps' });
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));
    const error = session.get(auth.sessionErrorKey) as LoaderError;
    return json({ error });
};

export const action = async ({ request }: ActionArgs) => {
    let error: string | null = null;
    let user: User | null = null;

    const { body, errors } = validateFormData<ActionInput>({
        formData: await request.clone().formData(),
        schema: zodLoginModel,
    });

    if (errors) {
        return json({ error: Object.values(errors)[0], values: body });
    }

    try {
        user = await auth.authenticate('email-pw', request, {
            throwOnError: true,
            successRedirect: '/',
        });
    } catch (e) {
        //pass through redirect
        if (e instanceof Response) {
            throw e;
        } else if (e instanceof AuthorizationError) {
            error = 'Invalid email or password';
        } else {
            // log the error
            error = 'Something went wrong, please try again later';
        }
    }
    if (error !== null && user !== null) {
        // shouldn't happen, but just in case
        error = 'Something went wrong, please try again later';
        return json({ error, values: body });
    }

    if (user !== null) {
        const session = await sessionStorage.getSession(request.headers.get('Cookie'));
        session.set(auth.sessionKey, user);
        session.set(auth.sessionStrategyKey, 'email-pw');
        const header = await sessionStorage.commitSession(session);
        throw redirect('/', {
            headers: {
                'Set-Cookie': header,
            },
        });
    }
    return json({ error, values: body });
};

export default function Login() {
    const actionData = useActionData<typeof action>();

    const [showPassword, setShowPassword] = React.useState(false);

    return (
        <div>
            <OnboardingAppBar showNavSwitch={true} />
            <main className="min-w-screen mt-[103px] flex h-full min-h-full w-full flex-col bg-white">
                <div className="flex h-full w-full justify-center">
                    <div className="mt-40 w-full max-w-[456px]">
                        {actionData?.error && (
                            <Alert variant="error" className="mb-6">
                                {actionData.error}
                            </Alert>
                        )}
                        <h1 className="text-2.5xl mb-6 text-black">Log in</h1>
                        <Form method="post" className="flex w-full flex-col gap-x-[18px] gap-y-4">
                            <TextInput
                                placeholder="Enter your email address"
                                name="email"
                                id="email"
                                label="E-Mail address"
                                hiddenLabel
                                className="w-full"
                                initialValue={actionData?.values?.email}
                            />
                            <TextInput
                                placeholder="Enter your password"
                                name="password"
                                id="password"
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                hiddenLabel
                                className="w-full"
                                initialValue={actionData?.values?.password}
                                endDecorator={
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        color="white"
                                        className="h-11 w-11 shadow-md"
                                        size="xs"
                                        roundness="sm"
                                        type="button"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                    </IconButton>
                                }
                            />
                            <Button type="submit" className="col-span-2 justify-center" size="md">
                                Continue →
                            </Button>
                        </Form>
                        <Link
                            to="/forgot-password"
                            className="mt-20 block text-center font-sans text-sm font-normal text-[#A9A9A9]"
                        >
                            Forgot your password?
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
