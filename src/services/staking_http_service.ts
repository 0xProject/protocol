import * as bodyParser from 'body-parser';
import * as cors from 'cors';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';

import { STAKING_PATH } from '../constants';
import { errorHandler } from '../middleware/error_handling';
import { createStakingRouter } from '../routers/staking_router';
import { StakingDataService } from '../services/staking_data_service';

// tslint:disable-next-line:no-unnecessary-class
export class StakingHttpService {
    constructor(app: core.Express, stakingDataService: StakingDataService) {
        app.use(cors());
        app.use(bodyParser.json());
        app.use(STAKING_PATH, createStakingRouter(stakingDataService));
        app.use(errorHandler);
    }
}
