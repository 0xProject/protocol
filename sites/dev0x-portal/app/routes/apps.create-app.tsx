import { Form, Outlet, useSubmit } from '@remix-run/react';
import type { ActionArgs } from '@remix-run/server-runtime';
import { redirect } from '@remix-run/server-runtime';
import { createContext, useCallback, useRef } from 'react';
import { sessionStorage } from '../auth.server';
import * as Drawer from '../components/Drawer';
import type { CreateAppFlowType } from '../types';
import { makeMultipageHandler } from '../utils/utils.server';

export async function action({ request }: ActionArgs) {
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));

    const sessionHandler = makeMultipageHandler<CreateAppFlowType>({ session, namespace: 'create-app' });
    sessionHandler.deleteAll();

    throw redirect('/apps', { headers: { 'Set-Cookie': await sessionStorage.commitSession(session) } });
}

export const CloseContext = createContext<() => void>(() => {});

export default function AppApiKey() {
    const ref = useRef<HTMLFormElement>(null);
    const submit = useSubmit();

    const flushCookieSession = useCallback(() => {
        if (ref.current) {
            submit(ref.current);
        }
    }, [ref, submit]);
    return (
        <CloseContext.Provider value={flushCookieSession}>
            <Drawer.Root
                open={true}
                onOpenChange={(open) => {
                    if (!open) {
                        flushCookieSession();
                    }
                }}
            >
                <Drawer.Content position="right" className="w-[694px]">
                    <Outlet />
                    <Form method="post" ref={ref} hidden>
                        {/* to ensure that we can flush the cookie cache on close */}
                    </Form>
                </Drawer.Content>
            </Drawer.Root>
        </CloseContext.Provider>
    );
}
