import * as Toolbar from '@radix-ui/react-toolbar';
import { Bars } from '../icons/Bars';
import { ZeroExLogo } from '../icons/ZeroExLogo';
import * as AppsDropdownMenu from './AppsDropdownMenu';
import { Button } from './Button';
import { IconButton } from './IconButton';
import * as AccountDropdownMenu from './AccountDropdownMenu';
import { UserCircle } from '../icons/UserCircle';
import { ChevronDown } from '../icons/ChevronDown';
import { useCurrentApp } from '../hooks/userCurrentApp';

import type { App, ClientUser } from '../types';

type AppBarProps = {
    apps: App[];
    user: ClientUser;
};
export const AppBar = ({ apps, user }: AppBarProps) => {
    const currentApp = useCurrentApp(apps);

    return (
        <Toolbar.Root className="border-grey-100 sticky top-0 flex min-h-[82px] items-center border-b border-solid bg-white py-4 px-24">
            <div className="w-0 -translate-x-[71px]">
                <Toolbar.Button asChild>
                    <IconButton color="transparent" aria-label="Show Menu">
                        <Bars />
                    </IconButton>
                </Toolbar.Button>
            </div>
            <div className="mr-11">
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
                <AppsDropdownMenu.Content apps={apps} />
            </AppsDropdownMenu.Root>

            <AccountDropdownMenu.Root>
                <Toolbar.Button asChild>
                    <AccountDropdownMenu.Trigger asChild>
                        <IconButton size="sm" roundness="lg" color="grey" className="ml-3" aria-label="Account Menu">
                            <UserCircle aria-hidden />
                        </IconButton>
                    </AccountDropdownMenu.Trigger>
                </Toolbar.Button>
                <AccountDropdownMenu.Content user={user} />
            </AccountDropdownMenu.Root>

            <Toolbar.Button asChild>
                <Button size="sm" className="ml-auto" roundness="lg">
                    Create an app
                </Button>
            </Toolbar.Button>
        </Toolbar.Root>
    );
};
