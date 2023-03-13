import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

import type { ComponentPropsWithRef, ElementRef } from 'react';

export const Root = DropdownMenu.Root;
export const Trigger = DropdownMenu.Trigger;
export const Portal = DropdownMenu.Portal;

export const Separator = forwardRef<
    ElementRef<typeof DropdownMenu.Separator>,
    ComponentPropsWithRef<typeof DropdownMenu.Separator>
>(function Separator({ className, ...other }, forwardedRef) {
    return (
        <DropdownMenu.Separator {...other} className={twMerge('bg-grey-200 h-[1px]', className)} ref={forwardedRef} />
    );
});

export const Content = forwardRef<HTMLDivElement, DropdownMenu.DropdownMenuContentProps>(function Content(
    { className, children, ...other },
    forwardedRef,
) {
    return (
        <DropdownMenu.Content
            className={twMerge(
                'border-grey-200 overflow-hidden rounded-3xl border border-solid bg-white p-4 shadow-md',
                className,
            )}
            {...other}
            ref={forwardedRef}
        >
            {children}
        </DropdownMenu.Content>
    );
});

export const Item = forwardRef<HTMLDivElement, DropdownMenu.DropdownMenuItemProps>(function Item(
    { className, children, ...other },
    forwardedRef,
) {
    return (
        <DropdownMenu.Item
            className={twMerge(
                'data-[highlighted]:text-grey-400 flex select-none py-3 text-sm outline-none first:pt-0 last:pb-0',
                className,
            )}
            {...other}
            ref={forwardedRef}
        >
            {children}
        </DropdownMenu.Item>
    );
});
