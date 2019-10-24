import { WSClient } from '@0x/mesh-rpc-client';
import * as express from 'express';
import 'reflect-metadata';

import * as config from '../config';
import { initDBConnectionAsync } from '../db_connection';
import { WebsocketService } from '../services/websocket_service';
import { utils } from '../utils';

/**
 * This service handles websocket updates using a subscription from Mesh.
 */
(async () => {
    await initDBConnectionAsync();
    const app = express();
    const server = app.listen(config.HTTP_PORT, () => {
        utils.log(
            `Standard relayer API (WS) listening on port ${config.HTTP_PORT}!\nConfig: ${JSON.stringify(
                config,
                null,
                2,
            )}`,
        );
    });
    const meshClient = new WSClient(config.MESH_ENDPOINT);
    // tslint:disable-next-line:no-unused-expression
    new WebsocketService(server, meshClient);
})().catch(utils.log);
