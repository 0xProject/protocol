import { ConnectionOptions } from 'typeorm';

import { SignedOrderEntity } from './entity';

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
