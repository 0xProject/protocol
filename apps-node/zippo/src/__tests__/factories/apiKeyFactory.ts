import { Factory } from 'fishery';
import { Prisma } from 'integrator-db';
import cuid from 'cuid';
import { faker } from '@faker-js/faker';
import appFactory from './appFactory';

const apiKeyWithApp = Prisma.validator<Prisma.IntegratorApiKeyArgs>()({
    include: { app: true },
});
type ApiKeyWithApp = Prisma.IntegratorApiKeyGetPayload<typeof apiKeyWithApp>;

export default Factory.define<ApiKeyWithApp>(({ params }) => {
    const app = appFactory.build(params.app);
    return {
        id: cuid(),
        description: faker.lorem.sentence(),
        apiKey: faker.datatype.uuid(),
        disabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        app: app,
        integratorAppId: app.id,
    };
});
