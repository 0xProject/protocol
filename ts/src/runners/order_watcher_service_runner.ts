import { WSClient } from '@0x/mesh-rpc-client';
import 'reflect-metadata';

import * as config from '../config';
import { initDBConnectionAsync } from '../db_connection';
import { OrderWatcherService } from '../services/order_watcher_service';
import { utils } from '../utils';

/**
 * This service is a simple writer from the Mesh events. On order discovery
 * or an order update it will be persisted to the database. It also is responsible
 * for syncing the database with Mesh on start or after a disconnect.
 */
(async () => {
    await initDBConnectionAsync();
    utils.log(`Order Watching Service started!\nConfig: ${JSON.stringify(config, null, 2)}`);
    const meshClient = new WSClient(config.MESH_ENDPOINT);
    const orderWatcherService = new OrderWatcherService(meshClient);
    await orderWatcherService.syncOrderbookAsync();
})().catch(utils.log);
