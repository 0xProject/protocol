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
    router.get('/price', asyncHandler(handlers.getIndicativeQuoteAsync.bind(handlers)));

    return router;
}
