// tslint:disable:custom-no-magic-numbers
import { Job, Queue } from 'bullmq';
import { Counter } from 'prom-client';

import { CHAIN_CONFIGURATIONS } from '../config';
import { logger } from '../logger';
import { buildRfqMakerBalanceCacheServiceAsync } from '../utils/rfqm_service_builder';

import { BackgroundJobBlueprint } from './blueprint';

const QUEUE_NAME = 'maker-balance-cache-evict';
// keep successful job history for 1 day
const REMOVE_ON_COMPLETE_OPS = {
    count: 24 * 60 * 0.5,
};
// keep failed job history for 3 days
const REMOVE_ON_FAILURE_OPS = {
    count: 3 * 24 * 60 * 0.5,
};
const MAKER_BALANCE_CACHE_EVICT_SCHEDULE = '*/2 * * * *'; // job will be scheduled at every 2 minutes
const DESCRIPTION = 'Periodically evicts stale entries from maker balance cache.';

export interface BackgroundJobMBCEvictData {
    chainId: number;
    timestamp: number;
}

export interface BackgroundJobMBCEvictResult {
    chainId: number;
    jobName: string;
    numEvicted: number;
    timestamp: number;
}

const backgroundJobMBCEvict: BackgroundJobBlueprint<BackgroundJobMBCEvictData, BackgroundJobMBCEvictResult> = {
    queueName: QUEUE_NAME,
    schedule: MAKER_BALANCE_CACHE_EVICT_SCHEDULE,
    description: DESCRIPTION,
    createAsync,
    processAsync,
};
// tslint:disable-next-line: no-default-export
export default backgroundJobMBCEvict;

const MAKER_BALANCE_CACHE_EVICT_PROCESS_COUNT = new Counter({
    name: 'rfq_background_job_mbc_evict_process_total',
    help: 'Number of times the processor method of the maker balance cache evict background job is triggered',
});

/**
 * Creates a background job by queues a message that performs an eviction on the maker balance cache.
 *
 * @param queue Queue to push the message.
 * @param data Necessary data for processor to execute the background job.
 * @returns Promise of the background job.
 */
async function createAsync(
    queue: Queue,
    data: BackgroundJobMBCEvictData,
): Promise<Job<BackgroundJobMBCEvictData, BackgroundJobMBCEvictResult>> {
    logger.info({ queue: QUEUE_NAME, data }, 'Creating the maker balance cache background job on queue');
    return queue.add(`${QUEUE_NAME}.${data.timestamp}`, data, {
        removeOnComplete: REMOVE_ON_COMPLETE_OPS,
        removeOnFail: REMOVE_ON_FAILURE_OPS,
    });
}

/**
 * Processor method for the maker balance cache evict job. Evicts entries with zero balances from the cache.
 *
 * @param job Maker balance cache evict background job.
 * @returns Result of the evict background job.
 */
async function processAsync(
    job: Job<BackgroundJobMBCEvictData, BackgroundJobMBCEvictResult>,
): Promise<BackgroundJobMBCEvictResult> {
    await job.updateProgress(0);
    logger.info(
        { jobName: job.name, queue: job.queueName, data: job.data, timestamp: Date.now() },
        'Processing the maker balance cache evict background job on queue',
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
            'Failed to initialize dependencies for maker-balance-cache-evict',
        );
        throw new Error('Failed to initialize dependencies for maker-balance-cache-evict');
    }
    await job.updateProgress(50);

    // Perform eviction on maker balance cache entries
    let numEvicted;
    try {
        numEvicted = await rfqMakerBalanceCacheService.evictZeroBalancesAsync(chainId);
        MAKER_BALANCE_CACHE_EVICT_PROCESS_COUNT.inc();
    } catch (error) {
        logger.error(
            { jobName: job.name, queue: job.queueName, data: job.data, timestamp: Date.now() },
            'Failed to evict maker balance cache while running scheduled background job',
        );
        throw new Error('Failed to evict maker balance cache while running scheduled background job');
    }

    await job.updateProgress(100);
    return {
        chainId,
        jobName: job.name,
        numEvicted,
        timestamp: Date.now(),
    };
}
