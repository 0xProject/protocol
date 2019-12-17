import * as bodyParser from 'body-parser';
import * as cors from 'cors';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';

import { SWAP_PATH } from '../constants';
import { errorHandler } from '../middleware/error_handling';
import { createSwapRouter } from '../routers/swap_router';

import { SwapService } from './swap_service';

// tslint:disable-next-line:no-unnecessary-class
export class SwapHttpService {
    constructor(app: core.Express, swapService: SwapService) {
        app.use(cors());
        app.use(bodyParser.json());
        app.use(SWAP_PATH, createSwapRouter(swapService));
        app.use(errorHandler);
    }
}
