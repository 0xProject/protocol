/**
 * This runner creates an HTTP Dummy Market Maker bot that runs on Ropsten.
 *
 * It quotes
 *  - TestTokenA (TTA) "0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7"
 *  - TestTokenB (TTB) "0xf84830b73b2ed3c7267e7638f500110ea47fdf30"
 *
 * The rate is always 1:1
 *
 * On last look, it will look at the amount, ignoring decimals:
 * - Accept amounts that are even
 * - Rejects amounts that are odd
 *
 * Examples:
 * - 1.000_000_000_000_000_000 is considered odd!
 * - 2.000_000_000_000_000_001 is considered even!
 *
 */
import { createDefaultServer } from '@0x/api-utils';
import * as express from 'express';

import { defaultHttpServiceWithRateLimiterConfig } from '../config';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createDummyMMRouter } from '../routers/dummy_mm_router';
import { HttpServiceConfig } from '../types';

process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    if (err) {
        logger.error(err as Error);
    }
});

if (require.main === module) {
    (async () => {
        // Build dependencies
        const config: HttpServiceConfig = {
            ...defaultHttpServiceWithRateLimiterConfig,
            httpPort: 3001,
        };

        const app = express();
        app.use(addressNormalizer);
        app.get('/', rootHandler);

        const server = createDefaultServer(config, app, logger, async () => {
            /* do nothing */
        });

        app.use('', createDummyMMRouter());

        app.use(errorHandler);

        server.listen(config.httpPort);
    })().catch((error) => logger.error(error.stack));
}
