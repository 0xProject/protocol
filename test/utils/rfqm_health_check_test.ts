// tslint:disable custom-no-magic-numbers
import { expect } from '@0x/contracts-test-utils';
import { Producer } from 'sqs-producer';
import { instance, mock, when } from 'ts-mockito';

import { checkSqsQueueAsync, HealthCheckStatus } from '../../src/utils/rfqm_health_check';

let producerMock: Producer;

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
});
