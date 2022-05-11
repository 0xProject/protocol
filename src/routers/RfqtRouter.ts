import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { RfqtHandlers } from '../handlers/RfqtHandlers';
import { ConfigManager } from '../utils/config_manager';
import { RfqtServices } from '../utils/rfqtServiceBuilder';

/**
 * Creates an express router for RFQt-related routes
 */
export function createRfqmRouter(rfqtServices: RfqtServices, configManager: ConfigManager): express.Router {
    const router = express.Router();
    const handlers = new RfqtHandlers(rfqtServices, configManager);

    router.post('/prices', asyncHandler(handlers.getV1PriceAsync.bind(handlers)));
    router.post('/quotes', asyncHandler(handlers.getV1QuotesAsync.bind(handlers)));

    return router;
}
