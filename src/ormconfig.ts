import { ConnectionOptions } from 'typeorm';

import { signedOrderEntity } from './entity';

const entities = [
    signedOrderEntity,
];

export const config: ConnectionOptions = {
    type: 'sqlite',
    database: 'db/database.sqlite',
    entities,
    synchronize: true,
    logging: true,
    logger: 'debug',
};
