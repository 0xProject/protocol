import { WSClient } from '@0x/mesh-rpc-client';

import * as config from '../config';
import { initDBConnectionAsync } from '../db_connection';
import { logger } from '../logger';
import { OrderWatcherService } from '../services/order_watcher_service';

/**
 * This service is a simple writer from the Mesh events. On order discovery
 * or an order update it will be persisted to the database. It also is responsible
 * for syncing the database with Mesh on start or after a disconnect.
 */
(async () => {
    await initDBConnectionAsync();
    logger.info(`Order Watching Service started!\nConfig: ${JSON.stringify(config, null, 2)}`);
    const meshClient = new WSClient(config.MESH_WEBSOCKET_URI);
    const orderWatcherService = new OrderWatcherService(meshClient);
    await orderWatcherService.syncOrderbookAsync();
})().catch(logger.error);
