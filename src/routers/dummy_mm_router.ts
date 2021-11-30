import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { DummyMMHandlers } from '../handlers/dummy_mm_handler';

// tslint:disable-next-line:completed-docs
export function createDummyMMRouter(): express.Router {
    const router = express.Router();
    const handlers = new DummyMMHandlers();

    // Routes
    router.get('/price', asyncHandler(handlers.getPriceV1Async.bind(handlers)));
    router.get('/quote', asyncHandler(handlers.getQuoteV1Async.bind(handlers)));
    router.post('/submit', asyncHandler(handlers.submitAsync.bind(handlers)));
    router.get('/rfqm/v2/price', asyncHandler(handlers.getPriceV2Async.bind(handlers)));
    router.post('/rfqm/v2/sign', asyncHandler(handlers.signAsync.bind(handlers)));

    return router;
}
