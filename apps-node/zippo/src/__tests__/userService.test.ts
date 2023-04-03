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

describe('userService tests', () => {
    beforeEach(async () => jest.resetAllMocks());

    test('get by user ID', async () => {
        const user = userFactory.build();

        prismaMock.user.findUnique.mockResolvedValue(user);

        // perform get and ensure we got the mocked user
        await expect(getById(user.id)).resolves.toEqual(user);
        expect(prismaMock.user.findUnique.mock.calls[0][0].where.id).toEqual(user.id);
    });

    test('get by user by email', async () => {
        const user = userFactory.build();

        // mock prisma database access
        prismaMock.user.findUnique.mockResolvedValue(user);

        // perform get and ensure we got the mocked user
        await expect(getByEmail(user.email as string)).resolves.toEqual(user);

        // confirm calls to prisma happened as expected
        expect(prismaMock.user.findUnique.mock.calls[0][0].where.email).toEqual(user.email);
    });

    test('create user no team params', async () => {
        const user = userFactory.build({ integratorTeam: { name: '__not_init' } });

        // mock prisma database access
        prismaMock.integratorTeam.create.mockResolvedValue(user.integratorTeam);
        prismaMock.user.create.mockResolvedValue(user);

        // perform create and ensure we get back the mocked user
        await expect(
            create({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email as string,
                password: 'sljnbd%&$%&sewefw242345',
            }),
        ).resolves.toEqual(user);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(user.integratorTeam.name);
        expect(prismaMock.user.create.mock.calls[0][0].data.firstName).toEqual(user.firstName);
        expect(prismaMock.user.create.mock.calls[0][0].data.lastName).toEqual(user.lastName);
        expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
        expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(user.integratorTeam.id);
    });

    test('create user with team params', async () => {
        const user = userFactory.build();

        // mock prisma database access
        prismaMock.integratorTeam.create.mockResolvedValue(user.integratorTeam);
        prismaMock.user.create.mockResolvedValue(user);

        // perform create and ensure we get back the mocked user
        await expect(
            create({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email as string,
                password: 'sljnbd%&$%&sewefw242345',
                integratorTeam: {
                    name: user.integratorTeam.name,
                    productType: user.integratorTeam.productType,
                },
            }),
        ).resolves.toEqual(user);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(user.integratorTeam.name);
        expect(prismaMock.user.create.mock.calls[0][0].data.firstName).toEqual(user.firstName);
        expect(prismaMock.user.create.mock.calls[0][0].data.lastName).toEqual(user.lastName);
        expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
        expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(user.integratorTeam.id);
    });

    test('create user with team id', async () => {
        const user = userFactory.build();

        // mock prisma database access
        prismaMock.integratorTeam.findUnique.mockResolvedValue(user.integratorTeam);
        prismaMock.user.create.mockResolvedValue(user);

        // perform create and ensure we get back the mocked user
        await expect(
            create({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email as string,
                password: 'sljnbd%&$%&sewefw242345',
                integratorTeamId: user.integratorTeam.id,
            }),
        ).resolves.toEqual(user);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorTeam.findUnique.mock.calls[0][0].where.id).toEqual(user.integratorTeam.id);
        expect(prismaMock.user.create.mock.calls[0][0].data.firstName).toEqual(user.firstName);
        expect(prismaMock.user.create.mock.calls[0][0].data.lastName).toEqual(user.lastName);
        expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
        expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(user.integratorTeam.id);
    });

    test('user login', async () => {
        const password = 'sljnbd%&$%&sewefw242345';
        const [salt, passwordHash] = await validatePassword(password);

        const user = userFactory.build({ salt, passwordHash });

        // mock prisma database access
        prismaMock.user.findUnique.mockResolvedValue(user);

        // perform login
        await expect(
            login({
                email: user.email as string,
                password: password,
            }),
        ).resolves.not.toThrow();

        expect(prismaMock.user.findUnique.mock.calls[0][0].where.email).toEqual(user.email);
    });

    test('log user out', async () => {
        const session = sessionFactory.build();

        // mock prisma database access
        prismaMock.session.create.mockResolvedValue(session);

        // perform logout
        await expect(logout(session.sessionToken)).resolves.not.toEqual(session);

        // confirm calls to prisma happened as expected
        expect(prismaMock.session.delete.mock.calls[0][0].where.sessionToken).toEqual(session.sessionToken);
    });

    test('get session token', async () => {
        const session = sessionFactory.build();

        // mock prisma database access
        prismaMock.session.findUnique.mockResolvedValue(session);

        // perform getSession
        await expect(getSession(session.user.id)).resolves.toBe(session);

        // confirm calls to prisma happened as expected
        expect(prismaMock.session.findUnique.mock.calls[0][0].where.userId).toEqual(session.userId);
    });

    test('verify user email', async () => {
        const verificationToken = verificationTokenFactory.build();
        const newEmail = faker.internet.email();

        // mock prisma database access
        prismaMock.verificationToken.findUnique.mockResolvedValue(verificationToken);
        prismaMock.user.create.mockResolvedValue(verificationToken.user);

        await expect(
            verifyEmail({
                verificationToken: verificationToken.verificationToken,
                email: newEmail,
            }),
        ).resolves.not.toBeNull();

        // confirm calls to prisma happened as expected
        expect(prismaMock.user.update.mock.calls[0][0].data.email).toEqual(newEmail);
    });

    test('reset user password', async () => {
        const verificationToken = verificationTokenFactory.build();

        // mock prisma database access
        prismaMock.verificationToken.findUnique.mockResolvedValue(verificationToken);
        prismaMock.user.create.mockResolvedValue(verificationToken.user);

        await expect(
            resetPassword({
                verificationToken: verificationToken.verificationToken,
                password: '2498thjbfDFEHET5350smd!!9QR45',
            }),
        ).resolves.not.toEqual(verificationToken.user);

        expect(
            verifyPassword({
                password: '2498thjbfDFEHET5350smd!!9QR45',
                passwordHash: prismaMock.user.update.mock.calls[0][0].data.passwordHash as string,
            }),
        ).toBeTruthy();
    });

    test('send email', async () => {
        const user = userFactory.build();

        const emailMessage = {
            id: 'abc',
            message: 'test',
            status: 200,
            details: 'n/a',
        };

        // mock prisma database access and mailgun
        prismaMock.user.findUnique.mockResolvedValue(user);
        mailgunMock.messages.create.mockResolvedValue(emailMessage);

        // send an email
        await expect(
            sendEmail({ userId: user.id, template: 'test-template', subject: 'test subject' }),
        ).resolves.toEqual(emailMessage);

        // confirm calls to mailgun happened as expected
        expect(mailgunMock.messages.create.mock.calls[0][0]).toEqual('mg.0x.org');
        expect(mailgunMock.messages.create.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                subject: 'test subject',
                template: 'test-template',
            }),
        );
    });
});
