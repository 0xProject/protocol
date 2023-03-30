import type { Session } from '@remix-run/server-runtime';
import { addSeconds, differenceInSeconds } from 'date-fns';
import type { TZippoRouteTag } from 'zippo-interface';
import { sessionStorage } from '../auth.server';
import type { ClientApp } from '../types';

type MultiStepFormSessionHandler<T extends [...any]> = {
    getPage: <N extends keyof T>(page: N) => T[N] | undefined;
    setPage: <N extends keyof T>(page: N, value: T[N]) => void;
    getPages: () => Partial<T>;
    deletePage: (page: number) => void;
    deleteAll: () => void;
};

type VerifyEmailType = {
    retryAt: string;
};

export async function getResendEmailRetryIn(
    request: Request,
    storageKey: string,
    retryImmediately = false,
): Promise<[number, Headers]> {
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));
    const headers = new Headers();
    let verifyEmailSession: VerifyEmailType | undefined = session.get(storageKey);

    if (!verifyEmailSession) {
        verifyEmailSession = {
            retryAt: retryImmediately ? new Date().toISOString() : addSeconds(new Date(), 45).toISOString(),
        };
        session.set(storageKey, verifyEmailSession);
        headers.append('Set-Cookie', await sessionStorage.commitSession(session));
    }

    const verifyEmailRetryIn = verifyEmailSession.retryAt;
    const now = new Date();

    const retryIn =
        verifyEmailRetryIn && new Date(verifyEmailRetryIn) > now
            ? differenceInSeconds(new Date(verifyEmailRetryIn), now)
            : 0;

    return [retryIn, headers];
}

export async function setResendEmailRetryIn(request: Request, storageKey: string, value: number) {
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));
    const headers = new Headers();
    let verifyEmailSession: VerifyEmailType | undefined = session.get(storageKey);

    if (verifyEmailSession) {
        verifyEmailSession.retryAt = addSeconds(new Date(), value).toISOString();
        session.set(storageKey, verifyEmailSession);
        headers.append('Set-Cookie', await sessionStorage.commitSession(session));
    } else {
        verifyEmailSession = {
            retryAt: addSeconds(new Date(), value).toISOString(),
        };
        session.set(storageKey, verifyEmailSession);
        headers.append('Set-Cookie', await sessionStorage.commitSession(session));
    }

    return headers;
}

export async function createFlashMessage(request: Request, key: string, value: string) {
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));
    const headers = new Headers();
    session.flash(key, value);
    headers.append('Set-Cookie', await sessionStorage.commitSession(session));
    return headers;
}

export function makeMultipageHandler<T extends [...any]>({
    session,
    namespace,
}: {
    session: Session;
    namespace: string;
}): MultiStepFormSessionHandler<T> {
    const nameSpace = (session.get(namespace) || []) as Partial<T>;

    return {
        getPage: <N extends keyof T>(page: N) => nameSpace[page],
        setPage: <N extends keyof T>(page: N, value: T[N]) => {
            nameSpace[page] = value;
            session.set(namespace, nameSpace);
        },
        getPages: () => nameSpace,
        deletePage: (page: number) => {
            delete nameSpace[page];
            session.set(namespace, nameSpace);
        },
        deleteAll: () => {
            session.unset(namespace);
        },
    };
}

type MockedAppData = { tagName?: string; id: string; enabledProducts: TZippoRouteTag[] };

export function storeMockForApp(mockedData: MockedAppData, session: Session) {
    const currentMockedData = session.get('mockedData') as MockedAppData[] | undefined;
    if (!currentMockedData) {
        session.set('mockedData', [mockedData]);
    } else {
        const index = currentMockedData.findIndex((mock) => mock.id === mockedData.id);
        if (index === -1) {
            currentMockedData.push(mockedData);
        } else {
            currentMockedData[index] = mockedData;
        }
        session.set('mockedData', currentMockedData);
    }
}

export function enhanceAppWithMockedData(app: ClientApp, session: Session): ClientApp {
    const mockedData = session.get('mockedData') as MockedAppData[] | undefined;
    if (!mockedData) return app;
    const mockForThisApp = mockedData.find((mock) => mock.id === app.id);
    if (!mockForThisApp) return app;
    const out = {
        ...app,
    };
    if (mockForThisApp.tagName) {
        out.onChainTag = { name: mockForThisApp.tagName, color: 'green' };
    }
    if (mockForThisApp.enabledProducts) {
        out.productAccess = mockForThisApp.enabledProducts;
    }
    return out;
}
