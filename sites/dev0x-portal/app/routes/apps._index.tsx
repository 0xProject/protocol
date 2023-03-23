import { json } from '@remix-run/node';
import { forwardRef } from 'react';
import { AppsTable } from '../components/AppsTable';
import { Form, useLoaderData } from '@remix-run/react';
import { Button } from '../components/Button';
import * as CodeBlock from '../components/CodeBlock';
import { GoToExplorer } from '../components/GoToExplorer';

import type { LoaderArgs } from '@remix-run/node';
import type { ElementRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { HiddenText } from '../components/HiddenText';
import { Badge } from '../components/Badge';

export async function loader({ request }: LoaderArgs) {
    return json({
        apiKey: 'ar2fsadfq2f4fsda2egsdfas',
        apps: [
            {
                name: 'Demo app',
                brandColor: '#01A74D',
                metrics: {
                    requests: 0,
                },
                encodedUrlPathname: 'demo-app',
                onChainTag: [],
            },
            {
                name: 'Coinbase wallet',
                brandColor: '#3A65EB',
                metrics: {
                    requests: 0,
                },
                encodedUrlPathname: 'coinbase-wallet',
                onChainTag: [],
            },
        ],
    });
}

type SwapCodeBlokProps = CodeBlock.RootProps;
export const SwapCodeBlok = forwardRef<ElementRef<typeof CodeBlock.Root>, SwapCodeBlokProps>(function SwapCodeBlok(
    { className, ...other },
    forwardedRef,
) {
    const codeString = `curl --location --request GET 'https://api.0x.org/swap/v1/quote?buyToken=DAI&sellToken=ETH&sellAmount=100000&excludedSources=0x,Kyber' --header '0x-api-key: [api-key]'`;
    return (
        <CodeBlock.Root className={twMerge('h-full', className)} {...other} ref={forwardedRef}>
            <CodeBlock.Header copyText={codeString.replace('\n', '')}>
                <div className="text-grey-400 font-sans text-sm font-normal">CURL REQUEST</div>
            </CodeBlock.Header>
            <div className="flex-1 px-6 py-2">
                <CodeBlock.Content>{codeString}</CodeBlock.Content>
            </div>
        </CodeBlock.Root>
    );
});

export default function Apps() {
    const { apps, apiKey } = useLoaderData<typeof loader>();
    return (
        <div className="mx-auto box-content max-w-[1520px] px-24 pb-12">
            <div className="my-8 flex items-start">
                <h1 className="text-grey-900 font-sans text-5xl font-thin slashed-zero">Welcome to 0x</h1>
                <Badge color="grey" roundness="xl" className="ml-4 -mt-2" size="sm">
                    Beta
                </Badge>
            </div>
            <div className="bg-grey-100 grid-cols-24 grid h-[276px] justify-between gap-4 rounded-2xl py-6">
                <div className="col-span-5 pt-[1.125rem] pl-8">
                    <h2 className="text-grey-900 mb-2 font-sans text-xl font-medium leading-none">Build a live app</h2>
                    <p className="text-grey-400 mb-11 font-sans text-base font-thin">
                        Create an app to get a live API key with access to multiple 0x products.
                    </p>
                    <Button size="md" className="ml-auto">
                        Create an app
                    </Button>
                </div>
                <div className="col-span-4" />
                <div className="col-span-4 pt-[1.125rem]">
                    <h2 className="text-grey-900 mb-2 font-sans text-xl font-medium leading-none">Test API key</h2>
                    <p className="text-grey-400 mb-14 max-w-[266px] font-sans text-base font-thin">
                        Make a sample request to any 0x product with the key below.
                    </p>
                    <div className="mt-11 flex items-center justify-between">
                        <div className="text-grey-700 mr-2 font-sans text-base font-normal">Text API key</div>
                        <HiddenText width={120}>{apiKey}</HiddenText>
                    </div>
                </div>
                <div className="col-span-1" />
                <div className="col-span-10 pl-9 pr-6">
                    <SwapCodeBlok className="h-full" />
                </div>
            </div>
            <AppsTable data={apps} className="mt-16 mb-24" />
            <GoToExplorer />
        </div>
    );
}
