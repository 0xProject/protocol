import * as Toolbar from '@radix-ui/react-toolbar';
import { ZeroExLogo } from '../icons/ZeroExLogo';
import * as AppsDropdownMenu from './AppsDropdownMenu';
import { Button } from './Button';
import { IconButton } from './IconButton';
import * as AccountDropdownMenu from './AccountDropdownMenu';
import { UserCircle } from '../icons/UserCircle';
import { ChevronDown } from '../icons/ChevronDown';
import { useCurrentApp } from '../hooks/useCurrentApp';
import { HelpCircle } from '../icons/HelpCircle';

import type { ClientApp } from '../types';

type AppBarProps = {
    apps: ClientApp[];
    userEmail: string;
    userTeam?: string;
};
export const AppBar = ({ apps, userEmail, userTeam }: AppBarProps) => {
    const currentApp = useCurrentApp(apps);

    return (
        <Toolbar.Root className="border-grey-100 sticky top-0 z-10 flex min-h-[82px] items-center border-b border-solid bg-white py-4 px-8">
            <div className="mr-7">
                <ZeroExLogo />
            </div>
            <AppsDropdownMenu.Root>
                <Toolbar.Button asChild>
                    <AppsDropdownMenu.Trigger asChild>
                        <Button color="grey" roundness="lg" size="sm" endIcon={<ChevronDown aria-hidden />}>
                            {currentApp ? currentApp.name : 'All apps'}
                        </Button>
                    </AppsDropdownMenu.Trigger>
                </Toolbar.Button>
                <AppsDropdownMenu.Content apps={apps} align="start" />
            </AppsDropdownMenu.Root>

            <div className="ml-auto grid grid-flow-col gap-x-4">
                <Toolbar.Button asChild>
                    <Button size="sm" color="transparent">
                        See docs
                    </Button>
                </Toolbar.Button>
                <Toolbar.Button asChild>
                    <IconButton size="sm" color="grey" aria-label="Help" roundness="lg">
                        <HelpCircle aria-hidden />
                    </IconButton>
                </Toolbar.Button>
                <AccountDropdownMenu.Root>
                    <Toolbar.Button asChild>
                        <AccountDropdownMenu.Trigger asChild>
                            <IconButton size="sm" roundness="lg" color="grey" aria-label="Account Menu">
                                <UserCircle aria-hidden />
                            </IconButton>
                        </AccountDropdownMenu.Trigger>
                    </Toolbar.Button>
                    <AccountDropdownMenu.Content userEmail={userEmail} userTeam={userTeam} align="end" />
                </AccountDropdownMenu.Root>
            </div>
        </Toolbar.Root>
    );
};
