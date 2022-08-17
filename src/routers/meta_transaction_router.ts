import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { MetaTransactionHandlers } from '../handlers/meta_transaction_handlers';
import { MetaTransactionService } from '../services/meta_transaction_service';

export const createMetaTransactionRouter = (metaTransactionService: MetaTransactionService): express.Router => {
    const router = express.Router();
    const handlers = new MetaTransactionHandlers(metaTransactionService);

    // V1 handlers
    router.get('', asyncHandler(MetaTransactionHandlers.rootAsync.bind(MetaTransactionHandlers)));
    router.get('/price', asyncHandler(handlers.getPriceAsync.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getQuoteAsync.bind(handlers)));

    return router;
};
