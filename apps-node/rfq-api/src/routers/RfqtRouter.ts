import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { RfqtHandlers } from '../handlers/RfqtHandlers';
import { ConfigManager } from '../utils/config_manager';
import { RfqtServices } from '../utils/rfqtServiceBuilder';

/**
 * Creates an express router for RFQt v1 related routes
 */
export function createRfqtV1Router(rfqtServices: RfqtServices, configManager: ConfigManager): express.Router {
    const router = express.Router();
    const handlers = new RfqtHandlers(rfqtServices, configManager);

    router.post('/prices', asyncHandler(handlers.getV1PricesAsync.bind(handlers)));
    router.post('/quotes', asyncHandler(handlers.getV1QuotesAsync.bind(handlers)));

    return router;
}

/**
 * Creates an express router for RFQt v2 related routes
 */
export function createRfqtV2Router(rfqtServices: RfqtServices, configManager: ConfigManager): express.Router {
    const router = express.Router();
    const handlers = new RfqtHandlers(rfqtServices, configManager);

    router.post('/prices', asyncHandler(handlers.getV2PricesAsync.bind(handlers)));
    router.post('/quotes', asyncHandler(handlers.getV2QuotesAsync.bind(handlers)));

    return router;
}
