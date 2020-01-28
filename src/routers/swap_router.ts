import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { SwapHandlers } from '../handlers/swap_handlers';
import { SwapService } from '../services/swap_service';

// tslint:disable-next-line:completed-docs
export function createSwapRouter(swapService: SwapService): express.Router {
    const router = express.Router();
    const handlers = new SwapHandlers(swapService);
    router.get('/', asyncHandler(SwapHandlers.rootAsync.bind(SwapHandlers)));
    router.get('/quote', asyncHandler(handlers.getSwapQuoteAsync.bind(handlers)));
    router.get('/tokens', asyncHandler(handlers.getSwapTokensAsync.bind(handlers)));
    return router;
}
