import { Form, useActionData, useNavigate } from '@remix-run/react';
import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { json, redirect } from '@remix-run/server-runtime';
import { getPasswordStrength, getSignedInUser, sessionStorage } from '../auth.server';
import { TextInput } from '../components/TextInput';
import { createUserWithEmailAndPassword } from '../data/zippo.server';
import { validateFormData } from '../utils/utils';
import { z } from 'zod';
import { Button } from '../components/Button';

const zodPasswordModel = z.object({
    password: z.string().min(1, 'Please enter a password'),
});

type ActionInput = z.TypeOf<typeof zodPasswordModel>;

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
        return json({ errors, values: body });
    }

    const [pwStrength, feedback] = getPasswordStrength(body.password);

    if (pwStrength < 4) {
        return json({
            errors: {
                password: feedback.warning
                    ? feedback.warning
                    : feedback.suggestions?.[0] ?? 'Please enter a stronger password', // feedback.suggestions might be empty
            },
            values: body,
        });
    }

    // Password is good, we submit the user to the backend and show the email verification page
    const userCreated = await createUserWithEmailAndPassword(
        createAccountSession.firstName,
        createAccountSession.lastName,
        createAccountSession.email,
        body.password,
    );

    if (!userCreated) {
        return json({
            errors: {
                password: 'There was an error creating your account. Please try again later',
            },
            values: body,
        });
    }

    // we set the email in the session so we can show it on the verify email page
    // as this is a signed and encrypted cookie, it acts as proof that the user
    // moved through the form correctly
    multiformSession.set('verifyEmail', {
        email: createAccountSession.email,
    });

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

    return (
        <main className="bg-white h-full min-h-full w-full min-w-screen flex flex-col">
            <div className=" h-full w-full flex justify-center">
                <div className="w-full max-w-[456px] mt-40">
                    <button
                        className="h-11 w-11 bg-grey-100 rounded-xl mb-6"
                        onClick={() => navigator(-1)}
                        title="Go Back"
                    >
                        ←
                    </button>
                    <h1 className="text-2.5xl text-black mb-6">Create your password</h1>
                    <Form method="post" className="flex flex-col gap-x-[18px] gap-y-4 w-full">
                        <TextInput
                            placeholder="Enter your password"
                            type="password"
                            name="password"
                            id="password"
                            label="Password"
                            hiddenLabel
                            className="col-span-2 w-full"
                            error={actionData?.errors.password}
                            initialValue={actionData?.values?.password}
                        />
                        <Button type="submit" className="col-span-2">
                            Continue →
                        </Button>
                    </Form>
                </div>
            </div>
        </main>
    );
}
