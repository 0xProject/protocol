import { forwardRef } from 'react';
import { Link } from '@remix-run/react';
import * as DropdownMenu from './DropdownMenu';

import type { App } from '../types';
import type { ElementRef, ComponentPropsWithRef } from 'react';

export const Root = DropdownMenu.Root;
export const Trigger = DropdownMenu.Trigger;

type AppsDropdownMenuProps = ComponentPropsWithRef<typeof DropdownMenu.Content> & {
    apps: App[];
    children?: never;
};

export const Content = forwardRef<ElementRef<typeof DropdownMenu.Content>, AppsDropdownMenuProps>(function Content({
    apps,
}: AppsDropdownMenuProps) {
    return (
        <DropdownMenu.Portal>
            <DropdownMenu.Content sideOffset={5}>
                <DropdownMenu.Item asChild>
                    <Link to={'/apps'}>All apps</Link>
                </DropdownMenu.Item>
                {apps.map(({ name, encodedUrlPathname }) => {
                    return (
                        <DropdownMenu.Item asChild key={encodedUrlPathname}>
                            <Link to={`/apps/${encodedUrlPathname}`}>{name}</Link>
                        </DropdownMenu.Item>
                    );
                })}
            </DropdownMenu.Content>
        </DropdownMenu.Portal>
    );
});
