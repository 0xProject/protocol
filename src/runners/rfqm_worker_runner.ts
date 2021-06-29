/**
 * Runs the RFQM MetaTransaction Consumer
 */
import { createMetricsRouter, MetricsService } from '@0x/api-utils';
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
});

const RFQM_JOB_COMPLETED = new Counter({
    name: 'rfqm_job_completed',
    help: 'An Rfqm Job completed with no errors',
});

const RFQM_JOB_COMPLETED_WITH_ERROR = new Counter({
    name: 'rfqm_job_completed_with_error',
    help: 'An Rfqm Job completed with an error',
});

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
        await runRfqmWorkerAsync(rfqmService, workerAddress);
    })().catch((error) => {
        logger.error(error.stack);
        process.exit(1);
    });
}

/**
 * Runs the Rfqm Consumer
 */
export async function runRfqmWorkerAsync(rfqmService: RfqmService, workerAddress: string): Promise<SqsConsumer> {
    // Build the Sqs consumer
    const sqsClient = new SqsClient(new SQS({ apiVersion: '2012-11-05' }), RFQM_META_TX_SQS_URL!);
    const consumer = new SqsConsumer({
        id: workerAddress,
        sqsClient,
        beforeHandle: async () => rfqmService.workerBeforeLogicAsync(workerAddress),
        handleMessage: async (message) => {
            RFQM_JOB_DEQUEUED.inc();
            const { orderHash } = JSON.parse(message.Body!);
            logger.info({ workerAddress, orderHash }, 'about to process job');
            return rfqmService.processRfqmJobAsync(orderHash, workerAddress);
        },
        afterHandle: async (message, error) => {
            const orderHash = message.Body!;
            if (error !== undefined) {
                RFQM_JOB_COMPLETED_WITH_ERROR.inc();
                logger.warn({ workerAddress, orderHash, error }, 'job completed with error');
                return;
            }

            logger.info({ workerAddress, orderHash }, 'job completed without errors');
            RFQM_JOB_COMPLETED.inc();
        },
    });

    // Start the consumer - aka the worker
    consumer.consumeAsync().catch((e) => {
        logger.error({ error: e }, 'Unexpected error encountered in consume loop');
        process.exit(1);
    });
    logger.info('Rfqm Consumer running');
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

        metricsServer.on('error', (err) => {
            logger.error(err);
        });
    }
}
