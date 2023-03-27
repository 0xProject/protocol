import { Outlet, useMatches } from '@remix-run/react';
import { OnboardingAppBar } from '../components/OnboardingAppBar';

import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
    return {
        title: 'Sign Up | 0x',
        description: 'Sign Up to get started',
    };
};

export default function CreateAccountLayout() {
    const matches = useMatches();

    // We control whether or not to show the nav switch on the current page by adding a `showNavSwitch` property to the route's `handle` object.
    const currentPageMatch = matches.find((match) => 'showNavSwitch' in (match?.handle ?? {}));

    const showNavSwitch = currentPageMatch?.handle?.showNavSwitch ?? false;

    return (
        <div>
            <OnboardingAppBar showNavSwitch={showNavSwitch} />
            <div className="mt-[103px] h-full w-full">
                <Outlet />
            </div>
        </div>
    );
}
