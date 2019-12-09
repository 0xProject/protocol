import { ConnectionOptions } from 'typeorm';

import { POSTGRES_URI } from './config';
import { SignedOrderEntity } from './entities';

const entities = [SignedOrderEntity];

export const config: ConnectionOptions = {
    type: 'postgres',
    url: POSTGRES_URI,
    entities,
    synchronize: true,
    logging: true,
    logger: 'debug',
};
