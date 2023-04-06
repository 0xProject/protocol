import { Factory } from 'fishery';
import { Prisma } from 'integrator-db';
import cuid from 'cuid';
import teamFactory from './teamFactory';
import externalAppFactory from './externalAppFactory';
import { faker } from '@faker-js/faker';

const appWithTeam = Prisma.validator<Prisma.IntegratorAppArgs>()({
    include: { integratorTeam: true, apiKeys: true, integratorAccess: true, integratorExternalApp: true },
});
type AppWithTeam = Prisma.IntegratorAppGetPayload<typeof appWithTeam>;

export default Factory.define<AppWithTeam>(({ params }) => {
    const integratorTeam = teamFactory.build(params.integratorTeam);
    const integratorExternalApp = params.integratorExternalApp
        ? externalAppFactory.build({ ...params.integratorExternalApp, integratorTeamId: integratorTeam.id })
        : null;
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
        integratorExternalApp: integratorExternalApp,
        integratorExternalAppId: integratorExternalApp ? integratorExternalApp.id : null,
    };
});
