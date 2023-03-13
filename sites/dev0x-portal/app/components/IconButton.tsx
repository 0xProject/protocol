import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';

const iconButton = tv({
    base: 'focus:outline-none focus-visible:ring-2 leading-4 inline-flex box-border',
    variants: {
        size: {
            base: 'p-4',
            xs: 'px-3 py-2',
            sm: 'p-3',
        },
        color: {
            default: 'bg-grey-900 hover:bg-grey-800 shadow-md focus-visible:ring-grey-500',
            transparent: 'bg-transparent',
            grey: 'bg-grey-200 focus-visible:ring-grey-300 ',
            white: 'bg-white',
        },
        disabled: {
            true: 'opacity-50 pointer-events-none',
        },
        roundness: {
            default: 'rounded-2xl',
            sm: 'rounded-lg',
            lg: 'rounded-3xl',
        },
    },
});

type IconButtonProps = {
    /**
     * How large should the button be?
     */
    size?: 'base' | 'xs' | 'sm';

    /**
     * What color to use?
     */
    color?: 'default' | 'grey' | 'white' | 'transparent';
    /**
     * Is button disabled?
     */
    disabled?: boolean;
    /**
     * How rounded the button should be
     */
    roundness?: 'default' | 'sm' | 'lg';
} & React.ComponentPropsWithRef<'button'>;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { children, className, color = 'default', size = 'base', roundness = 'default', disabled, ...other },
    ref,
) {
    if (!other['aria-label']) {
        console.warn('Missing aria-label in IconButton');
    }
    return (
        <button
            className={twMerge(iconButton({ color, size, disabled, roundness }), className)}
            disabled={disabled}
            {...other}
            ref={ref}
        >
            {children}
        </button>
    );
});
