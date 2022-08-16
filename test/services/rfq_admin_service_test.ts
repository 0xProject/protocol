// tslint:disable:custom-no-magic-numbers

import { OtcOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import { anything, deepEqual, instance, mock, verify, when } from 'ts-mockito';

import { ONE_SECOND_MS, ZERO } from '../../src/constants';
import { RfqmV2JobEntity } from '../../src/entities';
import { RfqmJobStatus } from '../../src/entities/types';
import { RfqAdminService } from '../../src/services/rfq_admin_service';
import { otcOrderToStoredOtcOrder, RfqmDbUtils } from '../../src/utils/rfqm_db_utils';

describe('RFQ Admin Service Logic', () => {
    describe('cleanupJobsAsync', () => {
        const expiry = new BigNumber(Date.now() - 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
        const otcOrder = new OtcOrder({
            txOrigin: '0x0000000000000000000000000000000000000000',
            taker: '0x1111111111111111111111111111111111111111',
            maker: '0x2222222222222222222222222222222222222222',
            makerToken: '0x3333333333333333333333333333333333333333',
            takerToken: '0x4444444444444444444444444444444444444444',
            expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
            chainId: 1337,
            verifyingContract: '0x0000000000000000000000000000000000000000',
        });
        const BASE_JOB = new RfqmV2JobEntity({
            chainId: 1337,
            expiry,
            makerUri: '',
            orderHash: '0x00',
            fee: {
                token: '0xToken',
                amount: '100',
                type: 'fixed',
            },
            order: otcOrderToStoredOtcOrder(otcOrder),
        });
        it('should clean up stuck jobs', async () => {
            const job = { ...BASE_JOB, status: RfqmJobStatus.PendingProcessing };
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
            when(dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            const adminService = new RfqAdminService(instance(dbUtilsMock));

            const res = await adminService.cleanupJobsAsync(['0x00']);

            expect(res.modifiedJobs[0]).to.equal(BASE_JOB.orderHash);
            verify(
                dbUtilsMock.updateRfqmJobAsync(deepEqual({ ...BASE_JOB, status: RfqmJobStatus.FailedExpired })),
            ).called();
        });
        it('should not modify unexpired jobs', async () => {
            const job = {
                ...BASE_JOB,
                status: RfqmJobStatus.PendingProcessing,
                expiry: new BigNumber(Date.now() + 60_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0),
            };
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
            when(dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            const adminService = new RfqAdminService(instance(dbUtilsMock));

            const res = await adminService.cleanupJobsAsync(['0x00']);

            expect(res.unmodifiedJobs[0]).to.equal(BASE_JOB.orderHash);
            verify(dbUtilsMock.updateRfqmJobAsync(anything())).never();
        });
        it('should not modify resolved jobs', async () => {
            const job = { ...BASE_JOB, status: RfqmJobStatus.FailedExpired };
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
            when(dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            const adminService = new RfqAdminService(instance(dbUtilsMock));

            const res = await adminService.cleanupJobsAsync(['0x00']);

            expect(res.unmodifiedJobs[0]).to.equal(BASE_JOB.orderHash);
            verify(dbUtilsMock.updateRfqmJobAsync(anything())).never();
        });
    });
});
