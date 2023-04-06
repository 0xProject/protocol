import { prismaMock } from './mocks/prismaMock';
import { getById, create, update } from '../services/teamService';
import teamFactory from './factories/teamFactory';
import { TZippoTier } from 'zippo-interface';

describe('teamService', () => {
    beforeEach(async () => jest.resetAllMocks());

    test('get by team ID', async () => {
        const team = teamFactory.build();

        // mock prisma database access
        prismaMock.integratorTeam.findUnique.mockResolvedValue(team);

        await expect(getById(team.id)).resolves.toEqual(team);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorTeam.findUnique.mock.calls[0][0].where.id).toEqual(team.id);
    });

    test('create team', async () => {
        const team = teamFactory.build();

        // mock prisma database access
        prismaMock.integratorTeam.create.mockResolvedValue(team);

        await expect(
            create({
                name: team.name,
                image: team.image as string,
                productType: team.productType,
                tier: team.tier as TZippoTier,
            }),
        ).resolves.toEqual(team);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(team.name);
        expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.image).toEqual(team.image);
    });

    test('update team', async () => {
        const team = teamFactory.build();
        const updateTeam = teamFactory.build();

        // mock prisma database access
        prismaMock.integratorTeam.create.mockResolvedValue(team);
        prismaMock.integratorTeam.update.mockResolvedValue(updateTeam);

        await expect(
            update(team.id, {
                name: updateTeam.name,
                image: updateTeam.image as string,
            }),
        ).resolves.toEqual(updateTeam);

        // confirm calls to prisma happened as expected
        expect(prismaMock.integratorTeam.update.mock.calls[0][0].where.id).toEqual(team.id);
        expect(prismaMock.integratorTeam.update.mock.calls[0][0].data.name).not.toEqual(team.name);
        expect(prismaMock.integratorTeam.update.mock.calls[0][0].data.image).toEqual(team.image);
    });
});
