import type { ActionArgs, LoaderArgs } from '@remix-run/server-runtime';
import { json } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { auth, getSignedInUser, sessionStorage } from '../auth.server';
import { z } from 'zod';
import { useState } from 'react';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { TextInput } from '../components/TextInput';
import type { Option } from '../components/OptionSelect';
import OptionSelect from '../components/OptionSelect';
import { Button } from '../components/Button';
import { validateFormData } from '../utils/utils';
import { createTeam } from '../data/zippo.server';

const optionValues = z.enum(['cex', 'dex', 'self-custody-wallet', 'fintech', 'other']);

const options: Option[] = [
    { label: 'CEX', value: 'cex' },
    { label: 'DEX', value: 'dex' },
    { label: 'Self-custody Wallet', value: 'self-custody-wallet' },
    { label: 'Fintech', value: 'fintech' },
    { label: 'Other', value: 'other' },
];

const zodTeamVerifyModel = z.object({
    teamName: z.string().min(1, 'Please enter a valid team name'),
    teamCategory: optionValues,
    teamCategoryOthers: z.string().optional(),
});

type ActionInput = z.TypeOf<typeof zodTeamVerifyModel>;

export async function loader({ request }: LoaderArgs) {
    const [user, headers] = await getSignedInUser(request);

    // if the user doesn't exist, we want to redirect them to the create account page
    if (!user) {
        throw redirect('/create-account', { headers });
    }
    // if the user has a team, we don't want them to be able to create a new team
    if (user.team) {
        throw redirect('/apps', { headers });
    }

    return { email: user.email };
}

export async function action({ request }: ActionArgs) {
    const [user, headers] = await getSignedInUser(request);

    // if the user doesn't exist, we want to redirect them to the create account page
    if (!user) {
        throw redirect('/create-account', { headers });
    }
    // if the user has a team, we don't want them to be able to create a new team
    if (user.team) {
        throw redirect('/apps', { headers });
    }

    const formData = await request.formData();

    const { body, errors } = validateFormData<ActionInput>({
        formData: formData,
        schema: zodTeamVerifyModel,
    });

    if (errors || (body.teamCategory === 'other' && !body.teamCategoryOthers)) {
        return json(
            {
                errors: {
                    ...(errors || {}),
                    teamCategoryOthers:
                        body.teamCategory === 'other' && !body.teamCategoryOthers
                            ? 'Please enter a valid team category'
                            : undefined,
                },
                values: body,
            },
            { headers },
        );
    }

    const session = await sessionStorage.getSession(request.headers.get('Cookie'));
    await createTeam(
        user.id,
        body.teamName,
        body.teamCategory === 'other' ? (body.teamCategoryOthers as string) : body.teamCategory,
    );

    const authSession = session.get(auth.sessionKey);

    authSession.team = body.teamName;

    session.set(auth.sessionKey, authSession);

    headers.append('Set-Cookie', await sessionStorage.commitSession(session));

    throw redirect('/apps', { headers });
}

function StandardCopy() {
    return (
        <p className="text-grey-400">
            You’re creating a team on 0x. You will need to share this account with your teammates pending when
            invitations are enabled.
        </p>
    );
}

function TeamNameInputCopy({ name }: { name: string }) {
    return (
        <p className="text-grey-400">
            You’re creating the <strong>{name}</strong> team on 0x. You will need to share this account with your
            teammates pending when invitations are enabled.
        </p>
    );
}

export default function CreateTeam() {
    const actionData = useActionData<typeof action>();
    const { email } = useLoaderData<typeof loader>();

    const [teamName, setTeamName] = useState('');
    const [teamType, setTeamType] = useState('');

    return (
        <main className="min-w-screen flex h-full min-h-full w-full flex-col bg-white">
            <div className=" flex h-full w-full justify-center">
                <div className="relative mt-40 inline-block w-full max-w-[456px]">
                    <h1 className="text-2.5xl mb-4 text-black">Create a team</h1>
                    {teamName ? <TeamNameInputCopy name={teamName} /> : <StandardCopy />}
                    <Form method="post" className="relative mt-8 flex flex-col gap-[15px]">
                        <TextInput
                            label="Team name"
                            placeholder="Enter team name"
                            name="teamName"
                            value={teamName}
                            hiddenLabel
                            onChange={(val) => setTeamName(val.currentTarget.value)}
                            error={actionData?.errors?.teamName}
                        />
                        <OptionSelect
                            options={options}
                            label="Team category"
                            hiddenLabel
                            name="teamCategory"
                            placeholder="What are you building?"
                            error={actionData?.errors?.teamCategory}
                            onChange={(val) => setTeamType(val)}
                        />
                        {teamType === 'other' && (
                            <TextInput
                                label="What are you building (other)"
                                placeholder="Enter team category"
                                name="teamCategoryOthers"
                                hiddenLabel
                                id="teamCategoryOthers"
                                error={actionData?.errors?.teamCategoryOthers}
                            />
                        )}

                        <Button type="submit" className="col-span-2 justify-center text-center" size="md">
                            Finish Setup →
                        </Button>
                    </Form>
                </div>
            </div>
            <footer className="fixed bottom-0 flex w-full items-center justify-between bg-white p-8 text-center text-black">
                <div className="flex flex-col items-start text-sm">
                    <span className="text-grey-400">Logged in as:</span>
                    <span>{email}</span>
                </div>
                <Form action="/logout" method="post">
                    <button type="submit" className="text-grey-800 text-base">
                        Log out
                    </button>
                </Form>
            </footer>
        </main>
    );
}
