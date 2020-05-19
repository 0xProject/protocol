import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { StakingHandlers } from '../handlers/staking_handlers';
import { StakingDataService } from '../services/staking_data_service';

// tslint:disable-next-line:completed-docs
export function createStakingRouter(stakingDataService: StakingDataService): express.Router {
    const router = express.Router();
    const handlers = new StakingHandlers(stakingDataService);
    router.get('/pools/:id', asyncHandler(handlers.getStakingPoolByIdAsync.bind(handlers)));
    router.get('/pools', asyncHandler(handlers.getStakingPoolsAsync.bind(handlers)));
    router.get('/epochs/:n', asyncHandler(handlers.getStakingEpochNAsync.bind(handlers)));
    router.get('/epochs', asyncHandler(handlers.getStakingEpochsAsync.bind(handlers)));
    router.get('/stats', asyncHandler(handlers.getStakingStatsAsync.bind(handlers)));
    router.get('/delegator/:id', asyncHandler(handlers.getDelegatorAsync.bind(handlers)));
    router.get('/delegator/events/:id', asyncHandler(handlers.getDelegatorEventsAsync.bind(handlers)));
    return router;
}
