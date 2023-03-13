import type { LoaderArgs } from '@remix-run/server-runtime';
import { auth } from '../auth.server';

export const loader = async ({ request }: LoaderArgs) => {
    throw await auth.logout(request, { redirectTo: '/' });
};
