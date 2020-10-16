import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { MetaTransactionHandlers } from '../handlers/meta_transaction_handlers';
import { MetaTransactionService } from '../services/meta_transaction_service';
import { MetaTransactionRateLimiter } from '../utils/rate-limiters';

export const createMetaTransactionRouter = (
    metaTransactionService: MetaTransactionService,
    rateLimiter?: MetaTransactionRateLimiter,
): express.Router => {
    const router = express.Router();
    const handlers = new MetaTransactionHandlers(metaTransactionService, rateLimiter);
    /**
     * GET status endpoint retrieves the transaction status by its hash.
     */
    router.get('/status/:txHash', asyncHandler(handlers.getTransactionStatusAsync.bind(handlers)));
    router.get('/signer/status', asyncHandler(handlers.getSignerStatusAsync.bind(handlers)));

    // V1 handlers
    router.get('', asyncHandler(MetaTransactionHandlers.rootAsync.bind(MetaTransactionHandlers)));
    router.get('/price', asyncHandler(handlers.getPriceAsync.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getQuoteAsync.bind(handlers)));
    router.post('/submit', asyncHandler(handlers.submitTransactionIfWhitelistedAsync.bind(handlers)));

    return router;
};
