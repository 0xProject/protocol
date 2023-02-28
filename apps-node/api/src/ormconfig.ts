import { ConnectionOptions } from 'typeorm';

import { POSTGRES_READ_REPLICA_URIS, POSTGRES_URI } from './config';
import {
    BlockedAddressEntity,
    KeyValueEntity,
    MakerBalanceChainCacheEntity,
    OrderWatcherSignedOrderEntity,
    PersistentSignedOrderEntity,
    PersistentSignedOrderV4Entity,
    RfqMakerPairs,
    RfqMakerPairsUpdateTimeHash,
    SignedOrderV4Entity,
} from './entities';

const entities = [
    BlockedAddressEntity,
    PersistentSignedOrderEntity,
    KeyValueEntity,
    MakerBalanceChainCacheEntity,
    SignedOrderV4Entity,
    PersistentSignedOrderV4Entity,
    RfqMakerPairs,
    RfqMakerPairsUpdateTimeHash,
    OrderWatcherSignedOrderEntity,
];

const config: ConnectionOptions | undefined =
    POSTGRES_URI === undefined
        ? undefined
        : {
              type: 'postgres',
              entities,
              synchronize: false,
              logging: true,
              logger: 'debug',
              extra: {
                  max: 15,
                  statement_timeout: 10000,
              },
              migrations: ['./__build__/migrations/*.js'],
              ...(POSTGRES_READ_REPLICA_URIS
                  ? {
                        replication: {
                            master: { url: POSTGRES_URI },
                            slaves: POSTGRES_READ_REPLICA_URIS.map((r) => ({ url: r })),
                        },
                    }
                  : { url: POSTGRES_URI }),
              cli: {
                  migrationsDir: 'migrations',
              },
          };

export default config;
