import { json, redirect } from '@remix-run/node';
import { getSignedInUser, sessionStorage } from '../auth.server';
import { getUserByEmail, sendVerificationEmail, verifyEmailVerificationToken } from '../data/zippo.server';
import { z } from 'zod';
import { Form, Link, useLoaderData } from '@remix-run/react';
import { Button, LinkButton } from '../components/Button';
import { useEffect, useState } from 'react';
import { addSeconds, differenceInSeconds } from 'date-fns';

import type { ActionArgs, LoaderArgs, MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
    return {
        title: 'Verify Email | 0x',
        description: 'Verify your email',
    };
};

type VerifyEmailType = {
    retryAt: string;
};

const zodEmailTokenModel = z.object({
    email: z.string().email('Please enter a valid email'),
    token: z.string().min(1, 'Please enter a valid token'),
});

const zodResendEmailModel = z.object({
    email: z.string().email('Please enter a valid email'),
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

    const session = await sessionStorage.getSession(request.headers.get('Cookie'));
    const verifyEmail: VerifyEmailType | undefined = session.get('verifyEmail');

    if (!verifyEmail) {
        return json({ error: 'Error while verifying retry session' }, 400);
    }
    const userResult = await getUserByEmail({ email: zodResult.data.email });
    if (userResult.result === 'ERROR') {
        return json({ error: 'Error while verifying email' }, 400);
    }
    const retrievedUser = userResult.data;
    const now = new Date();
    const retryIn = new Date(verifyEmail.retryAt) > now ? differenceInSeconds(new Date(verifyEmail.retryAt), now) : 0;
    if (retryIn > 0) {
        return json({ error: 'Please wait before retrying' }, 400);
    }

    const result = await sendVerificationEmail({ email: zodResult.data.email, userId: retrievedUser.id });

    if (result.result === 'ERROR') {
        return json({ error: 'Error while sending verification email' }, 400);
    }

    verifyEmail.retryAt = addSeconds(new Date(), 45).toISOString();
    session.set('verifyEmail', verifyEmail);
    headers.append('Set-Cookie', await sessionStorage.commitSession(session));

    return json({ error: null }, { headers });
}

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }

    // if the user doesn't have the email and token query parameters, redirect them to the create account page
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const token = url.searchParams.get('token');

    const zodResult = zodEmailTokenModel.safeParse({ email, token });

    if (!zodResult.success) {
        // if we receive invalid query params, we just redirect to login
        throw redirect('/login', { headers });
    }

    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    let verifyEmailSession: VerifyEmailType | undefined = session.get('verifyEmail');

    if (!verifyEmailSession) {
        verifyEmailSession = {
            retryAt: new Date().toISOString(),
        };
        session.set('verifyEmail', verifyEmailSession);
        headers.append('Set-Cookie', await sessionStorage.commitSession(session));
    }

    const verifyEmailRetryIn = verifyEmailSession.retryAt;
    const now = new Date();

    const retryIn =
        verifyEmailRetryIn && new Date(verifyEmailRetryIn) > now
            ? differenceInSeconds(new Date(verifyEmailRetryIn), now)
            : 0;

    const isValid = await verifyEmailVerificationToken({ email: zodResult.data.email, token: zodResult.data.token });

    if (isValid) {
        return json({ error: null, values: { email, retryIn } }, { headers });
    }
    return json({ error: 'Invalid token or email address', values: { email, retryIn } }, { headers });
}

function SuccessMessage() {
    return (
        <div className="mt-40 w-full max-w-[456px]">
            <h1 className="text-2.5xl mb-4 text-black">Your email has been verified</h1>
            <p className="text-grey-500 mb-10 font-sans leading-[22px]">
                Your email has been successfully verified. You can now login to your account.
            </p>
            <LinkButton
                roundness="default"
                color="grey"
                className="flex w-full items-center justify-center text-lg"
                to="/login"
            >
                Back to login
            </LinkButton>
        </div>
    );
}

function ErrorMessage({ email, retryIn }: { email: string; retryIn: number }) {
    const [retryCountdown, setRetryCountdown] = useState(retryIn);

    useEffect(() => {
        setRetryCountdown(retryIn);
    }, [retryIn]);

    useEffect(() => {
        if (retryCountdown === 0) return;
        const timeout = setTimeout(() => {
            const newRetryCountdown = retryCountdown - 1;
            setRetryCountdown(newRetryCountdown);
        }, 1000);
        return () => {
            clearTimeout(timeout);
        };
    }, [retryCountdown]);

    return (
        <div className="mt-40 w-full max-w-[456px]">
            <Link className="text-grey-500 mb-8 inline-block text-base" to="/login">
                Back to login
            </Link>
            <h1 className="text-2.5xl mb-4 text-black">Verification link expired</h1>
            <p className="text-grey-500 mb-10 font-sans leading-[22px]">
                Request a new verification email to <strong className="text-grey-800 font-medium">{email}</strong> to
                verify your account and get started.
            </p>
            <Form method="post">
                <input type="hidden" name="email" value={email} />
                <Button
                    roundness="default"
                    color="grey"
                    className="flex w-full items-center justify-center text-lg "
                    disabled={retryCountdown > 0}
                >
                    Resend verification email
                </Button>
            </Form>
            {retryCountdown > 0 && (
                <span className="text-grey-500 mt-2 inline-block text-base">Resend email ({retryCountdown}s)</span>
            )}
        </div>
    );
}

export default function VerifyEmail() {
    const { error, values } = useLoaderData<typeof loader>();

    return (
        <main className="min-w-screen flex h-full min-h-full w-full flex-col bg-white">
            <div className=" flex h-full w-full justify-center">
                {error ? (
                    <ErrorMessage email={values.email || 'unknown email'} retryIn={values.retryIn} />
                ) : (
                    <SuccessMessage />
                )}
            </div>
        </main>
    );
}
