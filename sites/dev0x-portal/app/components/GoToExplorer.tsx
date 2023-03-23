import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { ArrowUpRight } from '../icons/ArrowUpRight';
import { AnchorButton } from './Button';

import type { ComponentPropsWithoutRef } from 'react';

export const GoToExplorer = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function GoToExplorer(
    { className, ...other },
    forwardedRef,
) {
    return (
        <div
            className={twMerge('bg-grey-100 flex flex-col items-center justify-center rounded-xl p-20', className)}
            {...other}
            ref={forwardedRef}
        >
            <div className="mb-2 font-sans text-xl font-normal">Explore your transaction data</div>
            <div className="text-grey-400 max-w-[340px] text-center font-sans text-base font-thin">
                View on-chain data and transactions from your tagged apps on 0x explorer.
            </div>
            <AnchorButton
                href="https://explorer.0x.org/"
                rel="noreferrer"
                target="_blank"
                className="mt-10"
                endIcon={<ArrowUpRight />}
            >
                <span>Go to 0x explorer</span>
            </AnchorButton>
        </div>
    );
});
