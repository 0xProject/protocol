import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { SwapHandlers } from '../handlers/swap_handlers';
import { SwapService } from '../services/swap_service';

// tslint:disable-next-line:completed-docs
export function createSwapRouter(swapService: SwapService): express.Router {
    const router = express.Router();
    const handlers = new SwapHandlers(swapService);
    router.get('', asyncHandler(SwapHandlers.root.bind(SwapHandlers)));
    router.get('/tokens', asyncHandler(SwapHandlers.getTokens.bind(handlers)));
    router.get('/rfq/registry', asyncHandler(SwapHandlers.getRfqRegistry.bind(handlers)));
    router.get('/prices', asyncHandler(handlers.getTokenPricesAsync.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getQuoteAsync.bind(handlers)));
    router.get('/price', asyncHandler(handlers.getQuotePriceAsync.bind(handlers)));
    router.get('/depth', asyncHandler(handlers.getMarketDepthAsync.bind(handlers)));
    router.get('/sources', asyncHandler(SwapHandlers.getLiquiditySources.bind(handlers)));

    return router;
}
