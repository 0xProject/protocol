import { expect } from '@0x/contracts-test-utils';

import { RfqmJobStatus, UnresolvedRfqmJobStatuses } from '../../src/entities/types';

describe('entity types', () => {
    describe('UnresolvedJobStatuses', () => {
        it('should not contain resolved statuses', () => {
            expect(UnresolvedRfqmJobStatuses).to.not.contain(RfqmJobStatus.SucceededConfirmed);
            expect(UnresolvedRfqmJobStatuses).to.not.contain(RfqmJobStatus.FailedLastLookDeclined);
        });
        it('should contain unresolved statuses', () => {
            expect(UnresolvedRfqmJobStatuses).to.contain(RfqmJobStatus.FailedRevertedUnconfirmed);
            expect(UnresolvedRfqmJobStatuses).to.contain(RfqmJobStatus.SucceededUnconfirmed);
            expect(UnresolvedRfqmJobStatuses).to.contain(RfqmJobStatus.PendingEnqueued);
        });
    });
});
