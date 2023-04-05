import { Form, useActionData } from '@remix-run/react';
import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { json, redirect } from '@remix-run/server-runtime';
import { z } from 'zod';
import { getSignedInUser } from '../auth.server';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { getUserByEmail, sendResetPasswordEmail } from '../data/zippo.server';
import { validateFormData } from '../utils/utils';

const zodEmailModel = z.object({
    email: z.string().email(),
});

type ActionInput = z.TypeOf<typeof zodEmailModel>;

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }
    const { body, errors } = validateFormData<ActionInput>({
        formData: await request.formData(),
        schema: zodEmailModel,
    });

    if (errors) {
        return json({ errors, values: body });
    }

    const userRes = await getUserByEmail({ email: body.email });

    // we don't want to give away whether the email exists or not
    if (userRes.result === 'SUCCESS') {
        await sendResetPasswordEmail({ userId: userRes.data.id, email: body.email });
    }

    throw redirect('/reset-password/email-sent?email=' + encodeURIComponent(body.email));
}

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }

    return null;
}

export default function ResetPasswordPage() {
    const actionData = useActionData<typeof action>();

    return (
        <main className="min-w-screen flex h-full min-h-full w-full flex-col bg-white">
            <div className=" flex h-full w-full justify-center">
                <div className="mt-40 w-full max-w-[456px]">
                    <BackButton />
                    <h1 className="text-2.5xl mb-6 text-black">Reset your password</h1>
                    <p className="text-grey-400 mb-6">
                        Enter the email address you registered with and we'll send you instructions to reset your
                        password.
                    </p>
                    <Form method="post" className="flex w-full flex-col gap-x-[18px] gap-y-4" noValidate>
                        <TextInput
                            placeholder="Enter your email"
                            type="email"
                            name="email"
                            id="email"
                            label="Email Address"
                            hiddenLabel
                            className="col-span-2 w-full"
                            error={actionData?.errors.email}
                            initialValue={actionData?.values?.email}
                        />
                        <Button type="submit" className="col-span- justify-center">
                            Continue →
                        </Button>
                    </Form>
                </div>
            </div>
        </main>
    );
}
