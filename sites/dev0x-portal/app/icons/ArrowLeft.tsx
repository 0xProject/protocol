import { forwardRef } from 'react';
import type { IconProps } from './types';

export const ArrowLeft = forwardRef<SVGSVGElement, IconProps>(function ArrowLeft(
    { color = 'currentColor', ...props },
    forwardedRef,
) {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            ref={forwardedRef}
            {...props}
        >
            <path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
});
