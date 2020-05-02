import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { schemas } from '../schemas/schemas';
import { StakingDataService } from '../services/staking_data_service';
import {
    StakingDelegatorResponse,
    StakingEpochsResponse,
    StakingEpochsWithFeesResponse,
    StakingPoolResponse,
    StakingPoolsResponse,
    StakingStatsResponse,
} from '../types';
import { schemaUtils } from '../utils/schema_utils';

export class StakingHandlers {
    private readonly _stakingDataService: StakingDataService;
    public async getStakingPoolsAsync(_req: express.Request, res: express.Response): Promise<void> {
        const stakingPools = await this._stakingDataService.getStakingPoolsWithStatsAsync();
        const response: StakingPoolsResponse = {
            stakingPools,
        };
        res.status(HttpStatus.OK).send(response);
    }
    public async getStakingPoolByIdAsync(req: express.Request, res: express.Response): Promise<void> {
        const poolId = req.params.id;
        const [pool, epochRewards, allTimeStats] = await Promise.all([
            this._stakingDataService.getStakingPoolWithStatsAsync(poolId),
            this._stakingDataService.getStakingPoolEpochRewardsAsync(poolId),
            this._stakingDataService.getStakingPoolAllTimeRewardsAsync(poolId),
        ]);

        const response: StakingPoolResponse = {
            poolId,
            stakingPool: {
                ...pool,
                allTimeStats,
                epochRewards,
            },
        };

        res.status(HttpStatus.OK).send(response);
    }
    public async getStakingEpochsAsync(req: express.Request, res: express.Response): Promise<void> {
        // optional query string to include fees
        schemaUtils.validateSchema(req.query, schemas.stakingEpochRequestSchema as any);
        const isWithFees = req.query.withFees ? req.query.withFees === 'true' : false;

        let response: StakingEpochsResponse | StakingEpochsWithFeesResponse;
        if (isWithFees) {
            const [currentEpoch, nextEpoch] = await Promise.all([
                this._stakingDataService.getCurrentEpochWithFeesAsync(),
                this._stakingDataService.getNextEpochWithFeesAsync(),
            ]);
            response = {
                currentEpoch,
                nextEpoch,
            };
        } else {
            const [currentEpoch, nextEpoch] = await Promise.all([
                this._stakingDataService.getCurrentEpochAsync(),
                this._stakingDataService.getNextEpochAsync(),
            ]);
            response = {
                currentEpoch,
                nextEpoch,
            };
        }
        res.status(HttpStatus.OK).send(response);
    }
    public async getStakingStatsAsync(_req: express.Request, res: express.Response): Promise<void> {
        const allTimeStakingStats = await this._stakingDataService.getAllTimeStakingStatsAsync();
        const response: StakingStatsResponse = {
            allTime: allTimeStakingStats,
        };
        res.status(HttpStatus.OK).send(response);
    }

    public async getDelegatorAsync(req: express.Request, res: express.Response): Promise<void> {
        const delegatorAddress = req.params.id;
        const normalizedAddress = delegatorAddress && delegatorAddress.toLowerCase();

        const [forCurrentEpoch, forNextEpoch, allTime] = await Promise.all([
            this._stakingDataService.getDelegatorCurrentEpochAsync(normalizedAddress),
            this._stakingDataService.getDelegatorNextEpochAsync(normalizedAddress),
            this._stakingDataService.getDelegatorAllTimeStatsAsync(normalizedAddress),
        ]);

        const response: StakingDelegatorResponse = {
            delegatorAddress,
            forCurrentEpoch,
            forNextEpoch,
            allTime,
        };

        res.status(HttpStatus.OK).send(response);
    }

    public async getDelegatorEventsAsync(req: express.Request, res: express.Response): Promise<void> {
        const delegatorAddress = req.params.id;
        const normalizedAddress = delegatorAddress && delegatorAddress.toLowerCase();

        const delegatorEvents = await this._stakingDataService.getDelegatorEventsAsync(normalizedAddress);

        const response = delegatorEvents;

        res.status(HttpStatus.OK).send(response);
    }

    constructor(stakingDataService: StakingDataService) {
        this._stakingDataService = stakingDataService;
    }
}
