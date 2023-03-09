import { createMetricsRouter, MetricsService } from '@0x/api-utils';
import { Worker } from 'bullmq';
import * as express from 'express';
import { Kafka, Producer as KafkaProducer } from 'kafkajs';

import { ENABLE_PROMETHEUS_METRICS, KAFKA_BROKERS, PROMETHEUS_PORT } from '../config';
import { METRICS_PATH } from '../core/constants';
import { logger } from '../logger';

/**
 * Close redis connections.
 *
 * @param redisConnections Redis connections to close.
 */
export async function closeRedisConnectionsAsync<T>(redisConnections: { quit: () => Promise<T> }[]): Promise<T[]> {
    const results: T[] = [];
    for (const connection of redisConnections) {
        try {
            const result = await connection.quit();
            results.push(result);
        } catch (error) {
            logger.error({ errorMessage: error.message, stack: error.stack }, 'Faied to shutdown redis connection');
        }
    }
    return results;
}

/**
 * Close bullmq workers.
 *
 * @param workers Bullmq workers to close.
 */
export async function closeWorkersAsync(workers: Worker[]): Promise<void> {
    for (const worker of workers) {
        try {
            await worker.close();
        } catch (error) {
            logger.error(
                { errorMessage: error.message, stack: error.stack },
                `Failed to shutdown worker ${worker.name}`,
            );
        }
    }
}

/**
 * Start the metrics server.
 */
export function startMetricsServer(): void {
    if (ENABLE_PROMETHEUS_METRICS) {
        const metricsService = new MetricsService();
        const metricsRouter = createMetricsRouter(metricsService);
        const metricsApp = express();

        metricsApp.use(METRICS_PATH, metricsRouter);
        const metricsServer = metricsApp.listen(PROMETHEUS_PORT, () => {
            logger.info(`Metrics (HTTP) listening on port ${PROMETHEUS_PORT}`);
        });

        metricsServer.on('error', (error) => {
            logger.error({ errorMessage: error, stack: error.stack }, 'Error in metrics server');
        });
    }
}

/**
 * Initialize a kafka producer if KAFKA_BROKERS is set
 */
export function getKafkaProducer(): KafkaProducer | undefined {
    let kafkaProducer: KafkaProducer | undefined;
    if (KAFKA_BROKERS !== undefined) {
        const kafka = new Kafka({
            clientId: '0x-api',
            brokers: KAFKA_BROKERS,
        });

        kafkaProducer = kafka.producer();
        // tslint:disable-next-line: no-floating-promises
        kafkaProducer.connect();
    }
    return kafkaProducer;
}
