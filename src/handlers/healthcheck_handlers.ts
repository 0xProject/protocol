import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { HealthcheckService } from '../services/healthcheck_service';

export class HealthcheckHandlers {
    private readonly _healthcheckService: HealthcheckService;

    constructor(healthcheckService: HealthcheckService) {
        this._healthcheckService = healthcheckService;
    }

    public serveHealthcheck(_req: express.Request, res: express.Response): void {
        const isHealthy = this._healthcheckService.isHealthy();
        if (isHealthy) {
            res.status(HttpStatus.OK).send({ isHealthy });
        } else {
            res.status(HttpStatus.SERVICE_UNAVAILABLE).send({ isHealthy });
        }
    }
}
