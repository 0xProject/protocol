/**
 * Runs the RFQM MetaTransaction Consumer
 */
import { pino } from '@0x/api-utils';
import * as Sentry from '@sentry/node';
import { SQS } from 'aws-sdk';
import Axios from 'axios';
import { Counter } from 'prom-client';

import {
    ChainConfiguration,
    CHAIN_CONFIGURATIONS,
    CHAIN_ID,
    DEFINED_FI_API_KEY,
    DEFINED_FI_ENDPOINT,
    META_TX_WORKER_MNEMONIC,
    RFQM_WORKER_INDEX,
    SENTRY_DSN,
    SENTRY_ENVIRONMENT,
    SENTRY_TRACES_SAMPLE_RATE,
    TOKEN_PRICE_ORACLE_TIMEOUT,
} from '../config';
import { getDbDataSourceAsync } from '../getDbDataSourceAsync';
import { logger } from '../logger';
import { RfqmService } from '../services/rfqm_service';
import { ConfigManager } from '../utils/config_manager';
import { RfqmDbUtils } from '../utils/rfqm_db_utils';
import { buildRfqmServiceAsync, getAxiosRequestConfig } from '../utils/rfqm_service_builder';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { RfqMakerDbUtils } from '../utils/rfq_maker_db_utils';
import { startMetricsServer } from '../utils/runner_utils';
import { SqsClient } from '../utils/sqs_client';
import { SqsConsumer } from '../utils/sqs_consumer';
import { TokenPriceOracle } from '../utils/TokenPriceOracle';

const RFQM_JOB_DEQUEUED = new Counter({
    name: 'rfqm_job_dequeued',
    help: 'An Rfqm Job was pulled from the queue',
    labelNames: ['address'],
});

process.on(
    'uncaughtException',
    // see https://github.com/pinojs/pino/blob/master/docs/help.md#exit-logging
    pino.final(logger, (error, finalLogger) => {
        finalLogger.error(
            { errorMessage: error.message, workerIndex: RFQM_WORKER_INDEX },
            'RFQM worker exiting due to uncaught exception',
        );
        process.exit(1);
    }),
);

process.on('unhandledRejection', (reason, promise) => {
    const finalLogger = pino.final(logger);
    let errorMessage = '';
    if (reason instanceof Error) {
        errorMessage = reason.message;
    }
    finalLogger.error(
        { errorMessage, promise, workerIndex: RFQM_WORKER_INDEX },
        'RFQM worker exiting due to unhandled rejection',
    );
    process.exit(1);
});

if (require.main === module) {
    (async () => {
        // Start the Metrics Server
        startMetricsServer();

        if (META_TX_WORKER_MNEMONIC === undefined) {
            throw new Error(`META_TX_WORKER_MNEMONIC must be defined to use RFQM worker runner`);
        }
        if (RFQM_WORKER_INDEX === undefined) {
            throw new Error(`RFQM_WORKER_INDEX must be defined to use RFQM worker runner`);
        }

        const workerAddress = RfqBlockchainUtils.getAddressFromIndexAndPhrase(
            META_TX_WORKER_MNEMONIC,
            RFQM_WORKER_INDEX,
        );

        // Build dependencies
        const connection = await getDbDataSourceAsync();
        const rfqmDbUtils = new RfqmDbUtils(connection);
        const rfqMakerDbUtils = new RfqMakerDbUtils(connection);

        const chain = CHAIN_CONFIGURATIONS.find((c) => c.chainId === CHAIN_ID);

        if (!chain) {
            throw new Error(`Tried to start worker for chain ${CHAIN_ID}
            but no chain configuration was present`);
        }

        const axiosInstance = Axios.create(getAxiosRequestConfig(TOKEN_PRICE_ORACLE_TIMEOUT));
        const tokenPriceOracle = new TokenPriceOracle(axiosInstance, DEFINED_FI_API_KEY, DEFINED_FI_ENDPOINT);
        const rfqmService = await buildRfqmServiceAsync(
            true,
            rfqmDbUtils,
            rfqMakerDbUtils,
            tokenPriceOracle,
            new ConfigManager(),
            chain,
        );

        if (SENTRY_DSN) {
            Sentry.init({
                dsn: SENTRY_DSN,
                environment: SENTRY_ENVIRONMENT,

                // Set tracesSampleRate to 1.0 to capture 100%
                // of transactions for performance monitoring.
                // We recommend adjusting this value in production
                tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
            });
        }

        // Run the worker
        const worker = createRfqmWorker(rfqmService, workerAddress, chain);
        logger.info({ workerAddress, workerIndex: RFQM_WORKER_INDEX }, 'Starting RFQM worker');
        const consumeLoop: Promise<void> = worker.consumeAsync();

        // Add SIGTERM signal handler
        process.on('SIGTERM', async () => {
            logger.info(
                { workerAddress, workerIndex: RFQM_WORKER_INDEX },
                'SIGTERM signal received. Stop consuming more queue messages.',
            );

            // Avoid pulling more messages from the queue
            worker.stop();

            // Wait to finish processing current queue message
            await consumeLoop;
            logger.info({ workerAddress, workerIndex: RFQM_WORKER_INDEX }, 'Worker has stopped consuming.');
        });

        // Wait for pulling loop
        await consumeLoop;
    })(); // tslint:disable-line no-floating-promises
}

/**
 * Create an RFQM Worker
 */
export function createRfqmWorker(
    rfqmService: RfqmService,
    workerAddress: string,
    chain: ChainConfiguration,
): SqsConsumer {
    // Build the Sqs consumer
    const sqsClient = new SqsClient(new SQS({ apiVersion: '2012-11-05' }), chain.sqsUrl);
    const consumer = new SqsConsumer({
        id: workerAddress,
        sqsClient,
        beforeHandle: async () => rfqmService.workerBeforeLogicAsync(workerAddress),
        handleMessage: async (message) => {
            RFQM_JOB_DEQUEUED.labels(workerAddress).inc();
            const { orderHash } = JSON.parse(message.Body!);
            logger.info({ workerAddress, orderHash }, 'Job dequeued from SQS');
            await rfqmService.processJobAsync(orderHash, workerAddress);
        },
    });

    return consumer;
}
