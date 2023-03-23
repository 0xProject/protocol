import { useLoaderData } from '@remix-run/react';
import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { z } from 'zod';
import { getSignedInUser } from '../auth.server';
import { ResendEmailButton } from '../components/ResendEmailButton';
import { sendResetPasswordEmail } from '../data/zippo.server';
import { CheckCircleBroken } from '../icons/CheckCircleBroken';
import { getResendEmailRetryIn, setResendEmailRetryIn } from '../utils/utils.server';

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

    const [retryIn] = await getResendEmailRetryIn(request, 'resetPassword');

    if (retryIn > 0) {
        return json({ error: 'Please wait before retrying' }, 400);
    }

    await sendResetPasswordEmail(zodResult.data.email);
    const setVerifyEmailHeaders = await setResendEmailRetryIn(request, 'resetPassword', 45);

    return json({ error: null }, { headers: setVerifyEmailHeaders });
}

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    }

    const url = new URL(request.url);

    const email = url.searchParams.get('email');

    if (!email) {
        throw redirect('/reset-password');
    }

    const [retryIn, retryInHeaders] = await getResendEmailRetryIn(request, 'resetPassword', true);

    return json({ email, retryIn }, { headers: retryInHeaders });
}

export default function ResetPasswordSentPage() {
    const { email, retryIn } = useLoaderData<typeof loader>();
    return (
        <main className="min-w-screen flex h-full min-h-full w-full flex-col bg-white">
            <div className=" flex h-full w-full justify-center">
                <div className="mt-40 w-full max-w-[456px]">
                    <CheckCircleBroken width={86} height={86} className="mx-auto mb-11" />
                    <h1 className="text-2.5xl mb-6 text-center text-black antialiased">Recovery email sent</h1>
                    <p className="text-grey-400 mb-6 antialiased">
                        If a 0x account exists for <strong>{email}</strong>, you will receive a password recovery link
                        at your email address in a few minutes.
                    </p>
                    <ResendEmailButton email={email} retryIn={retryIn} title="Resend recovery email" />
                </div>
            </div>
        </main>
    );
}
