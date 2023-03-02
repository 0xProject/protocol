import { useLoaderData } from '@remix-run/react';
import type { LoaderArgs } from '@remix-run/server-runtime';
import { json, redirect } from '@remix-run/server-runtime';
import { getSignedInUser, sessionStorage } from '../auth.server';
import { Button } from '../components/Button/Button';

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers: headers || new Headers() });
    }
    const multiformSession = await sessionStorage.getSession(request.headers.get('Cookie'));

    if (!multiformSession.has('verifyEmail')) {
        throw redirect('/');
    }
    return json({
        email: multiformSession.get('verifyEmail').email as string,
    });
}

export default function VerificationSent() {
    const loaderData = useLoaderData<{ email: string }>();

    return (
        <main className="bg-white h-full min-h-full w-full min-w-screen flex flex-col">
            <div className=" h-full w-full flex justify-center">
                <div className="w-full max-w-[456px] mt-40">
                    <h1 className="text-2.5xl text-black mb-4">First, let's verify your email</h1>
                    <p className="mb-3">
                        Check <b>{loaderData.email}</b> to verify your account and get started.
                    </p>
                    <p className="mb-6">
                        If you need help,{' '}
                        <a href="#" className="text-blue">
                            visit support
                        </a>{' '}
                        or{' '}
                        <a href="#" className="text-blue">
                            contact us
                        </a>
                    </p>
                    <Button type="submit" className="col-span-2 w-full" color="grey">
                        Resend email
                    </Button>
                </div>
            </div>
        </main>
    );
}
