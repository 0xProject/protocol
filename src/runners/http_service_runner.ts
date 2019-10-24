import { WSClient } from '@0x/mesh-rpc-client';
import * as express from 'express';
import 'reflect-metadata';

import * as config from '../config';
import { initDBConnectionAsync } from '../db_connection';
import { HttpService } from '../services/http_service';
import { OrderBookService } from '../services/orderbook_service';
import { utils } from '../utils';

/**
 * This service handles the HTTP requests. This involves fetching from the database
 * as well as adding orders to mesh.
 */
(async () => {
    await initDBConnectionAsync();
    const app = express();
    app.listen(config.HTTP_PORT, () => {
        utils.log(
            `Standard relayer API (HTTP) listening on port ${config.HTTP_PORT}!\nConfig: ${JSON.stringify(
                config,
                null,
                2,
            )}`,
        );
    });
    const meshClient = new WSClient(config.MESH_ENDPOINT);
    const orderBookService = new OrderBookService(meshClient);
    // tslint:disable-next-line:no-unused-expression
    new HttpService(app, orderBookService);
})().catch(utils.log);
