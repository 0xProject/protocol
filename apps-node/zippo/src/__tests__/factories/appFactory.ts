import { Factory } from 'fishery';
import { Prisma } from 'integrator-db';
import cuid from 'cuid';
import teamFactory from './teamFactory';
import { faker } from '@faker-js/faker';

const appWithTeam = Prisma.validator<Prisma.IntegratorAppArgs>()({
    include: { integratorTeam: true, apiKeys: true, integratorAccess: true },
});
type AppWithTeam = Prisma.IntegratorAppGetPayload<typeof appWithTeam>;

export default Factory.define<AppWithTeam>(({ params }) => {
    const integratorTeam = teamFactory.build(params.integratorTeam);
    return {
        id: cuid(),
        name: 'My App',
        description: faker.lorem.sentence(),
        affiliateAddress: faker.finance.ethereumAddress(),
        explorerTag: faker.lorem.word(),
        explorerImage: faker.image.imageUrl(),
        category: 'DEX',
        createdAt: new Date(),
        updatedAt: new Date(),
        integratorTeam: integratorTeam,
        integratorTeamId: integratorTeam.id,
        apiKeys: [],
        integratorAccess: [],
    };
});
