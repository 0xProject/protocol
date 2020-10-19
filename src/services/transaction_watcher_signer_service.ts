import { ContractWrappers } from '@0x/contract-wrappers';
import { BigNumber, intervalUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Counter, Gauge, Summary } from 'prom-client';
import { Connection, Not, Repository } from 'typeorm';

import { ENABLE_PROMETHEUS_METRICS } from '../config';
import {
    ETH_DECIMALS,
    ETH_TRANSFER_GAS_LIMIT,
    GWEI_DECIMALS,
    ONE_SECOND_MS,
    SIGNER_STATUS_DB_KEY,
    TX_HASH_RESPONSE_WAIT_TIME_MS,
    ZERO,
} from '../constants';
import { KeyValueEntity, TransactionEntity } from '../entities';
import { logger } from '../logger';
import { TransactionStates, TransactionWatcherSignerServiceConfig, TransactionWatcherSignerStatus } from '../types';
import { ethGasStationUtils } from '../utils/gas_station_utils';
import { isRateLimitedMetaTransactionResponse, MetaTransactionRateLimiter } from '../utils/rate-limiters';
import { Signer } from '../utils/signer';
import { utils } from '../utils/utils';

const SIGNER_ADDRESS_LABEL = 'signer_address';
const TRANSACTION_STATUS_LABEL = 'status';

export class TransactionWatcherSignerService {
    private readonly _transactionRepository: Repository<TransactionEntity>;
    private readonly _kvRepository: Repository<KeyValueEntity>;
    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _contractWrappers: ContractWrappers;
    private readonly _config: TransactionWatcherSignerServiceConfig;
    private readonly _signers: Map<string, Signer> = new Map();
    private readonly _signerBalancesEth: Map<string, number> = new Map();
    private readonly _availableSignerPublicAddresses: string[];
    private readonly _metricsUpdateTimer: NodeJS.Timer;
    private readonly _transactionWatcherTimer: NodeJS.Timer;
    // Metrics
    private readonly _signerBalancesGauge!: Gauge<string>;
    private readonly _livenessGauge!: Gauge<string>;
    private readonly _transactionsUpdateCounter!: Counter<string>;
    private readonly _gasPriceSummary!: Summary<string>;
    private readonly _rateLimiter?: MetaTransactionRateLimiter;

