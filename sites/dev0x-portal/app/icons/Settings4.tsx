import { forwardRef } from 'react';
import type { IconProps } from './types';

export const Settings4 = forwardRef<SVGSVGElement, IconProps>(function Settings4(
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
            {...props}
            ref={forwardedRef}
        >
            <path
                d="M3 8L15 8M15 8C15 9.65686 16.3431 11 18 11C19.6569 11 21 9.65685 21 8C21 6.34315 19.6569 5 18 5C16.3431 5 15 6.34315 15 8ZM9 16L21 16M9 16C9 17.6569 7.65685 19 6 19C4.34315 19 3 17.6569 3 16C3 14.3431 4.34315 13 6 13C7.65685 13 9 14.3431 9 16Z"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
});
