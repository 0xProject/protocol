import { WSClient } from '@0x/mesh-rpc-client';
import * as express from 'express';

import * as config from '../config';
import { logger } from '../logger';
import { WebsocketService } from '../services/websocket_service';

/**
 * This service handles websocket updates using a subscription from Mesh.
 */
(async () => {
    const app = express();
    const server = app.listen(config.HTTP_PORT, () => {
        logger.info(
            `Standard relayer API (WS) listening on port ${config.HTTP_PORT}!\nConfig: ${JSON.stringify(
                config,
                null,
                2,
            )}`,
        );
    });
    const meshClient = new WSClient(config.MESH_WEBSOCKET_URI);
    // tslint:disable-next-line:no-unused-expression
    new WebsocketService(server, meshClient);
})().catch(error => logger.error(error));
