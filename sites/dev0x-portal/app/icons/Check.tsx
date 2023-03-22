import { forwardRef } from 'react';
import type { IconProps } from './types';

export const Check = forwardRef<SVGSVGElement, IconProps>(function Check(
    { color = 'currentColor', strokeWidth = 2, ...props },
    forwardedRef,
) {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            ref={forwardedRef}
        >
            <path
                d="M20 6L9 17L4 12"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
});
