import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import * as Dialog from '@radix-ui/react-dialog';
import { Overlay } from './Overlay';

import type { ComponentProps, ElementRef } from 'react';

/**
 * @see https://www.radix-ui.com/docs/primitives/components/dialog#root
 */
export const Root = Dialog.Root;
/**
 * @see https://www.radix-ui.com/docs/primitives/components/dialog#portal
 */
export const Portal = Dialog.Portal;
/**
 * @see https://www.radix-ui.com/docs/primitives/components/dialog#trigger
 */
export const Trigger = Dialog.Trigger;
/**
 * @see https://www.radix-ui.com/docs/primitives/components/dialog#description
 */
export const Title = Dialog.Title;
/**
 * @see https://www.radix-ui.com/docs/primitives/components/dialog#description
 */
export const Description = Dialog.Description;
/**
 * @see https://www.radix-ui.com/docs/primitives/components/dialog#close
 */
export const Close = Dialog.Close;

const StyledContent = forwardRef<ElementRef<typeof Dialog.Content>, Dialog.DialogContentProps>(function StyledContent(
    { className, ...other },
    forwardedRef,
) {
    return (
        <Dialog.Content
            {...other}
            ref={forwardedRef}
            className={twMerge(
                'fixed top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-solid border-black/10 bg-white focus:outline-none',
                className,
            )}
        />
    );
});

type ContentProps = ComponentProps<typeof Dialog.Content> & {
    portalProps?: ComponentProps<typeof Portal>;
};
export const Content = forwardRef<ElementRef<typeof StyledContent>, ContentProps>(function Content(
    { children, portalProps = {}, ...other },
    forwardedRef,
) {
    return (
        <Portal {...portalProps}>
            <Overlay />
            <StyledContent {...other} ref={forwardedRef}>
                {children}
            </StyledContent>
        </Portal>
    );
});
