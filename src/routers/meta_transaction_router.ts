import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { IMetaTransactionService } from '../types';
import { MetaTransactionHandlers } from '../handlers/meta_transaction_handlers';

export const createMetaTransactionRouter = (metaTransactionService: IMetaTransactionService): express.Router => {
    const router = express.Router();
    const handlers = new MetaTransactionHandlers(metaTransactionService);

    // V1 handlers
    router.get('', asyncHandler(MetaTransactionHandlers.rootAsync.bind(MetaTransactionHandlers)));
    router.get('/price', asyncHandler(handlers.getPriceAsync.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getQuoteAsync.bind(handlers)));

    return router;
};
