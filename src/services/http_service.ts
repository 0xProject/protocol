import * as bodyParser from 'body-parser';
import * as cors from 'cors';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import 'reflect-metadata';

import { errorHandler } from '../middleware/error_handling';
import { urlParamsParsing } from '../middleware/url_params_parsing';
import { createMeshGatewayRouter } from '../routers/mesh_gateway_router';
import { OrderBookService } from '../services/orderbook_service';

// tslint:disable-next-line:no-unnecessary-class
export class HttpService {
    constructor(app: core.Express, orderBook: OrderBookService) {
        app.use(cors());
        app.use(bodyParser.json());
        app.use(urlParamsParsing);
        app.use('/mesh_gateway/', createMeshGatewayRouter(orderBook));
        app.use(errorHandler);
    }
}
