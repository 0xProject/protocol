/**
 * This runner script creates the scheduler which schedules background jobs. Background jobs would be pushed to message queueus
 * according to defined schedules.
 */
import { Queue } from 'bullmq';
import Redis from 'ioredis';

import backgroundJobLiquidityMonitor from '../../background-jobs/liquidity_monitor';
import backgroundJobMBCEvict from '../../background-jobs/maker_balance_cache_evict';
import backgroundJobMBCUpdate from '../../background-jobs/maker_balance_cache_update';
import backgroundJobNoOp from '../../background-jobs/no_op';
import { CHAIN_CONFIGURATIONS, REDIS_BACKGROUND_JOB_URI } from '../../config';
import { logger } from '../../logger';
import { ScheduledBackgroundJob, Scheduler } from '../../scheduler';
import { buildMBCEvictJob, buildMBCUpdateJob } from '../../utils/background_job_builder';
import { closeRedisConnectionsAsync, startMetricsServer } from '../../utils/runner_utils';

const connections: Redis[] = [];

process.on('uncaughtException', (error) => {
    logger.error({ errorMessage: error.message, stack: error.stack }, 'uncaughtException in scheduler_runner');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    if (reason instanceof Error) {
        logger.error({ errorMessage: reason, stack: reason.stack, promise }, 'unhandledRejection in scheduler_runner');
    } else {
        logger.error('unhandledRejection in scheduler_runner');
    }
    process.exit(1);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Start to shutdown the scheduler and redis connections');
    await Scheduler.shutdownAsync();
    await closeRedisConnectionsAsync(connections);
    process.exit(0);
});

// Used for shutting down locally
process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Start to shutdown the scheduler and redis connections');
    await Scheduler.shutdownAsync();
    await closeRedisConnectionsAsync(connections);
    process.exit(0);
});

if (require.main === module) {
    // Promise rejections would be handled by the unhandledRejection handler
    (async () => {
        // Start the metrics server
        startMetricsServer();
        // Prepare Redis connections
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
