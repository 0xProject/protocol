import { gracefulShutdown, scheduleJob } from 'node-schedule';

import { logger } from './logger';

export interface ScheduledBackgroundJob {
    schedule: string; // cron style string to indicate scheduling frequency
    func: () => Promise<void>; // function to be scheduled
}

export class Scheduler {
    /**
     * Shutdown the scheduler.
     */
    public static async shutdownAsync(): Promise<void> {
        try {
            await gracefulShutdown();
        } catch (error) {
            logger.error({ errorMessage: error.message, stack: error.stack }, 'Error shuting down job scheduler');
            throw error;
        }
    }
    constructor(private readonly jobs: ScheduledBackgroundJob[]) {}

    /**
     * Schedule all background jobs.
     */
    public start(): void {
        for (const job of this.jobs) {
            try {
                logger.info({ schedule: job.schedule }, 'Scheduling background job');
                // Schedule the job the invoke immediately
                scheduleJob(job.schedule, job.func).invoke();
            } catch (error) {
                logger.error(
                    { schedule: job.schedule, errorMessage: error.message, stack: error.stack },
                    'Error scheduling background job',
                );
                throw error;
            }
        }
    }
}
