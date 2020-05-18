import { RPCSubprovider, Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber, intervalUtils, providerUtils } from '@0x/utils';
import { SupportedProvider, Web3Wrapper } from '@0x/web3-wrapper';
import { utils as web3WrapperUtils } from '@0x/web3-wrapper/lib/src/utils';
import { Counter, Gauge, Summary } from 'prom-client';
import { Connection, Not, Repository } from 'typeorm';

import {
    ENABLE_PROMETHEUS_METRICS,
    ETHEREUM_RPC_URL,
    META_TXN_RELAY_EXPECTED_MINED_SEC,
    META_TXN_RELAY_PRIVATE_KEYS,
} from '../config';
import {
    ETH_DECIMALS,
    GWEI_DECIMALS,
    NUMBER_OF_BLOCKS_UNTIL_CONFIRMED,
    ONE_SECOND_MS,
    TX_HASH_RESPONSE_WAIT_TIME_MS,
    TX_WATCHER_POLLING_INTERVAL_MS,
    TX_WATCHER_UPDATE_METRICS_INTERVAL_MS,
    UNSTICKING_TRANSACTION_GAS_MULTIPLIER,
} from '../constants';
import { TransactionEntity } from '../entities';
import { logger } from '../logger';
import { TransactionStates } from '../types';
import { ethGasStationUtils } from '../utils/gas_station_utils';
import { Signer } from '../utils/signer';

const SIGNER_ADDRESS_LABEL = 'signer_address';
const TRANSACTION_STATUS_LABEL = 'status';

export class TransactionWatcherSignerService {
    private readonly _transactionRepository: Repository<TransactionEntity>;
    private readonly _provider: SupportedProvider;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _transactionWatcherTimer: NodeJS.Timer;
    private readonly _signers: Map<string, Signer>;
    private readonly _availableSignerPublicAddresses: string[];
    private readonly _metricsUpdateTimer: NodeJS.Timer;
    private readonly _signerBalancesGauge: Gauge<string>;
    private readonly _transactionsUpdateCounter: Counter<string>;
    private readonly _gasPriceSummary: Summary<string>;

