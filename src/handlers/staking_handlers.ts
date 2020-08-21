import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { schemas } from '../schemas/schemas';
import { StakingDataService } from '../services/staking_data_service';
import {
    Epoch,
    EpochWithFees,
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
        const pool = await this._stakingDataService.getStakingPoolWithStatsAsync(poolId);
        const epochRewards = await this._stakingDataService.getStakingPoolEpochRewardsAsync(poolId);
        const allTimeStats = await this._stakingDataService.getStakingPoolAllTimeRewardsAsync(poolId);

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
    public async getStakingEpochNAsync(req: express.Request, res: express.Response): Promise<void> {
        // optional query string to include fees
        schemaUtils.validateSchema(req.query, schemas.stakingEpochRequestSchema as any);
        const isWithFees = req.query.withFees ? req.query.withFees === 'true' : false;

        const n = Number(req.params.n);

        let response: Epoch | EpochWithFees;
        if (isWithFees) {
            const epoch = await this._stakingDataService.getEpochNWithFeesAsync(n);
            response = epoch;
        } else {
            const epoch = await this._stakingDataService.getEpochNAsync(n);
            response = epoch;
        }
        res.status(HttpStatus.OK).send(response);
    }
    public async getStakingEpochsAsync(req: express.Request, res: express.Response): Promise<void> {
        // optional query string to include fees
        schemaUtils.validateSchema(req.query, schemas.stakingEpochRequestSchema as any);
        const isWithFees = req.query.withFees ? req.query.withFees === 'true' : false;

        let response: StakingEpochsResponse | StakingEpochsWithFeesResponse;
        if (isWithFees) {
            const currentEpoch = await this._stakingDataService.getCurrentEpochWithFeesAsync();
            const nextEpoch = await this._stakingDataService.getNextEpochWithFeesAsync();
            response = {
                currentEpoch,
                nextEpoch,
            };
        } else {
            const currentEpoch = await this._stakingDataService.getCurrentEpochAsync();
            const nextEpoch = await this._stakingDataService.getNextEpochAsync();
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

        const forCurrentEpoch = await this._stakingDataService.getDelegatorCurrentEpochAsync(normalizedAddress);
        const forNextEpoch = await this._stakingDataService.getDelegatorNextEpochAsync(normalizedAddress);
        const allTime = await this._stakingDataService.getDelegatorAllTimeStatsAsync(normalizedAddress);

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
