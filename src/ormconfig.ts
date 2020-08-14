import { ConnectionOptions } from 'typeorm';

import { POSTGRES_URI } from './config';
import { KeyValueEntity, SignedOrderEntity, TransactionEntity } from './entities';

const entities = [SignedOrderEntity, TransactionEntity, KeyValueEntity];

export const config: ConnectionOptions = {
    type: 'postgres',
    url: POSTGRES_URI,
    entities,
    // Disable synchronization in production
    synchronize: process.env.NODE_ENV && process.env.NODE_ENV === 'test',
    logging: true,
    logger: 'debug',
    extra: {
        max: 15,
    },
};
