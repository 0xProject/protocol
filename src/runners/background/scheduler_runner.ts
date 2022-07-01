/**
 * This runner script creates the scheduler which schedules background jobs. Background jobs would be pushed to message queueus
 * according to defined schedules.
 */
import { pino } from '@0x/api-utils';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

import backgroundJobNoOp from '../../background-jobs/no_op';
import { REDIS_BACKGROUND_JOB_URI } from '../../config';
import { logger } from '../../logger';
import { ScheduledBackgroundJob, Scheduler } from '../../scheduler';
import { closeRedisConnectionsAsync } from '../../utils/background_job_runner_utils';

const connections: Redis[] = [];

process.on('uncaughtException', async (error) => {
    const finalLogger = pino.final(logger);
    finalLogger.error({ errorMessage: error.message, stack: error.stack }, 'uncaughtException in scheduler_runner');
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    const finalLogger = pino.final(logger);
    if (reason instanceof Error) {
        finalLogger.error(
            { errorMessage: reason, stack: reason.stack, promise },
            'unhandledRejection in scheduler_runner',
        );
    } else {
        finalLogger.error('unhandledRejection in scheduler_runner');
    }
    process.exit(1);
});

process.on('SIGTERM', async () => {
    const finalLogger = pino.final(logger);
    finalLogger.info('Received SIGTERM. Start to shutdown the scheduler and redis connections');
    await Scheduler.shutdownAsync();
    await closeRedisConnectionsAsync(connections);
    process.exit(0);
});

// Used for shutting down locally
process.on('SIGINT', async () => {
    const finalLogger = pino.final(logger);
    finalLogger.info('Received SIGINT. Start to shutdown the scheduler and redis connections');
    await Scheduler.shutdownAsync();
    await closeRedisConnectionsAsync(connections);
    process.exit(0);
});

if (require.main === module) {
    // tslint:disable:no-floating-promises
    // Promise rejections would be handled by the unhandledRejection handler
    (async () => {
        // Prepare Redis connections
        const connection = new Redis(REDIS_BACKGROUND_JOB_URI!);
        connections.push(connection);
        // Prepare queues
        const noOpBackgroundJobQueue = new Queue(backgroundJobNoOp.queueName, { connection });

        const schedule: ScheduledBackgroundJob[] = [
            {
                schedule: backgroundJobNoOp.schedule,
                func: async () => {
                    await backgroundJobNoOp.createAsync(noOpBackgroundJobQueue, { timestamp: Date.now() });
                },
            },
        ];

        const scheduler = new Scheduler(schedule);
        logger.info('Starting scheduler');
        scheduler.start();
        logger.info('Scheduler has been started');
    })();
}
