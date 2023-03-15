import * as CodeBlock from '../app/components/CodeBlock';
import type { Meta } from '@storybook/react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

import type { ElementRef } from 'react';

type CodeBlockExampleProps = CodeBlock.RootProps;
export const CodeBlockExample = forwardRef<ElementRef<typeof CodeBlock.Root>, CodeBlockExampleProps>(
    function CodeBlockExample({ className, ...other }, forwardedRef) {
        const codeString = `curl --location --request GET 'https://api.0x.org/swap/v1/quote?buyToken=DAI&sellToken=ETH&sellAmount=100000&excludedSources=0x,Kyber' --header '0x-api-key: [api-key]'`;
        return (
            <CodeBlock.Root className={twMerge('h-full w-[650px]', className)} {...other} ref={forwardedRef}>
                <CodeBlock.Header copyText={codeString.replace('\n', '')}>
                    <div className="text-grey-400 font-sans text-sm font-normal">CURL REQUEST</div>
                </CodeBlock.Header>
                <div className="flex-1 px-6 py-2">
                    <CodeBlock.Content>{codeString}</CodeBlock.Content>
                </div>
            </CodeBlock.Root>
        );
    },
);

const meta = {
    title: 'Components/CodeBlock',
    component: CodeBlockExample,
    // tags: ['autodocs'], react-syntax-highlighter does not want to work with autodocs
    argTypes: {},
} satisfies Meta<typeof CodeBlockExample>;

export default meta;
