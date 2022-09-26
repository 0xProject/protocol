/**
 * This runner script creates workers that would process background jobs from queues when available.
 */
import { pino } from '@0x/api-utils';
import { Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { Counter } from 'prom-client';

import { BackgroundJobBlueprint } from '../../background-jobs/blueprint';
import { BackgroundJobData, BackgroundJobResult } from '../../background-jobs/types';
import { BACKGROUND_JOB_TYPES, REDIS_BACKGROUND_JOB_URI } from '../../config';
import { logger } from '../../logger';
import { closeRedisConnectionsAsync, closeWorkersAsync, startMetricsServer } from '../../utils/runner_utils';

const connections: Redis[] = [];
const workers: Worker[] = [];

const BACKGROUND_JOB_EVENTS_COUNT = new Counter({
    name: 'rfq_background_job_events_total',
    labelNames: ['backgroundJobType', 'status'],
    help: 'Number of events for a background job type',
});

process.on('uncaughtException', async (error) => {
    const finalLogger = pino.final(logger);
    finalLogger.error({ errorMessage: error.message, stack: error.stack }, 'uncaughtException in processor_runner');
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    const finalLogger = pino.final(logger);
    if (reason instanceof Error) {
        finalLogger.error(
            { errorMessage: reason, stack: reason.stack, promise },
            'unhandledRejection in processor_runner',
        );
    } else {
        finalLogger.error('unhandledRejection in processor_runner');
    }
    process.exit(1);
});

process.on('SIGTERM', async () => {
    const finalLogger = pino.final(logger);
    finalLogger.info('Received SIGTERM. Start to shutdown workers and redis connections');
    await closeWorkersAsync(workers);
    await closeRedisConnectionsAsync(connections);
    process.exit(0);
});

// Used for shutting down locall y
process.on('SIGINT', async () => {
    const finalLogger = pino.final(logger);
    finalLogger.info('Received SIGINT. Start to shutdown workers and redis connections');
    await closeWorkersAsync(workers);
    await closeRedisConnectionsAsync(connections);
    process.exit(0);
});

if (require.main === module) {
    // tslint:disable:no-floating-promises
    // Promise rejections would be handled by the unhandledRejection handler
    (async () => {
        // Start the metrics server
        startMetricsServer();
        // Prepare Redis connections
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const connection = new Redis(REDIS_BACKGROUND_JOB_URI!, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
        connections.push(connection);
        const backgroundJobTypes: string[] = (BACKGROUND_JOB_TYPES || '').split(',');

        // Make sure all background jobs can be found. If not, an exception will be thrown
        // and none of the corresponding workers would be started
        for (const jobType of backgroundJobTypes) {
            await import(`../../background-jobs/${jobType}`);
        }

        for (const jobType of backgroundJobTypes) {
            logger.info(`Setting up worker for ${jobType}`);
            const { queueName, processAsync } = (await import(`../../background-jobs/${jobType}`))
                .default as BackgroundJobBlueprint<BackgroundJobData, BackgroundJobResult>;
            const worker = new Worker(queueName, processAsync, { connection });
            workers.push(worker);

            worker.on(
                'completed',
                (job: Job<BackgroundJobData, BackgroundJobResult>, returnvalue: BackgroundJobResult) => {
                    BACKGROUND_JOB_EVENTS_COUNT.labels(jobType, 'completed').inc();
                    logger.info({ jobName: job.name, returnValue: returnvalue }, 'Job completed');
                },
            );
            worker.on('failed', (job: Job<BackgroundJobData, BackgroundJobResult>, error: Error) => {
                BACKGROUND_JOB_EVENTS_COUNT.labels(jobType, 'failed').inc();
                logger.error({ jobName: job.name, errorMessage: error.message, stack: error.stack }, 'Job failed');
            });
            // Error listener to prevent exception in worker shutting down the runner process. More info https://docs.bullmq.io/guide/workers
            worker.on('error', (error) => {
                BACKGROUND_JOB_EVENTS_COUNT.labels(jobType, 'error').inc();
                logger.error({ errorMessage: error.message, stack: error.stack }, 'Worker error');
            });
        }
    })();
}
