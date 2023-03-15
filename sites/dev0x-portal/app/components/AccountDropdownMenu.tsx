import { forwardRef } from 'react';
import { Link } from '@remix-run/react';
import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import { twMerge } from 'tailwind-merge';
import { LinkExternal } from '../icons/LinkExternal';
import * as DropdownMenu from './DropdownMenu';

import type { ClientUser } from '../types';
import type { ElementRef, ComponentPropsWithRef, ComponentPropsWithoutRef } from 'react';

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

export const Item = forwardRef<HTMLDivElement, RadixDropdownMenu.DropdownMenuItemProps>(function Item(
    { className, children, ...other },
    forwardedRef,
) {
    return (
        <RadixDropdownMenu.Item
            className={twMerge(
                'data-[highlighted]:text-grey-400 flex select-none py-3 text-sm outline-none first:pt-0 last:pb-0',
                className,
            )}
            {...other}
            ref={forwardedRef}
        >
            {children}
        </RadixDropdownMenu.Item>
    );
});

type AccountDropdownContentProps = ComponentPropsWithRef<typeof DropdownMenu.Content> & {
    children?: never;
    user: ClientUser;
};

export const Content = forwardRef<ElementRef<typeof DropdownMenu.Content>, AccountDropdownContentProps>(
    function Content({ className, user, ...other }, forwardedRef) {
        return (
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    sideOffset={5}
                    collisionPadding={20}
                    {...other}
                    className={twMerge('p-4', className)}
                    ref={forwardedRef}
                >
                    <Item asChild disabled>
                        <div className="flex flex-col justify-start">
                            <span className="text-grey-500 font-sans text-sm">{user.email}</span>
                            {user.team && <span className="text-grey-500 font-sans text-sm">{user.team}</span>}
                        </div>
                    </Item>
                    <DropdownMenu.Separator />
                    <Item asChild>
                        <Link to={`/account/settings`}>Settings</Link>
                    </Item>
                    <DropdownMenu.Separator />
                    <Item asChild>
                        <ExternalLinkDropdownItemContent href="https://docs.0x.org/">
                            Docs
                        </ExternalLinkDropdownItemContent>
                    </Item>
                    <Item asChild>
                        <ExternalLinkDropdownItemContent href="https://docs.0x.org/">
                            Help
                        </ExternalLinkDropdownItemContent>
                    </Item>{' '}
                    <Item asChild>
                        <ExternalLinkDropdownItemContent href="https://explorer.0x.org/">
                            0x Explorer
                        </ExternalLinkDropdownItemContent>
                    </Item>
                    <DropdownMenu.Separator />
                    <Item asChild>
                        <Link to={`/logout`}>Log out</Link>
                    </Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        );
    },
);
