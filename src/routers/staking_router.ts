import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { stakingHandlers } from '../handlers/staking_handlers';

export const createStakingRouter = (): express.Router => {
    const router = express.Router();
    router.get('staking_pools', asyncHandler(stakingHandlers.getStakingPoolsAsync));
    return router;
};

export const stakingRouter = createStakingRouter();
