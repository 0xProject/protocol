import { Job, Queue } from 'bullmq';
import { Counter } from 'prom-client';

import { ONE_SECOND_MS } from '../core/constants';
import { logger } from '../logger';

import { BackgroundJobBlueprint } from './blueprint';

const QUEUE_NAME = 'no-op';
const REMOVE_ON_COMPLETE_OPS = {
    count: 100,
};
const REMOVE_ON_FAILURE_OPS = {
    count: 100,
};
const NO_OP_SCHEDULE = '*/5 * * * *'; // job will be scheduled at every 5 minutes
const DESCRIPTION = 'A no-op background job that would sleep and increase the counter. This job is used for testing';

export interface BackgroundJobNoOpData {
    timestamp: number;
}

export interface BackgroundJobNoOpResult {
    jobName: string;
    timestamp: number;
}

const backgroundJobNoOp: BackgroundJobBlueprint<BackgroundJobNoOpData, BackgroundJobNoOpResult> = {
    queueName: QUEUE_NAME,
    schedule: NO_OP_SCHEDULE,
    description: DESCRIPTION,
    createAsync,
    processAsync,
};
export default backgroundJobNoOp;

const NO_OP_PROCESS_COUNT = new Counter({
    name: 'rfq_background_job_no_op_process_total',
    help: 'Number of times the processor method of the no-op background job is triggered',
});

/**
 * Create a no-op background job by pushing a message to the correponding queue with associated data.
 *
 * @param queue Queue to push the message.
 * @param data Necessary data for processor to execute the no-op background job.
 * @returns Promise of the no-op background job.
 */
async function createAsync(
    queue: Queue,
    data: BackgroundJobNoOpData,
): Promise<Job<BackgroundJobNoOpData, BackgroundJobNoOpResult>> {
    logger.info({ queue: QUEUE_NAME, data }, 'Creating the no-op background job on queue');
    return queue.add(`${QUEUE_NAME}.${data.timestamp}`, data, {
        removeOnComplete: REMOVE_ON_COMPLETE_OPS,
        removeOnFail: REMOVE_ON_FAILURE_OPS,
    });
}

/**
 * Processor method for the no-op background job. Print log, sleep and increase the counter.
 *
 * @param job The no-op background job to process.
 * @returns Result of the no-op background job.
 */
async function processAsync(
    job: Job<BackgroundJobNoOpData, BackgroundJobNoOpResult>,
): Promise<BackgroundJobNoOpResult> {
    await job.updateProgress(0);
    logger.info(
        { jobName: job.name, queue: job.queueName, data: job.data, timestamp: Date.now() },
        'Processing the no-op background job on queue',
    );
    // sleep for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, ONE_SECOND_MS * 5));
    await job.updateProgress(50);
    // sleep for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, ONE_SECOND_MS * 5));
    NO_OP_PROCESS_COUNT.inc();
    await job.updateProgress(100);
    return {
        jobName: job.name,
        timestamp: Date.now(),
    };
}
