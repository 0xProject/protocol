import { WSClient } from '@0x/mesh-rpc-client';
import * as express from 'express';

import * as config from './config';
import { MESH_GATEWAY_PATH } from './constants';
import { initDBConnectionAsync } from './db_connection';
import { logger } from './logger';
import { HttpService } from './services/http_service';
import { OrderWatcherService } from './services/order_watcher_service';
import { OrderBookService } from './services/orderbook_service';
import { WebsocketService } from './services/websocket_service';

(async () => {
    await initDBConnectionAsync();
    const app = express();
    const server = app.listen(config.HTTP_PORT, () => {
        logger.info(
            `API (HTTP) listening on port ${config.HTTP_PORT}!\nConfig: ${JSON.stringify(
                config,
                null,
                2,
            )}`,
        );
    });
    let meshClient: WSClient | undefined;
    try {
        meshClient = new WSClient(config.MESH_WEBSOCKET_URI);
        // tslint:disable-next-line:no-unused-expression
        new WebsocketService(server, meshClient, { path: MESH_GATEWAY_PATH });
    } catch (err) {
        logger.error(err);
    }
    const orderBookService = new OrderBookService(meshClient);
    // tslint:disable-next-line:no-unused-expression
    new HttpService(app, orderBookService);
    if (meshClient) {
        const orderWatcherService = new OrderWatcherService(meshClient);
        await orderWatcherService.syncOrderbookAsync();
    } else {
        logger.warn('API starting without a connection to mesh');
    }
})().catch(error => logger.error(error));

process.on('uncaughtException', err => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', err => {
    if (err) {
        logger.error(err);
    }
});
