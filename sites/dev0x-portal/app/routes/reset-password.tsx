import { Outlet } from '@remix-run/react';
import { OnboardingAppBar } from '../components/OnboardingAppBar';

export default function CreateAccountLayout() {
    return (
        <div>
            <OnboardingAppBar />
            <div className="mt-[103px] h-full w-full">
                <Outlet />
            </div>
        </div>
    );
}
