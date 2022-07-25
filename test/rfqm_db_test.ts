import { BigNumber } from '@0x/asset-swapper';
import { OtcOrder, Signature } from '@0x/protocol-utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import { expect } from 'chai';
import { DataSource } from 'typeorm';

import { EXECUTE_META_TRANSACTION_EIP_712_TYPES, ONE_MINUTE_MS, ZERO } from '../src/constants';
import { RfqmV2TransactionSubmissionEntityConstructorOpts } from '../src/entities/RfqmV2TransactionSubmissionEntity';
import { RfqmJobStatus, RfqmTransactionSubmissionStatus, RfqmTransactionSubmissionType } from '../src/entities/types';
import { GaslessApprovalTypes } from '../src/services/types';
import { ExecuteMetaTransactionApproval } from '../src/types';
import {
    feeToStoredFee,
    otcOrderToStoredOtcOrder,
    RfqmDbUtils,
    storedFeeToFee,
    storedOtcOrderToOtcOrder,
} from '../src/utils/rfqm_db_utils';

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
        types: EXECUTE_META_TRANSACTION_EIP_712_TYPES,
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
            expect(storedOtcOrderToOtcOrder(storedJob?.order!)).to.deep.eq(otcOrder);
            expect(storedFeeToFee(storedJob?.fee!)).to.deep.eq(fee);
            expect(storedJob?.status).to.equal(RfqmJobStatus.PendingProcessing);
            expect(storedJob?.takerSignature).to.deep.eq(takerSignature);
            expect(storedJob?.approval).to.deep.eq(approval);

            // Update
            await dbUtils.updateV2JobAsync(otcOrderHash, true, { status: RfqmJobStatus.SucceededConfirmed });

            // Second Read
            const updatedJob = await dbUtils.findV2JobByOrderHashAsync(otcOrderHash);
            expect(storedOtcOrderToOtcOrder(updatedJob?.order!)).to.deep.eq(otcOrder);
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
            expect(storedOtcOrderToOtcOrder(storedJob?.order!)).to.deep.eq(otcOrder);
            expect(storedFeeToFee(storedJob?.fee!)).to.deep.eq(fee);
            expect(storedJob?.status).to.equal(RfqmJobStatus.FailedEthCallFailed);
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
});
// tslint:disable-line:max-file-line-count