    public static getSortedSignersByAvailability(signerMap: Map<string, { balance: number; count: number }>): string[] {
        return Array.from(signerMap.entries())
            .sort((a, b) => {
                const [, aSigner] = a;
                const [, bSigner] = b;
                // if the number of pending transactions is the same, we sort
                // the signers by their known balance.
                if (aSigner.count === bSigner.count) {
                    return bSigner.balance - aSigner.balance;
                }
                // otherwise we sort by the least amount of pending transactions.
                return aSigner.count - bSigner.count;
            })
            .map(([address]) => address);
    }
    private static _isUnsubmittedTxExpired(tx: TransactionEntity): boolean {
        return tx.status === TransactionStates.Unsubmitted && Date.now() > tx.expectedAt.getTime();
    }
    constructor(dbConnection: Connection, config: TransactionWatcherSignerServiceConfig) {
        this._config = config;
        this._rateLimiter = this._config.rateLimiter;
        this._transactionRepository = dbConnection.getRepository(TransactionEntity);
        this._kvRepository = dbConnection.getRepository(KeyValueEntity);
        this._web3Wrapper = new Web3Wrapper(config.provider);
        this._signers = new Map<string, Signer>();
        this._contractWrappers = new ContractWrappers(config.provider, {
            chainId: config.chainId,
            contractAddresses: config.contractAddresses,
        });
        this._availableSignerPublicAddresses = config.signerPrivateKeys.map(key => {
            const signer = new Signer(key, config.provider);
            this._signers.set(signer.publicAddress, signer);
            return signer.publicAddress;
        });
        this._metricsUpdateTimer = utils.setAsyncExcludingImmediateInterval(
            async () => this._updateLiveSatusAsync(),
            config.heartbeatIntervalMs,
            (err: Error) => {
                logger.error({
                    message: `transaction watcher failed to update metrics and heartbeat: ${JSON.stringify(err)}`,
                    err: err.stack,
                });
            },
        );
        this._transactionWatcherTimer = utils.setAsyncExcludingImmediateInterval(
            async () => this.syncTransactionStatusAsync(),
            config.transactionPollingIntervalMs,
            (err: Error) => {
                logger.error({
                    message: `transaction watcher failed to sync transaction status: ${JSON.stringify(err)}`,
                    err: err.stack,
                });
            },
        );
        if (ENABLE_PROMETHEUS_METRICS) {
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
            this._livenessGauge = new Gauge({
                name: 'signer_liveness_gauge',
                help: 'Indicator of signer liveness, where 1 is ready to sign 0 is not signing',
            });
        }
    }
    public stop(): void {
        intervalUtils.clearAsyncExcludingInterval(this._transactionWatcherTimer);
        intervalUtils.clearAsyncExcludingInterval(this._metricsUpdateTimer);
    }
    public async syncTransactionStatusAsync(): Promise<void> {
        logger.trace('syncing transaction status');
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
        if (utils.isNil(txEntity.to)) {
            throw new Error('txEntity is missing to');
        }
        if (utils.isNil(txEntity.value)) {
            throw new Error('txEntity is missing value');
        }
        if (utils.isNil(txEntity.gasPrice)) {
            throw new Error('txEntity is missing gasPrice');
        }
        if (utils.isNil(txEntity.data)) {
            throw new Error('txEntity is missing data');
        }
        if (!this._isSignerLiveAsync()) {
            throw new Error('signer is currently not live');
        }
        const { ethereumTxnParams, ethereumTransactionHash } = await signer.signAndBroadcastMetaTxAsync(
            txEntity.to!,
            txEntity.data!,
            txEntity.value!,
            txEntity.gasPrice!,
        );
        txEntity.status = TransactionStates.Submitted;
        txEntity.txHash = ethereumTransactionHash;
        txEntity.nonce = ethereumTxnParams.nonce;
        txEntity.from = ethereumTxnParams.from;
        txEntity.gas = ethereumTxnParams.gas;
        if (ENABLE_PROMETHEUS_METRICS) {
            this._gasPriceSummary.observe(
                { [SIGNER_ADDRESS_LABEL]: txEntity.from },
                Web3Wrapper.toUnitAmount(txEntity.gasPrice!, GWEI_DECIMALS).toNumber(),
            );
        }
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
            await this._updateTxEntityAsync(tx);
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
            if (this._rateLimiter !== undefined) {
                const rateLimitResponse = await this._rateLimiter.isAllowedAsync({
                    apiKey: tx.apiKey!,
                    takerAddress: tx.takerAddress!,
                });
                if (isRateLimitedMetaTransactionResponse(rateLimitResponse)) {
                    logger.warn({
                        message: `cancelling transaction because of rate limiting: ${rateLimitResponse.reason}`,
                        refHash: tx.refHash,
                        from: tx.from,
                        takerAddress: tx.takerAddress,
                        // NOTE: to not leak full keys we log only the part of
                        // the API key that was rate limited.
                        // tslint:disable-next-line:custom-no-magic-numbers
                        apiKey: tx.apiKey!.substring(0, 8),
                    });
                    tx.status = TransactionStates.Cancelled;
                    await this._updateTxEntityAsync(tx);
                    continue;
                }
            }
            if (TransactionWatcherSignerService._isUnsubmittedTxExpired(tx)) {
                logger.error({
                    message: `found a transaction in an unsubmitted state waiting longer than ${TX_HASH_RESPONSE_WAIT_TIME_MS}ms`,
                    refHash: tx.refHash,
                    from: tx.from,
                });
                tx.status = TransactionStates.Cancelled;
                await this._updateTxEntityAsync(tx);
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
        const [selectedSigner] = await this._getSortedSignerPublicAddressesByAvailabilityAsync();
        // TODO(oskar) - add random choice for top signers to better distribute
        // the fees.
        const signer = this._signers.get(selectedSigner);
        if (signer === undefined) {
            throw new Error(`signer with public address: ${selectedSigner} is not available`);
        }

        return signer;
    }
    private async _getSortedSignerPublicAddressesByAvailabilityAsync(): Promise<string[]> {
        const signerMap = new Map<string, { count: number; balance: number }>();
        this._availableSignerPublicAddresses.forEach(signerAddress => {
            const count = 0;
            const balance = this._signerBalancesEth.get(signerAddress) || 0;
            signerMap.set(signerAddress, { count, balance });
        });
        // TODO(oskar) - move to query builder?
        const res: { from: string; count: number }[] = await this._transactionRepository.query(
            `SELECT transactions.from, COUNT(*) FROM transactions WHERE status in ('submitted','mempool','stuck') GROUP BY transactions.from`,
        );
        res.filter(result => {
            // we exclude from addresses that are not part of the available
            // signer pool
            return this._availableSignerPublicAddresses.includes(result.from);
        }).forEach(result => {
            const current = signerMap.get(result.from);
            signerMap.set(result.from, { ...current!, count: result.count });
        });
        return TransactionWatcherSignerService.getSortedSignersByAvailability(signerMap);
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
            to: signer.publicAddress,
            value: ZERO,
            gas: ETH_TRANSFER_GAS_LIMIT,
            expectedMinedInSec: this._config.expectedMinedInSec,
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
        const targetGasPrice = gasStationPrice.multipliedBy(this._config.unstickGasMultiplier);
        for (const tx of stuckTransactions) {
            if (tx.from === undefined) {
                logger.error({
                    message: `unsticking of transaction skipped because the from field is missing, was it removed?`,
                    txHash: tx.txHash,
                });
                continue;
            }
            if (!utils.isNil(tx.gasPrice) && tx.gasPrice!.isGreaterThanOrEqualTo(targetGasPrice)) {
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
                if (tx.blockNumber + this._config.numBlocksUntilConfirmed < latestBlockNumber) {
                    const txReceipt = await this._web3Wrapper.getTransactionReceiptIfExistsAsync(tx.txHash);
                    tx.status = TransactionStates.Confirmed;
                    tx.gasUsed = txReceipt!.gasUsed;
                    // status type can be a string
                    tx.txStatus = utils.isNil(txReceipt!.status)
                        ? tx.txStatus
                        : new BigNumber(txReceipt!.status!).toNumber();
                    await this._updateTxEntityAsync(tx);
                }
            }
        }
    }
    private async _updateTxEntityAsync(txEntity: TransactionEntity): Promise<TransactionEntity> {
        if (ENABLE_PROMETHEUS_METRICS) {
            this._transactionsUpdateCounter.inc(
                { [SIGNER_ADDRESS_LABEL]: txEntity.from, [TRANSACTION_STATUS_LABEL]: txEntity.status },
                1,
            );
        }
        return this._transactionRepository.save(txEntity);
    }
    private async _updateSignerBalancesAsync(): Promise<void> {
        try {
            const balances = await this._contractWrappers.devUtils
                .getEthBalances(this._availableSignerPublicAddresses)
                .callAsync();
            balances.forEach((balance, i) =>
                this._updateSignerBalance(this._availableSignerPublicAddresses[i], balance),
            );
        } catch (err) {
            logger.error({
                message: `failed to update signer balance: ${JSON.stringify(err)}, ${
                    this._availableSignerPublicAddresses
                }`,
                stack: err.stack,
            });
        }
    }
    private _updateSignerBalance(signerAddress: string, signerBalance: BigNumber): void {
        const balanceInEth = Web3Wrapper.toUnitAmount(signerBalance, ETH_DECIMALS).toNumber();
        this._signerBalancesEth.set(signerAddress, balanceInEth);
        if (ENABLE_PROMETHEUS_METRICS) {
            this._signerBalancesGauge.set({ [SIGNER_ADDRESS_LABEL]: signerAddress }, balanceInEth);
        }
    }
    private async _isSignerLiveAsync(): Promise<boolean> {
        // Return immediately if the override is set to false
        if (!this._config.isSigningEnabled) {
            return false;
        }
        const currentFastGasPrice = await ethGasStationUtils.getGasPriceOrThrowAsync();
        const isCurrentGasPriceBelowMax = Web3Wrapper.toUnitAmount(currentFastGasPrice, GWEI_DECIMALS).lt(
            this._config.maxGasPriceGwei,
        );
        const hasAvailableBalance =
            Array.from(this._signerBalancesEth.values()).filter(val => val > this._config.minSignerEthBalance).length >
            0;
        return hasAvailableBalance && isCurrentGasPriceBelowMax;
    }
    private async _updateLiveSatusAsync(): Promise<void> {
        logger.trace('updating metrics');
        await this._updateSignerBalancesAsync();
        logger.trace('heartbeat');
        await this._updateSignerStatusAsync();
    }
    private async _updateSignerStatusAsync(): Promise<void> {
        // TODO: do we need to find the entity first, for UPDATE?
        let statusKV = await this._kvRepository.findOne(SIGNER_STATUS_DB_KEY);
        if (utils.isNil(statusKV)) {
            statusKV = new KeyValueEntity(SIGNER_STATUS_DB_KEY);
        }
        const isLive = await this._isSignerLiveAsync();
        this._livenessGauge.set(isLive ? 1 : 0);
        const statusContent: TransactionWatcherSignerStatus = {
            live: isLive,
            // HACK: We save the time to force the updatedAt update else it will be a noop when state hasn't changed
            timeSinceEpoch: Date.now(),
            // tslint:disable-next-line:no-inferred-empty-object-type
            balances: Array.from(this._signerBalancesEth.entries()).reduce(
                (acc: object, signerBalance: [string, number]): Record<string, number> => {
                    const [from, balance] = signerBalance;
                    return { ...acc, [from]: balance };
                },
                {},
            ),
            gasPrice: Web3Wrapper.toUnitAmount(
                await ethGasStationUtils.getGasPriceOrThrowAsync(),
                GWEI_DECIMALS,
            ).toNumber(),
            maxGasPrice: this._config.maxGasPriceGwei.toNumber(),
        };
        statusKV!.value = JSON.stringify(statusContent);
        await this._kvRepository.save(statusKV!);
    }
}
// tslint:disable-line:max-file-line-count
