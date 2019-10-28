import * as express from 'express';
import * as asyncHandler from 'express-async-handler';
// tslint:disable-next-line:no-implicit-dependencies
import 'reflect-metadata';

import { MeshGatewayHandlers } from '../handlers/mesh_gateway_handlers';
import { OrderBookService } from '../services/orderbook_service';

export const createMeshGatewayRouter = (orderBook: OrderBookService): express.Router => {
    const router = express.Router();
    const handlers = new MeshGatewayHandlers(orderBook);
    /**
     * GET AssetPairs endpoint retrieves a list of available asset pairs and the information required to trade them.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getAssetPairs
     */
    router.get('/v3/asset_pairs', asyncHandler(MeshGatewayHandlers.assetPairsAsync.bind(MeshGatewayHandlers)));
    /**
     * GET Orders endpoint retrieves a list of orders given query parameters.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrders
     */
    router.get('/v3/orders', asyncHandler(handlers.ordersAsync.bind(handlers)));
    /**
     * GET Orderbook endpoint retrieves the orderbook for a given asset pair.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderbook
     */
    router.get('/v3/orderbook', asyncHandler(handlers.orderbookAsync.bind(handlers)));
    /**
     * GET FeeRecepients endpoint retrieves a collection of all fee recipient addresses for a relayer.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/v3/fee_recipients
     */
    router.get('/v3/fee_recipients', MeshGatewayHandlers.feeRecipients.bind(MeshGatewayHandlers));
    /**
     * POST Order config endpoint retrives the values for order fields that the relayer requires.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrderConfig
     */
    router.post('/v3/order_config', MeshGatewayHandlers.orderConfig.bind(MeshGatewayHandlers));
    /**
     * POST Order endpoint submits an order to the Relayer.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/postOrder
     */
    router.post('/v3/order', asyncHandler(handlers.postOrderAsync.bind(handlers)));
    /**
     * GET Order endpoint retrieves the order by order hash.
     * http://sra-spec.s3-website-us-east-1.amazonaws.com/#operation/getOrder
     */
    router.get('/v3/order/:orderHash', asyncHandler(MeshGatewayHandlers.getOrderByHashAsync.bind(MeshGatewayHandlers)));
    return router;
};
