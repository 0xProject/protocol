import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { MetaTransactionHandlers } from '../handlers/meta_transaction_handlers';
import { MetaTransactionService } from '../services/meta_transaction_service';

export const createMetaTransactionRouter = (metaTransactionService: MetaTransactionService): express.Router => {
    const router = express.Router();
    const handlers = new MetaTransactionHandlers(metaTransactionService);
    router.get('/', asyncHandler(MetaTransactionHandlers.rootAsync.bind(MetaTransactionHandlers)));
    /**
     * GET price endpoint returns the price the taker can expect to receive by
     * calling /quote
     */
    router.get('/price', asyncHandler(handlers.getPriceAsync.bind(handlers)));
    /**
     * GET quote endpoint returns an unsigned 0x Transaction that when sent to
     * `executeTransaction` will execute a specified swap.
     *
     * https://0x.org/docs/guides/v3-specification#transaction-message-format
     */
    router.get('/quote', asyncHandler(handlers.getQuoteAsync.bind(handlers)));
    return router;
};
