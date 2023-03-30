import { Cross1Icon } from '@radix-ui/react-icons';
import { useLoaderData } from '@remix-run/react';
import type { LoaderArgs } from '@remix-run/server-runtime';
import { json, redirect } from '@remix-run/server-runtime';
import { useContext } from 'react';
import { getSignedInUser, sessionStorage } from '../auth.server';
import { BlurredInputWithCopy } from '../components/BlurredInputWithCopy';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { ArrowNarrowRight } from '../icons/ArrowNarrowRight';
import type { CreateAppFlowType } from '../types';
import { makeMultipageHandler } from '../utils/utils.server';
import { CloseContext } from './_dashboard.apps.create-app';

export async function loader({ request }: LoaderArgs) {
    const [user] = await getSignedInUser(request);
    if (!user) throw redirect('/login'); // shouldn't happen
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    const sessionHandler = makeMultipageHandler<CreateAppFlowType>({ session, namespace: 'create-app' });
    const pageOneData = sessionHandler.getPage(0);
    const pageTwoData = sessionHandler.getPage(1);
    const pageThreeData = sessionHandler.getPage(2);

    if (!pageOneData) {
        throw redirect('/apps/create-app');
    }
    if (!pageTwoData || !pageThreeData) {
        throw redirect('/apps/create-app/explorer-tag');
    }

    return json({
        apiKey: pageThreeData.apiKey,
    });
}

export default function ExplorerTag() {
    const { apiKey } = useLoaderData<typeof loader>();
    const close = useContext(CloseContext);
    return (
        <div className="flex h-full flex-col pt-8">
            <div className="px-10 ">
                <IconButton
                    onClick={close}
                    color="grey"
                    className="bg-grey-100 hover:bg-grey-200 mb-6 rounded-[14px] p-[10px]"
                    type="button"
                    aria-label="Close app setup"
                >
                    <Cross1Icon height={24} width={24} />
                </IconButton>
                <h2 className="text-2.5xl text-grey-900 font-sans leading-[120%] antialiased">API key</h2>
                <hr className="text-grey-200 mt-4 mb-[52px]" />
            </div>
            <div className="mb-10 px-10">
                <h3 className=" mb-2 text-lg font-medium leading-[26px] text-black antialiased">Copy your API key</h3>
                <p className="text-grey-400 mb-2 text-base antialiased">
                    <strong className="text-grey-900 font-normal">
                        This key will allow you to authenticate API requests to 0x.
                    </strong>{' '}
                    Specify the key in your requests via the 0x-api-key header parameter.
                </p>
            </div>
            <BlurredInputWithCopy value={apiKey} label="Your API key" hiddenLabel className="px-10" />
            <div className="flex-grow" />
            <div className="p-6">
                <Button size="md" className="w-full items-center justify-center" type="submit" onClick={close}>
                    Go to project
                    <ArrowNarrowRight height={24} width={24} className="ml-2" />
                </Button>
            </div>
        </div>
    );
}
