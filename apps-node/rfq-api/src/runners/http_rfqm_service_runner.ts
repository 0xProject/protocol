/**
 * This module can be used to run the RFQM HTTP service standalone
 */
import { createDefaultServer, HttpServiceConfig } from '@0x/api-utils';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import Axios from 'axios';
import * as express from 'express';
import * as promBundle from 'express-prom-bundle';

import * as core from 'express-serve-static-core';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

import {
    CHAIN_CONFIGURATIONS,
    defaultHttpServiceConfig,
    DEFINED_FI_API_KEY,
    DEFINED_FI_ENDPOINT,
    REDIS_URI,
    SENTRY_DSN,
    SENTRY_ENVIRONMENT,
    SENTRY_TRACES_SAMPLE_RATE,
    TOKEN_PRICE_ORACLE_TIMEOUT,
} from '../config';
import { ADMIN_PATH, ONE_MINUTE_MS, RFQM_PATH, RFQT_V1_PATH, RFQT_V2_PATH, RFQ_MAKER_PATH } from '../core/constants';
import { getDbDataSourceAsync } from '../getDbDataSourceAsync';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createRfqmRouter } from '../routers/rfqm_router';
import { createRfqtV1Router, createRfqtV2Router } from '../routers/RfqtRouter';
import { createRfqAdminRouter } from '../routers/rfq_admin_router';
import { createRfqMakerRouter } from '../routers/rfq_maker_router';
import { RfqAdminService } from '../services/rfq_admin_service';
import { RfqMakerService } from '../services/rfq_maker_service';
import { ConfigManager } from '../utils/config_manager';
import { RfqmDbUtils } from '../utils/rfqm_db_utils';
import { buildRfqmServicesAsync, getAxiosRequestConfig, RfqmServices } from '../utils/rfqm_service_builder';
import { buildRfqtServicesAsync, RfqtServices } from '../utils/rfqtServiceBuilder';
import { RfqDynamicBlacklist } from '../utils/rfq_dynamic_blacklist';
import { RfqMakerDbUtils } from '../utils/rfq_maker_db_utils';
import { closeRedisConnectionsAsync } from '../utils/runner_utils';
import { TokenPriceOracle } from '../utils/TokenPriceOracle';

const redisInstances: Redis[] = [];

process.on('uncaughtException', (err) => {
    logger.error(err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    if (err) {
        logger.error(err as Error);
    }
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Start to shutdown RFQ services');
    await closeRedisConnectionsAsync(redisInstances);
    process.exit(0);
});

// Used for shutting down locally
process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Start to shutdown RFQ services');
    await closeRedisConnectionsAsync(redisInstances);
    process.exit(0);
});

if (require.main === module) {
    (async () => {
        // Build dependencies
        const config: HttpServiceConfig = {
            ...defaultHttpServiceConfig,
        };
        const connection = await getDbDataSourceAsync();
        const rfqDynamicBlacklist = new RfqDynamicBlacklist(connection, new Set(), ONE_MINUTE_MS * 30);
        const rfqmDbUtils = new RfqmDbUtils(connection);
        const rfqMakerDbUtils = new RfqMakerDbUtils(connection);
        const configManager = new ConfigManager();
        const axiosInstance = Axios.create(getAxiosRequestConfig(TOKEN_PRICE_ORACLE_TIMEOUT));
        const tokenPriceOracle = new TokenPriceOracle(axiosInstance, DEFINED_FI_API_KEY, DEFINED_FI_ENDPOINT);

        if (!REDIS_URI) {
            throw new Error('No redis URI provided to RFQ Service');
        }
        const redis = new Redis(REDIS_URI);
        redisInstances.push(redis);

        const rfqmServices = await buildRfqmServicesAsync(
            /* asWorker = */ false,
            rfqmDbUtils,
            rfqMakerDbUtils,
            CHAIN_CONFIGURATIONS,
            tokenPriceOracle,
            configManager,
            redis,
        );

        const rfqtServices = await buildRfqtServicesAsync(
            CHAIN_CONFIGURATIONS,
            rfqMakerDbUtils,
            rfqDynamicBlacklist,
            redis,
        );

        const rfqAdminService = buildRfqAdminService(rfqmDbUtils);
        const rfqMakerService = buildRfqMakerService(rfqMakerDbUtils, configManager);
        await runHttpRfqmServiceAsync(
            rfqmServices,
            rfqtServices,
            rfqAdminService,
            rfqMakerService,
            configManager,
            config,
            connection,
        );
    })().catch((error) => logger.error(error.stack));
}

