import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import { BigNumber as EthersBigNumber, providers } from 'ethers';
import { instance, mock, when } from 'ts-mockito';

import { RfqmV2TransactionSubmissionEntity } from '../../src/entities';
import { SubmissionContext } from '../../src/utils/SubmissionContext';

type Provider = providers.Provider;
type TransactionReceipt = providers.TransactionReceipt;

let mockProvider: Provider;

describe('SubmissionContext', () => {
    beforeEach(() => {
        mockProvider = mock<Provider>();
    });
    describe('constructor', () => {
        it('requires a transaction', () => {
            expect(() => new SubmissionContext(instance(mockProvider), [])).to.throw('nonzero');
        });

        it('requires all transactions to have unique hashes', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });

            expect(() => new SubmissionContext(instance(mockProvider), [transaction1, transaction2])).to.throw(
                'unique',
            );
        });

        it('requires all transactions to have the same nonce', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 1,
                gasPrice: new BigNumber(1),
            });

            expect(() => new SubmissionContext(instance(mockProvider), [transaction1, transaction2])).to.throw('nonce');
        });

        it('requires all transactions to have the same gas format', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            expect(() => new SubmissionContext(instance(mockProvider), [transaction1, transaction2])).to.throw('type');
        });

        it('fails for invalid EIP-1559 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxPriorityFeePerGas: new BigNumber(1),
            });

            expect(() => new SubmissionContext(instance(mockProvider), [transaction])).to.throw();
        });
    });
    describe('get transactionType', () => {
        it('handles type-0 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction]);

            expect(submissionContext.transactionType).to.equal(0);
        });

        it('handles type-2 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction]);

            expect(submissionContext.transactionType).to.equal(2);
        });
    });

    describe('maxGasPrice', () => {
        it('throws for EIP-1559 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction]);

            expect(() => submissionContext.maxGasPrice).to.throw('EIP-1559');
        });

        it('gets the max gas price', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(2),
            });

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction1, transaction2]);

            expect(submissionContext.maxGasPrice.toNumber()).to.equal(new BigNumber(2).toNumber());
        });
    });

    describe('maxGasFees', () => {
        it('throws for non-EIP-1559 transactions', () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                gasPrice: new BigNumber(1),
            });

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction]);

            expect(() => submissionContext.maxGasFees).to.throw('non-EIP-1559');
        });

        it('gets the max gas fees', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(0),
                maxPriorityFeePerGas: new BigNumber(1),
            });
            const transaction2 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x2',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(0),
            });

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction1, transaction2]);

            expect(submissionContext.maxGasFees.maxFeePerGas.toNumber()).to.equal(new BigNumber(1).toNumber());
            expect(submissionContext.maxGasFees.maxPriorityFeePerGas.toNumber()).to.equal(new BigNumber(1).toNumber());
        });
    });

    describe('getReceiptsAsync', () => {
        it('returns null if no transactions have been mined', async () => {
            const transaction = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            // @ts-ignore: Ethers doesn't have strict null checks on so this doesn't type-check
            when(mockProvider.getTransactionReceipt('0x1')).thenResolve(undefined);

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction]);

            expect(await submissionContext.getReceiptAsync()).to.equal(null);
        });

        it('returns one transaction receipt have been mined', async () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const transaction2 = new RfqmV2TransactionSubmissionEntity({
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

            when(mockProvider.getTransactionReceipt('0x1')).thenResolve(receipt);
            // @ts-ignore: Ethers doesn't have strict null checks on so this doesn't type-check
            when(mockProvider.getTransactionReceipt('0x2')).thenResolve(undefined);

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction1, transaction2]);

            expect(await submissionContext.getReceiptAsync()).to.equal(receipt);
        });

        it('throws if multiple receipts are returned', () => {
            const transaction1 = new RfqmV2TransactionSubmissionEntity({
                transactionHash: '0x1',
                from: '0xfrom',
                to: '0xto',
                orderHash: '0xOrderhash',
                nonce: 0,
                maxFeePerGas: new BigNumber(1),
                maxPriorityFeePerGas: new BigNumber(1),
            });

            const transaction2 = new RfqmV2TransactionSubmissionEntity({
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

            when(mockProvider.getTransactionReceipt('0x1')).thenResolve(receipt);
            when(mockProvider.getTransactionReceipt('0x2')).thenResolve(receipt);

            const submissionContext = new SubmissionContext(instance(mockProvider), [transaction1, transaction2]);

            expect(submissionContext.getReceiptAsync()).to.eventually.be.rejectedWith(
                'more than one transaction receipt',
            );
        });
    });
});
