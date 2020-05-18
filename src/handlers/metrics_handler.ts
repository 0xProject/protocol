import * as express from 'express';

import { MetricsService } from '../services/metrics_service';

export class MetricsHandlers {
    private readonly _metricsService: MetricsService;

    constructor(metricsService: MetricsService) {
        this._metricsService = metricsService;
    }

    public servePrometheusMetrics(_req: express.Request, res: express.Response): void {
        res.send(this._metricsService.getMetrics());
    }
}
