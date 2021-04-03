import { createMetricsRouter, MetricsService } from '@0x/api-utils';
import * as express from 'express';
import { Connection } from 'typeorm';

import { getContractAddressesForNetworkOrThrowAsync } from '../app';
import * as defaultConfig from '../config';
import {
    META_TXN_MIN_SIGNER_ETH_BALANCE,
    METRICS_PATH,
    NUMBER_OF_BLOCKS_UNTIL_CONFIRMED,
    TX_WATCHER_POLLING_INTERVAL_MS,
    TX_WATCHER_UPDATE_METRICS_INTERVAL_MS,
    UNSTICKING_TRANSACTION_GAS_MULTIPLIER,
} from '../constants';
import { getDBConnectionAsync } from '../db_connection';
import { logger } from '../logger';
import { TransactionWatcherSignerService } from '../services/transaction_watcher_signer_service';
import { TransactionWatcherSignerServiceConfig } from '../types';
import { providerUtils } from '../utils/provider_utils';

if (require.main === module) {
    (async () => {
        const connection = await getDBConnectionAsync();

        await runTransactionWatcherServiceAsync(connection);
    })().catch((error) => logger.error(error));
}
process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
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
        server.on('error', (err) => {
            logger.error(err);
        });
    }
    const provider = providerUtils.createWeb3Provider(defaultConfig.ETHEREUM_RPC_URL);
    const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(provider, defaultConfig.CHAIN_ID);
    const config: TransactionWatcherSignerServiceConfig = {
        provider,
        contractAddresses,
        chainId: defaultConfig.CHAIN_ID,
        signerPrivateKeys: defaultConfig.META_TXN_RELAY_PRIVATE_KEYS,
        expectedMinedInSec: defaultConfig.META_TXN_RELAY_EXPECTED_MINED_SEC,
        isSigningEnabled: defaultConfig.META_TXN_SIGNING_ENABLED,
        maxGasPriceGwei: defaultConfig.META_TXN_MAX_GAS_PRICE_GWEI,
        minSignerEthBalance: META_TXN_MIN_SIGNER_ETH_BALANCE,
        transactionPollingIntervalMs: TX_WATCHER_POLLING_INTERVAL_MS,
        heartbeatIntervalMs: TX_WATCHER_UPDATE_METRICS_INTERVAL_MS,
        unstickGasMultiplier: UNSTICKING_TRANSACTION_GAS_MULTIPLIER,
        numBlocksUntilConfirmed: NUMBER_OF_BLOCKS_UNTIL_CONFIRMED,
    };

    const transactionWatcherService = new TransactionWatcherSignerService(connection, config);
    await transactionWatcherService.syncTransactionStatusAsync();
    logger.info(`TransactionWatcherService starting up!`);
}
