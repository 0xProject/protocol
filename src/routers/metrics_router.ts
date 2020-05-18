import * as express from 'express';

import { MetricsHandlers } from '../handlers/metrics_handler';
import { MetricsService } from '../services/metrics_service';

export const createMetricsRouter = (metricsService: MetricsService): express.Router => {
    const router = express.Router();
    const handlers = new MetricsHandlers(metricsService);
    /**
     * GET metrics endpoint returns the prometheus metrics stored in the
     * metricsService registry.
     */
    router.get('/', handlers.servePrometheusMetrics.bind(handlers));
    return router;
};
