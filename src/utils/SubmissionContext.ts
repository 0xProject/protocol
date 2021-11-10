import { BigNumber } from '@0x/utils';
import { providers } from 'ethers';

type Provider = providers.Provider;
type TransactionReceipt = providers.TransactionReceipt;

import { RfqmV2TransactionSubmissionEntity } from '../entities';

/**
 * Encapsulates the transaction submissions for an RFQM job.
 *
 * Since one job can have multiple transactions, this class is used to treat them
 * all as one unit. It ensures consistency across transactions and makes retrieval
 * of the mined transaction receipt, if one exists, easy.
 */
// TODO (rhinodavid): Add RfqmTransactionSubmissionEntity once it has EIP-1559 fields
export class SubmissionContext<T extends RfqmV2TransactionSubmissionEntity> {
    private _transactions: T[];
    private readonly _provider: Provider;
    private readonly _transactionType: 0 | 2;

    constructor(provider: providers.Provider, transactions: T[]) {
        this._ensureTransactionsAreConsistent(transactions);
        this._transactionType = !!transactions[0].gasPrice ? 0 : 2;
        this._transactions = transactions;
        this._provider = provider;
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
    public addTransaction(transaction: T): void {
        const transactions = [...this._transactions, transaction];
        this._ensureTransactionsAreConsistent(transactions);
        this._transactions = transactions;
    }

    /**
     * Gets the nonce of the transactions of the `SubmissionContext`
     */
    public get nonce(): number {
        const nonce = this._transactions[0].nonce;
        if (!nonce) {
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
        return this._transactions
            .map((t) => t.gasPrice!)
            .filter(Boolean)
            .reduce((result, gasPrice) => BigNumber.maximum(result, gasPrice));
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
            maxFeePerGas: BigNumber.maximum(...this._transactions.map((t) => t.maxFeePerGas!)),
            maxPriorityFeePerGas: BigNumber.maximum(...this._transactions.map((t) => t.maxPriorityFeePerGas!)),
        };
    }

    /**
     * Returns the transaction receipt if one of the transactions in the SubmissionContext
     * has been mined; otherwise returns `null`.
     */
    public async getReceiptAsync(): Promise<TransactionReceipt | null> {
        const receipts = await Promise.all(
            this._transactions
                .map((t) => t.transactionHash!)
                .filter(Boolean)
                .map(async (transactionHash) => this._provider.getTransactionReceipt(transactionHash)),
        ).then((r) => r.filter(Boolean));
        if (receipts.length > 1) {
            throw new Error('Found more than one transaction receipt');
        }
        return receipts.length ? receipts[0] : null;
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
    private _ensureTransactionsAreConsistent(transactions: T[]): void {
        if (!transactions.length) {
            throw new Error('`transactions` must have a nonzero length');
        }
        if (!transactions.map((t) => t.nonce).every((n, _, nonces) => n === nonces[0])) {
            throw new Error('Transactions do not have the same nonce');
        }
        if (new Set(transactions.map((t) => t.transactionHash)).size !== transactions.length) {
            throw new Error('Transactions are not unique');
        }
        const areAllGasPricesNonNull = transactions.every((t) => t.gasPrice !== null);
        const areAllMaxFeesPerGasNonNull = transactions.every((t) => t.maxFeePerGas !== null);
        const areAllMaxPriorityFeesPerGasNonNull = transactions.every((t) => t.maxPriorityFeePerGas !== null);
        if (!(areAllGasPricesNonNull || (areAllMaxFeesPerGasNonNull && areAllMaxPriorityFeesPerGasNonNull))) {
            throw new Error('Transactions do not have the same gas type');
        }
    }
}
