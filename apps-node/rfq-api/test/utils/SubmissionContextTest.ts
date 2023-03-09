import { BigNumber } from '@0x/utils';
import { BigNumber as EthersBigNumber, providers } from 'ethers';
import { deepEqual, instance, mock, when } from 'ts-mockito';

import { ONE_SECOND_MS } from '../../src/core/constants';
import { RfqmV2TransactionSubmissionEntity } from '../../src/entities';
import {
    RfqmTransactionSubmissionStatus,
    RfqmTransactionSubmissionType,
    SubmissionContextStatus,
} from '../../src/entities/types';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { SubmissionContext } from '../../src/utils/SubmissionContext';

type TransactionReceipt = providers.TransactionReceipt;

let mockBlockchainUtils: RfqBlockchainUtils;

describe('SubmissionContext', () => {
    beforeEach(() => {
        mockBlockchainUtils = mock<RfqBlockchainUtils>();
    });
    describe('constructor', () => {
        it('requires a transaction', () => {
            expect(() => new SubmissionContext(instance(mockBlockchainUtils), [])).toThrow('nonzero');
        });

        it('requires all transactions to have unique hashes', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });

            expect(() => new SubmissionContext(instance(mockBlockchainUtils), [transaction1, transaction2])).toThrow(
                'unique',
            );
        });

        it('requires all transactions to have the same nonce', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 1,
                gasPrice: new BigNumber(1),
            });

            expect(() => new SubmissionContext(instance(mockBlockchainUtils), [transaction1, transaction2])).toThrow(
                'nonce',
            );
        });

        it('requires all transactions to have the same gas format', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            expect(() => new SubmissionContext(instance(mockBlockchainUtils), [transaction1, transaction2])).toThrow(
                'type',
            );
        });

        it('fails for invalid EIP-1559 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxPriorityFeePerGas: new BigNumber(1),
            });

            expect(() => new SubmissionContext(instance(mockBlockchainUtils), [transaction])).toThrow();
        });
    });
    describe('get transactionType', () => {
        it('handles type-0 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [transaction]);

            expect(submissionContext.transactionType).toEqual(0);
        });

        it('handles type-2 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [transaction]);

            expect(submissionContext.transactionType).toEqual(2);
        });
    });

    describe('maxGasPrice', () => {
        it('throws for EIP-1559 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [transaction]);

            expect(() => submissionContext.maxGasPrice).toThrow('EIP-1559');
        });

        it('gets the max gas price', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(2),
            });

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [
                transaction1,
                transaction2,
            ]);

            expect(submissionContext.maxGasPrice.toNumber()).toEqual(new BigNumber(2).toNumber());
        });
    });

    describe('maxGasFees', () => {
        it('throws for non-EIP-1559 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [transaction]);

            expect(() => submissionContext.maxGasFees).toThrow('non-EIP-1559');
        });

        it('gets the max gas fees', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(0),
                maxPriorityFeePerGas: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(0),
            });

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [
                transaction1,
                transaction2,
            ]);

            expect(submissionContext.maxGasFees.maxFeePerGas.toNumber()).toEqual(new BigNumber(1).toNumber());
            expect(submissionContext.maxGasFees.maxPriorityFeePerGas.toNumber()).toEqual(new BigNumber(1).toNumber());
        });
    });

    describe('get firstSubmissionTimestampS', () => {
        it('gets the earliest time a transaction in the context was submitted', () => {
            const fakeEarlierMs = 1640307189361;
            const fakeLaterMs = 1650307189361;
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                createdAt: new Date(fakeLaterMs),
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(0),
                maxPriorityFeePerGas: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                createdAt: new Date(fakeEarlierMs), // Transaction 2 is older
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(0),
            });

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [
                transaction1,
                transaction2,
            ]);

            expect(submissionContext.firstSubmissionTimestampS).toEqual(Math.round(fakeEarlierMs / ONE_SECOND_MS));
        });
    });

    describe('getReceiptsAsync', () => {
        it('returns null if no transactions have been mined', async () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0x1']))).thenResolve([undefined]);

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [transaction]);

            expect(await submissionContext.getReceiptAsync()).toEqual(null);
        });

        it('returns one transaction receipt have been mined', async () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const receipt: TransactionReceipt = {
                to: '0xto',
                from: '0xfrom',
                contractAddress: '0xcontract',
                transactionIndex: 1,
                gasUsed: EthersBigNumber.from(1),
                logsBloom: '',
                blockHash: '0xblockhash',
                transactionHash: '0x1',
                logs: [],
                blockNumber: 123,
                confirmations: 1,
                cumulativeGasUsed: EthersBigNumber.from(1),
                effectiveGasPrice: EthersBigNumber.from(1),
                byzantium: true,
                type: 2,
                status: 1,
            };

            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0x1', '0x2']))).thenResolve([receipt, undefined]);

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [
                transaction1,
                transaction2,
            ]);

            expect(await submissionContext.getReceiptAsync()).toEqual(receipt);
        });

        it('throws if multiple receipts are returned', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                type: RfqmTransactionSubmissionType.Trade,
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const receipt: TransactionReceipt = {
                to: '0xto',
                from: '0xfrom',
                contractAddress: '0xcontract',
                transactionIndex: 1,
                gasUsed: EthersBigNumber.from(1),
                logsBloom: '',
                blockHash: '0xblockhash',
                transactionHash: '0x1',
                logs: [],
                blockNumber: 123,
                confirmations: 1,
                cumulativeGasUsed: EthersBigNumber.from(1),
                effectiveGasPrice: EthersBigNumber.from(1),
                byzantium: true,
                type: 2,
                status: 1,
            };

            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0x1', '0x2']))).thenResolve([receipt, receipt]);

            const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [
                transaction1,
                transaction2,
            ]);

            expect(submissionContext.getReceiptAsync()).rejects.toEqual(
                new Error('Found more than one transaction receipt'),
            );
        });

        describe('isBlockConfirmed', () => {
            it('should say no if receipt block is under 3 blocks deep', async () => {
                const receiptBlock = 100;
                const currentBlock = 102;

                expect(SubmissionContext.isBlockConfirmed(currentBlock, receiptBlock)).toEqual(false);
            });
            it('should say yes if the receipt block is at least 3 blocks deep', async () => {
                const receiptBlock = 100;
                const currentBlock = 103;

                expect(SubmissionContext.isBlockConfirmed(currentBlock, receiptBlock)).toEqual(true);
            });
        });

        describe('submissionContextStatus', () => {
            it('should return `PendingSubmitted` if none of the transactions is resolved', async () => {
                const transaction1 = new RfqmV2TransactionSubmissionEntity({
                    type: RfqmTransactionSubmissionType.Trade,
                    transactionHash: '0x1',
                    from: '0xfrom',
                    to: '0xto',
                    orderHash: '0xOrderhash',
                    nonce: 0,
                    maxFeePerGas: new BigNumber(1),
                    maxPriorityFeePerGas: new BigNumber(1),
                    status: RfqmTransactionSubmissionStatus.Submitted,
                });

                const transaction2 = new RfqmV2TransactionSubmissionEntity({
                    type: RfqmTransactionSubmissionType.Trade,
                    transactionHash: '0x2',
                    from: '0xfrom',
                    to: '0xto',
                    orderHash: '0xOrderhash',
                    nonce: 0,
                    maxFeePerGas: new BigNumber(1),
                    maxPriorityFeePerGas: new BigNumber(1),
                    status: RfqmTransactionSubmissionStatus.Submitted,
                });

                const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [
                    transaction1,
                    transaction2,
                ]);

                expect(submissionContext.submissionContextStatus).toEqual(SubmissionContextStatus.PendingSubmitted);
            });

            it('should return the correct status if one of the transactions is resolved', async () => {
                const transaction1 = new RfqmV2TransactionSubmissionEntity({
                    type: RfqmTransactionSubmissionType.Trade,
                    transactionHash: '0x1',
                    from: '0xfrom',
                    to: '0xto',
                    orderHash: '0xOrderhash',
                    nonce: 0,
                    maxFeePerGas: new BigNumber(1),
                    maxPriorityFeePerGas: new BigNumber(1),
                    status: RfqmTransactionSubmissionStatus.Submitted,
                });

                const transaction2 = new RfqmV2TransactionSubmissionEntity({
                    type: RfqmTransactionSubmissionType.Trade,
                    transactionHash: '0x2',
                    from: '0xfrom',
                    to: '0xto',
                    orderHash: '0xOrderhash',
                    nonce: 0,
                    maxFeePerGas: new BigNumber(1),
                    maxPriorityFeePerGas: new BigNumber(1),
                    status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
                });

                const submissionContext = new SubmissionContext(instance(mockBlockchainUtils), [
                    transaction1,
                    transaction2,
                ]);

                expect(submissionContext.submissionContextStatus).toEqual(SubmissionContextStatus.SucceededConfirmed);
            });
        });
    });
});
