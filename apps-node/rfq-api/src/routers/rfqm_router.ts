import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { RfqmHandlers } from '../handlers/rfqm_handlers';
import { ConfigManager } from '../utils/config_manager';
import { RfqmServices } from '../utils/rfqm_service_builder';

export function createRfqmRouter(rfqmServices: RfqmServices, configManager: ConfigManager): express.Router {
    const router = express.Router();
    const handlers = new RfqmHandlers(rfqmServices, configManager);

    // Routes
    router.get('/healthz', asyncHandler(handlers.getHealthAsync.bind(handlers)));
    router.get('/price', asyncHandler(handlers.getIndicativeQuoteAsync.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getFirmQuoteAsync.bind(handlers)));
    router.get('/status/:orderHash', asyncHandler(handlers.getStatusAsync.bind(handlers)));
    router.post('/submit', asyncHandler(handlers.submitSignedQuoteAsync.bind(handlers)));
    router.post('/submit-with-approval', asyncHandler(handlers.submitSignedQuoteWithApprovalAsync.bind(handlers)));

    return router;
}
