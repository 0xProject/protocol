import { Job, Queue } from 'bullmq';

/**
 * The blueprint of a background job consists of the name of the queue the job should be pushed, the job schedule, short description of the job,
 * the job creation method and the processor method (execution). `BackgroundJobData` is the data associated with the job to inform the processor method
 * on how to perform execution. `BackgroundJobResult` is the value the processor method returns.
 */
export interface BackgroundJobBlueprint<BackgroundJobData, BackgroundJobResult> {
    queueName: string; // the name of the queue that the job should be pushed
    schedule: string; // cron style string
    description: string; // short description of the job
    createAsync: (queue: Queue, data: BackgroundJobData) => Promise<Job<BackgroundJobData, BackgroundJobResult>>; // the job creation method
    processAsync: (job: Job<BackgroundJobData, BackgroundJobResult>) => Promise<BackgroundJobResult>; // the processor method
}
