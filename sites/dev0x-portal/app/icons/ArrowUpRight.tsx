import { forwardRef } from 'react';
import type { IconProps } from './types';

export const ArrowUpRight = forwardRef<SVGSVGElement, IconProps>(function ArrowUpRight(
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
                d="M7 6C6.44772 6 6 6.44772 6 7C6 7.55228 6.44772 8 7 8H14.5858L6.29289 16.2929C5.90237 16.6834 5.90237 17.3166 6.29289 17.7071C6.68342 18.0976 7.31658 18.0976 7.70711 17.7071L16 9.41421V17C16 17.5523 16.4477 18 17 18C17.5523 18 18 17.5523 18 17V7C18 6.44772 17.5523 6 17 6H7Z"
                fill={color}
            />
        </svg>
    );
});
