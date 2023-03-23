import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';

import type { ComponentPropsWithoutRef } from 'react';
import type { VariantProps } from 'tailwind-variants';

const badge = tv({
    base: 'font-sans text-base  inline-block',
    variants: {
        color: {
            green: 'bg-success-100 text-success-800',
            blue: 'bg-blue-100 text-blue-800',
            brown: 'bg-[#FFE7BD] text-[#421400]',
            purple: 'bg-[#F7ECFF] text-[#6B32E4]',
            yellow: 'bg-warning-100 text-warning-700',
            grey: 'bg-grey-100 text-grey-800',
        },
        roundness: {
            default: 'rounded-md',
            xl: 'rounded-2xl',
        },
        size: {
            default: 'px-3 py-2 font-normal',
            sm: 'px-3.5 py-1 leading-5 font-normal',
        },
    },
});

type BadgeProps = ComponentPropsWithoutRef<'div'> & VariantProps<typeof badge>;

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(function Badge(
    { className, color = 'grey', roundness = 'default', size = 'default', ...other },
    forwardedRef,
) {
    return <div {...other} className={twMerge(badge({ color, roundness, size }), className)} ref={forwardedRef} />;
});
