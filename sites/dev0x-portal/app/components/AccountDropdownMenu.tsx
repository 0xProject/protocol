import { forwardRef } from 'react';
import { Form, Link } from '@remix-run/react';
import { twMerge } from 'tailwind-merge';
import { LinkExternal } from '../icons/LinkExternal';
import * as DropdownMenu from './DropdownMenu';

import type { ClientUser } from '../types';
import type { ElementRef, ComponentPropsWithRef, ComponentPropsWithoutRef } from 'react';

export const Root = DropdownMenu.Root;
export const Trigger = DropdownMenu.Trigger;

const ExternalLinkDropdownItem = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<'a'>>(
    function ExternalLinkDropdownItem({ children, className, ...other }, forwardedRef) {
        return (
            <a
                target="_blank"
                rel="noreferrer"
                className={twMerge('flex items-center justify-between', className)}
                {...other}
                ref={forwardedRef}
            >
                <span>{children}</span>
                <LinkExternal width={14} height={14} />
            </a>
        );
    },
);

type AccountDropdownContentProps = ComponentPropsWithRef<typeof DropdownMenu.Content> & {
    children?: never;
    user: ClientUser;
};

export const Content = forwardRef<ElementRef<typeof DropdownMenu.Content>, AccountDropdownContentProps>(
    function Content({ user, ...other }, forwardedRef) {
        return (
            <DropdownMenu.Portal>
                <DropdownMenu.Content sideOffset={5} collisionPadding={20} {...other} ref={forwardedRef}>
                    <DropdownMenu.Item asChild disabled>
                        <div className="flex flex-col justify-start">
                            <span className="text-grey-800 font-sans text-base">{user.email}</span>
                            {user.team && <span className="text-grey-500 font-sans text-sm">{user.team}</span>}
                        </div>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item asChild>
                        <Link to={`/account/settings`} className="space-y-0">
                            Settings
                        </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item asChild>
                        <ExternalLinkDropdownItem href="https://docs.0x.org/">Docs</ExternalLinkDropdownItem>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                        <ExternalLinkDropdownItem href="https://docs.0x.org/">Help</ExternalLinkDropdownItem>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                        <ExternalLinkDropdownItem href="https://explorer.0x.org/">0x Explorer</ExternalLinkDropdownItem>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator />
                    <Form action="/logout" method="post">
                        <DropdownMenu.Item onSelect={(e) => e.preventDefault()} asChild>
                            <button type="submit" className="mt-0 inline-block w-full">
                                Log out
                            </button>
                        </DropdownMenu.Item>
                    </Form>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        );
    },
);
