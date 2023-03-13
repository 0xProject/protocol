import { ComponentPropsWithoutRef, forwardRef } from 'react';
import { Link } from '@remix-run/react';
import * as DropdownMenu from './DropdownMenu';
import { twMerge } from 'tailwind-merge';

import type { ClientUser } from '../types';
import type { ElementRef, ComponentPropsWithRef } from 'react';
import { LinkExternal } from '../icons/LinkExternal';

export const Root = DropdownMenu.Root;
export const Trigger = DropdownMenu.Trigger;

type ExternalLinkDropdownItemProps = ComponentPropsWithoutRef<'a'>;

function ExternalLinkDropdownItemContent({ children, className, ...other }: ExternalLinkDropdownItemProps) {
    return (
        <a
            target="_blank"
            rel="noreferrer"
            className={twMerge('flex items-center justify-between', className)}
            {...other}
        >
            <span>{children}</span>
            <LinkExternal width={12} height={12} />
        </a>
    );
}

type AccountDropdownContentProps = ComponentPropsWithRef<typeof DropdownMenu.Content> & {
    children?: never;
    user: ClientUser;
};

export const Content = forwardRef<ElementRef<typeof DropdownMenu.Content>, AccountDropdownContentProps>(
    function Content({ className, user, ...other }, forwardedRef) {
        return (
            <DropdownMenu.Portal>
                <DropdownMenu.Content sideOffset={5} {...other} className={twMerge(className)} ref={forwardedRef}>
                    <DropdownMenu.Item asChild disabled>
                        <div className="flex flex-col justify-start">
                            <span className="text-grey-500 font-sans text-sm">{user.email}</span>
                            {user.team && <span className="text-grey-500 font-sans text-sm">{user.team}</span>}
                        </div>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item asChild>
                        <Link to={`/account/settings`}>Settings</Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item asChild>
                        <ExternalLinkDropdownItemContent href="https://docs.0x.org/">
                            Docs
                        </ExternalLinkDropdownItemContent>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                        <ExternalLinkDropdownItemContent href="https://docs.0x.org/">
                            Help
                        </ExternalLinkDropdownItemContent>
                    </DropdownMenu.Item>{' '}
                    <DropdownMenu.Item asChild>
                        <ExternalLinkDropdownItemContent href="https://explorer.0x.org/">
                            0x Explorer
                        </ExternalLinkDropdownItemContent>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item asChild>
                        <Link to={`/logout`}>Log out</Link>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        );
    },
);
