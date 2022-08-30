import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { GaslessSwapHandlers } from '../handlers/GaslessSwapHandlers';
import { GaslessSwapService } from '../services/GaslessSwapService';
import { ConfigManager } from '../utils/config_manager';

/**
 * Produces Express router for the Gasless Swap service
 */
export function createGaslessSwapRouter(
    gaslessSwapServices: Map<number, GaslessSwapService>,
    configManager: ConfigManager,
): express.Router {
    const router = express.Router();
    const handlers = new GaslessSwapHandlers(gaslessSwapServices, configManager);

    // Routes
    router.get('/healthz', asyncHandler(handlers.getHealthAsync.bind(handlers)));
    router.get('/price', asyncHandler(handlers.getPriceAsync.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getQuoteAsync.bind(handlers)));
    router.get('/status/:hash', asyncHandler(handlers.getStatusAsync.bind(handlers)));
    router.post('/submit', asyncHandler(handlers.processSubmitAsync.bind(handlers)));

    return router;
}
