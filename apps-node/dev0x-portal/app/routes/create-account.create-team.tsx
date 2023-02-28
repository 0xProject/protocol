import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { getSignedInUser } from '../auth.server';
import { z } from 'zod';

const zodTeamVerifyModel = z.object({
    teamName: z.string().min(1, 'Please enter a valid team name'),
    teamCategory: z.string().min(1, 'Please enter a valid team category'),
});

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    // if the user doesn't exist, we want to redirect them to the create account page
    if (!user) {
        throw redirect('/create-account', { headers: headers || new Headers() });
    }
    // if the user has a team, we don't want them to be able to create a new team
    if (user.team) {
        throw redirect('/apps', { headers: headers || new Headers() });
    }

    return null;
}

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);

    // if the user doesn't exist, we want to redirect them to the create account page
    if (!user) {
        throw redirect('/create-account', { headers: headers || new Headers() });
    }
    // if the user has a team, we don't want them to be able to create a new team
    if (user.team) {
        throw redirect('/apps', { headers: headers || new Headers() });
    }
}
