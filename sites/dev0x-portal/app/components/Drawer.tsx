import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import * as Dialog from '@radix-ui/react-dialog';
import { tv } from 'tailwind-variants';
import { Overlay } from './Overlay';

import type { ComponentPropsWithRef, ElementRef } from 'react';

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

export const positions = ['top', 'right', 'bottom', 'left'] as const;
type Position = (typeof positions)[number];

const content = tv({
    base: 'z-20 fixed bg-white rounded-lg',
    variants: {
        position: {
            top: 'top-2 left-2 right-2 h-72 ',
            right: 'top-2 bottom-2 right-2 w-72',
            bottom: 'bottom-2 left-2 right-2 h-72',
            left: 'top-2 bottom-2 left-2 w-72',
        },
    },
});

type ContentProps = ComponentPropsWithRef<typeof Dialog.Content> & {
    position: Position;
};
export const Content = forwardRef<ElementRef<typeof Dialog.Content>, ContentProps>(function Content(
    { children, className, position = 'right', ...other },
    forwardedRef,
) {
    return (
        <Dialog.Portal>
            <Overlay />
            <Dialog.Content {...other} className={twMerge(content({ position }), className)} ref={forwardedRef}>
                {children}
            </Dialog.Content>
        </Dialog.Portal>
    );
});
