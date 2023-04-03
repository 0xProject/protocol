import { prismaMock } from './mocks/prismaMock';
import { kongMock } from './mocks/kongMock';
import {
    create,
    createApiKey,
    deleteApiKey,
    deprovisionAccess,
    getById,
    provisionAccess,
    update,
    updateApiKey,
} from '../services/appService';
import appFactory from './factories/appFactory';
import apiKeyFactory from './factories/apiKeyFactory';
import { TZippoRouteTag } from 'zippo-interface';

describe('appService', () => {
    beforeEach(() => jest.resetAllMocks());
    beforeEach(() => mockKongWithKey());

    test('get by app ID', async () => {
        const app = appFactory.build();

        // mock prisma database access
        prismaMock.integratorApp.findUnique.mockResolvedValue(app);

        await expect(getById(app.id)).resolves.toEqual(app);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorApp.findUnique.mock.calls[0][0].where.id).toEqual(app.id);
    });

    test('create app', async () => {
        const app = appFactory.build();
        const appWithKey = { ...app };
        appWithKey.apiKeys.push(apiKeyFactory.build({ app: appWithKey }));

        // mock prisma database access
        prismaMock.integratorApp.create.mockResolvedValue(app);
        prismaMock.integratorApp.findUnique.mockResolvedValue(appWithKey);
        prismaMock.integratorTeam.findUnique.mockResolvedValue(app.integratorTeam);

        await expect(
            create({
                name: app.name,
                description: app.description as string,
                integratorTeamId: app.integratorTeamId,
            }),
        ).resolves.toEqual(appWithKey);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorApp.create.mock.calls[0][0].data.name).toEqual(app.name);
    });

    test('update app', async () => {
        const app = appFactory.build();

        // mock prisma database access
        prismaMock.integratorApp.update.mockResolvedValue(app);

        await expect(
            update(app.id, {
                name: 'My Updated App',
            }),
        ).resolves.toEqual(app);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorApp.update.mock.calls[0][0].where.id).toEqual(app.id);
        expect(prismaMock.integratorApp.update.mock.calls[0][0].data.name).toEqual('My Updated App');
    });

    test('provision access', async () => {
        const app = appFactory.build();
        // simulate adding a new integratorAccess to the app
        app.integratorAccess.push({
            integratorAppId: app.id,
            routeTag: TZippoRouteTag.SwapV1Prices,
            rateLimit: '{ minute: 3 }',
            updatedAt: new Date(),
            createdAt: new Date(),
        });

        // mock prisma database access
        prismaMock.integratorApp.findUnique.mockResolvedValue(app);

        const provisionedApp = await provisionAccess(app.id, [TZippoRouteTag.SwapV1Prices], [{ minute: 3 }]);
        if (!provisionedApp) {
            throw new Error('Unable to provision access');
        }
        expect(provisionedApp.integratorAccess.length).toEqual(1);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorAccess.upsert.mock.calls[0][0].where).toEqual({
            integratorAppId_routeTag: { integratorAppId: app.id, routeTag: TZippoRouteTag.SwapV1Prices },
        });
    });

    test('deprovision access', async () => {
        const app = appFactory.build();

        // mock prisma database access
        prismaMock.integratorApp.findUnique.mockResolvedValue(app);

        const deprovisionedApp = await deprovisionAccess(app.id, [TZippoRouteTag.SwapV1Prices]);
        if (!deprovisionedApp) {
            throw new Error('Unable to deprovision access');
        }
        expect(deprovisionedApp.integratorAccess.length).toEqual(0);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorAccess.deleteMany.mock.calls[0][0]?.where).toEqual({
            integratorAppId: app.id,
            routeTag: { in: [TZippoRouteTag.SwapV1Prices] },
        });
    });

    test('create api key', async () => {
        const app = appFactory.build();

        // mock prisma database access
        prismaMock.integratorApp.findUnique.mockResolvedValue(app);

        await expect(
            createApiKey({
                integratorTeamId: app.integratorTeamId,
                integratorAppId: app.id,
                description: 'test key',
            }),
        ).resolves.toEqual(app);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorApiKey.create.mock.calls[0][0].data.integratorAppId).toEqual(app.id);
        expect(prismaMock.integratorApiKey.create.mock.calls[0][0].data.description).toEqual('test key');
    });

    test('update api key', async () => {
        const apiKey = apiKeyFactory.build();

        // mock prisma database access
        prismaMock.integratorApp.findUnique.mockResolvedValue(apiKey.app);
        prismaMock.integratorApiKey.findUnique.mockResolvedValue(apiKey);

        await expect(
            updateApiKey(apiKey.id, {
                description: 'updated test key',
            }),
        ).resolves.toEqual(apiKey.app);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorApiKey.update.mock.calls[0][0].where.id).toEqual(apiKey.id);
        expect(prismaMock.integratorApiKey.update.mock.calls[0][0].data.description).toEqual('updated test key');
    });

    test('delete api key', async () => {
        const apiKey = apiKeyFactory.build();

        // mock prisma database access
        prismaMock.integratorApp.findUnique.mockResolvedValue(apiKey.app);
        prismaMock.integratorApiKey.findUnique.mockResolvedValue(apiKey);

        await expect(deleteApiKey(apiKey.id)).resolves.toEqual(apiKey.app);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorApiKey.delete.mock.calls[0][0].where.id).toEqual(apiKey.id);
    });
});

function mockKongWithKey() {
    kongMock.kongEnsureConsumer.mockResolvedValue({
        id: '156f70c1-e993-4293-a4a4-528190f2b46c',
        created_at: 12345,
        username: 'app12345',
    });
    kongMock.kongEnsureZeroexHeaders.mockResolvedValue(true);
    kongMock.kongEnsureAcl.mockResolvedValue({
        id: '256f70c1-e993-4293-a4a4-528190f2b46c',
        consumer: { id: '356f70c1-e993-4293-a4a4-528190f2b46c' },
        created_at: 12345,
        group: 'swap_v1_price_group',
    });
    kongMock.kongEnsureRateLimit.mockResolvedValue({
        id: '456f70c1-e993-4293-a4a4-528190f2b46c',
        consumer: { id: '556f70c1-e993-4293-a4a4-528190f2b46c' },
        created_at: 12345,
        name: 'rate-limit',
        enabled: true,
        config: {
            minute: 30,
        },
    });
    kongMock.kongEnsureKey.mockResolvedValue({
        id: 'aa42e69c-89c7-4882-a33a-e1cb3d161ce8',
        consumer: { id: '556f70c1-e993-4293-a4a4-528190f2b46c' },
        created_at: 12345,
        key: 'bcd1b022-6d68-47c0-a5e0-88c05cff86ed',
    });
    kongMock.kongRemoveAcl.mockResolvedValue(true);
    kongMock.kongRemoveKey.mockResolvedValue(true);
    kongMock.kongRemoveRateLimit.mockResolvedValue(true);
}
