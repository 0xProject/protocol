import * as Toolbar from '@radix-ui/react-toolbar';
import { ZeroExLogo } from '../icons/ZeroExLogo';
import { Bars } from '../icons/Bars';
import { Button } from './Button';
import { IconButton } from './IconButton';

export const AppBar = () => {
    return (
        <Toolbar.Root className="border-grey-100 sticky top-0 flex min-h-[82px] items-center border-b border-solid bg-white py-4 px-24">
            <div className="w-0 -translate-x-[71px]">
                <IconButton color="transparent" aria-label="Show Menu">
                    <Bars />
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
