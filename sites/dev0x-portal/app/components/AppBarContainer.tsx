import { twMerge } from 'tailwind-merge';
import { tv } from 'tailwind-variants';
import * as Toolbar from '@radix-ui/react-toolbar';

const topbar = tv({
    base: 'bg-white fixed top-0 left-0 right-0 z-50 flex items-center justify-start px-8 py-[18px]',
    variants: {
        bottomBorder: {
            true: 'border-b border-grey-200',
        },
    },
});

type TopBarProps = {
    className?: string;
    bottomBorder?: boolean;
    children: React.ReactNode;
};

/**
 * Container element for top bars.
 * To be used with primitives of Radix UI Toolbar
 * @see https://www.radix-ui.com/docs/primitives/components/toolbar
 */
export function AppBarContainer({ className, bottomBorder, children }: TopBarProps) {
    return (
        <Toolbar.Root className={twMerge(topbar({ bottomBorder }), className)} asChild>
            <header>{children}</header>
        </Toolbar.Root>
    );
}
