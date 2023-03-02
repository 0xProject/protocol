import { redirect } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { getSignedInUser } from '../auth.server';
import { AppBar } from '../components/AppBar';

import type { LoaderArgs } from '@remix-run/node';

export const loader = async ({ request }: LoaderArgs) => {
    const [user, headers] = await getSignedInUser(request);
    if (!user) {
        throw redirect('/create-account', { headers });
    }
    return new Response(null, {
        status: 200,
        headers,
    });
};

export default function AppsLayout() {
    return (
        <>
            <AppBar />
            <Outlet />
        </>
    );
}
