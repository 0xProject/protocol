import { BigNumber } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import 'mocha';
import { Connection } from 'typeorm';

import { ZERO } from '../src/constants';
import { getDBConnectionAsync } from '../src/db_connection';
import { RfqmJobEntity, RfqmQuoteEntity, RfqmTransactionSubmissionEntity } from '../src/entities';
import { RfqmV2TransactionSubmissionEntityConstructorOpts } from '../src/entities/RfqmV2TransactionSubmissionEntity';
import { RfqmJobStatus, RfqmTransactionSubmissionStatus } from '../src/entities/types';
import {
    feeToStoredFee,
    otcOrderToStoredOtcOrder,
    RfqmDbUtils,
    storedFeeToFee,
    storedOtcOrderToOtcOrder,
    v4RfqOrderToStoredOrder,
} from '../src/utils/rfqm_db_utils';

import { MATCHA_AFFILIATE_ADDRESS } from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './test_utils/deployment';

// Force reload of the app avoid variables being polluted between test suites
delete require.cache[require.resolve('../src/app')];

const SUITE_NAME = 'rfqm db test';

describe(SUITE_NAME, () => {
    let connection: Connection;
    let dbUtils: RfqmDbUtils;

    const createdAt = new Date();
    // it's expired if it's over 9000
    const expiry = new BigNumber(9000);
    const chainId = 1;
    const makerUri = 'https://marketmaking.over9000.io';
    const integratorId = 'an integrator';

    const metaTransactionHash = '0x5678';
    const calldata = '0xfillinganorder';
    const fee: Fee = {
        token: '0xatoken',
        amount: new BigNumber(5),
        type: 'fixed',
    };

    const order = new RfqOrder({
        txOrigin: '0x0000000000000000000000000000000000000000',
        taker: '0x1111111111111111111111111111111111111111',
        maker: '0x2222222222222222222222222222222222222222',
        makerToken: '0x3333333333333333333333333333333333333333',
        takerToken: '0x4444444444444444444444444444444444444444',
        expiry,
        salt: new BigNumber(1),
        chainId,
        verifyingContract: '0x0000000000000000000000000000000000000000',
        pool: '0x1',
    });

    const orderHash = order.getHash();

    const otcOrderNonce = new BigNumber(1637085289);
    const otcOrder = new OtcOrder({
        txOrigin: '0x0000000000000000000000000000000000000000',
        taker: '0x1111111111111111111111111111111111111111',
        maker: '0x2222222222222222222222222222222222222222',
        makerToken: '0x3333333333333333333333333333333333333333',
        takerToken: '0x4444444444444444444444444444444444444444',
        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, otcOrderNonce),
        chainId,
        verifyingContract: '0x0000000000000000000000000000000000000000',
    });

    const otcOrderHash = otcOrder.getHash();

    const takerSignature: Signature = {
        v: 27,
        r: '0xd00d00',
        s: '0xcaca',
        signatureType: 1,
    };

    // tx properties
    const transactionHash = '0x5678';
    const from = '0xanRfqmWorker';
    const to = '0xexchangeProxyAddress';
    const gasPrice = new BigNumber('100');
    const gasUsed = null;
    const blockMined = null;
    const nonce = 0;

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        connection = await getDBConnectionAsync();
        await connection.synchronize(true);
        dbUtils = new RfqmDbUtils(connection);
    });

    after(async () => {
        // reset DB
        connection = await getDBConnectionAsync();
        await connection.synchronize(true);
        await teardownDependenciesAsync(SUITE_NAME);
    });

    beforeEach(async () => {
        // reset DB
        connection = await getDBConnectionAsync();
        await connection.synchronize(true);
        dbUtils = new RfqmDbUtils(connection);
    });

    describe('rfqm db tests', () => {
        it("should use the database's timestamp", async () => {
            const testRfqmQuoteEntity = new RfqmQuoteEntity({
                orderHash,
                metaTransactionHash,
                integratorId,
                chainId,
                makerUri,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
            });

            const quoteRepository = connection.getRepository(RfqmQuoteEntity);
            await quoteRepository.save(testRfqmQuoteEntity);
            const dbEntity = await quoteRepository.findOne();

            const { createdAt: recordCreatedAt } = dbEntity!;
            expect(recordCreatedAt.getTime()).to.be.a('number');

            const timeDiff = Math.abs(Date.now() - recordCreatedAt.getTime());
            const tenMinutesMs = 10 * 60 * 1000; // tslint:disable-line custom-no-magic-numbers
            expect(timeDiff).to.be.lessThan(tenMinutesMs);
        });

        it('should be able to save and read an rfqm quote entity w/ no change in information', async () => {
            const testRfqmQuoteEntity = new RfqmQuoteEntity({
                orderHash,
                metaTransactionHash,
                createdAt,
                integratorId,
                chainId,
                makerUri,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
            });

            const quoteRepository = connection.getRepository(RfqmQuoteEntity);
            await quoteRepository.save(testRfqmQuoteEntity);
            const dbEntity = await quoteRepository.findOne();

            // the saved + read entity should match the original entity in information
            expect(dbEntity).to.deep.eq(testRfqmQuoteEntity);
        });
        it('should be able to save and read an rfqm job entity w/ no change in information', async () => {
            const rfqmJobOpts = {
                orderHash,
                metaTransactionHash,
                createdAt,
                expiry,
                chainId,
                integratorId,
                makerUri,
                status: RfqmJobStatus.PendingEnqueued,
                statusReason: null,
                calldata,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
            };

            const testRfqmJobEntity = new RfqmJobEntity(rfqmJobOpts);
            await dbUtils.writeRfqmJobToDbAsync(rfqmJobOpts);

            const dbEntity = await dbUtils.findJobByOrderHashAsync(orderHash);

            // the saved + read entity should match the original entity in information
            expect(dbEntity).to.deep.eq(testRfqmJobEntity);
        });

        it('should be able to update an rfqm job entity', async () => {
            const job = new RfqmJobEntity({
                orderHash,
                metaTransactionHash,
                createdAt,
                expiry,
                chainId,
                integratorId,
                makerUri,
                status: RfqmJobStatus.PendingEnqueued,
                calldata,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
            });
            await dbUtils.writeRfqmJobToDbAsync(job);

            const dbEntityFirstSnapshot = await dbUtils.findJobByOrderHashAsync(orderHash);
            await dbUtils.updateRfqmJobAsync({ ...job, isCompleted: false, status: RfqmJobStatus.PendingProcessing });

            const dbEntitySecondSnapshot = await dbUtils.findJobByOrderHashAsync(orderHash);

            // expect status to be updated
            expect(dbEntityFirstSnapshot?.status).to.eq(RfqmJobStatus.PendingEnqueued);
            expect(dbEntitySecondSnapshot?.status).to.eq(RfqmJobStatus.PendingProcessing);

            // spot check that other values have not changed
            expect(dbEntityFirstSnapshot?.calldata).to.eq(dbEntitySecondSnapshot?.calldata);
            expect(dbEntityFirstSnapshot?.expiry).to.deep.eq(dbEntitySecondSnapshot?.expiry);
        });
        it('should be able to save and read an rfqm tx submission entity w/ no change in information', async () => {
            // need a pre-existing job entity bc of foreign key
            const rfqmJobOpts = {
                orderHash,
                metaTransactionHash,
                createdAt,
                expiry,
                chainId,
                integratorId,
                makerUri,
                status: RfqmJobStatus.PendingEnqueued,
                statusReason: null,
                calldata,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
            };
            await dbUtils.writeRfqmJobToDbAsync(rfqmJobOpts);

            const rfqmTransactionSubmissionEntityOpts: Partial<RfqmTransactionSubmissionEntity> = {
                transactionHash,
                orderHash,
                createdAt,
                from,
                to,
                gasPrice,
                gasUsed,
                blockMined,
                nonce,
                status: RfqmTransactionSubmissionStatus.Submitted,
                statusReason: null,
            };
            const testEntity = new RfqmTransactionSubmissionEntity(rfqmTransactionSubmissionEntityOpts);
            await dbUtils.writeRfqmTransactionSubmissionToDbAsync(rfqmTransactionSubmissionEntityOpts);

            const dbEntity = await dbUtils.findRfqmTransactionSubmissionByTransactionHashAsync(transactionHash);

            // the saved + read entity should match the original entity in information
            expect(dbEntity).to.deep.eq(testEntity);
        });
        it('should be able to update a transaction submission entity', async () => {
            // need a pre-existing job entity bc of foreign key
            const rfqmJobOpts = {
                orderHash,
                metaTransactionHash,
                createdAt,
                expiry,
                chainId,
                integratorId,
                makerUri,
                status: RfqmJobStatus.PendingEnqueued,
                statusReason: null,
                calldata,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
            };
            await dbUtils.writeRfqmJobToDbAsync(rfqmJobOpts);

            const rfqmTransactionSubmissionEntityOpts: Partial<RfqmTransactionSubmissionEntity> = {
                transactionHash,
                orderHash,
                createdAt,
                from,
                to,
                gasPrice,
                gasUsed,
                blockMined,
                nonce,
                status: RfqmTransactionSubmissionStatus.Submitted,
                statusReason: null,
            };

            await dbUtils.writeRfqmTransactionSubmissionToDbAsync(rfqmTransactionSubmissionEntityOpts);

            const initialEntity = await dbUtils.findRfqmTransactionSubmissionByTransactionHashAsync(transactionHash);

            const updatedAt = new Date();
            const newBlockMined = new BigNumber(5);
            const newGasUsed = new BigNumber('165000');
            const newStatus = RfqmTransactionSubmissionStatus.SucceededUnconfirmed;

            initialEntity!.updatedAt = updatedAt;
            initialEntity!.blockMined = newBlockMined;
            initialEntity!.gasUsed = newGasUsed;
            initialEntity!.status = newStatus;

            await dbUtils.updateRfqmTransactionSubmissionsAsync([initialEntity!]);

            const updatedEntity = await dbUtils.findRfqmTransactionSubmissionByTransactionHashAsync(transactionHash);

            // the saved + read entity should match the original entity in information
            expect(updatedEntity?.updatedAt).to.deep.eq(updatedAt);
            expect(updatedEntity?.blockMined).to.deep.eq(newBlockMined);
            expect(updatedEntity?.gasUsed).to.deep.eq(newGasUsed);
            expect(updatedEntity?.status).to.deep.eq(newStatus);
            expect(updatedEntity?.createdAt).to.deep.eq(createdAt);
        });
        it('should find unresolved jobs', async () => {
            const workerAddress = '0x123';
            const unresolvedJob1 = {
                orderHash,
                metaTransactionHash,
                createdAt,
                expiry,
                chainId,
                integratorId,
                makerUri,
                status: RfqmJobStatus.PendingEnqueued,
                statusReason: null,
                calldata,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
                workerAddress,
                isCompleted: false,
            };
            const unresolvedJob2 = {
                orderHash: '0x1234',
                metaTransactionHash: '0x1234',
                createdAt,
                expiry,
                chainId,
                integratorId,
                makerUri,
                status: RfqmJobStatus.PendingSubmitted,
                statusReason: null,
                calldata,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(order),
                workerAddress,
                isCompleted: false,
            };
            await dbUtils.writeRfqmJobToDbAsync(unresolvedJob1);
            await dbUtils.writeRfqmJobToDbAsync(unresolvedJob2);

            const unresolvedJobs = await dbUtils.findUnresolvedJobsAsync(workerAddress);

            expect(unresolvedJobs.length).to.deep.eq(2);
            expect(unresolvedJobs[0].orderHash).to.deep.eq(orderHash);
            expect(unresolvedJobs[1].orderHash).to.deep.eq('0x1234');
        });
    });
    describe('v2 tables', () => {
        it('should be able to write to and read from the rfqm_v2_quote table', async () => {
            await dbUtils.writeV2QuoteAsync({
                chainId,
                makerUri,
                isUnwrap: false,
                order: otcOrderToStoredOtcOrder(otcOrder),
                orderHash: otcOrderHash,
                fee: feeToStoredFee(fee),
            });

            const storedQuote = await dbUtils.findV2QuoteByOrderHashAsync(otcOrderHash);
            expect(otcOrder).to.deep.eq(storedOtcOrderToOtcOrder(storedQuote?.order!));
            expect(fee).to.deep.eq(storedFeeToFee(storedQuote?.fee!));
        });

        it('should be able to write, update, and read the rfqm_v2_job table', async () => {
            // Write
            await dbUtils.writeV2JobAsync({
                chainId,
                status: RfqmJobStatus.PendingProcessing,
                expiry: otcOrder.expiry,
                makerUri,
                isUnwrap: false,
                order: otcOrderToStoredOtcOrder(otcOrder),
                takerSignature,
                orderHash: otcOrderHash,
                fee: feeToStoredFee(fee),
            });

            // First Read
            const storedJob = await dbUtils.findV2JobByOrderHashAsync(otcOrderHash);
            expect(storedOtcOrderToOtcOrder(storedJob?.order!)).to.deep.eq(otcOrder);
            expect(storedFeeToFee(storedJob?.fee!)).to.deep.eq(fee);
            expect(storedJob?.status).to.eq(RfqmJobStatus.PendingProcessing);
            expect(storedJob?.takerSignature).to.deep.eq(takerSignature);

            // Update
            await dbUtils.updateV2JobAsync(otcOrderHash, true, { status: RfqmJobStatus.SucceededConfirmed });

            // Second Read
            const updatedJob = await dbUtils.findV2JobByOrderHashAsync(otcOrderHash);
            expect(storedOtcOrderToOtcOrder(updatedJob?.order!)).to.deep.eq(otcOrder);
            expect(storedFeeToFee(updatedJob?.fee!)).to.deep.eq(fee);
            expect(updatedJob?.status).to.eq(RfqmJobStatus.SucceededConfirmed);
        });

        it('should be able to find by status across the rfqm_v2_job table', async () => {
            // Write job with failed status
            await dbUtils.writeV2JobAsync({
                chainId,
                status: RfqmJobStatus.FailedEthCallFailed,
                expiry: otcOrder.expiry,
                makerUri,
                isUnwrap: false,
                order: otcOrderToStoredOtcOrder(otcOrder),
                orderHash: otcOrderHash,
                fee: feeToStoredFee(fee),
            });

            // Get jobs with that status
            const storedJobs = await dbUtils.findV2JobsWithStatusesAsync([RfqmJobStatus.FailedEthCallFailed]);
            expect(storedJobs.length).to.eq(1);

            // Confirm correctness
            const storedJob = storedJobs[0];
            expect(storedOtcOrderToOtcOrder(storedJob?.order!)).to.deep.eq(otcOrder);
            expect(storedFeeToFee(storedJob?.fee!)).to.deep.eq(fee);
            expect(storedJob?.status).to.eq(RfqmJobStatus.FailedEthCallFailed);
        });

        it('should be able to write, update, and read the rfqm_v2_transaction_submission table', async () => {
            // Write
            const rfqmTransactionSubmissionEntityOpts: RfqmV2TransactionSubmissionEntityConstructorOpts = {
                transactionHash,
                orderHash: otcOrderHash,
                createdAt,
                from,
                to,
                gasPrice,
                gasUsed,
                blockMined,
                nonce,
                status: RfqmTransactionSubmissionStatus.Submitted,
            };
            await dbUtils.writeV2TransactionSubmissionAsync(rfqmTransactionSubmissionEntityOpts);

            // First Read
            const transactionSubmissions = await dbUtils.findV2TransactionSubmissionsByOrderHashAsync(otcOrderHash);
            expect(transactionSubmissions.length).to.eq(1);

            const transactionSubmission = transactionSubmissions[0];
            expect(transactionSubmission.transactionHash).to.eq(transactionHash);
            expect(transactionSubmission.status).to.eq(RfqmTransactionSubmissionStatus.Submitted);

            // Update
            await dbUtils.updateV2TransactionSubmissionsAsync([
                {
                    ...transactionSubmission,
                    status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
                },
            ]);

            // Second Read
            const updatedTransactionSubmissions = await dbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                otcOrderHash,
            );
            expect(updatedTransactionSubmissions.length).to.eq(1);

            const updatedTransactionSubmission = updatedTransactionSubmissions[0];
            expect(updatedTransactionSubmission.transactionHash).to.eq(transactionHash);
            expect(updatedTransactionSubmission.status).to.eq(RfqmTransactionSubmissionStatus.SucceededConfirmed);
        });
    });
});
// tslint:disable-line:max-file-line-count
