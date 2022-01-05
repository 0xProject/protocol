/**
 * This module can be used to run the SRA HTTP service standalone
 */
import { cacheControl, createDefaultServer } from '@0x/api-utils';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Server } from 'http';

import { AppDependencies, getDefaultAppDependenciesAsync } from '../app';
import { defaultHttpServiceWithRateLimiterConfig } from '../config';
import { DEFAULT_CACHE_AGE_SECONDS, ORDERBOOK_PATH, SRA_PATH } from '../constants';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createOrderBookRouter } from '../routers/orderbook_router';
import { createSRARouter } from '../routers/sra_router';
import { WebsocketService } from '../services/websocket_service';
import { HttpServiceConfig } from '../types';
import { providerUtils } from '../utils/provider_utils';

import { destroyCallback } from './utils';

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
    })().catch((error) => logger.error(error.stack));
}

async function runHttpServiceAsync(
    dependencies: AppDependencies,
    config: HttpServiceConfig,
    _app?: core.Express,
): Promise<Server> {
    const app = _app || express();
    app.use(addressNormalizer);
    app.use(cacheControl(DEFAULT_CACHE_AGE_SECONDS));
    const server = createDefaultServer(config, app, logger, destroyCallback(dependencies));

    app.get('/', rootHandler);
    // SRA http service
    app.use(SRA_PATH, createSRARouter(dependencies.orderBookService));

    // OrderBook http service
    app.use(ORDERBOOK_PATH, createOrderBookRouter(dependencies.orderBookService));

    app.use(errorHandler);

    // websocket service
    if (dependencies.kafkaClient) {
        const wsService = new WebsocketService(server, dependencies.kafkaClient, dependencies.websocketOpts);
        wsService.startAsync().catch((error) => logger.error(error.stack));
    } else {
        logger.error('Could not establish kafka connection, exiting');
        process.exit(1);
    }

    server.listen(config.httpPort);
    return server;
}
