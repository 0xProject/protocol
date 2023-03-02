import * as Toolbar from '@radix-ui/react-toolbar';
import { ZeroExLogo } from '../icons/ZeroExLogo';
import { HamburgerIcon } from '../icons/Hamburger';
import { Button } from './Button';
import { IconButton } from './IconButton';

export const AppBar = () => {
    return (
        <Toolbar.Root className="border-grey-100 border-solid border-b min-h-[82px] sticky bg-white top-0 flex items-center py-4 px-24">
            <div className="-translate-x-[71px] w-0">
                <IconButton color="transparent" aria-label="Show Menu">
                    <HamburgerIcon />
                </IconButton>
            </div>
            <div className="mr-11">
                <ZeroExLogo />
            </div>
            <Toolbar.Button asChild>
                {/* TODO: adjust once agree on solution with design team  */}
                <Button roundness="lg" size="sm" color="grey">
                    All apps
                </Button>
            </Toolbar.Button>
            <Toolbar.Button asChild>
                {/* TODO: adjust once agree on solution with design team  */}
                <Button size="sm" className="ml-auto" roundness="lg">
                    Create an app
                </Button>
            </Toolbar.Button>
        </Toolbar.Root>
    );
};
