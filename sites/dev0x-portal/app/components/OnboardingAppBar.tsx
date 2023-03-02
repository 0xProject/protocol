import { AppBarContainer } from './AppBarContainer';
import * as Toolbar from '@radix-ui/react-toolbar';
import { BinaryLinkButton } from './BinaryLinkButton';
import { Link, useLocation } from '@remix-run/react';

type OnboardingAppBarProps = {
    showNavSwitch?: boolean;
};

export function OnboardingAppBar({ showNavSwitch }: OnboardingAppBarProps) {
    const location = useLocation();
    return (
        <AppBarContainer>
            <img src="/assets/logo.svg" alt="Dev0x" height={28} width={45.55} />
            {showNavSwitch && (
                <div aria-label="Navigation" className="ml-10 w-full">
                    <nav className="w-full flex justify-center -ml-[45.55px]">
                        <BinaryLinkButton
                            active={location.pathname === '/login' ? 'left' : 'right'}
                            states={{
                                left: { label: 'Log in', url: '/login' },
                                right: { label: 'Sign up', url: '/create-account' },
                            }}
                            render={(sideProps) => {
                                return (
                                    <Toolbar.Link asChild>
                                        <Link
                                            className={sideProps.className}
                                            to={sideProps.to}
                                            aria-label={sideProps.label}
                                        >
                                            {sideProps.label}
                                        </Link>
                                    </Toolbar.Link>
                                );
                            }}
                        />
                    </nav>
                </div>
            )}
        </AppBarContainer>
    );
}
