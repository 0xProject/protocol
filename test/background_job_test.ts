import { ChainId } from '@0x/contract-addresses';
import { Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { anything, instance, mock, spy, when } from 'ts-mockito';

import backgroundJobMBCEvict from '../src/background-jobs/maker_balance_cache_evict';
import backgroundJobMBCUpdate from '../src/background-jobs/maker_balance_cache_update';
import { CHAIN_CONFIGURATIONS } from '../src/config';
import { RfqMakerBalanceCacheService } from '../src/services/rfq_maker_balance_cache_service';
import * as serviceBuilder from '../src/utils/rfqm_service_builder';

describe('Background Jobs Unit Tests', () => {
    describe('maker-balance-cache-evict', () => {
        it('should fail to create background job when bad chain id is passed', async () => {
            const spiedChainConfigurations = spy(CHAIN_CONFIGURATIONS);
            when(spiedChainConfigurations.find(anything())).thenReturn(undefined);

            const { createAsync, processAsync } = backgroundJobMBCEvict;

            const connectionMock = mock(Redis);

            const queue = new Queue(backgroundJobMBCEvict.queueName, { connection: instance(connectionMock) });
            const spiedQueue = spy(queue);
            when(spiedQueue.emit(anything())).thenReturn(true);

            const spiedJob = spy(Job);
            when(spiedJob.create(anything(), anything(), anything(), anything())).thenCall(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (q: Queue, name: any, data: any) => new Job(q, name, data),
            );

            const badChainId = 11111111;
            const timestamp = Date.now();

            const job = await createAsync(queue, {
                chainId: badChainId,
                timestamp,
            });
            expect(job.queueName).toEqual(backgroundJobMBCEvict.queueName);

            const spiedJobInstance = spy(job);
            when(spiedJobInstance.updateProgress(anything())).thenResolve();

            expect(processAsync(job)).rejects.toThrow('chain configuration');
        });

        it('processes maker balance cache eviction without error', async () => {
            const spiedChainConfigurations = spy(CHAIN_CONFIGURATIONS);
            when(spiedChainConfigurations.find(anything())).thenReturn(anything());

            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.evictZeroBalancesAsync(anything())).thenResolve(1);

            const spiedServiceBuilderAsync = spy(serviceBuilder);
            when(spiedServiceBuilderAsync.buildRfqMakerBalanceCacheServiceAsync(anything())).thenResolve(
                instance(rfqMakerBalanceCacheServiceMock),
            );
            const { createAsync, processAsync } = backgroundJobMBCEvict;

            const connectionMock = mock(Redis);

            const queue = new Queue(backgroundJobMBCEvict.queueName, { connection: instance(connectionMock) });
            const spiedQueue = spy(queue);
            when(spiedQueue.emit(anything())).thenReturn(true);

            const spiedJob = spy(Job);
            when(spiedJob.create(anything(), anything(), anything(), anything())).thenCall(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (q: Queue, name: any, data: any) => new Job(q, name, data),
            );

            const chainId = ChainId.Ganache;
            const timestamp = Date.now();

            const job = await createAsync(queue, {
                chainId,
                timestamp,
            });
            expect(job.queueName).toEqual(backgroundJobMBCEvict.queueName);

            const spiedJobInstance = spy(job);
            when(spiedJobInstance.updateProgress(anything())).thenResolve();

            const result = await processAsync(job);
            expect(result.chainId).toEqual(chainId);
            expect(result.numEvicted).toEqual(1);
        });

        it('should fail to process job when malformed cache service is passed', async () => {
            const spiedChainConfigurations = spy(CHAIN_CONFIGURATIONS);
            when(spiedChainConfigurations.find(anything())).thenReturn(anything());

            const spiedServiceBuilderAsync = spy(serviceBuilder);
            when(spiedServiceBuilderAsync.buildRfqMakerBalanceCacheServiceAsync(anything())).thenResolve();
            const { createAsync, processAsync } = backgroundJobMBCEvict;

            const connectionMock = mock(Redis);

            const queue = new Queue(backgroundJobMBCEvict.queueName, { connection: instance(connectionMock) });
            const spiedQueue = spy(queue);
            when(spiedQueue.emit(anything())).thenReturn(true);

            const spiedJob = spy(Job);
            when(spiedJob.create(anything(), anything(), anything(), anything())).thenCall(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (q: Queue, name: any, data: any) => new Job(q, name, data),
            );

            const chainId = ChainId.Ganache;
            const timestamp = Date.now();

            const job = await createAsync(queue, {
                chainId,
                timestamp,
            });
            expect(job.queueName).toEqual(backgroundJobMBCEvict.queueName);

            const spiedJobInstance = spy(job);
            when(spiedJobInstance.updateProgress(anything())).thenResolve();

            expect(processAsync(job)).rejects.toThrow('initialize dependencies');
        });

        it('should fail to process job when the cache service fails to evict entries', async () => {
            const spiedChainConfigurations = spy(CHAIN_CONFIGURATIONS);
            when(spiedChainConfigurations.find(anything())).thenReturn(anything());

            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.evictZeroBalancesAsync(anything())).thenReject(
                new Error('cache failed'),
            );

            const spiedServiceBuilderAsync = spy(serviceBuilder);
            when(spiedServiceBuilderAsync.buildRfqMakerBalanceCacheServiceAsync(anything())).thenResolve(
                instance(rfqMakerBalanceCacheServiceMock),
            );
            const { createAsync, processAsync } = backgroundJobMBCEvict;

            const connectionMock = mock(Redis);

            const queue = new Queue(backgroundJobMBCEvict.queueName, { connection: instance(connectionMock) });
            const spiedQueue = spy(queue);
            when(spiedQueue.emit(anything())).thenReturn(true);

            const spiedJob = spy(Job);
            when(spiedJob.create(anything(), anything(), anything(), anything())).thenCall(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (q: Queue, name: any, data: any) => new Job(q, name, data),
            );

            const chainId = ChainId.Ganache;
            const timestamp = Date.now();

            const job = await createAsync(queue, {
                chainId,
                timestamp,
            });
            expect(job.queueName).toEqual(backgroundJobMBCEvict.queueName);

            const spiedJobInstance = spy(job);
            when(spiedJobInstance.updateProgress(anything())).thenResolve();

            expect(processAsync(job)).rejects.toThrow('evict maker balance cache');
        });
    });

    describe('maker-balance-cache-update', () => {
        it('should fail to create background job when bad chain id is passed', async () => {
            const spiedChainConfigurations = spy(CHAIN_CONFIGURATIONS);
            when(spiedChainConfigurations.find(anything())).thenReturn(undefined);

            const { createAsync, processAsync } = backgroundJobMBCUpdate;

            const connectionMock = mock(Redis);

            const queue = new Queue(backgroundJobMBCUpdate.queueName, { connection: instance(connectionMock) });
            const spiedQueue = spy(queue);
            when(spiedQueue.emit(anything())).thenReturn(true);

            const spiedJob = spy(Job);
            when(spiedJob.create(anything(), anything(), anything(), anything())).thenCall(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (q: Queue, name: any, data: any) => new Job(q, name, data),
            );

            const badChainId = 11111111;
            const timestamp = Date.now();

            const job = await createAsync(queue, {
                chainId: badChainId,
                timestamp,
            });
            expect(job.queueName).toEqual(backgroundJobMBCUpdate.queueName);

            const spiedJobInstance = spy(job);
            when(spiedJobInstance.updateProgress(anything())).thenResolve();

            expect(processAsync(job)).rejects.toThrow('chain configuration');
        });

        it('processes maker balance cache update without error', async () => {
            const spiedChainConfigurations = spy(CHAIN_CONFIGURATIONS);
            when(spiedChainConfigurations.find(anything())).thenReturn(anything());

            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.updateERC20OwnerBalancesAsync(anything())).thenResolve();

            const spiedServiceBuilderAsync = spy(serviceBuilder);
            when(spiedServiceBuilderAsync.buildRfqMakerBalanceCacheServiceAsync(anything())).thenResolve(
                instance(rfqMakerBalanceCacheServiceMock),
            );
            const { createAsync, processAsync } = backgroundJobMBCUpdate;

            const connectionMock = mock(Redis);

            const queue = new Queue(backgroundJobMBCUpdate.queueName, { connection: instance(connectionMock) });
            const spiedQueue = spy(queue);
            when(spiedQueue.emit(anything())).thenReturn(true);

            const spiedJob = spy(Job);
            when(spiedJob.create(anything(), anything(), anything(), anything())).thenCall(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (q: Queue, name: any, data: any) => new Job(q, name, data),
            );

            const chainId = ChainId.Ganache;
            const timestamp = Date.now();

            const job = await createAsync(queue, {
                chainId,
                timestamp,
            });
            expect(job.queueName).toEqual(backgroundJobMBCUpdate.queueName);

            const spiedJobInstance = spy(job);
            when(spiedJobInstance.updateProgress(anything())).thenResolve();

            const result = await processAsync(job);
            expect(result.chainId).toEqual(chainId);
        });

        it('should fail to process job when the cache service fails to update entries', async () => {
            const spiedChainConfigurations = spy(CHAIN_CONFIGURATIONS);
            when(spiedChainConfigurations.find(anything())).thenReturn(anything());

            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.updateERC20OwnerBalancesAsync(anything())).thenReject(
                new Error('cache failed'),
            );

            const spiedServiceBuilderAsync = spy(serviceBuilder);
            when(spiedServiceBuilderAsync.buildRfqMakerBalanceCacheServiceAsync(anything())).thenResolve(
                instance(rfqMakerBalanceCacheServiceMock),
            );
            const { createAsync, processAsync } = backgroundJobMBCUpdate;

            const connectionMock = mock(Redis);

            const queue = new Queue(backgroundJobMBCUpdate.queueName, { connection: instance(connectionMock) });
            const spiedQueue = spy(queue);
            when(spiedQueue.emit(anything())).thenReturn(true);

            const spiedJob = spy(Job);
            when(spiedJob.create(anything(), anything(), anything(), anything())).thenCall(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (q: Queue, name: any, data: any) => new Job(q, name, data),
            );

            const chainId = ChainId.Ganache;
            const timestamp = Date.now();

            const job = await createAsync(queue, {
                chainId,
                timestamp,
            });
            expect(job.queueName).toEqual(backgroundJobMBCUpdate.queueName);

            const spiedJobInstance = spy(job);
            when(spiedJobInstance.updateProgress(anything())).thenResolve();

            expect(processAsync(job)).rejects.toThrow('update maker balance cache');
        });
    });
});
