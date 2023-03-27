import type { ActionArgs } from '@remix-run/server-runtime';
import { auth } from '../auth.server';
import { invalidateZippoSession } from '../data/zippo.server';

export const action = async ({ request }: ActionArgs) => {
    const user = await auth.isAuthenticated(request);
    if (user) {
        await invalidateZippoSession({ sessionToken: user.sessionToken });
    }
    await auth.logout(request, { redirectTo: '/' });
};

export default function Logout() {
    return null;
}
