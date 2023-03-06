import { forwardRef } from 'react';
import type { IconProps } from './types';

export const ChevronDown = forwardRef<SVGSVGElement, IconProps>(function ChevronDown(
    { color = 'currentColor', ...props },
    ref,
) {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
            ref={ref}
        >
            <path d="M6 9L12 15L18 9" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    );
});
