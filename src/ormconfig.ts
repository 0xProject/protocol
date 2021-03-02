import { ConnectionOptions } from 'typeorm';

import { POSTGRES_READ_REPLICA_URIS, POSTGRES_URI } from './config';
import {
    KeyValueEntity,
    MakerBalanceChainCacheEntity,
    PersistentSignedOrderEntity,
    PersistentSignedOrderV4Entity,
    SignedOrderEntity,
    SignedOrderV4Entity,
    TransactionEntity,
} from './entities';

const entities = [
    SignedOrderEntity,
    PersistentSignedOrderEntity,
    TransactionEntity,
    KeyValueEntity,
    MakerBalanceChainCacheEntity,
    SignedOrderV4Entity,
    PersistentSignedOrderV4Entity,
];

const config: ConnectionOptions = {
    type: 'postgres',
    entities,
    synchronize: false,
    logging: true,
    logger: 'debug',
    extra: {
        max: 15,
        statement_timeout: 10000,
    },
    migrations: ['./lib/migrations/*.js'],
    ...(POSTGRES_READ_REPLICA_URIS
        ? {
              replication: {
                  master: { url: POSTGRES_URI },
                  slaves: POSTGRES_READ_REPLICA_URIS.map(r => ({ url: r })),
              },
          }
        : { url: POSTGRES_URI }),
    cli: {
        migrationsDir: 'migrations',
    },
};
module.exports = config;
