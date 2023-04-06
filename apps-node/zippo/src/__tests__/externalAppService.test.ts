import { prismaMock } from './mocks/prismaMock';
import { create, getById, update } from '../services/externalAppService';
import externalAppFactory from './factories/externalAppFactory';

describe('externalAppService', () => {
    beforeEach(() => jest.resetAllMocks());

    describe('getById', () => {
        test('get an app by ID', async () => {
            const externalApp = externalAppFactory.build();

            // mock prisma database access
            prismaMock.integratorExternalApp.findUnique.mockResolvedValue(externalApp);

            const result = await getById(externalApp.id);

            expect(result).toEqual(externalApp);

            // confirm calls to prisma happened as expected
            expect(prismaMock.integratorExternalApp.findUnique.mock.calls[0][0].where.id).toEqual(externalApp.id);
        });
    });

    describe('create', () => {
        test('create an app', async () => {
            const externalApp = externalAppFactory.build();

            // mock prisma database access
            prismaMock.integratorExternalApp.create.mockResolvedValue(externalApp);
            prismaMock.integratorExternalApp.findUnique.mockResolvedValue(externalApp);
            prismaMock.integratorTeam.findUnique.mockResolvedValue(externalApp.integratorTeam);

            const result = await create({
                name: externalApp.name,
                description: externalApp.description as string,
                integratorTeamId: externalApp.integratorTeamId,
            });

            expect(result).toEqual(externalApp);

            // confirm calls to prisma happened as expected
            expect(prismaMock.integratorExternalApp.create.mock.calls[0][0].data.name).toEqual(externalApp.name);
        });
    });

    describe('update', () => {
        test('update an app', async () => {
            const externalApp = externalAppFactory.build();

            // mock prisma database access
            prismaMock.integratorExternalApp.update.mockResolvedValue(externalApp);

            const result = await update(externalApp.id, {
                name: 'My Updated App',
            });

            expect(result).toEqual(externalApp);

            // confirm calls to prisma happened as expected
            expect(prismaMock.integratorExternalApp.update.mock.calls[0][0].where.id).toEqual(externalApp.id);
            expect(prismaMock.integratorExternalApp.update.mock.calls[0][0].data.name).toEqual('My Updated App');
        });
    });
});
