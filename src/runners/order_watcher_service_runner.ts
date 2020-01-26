import { WSClient } from '@0x/mesh-rpc-client';
import { Connection } from 'typeorm';

import { getDefaultAppDependenciesAsync } from '../app';
import * as defaultConfig from '../config';
import { logger } from '../logger';
import { OrderWatcherService } from '../services/order_watcher_service';
import { providerUtils } from '../utils/provider_utils';

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(defaultConfig.ETHEREUM_RPC_URL);
        const { connection, meshClient } = await getDefaultAppDependenciesAsync(provider, defaultConfig);

        if (meshClient) {
            await runOrderWatcherServiceAsync(connection, meshClient);

            logger.info(`Order Watching Service started!\nConfig: ${JSON.stringify(defaultConfig, null, 2)}`);
        } else {
            logger.error(
                `Order Watching Service could not be started! Could not start mesh client!\nConfig: ${JSON.stringify(
                    defaultConfig,
                    null,
                    2,
                )}`,
            );
            process.exit(1);
        }
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
 * This service is a simple writer from the Mesh events. On order discovery
 * or an order update it will be persisted to the database. It also is responsible
 * for syncing the database with Mesh on start or after a disconnect.
 */
export async function runOrderWatcherServiceAsync(connection: Connection, meshClient: WSClient): Promise<void> {
    const orderWatcherService = new OrderWatcherService(connection, meshClient);
    await orderWatcherService.syncOrderbookAsync();
}
