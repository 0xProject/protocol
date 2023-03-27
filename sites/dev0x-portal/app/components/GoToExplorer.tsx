import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { ArrowUpRight } from '../icons/ArrowUpRight';
import { AnchorButton } from './Button';

import type { ComponentPropsWithoutRef } from 'react';

type GoToExplorerProps = ComponentPropsWithoutRef<'div'> & {
    title?: string;
    description?: string;
    url?: string;
    buttonClassName?: string;
};
export const GoToExplorer = forwardRef<HTMLDivElement, GoToExplorerProps>(function GoToExplorer(
    {
        className,
        title = 'Explore your transaction data',
        description = 'View on-chain data and transactions from your tagged apps on 0x explorer.',
        url = 'https://explorer.0x.org/',
        buttonClassName,
        ...other
    },
    forwardedRef,
) {
    return (
        <div
            className={twMerge('bg-grey-100 flex flex-col items-center justify-center rounded-xl p-20', className)}
            {...other}
            ref={forwardedRef}
        >
            <div className="mb-2 font-sans text-xl font-normal">{title}</div>
            <div className="text-grey-400 max-w-[340px] text-center font-sans text-base font-thin">{description}</div>
            <AnchorButton
                href={url}
                rel="noreferrer"
                target="_blank"
                className={twMerge('mt-10', buttonClassName)}
                endIcon={<ArrowUpRight />}
            >
                <span>Go to 0x explorer</span>
            </AnchorButton>
        </div>
    );
});
