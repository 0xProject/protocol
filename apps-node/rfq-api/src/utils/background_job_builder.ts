import { Queue } from 'bullmq';

import backgroundJobMBCEvict from '../background-jobs/maker_balance_cache_evict';
import backgroundJobMBCUpdate from '../background-jobs/maker_balance_cache_update';
import { ScheduledBackgroundJob } from '../scheduler';

export const buildMBCUpdateJob = (queue: Queue, chainId: number, now: number = Date.now()): ScheduledBackgroundJob => {
    return {
        schedule: backgroundJobMBCUpdate.schedule,
        func: async () => {
            await backgroundJobMBCUpdate.createAsync(queue, {
                chainId,
                timestamp: now,
            });
        },
    };
};

export const buildMBCEvictJob = (queue: Queue, chainId: number, now: number = Date.now()): ScheduledBackgroundJob => {
    return {
        schedule: backgroundJobMBCEvict.schedule,
        func: async () => {
            await backgroundJobMBCEvict.createAsync(queue, {
                chainId,
                timestamp: now,
            });
        },
    };
};
