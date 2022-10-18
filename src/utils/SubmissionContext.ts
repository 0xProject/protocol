import { BigNumber } from '@0x/utils';
import { providers } from 'ethers';

import { ONE_SECOND_MS } from '../constants';
import { MetaTransactionSubmissionEntity, RfqmV2TransactionSubmissionEntity } from '../entities';
import { RfqmJobStatus, RfqmTransactionSubmissionStatus, SubmissionContextStatus } from '../entities/types';

import { RfqBlockchainUtils } from './rfq_blockchain_utils';

export const BLOCK_FINALITY_THRESHOLD = 3;

type TransactionReceipt = providers.TransactionReceipt;

// https://stackoverflow.com/questions/47632622/typescript-and-filter-boolean
function isDefined<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

/**
 * Encapsulates the transaction submissions for an RFQM job.
 *
 * Since one job can have multiple transactions, this class is used to treat them
 * all as one unit. It ensures consistency across transactions and makes retrieval
 * of the mined transaction receipt, if one exists, easy.
 */
export class SubmissionContext<T extends RfqmV2TransactionSubmissionEntity[] | MetaTransactionSubmissionEntity[]> {
    private _transactions: T;
    private readonly _blockchainUtils: RfqBlockchainUtils;
    private readonly _transactionType: 0 | 2;

    public static isBlockConfirmed(currentBlock: number, receiptBlockNumber: number): boolean {
        // We specify a finality threshold of n blocks deep to have greater confidence
        // in the transaction receipt
        return currentBlock - receiptBlockNumber >= BLOCK_FINALITY_THRESHOLD;
    }

    /**
     * Get corresponding job status given status of submission context for `RfqmTransactionSubmissionType.Approval`.
     * Different submission context status would trigger different job status transition.
     *
     * @returns Corresponding job status.
     */
    public static approvalSubmissionContextStatusToJobStatus(
        submissionContextStatus: SubmissionContextStatus,
    ): RfqmJobStatus {
        switch (submissionContextStatus) {
            case SubmissionContextStatus.FailedExpired:
                return RfqmJobStatus.FailedExpired;
            case SubmissionContextStatus.FailedRevertedConfirmed:
                return RfqmJobStatus.FailedRevertedConfirmed;
            case SubmissionContextStatus.FailedRevertedUnconfirmed:
                return RfqmJobStatus.FailedRevertedUnconfirmed;
            case SubmissionContextStatus.PendingSubmitted:
            case SubmissionContextStatus.SucceededConfirmed:
            case SubmissionContextStatus.SucceededUnconfirmed:
                // For the first version of gasless approval, a successful approval submission
                // would still keep the job in pending submitted status
                return RfqmJobStatus.PendingSubmitted;
            default:
                ((_x: never) => {
                    throw new Error('unreachable');
                })(submissionContextStatus);
        }
    }

    /**
     * Get corresponding job status given status of submission context for `RfqmTransactionSubmissionType.Trade`.
     * Different submission context status would trigger different job status transition.
     *
     * @param submissionContextStatus Status of submission context.
     */
    public static tradeSubmissionContextStatusToJobStatus(
        submissionContextStatus: SubmissionContextStatus,
    ): RfqmJobStatus {
        switch (submissionContextStatus) {
            case SubmissionContextStatus.FailedExpired:
                return RfqmJobStatus.FailedExpired;
            case SubmissionContextStatus.FailedRevertedConfirmed:
                return RfqmJobStatus.FailedRevertedConfirmed;
            case SubmissionContextStatus.FailedRevertedUnconfirmed:
                return RfqmJobStatus.FailedRevertedUnconfirmed;
            case SubmissionContextStatus.PendingSubmitted:
                return RfqmJobStatus.PendingSubmitted;
            case SubmissionContextStatus.SucceededConfirmed:
                return RfqmJobStatus.SucceededConfirmed;
            case SubmissionContextStatus.SucceededUnconfirmed:
                return RfqmJobStatus.SucceededUnconfirmed;
            default:
                ((_x: never) => {
                    throw new Error('unreachable');
                })(submissionContextStatus);
        }
    }

    constructor(blockchainUtils: RfqBlockchainUtils, transactions: T) {
        this._ensureTransactionsAreConsistent(transactions);
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line no-extra-boolean-cast
        this._transactionType = !!transactions[0].gasPrice ? 0 : 2;
        this._transactions = transactions;
        this._blockchainUtils = blockchainUtils;
    }

    public get transactions(): T {
        return this._transactions;
    }

    // Gets the transaction hashes for the transactions in the SubmissionContext
    public get transactionHashes(): string[] {
        return this._transactions.map((t) => t.transactionHash).filter(isDefined);
    }

