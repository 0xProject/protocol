import { prismaMock } from './mocks/prismaMock';
import { mailgunMock } from './mocks/mailgunMock';
import { addMinutes } from 'date-fns';
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
import { verifyPassword } from '../utils/passwordUtils';

describe('userService tests', () => {
    describe('get by user ID', () => {
        beforeAll(async () => jest.resetAllMocks());

        const user = {
            id: 'cldn7h4vj000008jufh6zbmwi',
            integratorTeamId: 'cldn84ifb000108ml7dw5g7ip',
            name: 'bob',
            email: 'bob@example.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: 'dfnbkdfnbepofbeob',
            salt: 'dnfbipodefbpoie',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        test('should mock prisma db access and perform get', async () => {
            // mock prisma database access
            prismaMock.user.findUnique.mockResolvedValue(user);

            // perform get and ensure we got the mocked user
            await expect(getById(user.id)).resolves.toEqual(user);
        });

        test('should confirm calls to prisma as expected', () => {
            // confirm calls to prisma happened as expected
            expect(prismaMock.user.findUnique.mock.calls[0][0].where.id).toEqual(user.id);
        });
    });

    describe('get by user by email', () => {
        beforeAll(async () => jest.resetAllMocks());

        const user = {
            id: 'cldn7h4vj000008jufh6zbmwi',
            integratorTeamId: 'cldn84ifb000108ml7dw5g7ip',
            name: 'bob',
            email: 'bob@hello.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: 'dfjkndlkfgneordfgb',
            salt: 'dfjgkndlf',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        test('should mock prisma db access and perform get', async () => {
            // mock prisma database access
            prismaMock.user.findUnique.mockResolvedValue(user);

            // perform get and ensure we got the mocked user
            await expect(getByEmail(user.email)).resolves.toEqual(user);
        });

        test('should confirm calls to prisma as expected', () => {
            // confirm calls to prisma happened as expected
            expect(prismaMock.user.findUnique.mock.calls[0][0].where.email).toEqual(user.email);
        });
    });

    describe('create user no team params', () => {
        beforeAll(async () => jest.resetAllMocks());

        const integratorTeam = {
            id: 'cldn88o0x000208mlcyshgoma',
            name: '__not_init',
            image: '',
            productType: '__not_init',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const user = {
            id: 'cldn88yix000308ml6pnh1lv83',
            integratorTeamId: 'cldn88o0x000208mlcyshgoma',
            name: 'bob',
            email: 'bob@example.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: '$2b$12$cKHbtwgsdMyR8bn0ZvqvlugtalTQfDWZAG0ouWGKnOtKSv/vFwisq',
            salt: '9P6p2P6EIdkOJPlx0kiFmu',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        test('should mock prisma db access and perform create', async () => {
            // mock prisma database access
            prismaMock.integratorTeam.create.mockResolvedValue(integratorTeam);
            prismaMock.user.create.mockResolvedValue(user);

            // perform create and ensure we get back the mocked user
            await expect(
                create({
                    name: user.name,
                    email: user.email,
                    password: 'sljnbd%&$%&sewefw242345',
                }),
            ).resolves.toEqual(user);
        });

        test('should confirm calls to prisma as expected', () => {
            // confirm calls to prisma happened as expected
            expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(integratorTeam.name);
            expect(prismaMock.user.create.mock.calls[0][0].data.name).toEqual(user.name);
            expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
            expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(integratorTeam.id);
        });
    });

    describe('create user with team params', () => {
        beforeAll(async () => jest.resetAllMocks());

        const integratorTeam = {
            id: 'cldn88o0x123408mlcyshgoma',
            name: 'The A Team',
            image: '',
            productType: 'DEX',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const user = {
            id: 'cldn88yix000308ml6pnh1lv83',
            integratorTeamId: 'cldn88o0x123408mlcyshgoma',
            name: 'bob',
            email: 'bob@example.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: '$2b$12$cKHbtwgsdMyR8bn0ZvqvlugtalTQfDWZAG0ouWGKnOtKSv/vFwisq',
            salt: '9P6p2P6EIdkOJPlx0kiFmu',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        test('should mock prisma db access and perform create', async () => {
            // mock prisma database access
            prismaMock.integratorTeam.create.mockResolvedValue(integratorTeam);
            prismaMock.user.create.mockResolvedValue(user);

            // perform create and ensure we get back the mocked user
            await expect(
                create({
                    name: user.name,
                    email: user.email,
                    password: 'sljnbd%&$%&sewefw242345',
                    integratorTeam: {
                        name: integratorTeam.name,
                        productType: integratorTeam.productType,
                    },
                }),
            ).resolves.toEqual(user);
        });

        test('should confirm calls to prisma as expected', () => {
            // confirm calls to prisma happened as expected
            expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(integratorTeam.name);
            expect(prismaMock.user.create.mock.calls[0][0].data.name).toEqual(user.name);
            expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
            expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(integratorTeam.id);
        });
    });

    describe('create user with team id', () => {
        beforeAll(async () => jest.resetAllMocks());

        const integratorTeam = {
            id: 'cldn88o0x123408mlcyshgoma',
            name: 'The B Team',
            image: '',
            productType: 'CEX',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const user = {
            id: 'cldn88yix000308ml6pnh1lv83',
            integratorTeamId: 'cldn88o0x123408mlcyshgoma',
            name: 'bob',
            email: 'bob@example.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: '$2b$12$cKHbtwgsdMyR8bn0ZvqvlugtalTQfDWZAG0ouWGKnOtKSv/vFwisq',
            salt: '9P6p2P6EIdkOJPlx0kiFmu',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        test('should mock prisma db access and perform create', async () => {
            // mock prisma database access
            prismaMock.integratorTeam.findUnique.mockResolvedValue(integratorTeam);
            prismaMock.user.create.mockResolvedValue(user);

            // perform create and ensure we get back the mocked user
            await expect(
                create({
                    name: user.name,
                    email: user.email,
                    password: 'sljnbd%&$%&sewefw242345',
                    integratorTeamId: integratorTeam.id,
                }),
            ).resolves.toEqual(user);
        });

        test('should confirm calls to prisma as expected', () => {
            // confirm calls to prisma happened as expected
            expect(prismaMock.integratorTeam.findUnique.mock.calls[0][0].where.id).toEqual(integratorTeam.id);
            expect(prismaMock.user.create.mock.calls[0][0].data.name).toEqual(user.name);
            expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(user.email);
            expect(prismaMock.user.create.mock.calls[0][0].data.integratorTeamId).toEqual(integratorTeam.id);
        });
    });

    describe('user login', () => {
        beforeAll(async () => jest.resetAllMocks());

        const user = {
            id: 'cldn88yix000308ml6pnh1lv83',
            integratorTeamId: 'cldn88o0x123408mlcyshgoma',
            name: 'bob',
            email: 'bob@example.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: '$2b$12$cKHbtwgsdMyR8bn0ZvqvlugtalTQfDWZAG0ouWGKnOtKSv/vFwisq',
            salt: '9P6p2P6EIdkOJPlx0kiFmu',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        test('should mock prisma db access and create session token', async () => {
            prismaMock.user.findUnique.mockResolvedValue(user);

            await expect(
                login({
                    email: user.email,
                    password: 'sljnbd%&$%&sewefw242345',
                }),
            ).resolves.not.toThrow();
        });

        test('should confirm calls to prisma as expected', () => {
            expect(prismaMock.user.findUnique.mock.calls[0][0].where.email).toEqual(user.email);
        });
    });

    describe('log user out', () => {
        beforeAll(async () => jest.resetAllMocks());

        const token = {
            id: 'clfclj7xh000008ihdun0gygh',
            sessionToken: 'fgngtnrthr',
            userId: 'cldn88yix000308ml6pnh1lv83',
            expires: new Date(),
        };

        test('should mock prisma db access and delete session token', async () => {
            prismaMock.session.create.mockResolvedValue(token);

            await expect(logout(token.sessionToken)).resolves.not.toEqual(token);
        });

        test('should confirm calls to prisma as expected', () => {
            expect(prismaMock.session.delete.mock.calls[0][0].where.sessionToken).not.toEqual(token);
        });
    });

    describe('get session token', () => {
        beforeAll(async () => jest.resetAllMocks());

        const token = {
            id: 'dfgedrgerg',
            sessionToken: 'fgngtnrthr',
            userId: 'cldn88yix000308ml6pnh1lv83',
            expires: new Date(),
        };

        const user = {
            id: 'cldn88yix000308ml6pnh1lv83',
            integratorTeamId: 'cldn88o0x000208mlcyshgoma',
            name: 'bob',
            email: 'bob@example.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: '$2a$12$9P6p2P6EIdkOJPlx0kiFmuG5fm4EhyH2Oe5OQBSKHF3eXFtI0rgF2',
            salt: '9P6p2P6EIdkOJPlx0kiFmu',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        test('should mock prisma db access and create verification token', async () => {
            prismaMock.session.findUnique.mockResolvedValue(token);

            await expect(getSession(user.id)).resolves.toBe(token);
        });

        test('should confirm calls to prisma as expected', () => {
            expect(prismaMock.session.findUnique.mock.calls[0][0].where.userId).toEqual(token.userId);
        });
    });

    describe('verify user email', () => {
        beforeAll(async () => jest.resetAllMocks());

        const user = {
            id: 'cldn88yix000308ml6pnh1lv83',
            integratorTeamId: 'cldn88o0x000208mlcyshgoma',
            name: 'bob',
            email: 'bob@example.com',
            emailVerifiedAt: null,
            image: '',
            passwordHash: '$2a$12$9P6p2P6EIdkOJPlx0kiFmuG5fm4EhyH2Oe5OQBSKHF3eXFtI0rgF2',
            salt: '9P6p2P6EIdkOJPlx0kiFmu',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = {
            id: 'clex06gmv000008jy9wol5yg5',
            verificationToken: 'slbadnfoibndfbif',
            userEmail: 'bob@example.com',
            expires: addMinutes(new Date(), 10),
            user,
        };

        test('should mock prisma db access and update emailVerifiedAt', async () => {
            prismaMock.verificationToken.findUnique.mockResolvedValue(token);
            prismaMock.user.create.mockResolvedValue(user);

            await expect(
                verifyEmail({
                    verificationToken: token.verificationToken,
                    email: 'newbob@example.com',
                }),
            ).resolves.not.toEqual(user);
        });

        test('should confirm calls to prisma as expected', () => {
            expect(prismaMock.user.update.mock.calls[0][0].data.email).toEqual('newbob@example.com');
        });
    });

    describe('reset user password', () => {
        beforeAll(async () => jest.resetAllMocks());

        const user = {
            id: 'cldn88yix000308ml6pnh1lv83',
            integratorTeamId: 'cldn88o0x000208mlcyshgoma',
            name: 'bob',
            email: 'bob@hello.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: '$2a$12$9P6p2P6EIdkOJPlx0kiFmuG5fm4EhyH2Oe5OQBSKHF3eXFtI0rgF2',
            salt: '9P6p2P6EIdkOJPlx0kiFmu',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = {
            id: 'clex06gmv000008jy9wol5yg5',
            verificationToken: 'clf8urk4j0000pc79053w46gc',
            userEmail: 'bob@hello.com',
            expires: addMinutes(new Date(), 10),
            user,
        };

        test('should mock prisma db access and perform password reset', async () => {
            prismaMock.verificationToken.findUnique.mockResolvedValue(token);
            prismaMock.user.create.mockResolvedValue(user);

            await expect(
                resetPassword({
                    verificationToken: token.verificationToken,
                    password: '2498thjbfDFEHET5350smd!!9QR45',
                }),
            ).resolves.not.toEqual(user);
        });
        test('should confirm calls to prisma as expected', () => {
            expect(
                verifyPassword({
                    password: '2498thjbfDFEHET5350smd!!9QR45',
                    passwordHash: prismaMock.user.update.mock.calls[0][0].data.passwordHash as string,
                }),
            ).toBeTruthy();
        });
    });

    describe('send email', () => {
        beforeAll(async () => jest.resetAllMocks());

        const user = {
            id: 'cldn7h4vj000008jufh6zbmwi',
            integratorTeamId: 'cldn84ifb000108ml7dw5g7ip',
            name: 'bob',
            email: 'bob@example.com',
            emailVerifiedAt: new Date(),
            image: '',
            passwordHash: 'dfnbkdfnbepofbeob',
            salt: 'dnfbipodefbpoie',
            lastLoginAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const emailMessage = {
            id: 'abc',
            message: 'test',
            status: 200,
            details: 'n/a',
        };

        test('setup mocks', async () => {
            // mock prisma database access
            prismaMock.user.findUnique.mockResolvedValue(user);
            mailgunMock.messages.create.mockResolvedValue(emailMessage);
        });

        test('should confirm sending email', async () => {
            await expect(
                sendEmail({ userId: 'cldn7h4vj000008jufh6zbmwi', template: 'test-template', subject: 'test subject' }),
            ).resolves.toEqual(emailMessage);

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
