import { createDefaultServer, HttpServiceConfig, pino } from '@0x/api-utils';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import Axios from 'axios';
import { providers } from 'ethers';
import * as express from 'express';
import * as promBundle from 'express-prom-bundle';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import * as redis from 'redis';
import { Producer } from 'sqs-producer';
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
import { GASLESS_SWAP_SERVICE_PATH, GASLESS_SWAP_SERVICE_REAL_PATH } from '../constants';
import { getDbDataSourceAsync } from '../getDbDataSourceAsync';
import { rootHandler } from '../handlers/root_handler';
import { logger } from '../logger';
import { addressNormalizer } from '../middleware/address_normalizer';
import { errorHandler } from '../middleware/error_handling';
import { createGaslessSwapRouter } from '../routers/GaslessSwapRouter';
import { GaslessSwapService } from '../services/GaslessSwapService';
import { BalanceChecker } from '../utils/balance_checker';
import { ConfigManager } from '../utils/config_manager';
import { providerUtils } from '../utils/provider_utils';
import { RfqmDbUtils } from '../utils/rfqm_db_utils';
import {
    buildRfqmServicesAsync,
    getAxiosRequestConfig,
    getContractAddressesForNetworkOrThrowAsync,
} from '../utils/rfqm_service_builder';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { RfqMakerDbUtils } from '../utils/rfq_maker_db_utils';
import { closeRedisConnectionsAsync } from '../utils/runner_utils';
import { TokenPriceOracle } from '../utils/TokenPriceOracle';

const redisClients: redis.RedisClientType[] = [];

process.on('uncaughtException', (e) => {
    const finalLogger = pino.final(logger);
    finalLogger.error(e);
    process.exit(1);
});

process.on('unhandledRejection', (e) => {
    if (e && e instanceof Error) {
        const finalLogger = pino.final(logger);
        finalLogger.error(e);
    }
});

process.on('SIGTERM', async () => {
    const finalLogger = pino.final(logger);
    finalLogger.info('Received SIGTERM. Start to shutdown gasless swap service');
    await closeRedisConnectionsAsync(redisClients);
    process.exit(0);
});

// Used for shutting down locally
process.on('SIGINT', async () => {
    const finalLogger = pino.final(logger);
    finalLogger.info('Received SIGINT. Start to shutdown gasless swap service');
    await closeRedisConnectionsAsync(redisClients);
    process.exit(0);
});

if (require.main === module) {
    (async () => {
        const connection = await getDbDataSourceAsync();
        const rfqmDbUtils = new RfqmDbUtils(connection);
        const rfqMakerDbUtils = new RfqMakerDbUtils(connection);
        const configManager = new ConfigManager();
        const axiosInstance = Axios.create(getAxiosRequestConfig(TOKEN_PRICE_ORACLE_TIMEOUT));
        const tokenPriceOracle = new TokenPriceOracle(axiosInstance, DEFINED_FI_API_KEY, DEFINED_FI_ENDPOINT);
        if (!REDIS_URI) {
            throw new Error('No redis URI provided to gasless swap service');
        }
        const redisClient: redis.RedisClientType = redis.createClient({ url: REDIS_URI });
        await redisClient.connect();
        redisClients.push(redisClient);

        const chainsConfigurationsWithGaslessSwap = CHAIN_CONFIGURATIONS.filter(
            (c) => c.gaslessSwapServiceConfiguration,
        );

        const rfqmServices = await buildRfqmServicesAsync(
            /* asWorker = */ false,
            rfqmDbUtils,
            rfqMakerDbUtils,
            chainsConfigurationsWithGaslessSwap,
            tokenPriceOracle,
            configManager,
        );

        const gaslessSwapServices = await chainsConfigurationsWithGaslessSwap.reduce(
            async (resultPromise, chainConfiguration) => {
                const result: Map<number, GaslessSwapService> = await resultPromise;
                const { gaslessSwapServiceConfiguration, chainId } = chainConfiguration;
                // Chains without this configuration are already filtered out in
                // chainsConfigurationsWithGaslessSwap, but let's make the type checker happy
                if (!gaslessSwapServiceConfiguration) {
                    throw new Error(`No gasless swap service for chain ${chainId} exists`);
                }
                const rfqmService = rfqmServices.get(chainId);
                if (!rfqmService) {
                    throw new Error(`RFQm Service for chain ${chainId} does not exist`);
                }
                const rpcProvider = providerUtils.createWeb3Provider(chainConfiguration.rpcUrl);
                const ethersProvider = new providers.JsonRpcProvider(
                    chainConfiguration.rpcUrl,
                    chainConfiguration.chainId,
                );
                const contractAddresses = await getContractAddressesForNetworkOrThrowAsync(
                    rpcProvider,
                    chainConfiguration,
                );
                const balanceChecker = new BalanceChecker(rpcProvider);
                const rfqBlockchainUtils = new RfqBlockchainUtils(
                    rpcProvider,
                    contractAddresses.exchangeProxy,
                    balanceChecker,
                    ethersProvider,
                );
                const sqsProducer = Producer.create({
                    queueUrl: chainConfiguration.sqsUrl,
                });
                const gaslessSwapService = new GaslessSwapService(
                    chainId,
                    rfqmService,
                    new URL(gaslessSwapServiceConfiguration.metaTransactionServiceUrl),
                    axiosInstance,
                    redisClient,
                    rfqmDbUtils,
                    rfqBlockchainUtils,
                    sqsProducer,
                );
                result.set(chainId, gaslessSwapService);

                return result;
            },
            Promise.resolve(new Map<number, GaslessSwapService>()),
        );
        logger.info(
            { chains: chainsConfigurationsWithGaslessSwap.map((c) => c.name) },
            'Starting gasless swap service',
        );
        await runGaslessSwapServiceAsync(gaslessSwapServices, configManager, defaultHttpServiceConfig, connection);
    })().catch((error) => logger.error(error.stack));
}

/**
 * Runs the Gasless Swap Service in isolation
 */
export async function runGaslessSwapServiceAsync(
    gaslessSwapServices: Map<number, GaslessSwapService>,
    configManager: ConfigManager,
    config: HttpServiceConfig,
    connection: DataSource,
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
            transformLabels: (labels, req, res) => {
                Object.assign(labels, { chainId: req.header('0x-chain-id') || 1 });
            },
            // buckets used for the http_request_duration_seconds histogram. All numbers (in seconds) represents boundaries of buckets.
            // tslint:disable-next-line: custom-no-magic-numbers
            buckets: [0.01, 0.04, 0.1, 0.3, 0.6, 1, 1.5, 2, 2.5, 3, 4, 6, 9],
        });
        app.use(metricsMiddleware);
    }
    app.use(addressNormalizer);
    app.get('/', rootHandler);
    const server = createDefaultServer(config, app, logger, async () => {
        await connection.close();
    });

    app.use(GASLESS_SWAP_SERVICE_PATH, createGaslessSwapRouter(gaslessSwapServices, configManager));
    app.use(GASLESS_SWAP_SERVICE_REAL_PATH, createGaslessSwapRouter(gaslessSwapServices, configManager));

    if (SENTRY_DSN) {
        // The error handler must be before any other error middleware and after all controllers
        app.use(
            Sentry.Handlers.errorHandler({
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
