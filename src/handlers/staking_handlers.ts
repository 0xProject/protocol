import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { StakingDataService } from '../services/staking_data_service';
import { StakingPoolsResponse } from '../types';

export class StakingHandlers {
    private readonly _stakingDataService: StakingDataService;
    public async getStakingPoolsAsync(_req: express.Request, res: express.Response): Promise<void> {
        const [currentEpoch, approximateNextEpoch, stakingPools] = await Promise.all([
            this._stakingDataService.getCurrentEpochAsync(),
            this._stakingDataService.getNextEpochAsync(),
            this._stakingDataService.getStakingPoolsWithStatsAsync(),
        ]);
        const response: StakingPoolsResponse = {
            currentEpoch,
            approximateNextEpoch,
            stakingPools,
        };
        res.status(HttpStatus.OK).send(response);
    }
    constructor(stakingDataService: StakingDataService) {
        this._stakingDataService = stakingDataService;
    }
}
