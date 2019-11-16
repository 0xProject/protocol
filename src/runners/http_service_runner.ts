import { WSClient } from '@0x/mesh-rpc-client';
import * as express from 'express';

import * as config from '../config';
import { getDBConnectionAsync } from '../db_connection';
import { logger } from '../logger';
import { MeshGatewayHttpService } from '../services/mesh_gateway_http_service';
import { OrderBookService } from '../services/orderbook_service';

/**
 * This service handles the HTTP requests. This involves fetching from the database
 * as well as adding orders to mesh.
 */
(async () => {
    const connection = await getDBConnectionAsync();
    const app = express();
    app.listen(config.HTTP_PORT, () => {
        logger.info(
            `Standard relayer API (HTTP) listening on port ${config.HTTP_PORT}!\nConfig: ${JSON.stringify(
                config,
                null,
                2,
            )}`,
        );
    });
    let meshClient;
    try {
        meshClient = new WSClient(config.MESH_WEBSOCKET_URI);
    } catch (err) {
        logger.error(err);
    }
    const orderBookService = new OrderBookService(connection, meshClient);
    // tslint:disable-next-line:no-unused-expression
    new MeshGatewayHttpService(app, orderBookService);
})().catch(error => logger.error(error));
