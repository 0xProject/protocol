/**
 * Runs the RFQM MetaTransaction Consumer
 */
import { createMetricsRouter, MetricsService, pino } from '@0x/api-utils';
import { SQS } from 'aws-sdk';
import * as express from 'express';
import { Counter } from 'prom-client';

import {
    ENABLE_PROMETHEUS_METRICS,
    META_TX_WORKER_MNEMONIC,
    PROMETHEUS_PORT,
    RFQM_META_TX_SQS_URL,
    RFQM_WORKER_INDEX,
} from '../config';
import { METRICS_PATH } from '../constants';
import { getDBConnectionAsync } from '../db_connection';
import { logger } from '../logger';
import { RfqmService } from '../services/rfqm_service';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { SqsClient } from '../utils/sqs_client';
import { SqsConsumer } from '../utils/sqs_consumer';

import { buildRfqmServiceAsync } from './http_rfqm_service_runner';

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
        const connection = await getDBConnectionAsync();
        const rfqmService = await buildRfqmServiceAsync(connection, true);

        // Run the worker
        const worker = createRfqmWorker(rfqmService, workerAddress);
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
export function createRfqmWorker(rfqmService: RfqmService, workerAddress: string): SqsConsumer {
    // Build the Sqs consumer
    const sqsClient = new SqsClient(new SQS({ apiVersion: '2012-11-05' }), RFQM_META_TX_SQS_URL!);
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

function startMetricsServer(): void {
    if (ENABLE_PROMETHEUS_METRICS) {
        const metricsService = new MetricsService();
        const metricsRouter = createMetricsRouter(metricsService);
        const metricsApp = express();

        metricsApp.use(METRICS_PATH, metricsRouter);
        const metricsServer = metricsApp.listen(PROMETHEUS_PORT, () => {
            logger.info(`Metrics (HTTP) listening on port ${PROMETHEUS_PORT}`);
        });

        metricsServer.on('error', (error) => {
            logger.error(error);
        });
    }
}
