import * as Select from '@radix-ui/react-select';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

/** @see {@link https://www.radix-ui.com/docs/primitives/components/select#root} */
export const Root = Select.Root;
/** @see {@link https://www.radix-ui.com/docs/primitives/components/select#trigger} */
export const Trigger = Select.Trigger;
/** @see {@link https://www.radix-ui.com/docs/primitives/components/select#portal} */
export const Portal = Select.Portal;
/** @see {@link https://www.radix-ui.com/docs/primitives/components/select#value} */
export const Value = Select.Value;
/** @see {@link https://www.radix-ui.com/docs/primitives/components/select#icon} */
export const Icon = Select.Icon;
/** @see {@link https://www.radix-ui.com/docs/primitives/components/select#scrollupbutton} */
export const ScrollUpButton = Select.ScrollUpButton;
/** @see {@link https://www.radix-ui.com/docs/primitives/components/select#scrolldownbutton} */
export const ScrollDownButton = Select.ScrollDownButton;
/** @see {@link https://www.radix-ui.com/docs/primitives/components/select#viewport} */
export const ViewPort = Select.Viewport;

export const Item = forwardRef<HTMLDivElement, React.ComponentProps<typeof Select.Item>>(function Item(
    { children, className, ...props },
    forwardedRef,
) {
    return (
        <Select.Item
            {...props}
            className={twMerge(
                'data-[highlighted]:bg-grey-100 data-[checked=true]:bg-grey-100 mt-2 cursor-pointer rounded-lg px-4 py-[14px] outline-none ring-0 first:mt-0',
                className,
            )}
            ref={forwardedRef}
        >
            <Select.ItemText>{children}</Select.ItemText>
        </Select.Item>
    );
});
export const Group = Select.Group;

export const Content = forwardRef<HTMLDivElement, React.ComponentProps<typeof Select.Content>>(function Content(
    { className, children, ...other },
    forwardedRef,
) {
    return (
        <Select.Content className={twMerge('rounded-2xl bg-white p-2 shadow-md', className)} ref={forwardedRef}>
            {children}
        </Select.Content>
    );
});
