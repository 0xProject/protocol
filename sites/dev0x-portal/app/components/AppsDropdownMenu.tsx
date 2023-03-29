import { forwardRef } from 'react';
import { Link, useLocation } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';
import * as DropdownMenu from './DropdownMenu';
import { Check } from '../icons/Check';

import type { ClientApp } from '../types';
import type { ElementRef, ComponentPropsWithRef, SVGAttributes } from 'react';

export const Root = DropdownMenu.Root;
export const Trigger = DropdownMenu.Trigger;

//this icon is no compatible with Button, IconButton thus it's private component of AppsDropdownMenu
function PlusCirce(props: SVGAttributes<SVGElement>) {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g clipPath="url(#clip0_2226_40992)">
                <path
                    d="M9.99984 6.66663V13.3333M6.6665 9.99996H13.3332M18.3332 9.99996C18.3332 14.6023 14.6022 18.3333 9.99984 18.3333C5.39746 18.3333 1.6665 14.6023 1.6665 9.99996C1.6665 5.39759 5.39746 1.66663 9.99984 1.66663C14.6022 1.66663 18.3332 5.39759 18.3332 9.99996Z"
                    stroke="#3A65EB"
                    strokeWidth="1.41667"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
            <defs>
                <clipPath id="clip0_2226_40992">
                    <rect width="20" height="20" fill="white" />
                </clipPath>
            </defs>
        </svg>
    );
}

type AppsDropdownMenuProps = ComponentPropsWithRef<typeof DropdownMenu.Content> & {
    apps: ClientApp[];
    children?: never;
};

export const Content = forwardRef<ElementRef<typeof DropdownMenu.Content>, AppsDropdownMenuProps>(function Content(
    { apps, className, ...other },
    forwardedRef,
) {
    const { pathname } = useLocation();

    return (
        <DropdownMenu.Portal>
            <DropdownMenu.Content
                sideOffset={5}
                className={twMerge('min-w-[220px] space-y-1.5', className)}
                {...other}
                ref={forwardedRef}
            >
                <DropdownMenu.Item asChild>
                    <Link to={'/apps/create'} className="bg-grey-100 flex items-center">
                        <PlusCirce className="relative -top-[1px] mr-2" />
                        <span>Create an app</span>
                    </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                    <Link to={'/apps'} className="flex items-center justify-between">
                        <span>All apps</span>
                        {pathname === '/apps' && <Check width={16} height={16} className="relative -top-[1px] ml-2" />}
                    </Link>
                </DropdownMenu.Item>
                {apps.map(({ name, id }) => {
                    return (
                        <DropdownMenu.Item asChild key={id}>
                            <Link to={`/apps/${id}`} className="flex items-center justify-between">
                                <span>{name}</span>
                                {pathname.includes(id) && (
                                    <Check width={16} height={16} className="relative -top-[1px] ml-2" />
                                )}
                            </Link>
                        </DropdownMenu.Item>
                    );
                })}
            </DropdownMenu.Content>
        </DropdownMenu.Portal>
    );
});
