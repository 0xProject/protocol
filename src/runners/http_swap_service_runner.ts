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
import { createMetricsRouter } from '../routers/metrics_router';
import { createSwapRouter } from '../routers/swap_router';
import { MetricsService } from '../services/metrics_service';
import { HttpServiceConfig } from '../types';
import { providerUtils } from '../utils/provider_utils';

import { createDefaultServer } from './utils';

export const METRICS_PATH = '/metrics';

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
        const config: HttpServiceConfig = {
            ...defaultHttpServiceWithRateLimiterConfig,
            // Mesh is not required for Swap Service
            meshWebsocketUri: undefined,
            meshHttpUri: undefined,
        };
        const dependencies = await getDefaultAppDependenciesAsync(provider, config);
        await runHttpServiceAsync(dependencies, config);
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

    if (config.enablePrometheusMetrics) {
        const prometheusApp = express();
        const metricsRouter = createMetricsRouter(
            dependencies.metricsService !== undefined ? dependencies.metricsService : new MetricsService(),
        );
        prometheusApp.use(METRICS_PATH, metricsRouter);
        const prometheusServer = prometheusApp.listen(config.prometheusPort, () => {
            logger.info(`Metrics (HTTP) listening on port ${config.prometheusPort}`);
        });
        prometheusServer.on('error', err => {
            logger.error(err);
        });
    }

    server.listen(config.httpPort);
    return server;
}
