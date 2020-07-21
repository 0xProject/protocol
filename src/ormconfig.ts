import { ConnectionOptions } from 'typeorm';

import { POSTGRES_URI } from './config';
import { KeyValueEntity, SignedOrderEntity, TransactionEntity } from './entities';

const entities = [SignedOrderEntity, TransactionEntity, KeyValueEntity];

export const config: ConnectionOptions = {
    type: 'postgres',
    url: POSTGRES_URI,
    entities,
    synchronize: true,
    logging: true,
    logger: 'debug',
    extra: {
        max: 50,
    },
};
