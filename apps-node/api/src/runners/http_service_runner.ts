import { createDefaultServer } from '@0x/api-utils';
import * as express from 'express';
import * as core from 'express-serve-static-core';
import { Server } from 'http';

import { getDefaultAppDependenciesAsync } from './utils';
import {
    defaultHttpServiceConfig,
    SENTRY_DSN,
    SENTRY_ENVIRONMENT,
    SENTRY_SAMPLE_RATE,
    SENTRY_TRACES_SAMPLE_RATE,
} from '../config';
import { META_TRANSACTION_V1_PATH, META_TRANSACTION_V2_PATH, ORDERBOOK_PATH, SRA_PATH, SWAP_PATH } from '../constants';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createMetaTransactionV1Router, createMetaTransactionV2Router } from '../routers/meta_transaction_router';
import { createOrderBookRouter } from '../routers/orderbook_router';
import { createSRARouter } from '../routers/sra_router';
import { createSwapRouter } from '../routers/swap_router';
import { SentryInit, SentryOptions } from '../sentry';
import { WebsocketService } from '../services/websocket_service';
import { HttpServiceConfig, AppDependencies } from '../types';
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
        logger.error(err);
    }
});

if (require.main === module) {
    (async () => {
        const provider = providerUtils.createWeb3Provider(
            defaultHttpServiceConfig.ethereumRpcUrl,
            defaultHttpServiceConfig.rpcRequestTimeout,
            defaultHttpServiceConfig.shouldCompressRequest,
        );
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceConfig);
        await runHttpServiceAsync(dependencies, defaultHttpServiceConfig);
    })().catch((error) => logger.error(error.stack));
}

interface HttpServices {
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

    if (dependencies.hasSentry) {
        const options: SentryOptions = {
            app: app,
            dsn: SENTRY_DSN,
            environment: SENTRY_ENVIRONMENT,
            paths: [SRA_PATH, ORDERBOOK_PATH, META_TRANSACTION_V1_PATH, META_TRANSACTION_V2_PATH, SWAP_PATH],
            sampleRate: SENTRY_SAMPLE_RATE,
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
        };

        SentryInit(options);
    }

    const server = createDefaultServer(config, app, logger, destroyCallback(dependencies));

    app.get('/', rootHandler);
    server.on('error', (err) => {
        logger.error(err);
    });

    // transform all values of `req.query.[xx]Address` to lowercase
    app.use(addressNormalizer);

    if (dependencies.orderBookService !== undefined) {
        // SRA http service
        app.use(SRA_PATH, createSRARouter(dependencies.orderBookService));

        // OrderBook http service
        app.use(ORDERBOOK_PATH, createOrderBookRouter(dependencies.orderBookService));
    }

    // metatxn http service
    if (dependencies.metaTransactionService) {
        app.use(META_TRANSACTION_V1_PATH, createMetaTransactionV1Router(dependencies.metaTransactionService));
        app.use(META_TRANSACTION_V2_PATH, createMetaTransactionV2Router(dependencies.metaTransactionService));
    } else {
        logger.error(`API running without meta transactions service`);
    }

    // swap/quote http service
    if (dependencies.swapService) {
        app.use(SWAP_PATH, createSwapRouter(dependencies.swapService));
    } else {
        logger.error(`API running without swap service`);
    }

    app.use(errorHandler);

    // optional websocket service
    if (dependencies.kafkaClient) {
        const wsService = new WebsocketService(server, dependencies.kafkaClient, dependencies.websocketOpts);
        wsService.startAsync().catch((error) => logger.error(error.stack));
    } else {
        logger.warn('Could not establish kafka connection, websocket service will not start');
    }

    server.listen(config.httpPort);
    return {
        server,
    };
}
