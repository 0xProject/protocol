import { Connection } from 'typeorm';

import { getDBConnectionAsync } from '../db_connection';
import { logger } from '../logger';
import { TransactionWatcherSignerService } from '../services/transaction_watcher_signer_service';

if (require.main === module) {
    (async () => {
        const connection = await getDBConnectionAsync();

        await runTransactionWatcherServiceAsync(connection);
    })().catch(error => logger.error(error));
}
process.on('uncaughtException', err => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', err => {
    if (err) {
        logger.error(err);
    }
});

/**
 * This service tracks transactions and their state changes sent by the meta
 * transaction relays and updates them in the database.
 */
export async function runTransactionWatcherServiceAsync(connection: Connection): Promise<void> {
    const transactionWatcherService = new TransactionWatcherSignerService(connection);
    await transactionWatcherService.syncTransactionStatusAsync();
    logger.info(`TransactionWatcherService starting up!`);
}
