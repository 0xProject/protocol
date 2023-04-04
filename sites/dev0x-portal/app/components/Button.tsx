import { tv } from 'tailwind-variants';
import { twMerge } from 'tailwind-merge';
import { forwardRef } from 'react';
import { Link } from '@remix-run/react';

import type { LinkProps } from '@remix-run/react';

const button = tv({
    base: 'font-sans focus:outline-none focus-visible:ring-2 inline-flex items-center',
    variants: {
        size: {
            md: 'px-6 py-4 text-lg font-medium',
            base: 'px-4 py-3 text-lg font-medium',
            sm: 'px-5 py-[0.6875rem] text-base font-medium',
            xs: 'px-4 py-1.5 text-base',
            '2xs': 'py-1 px-4 text-base',
        },
        color: {
            default: 'bg-grey-900 text-white hover:bg-grey-800 shadow-md focus-visible:ring-grey-500 antialiased',
            grey: 'bg-grey-200 text-grey-900 focus-visible:ring-grey-300 ',
            red: 'bg-red-light text-error-700 focus-visible:ring-error-200',
            transparent: 'bg-transparent border font-thin border-solid border-grey-200 text-grey-900',
        },
        disabled: {
            true: 'bg-grey-100 text-grey-800/40 pointer-events-none shadow-none',
        },
        roundness: {
            default: 'rounded-[0.875rem]',
            lg: 'rounded-3xl',
        },
        //Use in compound variants
        startIcon: {
            true: '',
            false: '',
        },
        //Use in compound variants
        endIcon: {
            true: '',
            false: '',
        },
    },
    compoundVariants: [
        {
            size: ['sm', 'xs', '2xs'],
            roundness: 'default',
            className: 'rounded-xl',
        },
        { size: 'md', startIcon: true, className: 'pl-4' },
        { size: 'md', endIcon: true, className: 'pr-4' },
        { size: 'base', startIcon: true, className: 'pl-3' },
        { size: 'base', endIcon: true, className: 'pr-3' },
        { size: 'sm', startIcon: true, className: 'pl-4' },
        { size: 'sm', endIcon: true, className: 'pr-4' },
        { size: 'xs', startIcon: true, className: 'pl-3' },
        { size: 'xs', endIcon: true, className: 'pr-3' },
        { size: '2xs', startIcon: true, className: 'pl-3' },
        { size: '2xs', endIcon: true, className: 'pr-3' },
    ],
});

const iconContainerBase = tv({
    base: 'w-6 h-6 inline-flex items-center justify-center relative top-[1px]',
});
const iconStartContainer = tv({
    extend: iconContainerBase,
    variants: {
        size: {
            md: 'mr-2',
            base: 'mr-2',
            sm: 'mr-1',
            xs: 'mr-1 w-5 h-5',
            '2xs': 'mr-1 w-4 h-4',
        },
    },
    compoundVariants: [
        {
            size: 'sm',
            roundness: 'lg',
            className: 'w-5 h-5',
        },
    ],
});
const iconEndContainer = tv({
    extend: iconContainerBase,
    variants: {
        size: {
            md: 'ml-2',
            base: 'ml-2',
            sm: 'ml-1',
            xs: 'ml-1 w-5 h-5',
            '2xs': 'ml-1 w-4 h-4',
        },
    },
    compoundVariants: [
        {
            size: 'sm',
            roundness: 'lg',
            className: 'w-5 h-5',
        },
    ],
});

type BaseButtonProps = {
    /**
     * How large should the button be?
     */
    size?: 'md' | 'base' | 'sm' | 'xs' | '2xs';

    /**
     * What color to use?
     */
    color?: 'default' | 'grey' | 'red' | 'transparent';
    /**
     * Is button disabled?
     */
    disabled?: boolean;
    /**
     * How rounded the button should be
     */
    roundness?: 'default' | 'lg';
    /**
     * An icon before the button's label.
     */
    startIcon?: React.ReactElement;
    /**
     * An icon after the button's label.
     */
    endIcon?: React.ReactElement;
};
type ButtonProps = BaseButtonProps & React.ComponentPropsWithRef<'button'>;
type AnchorProps = BaseButtonProps & React.ComponentPropsWithRef<'a'>;
type LinkButtonProps = BaseButtonProps & LinkProps;

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
    {
        children,
        className,
        color = 'default',
        size = 'base',
        roundness = 'default',
        disabled,
        startIcon,
        endIcon,
        ...other
    },
    ref,
) {
    return (
        <Link
            className={twMerge(
                button({ color, size, disabled, roundness, endIcon: Boolean(endIcon), startIcon: Boolean(startIcon) }),
                className,
            )}
            {...other}
            ref={ref}
        >
            {startIcon ? <span className={iconStartContainer({ size })}>{startIcon}</span> : null}
            {children}
            {endIcon ? <span className={iconEndContainer({ size })}>{endIcon}</span> : null}
        </Link>
    );
});

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
        children,
        className,
        color = 'default',
        size = 'base',
        roundness = 'default',
        disabled,
        startIcon,
        endIcon,
        ...other
    },
    forwardedRef,
) {
    return (
        <button
            className={twMerge(
                button({ color, size, disabled, roundness, startIcon: Boolean(startIcon), endIcon: Boolean(endIcon) }),
                className,
            )}
            disabled={disabled}
            {...other}
            ref={forwardedRef}
        >
            {startIcon ? <span className={iconStartContainer({ size })}>{startIcon}</span> : null}
            {children}
            {endIcon ? <span className={iconEndContainer({ size })}>{endIcon}</span> : null}
        </button>
    );
});

export const AnchorButton = forwardRef<HTMLAnchorElement, AnchorProps>(function Button(
    {
        children,
        className,
        color = 'default',
        size = 'base',
        roundness = 'default',
        disabled,
        startIcon,
        endIcon,
        ...other
    },
    forwardedRef,
) {
    return (
        <a
            className={twMerge(
                button({ color, size, disabled, roundness, startIcon: Boolean(startIcon), endIcon: Boolean(endIcon) }),
                className,
            )}
            {...other}
            ref={forwardedRef}
        >
            {startIcon ? <span className={iconStartContainer({ size })}>{startIcon}</span> : null}
            {children}
            {endIcon ? <span className={iconEndContainer({ size })}>{endIcon}</span> : null}
        </a>
    );
});
