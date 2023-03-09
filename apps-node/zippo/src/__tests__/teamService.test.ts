import { prismaMock } from './mocks/prismaMock';

import { getById, create, update } from '../services/teamService';
describe('teamService', () => {
    describe('get by team ID', () => {
        const id = 'cldj56hbu000008l828moa8wt';
        const team = {
            id,
            name: 'dev0xluv',
            image: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should mock prisma db access and perform get', async () => {
            prismaMock.integratorTeam.findUnique.mockResolvedValue(team);
            await expect(getById(id)).resolves.toEqual(team);
        });

        it('should confirm calls to prisma as expected', () => {
            expect(prismaMock.integratorTeam.findUnique.mock.calls[0][0].where.id).toEqual(team.id);
        });
    });

    describe('create team', () => {
        const team = {
            id: 'ccldj5ue5r000008mt8l0y74b9',
            name: 'Pretty Kitty',
            image: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should mock prisma db access and perform create', async () => {
            prismaMock.integratorTeam.create.mockResolvedValue(team);
            await expect(
                create({
                    name: team.name,
                    image: team.image,
                }),
            ).resolves.toEqual(team);
        });

        it('should confirm calls to prisma as expected', () => {
            expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(team.name);
            expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.image).toEqual(team.image);
        });
    });

    describe('update team', () => {
        const team = {
            id: 'cldj5v14x000108mta006czv9',
            name: 'Teju 4 President',
            image: '',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const updateTeam = {
            id: team.id,
            name: 'Mike 4 President',
            image: '',
            createdAt: team.createdAt,
            updatedAt: new Date(),
        };

        prismaMock.integratorTeam.create.mockResolvedValue(team);

        it('mock prisma db access and perform update', async () => {
            prismaMock.integratorTeam.update.mockResolvedValue(updateTeam);
            await expect(
                update(updateTeam.id, {
                    name: updateTeam.name,
                    image: updateTeam.image,
                }),
            ).resolves.toEqual(updateTeam);
        });

        it('should confirm calls to prisma as expected', () => {
            expect(prismaMock.integratorTeam.update.mock.calls[0][0].where.id).toEqual(team.id);
            expect(prismaMock.integratorTeam.update.mock.calls[0][0].data.name).not.toEqual(team.name);
            expect(prismaMock.integratorTeam.update.mock.calls[0][0].data.image).toEqual(team.image);
        });
    });
});
