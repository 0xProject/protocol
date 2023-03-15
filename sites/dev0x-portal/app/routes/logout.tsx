import type { ActionArgs } from '@remix-run/server-runtime';
import { auth } from '../auth.server';

export const action = async ({ request }: ActionArgs) => {
    await auth.logout(request, { redirectTo: '/' });
};

export default function Logout() {
    return null;
}
