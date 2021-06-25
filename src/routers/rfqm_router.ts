import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { RfqmHandlers } from '../handlers/rfqm_handlers';
import { RfqmService } from '../services/rfqm_service';
import { ConfigManager } from '../utils/config_manager';

// tslint:disable-next-line:completed-docs
export function createRfqmRouter(rfqmService: RfqmService, configManager: ConfigManager): express.Router {
    const router = express.Router();
    const handlers = new RfqmHandlers(rfqmService, configManager);

    // Routes
    router.get('/healthz', asyncHandler(handlers.getHealthAsync.bind(handlers)));
    router.get('/price', asyncHandler(handlers.getIndicativeQuoteAsync.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getFirmQuoteAsync.bind(handlers)));
    router.get('/status/:orderHash', asyncHandler(handlers.getStatusAsync.bind(handlers)));
    router.post('/submit', asyncHandler(handlers.submitSignedQuoteAsync.bind(handlers)));

    return router;
}
