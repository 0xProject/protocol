import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as asyncHandler from 'express-async-handler';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import 'reflect-metadata';

import { Handlers } from '../handlers';
import { errorHandler } from '../middleware/error_handling';
import { urlParamsParsing } from '../middleware/url_params_parsing';
import { OrderBookService } from '../services/orderbook_service';

// tslint:disable-next-line:no-unnecessary-class
export class HttpService {
    constructor(app: core.Express, orderBook: OrderBookService) {
        const handlers = new Handlers(orderBook);
        app.use(cors());
        app.use(bodyParser.json());
        app.use(urlParamsParsing);

        /**
         * GET AssetPairs endpoint retrieves a list of available asset pairs and the information required to trade them.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getAssetPairs
         */
        app.get('/v3/asset_pairs', asyncHandler(Handlers.assetPairsAsync.bind(Handlers)));
        /**
         * GET Orders endpoint retrieves a list of orders given query parameters.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrders
         */
        app.get('/v3/orders', asyncHandler(handlers.ordersAsync.bind(handlers)));
        /**
         * GET Orderbook endpoint retrieves the orderbook for a given asset pair.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderbook
         */
        app.get('/v3/orderbook', asyncHandler(handlers.orderbookAsync.bind(handlers)));
        /**
         * GET FeeRecepients endpoint retrieves a collection of all fee recipient addresses for a relayer.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/v3/fee_recipients
         */
        app.get('/v3/fee_recipients', Handlers.feeRecipients.bind(Handlers));
        /**
         * POST Order config endpoint retrives the values for order fields that the relayer requires.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderConfig
         */
        app.post('/v3/order_config', Handlers.orderConfig.bind(Handlers));
        /**
         * POST Order endpoint submits an order to the Relayer.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/postOrder
         */
        app.post('/v3/order', asyncHandler(handlers.postOrderAsync.bind(handlers)));
        /**
         * GET Order endpoint retrieves the order by order hash.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrder
         */
        app.get('/v3/order/:orderHash', asyncHandler(Handlers.getOrderByHashAsync.bind(Handlers)));

        app.use(errorHandler);
    }
}
