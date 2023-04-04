import { Factory } from 'fishery';
import { Prisma } from 'integrator-db';
import { faker } from '@faker-js/faker';
import cuid from 'cuid';
import teamFactory from './teamFactory';

const userWithTeam = Prisma.validator<Prisma.UserArgs>()({
    include: { integratorTeam: true },
});
type UserWithTeam = Prisma.UserGetPayload<typeof userWithTeam>;

export default Factory.define<UserWithTeam>(({ params }) => {
    const integratorTeam = teamFactory.build(params.integratorTeam);
    return {
        id: cuid(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        createdAt: new Date(),
        updatedAt: new Date(),
        integratorTeam: integratorTeam,
        integratorTeamId: integratorTeam.id,
        emailVerifiedAt: params.emailVerifiedAt === null ? null : new Date(),
        image: faker.image.imageUrl(),
        passwordHash: faker.internet.password(),
        salt: 'abc',
        lastLoginAt: new Date(),
    };
});
