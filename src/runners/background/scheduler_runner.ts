/**
 * This runner script creates the scheduler which schedules background jobs. Background jobs would be pushed to message queueus
 * according to defined schedules.
 */
import { pino } from '@0x/api-utils';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

import backgroundJobLiquidityMonitor from '../../background-jobs/liquidity_montior';
import backgroundJobMBCEvict from '../../background-jobs/maker_balance_cache_evict';
import backgroundJobMBCUpdate from '../../background-jobs/maker_balance_cache_update';
import backgroundJobNoOp from '../../background-jobs/no_op';
import { CHAIN_CONFIGURATIONS, REDIS_BACKGROUND_JOB_URI } from '../../config';
import { logger } from '../../logger';
import { ScheduledBackgroundJob, Scheduler } from '../../scheduler';
import { buildMBCEvictJob, buildMBCUpdateJob } from '../../utils/background_job_builder';
import { closeRedisConnectionsAsync, startMetricsServer } from '../../utils/runner_utils';

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
        // Start the metrics server
        startMetricsServer();
        // Prepare Redis connections
        const connection = new Redis(REDIS_BACKGROUND_JOB_URI!);
        connections.push(connection);

        // Maker Balance Cache
        const mbcEvictBackgroundJobQueue = new Queue(backgroundJobMBCEvict.queueName, { connection });
        const mbcUpdateBackgroundJobQueue = new Queue(backgroundJobMBCUpdate.queueName, { connection });
        const mbcChains = CHAIN_CONFIGURATIONS.filter((chain) => chain.enableMakerBalanceCache === true);
        const mbcJobs = mbcChains.flatMap((chain) => {
            const chainId = chain.chainId;
            return [
                buildMBCEvictJob(mbcEvictBackgroundJobQueue, chainId),
                buildMBCUpdateJob(mbcUpdateBackgroundJobQueue, chainId),
            ];
        });

        const schedule: ScheduledBackgroundJob[] = [
            // No-op
            {
                schedule: backgroundJobNoOp.schedule,
                func: async () => {
                    await backgroundJobNoOp.createAsync(new Queue(backgroundJobNoOp.queueName, { connection }), {
                        timestamp: Date.now(),
                    });
                },
            },
            // Liquidity Montior
            {
                schedule: backgroundJobLiquidityMonitor.schedule,
                func: async () => {
                    await backgroundJobLiquidityMonitor.createAsync(
                        new Queue(backgroundJobLiquidityMonitor.queueName, { connection }),
                        {
                            timestamp: Date.now(),
                        },
                    );
                },
            },
            // Maker Balance Cache
            ...mbcJobs,
        ];

        const scheduler = new Scheduler(schedule);
        logger.info('Starting scheduler');
        scheduler.start();
        logger.info('Scheduler has been started');
    })();
}