    /**
     * Gets the type of the transactions in the `SubmissionContext`:
     * 0 for non-EIP1559 transactions and 2 for EIP-1559 transactions.
     */
    public get transactionType(): 0 | 2 {
        return this._transactionType;
    }

    /**
     * Adds a transaction to the SubmissionContext. Throws if the transaction has a nonce or type
     * different than the existing transactions.
     */
    public addTransaction(transaction: T[number]): void {
        // TODO (Vic): Remove any[] once https://github.com/microsoft/TypeScript/issues/44373 is fixed
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this._transactions as any[]).push(transaction);
        this._ensureTransactionsAreConsistent(this._transactions);
    }

    /**
     * Gets the nonce of the transactions of the `SubmissionContext`
     */
    public get nonce(): number {
        const nonce = this._transactions[0].nonce;
        if (nonce === undefined || nonce === null) {
            throw new Error('Transaction does not have a nonce');
        }
        return nonce;
    }

    /**
     * Gets the max gas price set for any transaction in the `SubmissionContext`
     */
    public get maxGasPrice(): BigNumber {
        if (this._transactionType !== 0) {
            throw new Error('Attempted to access the max gas price of a EIP-1559 transaction set');
        }
        return (
            this._transactions
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                .map((t) => t.gasPrice!)
                .filter(Boolean)
                .reduce((result, gasPrice) => BigNumber.maximum(result, gasPrice))
        );
    }

    /**
     * Gets the maximum values for the `maxFeePerGas` and the `maxPriorityFeePerGas` for a
     * set of EIP-1559 transactions.
     */
    public get maxGasFees(): { maxFeePerGas: BigNumber; maxPriorityFeePerGas: BigNumber } {
        if (this._transactionType !== 2) {
            throw new Error('Attempted to access the max gas fees for a non-EIP-1559 transaction set');
        }
        return {
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            maxFeePerGas: BigNumber.maximum(...this._transactions.map((t) => t.maxFeePerGas!)),
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            maxPriorityFeePerGas: BigNumber.maximum(...this._transactions.map((t) => t.maxPriorityFeePerGas!)),
        };
    }

    /**
     * Gets the epoch time, in seconds, of the earliest transaction submission.
     * Note: This uses the database time the transaction submission was created,
     * not the blockchain timestamp.
     */
    public get firstSubmissionTimestampS(): number {
        const submissionCreationTimesS = this._transactions
            .map((t) => t.createdAt.getTime() / ONE_SECOND_MS)
            .map((t) => Math.round(t));
        return submissionCreationTimesS.reduce((result, time) => Math.min(result, time), Infinity);
    }

    /**
     * Returns the transaction receipt if one of the transactions in the SubmissionContext
     * has been mined; otherwise returns `null`.
     */
    public async getReceiptAsync(): Promise<TransactionReceipt | null> {
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const receipts = (
            await this._blockchainUtils.getReceiptsAsync(this._transactions.map((t) => t.transactionHash!))
        ).filter(isDefined);
        /* eslint-enable @typescript-eslint/no-non-null-assertion */
        if (receipts.length > 1) {
            throw new Error('Found more than one transaction receipt');
        }
        return receipts.length ? receipts[0] : null;
    }

    /**
     * 1. Updates the in-memory transactions in response to a mined transaction receipt.
     * 2. Updates the statuses of all transaction submission.
     */
    public async updateForReceiptAsync(receipt: TransactionReceipt, now: Date = new Date()): Promise<void> {
        const isTransactionSuccessful = receipt.status === 1;
        const currentBlock = await this._blockchainUtils.getCurrentBlockAsync();
        const isTransactionConfirmed = SubmissionContext.isBlockConfirmed(currentBlock, receipt.blockNumber);

        this._transactions = this._transactions.map((transaction) => {
            transaction.updatedAt = now;
            if (transaction.transactionHash === receipt.transactionHash) {
                const submissionStatus = isTransactionSuccessful
                    ? isTransactionConfirmed
                        ? RfqmTransactionSubmissionStatus.SucceededConfirmed
                        : RfqmTransactionSubmissionStatus.SucceededUnconfirmed
                    : isTransactionConfirmed
                    ? RfqmTransactionSubmissionStatus.RevertedConfirmed
                    : RfqmTransactionSubmissionStatus.RevertedUnconfirmed;

                transaction.status = submissionStatus;
                transaction.blockMined = new BigNumber(receipt.blockNumber);
                transaction.gasUsed = new BigNumber(receipt.gasUsed.toString());
                if (transaction.gasPrice === null) {
                    transaction.gasPrice = new BigNumber(receipt.effectiveGasPrice.toString());
                }
            } else {
                transaction.status = RfqmTransactionSubmissionStatus.DroppedAndReplaced;
            }

            return transaction;
        }) as T;
    }

    /**
     * Returns the appropriate job status given the statuses of the transactions
     */
    public get jobStatus():
        | RfqmJobStatus.PendingSubmitted
        | RfqmJobStatus.FailedRevertedConfirmed
        | RfqmJobStatus.FailedRevertedUnconfirmed
        | RfqmJobStatus.SucceededConfirmed
        | RfqmJobStatus.SucceededUnconfirmed {
        for (const transaction of this._transactions) {
            switch (transaction.status) {
                case RfqmTransactionSubmissionStatus.DroppedAndReplaced:
                    continue;
                case RfqmTransactionSubmissionStatus.Presubmit:
                    continue;
                case RfqmTransactionSubmissionStatus.RevertedConfirmed:
                    return RfqmJobStatus.FailedRevertedConfirmed;
                case RfqmTransactionSubmissionStatus.RevertedUnconfirmed:
                    return RfqmJobStatus.FailedRevertedUnconfirmed;
                case RfqmTransactionSubmissionStatus.Submitted:
                    continue;
                case RfqmTransactionSubmissionStatus.SucceededConfirmed:
                    return RfqmJobStatus.SucceededConfirmed;
                case RfqmTransactionSubmissionStatus.SucceededUnconfirmed:
                    return RfqmJobStatus.SucceededUnconfirmed;
                default:
                    ((_x: never) => {
                        throw new Error('unreachable');
                    })(transaction.status);
            }
        }
        return RfqmJobStatus.PendingSubmitted;
    }

    /**
     * Returns the submission context status given the statuses of the transactions. A submission context contains
     * multiple transactions and the submission context status is the collective status for all transactions.
     */
    public get submissionContextStatus():
        | SubmissionContextStatus.PendingSubmitted
        | SubmissionContextStatus.FailedRevertedConfirmed
        | SubmissionContextStatus.FailedRevertedUnconfirmed
        | SubmissionContextStatus.SucceededConfirmed
        | SubmissionContextStatus.SucceededUnconfirmed {
        for (const transaction of this._transactions) {
            switch (transaction.status) {
                case RfqmTransactionSubmissionStatus.DroppedAndReplaced:
                    continue;
                case RfqmTransactionSubmissionStatus.Presubmit:
                    continue;
                case RfqmTransactionSubmissionStatus.RevertedConfirmed:
                    return SubmissionContextStatus.FailedRevertedConfirmed;
                case RfqmTransactionSubmissionStatus.RevertedUnconfirmed:
                    return SubmissionContextStatus.FailedRevertedUnconfirmed;
                case RfqmTransactionSubmissionStatus.Submitted:
                    continue;
                case RfqmTransactionSubmissionStatus.SucceededConfirmed:
                    return SubmissionContextStatus.SucceededConfirmed;
                case RfqmTransactionSubmissionStatus.SucceededUnconfirmed:
                    return SubmissionContextStatus.SucceededUnconfirmed;
                default:
                    throw new Error(`Transaction status ${transaction.status} should not be reached`);
            }
        }
        return SubmissionContextStatus.PendingSubmitted;
    }

    /**
     * Assesses whether the given transactions have the same nonce, type (EIP-1559 or not),
     * and unique transaction hashes; throws if they do not.
     *
     * Throws if `transactions` has a zero length.
     *
     * `perfer-function-over-method` rule is disabled to since a function would not be able to use the
     * `T` generic type.
     */
    // tslint:disable-next-line: prefer-function-over-method
    private _ensureTransactionsAreConsistent(transactions: T): void {
        if (!transactions.length) {
            throw new Error('`transactions` must have a nonzero length');
        }
        if (!transactions.map((t) => t.nonce).every((n, _, nonces) => n === nonces[0])) {
            throw new Error('Transactions do not have the same nonce');
        }
        if (new Set(transactions.map((t) => t.transactionHash)).size !== transactions.length) {
            throw new Error('Transactions are not unique');
        }
        // TODO (Vic): Remove any[] once https://github.com/microsoft/TypeScript/issues/44373 is fixed
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const areAllGasPricesNonNull = (transactions as any[]).every((t) => t.gasPrice !== null);
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const areAllMaxFeesPerGasNonNull = (transactions as any[]).every((t) => t.maxFeePerGas !== null);
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const areAllMaxPriorityFeesPerGasNonNull = (transactions as any[]).every(
            (t) => t.maxPriorityFeePerGas !== null,
        );
        if (!(areAllGasPricesNonNull || (areAllMaxFeesPerGasNonNull && areAllMaxPriorityFeesPerGasNonNull))) {
            throw new Error('Transactions do not have the same gas type');
        }
    }
}
