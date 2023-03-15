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
            <div className="text-1.5xl mb-2 font-sans font-normal">Wanna check your products on-chain data?</div>
            <div className="text-grey-400 max-w-[340px] text-center font-sans text-base font-normal">
                0x explorer is a tool where you can check and revise data as it comes through
            </div>
            <AnchorButton
                href="https://explorer.0x.org/"
                rel="noreferrer"
                target="_blank"
                className="mt-10"
                size="md"
                endIcon={<ArrowUpRight />}
            >
                <span>Go to 0x explorer</span>
            </AnchorButton>
        </div>
    );
});
