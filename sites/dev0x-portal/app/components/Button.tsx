import { tv } from 'tailwind-variants';
import { twMerge } from 'tailwind-merge';
import { forwardRef } from 'react';
import { Link } from '@remix-run/react';
import type { LinkProps } from '@remix-run/react';

const button = tv({
    base: 'font-sans text-base focus:outline-none focus-visible:ring-2 inline-flex items-center',
    variants: {
        size: {
            base: 'leading-6.5 px-6 py-4',
            md: 'leading-6.5 px-4 py-3',
            sm: 'leading-5.5 p-3',
            xs: ' leading-5.5 py-1.5 px-2.5',
        },
        color: {
            default: 'bg-grey-900 text-white hover:bg-grey-800 shadow-md focus-visible:ring-grey-500',
            grey: 'bg-grey-200 text-grey-900 focus-visible:ring-grey-300 ',
            red: 'bg-red-light text-error-700 focus-visible:ring-error-200',
            transparent: 'bg-transparent border border-solid border-grey-200 text-grey-900',
        },
        disabled: {
            true: 'opacity-50 pointer-events-none',
        },
        roundness: {
            default: 'rounded-2xl',
            lg: 'rounded-3xl',
        },
    },
});

const iconContainerBase = tv({
    base: 'w-6 h-6 inline-flex items-center justify-center',
});
const iconStartContainer = tv({
    extend: iconContainerBase,
    variants: {
        size: {
            base: 'mr-2 -ml-2',
            md: 'mr-2 -ml-2',
            sm: 'mr-1 -ml-1',
            xs: 'mr-1 -ml-1',
        },
    },
});
const iconEndContainer = tv({
    extend: iconContainerBase,
    variants: {
        size: {
            base: '-mr-2 ml-2',
            md: '-mr-2 ml-2',
            sm: '-mr-1 ml-1',
            xs: '-mr-1 ml-1',
        },
    },
});

type BaseButtonProps = {
    /**
     * How large should the button be?
     */
    size?: 'base' | 'md' | 'sm' | 'xs';

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
    { children, className, color = 'default', size = 'base', roundness = 'default', disabled, ...other },
    ref,
) {
    return (
        <Link className={twMerge(button({ color, size, disabled, roundness }), className)} {...other} ref={ref}>
            {children}
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
            className={twMerge(button({ color, size, disabled, roundness }), className)}
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
        <a className={twMerge(button({ color, size, disabled, roundness }), className)} {...other} ref={forwardedRef}>
            {startIcon ? <span className={iconStartContainer({ size })}>{startIcon}</span> : null}
            {children}
            {endIcon ? <span className={iconEndContainer({ size })}>{endIcon}</span> : null}
        </a>
    );
});
