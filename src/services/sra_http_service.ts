import * as bodyParser from 'body-parser';
import * as cors from 'cors';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';

import { SRA_PATH } from '../constants';
import { errorHandler } from '../middleware/error_handling';
import { createSRARouter } from '../routers/sra_router';

import { OrderBookService } from './orderbook_service';

// tslint:disable-next-line:no-unnecessary-class
export class SRAHttpService {
    constructor(app: core.Express, orderBook: OrderBookService) {
        app.use(cors());
        app.use(bodyParser.json());
        app.use(SRA_PATH, createSRARouter(orderBook));
        app.use(errorHandler);
    }
}
