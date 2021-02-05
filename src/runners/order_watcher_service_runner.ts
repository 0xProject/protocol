import { Connection } from 'typeorm';

import { getDefaultAppDependenciesAsync } from '../app';
import { defaultHttpServiceWithRateLimiterConfig } from '../config';
import { OrderWatcherSyncError } from '../errors';
import { logger } from '../logger';
import { OrderWatcherService } from '../services/order_watcher_service';
import { MeshClient } from '../utils/mesh_client';
import { providerUtils } from '../utils/provider_utils';

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const { connection, meshClient } = await getDefaultAppDependenciesAsync(
            provider,
            defaultHttpServiceWithRateLimiterConfig,
        );

        if (meshClient) {
            await runOrderWatcherServiceAsync(connection, meshClient);

            logger.info(
                `Order Watching Service started!\nConfig: ${JSON.stringify(
                    defaultHttpServiceWithRateLimiterConfig,
                    null,
                    2,
                )}`,
            );
        } else {
            logger.error(
                `Order Watching Service could not be started! Could not start mesh client!\nConfig: ${JSON.stringify(
                    defaultHttpServiceWithRateLimiterConfig,
                    null,
                    2,
                )}`,
            );
            process.exit(1);
        }
    })().catch(error => logger.error(error.stack));
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
 * This service is a simple writer from the Mesh events. On order discovery
 * or an order update it will be persisted to the database. It also is responsible
 * for syncing the database with Mesh on start or after a disconnect.
 */
export async function runOrderWatcherServiceAsync(connection: Connection, meshClient: MeshClient): Promise<void> {
    const orderWatcherService = new OrderWatcherService(connection, meshClient);
    logger.info(`OrderWatcherService starting up!`);
    try {
        await orderWatcherService.syncOrderbookAsync();
    } catch (err) {
        const logError = new OrderWatcherSyncError(`Error on starting OrderWatcher service: [${err.stack}]`);
        throw logError;
    }
}
