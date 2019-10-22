// tslint:disable custom-no-magic-numbers
import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import { Producer } from 'sqs-producer';
import { instance, mock, when } from 'ts-mockito';

import { ETH_DECIMALS } from '../../src/constants';
import { RfqmWorkerHeartbeatEntity } from '../../src/entities';
import {
    checkSqsQueueAsync,
    checkWorkerHeartbeatsAsync,
    getHttpIssues,
    HealthCheckStatus,
} from '../../src/utils/rfqm_health_check';

let producerMock: Producer;

const MS_IN_MINUTE = 60000;
const fullBalance = new BigNumber(1).shiftedBy(ETH_DECIMALS);

describe('RFQm Health Check', () => {
    describe('checkSqsQueueAsync', () => {
        beforeEach(() => {
            producerMock = mock(Producer);
        });

        describe('queue size check', () => {
            it('creates no issues if there are 10 or less jobs in the queue', async () => {
                when(producerMock.queueSize()).thenResolve(1);

                const issues = await checkSqsQueueAsync(instance(producerMock));

                expect(issues).to.have.length(0);
            });

            it('creates a DEGRADED issue if there are more than 5 messages in the queue', async () => {
                when(producerMock.queueSize()).thenResolve(11);

                const issues = await checkSqsQueueAsync(instance(producerMock));

                expect(issues).to.have.length(1);
                expect(issues[0].status).to.equal(HealthCheckStatus.Degraded);
            });

            it('creates a FAILED issue if there are more than 20 messages in the queue', async () => {
                when(producerMock.queueSize()).thenResolve(21);

                const issues = await checkSqsQueueAsync(instance(producerMock));

                expect(issues).to.have.length(1);
                expect(issues[0].status).to.equal(HealthCheckStatus.Failed);
            });
        });
    });

    describe('checkWorkerHeartbeatsAsync', () => {
        it('creates a failed issue when no heartbeats are found', async () => {
            const issues = await checkWorkerHeartbeatsAsync([]);

            expect(issues).to.have.length(1);
            expect(issues[0].status).to.equal(HealthCheckStatus.Failed);
        });

        describe('Heartbeat age', () => {
            it('creates a failed issue with no recent heartbeats', async () => {
                const now = new Date();
                const nowTime = now.getTime();
                const heartbeat = new RfqmWorkerHeartbeatEntity({
                    address: '0x00',
                    balance: fullBalance,
                    index: 0,
                    timestamp: new Date(nowTime - MS_IN_MINUTE * 6),
                });

                const issues = await checkWorkerHeartbeatsAsync([heartbeat], now);
                const failedIssues = issues.filter(({ status }) => status === HealthCheckStatus.Failed);

                expect(failedIssues).to.have.length(1);
            });

            it('creates degraded issues for stale heartbeats', async () => {
                const now = new Date();
                const nowTime = now.getTime();
                const heartbeat1 = new RfqmWorkerHeartbeatEntity({
                    address: '0x00',
                    balance: fullBalance,
                    index: 0,
                    timestamp: now,
                });
                const heartbeat2 = new RfqmWorkerHeartbeatEntity({
                    address: '0x01',
                    balance: fullBalance,
                    index: 1,
                    timestamp: new Date(nowTime - MS_IN_MINUTE * 8),
                });

                const issues = await checkWorkerHeartbeatsAsync([heartbeat1, heartbeat2], now);
                const failedIssues = issues.filter(({ status }) => status === HealthCheckStatus.Failed);
                expect(failedIssues).to.have.length(0);
                const degradedIssues = issues.filter(({ status }) => status === HealthCheckStatus.Degraded);
                expect(degradedIssues).to.have.length(1);
                expect(degradedIssues[0].description).to.contain('0x01');
            });
        });

        describe('Worker balance', () => {
            it('creates a failed issue when no worker has a balance above the failed threshold', async () => {
                const now = new Date();
                const heartbeat = new RfqmWorkerHeartbeatEntity({
                    address: '0x00',
                    balance: new BigNumber(0.01),
                    index: 0,
                    timestamp: now,
                });

                const issues = await checkWorkerHeartbeatsAsync([heartbeat], now);
                const failedIssues = issues.filter(({ status }) => status === HealthCheckStatus.Failed);

                expect(failedIssues).to.have.length(1);
            });

            it('creates degraded issues for low worker balances', async () => {
                const now = new Date();
                const heartbeat1 = new RfqmWorkerHeartbeatEntity({
                    address: '0x00',
                    balance: new BigNumber(0.01),
                    index: 0,
                    timestamp: now,
                });
                const heartbeat2 = new RfqmWorkerHeartbeatEntity({
                    address: '0x01',
                    balance: fullBalance,
                    index: 1,
                    timestamp: now,
                });

                const issues = await checkWorkerHeartbeatsAsync([heartbeat1, heartbeat2], now);
                const failedIssues = issues.filter(({ status }) => status === HealthCheckStatus.Failed);
                expect(failedIssues).to.have.length(0);

                const degradedIssues = issues.filter(({ status }) => status === HealthCheckStatus.Degraded);

                expect(degradedIssues).to.have.length(1);
                expect(degradedIssues[0].description).to.contain(
                    'Less than two workers have a balance above the degraded threshold',
                );
            });
        });
    });

    describe('getHttpIssues', () => {
        it('goes into maintainence mode', async () => {
            const issues = getHttpIssues(/* isMaintainenceMode */ true, /* registryBalance */ fullBalance);

            expect(issues[0].status).to.equal(HealthCheckStatus.Maintenance);
        });

        it('produces a FAILED issue with a low registry balance', async () => {
            const lowRegistryBalance = new BigNumber(0.01).shiftedBy(ETH_DECIMALS);

            const issues = getHttpIssues(/* isMaintainenceMode */ false, lowRegistryBalance);

            expect(issues[0].status).to.equal(HealthCheckStatus.Failed);
            expect(issues[0].description).to.contain(lowRegistryBalance.shiftedBy(ETH_DECIMALS * -1).toString());
        });
    });
});
