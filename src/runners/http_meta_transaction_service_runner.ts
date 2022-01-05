import { createDefaultServer } from '@0x/api-utils';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Server } from 'http';

import { AppDependencies, getDefaultAppDependenciesAsync } from '../app';
import { defaultHttpServiceWithRateLimiterConfig } from '../config';
import { META_TRANSACTION_PATH } from '../constants';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { errorHandler } from '../middleware/error_handling';
import { createMetaTransactionRouter } from '../routers/meta_transaction_router';
import { HttpServiceConfig } from '../types';
import { providerUtils } from '../utils/provider_utils';

import { destroyCallback } from './utils';

/**
 * This module can be used to run the Meta Transaction HTTP service standalone
 */

process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    if (err) {
        logger.error(err);
    }
});

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(
            defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl,
            defaultHttpServiceWithRateLimiterConfig.rpcRequestTimeout,
            defaultHttpServiceWithRateLimiterConfig.shouldCompressRequest,
        );
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceWithRateLimiterConfig);
        await runHttpServiceAsync(dependencies, defaultHttpServiceWithRateLimiterConfig);
    })().catch((error) => logger.error(error));
}

async function runHttpServiceAsync(
    dependencies: AppDependencies,
    config: HttpServiceConfig,
    _app?: core.Express,
): Promise<Server> {
    const app = _app || express();
    const server = createDefaultServer(config, app, logger, destroyCallback(dependencies));
    app.get('/', rootHandler);
    if (dependencies.metaTransactionService) {
        app.use(
            META_TRANSACTION_PATH,
            createMetaTransactionRouter(dependencies.metaTransactionService, dependencies.rateLimiter),
        );
    } else {
        logger.error(`Could not run meta transaction service, exiting`);
        process.exit(1);
    }
    app.use(errorHandler);
    server.listen(config.httpPort);
    return server;
}
