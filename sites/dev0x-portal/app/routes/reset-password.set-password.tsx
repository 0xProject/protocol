import { Form, useActionData, useLoaderData } from '@remix-run/react';
import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { useState } from 'react';
import { z } from 'zod';
import { getPasswordStrength, getSignedInUser } from '../auth.server';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { TextInput } from '../components/TextInput';
import { resetPassword } from '../data/zippo.server';
import { Eye } from '../icons/Eye';
import { EyeOff } from '../icons/EyeOff';
import { validateFormData } from '../utils/utils';
import { createFlashMessage } from '../utils/utils.server';

const zodResetPasswordModel = z.object({
    password: z.string().min(1, { message: 'Password is required' }),
    email: z.string().email({ message: 'Email is required' }),
    token: z.string().min(1, { message: 'Token is required' }),
});

type ActionInput = z.TypeOf<typeof zodResetPasswordModel>;

type WithGeneral = ActionInput & { general: string };

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }

    const { body, errors } = validateFormData<ActionInput>({
        formData: await request.formData(),
        schema: zodResetPasswordModel,
    });

    if (errors) {
        return json({ errors: errors as Partial<WithGeneral>, values: body });
    }

    const [pwStrength, feedback] = getPasswordStrength(body.password);

    if (pwStrength < 4) {
        return json({
            errors: {
                password: feedback.warning
                    ? feedback.warning
                    : feedback.suggestions?.[0] ?? 'Please enter a stronger password', // feedback.suggestions might be empty
            } as Partial<WithGeneral>,
            values: body,
        });
    }

    const success = await resetPassword(body.email, body.password, body.token);

    if (!success) {
        return json({
            errors: {
                general: 'There was an issue resetting your password. Please try again.',
            } as Partial<WithGeneral>,
            values: body,
        });
    }

    const flashHeaders = await createFlashMessage(
        request,
        'pw-reset-success',
        'Password reset successfully. Please log in.',
    );

    throw redirect('/login', { headers: flashHeaders });
}

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }
    const url = new URL(request.url);

    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    if (!token || !email) {
        throw redirect('/reset-password');
    }

    return { token, email };
}

export default function SetNewPassword() {
    const { email, token } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const [showPassword, setShowPassword] = useState(false);

    return (
        <main className="min-w-screen flex h-full min-h-full w-full flex-col bg-white">
            <div className=" flex h-full w-full justify-center">
                <div className="mt-40 w-full max-w-[456px]">
                    {(actionData?.errors.email || actionData?.errors.token || actionData?.errors.general) && (
                        <Alert variant="error" className="mb-6">
                            {actionData?.errors.email || actionData?.errors.token || actionData?.errors.general}
                        </Alert>
                    )}
                    <h1 className="text-2.5xl mb-6 text-black">Type your new password for {email}</h1>
                    <Form method="post" className="flex w-full flex-col gap-x-[18px] gap-y-4" noValidate>
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="email" value={email} />
                        <TextInput
                            placeholder="Enter your new password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            id="password"
                            label="New password"
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
                        <Button type="submit" className="justify-center">
                            Continue →
                        </Button>
                    </Form>
                </div>
            </div>
        </main>
    );
}
