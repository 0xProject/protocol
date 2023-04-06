import { useLoaderData, useNavigation } from '@remix-run/react';
import { z } from 'zod';
import { json, redirect } from '@remix-run/node';
import { getSignedInUser, sessionStorage } from '../auth.server';
import { ResendEmailButton } from '../components/ResendEmailButton';
import { getResendEmailRetryIn, setResendEmailRetryIn } from '../utils/utils.server';
import { getUserByEmail, sendVerificationEmail } from '../data/zippo.server';

import type { ActionArgs } from '@remix-run/server-runtime';
import type { LoaderArgs, MetaFunction } from '@remix-run/node';

const zodResendEmailModel = z.object({
    email: z.string().email(),
});

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }

    const data = Object.fromEntries(await request.formData());

    const zodResult = zodResendEmailModel.safeParse(data);

    if (!zodResult.success) {
        return json({ error: 'Invalid email' }, 400);
    }

    const [retryIn] = await getResendEmailRetryIn(request, 'verifyEmail');

    if (retryIn > 0) {
        return json({ error: 'Please wait before retrying' }, 400);
    }

    const userResult = await getUserByEmail({ email: zodResult.data.email });
    if (userResult.result === 'ERROR') {
        return json({ error: 'Error while verifying email' }, 400);
    }
    const retrievedUser = userResult.data;

    const result = await sendVerificationEmail({ email: zodResult.data.email, userId: retrievedUser.id });

    if (result.result === 'ERROR') {
        return json({ error: 'Error while sending verification email' }, 400);
    }

    const setVerifyEmailHeaders = await setResendEmailRetryIn(request, 'verifyEmail', 45);

    return json({ error: null }, { headers: setVerifyEmailHeaders });
}

export const meta: MetaFunction = () => {
    return {
        title: 'Email Verified | 0x',
        description: 'Email Verified',
    };
};

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }
    const multiformSession = await sessionStorage.getSession(request.headers.get('Cookie'));

    if (!multiformSession.has('verifyEmail')) {
        throw redirect('/');
    }

    const [retryIn, verifyEmailHeaders] = await getResendEmailRetryIn(request, 'verifyEmail', true);

    return json(
        {
            email: multiformSession.get('verifyEmail').email as string,
            retryIn,
        },
        { headers: verifyEmailHeaders },
    );
}

export default function VerificationSent() {
    const loaderData = useLoaderData<typeof loader>();

    const navigation = useNavigation();

    return (
        <main className="min-w-screen flex h-full min-h-full w-full flex-col bg-white">
            <div className=" flex h-full w-full justify-center">
                <div className="mt-40 w-full max-w-[456px]">
                    <h1 className="text-2.5xl mb-4 text-black">First, let's verify your email</h1>
                    <p className="mb-3">
                        Check <b>{loaderData.email}</b> to verify your account and get started.
                    </p>
                    <ResendEmailButton
                        retryIn={loaderData.retryIn}
                        email={loaderData.email}
                        disabled={navigation.state !== 'idle'}
                    />
                </div>
            </div>
        </main>
    );
}
