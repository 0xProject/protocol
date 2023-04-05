import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

import backgroundJobNoOp from '../src/background-jobs/no_op';
import { ONE_SECOND_MS } from '../src/core/constants';
import { ScheduledBackgroundJob, Scheduler } from '../src/scheduler';
import { closeRedisConnectionsAsync, closeWorkersAsync } from '../src/utils/runner_utils';
import { REDIS_PORT } from './constants';

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
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const connection = new Redis(REDIS_PORT);
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
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const connection = new Redis(REDIS_PORT, {
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
