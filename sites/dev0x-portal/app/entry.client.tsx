import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

function RemixApp() {
    return (
        <StrictMode>
            <RemixBrowser />
        </StrictMode>
    );
}

function hydrate() {
    startTransition(() => {
        const root = document.getElementById('root');
        if (!root) {
            throw new Error('Root element does not exist');
        }
        hydrateRoot(root, <RemixApp />);
        // since <Head> is wrapped in <ClientOnly> it will
        // not render until after hydration
        // so we need to remove the server rendered head
        // in preparation for the client side render
        document.head.innerHTML = document.head.innerHTML.replace(/<!--start head-->.+<!--end head-->/, '');
    });
}

if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(hydrate);
} else {
    // Safari doesn't support requestIdleCallback
    // https://caniuse.com/requestidlecallback
    setTimeout(hydrate, 1);
}
