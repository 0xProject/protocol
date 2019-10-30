import { ConnectionOptions } from 'typeorm';

import { POSTGRES_URL } from './config';
import { SignedOrderEntity } from './entities';

const entities = [
    SignedOrderEntity,
];

export const config: ConnectionOptions = {
    type: 'postgres',
    url: POSTGRES_URL,
    entities,
    synchronize: true,
    logging: true,
    logger: 'debug',
};
