import { prismaMock } from './mocks/prismaMock';
import { mailgunMock } from './mocks/mailgunMock';
import { faker } from '@faker-js/faker';
import {
    getById,
    getByEmail,
    create,
    login,
    logout,
    getSession,
    verifyEmail,
    resetPassword,
    sendEmail,
} from '../services/userService';
import { validatePassword, verifyPassword } from '../utils/passwordUtils';
import userFactory from './factories/userFactory';
import sessionFactory from './factories/sessionFactory';
import verificationTokenFactory from './factories/verificationTokenFactory';

describe('userService', () => {
    beforeEach(async () => jest.resetAllMocks());

    describe('getById', () => {
        test('get a user by ID', async () => {
            const user = userFactory.build();
            prismaMock.user.findUnique.mockResolvedValue(user);

            const result = await getById(user.id);

            expect(result).toEqual(user);
            expect(prismaMock.user.findUnique.mock.calls[0][0].where.id).toEqual(user.id);
        });

        test('attempt to fetch a user that does not exist', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const result = await getById('not-a-real-id');

            expect(result).toBeNull();
            expect(prismaMock.user.findUnique.mock.calls[0][0].where.id).toEqual('not-a-real-id');
        });
    });

    describe('getByEmail', () => {
        test('get by user by email', async () => {
            const user = userFactory.build();
            prismaMock.user.findUnique.mockResolvedValue(user);

            const email = user.email;
            if (!email) {
                throw new Error();
            }

            const result = await getByEmail(email);

            expect(result).toEqual(user);
            expect(prismaMock.user.findUnique.mock.calls[0][0].where.email).toEqual(user.email);
        });

        test('attempt to fetch a user by email that does not exist', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const result = await getByEmail('not-a-real-email');

            expect(result).toBeNull();
            expect(prismaMock.user.findUnique.mock.calls[0][0].where.email).toEqual('not-a-real-email');
        });
    });

    describe('create', () => {
        test('create user with no team params', async () => {
            const user = userFactory.build({ integratorTeam: { name: '__not_init' } });
            prismaMock.integratorTeam.create.mockResolvedValue(user.integratorTeam);
            prismaMock.user.create.mockResolvedValue(user);
            const { email } = user;
            if (!email) {
                throw new Error();
            }

            const result = await create({
                firstName: user.firstName,
                lastName: user.lastName,
                email,
                password: 'sljnbd%&$%&sewefw242345',
            });

            expect(result).toEqual(user);
            expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(user.integratorTeam.name);
            expect(prismaMock.user.create.mock.calls[0][0].data.firstName).toEqual(user.firstName);
            expect(prismaMock.user.create.mock.calls[0][0].data.lastName).toEqual(user.lastName);
            expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
            expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(user.integratorTeam.id);
        });

        test('create user with team params', async () => {
            const user = userFactory.build();
            prismaMock.integratorTeam.create.mockResolvedValue(user.integratorTeam);
            prismaMock.user.create.mockResolvedValue(user);
            const { email } = user;
            if (!email) {
                throw new Error();
            }

            const result = await create({
                firstName: user.firstName,
                lastName: user.lastName,
                email,
                password: 'sljnbd%&$%&sewefw242345',
                integratorTeam: {
                    name: user.integratorTeam.name,
                    productType: user.integratorTeam.productType,
                },
            });

            expect(result).toEqual(user);
            expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(user.integratorTeam.name);
            expect(prismaMock.user.create.mock.calls[0][0].data.firstName).toEqual(user.firstName);
            expect(prismaMock.user.create.mock.calls[0][0].data.lastName).toEqual(user.lastName);
            expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
            expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(user.integratorTeam.id);
        });

        test('create user with team id', async () => {
            const user = userFactory.build();
            prismaMock.integratorTeam.findUnique.mockResolvedValue(user.integratorTeam);
            prismaMock.user.create.mockResolvedValue(user);

            const result = await create({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email as string,
                password: 'sljnbd%&$%&sewefw242345',
                integratorTeamId: user.integratorTeam.id,
            });

            expect(result).toEqual(user);
            expect(prismaMock.integratorTeam.findUnique.mock.calls[0][0].where.id).toEqual(user.integratorTeam.id);
            expect(prismaMock.user.create.mock.calls[0][0].data.firstName).toEqual(user.firstName);
            expect(prismaMock.user.create.mock.calls[0][0].data.lastName).toEqual(user.lastName);
            expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
            expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(user.integratorTeam.id);
        });
    });

    describe('login', () => {
        test('user login', async () => {
            const password = 'sljnbd%&$%&sewefw242345';
            const [salt, passwordHash] = await validatePassword(password);

            const user = userFactory.build({ salt, passwordHash });
            const { email } = user;
            if (!email) {
                throw new Error();
            }
            prismaMock.user.findUnique.mockResolvedValue(user);
            const session = sessionFactory.build();
            prismaMock.session.create.mockResolvedValue(session);

            const result = await login({
                email,
                password,
            });

            expect(result).toEqual(session);
            expect(prismaMock.user.findUnique.mock.calls[0][0].where.email).toEqual(user.email);
        });
    });

    describe('logout', () => {
        test('log user out', async () => {
            const session = sessionFactory.build();

            await logout(session.sessionToken);

            expect(prismaMock.session.delete.mock.calls[0][0].where.sessionToken).toEqual(session.sessionToken);
        });
    });

    describe('getSession', () => {
        test('get session token', async () => {
            const session = sessionFactory.build();
            prismaMock.session.findUnique.mockResolvedValue(session);

            const result = getSession(session.user.id);

            expect(result).resolves.toBe(session);
            expect(prismaMock.session.findUnique.mock.calls[0][0].where.userId).toEqual(session.userId);
        });

        test('no session exists', async () => {
            prismaMock.session.findUnique.mockResolvedValue(null);

            const result = await getSession('user-id-with-no-session');

            expect(result).toEqual(null);
            expect(prismaMock.session.findUnique.mock.calls[0][0].where.userId).toEqual('user-id-with-no-session');
        });
    });

    describe('verifyEmail', () => {
        test('verify user email', async () => {
            const user = userFactory.build({ emailVerifiedAt: null });
            const verificationToken = verificationTokenFactory.build({ user });
            const newEmail = faker.internet.email();

            // mock prisma database access
            prismaMock.verificationToken.findUnique.mockResolvedValue(verificationToken);
            prismaMock.user.create.mockResolvedValue(verificationToken.user);

            await verifyEmail({
                verificationToken: verificationToken.verificationToken,
                email: newEmail,
            });

            expect(prismaMock.user.update.mock.calls[0][0].data.email).toEqual(newEmail);
        });
    });

    describe('resetPassword', () => {
        test('reset user password', async () => {
            const user = userFactory.build();
            const verificationToken = verificationTokenFactory.build({ user });
            console.log({ user, verificationToken });
            prismaMock.verificationToken.findUnique.mockResolvedValue(verificationToken);
            prismaMock.user.create.mockResolvedValue(verificationToken.user);

            await resetPassword({
                verificationToken: verificationToken.verificationToken,
                password: '2498thjbfDFEHET5350smd!!9QR45',
            });

            // The verification token should be deleted
            expect(prismaMock.verificationToken.delete.mock.calls[0][0].where.verificationToken).toEqual(
                verificationToken.verificationToken,
            );
            // The user should be updated with a valid password
            const passwordHash = prismaMock.user.update.mock.calls[0][0].data.passwordHash;
            if (typeof passwordHash !== 'string') {
                throw new Error();
            }
            const isPasswordValid = await verifyPassword({
                password: '2498thjbfDFEHET5350smd!!9QR45',
                passwordHash,
            });
            expect(isPasswordValid).toEqual(true);
        });
    });

    describe('sendEmail', () => {
        test('send email', async () => {
            const user = userFactory.build();
            const emailMessage = {
                id: 'abc',
                message: 'test',
                status: 200,
                details: 'n/a',
            };
            prismaMock.user.findUnique.mockResolvedValue(user);
            mailgunMock.messages.create.mockResolvedValue(emailMessage);

            const result = await sendEmail({ userId: user.id, template: 'test-template', subject: 'test subject' });

            expect(result).toEqual(emailMessage);
            expect(mailgunMock.messages.create.mock.calls[0][0]).toEqual('mg.0x.org');
            expect(mailgunMock.messages.create.mock.calls[0][1]).toEqual(
                expect.objectContaining({
                    subject: 'test subject',
                    template: 'test-template',
                }),
            );
        });
    });
});
