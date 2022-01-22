import { createDefaultServer } from '@0x/api-utils';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Server } from 'http';

import { AppDependencies, getDefaultAppDependenciesAsync } from '../app';
import { defaultHttpServiceWithRateLimiterConfig } from '../config';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { HttpServiceConfig } from '../types';
import { providerUtils } from '../utils/provider_utils';

import { destroyCallback } from './utils';

/**
 * http_service_runner hosts endpoints for sra, swap and meta-txns (minus the /submit endpoint)
 * and can be horizontally scaled as needed
 */

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
        const provider = providerUtils.createWeb3Provider(defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceWithRateLimiterConfig);
        await runHttpServiceAsync(dependencies, defaultHttpServiceWithRateLimiterConfig);
    })().catch((error) => logger.error(error.stack));
}

export interface HttpServices {
    server: Server;
}

/**
 * This service handles the HTTP requests. This involves fetching from the database
 * as well as adding orders to order-watcher.
 * @param dependencies Defaults are provided for all params.
 */
export async function runHttpServiceAsync(
    dependencies: AppDependencies,
    config: HttpServiceConfig,
    _app?: core.Express,
): Promise<HttpServices> {
    const app = _app || express();
    const server = createDefaultServer(config, app, logger, destroyCallback(dependencies));

    app.get('/', rootHandler);
    server.on('error', (err) => {
        logger.error(err);
    });

    // transform all values of `req.query.[xx]Address` to lowercase
    app.use(addressNormalizer);

    app.use(errorHandler);

    server.listen(config.httpPort);
    return {
        server,
    };
}
