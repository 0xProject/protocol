'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var bodyParser = require('body-parser');
var cors = require('cors');
var asyncHandler = require('express-async-handler');
require('reflect-metadata');
var handlers_1 = require('../handlers');
var error_handling_1 = require('../middleware/error_handling');
var url_params_parsing_1 = require('../middleware/url_params_parsing');
// tslint:disable-next-line:no-unnecessary-class
var HttpService = /** @class */ (function() {
    function HttpService(app, orderBook) {
        var handlers = new handlers_1.Handlers(orderBook);
        app.use(cors());
        app.use(bodyParser.json());
        app.use(url_params_parsing_1.urlParamsParsing);
        /**
         * GET AssetPairs endpoint retrieves a list of available asset pairs and the information required to trade them.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getAssetPairs
         */
        app.get('/v3/asset_pairs', asyncHandler(handlers_1.Handlers.assetPairsAsync.bind(handlers_1.Handlers)));
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
        app.get('/v3/fee_recipients', handlers_1.Handlers.feeRecipients.bind(handlers_1.Handlers));
        /**
         * POST Order config endpoint retrives the values for order fields that the relayer requires.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderConfig
         */
        app.post('/v3/order_config', handlers_1.Handlers.orderConfig.bind(handlers_1.Handlers));
        /**
         * POST Order endpoint submits an order to the Relayer.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/postOrder
         */
        app.post('/v3/order', asyncHandler(handlers.postOrderAsync.bind(handlers)));
        /**
         * GET Order endpoint retrieves the order by order hash.
         * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrder
         */
        app.get(
            '/v3/order/:orderHash',
            asyncHandler(handlers_1.Handlers.getOrderByHashAsync.bind(handlers_1.Handlers)),
        );
        app.use(error_handling_1.errorHandler);
    }
    return HttpService;
})();
exports.HttpService = HttpService;
