/**
 * This module can be used to run the SRA HTTP service standalone
 */
import { cacheControl, createDefaultServer } from '@0x/api-utils';
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
import { DEFAULT_CACHE_AGE_SECONDS, ORDERBOOK_PATH, SRA_PATH } from '../constants';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createOrderBookRouter } from '../routers/orderbook_router';
import { createSRARouter } from '../routers/sra_router';
import { SentryInit, SentryOptions } from '../sentry';
import { WebsocketService } from '../services/websocket_service';
import { HttpServiceConfig, AppDependencies } from '../types';
import { providerUtils } from '../utils/provider_utils';
import * as promBundle from 'express-prom-bundle';

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
            defaultHttpServiceConfig.ethereumRpcUrl,
            defaultHttpServiceConfig.rpcRequestTimeout,
            defaultHttpServiceConfig.shouldCompressRequest,
        );
        const dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceConfig);
        await runHttpServiceAsync(dependencies, defaultHttpServiceConfig);
    })().catch((error) => logger.error(error.stack));
}

async function runHttpServiceAsync(
    dependencies: AppDependencies,
    config: HttpServiceConfig,
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    useMetricsMiddleware: boolean = true,
    _app?: core.Express,
): Promise<Server> {
    const app = _app || express();

    if (dependencies.hasSentry) {
        const options: SentryOptions = {
            app: app,
            dsn: SENTRY_DSN,
            environment: SENTRY_ENVIRONMENT,
            paths: [SRA_PATH, ORDERBOOK_PATH],
            sampleRate: SENTRY_SAMPLE_RATE,
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
        };

        SentryInit(options);
    }

    if (useMetricsMiddleware) {
        /**
         * express-prom-bundle will create a histogram metric called "http_request_duration_seconds"
         * The official prometheus docs describe how to use this exact histogram metric: https://prometheus.io/docs/practices/histograms/
         * We use the following labels: statusCode, path
         */
        const metricsMiddleware = promBundle({
            autoregister: false,
            includeStatusCode: true,
            includePath: true,
            includeMethod: true,
            customLabels: { chainId: undefined },
            normalizePath: [['/order/.*', '/order/#orderHash']],
            transformLabels: (labels, req, _res) => {
                Object.assign(labels, { chainId: req.header('0x-chain-id') || 1 });
            },
            // buckets used for the http_request_duration_seconds histogram. All numbers (in seconds) represents boundaries of buckets.
            // tslint:disable-next-line: custom-no-magic-numbers
            buckets: [0.01, 0.04, 0.1, 0.3, 0.6, 1, 1.5, 2, 2.5, 3, 4, 6, 9],
        });
        app.use(metricsMiddleware);
    }

    app.use(addressNormalizer);
    app.use(cacheControl(DEFAULT_CACHE_AGE_SECONDS));
    const server = createDefaultServer(config, app, logger, destroyCallback(dependencies));

    app.get('/', rootHandler);

    if (dependencies.orderBookService === undefined) {
        logger.error('OrderBookService dependency is missing, exiting');
        process.exit(1);
    }

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
