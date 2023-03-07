import type { User } from './auth.server';
import { withSignedInUser, auth, sessionStorage } from './auth.server';
import { faker } from '@faker-js/faker';
import { addMinutes, startOfMinute } from 'date-fns';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { doesSessionExist } from './data/zippo.server';

// mock the zippo.server module
vi.mock('./data/zippo.server', () => ({
    doesSessionExist: vi.fn(),
}));

function createUser(overwrites: Partial<User> = {}): User {
    return {
        id: faker.datatype.uuid(),
        email: faker.internet.email(),
        team: faker.company.name(),
        sessionToken: faker.datatype.uuid(),
        expiresAt: addMinutes(new Date(), 15).toISOString(),
        ...overwrites,
    };
}

const createUserSessionCookie = async (user: User) => {
    const session = await sessionStorage.getSession();
    session.set(auth.sessionKey, user);
    return sessionStorage.commitSession(session);
};

const createRequestWithSession = async (user: User) => {
    const request = new Request('/', {
        headers: {
            cookie: await createUserSessionCookie(user),
        },
    });
    return request;
};

describe('withSignedInUser', () => {
    const doesSessionExistMock = doesSessionExist as Mock;

    afterEach(() => {
        doesSessionExistMock.mockReset();
    });

    it('should return the user if the session is valid', async () => {
        const user = createUser();
        doesSessionExistMock.mockReturnValue(true);

        const request = await createRequestWithSession(user);

        let result: User | undefined;

        await withSignedInUser(request, async (user) => {
            result = user;
            return new Response();
        });

        expect(result).toEqual(user);
    });

    it('should redirect to the landing page if the session is invalid', async () => {
        await expect(withSignedInUser(new Request('/'), async () => new Response())).rejects
            .toThrowErrorMatchingInlineSnapshot(`
      NodeResponse {
        "size": 0,
        Symbol(Body internals): {
          "body": null,
          "boundary": null,
          "disturbed": false,
          "error": null,
          "size": 0,
          "type": null,
        },
        Symbol(Response internals): {
          "counter": 0,
          "headers": Headers {
            Symbol(query): [
              "location",
              "/",
            ],
            Symbol(context): null,
          },
          "highWaterMark": undefined,
          "status": 302,
          "statusText": "",
          "url": undefined,
        },
      }
    `);
    });

    it('should return the user if the session is expired but still valid', async () => {
        const user = createUser({
            expiresAt: addMinutes(new Date(), -15).toISOString(),
        });
        doesSessionExistMock.mockReturnValue(true);

        const request = await createRequestWithSession(user);

        let result: User | undefined;

        await withSignedInUser(request, async (user) => {
            result = user;
            return new Response();
        });

        expect(result?.id).toEqual(user.id);
    });

    it('should update the session expiry by 15 minutes if the session is expired but still valid', async () => {
        const user = createUser({
            expiresAt: startOfMinute(addMinutes(new Date(), -15)).toISOString(),
        });
        doesSessionExistMock.mockReturnValue(true);

        const request = await createRequestWithSession(user);

        let result: User | undefined;

        await withSignedInUser(request, async (user) => {
            result = user;
            return new Response();
        });

        expect(startOfMinute(new Date(result?.expiresAt || 0)).toISOString()).toEqual(
            startOfMinute(addMinutes(new Date(), 15)).toISOString(),
        );
    });

    it('should redirect to the login page if the session is expired and invalid', async () => {
        const user = createUser({
            expiresAt: addMinutes(new Date(), -15).toISOString(),
        });
        doesSessionExistMock.mockReturnValue(false);

        const request = await createRequestWithSession(user);

        let result: Response | undefined;

        // the redirect gets thrown as an exception, so we need to assert the exception
        await expect(
            withSignedInUser(request, async (user) => {
                result = new Response();
                return result;
            }),
        ).rejects.toThrowErrorMatchingInlineSnapshot(`
      NodeResponse {
        "size": 0,
        Symbol(Body internals): {
          "body": null,
          "boundary": null,
          "disturbed": false,
          "error": null,
          "size": 0,
          "type": null,
        },
        Symbol(Response internals): {
          "counter": 0,
          "headers": Headers {
            Symbol(query): [
              "location",
              "/login",
              "set-cookie",
              "__session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
            ],
            Symbol(context): null,
          },
          "highWaterMark": undefined,
          "status": 302,
          "statusText": "",
          "url": undefined,
        },
      }
    `); // redirect to login page
    });
});
