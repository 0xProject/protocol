import * as express from 'express';
import * as asyncHandler from 'express-async-handler';
import * as swaggerUi from 'swagger-ui-express';

import * as apiDocs from '../api-docs/rfq_maker_docs.json';
import { RfqMakerHandlers } from '../handlers/rfq_maker_handlers';
import { RfqMakerService } from '../services/rfq_maker_service';

/**
 * Create a RFQ maker API router, which routes incoming requests to RFQ maker API handler.
 * Also provides swagger endpoints to serve the documentation of the maker API.
 * @param rfqMakerService Injected service object which validate incoming requests and do the jobs.
 * @returns the RFQ maker API router
 */
export function createRfqMakerRouter(rfqMakerService: RfqMakerService): express.Router {
    const router = express.Router();
    const handlers = new RfqMakerHandlers(rfqMakerService);

    // Routes
    router.get('/chain-id/:chainId', asyncHandler(handlers.getRfqMakerAsync.bind(handlers)));
    router.put('/chain-id/:chainId', asyncHandler(handlers.putRfqMakerAsync.bind(handlers)));
    router.patch('/chain-id/:chainId', asyncHandler(handlers.patchRfqMakerAsync.bind(handlers)));

    // Swagger
    const swaggerOptions = {
        swaggerOptions: {
            url: '/api-docs/swagger.json',
        },
    };

    router.use('/api-docs', swaggerUi.serveFiles(apiDocs, swaggerOptions));
    router.get('/api-docs', swaggerUi.setup(apiDocs, swaggerOptions));
    router.get('/api-docs/swagger.json', (_req, res) => res.json(apiDocs));

    return router;
}