/**
 * Builds an instance of RfqAdminService
 */
export function buildRfqAdminService(dbUtils: RfqmDbUtils): RfqAdminService {
    return new RfqAdminService(dbUtils);
}

/**
 * Builds an instance of RfqMakerService
 */
export function buildRfqMakerService(dbUtils: RfqMakerDbUtils, configManager: ConfigManager): RfqMakerService {
    return new RfqMakerService(dbUtils, configManager);
}

/**
 * Runs the Rfqm Service in isolation
 */
export async function runHttpRfqmServiceAsync(
    rfqmServices: RfqmServices,
    rfqtServices: RfqtServices,
    rfqAdminService: RfqAdminService,
    rfqMakerService: RfqMakerService,
    configManager: ConfigManager,
    config: HttpServiceConfig,
    connection: DataSource,
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    useMetricsMiddleware: boolean = true,
    _app?: core.Express,
): Promise<{ app: express.Application; server: Server }> {
    const app = _app || express();

    if (SENTRY_DSN) {
        Sentry.init({
            dsn: SENTRY_DSN,
            integrations: [
                // enable HTTP calls tracing
                new Sentry.Integrations.Http({ tracing: true }),
                // enable Express.js middleware tracing
                new Tracing.Integrations.Express({ app }),
            ],
            environment: SENTRY_ENVIRONMENT,

            // Set tracesSampleRate to 1.0 to capture 100%
            // of transactions for performance monitoring.
            // We recommend adjusting this value in production
            tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
        });

        // RequestHandler creates a separate execution context using domains, so that every
        // transaction/span/breadcrumb is attached to its own Hub instance
        app.use(Sentry.Handlers.requestHandler());
        // TracingHandler creates a trace for every incoming request
        app.use(Sentry.Handlers.tracingHandler());
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
            customLabels: { chainId: undefined },
            normalizePath: [
                ['/status/.*', '/status/#orderHash'], // converts all /status/0xdeadbeef... => /status/#orderHash
                ['/api-docs.*', '/api-docs'], // converts all /api-docs/favicon... => /api-docs
            ],
            transformLabels: (labels, req, _res) => {
                Object.assign(labels, { chainId: req.header('0x-chain-id') || 1 });
            },
            // buckets used for the http_request_duration_seconds histogram. All numbers (in seconds) represents boundaries of buckets.
            buckets: [0.01, 0.04, 0.1, 0.3, 0.6, 1, 1.5, 2, 2.5, 3, 4, 6, 9],
        });
        app.use(metricsMiddleware);
    }
    app.use(addressNormalizer);
    app.get('/', rootHandler);
    const server = createDefaultServer(config, app, logger, async () => {
        await connection.close();
    });

    app.use(RFQM_PATH, createRfqmRouter(rfqmServices, configManager));
    app.use(RFQT_V1_PATH, createRfqtV1Router(rfqtServices, configManager));
    app.use(RFQT_V2_PATH, createRfqtV2Router(rfqtServices, configManager));
    app.use(RFQ_MAKER_PATH, createRfqMakerRouter(rfqMakerService));
    app.use(ADMIN_PATH, createRfqAdminRouter(rfqAdminService, configManager));

    if (SENTRY_DSN) {
        // The error handler must be before any other error middleware and after all controllers
        app.use(
            Sentry.Handlers.errorHandler({
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shouldHandleError(error: any): boolean {
                    if (error.status === undefined || error.status >= HttpStatus.BAD_REQUEST) {
                        return true;
                    }
                    return false;
                },
            }),
        );
    }

    app.use(errorHandler);

    server.listen(config.httpPort);
    return { app, server };
}
