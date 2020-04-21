import bodyParser = require('body-parser');
import * as cors from 'cors';
import * as express from 'express';
import * as asyncHandler from 'express-async-handler';

import { META_TRANSACTION_PATH } from '../constants';
import { SignerHandlers } from '../handlers/signer_handlers';
import { logger } from '../logger';
import { errorHandler } from '../middleware/error_handling';
import { requestLogger } from '../middleware/request_logger';
import { SignerService } from '../services/signer_service';

if (require.main === module) {
    (async () => {
        const app = express();
        app.use(requestLogger());
        app.use(cors());
        app.use(bodyParser.json());

        const signerService = new SignerService();
        const handlers = new SignerHandlers(signerService);
        /**
         * POST Transaction endpoint takes a signed 0x Transaction and sends it to Ethereum
         * for execution via `executeTransaction`.
         *
         * https://0x.org/docs/guides/v3-specification#executing-a-transaction
         */
        app.post(
            `${META_TRANSACTION_PATH}/submit`,
            asyncHandler(handlers.submitZeroExTransactionIfWhitelistedAsync.bind(handlers)),
        );

        app.use(errorHandler);

        logger.info('Signing Service started!');
    })().catch(error => logger.error(error));
}
process.on('uncaughtException', err => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', err => {
    if (err) {
        logger.error(err);
    }
});
