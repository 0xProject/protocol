/**
 * This module can be used to run the SRA HTTP service standalone
 */

import bodyParser = require('body-parser');
import * as cors from 'cors';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Server } from 'http';

import { AppDependencies, getDefaultAppDependenciesAsync } from '../app';
import { defaultHttpServiceWithRateLimiterConfig } from '../config';
import { SRA_PATH } from '../constants';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { requestLogger } from '../middleware/request_logger';
import { createSRARouter } from '../routers/sra_router';
import { WebsocketService } from '../services/websocket_service';
import { HttpServiceConfig } from '../types';
import { providerUtils } from '../utils/provider_utils';

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
    app.use(requestLogger());
    app.use(cors());
    app.use(bodyParser.json());
    app.get('/', rootHandler);
    const server = app.listen(config.httpPort, () => {
        logger.info(`API (HTTP) listening on port ${config.httpPort}!`);
    });
    server.keepAliveTimeout = config.httpKeepAliveTimeout;
    server.headersTimeout = config.httpHeadersTimeout;

    // SRA http service
    app.use(addressNormalizer);
    app.use(SRA_PATH, createSRARouter(dependencies.orderBookService));
    app.use(errorHandler);

    // websocket service
    if (dependencies.meshClient) {
        // tslint:disable-next-line:no-unused-expression
        new WebsocketService(server, dependencies.meshClient, dependencies.websocketOpts);
    } else {
        logger.error(`Could not establish mesh connection, exiting`);
        process.exit(1);
    }

    return server;
}
