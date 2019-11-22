import { WSClient } from '@0x/mesh-rpc-client';
import * as express from 'express';

import * as config from '../config';
import { getDBConnectionAsync } from '../db_connection';
import { logger } from '../logger';
import { OrderBookService } from '../services/orderbook_service';
import { SRAHttpService } from '../services/sra_http_service';
import { StakingDataService } from '../services/staking_data_service';
import { StakingHttpService } from '../services/staking_http_service';

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
    const stakingDataService = new StakingDataService(connection);
    // tslint:disable-next-line:no-unused-expression
    new StakingHttpService(app, stakingDataService);
    let meshClient;
    try {
        meshClient = new WSClient(config.MESH_WEBSOCKET_URI);
    } catch (err) {
        logger.error(err);
    }
    const orderBookService = new OrderBookService(connection, meshClient);
    // tslint:disable-next-line:no-unused-expression
    new SRAHttpService(app, orderBookService);
})().catch(error => logger.error(error));
