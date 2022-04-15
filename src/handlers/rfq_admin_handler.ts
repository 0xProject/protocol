import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { RfqAdminService } from '../services/rfq_admin_service';
import { ConfigManager } from '../utils/config_manager';

export class RfqAdminHandler {
    constructor(private readonly _rfqAdminService: RfqAdminService, private readonly _configManager: ConfigManager) {}

    /**
     * Handler for the `/cleanup` endpoint. Fetches jobs from their order hashes and puts them to
     * `failed_expired` state. Requires an admin API key.
     */
    public async cleanupJobsAsync(req: express.Request, res: express.Response): Promise<void> {
        // validate admin api key
        try {
            this._validateAdminApiKey(req.header('0x-admin-api-key'));
        } catch (err) {
            const message = 'Invalid admin API key provided';
            req.log.error(err, message);
            res.status(HttpStatus.UNAUTHORIZED).send({ error: message });
        }

        try {
            if (req.body.orderHashes.length === 0) {
                res.status(HttpStatus.BAD_REQUEST).send({ error: 'Must send at least one order hash' });
            }

            const response = await this._rfqAdminService.cleanupJobsAsync(req.body.orderHashes);
            if (response.unmodifiedJobs.length > 0 && response.modifiedJobs.length > 0) {
                res.status(HttpStatus.MULTI_STATUS).send(response);
            } else if (response.unmodifiedJobs.length !== 0) {
                res.status(HttpStatus.BAD_REQUEST).send(response);
            } else {
                res.status(HttpStatus.OK).send(response);
            }
        } catch (err) {
            const message = 'Encountered an unexpected error while manually cleaning up jobs';
            req.log.error(err, message);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ error: message });
        }
    }

    private _validateAdminApiKey(apiKey: string | undefined): void {
        if (apiKey === undefined) {
            throw new Error('Must access with an API key');
        }
        if (apiKey !== this._configManager.getAdminApiKey()) {
            throw new Error('API key not authorized for RFQM admin access');
        }
    }
}
