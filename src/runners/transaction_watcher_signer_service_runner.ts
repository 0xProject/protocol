import * as express from 'express';
import { Connection } from 'typeorm';

import * as defaultConfig from '../config';
import { METRICS_PATH } from '../constants';
import { getDBConnectionAsync } from '../db_connection';
import { logger } from '../logger';
import { createMetricsRouter } from '../routers/metrics_router';
import { MetricsService } from '../services/metrics_service';
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
    if (defaultConfig.ENABLE_PROMETHEUS_METRICS) {
        const app = express();
        const metricsService = new MetricsService();
        const metricsRouter = createMetricsRouter(metricsService);
        app.use(METRICS_PATH, metricsRouter);
        const server = app.listen(defaultConfig.PROMETHEUS_PORT, () => {
            logger.info(`Metrics (HTTP) listening on port ${defaultConfig.PROMETHEUS_PORT}`);
        });
        server.on('error', err => {
            logger.error(err);
        });
    }
    const transactionWatcherService = new TransactionWatcherSignerService(connection);
    await transactionWatcherService.syncTransactionStatusAsync();
    logger.info(`TransactionWatcherService starting up!`);
}
