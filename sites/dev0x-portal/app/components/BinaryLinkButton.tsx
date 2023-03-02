import React, { useMemo } from 'react';
import { LinkButton } from './Button';
import { tv } from 'tailwind-variants';

type StateConfiguration = {
    [key in 'left' | 'right']: {
        label: string;
        url: string;
    };
};

type BinaryStateButtonProps = {
    /**Describes which side of the button is active */
    active: keyof StateConfiguration;
    /**Describes the states of the button */
    states: StateConfiguration;
    /**Custom render function for the button */
    render?: (sideProps: ButtonProps) => React.ReactNode;
};

type ButtonProps = StateConfiguration[keyof StateConfiguration] & {
    active: boolean;
    href: string;
    to: string;
    className: string;
};

const button = tv({
    base: 'py-2 px-7 rounded-[14px] text-lg font-sans text-grey-500 inline-block cursor-pointer',
    variants: {
        active: {
            true: 'bg-white text-grey-900 border border-grey-200 shadow-md font-medium leading-[26px]',
            false: 'hover:bg-grey-50',
        },
    },
});

/**
 * A button that is modeled to look like a switch with two states.
 * Its primary use case is to switch between two different pages.
 */
export function BinaryLinkButton({ active, states, render }: BinaryStateButtonProps) {
    const leftProps: ButtonProps = useMemo(
        () => ({
            ...(states.left as StateConfiguration['left']),
            href: states.left.url,
            to: states.left.url,
            active: active === 'left',
            className: button({ active: active === 'left' }),
        }),
        [active, states.left],
    );

    const rightProps: ButtonProps = useMemo(
        () => ({
            ...(states.right as StateConfiguration['right']),
            href: states.right.url,
            to: states.right.url,
            active: active === 'right',
            className: button({ active: active === 'right' }),
        }),
        [active, states.right],
    );

    return (
        <div className="bg-grey-100 rounded-[14px] w-fit">
            {render ? render(leftProps) : <LinkButton {...leftProps}>{states.left.label}</LinkButton>}
            {render ? render(rightProps) : <LinkButton {...rightProps}>{states.right.label}</LinkButton>}
        </div>
    );
}
