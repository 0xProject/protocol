import { ConnectionOptions } from 'typeorm';

import { signedOrderEntity } from './entities';

const entities = [signedOrderEntity];

export const config: ConnectionOptions = {
    type: 'sqlite',
    database: 'db/database.sqlite',
    entities,
    synchronize: true,
    logging: true,
    logger: 'debug',
};
