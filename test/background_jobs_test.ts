// tslint:disable:custom-no-magic-numbers
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

import backgroundJobNoOp from '../src/background-jobs/no_op';
import { REDIS_BACKGROUND_JOB_URI } from '../src/config';
import { ONE_SECOND_MS } from '../src/constants';
import { ScheduledBackgroundJob, Scheduler } from '../src/scheduler';
import { closeRedisConnectionsAsync, closeWorkersAsync } from '../src/utils/background_job_runner_utils';

import { setupDependenciesAsync, TeardownDependenciesFunctionHandle } from './test_utils/deployment';

jest.setTimeout(ONE_SECOND_MS * 60);
let teardownDependencies: TeardownDependenciesFunctionHandle;
let redisConnections: Redis[] = [];
let workers: Worker[] = [];
let scheduler: Scheduler;

describe('Background jobs integration tests', () => {
    beforeEach(async () => {
        teardownDependencies = await setupDependenciesAsync(['redis']);
    });

    afterEach(async () => {
        const connection = new Redis(REDIS_BACKGROUND_JOB_URI!);
        const keys = await connection.keys('bull:*');
        if (keys.length) {
            await connection.del(keys);
        }
        await closeWorkersAsync(workers);
        await closeRedisConnectionsAsync(redisConnections);
        redisConnections = [];
        workers = [];
        await Scheduler.shutdownAsync();
        if (!teardownDependencies()) {
            throw new Error('Failed to tear down dependencies');
        }
    });

    describe('no-op job', () => {
        it('no-op job should be scheduled and processed', async () => {
            const connection = new Redis(REDIS_BACKGROUND_JOB_URI!, {
                maxRetriesPerRequest: null,
                enableReadyCheck: false,
            });
            // clean up keys related to bullmq
            const keys = await connection.keys('bull:*');
            if (keys.length) {
                await connection.del(keys);
            }

            const noOpBackgroundJobQueue = new Queue(backgroundJobNoOp.queueName, { connection });

            const schedule: ScheduledBackgroundJob[] = [
                {
                    schedule: backgroundJobNoOp.schedule,
                    func: async () => {
                        await backgroundJobNoOp.createAsync(noOpBackgroundJobQueue, { timestamp: Date.now() });
                    },
                },
            ];

            scheduler = new Scheduler(schedule);
            scheduler.start();
            const { queueName, processAsync } = backgroundJobNoOp;
            const worker = new Worker(queueName, processAsync, { connection });

            redisConnections = [connection];
            workers = [worker];

            await new Promise((resolve) => setTimeout(resolve, ONE_SECOND_MS * 15));
            expect(await noOpBackgroundJobQueue.getCompletedCount()).toEqual(1);
        });
    });
});
