import * as express from 'express';

import { HealthcheckHandlers } from '../handlers/healthcheck_handlers';
import { HealthcheckService } from '../services/healthcheck_service';

export const createHealthcheckRouter = (healthcheckService: HealthcheckService): express.Router => {
    const router = express.Router();
    const handlers = new HealthcheckHandlers(healthcheckService);
    /**
     * GET healthcheck endpoint returns the health of the http server.
     */
    router.get('/', handlers.serveHealthcheck.bind(handlers));
    return router;
};
