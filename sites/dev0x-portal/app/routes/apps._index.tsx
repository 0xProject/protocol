import { json } from '@remix-run/node';
import { AppsTable } from '../components/AppsTable';
import { useLoaderData } from '@remix-run/react';
import { Button } from '../components/Button';

import type { LoaderArgs } from '@remix-run/node';

export async function loader({ request }: LoaderArgs) {
    return json({
        data: [
            {
                name: 'Demo app',
                brandColor: '#01A74D',
                metrics: {
                    requests: 122,
                    volume: 3422,
                    users: 30,
                },
                encodedUrlPathname: 'demo-app',
                onChainTag: [],
            },
            {
                name: 'Coinbase wallet',
                brandColor: '#3A65EB',
                metrics: {
                    requests: 3224,
                    volume: 54232,
                    users: 45,
                },
                encodedUrlPathname: 'coinbase-wallet',
                onChainTag: [],
            },
        ],
    });
}

export default function Apps() {
    const { data } = useLoaderData<typeof loader>();
    return (
        <div className="px-24">
            <div className="my-8">
                <h1 className="text-grey-900 font-sans text-5xl font-normal">Welcome to 0x.</h1>
            </div>
            <div className="bg-grey-100 flex justify-between rounded-2xl p-8">
                <div>
                    <h2 className="text-grey-900 text-2.5xl mb-4 font-sans">Build a live app</h2>
                    <p className="text-grey-400 mb-4 max-w-[266px] font-sans text-base leading-5">
                        Create an app to get a live API key with access to multiple 0x products.
                    </p>
                    <Button size="sm" className="ml-auto" roundness="lg">
                        Create an app
                    </Button>
                </div>
                <div className="grid max-w-[890px] grid-cols-3 gap-x-12">
                    <div>
                        <h2 className="text-grey-900 text-2.5xl mb-4 font-sans">Test API key</h2>
                        <p className="text-grey-400 mb-4 font-sans text-base leading-5">
                            Make a sample request to any 0x product with the key below.
                        </p>
                        <div>Test API key</div>
                    </div>
                    <div className="col-span-2">Code block</div>
                </div>
            </div>
            <AppsTable data={data} className="mt-5" />
        </div>
    );
}
