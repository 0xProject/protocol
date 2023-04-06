import { Factory } from 'fishery';
import { Prisma } from 'integrator-db';
import cuid from 'cuid';
import teamFactory from './teamFactory';
import { faker } from '@faker-js/faker';

const externalAppWithTeam = Prisma.validator<Prisma.IntegratorExternalAppArgs>()({
    include: { integratorTeam: true },
});
type ExternalAppWithTeam = Prisma.IntegratorExternalAppGetPayload<typeof externalAppWithTeam>;

export default Factory.define<ExternalAppWithTeam>(({ params }) => {
    const integratorTeam = teamFactory.build(params.integratorTeam);
    return {
        id: cuid(),
        name: 'My External App',
        description: faker.lorem.sentence(),
        image: faker.image.imageUrl(),
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        integratorTeam: integratorTeam,
        integratorTeamId: integratorTeam.id,
    };
});
