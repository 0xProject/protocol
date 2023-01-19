import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { IMetaTransactionService } from '../types';
import { MetaTransactionHandlers } from '../handlers/meta_transaction_handlers';

export const createMetaTransactionV1Router = (metaTransactionService: IMetaTransactionService): express.Router => {
    const router = express.Router();
    const handlers = new MetaTransactionHandlers(metaTransactionService);

    // V1 handlers
    router.get('', asyncHandler(MetaTransactionHandlers.rootAsync.bind(MetaTransactionHandlers)));
    router.get('/price', asyncHandler(handlers.getV1PriceAsync.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getV1QuoteAsync.bind(handlers)));

    return router;
};
