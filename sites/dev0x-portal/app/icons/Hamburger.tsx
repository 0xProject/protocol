import { forwardRef } from 'react';
import type { IconProps } from './types';

export const HamburgerIcon = forwardRef<SVGSVGElement, IconProps>(function HamburgerIcon(
    { color = 'black', ...props },
    ref,
) {
    return (
        <svg
            width="20"
            height="14"
            viewBox="0 0 20 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            ref={ref}
        >
            <path
                d="M1 7H19M1 1H19M1 13H19"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
});
