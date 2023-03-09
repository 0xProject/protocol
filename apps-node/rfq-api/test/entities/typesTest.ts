import { RfqmJobStatus, UnresolvedRfqmJobStatuses } from '../../src/entities/types';

describe('entity types', () => {
    describe('UnresolvedJobStatuses', () => {
        it('should not contain resolved statuses', () => {
            expect(UnresolvedRfqmJobStatuses).not.toContain(RfqmJobStatus.SucceededConfirmed);
            expect(UnresolvedRfqmJobStatuses).not.toContain(RfqmJobStatus.FailedLastLookDeclined);
        });
        it('should contain unresolved statuses', () => {
            expect(UnresolvedRfqmJobStatuses).toContain(RfqmJobStatus.FailedRevertedUnconfirmed);
            expect(UnresolvedRfqmJobStatuses).toContain(RfqmJobStatus.SucceededUnconfirmed);
            expect(UnresolvedRfqmJobStatuses).toContain(RfqmJobStatus.PendingEnqueued);
        });
    });
});
