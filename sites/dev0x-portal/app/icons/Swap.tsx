import { forwardRef } from 'react';
import type { IconProps } from './types';

export const Swap = forwardRef<SVGSVGElement, IconProps>(function Swap(
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
                d="M6 6L8 4M8 4L6 2M8 4H6C3.79086 4 2 5.79086 2 8M18 18L16 20M16 20L18 22M16 20H18C20.2091 20 22 18.2091 22 16M13.4172 13.4172C14.1994 13.7908 15.0753 14 16 14C19.3137 14 22 11.3137 22 8C22 4.68629 19.3137 2 16 2C12.6863 2 10 4.68629 10 8C10 8.92472 10.2092 9.80057 10.5828 10.5828M14 16C14 19.3137 11.3137 22 8 22C4.68629 22 2 19.3137 2 16C2 12.6863 4.68629 10 8 10C11.3137 10 14 12.6863 14 16Z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
});
