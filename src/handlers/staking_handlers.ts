import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { StakingDataService } from '../services/staking_data_service';

export class StakingHandlers {
    private readonly _stakingDataService: StakingDataService;
    public async getStakingPoolsAsync(_req: express.Request, res: express.Response): Promise<void> {
        await this._stakingDataService.getStakingPoolsAsync();
        res.status(HttpStatus.OK).send('OK');
    }
    constructor(stakingDataService: StakingDataService) {
        this._stakingDataService = stakingDataService;
    }
}
