import { forwardRef } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { tv } from 'tailwind-variants';
import { twMerge } from 'tailwind-merge';
import { Check } from '../icons/Check';

const radio = tv({
    base:
        'w-4 h-4 border border-grey-300 rounded-full text-white hover:cursor-pointer disabled:!bg-grey-400 disabled:!border-grey-400 ' +
        'data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:hover:bg-grey-600 hover:bg-grey-100',
});

export const Radio = forwardRef<HTMLButtonElement, Checkbox.CheckboxProps>(function Radio(
    { className, ...props },
    forwardedRef,
) {
    return (
        <Checkbox.Root ref={forwardedRef} className={twMerge(radio(), className)} {...props}>
            <Checkbox.Indicator className="flex justify-center">
                <Check width={10} height={14} strokeWidth={4} />
            </Checkbox.Indicator>
        </Checkbox.Root>
    );
});
