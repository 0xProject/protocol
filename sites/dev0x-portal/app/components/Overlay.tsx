import { forwardRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { twMerge } from 'tailwind-merge';

import type { ElementRef } from 'react';

export const Overlay = forwardRef<ElementRef<typeof Dialog.Overlay>, Dialog.DialogOverlayProps>(function Overlay(
    { className, ...other },
    forwardedRef,
) {
    return (
        <Dialog.Overlay
            {...other}
            className={twMerge('bg-grey-600/70 fixed inset-0 z-10', className)}
            ref={forwardedRef}
        />
    );
});
