import type { LoaderArgs } from '@remix-run/server-runtime';
import { json, redirect } from '@remix-run/server-runtime';
import { getSignedInUser } from '../auth.server';
import { verifyEmailVerificationToken } from '../data/zippo.server';
import { z } from 'zod';
import { Link, useLoaderData } from '@remix-run/react';

const zodEmailTokenModel = z.object({
    email: z.string().email('Please enter a valid email'),
    token: z.string().min(1, 'Please enter a valid token'),
});

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers: headers || new Headers() });
    }

    // if the user doesn't have the email and token query parameters, redirect them to the create account page
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const token = url.searchParams.get('token');

    const zodResult = zodEmailTokenModel.safeParse({ email, token });

    if (!zodResult.success) {
        return json({ error: 'Invalid token or email address', valid: false });
    }

    const isValid = await verifyEmailVerificationToken(zodResult.data.email, zodResult.data.token);

    if (isValid) {
        return json({ valid: true, error: null });
    }
    return json({ error: 'Invalid token or email address', valid: false });
}

export default function VerifyEmail() {
    const { valid, error } = useLoaderData<typeof loader>();

    return (
        <div>
            {valid ? 'E-Mail address has been verified' : error}
            <button>
                <Link to="/login">Please sign back into your account</Link>
            </button>
        </div>
    );
}
