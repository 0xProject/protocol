import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { RfqAdminHandler } from '../handlers/rfq_admin_handler';
import { RfqAdminService } from '../services/rfq_admin_service';
import { ConfigManager } from '../utils/config_manager';

export function createRfqAdminRouter(rfqAdminService: RfqAdminService, configManager: ConfigManager): express.Router {
    const router = express.Router();
    const handlers = new RfqAdminHandler(rfqAdminService, configManager);

    // Admin Routes
    router.post('/cleanup', asyncHandler(handlers.cleanupJobsAsync.bind(handlers)));

    return router;
}
