import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import * as CodeBlock from './CodeBlock';

import type { ElementRef } from 'react';

type SwapCodeBlockProps = CodeBlock.RootProps;
export const SwapCodeBlock = forwardRef<ElementRef<typeof CodeBlock.Root>, SwapCodeBlockProps>(function SwapCodeBlok(
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
