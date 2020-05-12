import { ConnectionOptions } from 'typeorm';

import { POSTGRES_URI } from './config';
import { SignedOrderEntity, TransactionEntity } from './entities';

const entities = [SignedOrderEntity, TransactionEntity];

export const config: ConnectionOptions = {
    type: 'postgres',
    url: POSTGRES_URI,
    entities,
    synchronize: true,
    logging: true,
    logger: 'debug',
    extra: {
        connectionLimit: 50,
    },
};
