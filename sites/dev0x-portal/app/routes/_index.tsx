import type { LoaderArgs } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { getSignedInUser } from '../auth.server';

// this page is only to redirect logged out users to the create account page
// and logged in users to the apps page
export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    if (user) {
        throw redirect('/apps', { headers });
    } else {
        throw redirect('/create-account', { headers });
    }
}
