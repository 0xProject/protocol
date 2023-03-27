import { Form, useActionData, useNavigate, useNavigation } from '@remix-run/react';
import { json, redirect } from '@remix-run/server-runtime';
import { getPasswordStrength, getSignedInUser, sessionStorage } from '../auth.server';
import { TextInput } from '../components/TextInput';
import { createUserWithEmailAndPassword, sendVerificationEmail } from '../data/zippo.server';
import { validateFormData } from '../utils/utils';
import { z } from 'zod';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import React from 'react';
import { Eye } from '../icons/Eye';
import { EyeOff } from '../icons/EyeOff';
import { Alert } from '../components/Alert';

import type { ActionArgs, LoaderArgs, MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
    return {
        title: 'Create Password | 0x',
        description: 'Create your password',
    };
};

const zodPasswordModel = z.object({
    password: z.string().min(1, 'Please enter a password'),
});

type ActionInput = z.TypeOf<typeof zodPasswordModel>;

type Errors = { general?: string } & Partial<ActionInput>;

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }
    const multiformSession = await sessionStorage.getSession(request.headers.get('Cookie'));

    const createAccountSession = multiformSession.get('createAccount');

    if (!createAccountSession) {
        throw redirect('/');
    }
    return null;
}

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }

    const multiformSession = await sessionStorage.getSession(request.headers.get('Cookie'));

    const createAccountSession = multiformSession.get('createAccount');

    if (!createAccountSession) {
        throw redirect('/');
    }

    const { body, errors } = validateFormData<ActionInput>({
        formData: await request.formData(),
        schema: zodPasswordModel,
    });

    if (errors) {
        return json({ errors: errors as Errors, values: body });
    }

    const [pwStrength, feedback] = getPasswordStrength(body.password);

    if (pwStrength < 4) {
        return json({
            errors: {
                password: feedback.warning
                    ? feedback.warning
                    : feedback.suggestions?.[0] ?? 'Please enter a stronger password', // feedback.suggestions might be empty
            } as Errors,
            values: body,
        });
    }

    // Password is good, we submit the user to the backend and show the email verification page
    const userCreated = await createUserWithEmailAndPassword({
        firstName: createAccountSession.firstName,
        lastName: createAccountSession.lastName,
        email: createAccountSession.email,
        password: body.password,
    });

    if (userCreated.result === 'ERROR') {
        return json({
            errors: {
                password: 'There was an error creating your account. Please try again later',
            } as Errors,
            values: body,
        });
    }

    // we set the email in the session so we can show it on the verify email page
    // as this is a signed and encrypted cookie, it acts as proof that the user
    // moved through the form correctly
    multiformSession.set('verifyEmail', {
        email: createAccountSession.email,
    });

    const result = await sendVerificationEmail({ email: createAccountSession.email, userId: userCreated.data });

    if (result.result === 'ERROR') {
        return json({
            errors: {
                general: 'There was an error sending the verification email. Please try again later',
            } as Errors,
            values: body,
        });
    }

    // we unset the createAccount session so we can't use it again
    multiformSession.unset('createAccount');

    throw redirect('/create-account/verification-sent', {
        headers: {
            'Set-Cookie': await sessionStorage.commitSession(multiformSession),
        },
    });
}

export default function SetPasswordPage() {
    const actionData = useActionData<typeof action>();
    const navigator = useNavigate();

    const navigation = useNavigation();

    const [showPassword, setShowPassword] = React.useState(false);

    return (
        <main className="min-w-screen flex h-full min-h-full w-full flex-col bg-white">
            <div className=" flex h-full w-full justify-center">
                <div className="mt-40 w-full max-w-[456px]">
                    {actionData?.errors?.general && (
                        <Alert variant="error" className="mb-4">
                            {actionData?.errors?.general}
                        </Alert>
                    )}
                    <button
                        className="bg-grey-100 mb-6 h-11 w-11 rounded-xl"
                        onClick={() => navigator(-1)}
                        title="Go Back"
                    >
                        ←
                    </button>
                    <h1 className="text-2.5xl mb-6 text-black">Create your password</h1>
                    <Form method="post" className="flex w-full flex-col gap-x-[18px] gap-y-4">
                        <TextInput
                            placeholder="Enter your password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            id="password"
                            label="Password"
                            hiddenLabel
                            className="col-span-2 w-full"
                            error={actionData?.errors.password}
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
                        <Button
                            type="submit"
                            className="col-span- justify-center"
                            size="md"
                            disabled={navigation.state !== 'idle'}
                        >
                            Continue →
                        </Button>
                    </Form>
                </div>
            </div>
        </main>
    );
}
