import { ConnectionOptions } from 'typeorm';

import { SignedOrderEntity } from './entities';

const entities = [
    SignedOrderEntity,
];

export const config: ConnectionOptions = {
    type: 'sqlite',
    database: 'db/database.sqlite',
    entities,
    synchronize: true,
    logging: true,
    logger: 'debug',
};
