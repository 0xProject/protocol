// tslint:disable:custom-no-magic-numbers
import { Job, Queue } from 'bullmq';
import { Counter } from 'prom-client';

import { CHAIN_CONFIGURATIONS } from '../config';
import { logger } from '../logger';
import { buildRfqMakerBalanceCacheServiceAsync } from '../utils/rfqm_service_builder';

import { BackgroundJobBlueprint } from './blueprint';

const QUEUE_NAME = 'maker-balance-cache-update';
// keep successful job history for 1 day
const REMOVE_ON_COMPLETE_OPS = {
    count: 24 * 60 * 6,
};
// keep failed job history for 3 days
const REMOVE_ON_FAILURE_OPS = {
    count: 3 * 24 * 60 * 6,
};
const MAKER_BALANCE_CACHE_UPDATE_SCHEDULE = '*/10 * * * * *'; // job will be scheduled at every 10 seconds
const DESCRIPTION = 'Periodically updates observed entries in maker balance cache through balance checks.';

export interface BackgroundJobMBCUpdateData {
    chainId: number;
    timestamp: number;
}

export interface BackgroundJobMBCUpdateResult {
    chainId: number;
    jobName: string;
    timestamp: number;
}

const backgroundJobMBCUpdate: BackgroundJobBlueprint<BackgroundJobMBCUpdateData, BackgroundJobMBCUpdateResult> = {
    queueName: QUEUE_NAME,
    schedule: MAKER_BALANCE_CACHE_UPDATE_SCHEDULE,
    description: DESCRIPTION,
    createAsync,
    processAsync,
};
// tslint:disable-next-line: no-default-export
export default backgroundJobMBCUpdate;

const MAKER_BALANCE_CACHE_UPDATE_PROCESS_COUNT = new Counter({
    name: 'rfq_background_job_mbc_update_process_total',
    help: 'Number of times the processor method of the maker balance cache update background job is triggered',
});

/**
 * Creates a background job by queues a message that performs an update on the maker balance cache.
 *
 * @param queue Queue to push the message.
 * @param data Necessary data for processor to execute the background job.
 * @returns Promise of the background job.
 */
async function createAsync(
    queue: Queue,
    data: Partial<BackgroundJobMBCUpdateData>,
): Promise<Job<BackgroundJobMBCUpdateData, BackgroundJobMBCUpdateResult>> {
    logger.info({ queue: QUEUE_NAME, data }, 'Creating the maker balance cache background job on queue');
    return queue.add(`${QUEUE_NAME}.${data.timestamp}`, data, {
        removeOnComplete: REMOVE_ON_COMPLETE_OPS,
        removeOnFail: REMOVE_ON_FAILURE_OPS,
    });
}

/**
 * Processor method for the maker balance cache update job. Runs a cache update,
 * performing balance checks on observed maker balances.
 *
 * @param job Maker balance cache update background job.
 * @returns Result of the update background job.
 */
async function processAsync(
    job: Job<BackgroundJobMBCUpdateData, BackgroundJobMBCUpdateResult>,
): Promise<BackgroundJobMBCUpdateResult> {
    await job.updateProgress(0);
    logger.info(
        { jobName: job.name, queue: job.queueName, data: job.data, timestamp: Date.now() },
        'Processing the maker balance cache update background job on queue',
    );

    const chainId = job.data.chainId;

    // Build dependencies
    const chain = CHAIN_CONFIGURATIONS.find((c) => c.chainId === chainId);
    if (!chain) {
        throw new Error(`Tried to start background job process for chain ${chainId}
        but no chain configuration was present`);
    }
    const rfqMakerBalanceCacheService = await buildRfqMakerBalanceCacheServiceAsync(chain);

    if (!rfqMakerBalanceCacheService) {
        logger.error(
            { jobName: job.name, queue: job.queueName, data: job.data, timestamp: Date.now() },
            'Failed to initialize dependencies for maker-balance-cache-update',
        );
        throw new Error('Failed to initialize dependencies for maker-balance-cache-update');
    }
    await job.updateProgress(50);

    // Perform update on maker balance cache
    try {
        await rfqMakerBalanceCacheService.updateERC20OwnerBalancesAsync(chainId);
        MAKER_BALANCE_CACHE_UPDATE_PROCESS_COUNT.inc();
    } catch (error) {
        logger.error(
            { jobName: job.name, queue: job.queueName, data: job.data, timestamp: Date.now() },
            'Failed to update maker balance cache while running scheduled background job',
        );
        throw new Error('Failed to update maker balance cache while running scheduled background job');
    }

    await job.updateProgress(100);
    return {
        chainId,
        jobName: job.name,
        timestamp: Date.now(),
    };
}
