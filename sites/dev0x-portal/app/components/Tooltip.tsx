import { forwardRef } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';

import type { VariantProps } from 'tailwind-variants';
import type { ElementRef, ComponentPropsWithoutRef } from 'react';

/**
 * @see https://www.radix-ui.com/docs/primitives/components/tooltip#provider
 */
export const Provider = TooltipPrimitive.Provider;
/**
 * @see https://www.radix-ui.com/docs/primitives/components/tooltip#root
 */
export const Root = TooltipPrimitive.Root;
/**
 * @see https://www.radix-ui.com/docs/primitives/components/tooltip#trigger
 */
export const Trigger = TooltipPrimitive.Trigger;

const content = tv({
    base: 'z-50 overflow-hidden text-base',
    variants: {
        color: {
            black: 'bg-grey-900 text-white px-3 py-2 rounded antialiased font-medium',
        },
    },
});

/**
 * @see https://www.radix-ui.com/docs/primitives/components/tooltip#content
 */
type ContentProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & VariantProps<typeof content>;
export const Content = forwardRef<ElementRef<typeof TooltipPrimitive.Content>, ContentProps>(function Content(
    { className, color = 'black', ...props },
    forwardedRef,
) {
    return (
        <TooltipPrimitive.Content ref={forwardedRef} className={twMerge(content({ color }), className)} {...props} />
    );
});
