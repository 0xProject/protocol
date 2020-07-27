/**
 * This module can be used to run the Swap HTTP service standalone
 */

import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Server } from 'http';

import { AppDependencies, getDefaultAppDependenciesAsync } from '../app';
import { defaultHttpServiceWithRateLimiterConfig } from '../config';
import { SWAP_PATH } from '../constants';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createSwapRouter } from '../routers/swap_router';
import { HttpServiceConfig } from '../types';
import { providerUtils } from '../utils/provider_utils';

import { createDefaultServer } from './utils';

process.on('uncaughtException', err => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', err => {
    if (err) {
        logger.error(err);
    }
});

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceWithRateLimiterConfig);
        await runHttpServiceAsync(dependencies, defaultHttpServiceWithRateLimiterConfig);
    })().catch(error => logger.error(error.stack));
}

async function runHttpServiceAsync(
    dependencies: AppDependencies,
    config: HttpServiceConfig,
    _app?: core.Express,
): Promise<Server> {
    const app = _app || express();
    app.use(addressNormalizer);
    const server = createDefaultServer(dependencies, config, app);

    app.get('/', rootHandler);

    if (dependencies.swapService) {
        app.use(SWAP_PATH, createSwapRouter(dependencies.swapService));
    } else {
        logger.error(`Could not run swap service, exiting`);
        process.exit(1);
    }
    app.use(errorHandler);

    server.listen(config.httpPort);
    return server;
}
