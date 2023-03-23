import { addSeconds, differenceInSeconds } from 'date-fns';
import { sessionStorage } from '../auth.server';

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