    private static _createWeb3Provider(rpcHost: string): SupportedProvider {
        const providerEngine = new Web3ProviderEngine();
        providerEngine.addProvider(new RPCSubprovider(rpcHost));
        providerUtils.startProviderEngine(providerEngine);
        return providerEngine;
    }
    private static _isUnsubmittedTxExpired(tx: TransactionEntity): boolean {
        const now = new Date();
        const shouldBeSubmittedBy = new Date(tx.createdAt.getTime() + TX_HASH_RESPONSE_WAIT_TIME_MS);
        return tx.status === TransactionStates.Unsubmitted && now > shouldBeSubmittedBy;
    }
    constructor(dbConnection: Connection) {
        this._provider = TransactionWatcherSignerService._createWeb3Provider(ETHEREUM_RPC_URL);
        this._transactionRepository = dbConnection.getRepository(TransactionEntity);
        this._web3Wrapper = new Web3Wrapper(this._provider);
        this._signers = new Map<string, Signer>();
        this._availableSignerPublicAddresses = META_TXN_RELAY_PRIVATE_KEYS.map(key => {
            const signer = new Signer(key, ETHEREUM_RPC_URL);
            this._signers.set(signer.publicAddress, signer);
            return signer.publicAddress;
        });
        this._transactionWatcherTimer = intervalUtils.setAsyncExcludingInterval(
            async () => {
                logger.trace('syncing transaction status');
                await this.syncTransactionStatusAsync();
            },
            TX_WATCHER_POLLING_INTERVAL_MS,
            (err: Error) => {
                logger.error({
                    message: `transaction watcher failed to sync transaction status: ${JSON.stringify(err)}`,
                    err: err.stack,
                });
            },
        );
        // Metric collection related fields
        this._signerBalancesGauge = new Gauge({
            name: 'signer_eth_balance_sum',
            help: 'Available ETH Balance of a signer',
            labelNames: [SIGNER_ADDRESS_LABEL],
        });
        this._transactionsUpdateCounter = new Counter({
            name: 'signer_transactions_count',
            help: 'Number of transactions updates of a signer by status',
            labelNames: [SIGNER_ADDRESS_LABEL, TRANSACTION_STATUS_LABEL],
        });
        this._gasPriceSummary = new Summary({
            name: 'signer_gas_price_summary',
            help: 'Observed gas prices by the signer in gwei',
            labelNames: [SIGNER_ADDRESS_LABEL],
        });
        if (ENABLE_PROMETHEUS_METRICS) {
            this._metricsUpdateTimer = intervalUtils.setAsyncExcludingInterval(
                async () => {
                    logger.trace('updating metrics');
                    await this._updateSignerBalancesAsync();
                },
                TX_WATCHER_UPDATE_METRICS_INTERVAL_MS,
                (err: Error) => {
                    logger.error({
                        message: `transaction watcher failed to update metrics: ${JSON.stringify(err)}`,
                        err: err.stack,
                    });
                },
            );
        }
    }
    public stop(): void {
        intervalUtils.clearAsyncExcludingInterval(this._transactionWatcherTimer);
        intervalUtils.clearAsyncExcludingInterval(this._metricsUpdateTimer);
    }
    public async syncTransactionStatusAsync(): Promise<void> {
        try {
            await this._cancelOrSignAndBroadcastTransactionsAsync();
        } catch (err) {
            logger.error({
                message: `failed to sign and broadcast transactions: ${JSON.stringify(err)}`,
                stack: err.stack,
            });
        }
        await this._syncBroadcastedTransactionStatusAsync();
        await this._checkForStuckTransactionsAsync();
        await this._checkForConfirmedTransactionsAsync();
    }
    private async _signAndBroadcastMetaTxAsync(txEntity: TransactionEntity, signer: Signer): Promise<void> {
        // TODO(oskar) refactor with type guards?
        if (txEntity.protocolFee === undefined) {
            throw new Error('txEntity is missing protocolFee');
        }
        if (txEntity.gasPrice === undefined) {
            throw new Error('txEntity is missing gasPrice');
        }
        if (txEntity.zeroExTransaction === undefined) {
            throw new Error('txEntity is missing zeroExTransaction');
        }
        if (txEntity.zeroExTransactionSignature === undefined) {
            throw new Error('txEntity is missing zeroExTransactionSignature');
        }
        const {
            ethereumTxnParams,
            ethereumTransactionHash,
            signedEthereumTransaction,
        } = await signer.signAndBroadcastMetaTxAsync(
            txEntity.zeroExTransaction,
            txEntity.zeroExTransactionSignature,
            txEntity.protocolFee,
            txEntity.gasPrice,
        );
        txEntity.status = TransactionStates.Submitted;
        txEntity.txHash = ethereumTransactionHash;
        txEntity.signedTx = signedEthereumTransaction;
        txEntity.nonce = web3WrapperUtils.convertHexToNumber(ethereumTxnParams.nonce);
        txEntity.from = ethereumTxnParams.from;
        this._gasPriceSummary.observe(
            { signer_address: txEntity.from },
            Web3Wrapper.toUnitAmount(txEntity.gasPrice, GWEI_DECIMALS).toNumber(),
        );
        await this._updateTxEntityAsync(txEntity);
    }
    private async _syncBroadcastedTransactionStatusAsync(): Promise<void> {
        const transactionsToCheck = await this._transactionRepository.find({
            where: [
                { status: TransactionStates.Submitted },
                { status: TransactionStates.Mempool },
                { status: TransactionStates.Stuck },
            ],
        });
        logger.trace(`found ${transactionsToCheck.length} transactions to check status`);
        for (const tx of transactionsToCheck) {
            await this._findTransactionStatusAndUpdateAsync(tx);
        }
    }
    private async _findTransactionStatusAndUpdateAsync(txEntity: TransactionEntity): Promise<TransactionEntity> {
        // TODO(oskar) - LessThanOrEqual and LessThan do not work on dates in
        // TypeORM queries, ref: https://github.com/typeorm/typeorm/issues/3959
        const latestBlockDate = await this._getLatestBlockDateAsync();
        const isExpired = txEntity.expectedAt <= latestBlockDate;
        if (txEntity.txHash === undefined) {
            logger.warn('missing txHash for transaction entity');
            return txEntity;
        }
        try {
            const txInBlockchain = await this._web3Wrapper.getTransactionByHashAsync(txEntity.txHash);
            if (txInBlockchain !== undefined && txInBlockchain !== null && txInBlockchain.hash !== undefined) {
                if (txInBlockchain.blockNumber !== null) {
                    logger.trace({
                        message: `a transaction with a ${txEntity.status} status is already on the blockchain, updating status to TransactionStates.Included`,
                        hash: txInBlockchain.hash,
                    });
                    txEntity.status = TransactionStates.Included;
                    txEntity.blockNumber = txInBlockchain.blockNumber;
                    await this._updateTxEntityAsync(txEntity);
                    await this._abortTransactionsWithTheSameNonceAsync(txEntity);
                    return txEntity;
                    // Checks if the txn is in the mempool but still has it's status set to Unsubmitted or Submitted
                } else if (!isExpired && txEntity.status !== TransactionStates.Mempool) {
                    logger.trace({
                        message: `a transaction with a ${txEntity.status} status is pending, updating status to TransactionStates.Mempool`,
                        hash: txInBlockchain.hash,
                    });
                    txEntity.status = TransactionStates.Mempool;
                    return this._updateTxEntityAsync(txEntity);
                } else if (isExpired) {
                    // NOTE(oskar): we currently cancel all transactions that are in the
                    // "stuck" state. A better solution might be to unstick
                    // transactions one by one and observing if they unstick the
                    // subsequent transactions.
                    txEntity.status = TransactionStates.Stuck;
                    return this._updateTxEntityAsync(txEntity);
                }
            }
        } catch (err) {
            if (err instanceof TypeError) {
                // HACK(oskar): web3Wrapper.getTransactionByHashAsync throws a
                // TypeError if the Ethereum node cannot find the transaction
                // and returns NULL instead of the transaction object. We
                // therefore use this to detect this case until @0x/web3-wrapper
                // is fixed.
                if (isExpired) {
                    txEntity.status = TransactionStates.Dropped;
                    return this._updateTxEntityAsync(txEntity);
                }
            } else {
                // if the error is not from a typeerror, we rethrow
                throw err;
            }
        }
        return txEntity;
    }
    // Sets the transaction status to 'aborted' for transactions with the same nonce as the passed in txEntity
    private async _abortTransactionsWithTheSameNonceAsync(txEntity: TransactionEntity): Promise<TransactionEntity[]> {
        const transactionsToAbort = await this._transactionRepository.find({
            where: {
                nonce: txEntity.nonce,
                txHash: Not(txEntity.txHash),
                from: txEntity.from,
            },
        });
        for (const tx of transactionsToAbort) {
            tx.status = TransactionStates.Aborted;
            this._transactionsUpdateCounter.inc({ signer_address: tx.from, status: tx.status }, 1);
            await this._transactionRepository.save(tx);
        }

        return transactionsToAbort;
    }
    private async _getLatestBlockDateAsync(): Promise<Date> {
        const latestBlockTimestamp = await this._web3Wrapper.getBlockTimestampAsync('latest');
        return new Date(latestBlockTimestamp * ONE_SECOND_MS);
    }
    private async _cancelOrSignAndBroadcastTransactionsAsync(): Promise<void> {
        const unsignedTransactions = await this._transactionRepository.find({
            where: [{ status: TransactionStates.Unsubmitted }],
        });
        logger.trace(`found ${unsignedTransactions.length} transactions to sign and broadcast`);
        for (const tx of unsignedTransactions) {
            if (TransactionWatcherSignerService._isUnsubmittedTxExpired(tx)) {
                logger.error({
                    message: `found a transaction in an unsubmitted state waiting longer that ${TX_HASH_RESPONSE_WAIT_TIME_MS}ms`,
                    refHash: tx.refHash,
                    from: tx.from,
                });
                tx.status = TransactionStates.Cancelled;
                await this._transactionRepository.save(tx);
                continue;
            }
            try {
                const signer = await this._getNextSignerAsync();
                await this._signAndBroadcastMetaTxAsync(tx, signer);
            } catch (err) {
                logger.error({
                    message: `failed to sign and broadcast transaction ${JSON.stringify(err)}`,
                    stack: err.stack,
                    refHash: tx.refHash,
                    from: tx.from,
                });
            }
        }
    }
    private _getSignerByPublicAddressOrThrow(publicAddress: string): Signer {
        const signer = this._signers.get(publicAddress);
        if (signer === undefined) {
            throw new Error(`no signer available with this publicAddress: ${publicAddress}`);
        }
        return signer;
    }
    private async _getNextSignerAsync(): Promise<Signer> {
        const sortedSigners = await this._getSortedSignerPublicAddressesByAvailabilityAsync();
        // TODO(oskar) - add random choice for top signers to better distribute
        // the fees.
        const signer = this._signers.get(sortedSigners[0]);
        if (signer === undefined) {
            throw new Error(`signer with public address: ${sortedSigners[0]} is not available`);
        }

        return signer;
    }
    private async _getSortedSignerPublicAddressesByAvailabilityAsync(): Promise<string[]> {
        const map = new Map<string, number>();
        this._availableSignerPublicAddresses.forEach(signerAddress => {
            map.set(signerAddress, 0);
        });
        // TODO(oskar) - move to query builder?
        const res: Array<{ from: string; count: number }> = await this._transactionRepository.query(
            `SELECT transactions.from, COUNT(*) FROM transactions WHERE status in ('submitted','mempool','stuck') GROUP BY transactions.from`,
        );
        res.filter(result => {
            // we exclude from addresses that are not part of the available
            // signer pool
            return this._availableSignerPublicAddresses.includes(result.from);
        }).forEach(result => {
            map.set(result.from, result.count);
        });
        return [...map.entries()]
            .sort((a, b) => {
                return a[1] - b[1];
            })
            .map(entry => entry[0]);
    }
    private async _unstickTransactionAsync(
        tx: TransactionEntity,
        gasPrice: BigNumber,
        signer: Signer,
    ): Promise<string> {
        if (tx.nonce === undefined) {
            throw new Error(`failed to unstick transaction ${tx.txHash} nonce is undefined`);
        }
        const txHash = await signer.sendTransactionToItselfWithNonceAsync(tx.nonce, gasPrice);
        const transactionEntity = TransactionEntity.make({
            refHash: txHash,
            txHash,
            status: TransactionStates.Submitted,
            nonce: tx.nonce,
            gasPrice,
            from: tx.from,
            expectedMinedInSec: META_TXN_RELAY_EXPECTED_MINED_SEC,
        });
        await this._transactionRepository.save(transactionEntity);
        return txHash;
    }
    private async _checkForStuckTransactionsAsync(): Promise<void> {
        const stuckTransactions = await this._transactionRepository.find({
            where: { status: TransactionStates.Stuck },
        });
        if (stuckTransactions.length === 0) {
            return;
        }
        const gasStationPrice = await ethGasStationUtils.getGasPriceOrThrowAsync();
        const targetGasPrice = gasStationPrice.multipliedBy(UNSTICKING_TRANSACTION_GAS_MULTIPLIER);
        for (const tx of stuckTransactions) {
            if (tx.from === undefined) {
                logger.error({
                    message: `unsticking of transaction skipped because the from field is missing, was it removed?`,
                    txHash: tx.txHash,
                });
                continue;
            }
            if (tx.gasPrice !== undefined && tx.gasPrice.isGreaterThanOrEqualTo(targetGasPrice)) {
                logger.warn({
                    message:
                        'unsticking of transaction skipped as the targetGasPrice is less than or equal to the gas price it was submitted with',
                    txHash: tx.txHash,
                    txGasPrice: tx.gasPrice,
                    targetGasPrice,
                });
                continue;
            }
            const signer = this._getSignerByPublicAddressOrThrow(tx.from);
            try {
                await this._unstickTransactionAsync(tx, targetGasPrice, signer);
            } catch (err) {
                logger.error({ message: `failed to unstick transaction ${tx.txHash}`, stack: err.stack });
            }
        }
    }
    private async _checkForConfirmedTransactionsAsync(): Promise<void> {
        // we are checking for transactions that are already in the included
        // state, but can potentially be affected by a blockchain reorg.
        const latestBlockNumber = await this._web3Wrapper.getBlockNumberAsync();
        const transactionsToCheck = await this._transactionRepository.find({
            where: { status: TransactionStates.Included },
        });
        if (transactionsToCheck.length === 0) {
            return;
        }
        for (const tx of transactionsToCheck) {
            if (tx.txHash === undefined || tx.blockNumber === undefined) {
                logger.error({
                    mesage: 'transaction that has an included status is missing a txHash or blockNumber',
                    refHash: tx.refHash,
                    from: tx.from,
                });
                continue;
            }
            const txInBlockchain = await this._web3Wrapper.getTransactionByHashAsync(tx.txHash);
            if (txInBlockchain === undefined) {
                // transaction that was previously included is not identified by
                // the node, we change its status to submitted and see whether
                // or not it will appear again.
                tx.status = TransactionStates.Submitted;
                await this._updateTxEntityAsync(tx);
                continue;
            }
            if (txInBlockchain.blockNumber === null) {
                // transaction that was previously included in a block is now
                // showing without a blockNumber, but exists in the mempool of
                // an ethereum node.
                tx.status = TransactionStates.Mempool;
                tx.blockNumber = undefined;
                await this._updateTxEntityAsync(tx);
                continue;
            } else {
                if (tx.blockNumber !== txInBlockchain.blockNumber) {
                    logger.warn({
                        message:
                            'transaction that was included has a different blockNumber stored than the one returned from RPC',
                        previousBlockNumber: tx.blockNumber,
                        returnedBlockNumber: txInBlockchain.blockNumber,
                    });
                }
                if (tx.blockNumber + NUMBER_OF_BLOCKS_UNTIL_CONFIRMED < latestBlockNumber) {
                    tx.status = TransactionStates.Confirmed;
                    await this._updateTxEntityAsync(tx);
                }
            }
        }
    }
    private async _updateTxEntityAsync(txEntity: TransactionEntity): Promise<TransactionEntity> {
        this._transactionsUpdateCounter.inc({ signer_address: txEntity.from, status: txEntity.status }, 1);
        return this._transactionRepository.save(txEntity);
    }
    private async _updateSignerBalancesAsync(): Promise<void> {
        // TODO(oskar) - use contract to grab all balances in a single RPC call?
        for (const signerAddress of this._availableSignerPublicAddresses) {
            try {
                await this._updateSignerBalanceAsync(signerAddress);
            } catch (err) {
                logger.error({
                    message: `failed to update signer balance: ${JSON.stringify(err)}`,
                    stack: err.stack,
                });
            }
        }
    }
    private async _updateSignerBalanceAsync(signerAddress: string): Promise<void> {
        const signerBalance = await this._web3Wrapper.getBalanceInWeiAsync(signerAddress);
        this._signerBalancesGauge.set(
            { signer_address: signerAddress },
            Web3Wrapper.toUnitAmount(signerBalance, ETH_DECIMALS).toNumber(),
        );
    }
}
