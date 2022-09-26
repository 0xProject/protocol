import { MetaTransaction, MetaTransactionFields, OtcOrder, Signature } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import { DataSource } from 'typeorm';
import * as uuid from 'uuid';

import { EXECUTE_META_TRANSACTION_EIP_712_TYPES, ONE_MINUTE_MS, ZERO } from '../src/constants';
import { MetaTransactionSubmissionEntityConstructorOpts } from '../src/entities/MetaTransactionSubmissionEntity';
import { RfqmV2TransactionSubmissionEntityConstructorOpts } from '../src/entities/RfqmV2TransactionSubmissionEntity';
import { RfqmJobStatus, RfqmTransactionSubmissionStatus, RfqmTransactionSubmissionType } from '../src/entities/types';
import { ExecuteMetaTransactionApproval, GaslessApprovalTypes } from '../src/types';
import {
    feeToStoredFee,
    otcOrderToStoredOtcOrder,
    RfqmDbUtils,
    storedFeeToFee,
    storedOtcOrderToOtcOrder,
} from '../src/utils/rfqm_db_utils';

import { MOCK_FEE, MOCK_META_TRANSACTION } from './constants';
import { setupDependenciesAsync, TeardownDependenciesFunctionHandle } from './test_utils/deployment';
import { initDbDataSourceAsync } from './test_utils/initDbDataSourceAsync';

let dbUtils: RfqmDbUtils;

const createdAt = new Date();
// it's expired if it's over 9000
const expiry = new BigNumber(9000);
const chainId = 1;
const makerUri = 'https://marketmaking.over9000.io';
const fee: Fee = {
    token: '0xatoken',
    amount: new BigNumber(5),
    type: 'fixed',
};

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

const approval: ExecuteMetaTransactionApproval = {
    kind: GaslessApprovalTypes.ExecuteMetaTransaction,
    eip712: {
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'verifyingContract', type: 'address' },
                { name: 'salt', type: 'bytes32' },
            ],
            ...EXECUTE_META_TRANSACTION_EIP_712_TYPES,
        },
        primaryType: 'MetaTransaction',
        domain: {
            name: 'Balancer (PoS)',
            version: '1',
            verifyingContract: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
            salt: '0x0000000000000000000000000000000000000000000000000000000000000089',
        },
        message: {
            nonce: 1,
            from: '0x1111111111111111111111111111111111111111',
            functionSignature:
                '0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        },
    },
};

// tx properties
const transactionHash = '0x5678';
const from = '0xanRfqmWorker';
const to = '0xexchangeProxyAddress';
const gasPrice = new BigNumber('100');
const gasUsed = null;
const blockMined = null;
const nonce = 0;

// meta-transaction
const inputToken = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const outputToken = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const inputTokenAmount = new BigNumber(100);
const minOutputTokenAmount = new BigNumber(99);

function creatMockMetaTransaction(opts: Partial<MetaTransactionFields> = {}): MetaTransaction {
    return new MetaTransaction({
        ...MOCK_META_TRANSACTION,
        ...opts,
    });
}

// tslint:disable-next-line: custom-no-magic-numbers
jest.setTimeout(ONE_MINUTE_MS * 3);
let teardownDependencies: TeardownDependenciesFunctionHandle;
let dataSource: DataSource;

