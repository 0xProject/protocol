import { DataSourceOptions } from 'typeorm';

import { POSTGRES_READ_REPLICA_URIS, POSTGRES_URI } from './config';
import {
    BlockedAddressEntity,
    KeyValueEntity,
    MakerBalanceChainCacheEntity,
    MetaTransactionJobEntity,
    MetaTransactionSubmissionEntity,
    OrderWatcherSignedOrderEntity,
    PersistentSignedOrderEntity,
    PersistentSignedOrderV4Entity,
    RfqMaker,
    RfqMakerUpdateTimeHash,
    RfqmJobEntity,
    RfqmQuoteEntity,
    RfqmTransactionSubmissionEntity,
    RfqmV2JobEntity,
    RfqmV2QuoteEntity,
    RfqmV2TransactionSubmissionEntity,
    RfqmWorkerHeartbeatEntity,
    SignedOrderEntity,
    SignedOrderV4Entity,
    TransactionEntity,
} from './entities';

const entities = [
    BlockedAddressEntity,
    SignedOrderEntity,
    PersistentSignedOrderEntity,
    TransactionEntity,
    KeyValueEntity,
    MakerBalanceChainCacheEntity,
    MetaTransactionJobEntity,
    MetaTransactionSubmissionEntity,
    SignedOrderV4Entity,
    PersistentSignedOrderV4Entity,
    RfqmWorkerHeartbeatEntity,
    RfqmQuoteEntity,
    RfqmJobEntity,
    RfqmTransactionSubmissionEntity,
    RfqmV2JobEntity,
    RfqmV2QuoteEntity,
    RfqmV2TransactionSubmissionEntity,
    OrderWatcherSignedOrderEntity,
    RfqMaker,
    RfqMakerUpdateTimeHash,
];

export const createConfig = (postgresUri: string = POSTGRES_URI): DataSourceOptions => ({
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
                  master: { url: postgresUri },
                  slaves: POSTGRES_READ_REPLICA_URIS.map((r) => ({ url: r })),
              },
          }
        : { url: postgresUri }),
});
