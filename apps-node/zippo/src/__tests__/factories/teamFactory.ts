import { Factory } from 'fishery';
import { IntegratorTeam } from 'integrator-db';
import { faker } from '@faker-js/faker';
import cuid from 'cuid';

export default Factory.define<IntegratorTeam>(({ sequence }) => ({
    id: cuid(),
    name: faker.company.name(),
    createdAt: new Date(),
    updatedAt: new Date(),
    image: faker.image.imageUrl(),
    productType: 'DEX',
    tier: 'dev',
}));