describe('RFQM Database', () => {
    beforeAll(async () => {
        teardownDependencies = await setupDependenciesAsync(['postgres']);
        dataSource = await initDbDataSourceAsync();
        dbUtils = new RfqmDbUtils(dataSource);
    });

    afterAll(async () => {
        if (!teardownDependencies()) {
            throw new Error('Failed to tear down dependencies');
        }
    });

    afterEach(async () => {
        await dataSource.query('TRUNCATE TABLE rfqm_quotes CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_jobs CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_transaction_submissions CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_quotes CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_jobs CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_transaction_submissions CASCADE;');
        await dataSource.query('TRUNCATE TABLE meta_transaction_submissions CASCADE;');
        await dataSource.query('TRUNCATE TABLE meta_transaction_jobs CASCADE;');
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
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-non-null-asserted-optional-chain
            expect(otcOrder).to.deep.eq(storedOtcOrderToOtcOrder(storedQuote?.order!));
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-non-null-asserted-optional-chain
            expect(fee).to.deep.eq(storedFeeToFee(storedQuote?.fee!));
        });

        it('should be able to write, update, and read the rfqm_v2_job table', async () => {
            // Write
            await dbUtils.writeV2JobAsync({
                approval,
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
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-non-null-asserted-optional-chain
            expect(storedOtcOrderToOtcOrder(storedJob?.order!)).to.deep.eq(otcOrder);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-non-null-asserted-optional-chain
            expect(storedFeeToFee(storedJob?.fee!)).to.deep.eq(fee);
            expect(storedJob?.status).to.equal(RfqmJobStatus.PendingProcessing);
            expect(storedJob?.takerSignature).to.deep.eq(takerSignature);
            expect(storedJob?.approval).to.deep.eq(approval);

            // Update
            await dbUtils.updateV2JobAsync(otcOrderHash, true, { status: RfqmJobStatus.SucceededConfirmed });

            // Second Read
            const updatedJob = await dbUtils.findV2JobByOrderHashAsync(otcOrderHash);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-non-null-asserted-optional-chain
            expect(storedOtcOrderToOtcOrder(updatedJob?.order!)).to.deep.eq(otcOrder);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-non-null-asserted-optional-chain
            expect(storedFeeToFee(updatedJob?.fee!)).to.deep.eq(fee);
            expect(updatedJob?.status).to.equal(RfqmJobStatus.SucceededConfirmed);
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
            expect(storedJobs.length).to.equal(1);

            // Confirm correctness
            const storedJob = storedJobs[0];
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-non-null-asserted-optional-chain
            expect(storedOtcOrderToOtcOrder(storedJob?.order!)).to.deep.eq(otcOrder);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-non-null-asserted-optional-chain
            expect(storedFeeToFee(storedJob?.fee!)).to.deep.eq(fee);
            expect(storedJob?.status).to.equal(RfqmJobStatus.FailedEthCallFailed);
        });

        it('should be able to write to and read from the last_look_rejection_cooldowns table', async () => {
            const makerId = 'makerId1';
            const nowMs = Date.now();
            const startTime = new Date(nowMs);
            const endTime = new Date(nowMs + ONE_MINUTE_MS);
            await dbUtils.writeV2LastLookRejectionCooldownAsync(
                makerId,
                chainId,
                otcOrder.makerToken,
                otcOrder.takerToken,
                startTime,
                endTime,
                otcOrderHash,
            );

            const storedCooldown = await dbUtils.findV2LastLookRejectionCooldownAsync(
                makerId,
                chainId,
                otcOrder.makerToken,
                otcOrder.takerToken,
                startTime,
            );
            expect(storedCooldown?.endTime).to.deep.eq(endTime);
            expect(storedCooldown?.orderHash).to.deep.eq(otcOrderHash);
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
                type: RfqmTransactionSubmissionType.Trade,
            };
            await dbUtils.writeV2TransactionSubmissionAsync(rfqmTransactionSubmissionEntityOpts);

            // First Read
            const transactionSubmissions = await dbUtils.findV2TransactionSubmissionsByOrderHashAsync(otcOrderHash);
            expect(transactionSubmissions.length).to.equal(1);

            const transactionSubmission = transactionSubmissions[0];
            expect(transactionSubmission.transactionHash).to.equal(transactionHash);
            expect(transactionSubmission.status).to.equal(RfqmTransactionSubmissionStatus.Submitted);

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
            expect(updatedTransactionSubmissions.length).to.equal(1);

            const updatedTransactionSubmission = updatedTransactionSubmissions[0];
            expect(updatedTransactionSubmission.transactionHash).to.equal(transactionHash);
            expect(updatedTransactionSubmission.status).to.equal(RfqmTransactionSubmissionStatus.SucceededConfirmed);
        });

        it('should not run into duplicate key issues if attempting to write to the same hash', async () => {
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
                type: RfqmTransactionSubmissionType.Trade,
            };
            await dbUtils.writeV2TransactionSubmissionAsync(rfqmTransactionSubmissionEntityOpts);

            // Write again - should not error
            await dbUtils.writeV2TransactionSubmissionAsync(rfqmTransactionSubmissionEntityOpts);

            // Read
            const transactionSubmissions = await dbUtils.findV2TransactionSubmissionsByOrderHashAsync(otcOrderHash);
            expect(transactionSubmissions.length).to.equal(1);

            const transactionSubmission = transactionSubmissions[0];
            expect(transactionSubmission.transactionHash).to.equal(transactionHash);
            expect(transactionSubmission.status).to.equal(RfqmTransactionSubmissionStatus.Submitted);
        });
    });

    describe('meta transaction tables', () => {
        it('should be able to write to, update, and read from the `meta_transaction_jobs` table', async () => {
            const metaTransaction = creatMockMetaTransaction();
            const metaTransactionHash = metaTransaction.getHash();
            // Write
            const savedJob = await dbUtils.writeMetaTransactionJobAsync({
                approval,
                chainId: 1,
                expiry: new BigNumber(2),
                fee: MOCK_FEE,
                inputToken,
                inputTokenAmount,
                integratorId: 'integrator',
                metaTransaction,
                metaTransactionHash,
                minOutputTokenAmount,
                outputToken,
                takerAddress: '0xaddress',
                takerSignature,
            });
            expect(savedJob.id).to.not.equal(null);

            // Read
            const job = await dbUtils.findMetaTransactionJobByMetaTransactionHashAsync(metaTransactionHash);
            if (!job) {
                throw new Error('job should exist');
            }
            expect(job.metaTransaction).to.eql(metaTransaction);
            expect(job.fee).to.eql(MOCK_FEE);
            expect(job.status).to.eql(RfqmJobStatus.PendingEnqueued);
            expect(job.approval).to.eql(approval);
            expect(job.workerAddress).to.eql(null);

            // Update
            job.chainId = 1;
            await dbUtils.updateRfqmJobAsync(job);

            // Read
            const updatedJob = await dbUtils.findMetaTransactionJobByIdAsync(job.id);
            if (!updatedJob) {
                throw new Error('job should exist');
            }
            expect(updatedJob.metaTransaction).to.eql(metaTransaction);
            expect(updatedJob.fee).to.eql(MOCK_FEE);
            expect(updatedJob.status).to.eql(RfqmJobStatus.PendingEnqueued);
            expect(updatedJob.approval).to.eql(approval);
            expect(updatedJob.workerAddress).to.eql(null);
            expect(updatedJob.chainId).to.eql(1);
        });

        it('should be able to find by status across the `meta_transaction_jobs` table', async () => {
            const metaTransaction = creatMockMetaTransaction();
            const metaTransactionHash = metaTransaction.getHash();
            // Write
            const savedJob = await dbUtils.writeMetaTransactionJobAsync({
                approval,
                chainId: 1,
                expiry: new BigNumber(2),
                fee: MOCK_FEE,
                inputToken,
                inputTokenAmount,
                integratorId: 'integrator',
                metaTransaction,
                metaTransactionHash,
                minOutputTokenAmount,
                outputToken,
                takerAddress: '0xaddress',
                takerSignature,
                status: RfqmJobStatus.FailedExpired,
            });
            expect(savedJob.id).to.not.equal(null);

            // Read
            const jobs = await dbUtils.findMetaTransactionJobsWithStatusesAsync([RfqmJobStatus.FailedExpired]);
            expect(jobs.length).to.equal(1);
            expect(jobs[0].metaTransaction).to.eql(metaTransaction);
            expect(jobs[0].fee).to.eql(MOCK_FEE);
            expect(jobs[0].status).to.eql(RfqmJobStatus.FailedExpired);
            expect(jobs[0].approval).to.eql(approval);
            expect(jobs[0].workerAddress).to.eql(null);
        });

        it('should be able to find unsolved meta transaction jobs in the `meta_transaction_jobs` table', async () => {
            const mockMetaTransaction1 = creatMockMetaTransaction();
            const savedJob = await dbUtils.writeMetaTransactionJobAsync({
                approval,
                chainId: 1,
                expiry: new BigNumber(2),
                fee: MOCK_FEE,
                id: '1',
                integratorId: 'integrator',
                inputToken,
                inputTokenAmount,
                metaTransaction: mockMetaTransaction1,
                metaTransactionHash: mockMetaTransaction1.getHash(),
                minOutputTokenAmount,
                outputToken,
                takerAddress: '0xaddress',
                takerSignature,
                status: RfqmJobStatus.PendingEnqueued,
            });
            expect(savedJob.id).to.not.equal(null);

            const mockMetaTransaction2 = creatMockMetaTransaction({ signer: '0xabcdef2' });
            await dbUtils.writeMetaTransactionJobAsync({
                approval,
                chainId: 2,
                expiry: new BigNumber(2),
                fee: MOCK_FEE,
                inputToken,
                inputTokenAmount,
                integratorId: 'integrator',
                metaTransaction: mockMetaTransaction2,
                metaTransactionHash: mockMetaTransaction2.getHash(),
                minOutputTokenAmount,
                outputToken,
                takerAddress: '0xaddress',
                takerSignature,
                status: RfqmJobStatus.PendingProcessing,
                workerAddress: '0xworkerAddress',
            });

            const mockMetaTransaction3 = creatMockMetaTransaction({ signer: '0xabcdef3' });
            await dbUtils.writeMetaTransactionJobAsync({
                approval,
                chainId: 3,
                expiry: new BigNumber(2),
                fee: MOCK_FEE,
                inputToken,
                inputTokenAmount,
                integratorId: 'integrator',
                metaTransaction: mockMetaTransaction3,
                metaTransactionHash: mockMetaTransaction3.getHash(),
                minOutputTokenAmount,
                outputToken,
                takerAddress: '0xaddress',
                takerSignature,
                status: RfqmJobStatus.FailedExpired,
            });

            const jobs = await dbUtils.findUnresolvedMetaTransactionJobsAsync('0xworkerAddress', 2);
            expect(jobs.length).to.equal(1);
            expect(jobs[0].status).to.eql(RfqmJobStatus.PendingProcessing);
        });

        it('should be able to write, update, and read the `meta_transaction_submissions` table', async () => {
            const metaTransactionJobId = uuid.v4();
            // Write
            const metaTransactionSubmissionEntityOpts: MetaTransactionSubmissionEntityConstructorOpts = {
                from,
                metaTransactionJobId,
                nonce,
                to,
                transactionHash,
                type: RfqmTransactionSubmissionType.Trade,
                status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
            };
            const savedSubmission = await dbUtils.writeMetaTransactionSubmissionAsync(
                metaTransactionSubmissionEntityOpts,
            );
            expect(savedSubmission.id).not.equal(null);

            // First Read
            let transactionSubmissions = await dbUtils.findMetaTransactionSubmissionsByTransactionHashAsync(
                transactionHash,
            );
            expect(transactionSubmissions.length).to.equal(1);

            let transactionSubmission = transactionSubmissions[0];
            expect(transactionSubmission.transactionHash).to.equal(transactionHash);
            expect(transactionSubmission.status).to.equal(RfqmTransactionSubmissionStatus.SucceededUnconfirmed);

            // Update
            await dbUtils.updateRfqmTransactionSubmissionsAsync([
                {
                    ...transactionSubmission,
                    status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
                },
            ]);

            // Second Read
            const updatedTransactionSubmissionOrNull = await dbUtils.findMetaTransactionSubmissionByIdAsync(
                transactionSubmission.id,
            );
            if (!updatedTransactionSubmissionOrNull) {
                expect.fail('result should not be null');
            }
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(updatedTransactionSubmissionOrNull!.transactionHash).to.equal(transactionHash);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(updatedTransactionSubmissionOrNull!.status).to.equal(
                RfqmTransactionSubmissionStatus.SucceededConfirmed,
            );

            // Third read
            transactionSubmissions = await dbUtils.findMetaTransactionSubmissionsByJobIdAsync(metaTransactionJobId);
            expect(transactionSubmissions.length).to.equal(1);

            transactionSubmission = transactionSubmissions[0];
            expect(transactionSubmission.transactionHash).to.equal(transactionHash);
            expect(transactionSubmission.status).to.equal(RfqmTransactionSubmissionStatus.SucceededConfirmed);
        });
    });
});
// tslint:disable-line:max-file-line-count
