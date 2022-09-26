// tslint:disable:max-file-line-count
import { MarketOperation } from '@0x/asset-swapper';
import { OtcOrder, Signature } from '@0x/protocol-utils';
import { SignRequest } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { retry } from '@lifeomic/attempt';
import delay from 'delay';
// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _ from 'lodash';
import { Counter, Gauge, Summary } from 'prom-client';

import { ENABLE_LLR_COOLDOWN, Integrator, LLR_COOLDOWN_DURATION_SECONDS } from '../config';
import {
    ETH_DECIMALS,
    GAS_ESTIMATE_BUFFER,
    GWEI_DECIMALS,
    LLR_COOLDOWN_WINDOW_SECONDS,
    ONE_MINUTE_S,
    ONE_SECOND_MS,
} from '../constants';
import {
    MetaTransactionJobEntity,
    MetaTransactionSubmissionEntity,
    RfqmV2JobEntity,
    RfqmV2TransactionSubmissionEntity,
} from '../entities';
import {
    RfqmJobStatus,
    RfqmTransactionSubmissionStatus,
    RfqmTransactionSubmissionType,
    SubmissionContextStatus,
} from '../entities/types';
import { logger } from '../logger';
import { Approval } from '../types';
import { CacheClient } from '../utils/cache_client';
import { GasStationAttendant } from '../utils/GasStationAttendant';
import { QuoteServerClient } from '../utils/quote_server_client';
import { RfqmDbUtils, storedFeeToFee, storedOtcOrderToOtcOrder } from '../utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { RfqMakerManager } from '../utils/rfq_maker_manager';
import { getSignerFromHash, padSignature } from '../utils/signature_utils';
import { SubmissionContext } from '../utils/SubmissionContext';

import { RfqMakerBalanceCacheService } from './rfq_maker_balance_cache_service';

interface GasFees {
    maxFeePerGas: BigNumber;
    maxPriorityFeePerGas: BigNumber;
}

// https://stackoverflow.com/questions/47632622/typescript-and-filter-boolean
function isDefined<T>(value: T): value is NonNullable<T> {
    return value !== null && value !== undefined;
}

const RFQM_WORKER_BALANCE = new Gauge({
    name: 'rfqm_worker_balance',
    labelNames: ['address', 'chain_id'],
    help: 'Worker balance for RFQM',
});

const RFQM_WORKER_READY = new Counter({
    name: 'rfqm_worker_ready',
    labelNames: ['address', 'chain_id'],
    help: 'A worker passed the readiness check, and is ready to pick up work',
});

const RFQM_WORKER_NOT_READY = new Counter({
    name: 'rfqm_worker_not_ready',
    labelNames: ['address', 'chain_id'],
    help: 'A worker did not pass the readiness check, and was not able to pick up work',
});

const RFQM_JOB_REPAIR = new Gauge({
    name: 'rfqm_job_to_repair',
    labelNames: ['address', 'chain_id'],
    help: 'A submitted job failed and started repair mode',
});

const RFQM_JOB_FAILED_MM_SIGNATURE_FAILED = new Counter({
    name: 'rfqm_job_failed_mm_signature_failed',
    help: 'A job failed because the market maker signature process failed. NOT triggered when the MM declines to sign.',
    labelNames: ['makerUri', 'chain_id'],
});
const RFQM_JOB_MM_REJECTED_LAST_LOOK = new Counter({
    name: 'rfqm_job_mm_rejected_last_look',
    help: 'A job rejected by market maker on last look',
    labelNames: ['makerUri', 'chain_id'],
});

const RFQM_PROCESS_JOB_LATENCY = new Summary({
    name: 'rfqm_process_job_latency',
    labelNames: ['chain_id', 'job_kind'],
    help: 'Latency for the worker processing the job',
});

const RFQM_JOB_COMPLETED = new Counter({
    name: 'rfqm_job_completed',
    help: 'An Rfqm Job completed with no errors',
    labelNames: ['address', 'chain_id', 'job_kind'],
});

const RFQM_JOB_COMPLETED_WITH_ERROR = new Counter({
    name: 'rfqm_job_completed_with_error',
    help: 'An Rfqm Job completed with an error',
    labelNames: ['address', 'chain_id', 'job_kind'],
});

const RFQM_CREATE_ACCESS_LIST_REQUEST = new Counter({
    name: 'rfqm_create_access_list_request_total',
    help: 'Number of requests for eth_createAccessList call',
    labelNames: ['chain_id', 'status'],
});

const RFQM_GAS_ESTIMATE_ACCESS_LIST = new Gauge({
    name: 'rfqm_gas_estimate_acess_list',
    help: 'Gas estimate of transaction with access list',
    labelNames: ['chain_id'],
});

const RFQM_GAS_ESTIMATE_NO_ACCESS_LIST = new Gauge({
    name: 'rfqm_gas_estimate_no_access_list',
    help: 'Gas estimate of transaction without access list',
    labelNames: ['chain_id'],
});

const RFQM_SIGNED_QUOTE_EXPIRY_TOO_SOON = new Counter({
    name: 'rfqm_signed_quote_expiry_too_soon',
    labelNames: ['chain_id'],
    help: 'A signed quote was not queued because it would expire too soon',
});

const RFQM_MINING_LATENCY = new Summary({
    name: 'rfqm_mining_latency',
    labelNames: ['chain_id'],
    help: 'The time in seconds between when the first transaction for a job is sent and when a transaction for the job is mined',
});

const PRICE_DECIMAL_PLACES = 6;

const MIN_GAS_PRICE_INCREASE = 0.1;

const MAX_PRIORITY_FEE_PER_GAS_CAP = new BigNumber(128e9); // The maximum tip we're willing to pay
// Retrying an EIP 1559 transaction: https://docs.alchemy.com/alchemy/guides/eip-1559/retry-eip-1559-tx
const MAX_PRIORITY_FEE_PER_GAS_MULTIPLIER = 1.5; // Increase multiplier for tip with each resubmission cycle
const MAX_FEE_PER_GAS_MULTIPLIER = 1.1; // Increase multiplier in max fee per gas with each cycle; limitation of geth node
// During recovery, we may not be able to successfully execute
// `estimateGasForAsync`. In this case we use this value.
const MAX_GAS_ESTIMATE = 500_000;

// How often the worker should publish a heartbeat
const WORKER_HEARTBEAT_FREQUENCY_MS = ONE_SECOND_MS * 30; // tslint:disable-line: custom-no-magic-numbers

/**
 * The service layer for Gasless Workers.
 *
 * Workers are bots with their own EOAs which pull
 * messages off an SQS queue, retrieve the related
 * job, and submit that job to the blockchain.
 */
export class WorkerService {
    private _lastHeartbeatTime: Date | null = null;

    public static shouldResubmitTransaction(gasFees: GasFees, gasPriceEstimate: BigNumber): boolean {
        // Geth only allows replacement of transactions if the replacement gas price
        // is at least 10% higher than the gas price of the transaction being replaced
        return gasPriceEstimate.gte(gasFees.maxFeePerGas.multipliedBy(MIN_GAS_PRICE_INCREASE + 1));
    }

    // Returns a failure status for an invalid rfqm v2 job or null if job is valid.
    public static validateRfqmV2Job(job: RfqmV2JobEntity, now: Date = new Date()): RfqmJobStatus | null {
        const { makerUri, order, fee } = job;

        if (makerUri === undefined) {
            return RfqmJobStatus.FailedValidationNoMakerUri;
        }

        if (order === null) {
            return RfqmJobStatus.FailedValidationNoOrder;
        }

        if (fee === null) {
            return RfqmJobStatus.FailedValidationNoFee;
        }

        // Orders can expire if any of the following happen:
        // 1) workers are backed up
        // 2) an RFQM order broke during submission and the order is stuck in the queue for a long time.
        const otcOrderStringFields = job.order.order;
        const { expiry } = OtcOrder.parseExpiryAndNonce(new BigNumber(otcOrderStringFields.expiryAndNonce));
        const expiryTimeMs = expiry.times(ONE_SECOND_MS);
        if (expiryTimeMs.isNaN() || expiryTimeMs.lte(now.getTime())) {
            return RfqmJobStatus.FailedExpired;
        }
        if (!job.takerSignature) {
            return RfqmJobStatus.FailedValidationNoTakerSignature;
        }

        return null;
    }

    // Returns a failure status for an invalid meta-transaction job or null if job is valid.
    public static validateMetaTransactionJob(
        job: MetaTransactionJobEntity,
        now: Date = new Date(),
    ): RfqmJobStatus | null {
        const { expiry, fee, metaTransaction, takerSignature } = job;

        if (metaTransaction === null) {
            return RfqmJobStatus.FailedValidationNoOrder;
        }

        if (fee === null) {
            return RfqmJobStatus.FailedValidationNoFee;
        }

        // Orders can expire if any of the following happen:
        // 1) workers are backed up
        // 2) an order broke during submission and the order is stuck in the queue for a long time.
        const expiryTimeMs = expiry.times(ONE_SECOND_MS);
        if (expiryTimeMs.isNaN() || expiryTimeMs.lte(now.getTime())) {
            return RfqmJobStatus.FailedExpired;
        }
        if (!takerSignature) {
            return RfqmJobStatus.FailedValidationNoTakerSignature;
        }

        return null;
    }

    constructor(
        private readonly _chainId: number,
        private readonly _gasStationAttendant: GasStationAttendant,
        private readonly _registryAddress: string,
        private readonly _blockchainUtils: RfqBlockchainUtils,
        private readonly _dbUtils: RfqmDbUtils,
        private readonly _quoteServerClient: QuoteServerClient,
        private readonly _transactionWatcherSleepTimeMs: number,
        private readonly _cacheClient: CacheClient,
        private readonly _rfqMakerBalanceCacheService: RfqMakerBalanceCacheService,
        private readonly _rfqMakerManager: RfqMakerManager,
        private readonly _initialMaxPriorityFeePerGasGwei: number,
        private readonly _enableAccessList?: boolean,
    ) {}

    public async workerBeforeLogicAsync(workerIndex: number, workerAddress: string): Promise<boolean> {
        let gasPrice;
        try {
            gasPrice = await this._gasStationAttendant.getExpectedTransactionGasRateAsync();
        } catch (error) {
            logger.error(
                { errorMessage: error.message },
                'Current gas price is unable to be fetched, marking worker as not ready.',
            );
            RFQM_WORKER_NOT_READY.labels(workerAddress, this._chainId.toString()).inc();
            return false;
        }

        const balance = await this._blockchainUtils.getAccountBalanceAsync(workerAddress);
        const balanceUnitAmount = Web3Wrapper.toUnitAmount(balance, ETH_DECIMALS).decimalPlaces(PRICE_DECIMAL_PLACES);
        RFQM_WORKER_BALANCE.labels(workerAddress, this._chainId.toString()).set(balanceUnitAmount.toNumber());

        // check for outstanding jobs from the worker and resolve them
        const unresolvedJobs = await Promise.all([
            this._dbUtils.findV2UnresolvedJobsAsync(workerAddress, this._chainId),
            this._dbUtils.findUnresolvedMetaTransactionJobsAsync(workerAddress, this._chainId),
        ]).then((x) => x.flat());

        RFQM_JOB_REPAIR.labels(workerAddress, this._chainId.toString()).inc(unresolvedJobs.length);
        for (const job of unresolvedJobs) {
            const { kind } = job;
            let jobIdentifier;

            switch (kind) {
                case 'rfqm_v2_job':
                    jobIdentifier = job.orderHash;
                    break;
                case 'meta_transaction_job':
                    jobIdentifier = job.id;
                    break;
                default:
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ((_x: never): never => {
                        throw new Error('Unreachable');
                    })(kind);
            }

            logger.info({ kind, jobIdentifier, workerAddress }, `Unresolved job found, attempting to reprocess`);
            await this.processJobAsync(jobIdentifier, workerAddress, kind);
        }

        const isWorkerReady = await this._blockchainUtils.isWorkerReadyAsync(workerAddress, balance, gasPrice);
        if (!isWorkerReady) {
            RFQM_WORKER_NOT_READY.labels(workerAddress, this._chainId.toString()).inc();
            return false;
        }

        if (this._lastHeartbeatTime && Date.now() - this._lastHeartbeatTime.getTime() < WORKER_HEARTBEAT_FREQUENCY_MS) {
            return true;
        }

        // Publish a heartbeat if the worker is ready to go
        try {
            if (workerIndex === undefined) {
                throw new Error('Worker index is undefined');
            }
            // NOTE: when merging with `feature/multichain`, update this line with
            // `const chainId = this._chain.chainId.
            const chainId = this._chainId;
            await this._dbUtils.upsertRfqmWorkerHeartbeatToDbAsync(workerAddress, workerIndex, balance, chainId);
            this._lastHeartbeatTime = new Date();
        } catch (error) {
            logger.error(
                { workerAddress, balance, errorMessage: error.message },
                'Worker failed to write a heartbeat to storage',
            );
        }

        RFQM_WORKER_READY.labels(workerAddress, this._chainId.toString()).inc();
        return true;
    }

    /**
     * Top-level logic the worker uses to take a v2 job or meta-transaction job to completion.
     * The identifier (orderHash for v2 job and jod id for meta-transaction job) can come from
     * either an unfinished job found during the worker before logic or from an SQS message.
     *
     * Big picture steps:
     * 1. Fetch the job from the database
     * 2. Prepare the job by validating it (and getting the market maker signature for v2 job).
     *    This step is different for v2 and meta-transaction jobs.
     * 3. Submit a transaction if none exist, wait for mining + confirmation,
     *    and submit new transactions if gas prices rise
     * 4. Finalize the job status
     *
     * This function is the error boundary for job processing; errors will be caught, logged
     * and swallowed. The worker will continue along its lifecycle.
     *
     * This function handles processing latency metrics & job success/fail counters.
     */
    public async processJobAsync(
        identifier: string,
        workerAddress: string,
        kind: (RfqmV2JobEntity | MetaTransactionJobEntity)['kind'] = 'rfqm_v2_job',
    ): Promise<void> {
        logger.info({ kind, identifier, workerAddress }, 'Start process job');
        const timerStopFunction = RFQM_PROCESS_JOB_LATENCY.labels(this._chainId.toString(), kind).startTimer();

        try {
            // Step 1: Find the job
            let job;
            switch (kind) {
                case 'rfqm_v2_job':
                    job = await this._dbUtils.findV2JobByOrderHashAsync(identifier);
                    break;
                case 'meta_transaction_job':
                    job = await this._dbUtils.findMetaTransactionJobByIdAsync(identifier);
                    break;
                default:
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ((_x: never) => {
                        throw new Error('unreachable');
                    })(kind);
            }

            if (!job) {
                throw new Error('No job found for identifier');
            }

            // Step 2: Prepare the job for submission

            // Claim job for worker
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion,@typescript-eslint/no-extra-non-null-assertion
            if (job.workerAddress!! && job.workerAddress !== workerAddress) {
                throw new Error('Worker was sent a job claimed by a different worker');
            }
            job.workerAddress = workerAddress;
            await this._dbUtils.updateRfqmJobAsync(job);

            if (job.approval) {
                // approval and trade workflow
                await this.processApprovalAndTradeAsync(job, workerAddress);
            } else {
                // trade only workflow
                await this.processTradeAsync(job, workerAddress);
            }
            logger.info({ kind, identifier, workerAddress }, 'Job completed without errors');
            RFQM_JOB_COMPLETED.labels(workerAddress, this._chainId.toString(), kind).inc();
        } catch (error) {
            logger.error({ kind, workerAddress, identifier, errorMessage: error.message }, 'Job completed with error');
            RFQM_JOB_COMPLETED_WITH_ERROR.labels(workerAddress, this._chainId.toString(), kind).inc();
        } finally {
            timerStopFunction();
        }
    }

    /**
     * Process approval (gasless approval) and trade (swap with the 0x exchange proxy) submissions. For the first version,
     * they will be processed SEQUENTIALLY. In the future, we want to send the two transaction in parallel.
     * The reason we can't parallelize the submissions is both function would modify job.status.
     *
     * The method would:
     * 1. Perform preliminary check on the job object (and updates job status to `PendingProcessing`)
     * 2. Getting the market maker signature
     * 3. Prepare approval
     * 4. Submit approval
     * 5. Wait until the approval transaction is successfully confirmed
     * 6. Prepare trade (since the method has already got the market maker signature, it's not performed here)
     * 7. Submit trade
     */
    public async processApprovalAndTradeAsync(
        job: RfqmV2JobEntity | MetaTransactionJobEntity,
        workerAddress: string,
    ): Promise<void> {
        const { approval, approvalSignature, kind } = job;
        if (!approval || !approvalSignature) {
            throw new Error('Non-approval job should not be processed by `processApprovalAndTradeAsync`');
        }

        // Perform preliminary check
        await this.checkJobPreprocessingAsync(job);
        if (kind === 'rfqm_v2_job') {
            // Perform last look for rfqm v2 job
            await this.checkLastLookAsync(job, workerAddress, false);
        }

        let tokenToApprove;
        let identifier;
        switch (kind) {
            case 'rfqm_v2_job':
                tokenToApprove = job.order.order.takerToken;
                identifier = job.orderHash;
                break;
            case 'meta_transaction_job':
                tokenToApprove = job.inputToken;
                identifier = job.id;
                break;
            default:
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }

        const approvalCalldata = await this.prepareApprovalAsync(job, tokenToApprove, approval, approvalSignature);
        const approvalStatus = await this.submitToChainAsync({
            kind: job.kind,
            to: tokenToApprove,
            from: workerAddress,
            calldata: approvalCalldata,
            expiry: job.expiry,
            identifier,
            submissionType: RfqmTransactionSubmissionType.Approval,
            onSubmissionContextStatusUpdate: this._getOnSubmissionContextStatusUpdateCallback(
                job,
                RfqmTransactionSubmissionType.Approval,
            ),
        });

        // Prepare and submit trade only if approval transaction is successful
        if (approvalStatus === SubmissionContextStatus.SucceededConfirmed) {
            let tradeCalldata;
            switch (kind) {
                case 'rfqm_v2_job':
                    tradeCalldata = await this.preparerfqmV2TradeAsync(job, workerAddress, false);
                    break;
                case 'meta_transaction_job':
                    tradeCalldata = await this.prepareMetaTransactionTradeAsync(job, workerAddress, false);
                    break;
                default:
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ((_x: never) => {
                        throw new Error('unreachable');
                    })(kind);
            }

            await this.submitToChainAsync({
                kind: job.kind,
                to: this._blockchainUtils.getExchangeProxyAddress(),
                from: workerAddress,
                calldata: tradeCalldata,
                expiry: job.expiry,
                identifier,
                submissionType: RfqmTransactionSubmissionType.Trade,
                onSubmissionContextStatusUpdate: this._getOnSubmissionContextStatusUpdateCallback(
                    job,
                    RfqmTransactionSubmissionType.Trade,
                ),
            });
        }
    }

    /**
     * Process trade (swap with the 0x exchange proxy) submissions. The method would prepare trade calldata
     * and submit the trade to the blockchain. Note that job status would be updated to the corresponding state.
     */
    public async processTradeAsync(
        job: RfqmV2JobEntity | MetaTransactionJobEntity,
        workerAddress: string,
    ): Promise<void> {
        const { kind } = job;

        let calldata;
        let identifier;
        switch (kind) {
            case 'rfqm_v2_job':
                identifier = job.orderHash;
                calldata = await this.preparerfqmV2TradeAsync(job, workerAddress);
                break;
            case 'meta_transaction_job':
                identifier = job.id;
                calldata = await this.prepareMetaTransactionTradeAsync(job, workerAddress);
                break;
            default:
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }

        await this.submitToChainAsync({
            kind: job.kind,
            to: this._blockchainUtils.getExchangeProxyAddress(),
            from: workerAddress,
            calldata,
            expiry: job.expiry,
            identifier,
            submissionType: RfqmTransactionSubmissionType.Trade,
            onSubmissionContextStatusUpdate: this._getOnSubmissionContextStatusUpdateCallback(
                job,
                RfqmTransactionSubmissionType.Trade,
            ),
        });
    }

    /**
     * Perform preliminary checks on a job before processing.
     *
     * The method would:
     * 1. Call `RfqmService.validateRfqmV2Job` / `RfqmService.validateMetaTransactionJob` and check result. If there is an error, update the job status and throw exception
     * 2. Make sure job.takerSignature is present or throw exception
     * 3. Update job status to `PendingProcessing` if current status is `PendingEnqueued`
     */
    public async checkJobPreprocessingAsync(
        job: RfqmV2JobEntity | MetaTransactionJobEntity,
        now: Date = new Date(),
    ): Promise<void> {
        const { kind, takerSignature } = job;
        let identifier;
        let errorStatus;

        switch (kind) {
            case 'rfqm_v2_job':
                identifier = job.orderHash;
                errorStatus = WorkerService.validateRfqmV2Job(job, now);
                break;
            case 'meta_transaction_job':
                identifier = job.id;
                errorStatus = WorkerService.validateMetaTransactionJob(job, now);
                break;
            default:
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }

        if (errorStatus !== null) {
            job.status = errorStatus;
            await this._dbUtils.updateRfqmJobAsync(job);

            if (errorStatus === RfqmJobStatus.FailedExpired) {
                RFQM_SIGNED_QUOTE_EXPIRY_TOO_SOON.labels(this._chainId.toString()).inc();
            }
            logger.error({ kind, identifier, errorStatus }, 'Job failed validation');
            throw new Error('Job failed validation');
        }

        // Existence of taker signature has already been checked by
        // `RfqmService.validateJob(job)`. Refine the type.
        if (!takerSignature) {
            throw new Error('No taker signature present');
        }

        if (job.status === RfqmJobStatus.PendingEnqueued) {
            job.status = RfqmJobStatus.PendingProcessing;
            await this._dbUtils.updateRfqmJobAsync(job);
        }
    }

    /**
     * Prepares a rfqm v2 / meta-transaction job for approval submission by validatidating the job and constructing
     * the calldata.
     *
     * Note that `job.status` would be modified to `FailedEthCallFailed` if transaction simulation failed.
     *
     * Handles retries of retryable errors. Throws for unretriable errors. Updates job in database.
     *
     * @returns The generated calldata for approval submission type.
     * @throws If the approval cannot be submitted (e.g. it is expired).
     */
    public async prepareApprovalAsync(
        job: RfqmV2JobEntity | MetaTransactionJobEntity,
        tokenToApprove: string,
        approval: Approval,
        siganature: Signature,
    ): Promise<string> {
        const { kind } = job;
        const calldata = await this._blockchainUtils.generateApprovalCalldataAsync(
            tokenToApprove,
            approval,
            siganature,
        );

        let identifier;
        let transactionSubmissions;
        // Check to see if we have already submitted an approval transaction for this job. If we have, the job has already
        // been checked and we can skip `eth_call` validation.
        switch (kind) {
            case 'rfqm_v2_job':
                identifier = job.orderHash;
                transactionSubmissions = await this._dbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    identifier,
                    RfqmTransactionSubmissionType.Approval,
                );
                break;
            case 'meta_transaction_job':
                identifier = job.id;
                transactionSubmissions = await this._dbUtils.findMetaTransactionSubmissionsByJobIdAsync(
                    identifier,
                    RfqmTransactionSubmissionType.Approval,
                );
                break;
            default:
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }

        if (transactionSubmissions.length) {
            if (!job.takerSignature) {
                // This shouldn't happen
                throw new Error('Encountered a job with submissions but no taker signature');
            }
            if (job.kind === 'rfqm_v2_job' && !job.makerSignature) {
                // This shouldn't happen
                throw new Error('Encountered a job with submissions but no maker signature');
            }

            return calldata;
        }

        // Simulate the transaction
        try {
            await retry(
                async () => {
                    // Use `estimateGasForAsync` to simulate the transaction. In ethers.js, provider.call and
                    // provider.send('eth_call', ...) might not throw exception and the behavior might be dependent
                    // on providers. Revisit this later
                    return this._blockchainUtils.estimateGasForAsync({ to: tokenToApprove, data: calldata });
                },
                {
                    delay: ONE_SECOND_MS,
                    factor: 1,
                    maxAttempts: 3,
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    handleError: (error, context, _options) => {
                        const { attemptNum: attemptNumber, attemptsRemaining } = context;
                        logger.warn(
                            { kind, attemptNumber, attemptsRemaining, errorMessage: error.message, stack: error.stack },
                            'Error during eth_call approval validation. Retrying.',
                        );
                    },
                },
            );
        } catch (error) {
            job.status = RfqmJobStatus.FailedEthCallFailed;
            await this._dbUtils.updateRfqmJobAsync(job);

            logger.error(
                { kind, identifier, errorMessage: error.message, stack: error.stack },
                'eth_call approval validation failed',
            );
            throw new Error('Eth call approval validation failed');
        }

        return calldata;
    }

    /**
     * Prepares an RfqmV2 Job for trade submission by validatidating the job, obtaining the
     * market maker signature, and constructing the calldata.
     *
     * Note that `job.status` would be modified to corresponding status. For example, if maker signature
     * is not valid, `job.status` would be set to `FailedSignFailed`.
     *
     * `shouldCheckLastLook` determines if the preliminary job check and getting market maker sigature
     * would be performed and is default to `true`.
     *
     * Handles retries of retryable errors. Throws for unretriable errors, and logs
     * ONLY IF the log needs more information than the orderHash and workerAddress,
     * which are logged by the `processJobAsync` routine.
     * Updates job in database.
     *
     * @returns The generated calldata for trade submission type.
     * @throws If the trade cannot be submitted (e.g. it is expired).
     */
    public async preparerfqmV2TradeAsync(
        job: RfqmV2JobEntity,
        workerAddress: string,
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-inferrable-types
        shouldCheckLastLook: boolean = true,
        now: Date = new Date(),
    ): Promise<string> {
        /**
         * Ask: This is the probably the only change I made to the old trade only workflow. To change from making a copy of parameter
         * and then returning the copied value to change parameter value directly. The rationale behind is to make the style consistent
         * with the new generalized `submitToChainAsync` (it has to use changing parameter value paradigm in order to work). Let me know
         * if you don't like this change.
         */
        const { makerUri, order, orderHash } = job;
        const otcOrder = storedOtcOrderToOtcOrder(order);

        // Check to see if we have already submitted a transaction for this job.
        // If we have, the job is already prepared and we can skip ahead.
        const transactionSubmissions = await this._dbUtils.findV2TransactionSubmissionsByOrderHashAsync(job.orderHash);
        if (transactionSubmissions.length) {
            if (!job.makerSignature) {
                // This shouldn't happen
                throw new Error('Encountered a job with submissions but no maker signature');
            }
            if (!job.takerSignature) {
                // This shouldn't happen
                throw new Error('Encountered a job with submissions but no taker signature');
            }
            const existingSubmissionCalldata = this._blockchainUtils.generateTakerSignedOtcOrderCallData(
                otcOrder,
                job.makerSignature,
                job.takerSignature,
                job.isUnwrap,
                job.affiliateAddress,
            );
            return existingSubmissionCalldata;
        }

        if (shouldCheckLastLook) {
            // Perform the preliminary job check and getting market maker sigature
            await this.checkJobPreprocessingAsync(job, now);
            await this.checkLastLookAsync(job, workerAddress, true);
        }

        // Maker signature must already be defined here -- refine the type
        if (!job.makerSignature) {
            throw new Error('Maker signature does not exist');
        }
        // Taker signature must already be defined here -- refine the type
        if (!job.takerSignature) {
            throw new Error('Taker signature does not exist');
        }

        // Verify the signer was the maker
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const signerAddress = getSignerFromHash(orderHash, job.makerSignature!).toLowerCase();
        const makerAddress = order.order.maker.toLowerCase();
        if (signerAddress !== makerAddress) {
            logger.info({ signerAddress, makerAddress, orderHash, makerUri }, 'Possible use of smart contract wallet');
            const isValidSigner = await this._blockchainUtils.isValidOrderSignerAsync(makerAddress, signerAddress);
            if (!isValidSigner) {
                job.status = RfqmJobStatus.FailedSignFailed;
                await this._dbUtils.updateRfqmJobAsync(job);
                throw new Error('Invalid order signer address');
            }
        }

        // Generate the calldata
        const calldata = this._blockchainUtils.generateTakerSignedOtcOrderCallData(
            otcOrder,
            job.makerSignature,
            job.takerSignature,
            job.isUnwrap,
            job.affiliateAddress,
        );

        // With the Market Maker signature, execute a full eth_call to validate the
        // transaction via `estimateGasForFillTakerSignedOtcOrderAsync`
        try {
            await retry(
                async () => {
                    // Maker signature must already be defined here -- refine the type
                    if (!job.makerSignature) {
                        throw new Error('Maker signature does not exist');
                    }
                    // Taker signature must already be defined here -- refine the type
                    if (!job.takerSignature) {
                        throw new Error('Taker signature does not exist');
                    }

                    return this._blockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                        otcOrder,
                        job.makerSignature,
                        job.takerSignature,
                        workerAddress,
                        job.isUnwrap,
                    );
                },
                {
                    delay: ONE_SECOND_MS,
                    factor: 1,
                    maxAttempts: 3,
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    handleError: (error, context, _options) => {
                        const { attemptNum: attemptNumber, attemptsRemaining } = context;
                        logger.warn(
                            { orderHash, makerUri, attemptNumber, attemptsRemaining, error: error.message },
                            'Error during eth_call validation when preparing otc order trade. Retrying',
                        );
                    },
                },
            );
        } catch (error) {
            job.status = RfqmJobStatus.FailedEthCallFailed;
            await this._dbUtils.updateRfqmJobAsync(job);

            logger.error(
                { orderHash, error: error.message },
                'eth_call validation failed when preparing otc order trade',
            );

            // Attempt to gather extra context upon eth_call failure
            try {
                const [makerBalance] = await this._rfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(
                    this._chainId,
                    { owner: otcOrder.maker, token: otcOrder.makerToken },
                );
                const [takerBalance] = await this._blockchainUtils.getMinOfBalancesAndAllowancesAsync({
                    owner: otcOrder.taker,
                    token: otcOrder.takerToken,
                });
                const blockNumber = await this._blockchainUtils.getCurrentBlockAsync();
                logger.info(
                    {
                        makerBalance,
                        takerBalance,
                        calldata,
                        blockNumber,
                        orderHash,
                        order: otcOrder,
                        bucket: otcOrder.nonceBucket,
                        nonce: otcOrder.nonce,
                    },
                    'Extra context after eth_call validation failed when preparing otc order trade',
                );
            } catch (error) {
                logger.warn(
                    { orderHash },
                    'Failed to get extra context after eth_call validation failed when preparing otc order trade',
                );
            }
            throw new Error('Eth call validation failed when preparing otc order trade');
        }

        return calldata;
    }

    /**
     * Prepares a meta-transaction job for trade submission by validatidating the job and constructing the calldata.
     *
     * Note that `job.status` would be modified to corresponding status. For example, if the meta-transaction expires,
     * `job.status` would be set to `FailedFailedExpired`.
     *
     * Handles retries of retryable errors. Throws for unretriable errors, and logs
     * ONLY IF the log needs more information than the orderHash and workerAddress,
     * which are logged by the `processJobAsync` routine.
     * Updates job in database.
     *
     * @returns The generated calldata for trade submission type.
     * @throws If the trade cannot be submitted (e.g. it is expired).
     */
    public async prepareMetaTransactionTradeAsync(
        job: MetaTransactionJobEntity,
        workerAddress: string,
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-inferrable-types
        shouldValidateJob: boolean = true,
        now: Date = new Date(),
    ): Promise<string> {
        // ASK: What's the difference bewtween `metaTransaction.signer` vs `metaTransaction.sender`?
        //      Which one is the taker address?
        const { affiliateAddress, id: jobId, inputToken, metaTransaction, takerAddress, takerSignature } = job;

        // Check to see if we have already submitted a transaction for this job.
        // If we have, the job is already prepared and we can skip ahead.
        const transactionSubmissions = await this._dbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId);
        if (transactionSubmissions.length) {
            if (!takerSignature) {
                // This shouldn't happen
                throw new Error('Encountered a job with submissions but no taker signature');
            }
            const existingSubmissionCalldata = this._blockchainUtils.generateMetaTransactionCallData(
                metaTransaction,
                takerSignature,
                affiliateAddress,
            );
            return existingSubmissionCalldata;
        }

        if (shouldValidateJob) {
            // Perform the preliminary job check
            await this.checkJobPreprocessingAsync(job, now);
        }

        // Taker signature must already be defined here -- refine the type
        if (!takerSignature) {
            throw new Error('Taker signature does not exist');
        }

        // Generate the calldata
        const calldata = this._blockchainUtils.generateMetaTransactionCallData(
            metaTransaction,
            takerSignature,
            affiliateAddress,
        );

        // execute a full eth_call to validate the
        // transaction via `estimateGasForAsync`
        try {
            await retry(
                async () => {
                    // The following gas fee operations are added because `executeMetaTransaction` in 0x Exchange Proxy
                    // would check whether the gas price of the transaction is within a window. If left empty, it will
                    // fail the simulation. The gas fee estimation below is the same as the first gas fee estimation
                    // used in `submitToChain`.
                    const gasPriceEstimate = await this._gasStationAttendant.getExpectedTransactionGasRateAsync();
                    const initialMaxPriorityFeePerGas = new BigNumber(this._initialMaxPriorityFeePerGasGwei).times(
                        Math.pow(10, GWEI_DECIMALS),
                    );
                    const gasFees: GasFees = {
                        maxFeePerGas: gasPriceEstimate.multipliedBy(2).plus(initialMaxPriorityFeePerGas),
                        maxPriorityFeePerGas: initialMaxPriorityFeePerGas,
                    };

                    return this._blockchainUtils.estimateGasForAsync({
                        from: workerAddress,
                        to: this._blockchainUtils.getExchangeProxyAddress(),
                        data: calldata,
                        maxFeePerGas: gasFees.maxFeePerGas.toString(),
                        maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas.toString(),
                    });
                },
                {
                    delay: ONE_SECOND_MS,
                    factor: 1,
                    maxAttempts: 3,
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    handleError: (error, context, _options) => {
                        const { attemptNum: attemptNumber, attemptsRemaining } = context;
                        logger.warn(
                            { jobId, attemptNumber, attemptsRemaining, error: error.message },
                            'Error during eth_call validation when preparing meta-transaction trade. Retrying',
                        );
                    },
                },
            );
        } catch (error) {
            job.status = RfqmJobStatus.FailedEthCallFailed;
            await this._dbUtils.updateRfqmJobAsync(job);

            logger.error(
                { jobId, error: error.message },
                'eth_call validation failed when preparing meta-transaction trade',
            );

            // Attempt to gather extra context upon eth_call failure
            try {
                const [takerBalance] = await this._blockchainUtils.getMinOfBalancesAndAllowancesAsync([
                    { owner: takerAddress, token: inputToken },
                ]);
                const blockNumber = await this._blockchainUtils.getCurrentBlockAsync();
                logger.info(
                    {
                        calldata,
                        blockNumber,
                        jobId,
                        metaTransaction,
                        takerBalance,
                    },
                    'Extra context after eth_call validation failed when preparing meta-transaction trade',
                );
            } catch (error) {
                logger.warn(
                    { jobId },
                    'Failed to get extra context after eth_call validation failed when preparing meta-transaction trade ',
                );
            }
            throw new Error('Eth call validation failed when preparing meta-transaction trade');
        }

        return calldata;
    }

    /**
     * Check last look by getting market maker signature. Handles retries when making request to market maker servers.
     *
     * When verifying the order is fillable by both the maker and the taker:
     * - If `shouldCheckAllowance` is false, the method would only check balances but not the allowances the maker and
     *   the taker set for 0x exchange proxy because the taker allowance will not be set when `checkLastLookAsync` is called as we
     *   want to call this method as soon as possible to mitigate the latency brought by sequential submissions
     *   (which would lead to higher decline to sign rate).
     * - Otherwise, both balances and allowances would be checked.
     */
    public async checkLastLookAsync(
        job: RfqmV2JobEntity,
        workerAddress: string,
        shouldCheckAllowance: boolean,
    ): Promise<void> {
        const { makerUri, order, orderHash, takerSignature } = job;
        const otcOrder = storedOtcOrderToOtcOrder(order);
        let { makerSignature } = job;

        if (makerSignature) {
            // Market Maker had already signed order
            logger.info({ workerAddress, orderHash }, 'Order already signed');
        } else {
            // validate that order is fillable by both the maker and the taker according to balances (and allowances
            // when `shouldCheckAllowance` is true)
            const [makerBalance] = await this._rfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(this._chainId, {
                owner: otcOrder.maker,
                token: otcOrder.makerToken,
            });
            const [takerBalance] = shouldCheckAllowance
                ? await this._blockchainUtils.getMinOfBalancesAndAllowancesAsync({
                      owner: otcOrder.taker,
                      token: otcOrder.takerToken,
                  })
                : await this._blockchainUtils.getTokenBalancesAsync({
                      owner: otcOrder.taker,
                      token: otcOrder.takerToken,
                  });

            if (makerBalance.lt(otcOrder.makerAmount) || takerBalance.lt(otcOrder.takerAmount)) {
                logger.error(
                    {
                        orderHash,
                        makerBalance,
                        takerBalance,
                        makerAmount: otcOrder.makerAmount,
                        takerAmount: otcOrder.takerAmount,
                    },
                    'Order failed pre-sign validation',
                );
                job.status = RfqmJobStatus.FailedPresignValidationFailed;
                await this._dbUtils.updateRfqmJobAsync(job);
                throw new Error('Order failed pre-sign validation');
            }

            if (!takerSignature) {
                logger.error('Order failed pre-sign validation due to empty takerSignature');
                job.status = RfqmJobStatus.FailedPresignValidationFailed;
                await this._dbUtils.updateRfqmJobAsync(job);
                throw new Error('Order failed pre-sign validation due to empty takerSignature');
            }

            const signRequest: SignRequest = {
                expiry: job.expiry,
                fee: storedFeeToFee(job.fee),
                order: otcOrder,
                orderHash,
                takerSignature,
            };

            // "Last Look" in v1 is replaced by market maker order signing in v2.
            const signAttemptTimeMs = Date.now();
            try {
                makerSignature = await retry(
                    async () =>
                        this._quoteServerClient
                            .signV2Async(makerUri, job.integratorId ?? '', signRequest)
                            .then((s) => s ?? null),
                    {
                        delay: ONE_SECOND_MS,
                        factor: 2,
                        maxAttempts: 3,
                        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        handleError: (error, context, _options) => {
                            const { attemptNum: attemptNumber, attemptsRemaining } = context;
                            logger.warn(
                                { orderHash, makerUri, attemptNumber, attemptsRemaining, error: error.message },
                                'Error encountered while attempting to get market maker signature',
                            );
                        },
                    },
                );
            } catch (error) {
                // The sign process has failed after retries
                RFQM_JOB_FAILED_MM_SIGNATURE_FAILED.labels(makerUri, this._chainId.toString()).inc();
                logger.error(
                    { orderHash, makerUri, error: error.message },
                    'RFQM v2 job failed due to market maker sign failure',
                );
                job.status = RfqmJobStatus.FailedSignFailed;
                await this._dbUtils.updateRfqmJobAsync(job);
                throw new Error('Job failed during market maker sign attempt');
            }

            logger.info({ makerUri, signed: !!makerSignature, orderHash }, 'Got signature response from market maker');

            if (!makerSignature) {
                // Market Maker has declined to sign the transaction
                RFQM_JOB_MM_REJECTED_LAST_LOOK.labels(makerUri, this._chainId.toString()).inc();
                job.lastLookResult = false;
                job.status = RfqmJobStatus.FailedLastLookDeclined;
                await this._dbUtils.updateRfqmJobAsync(job);

                if (ENABLE_LLR_COOLDOWN) {
                    try {
                        const quote = await this._dbUtils.findV2QuoteByOrderHashAsync(orderHash);
                        if (quote === null) {
                            throw new Error(`Failed to find quote with order hash ${orderHash}`);
                        }

                        // `bad` last look rejection, rejected within the cooldown window
                        if (
                            signAttemptTimeMs - quote.createdAt.valueOf() <
                            LLR_COOLDOWN_WINDOW_SECONDS * ONE_SECOND_MS
                        ) {
                            const makerId = this._rfqMakerManager.findMakerIdWithRfqmUri(makerUri);
                            if (makerId === null) {
                                throw new Error(`Failed to find maker ID with RFQm URI ${makerUri}`);
                            }

                            const cooldownEndTimeMs = signAttemptTimeMs + LLR_COOLDOWN_DURATION_SECONDS * ONE_SECOND_MS;

                            // schedule cooldown
                            const isScheduleUpdated = await this._cacheClient.addMakerToCooldownAsync(
                                makerId,
                                cooldownEndTimeMs,
                                this._chainId,
                                otcOrder.makerToken,
                                otcOrder.takerToken,
                            );

                            logger.info(
                                {
                                    makerId,
                                    chainId: this._chainId,
                                    makerToken: otcOrder.makerToken,
                                    takerToken: otcOrder.takerToken,
                                    startTime: signAttemptTimeMs,
                                    endTime: cooldownEndTimeMs,
                                    orderHash,
                                    isScheduleUpdated,
                                },
                                'LLR cooldown scheduled',
                            );

                            try {
                                // insert cooldown entry to db for record keeping
                                await this._dbUtils.writeV2LastLookRejectionCooldownAsync(
                                    makerId,
                                    this._chainId,
                                    otcOrder.makerToken,
                                    otcOrder.takerToken,
                                    new Date(signAttemptTimeMs), // startTime
                                    new Date(cooldownEndTimeMs), // endTime
                                    orderHash,
                                );
                            } catch (e) {
                                logger.warn({ orderHash, errorMessage: e.message }, 'Saving LLR cooldown failed');
                            }
                        }
                    } catch (error) {
                        logger.warn(
                            { errorMessage: error.message },
                            'Encountered error when detecting bad LLR and scheduling cooldown',
                        );
                    }
                }

                // We'd like some data on how much the price the market maker is offering
                // has changed. We query the market maker's price endpoint with the same
                // trade they've just declined to sign and log the result.
                try {
                    const declineToSignPriceCheckTimeMs = Date.now();
                    const otcOrderParams = QuoteServerClient.makeQueryParameters({
                        chainId: this._chainId,
                        txOrigin: this._registryAddress,
                        takerAddress: otcOrder.taker,
                        marketOperation: MarketOperation.Sell,
                        buyTokenAddress: otcOrder.makerToken,
                        sellTokenAddress: otcOrder.takerToken,
                        assetFillAmount: otcOrder.takerAmount,
                        isLastLook: true,
                        fee: storedFeeToFee(job.fee),
                    });
                    // Instead of adding a dependency to `ConfigManager` to get the actual integrator
                    // (we only have the ID at this point), just create a stand-in.
                    // This will send the same integrator ID to the market maker; they will not be
                    // able to tell the difference.
                    // `logRfqMakerNetworkInteraction` does use the `label`, however, but I think the
                    // tradeoff is reasonable.
                    const integrator: Integrator = {
                        apiKeys: [],
                        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        integratorId: job.integratorId!,
                        allowedChainIds: [this._chainId],
                        label: 'decline-to-sign-price-check',
                        plp: true,
                        rfqm: true,
                        rfqt: true,
                    };
                    const priceResponse = await this._quoteServerClient.getPriceV2Async(
                        job.makerUri,
                        integrator,
                        otcOrderParams,
                        (u: string) => `${u}/rfqm/v2/price`,
                    );
                    if (!priceResponse) {
                        throw new Error('Failed to get a price response');
                    }
                    const { makerAmount: priceCheckMakerAmount, takerAmount: priceCheckTakerAmount } = priceResponse;
                    const originalPrice = otcOrder.makerAmount.dividedBy(priceCheckTakerAmount);
                    const priceAfterReject = priceCheckMakerAmount.dividedBy(priceCheckTakerAmount);
                    const bipsFactor = 10000;
                    const priceDifferenceBips = originalPrice
                        .minus(priceAfterReject)
                        .dividedBy(originalPrice)
                        .absoluteValue()
                        .times(bipsFactor)
                        .toPrecision(1);
                    // The time, in seconds, between when we initiated the sign attempt and when we
                    // initiated the price check after the maker declined to sign.
                    const priceCheckDelayS = (declineToSignPriceCheckTimeMs - signAttemptTimeMs) / ONE_SECOND_MS;
                    logger.info(
                        {
                            orderHash,
                            originalPrice: originalPrice.toNumber(),
                            priceAfterReject: priceAfterReject.toNumber(),
                            priceCheckDelayS,
                            priceDifferenceBips,
                        },
                        'Decline to sign price check',
                    );
                    try {
                        job.llRejectPriceDifferenceBps = parseInt(priceDifferenceBips, 10);
                        await this._dbUtils.updateRfqmJobAsync(job);
                    } catch (e) {
                        logger.warn({ orderHash, errorMessage: e.message }, 'Saving LL reject price difference failed');
                    }
                } catch (error) {
                    logger.warn(
                        { errorMessage: error.message },
                        'Encountered error during decline to sign price check',
                    );
                }
                throw new Error('Market Maker declined to sign');
            }

            // Certain market makers are returning signature components which are missing
            // leading bytes. Add them if they don't exist.
            const paddedSignature = padSignature(makerSignature);
            if (paddedSignature.r !== makerSignature.r || paddedSignature.s !== makerSignature.s) {
                logger.warn(
                    { orderHash, r: paddedSignature.r, s: paddedSignature.s },
                    'Got market maker signature with missing bytes',
                );
                makerSignature = paddedSignature;
            }

            job.makerSignature = paddedSignature;
            job.lastLookResult = true;
            job.status = RfqmJobStatus.PendingLastLookAccepted;
            await this._dbUtils.updateRfqmJobAsync(job);
        }

        // Maker signature must already be defined here -- refine the type
        if (!makerSignature) {
            throw new Error('Maker signature does not exist');
        }

        // Verify the signer was the maker
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const signerAddress = getSignerFromHash(orderHash, makerSignature!).toLowerCase();
        const makerAddress = order.order.maker.toLowerCase();
        if (signerAddress !== makerAddress) {
            logger.info({ signerAddress, makerAddress, orderHash, makerUri }, 'Possible use of smart contract wallet');
            const isValidSigner = await this._blockchainUtils.isValidOrderSignerAsync(makerAddress, signerAddress);
            if (!isValidSigner) {
                job.status = RfqmJobStatus.FailedSignFailed;
                await this._dbUtils.updateRfqmJobAsync(job);
                throw new Error('Invalid order signer address');
            }
        }
    }

    /**
     * Submits a specific type of submission to the blockchain.
     *
     * First checks to see if there are previous transactions with the submission type and enters the
     * watch loop; if not, submits an initial transaction and enters the watch loop.
     *
     * During the watch loop, waits for a transaction to be mined and confirmed;
     * replaces the transaction if gas prices rise while a transactions are in the mempool.
     *
     * @param opts Options object that contains:
     *        - `to`: The address to send to.
     *        - `from`: The address submitting the transaction (usually the worker address).
     *        - `calldata`: Calldata to submit.
     *        - `expiry`: Exiry before the submission is considered invalid.
     *        - `identifier`: The job identifier. For rfqm_v2_job, it should be order hash; for meta-transaction, it should be job id.
     *        - `submissionType`: The type of submission.
     *        - `onSubmissionContextStatusUpdate`: Callback to perform appropriate actions when the submission context statuses change.
     *        - `now`: The current time.
     * @returns FailedRevertedConfirmed or SucceededConfirmed.
     * @throws Submission context status is FailedExpired or unhandled exceptions.
     */
    public async submitToChainAsync(opts: {
        kind: (RfqmV2JobEntity | MetaTransactionJobEntity)['kind'];
        to: string;
        from: string;
        calldata: string;
        expiry: BigNumber;
        identifier: string;
        submissionType: RfqmTransactionSubmissionType;
        onSubmissionContextStatusUpdate: (
            newSubmissionContextStatus: SubmissionContextStatus,
            oldSubmissionContextStatus?: SubmissionContextStatus,
        ) => Promise<void>;
    }): Promise<SubmissionContextStatus.FailedRevertedConfirmed | SubmissionContextStatus.SucceededConfirmed> {
        const { kind, to, from, calldata, expiry, identifier, submissionType, onSubmissionContextStatusUpdate } = opts;

        let previousSubmissionsWithPresubmits;
        switch (kind) {
            case 'rfqm_v2_job':
                previousSubmissionsWithPresubmits = await this._dbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    identifier,
                    submissionType,
                );
                break;
            case 'meta_transaction_job':
                previousSubmissionsWithPresubmits = await this._dbUtils.findMetaTransactionSubmissionsByJobIdAsync(
                    identifier,
                    submissionType,
                );
                break;
            default:
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }

        const previousSubmissions = await this._recoverPresubmitTransactionsAsync(previousSubmissionsWithPresubmits);

        const gasPriceEstimate = await this._gasStationAttendant.getExpectedTransactionGasRateAsync();

        // For the first submission, we use the "fast" gas estimate to approximate the base fee.
        // We use the strategy outlined in https://www.blocknative.com/blog/eip-1559-fees --
        // The `maxFeePerGas` is 2x the base fee (plus priority tip). Since we don't have a
        // handy oracle for the en vogue priorty fee we start with 2 gwei and work up from there.
        const initialMaxPriorityFeePerGas = new BigNumber(this._initialMaxPriorityFeePerGasGwei).times(
            Math.pow(10, GWEI_DECIMALS),
        );

        let gasFees: GasFees = {
            maxFeePerGas: gasPriceEstimate.multipliedBy(2).plus(initialMaxPriorityFeePerGas),
            maxPriorityFeePerGas: initialMaxPriorityFeePerGas,
        };

        let submissionContext;
        let nonce;
        let gasEstimate;

        if (!previousSubmissions.length) {
            // There's an edge case here where there are previous submissions but they're all in `PRESUBMIT`.
            // Those are filtered out if they can't be found on the blockchain so we end up here.
            // If this occurs we need to check if the transaction is expired.
            const nowSeconds = new BigNumber(new Date().getTime() / ONE_SECOND_MS);

            if (expiry.isLessThan(nowSeconds)) {
                await onSubmissionContextStatusUpdate(SubmissionContextStatus.FailedExpired);
                throw new Error(`Exceed expiry ${expiry} for kind ${kind} and submission type ${submissionType}`);
            }

            logger.info({ kind, identifier, from }, 'Attempting to submit first transaction');
            await onSubmissionContextStatusUpdate(SubmissionContextStatus.PendingSubmitted);

            logger.info(
                {
                    kind,
                    gasFees,
                    gasPriceEstimate,
                    identifier,
                    submissionCount: 1,
                    from,
                    submissionType,
                },
                'Submitting transaction',
            );

            nonce = await this._blockchainUtils.getNonceAsync(from);
            const gasEstimateWithoutBuffer = await this._blockchainUtils.estimateGasForAsync({
                to,
                from,
                data: calldata,
                // The following gas fee properties are added because `executeMetaTransaction` in 0x Exchange Proxy
                // would check whether the gas price of the transaction is within a window. If left empty, it will
                // fail the simulation.
                maxFeePerGas: gasFees.maxFeePerGas.toString(),
                maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas.toString(),
            });
            // Add buffer to gas estimate returned by `eth_estimateGas` as the RPC method
            // tends to under estimate gas usage
            gasEstimate = Math.ceil((GAS_ESTIMATE_BUFFER + 1) * gasEstimateWithoutBuffer);
            let accessListWithGas;

            if (this._enableAccessList) {
                try {
                    accessListWithGas = await this._blockchainUtils.createAccessListForAsync({
                        to,
                        from,
                        data: calldata,
                    });
                    RFQM_CREATE_ACCESS_LIST_REQUEST.labels(this._chainId.toString(), 'success').inc();
                } catch (error) {
                    RFQM_CREATE_ACCESS_LIST_REQUEST.labels(this._chainId.toString(), 'failure').inc();
                    logger.warn({ kind, calldata, from }, 'Failed to create access list');
                }

                if (accessListWithGas !== undefined && accessListWithGas.gasEstimate) {
                    // Add buffer to gas estimate returned by `eth_estimateGas` as the RPC method
                    // tends to under estimate gas usage
                    accessListWithGas.gasEstimate = Math.ceil(
                        (GAS_ESTIMATE_BUFFER + 1) * accessListWithGas.gasEstimate,
                    );

                    logger.info(
                        { gasEstimate, accessListGasEstimate: accessListWithGas.gasEstimate },
                        'Regular gas estimate vs access list gas estimate',
                    );
                    RFQM_GAS_ESTIMATE_NO_ACCESS_LIST.labels(this._chainId.toString()).set(gasEstimate);
                    RFQM_GAS_ESTIMATE_ACCESS_LIST.labels(this._chainId.toString()).set(accessListWithGas.gasEstimate);
                }
            }

            const firstSubmission = await this._submitTransactionAsync(
                kind,
                identifier,
                from,
                calldata,
                gasFees,
                nonce,
                gasEstimate,
                submissionType,
                to,
            );

            logger.info(
                { kind, from, identifier, submissionType, transactionHash: firstSubmission.transactionHash },
                'Successfully submitted transaction',
            );

            submissionContext = new SubmissionContext(this._blockchainUtils, [firstSubmission] as
                | RfqmV2TransactionSubmissionEntity[]
                | MetaTransactionSubmissionEntity[]);
        } else {
            logger.info({ kind, from, identifier, submissionType }, `Previous submissions found, recovering context`);
            submissionContext = new SubmissionContext(this._blockchainUtils, previousSubmissions);
            nonce = submissionContext.nonce;

            // If we've already submitted a transaction and it has been mined,
            // using `_blockchainUtils.estimateGasForAsync` will throw
            // given the same calldata. In the edge case where a transaction has been sent
            // but not mined, we would ideally pull the gas estimate from the previous
            // transaction. Unfortunately, we currently do not store it on the
            // `RfqmV2TransactionSubmissionEntity`. As a workaround, we'll just use an
            // overestimate..
            gasEstimate = MAX_GAS_ESTIMATE;
        }

        // The "Watch Loop"
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // We've already submitted the transaction once at this point, so we first need to wait before checking the status.
            await delay(this._transactionWatcherSleepTimeMs);
            const oldSubmissionContextStatus = submissionContext.submissionContextStatus;
            const newSubmissionContextStatus = await this._checkSubmissionReceiptsAndUpdateDbAsync(
                identifier,
                submissionContext,
            );
            logger.info(
                { kind, submissionType, oldSubmissionContextStatus, newSubmissionContextStatus },
                'Old and new submission context statuses',
            );
            await onSubmissionContextStatusUpdate(newSubmissionContextStatus, oldSubmissionContextStatus);

            switch (newSubmissionContextStatus) {
                case SubmissionContextStatus.PendingSubmitted:
                    // We've put in at least one transaction but none have been mined yet.
                    // Check to make sure we haven't passed the expiry window.
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line no-case-declarations
                    const nowSeconds = new BigNumber(new Date().getTime() / ONE_SECOND_MS);

                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line no-case-declarations
                    const secondsPastExpiration = nowSeconds.minus(expiry);

                    // If we're more than 120 seconds past expiration, give up.
                    // See https://github.com/rolandkofler/blocktime for some
                    // analysis of expected block times. Two minutes was selected
                    // to cover most cases without locking up the worker for too long.
                    if (secondsPastExpiration.isGreaterThan(ONE_MINUTE_S * 2)) {
                        await onSubmissionContextStatusUpdate(
                            SubmissionContextStatus.FailedExpired,
                            oldSubmissionContextStatus,
                        );
                        throw new Error(
                            `Exceed expiry ${expiry} for kind ${kind} and submission type ${submissionType}`,
                        );
                    }
                    // If we're past expiration by less than a minute, don't put in any new transactions
                    // but keep watching in case a receipt shows up
                    if (secondsPastExpiration.isGreaterThan(0)) {
                        continue;
                    }

                    // "Fast" gas price estimation; used to approximate the base fee
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line no-case-declarations
                    const newGasPriceEstimate = await this._gasStationAttendant.getExpectedTransactionGasRateAsync();

                    if (submissionContext.transactionType === 0) {
                        throw new Error('Non-EIP-1559 transactions are not implemented');
                    }

                    // We don't wait for gas conditions to change. Rather, we increase the gas
                    // based bid based onthe knowledge that time (and therefore blocks, theoretically)
                    // has passed without a transaction being mined.

                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line no-case-declarations
                    const { maxFeePerGas: oldMaxFeePerGas, maxPriorityFeePerGas: oldMaxPriorityFeePerGas } =
                        submissionContext.maxGasFees;

                    if (oldMaxFeePerGas.isGreaterThanOrEqualTo(MAX_PRIORITY_FEE_PER_GAS_CAP)) {
                        // If we've reached the max priority fee per gas we'd like to pay, just
                        // continue watching the transactions to see if one gets mined.
                        logger.info({ kind, submissionType, oldMaxFeePerGas }, 'Exceeds max priority fee per gas');
                        continue;
                    }

                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line no-case-declarations
                    const newMaxPriorityFeePerGas = oldMaxPriorityFeePerGas
                        .multipliedBy(MAX_PRIORITY_FEE_PER_GAS_MULTIPLIER)
                        .integerValue(BigNumber.ROUND_CEIL);

                    // The RPC nodes still need at least a 0.1 increase in both values to accept the new transaction.
                    // For the new max fee per gas, we'll take the maximum of a 0.1 increase from the last value
                    // or the value from an increase in the base fee.
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line no-case-declarations
                    const newMaxFeePerGas = BigNumber.max(
                        oldMaxFeePerGas.multipliedBy(MAX_FEE_PER_GAS_MULTIPLIER).integerValue(BigNumber.ROUND_CEIL),
                        newGasPriceEstimate.multipliedBy(2).plus(newMaxPriorityFeePerGas),
                    );

                    gasFees = {
                        maxFeePerGas: newMaxFeePerGas,
                        maxPriorityFeePerGas: newMaxPriorityFeePerGas,
                    };

                    logger.info(
                        {
                            kind,
                            gasFees,
                            gasPriceEstimate,
                            identifier,
                            submissionCount: submissionContext.transactions.length + 1,
                            from,
                            submissionType,
                        },
                        'Submitting transaction',
                    );

                    try {
                        const newTransaction = await this._submitTransactionAsync(
                            kind,
                            identifier,
                            from,
                            calldata,
                            gasFees,
                            nonce,
                            gasEstimate,
                            submissionType,
                            to,
                        );
                        logger.info(
                            {
                                kind,
                                from,
                                identifier,
                                transactionHash: newTransaction.transactionHash,
                                submissionType,
                            },
                            'Successfully resubmited tx with higher gas price',
                        );
                        submissionContext.addTransaction(newTransaction);
                    } catch (err) {
                        const errorMessage = err.message;
                        const isNonceTooLow = /nonce too low/.test(errorMessage);
                        logger.warn(
                            { from, kind, identifier, submissionType, errorMessage: err.message, isNonceTooLow },
                            'Encountered an error re-submitting a tx',
                        );
                        if (isNonceTooLow) {
                            logger.info(
                                { from, kind, identifier, submissionType },
                                'Ignore nonce too low error on re-submission. A previous submission was successful',
                            );
                            break;
                        }

                        // Rethrow on all other types of errors
                        throw err;
                    }
                    break;

                case SubmissionContextStatus.FailedRevertedUnconfirmed:
                case SubmissionContextStatus.SucceededUnconfirmed:
                    break;
                case SubmissionContextStatus.FailedRevertedConfirmed:
                case SubmissionContextStatus.SucceededConfirmed:
                    return newSubmissionContextStatus;
                default:
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    ((_x: never) => {
                        throw new Error('unreachable');
                    })(newSubmissionContextStatus);
            }
        }
    }

    /**
     * Get the callback function to supply to `submitToChainAsync`.
     *
     * Note that `job.status` would be updated to appropriate state by  the callback function according to old & new
     * submission context status and submission type. There would be job status update ONLY IF the new and old submission
     * context statuses differ.
     *
     * This function also "closes over" `job` so that it's accessible in the callback function. Refer the docstring of
     * `RfqmTransactionSubmissionContextStatus` for more details on submission context.
     *
     * @param job A rfqm v2 job or a meta transactino job object.
     * @param submissionType Type of submission.
     * @returns Function would make appropriate update to job status according to submission context statuses and submission type.
     */
    private _getOnSubmissionContextStatusUpdateCallback(
        job: RfqmV2JobEntity | MetaTransactionJobEntity,
        submissionType: RfqmTransactionSubmissionType,
    ): (
        newSubmissionContextStatus: SubmissionContextStatus,
        oldSubmissionContextStatus?: SubmissionContextStatus,
    ) => Promise<void> {
        return async (
            newSubmissionContextStatus: SubmissionContextStatus,
            oldSubmissionContextStatus?: SubmissionContextStatus,
        ): Promise<void> => {
            if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                let newJobStatus: RfqmJobStatus;
                switch (submissionType) {
                    case RfqmTransactionSubmissionType.Approval:
                        newJobStatus =
                            SubmissionContext.approvalSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        break;
                    case RfqmTransactionSubmissionType.Trade:
                        newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        break;
                    default:
                        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        ((_x: never) => {
                            throw new Error('unreachable');
                        })(submissionType);
                }

                job.status = newJobStatus;
                await this._dbUtils.updateRfqmJobAsync(job);
            }
        };
    }

    /**
     * Takes an array of Transaction Submissions, which may include transactions with the
     * "Presbumit" status, and resolves or removes the "Presubmit" transactions.
     *
     * If there are previous submissions in the "Presubmit" state,
     *
     * For "Presubmit" transactions, we check to see if the transaction was actually sent to
     * the mempool or not, as that is indeterminate. Depending on the result of the check, we
     * update the status to "Submitted" or remove them from the submissions in memory.
     * Note that we leave the transaction record present in the database so that if the worker
     * dies again and the submission actually went through but was not found at the time of
     * this check we can potentially recover it later.
     */
    private async _recoverPresubmitTransactionsAsync<
        T extends RfqmV2TransactionSubmissionEntity[] | MetaTransactionSubmissionEntity[],
    >(transactionSubmissions: T): Promise<T> {
        // Any is so nasty -- https://dev.to/shadow1349/typescript-tip-of-the-week-generics-170g
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result: any = await Promise.all(
            transactionSubmissions.map(async (transactionSubmission) => {
                // If the transaction is any status other than "Presubmit" then we'll leave it
                if (transactionSubmission.status !== RfqmTransactionSubmissionStatus.Presubmit) {
                    return transactionSubmission;
                }
                // For transactions in presubmit, check the mempool and chain to see if they exist
                const transactionResponse = await this._blockchainUtils.getTransactionAsync(
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    transactionSubmission.transactionHash!,
                );
                if (transactionResponse) {
                    // If it does exist, update the status. If not, remove it.
                    transactionSubmission.status = RfqmTransactionSubmissionStatus.Submitted;
                    await this._dbUtils.updateRfqmTransactionSubmissionsAsync([transactionSubmission] as T);
                    return transactionSubmission;
                } else {
                    return null;
                }
            }),
        ).then((x) => x.filter(isDefined));
        return result;
    }

    /**
     * Check for receipts from the tx hashes and update databases with status of all tx's.
     */
    private async _checkSubmissionReceiptsAndUpdateDbAsync(
        identifier: string,
        submissionContext: SubmissionContext<RfqmV2TransactionSubmissionEntity[] | MetaTransactionSubmissionEntity[]>,
    ): Promise<
        | SubmissionContextStatus.PendingSubmitted
        | SubmissionContextStatus.FailedRevertedConfirmed
        | SubmissionContextStatus.FailedRevertedUnconfirmed
        | SubmissionContextStatus.SucceededConfirmed
        | SubmissionContextStatus.SucceededUnconfirmed
    > {
        // At most one tx can be mined, since they all have the same nonce.
        const minedReceipt = await submissionContext.getReceiptAsync();

        // If the tx hasn't been mined yet, there're no database updates to do.
        if (!minedReceipt) {
            return SubmissionContextStatus.PendingSubmitted;
        }

        // Attempt to publish the mining latency
        try {
            const { timestamp: minedBlockTimestampS } = await this._blockchainUtils.getBlockAsync(
                minedReceipt.blockHash,
            );
            const firstSubmissionTimestampS = submissionContext.firstSubmissionTimestampS;
            RFQM_MINING_LATENCY.labels(this._chainId.toString()).observe(
                minedBlockTimestampS - firstSubmissionTimestampS,
            );
        } catch (e) {
            logger.warn(
                { orderHash: identifier, errorMessage: e.message, stack: e.stack },
                'Failed to meter the mining latency',
            );
        }

        await submissionContext.updateForReceiptAsync(minedReceipt);
        await this._dbUtils.updateRfqmTransactionSubmissionsAsync(submissionContext.transactions);
        return submissionContext.submissionContextStatus;
    }

    /**
     * Determine transaction properties and submit a transaction
     */
    private async _submitTransactionAsync(
        kind: (RfqmV2JobEntity | MetaTransactionJobEntity)['kind'],
        identifier: string,
        workerAddress: string,
        callData: string,
        gasFees: GasFees,
        nonce: number,
        gasEstimate: number,
        submissionType: RfqmTransactionSubmissionType = RfqmTransactionSubmissionType.Trade,
        to: string = this._blockchainUtils.getExchangeProxyAddress(),
    ): Promise<RfqmV2TransactionSubmissionEntity | MetaTransactionSubmissionEntity> {
        const txOptions = {
            ...gasFees,
            from: workerAddress,
            to,
            gas: gasEstimate,
            nonce,
            value: 0,
        };

        const transactionRequest = this._blockchainUtils.transformTxDataToTransactionRequest(
            txOptions,
            this._chainId,
            callData,
        );
        const { signedTransaction, transactionHash } = await this._blockchainUtils.signTransactionAsync(
            transactionRequest,
        );

        let partialEntity;
        let transactionSubmissionEntity;
        switch (kind) {
            case 'rfqm_v2_job':
                partialEntity = {
                    ...gasFees,
                    transactionHash,
                    orderHash: identifier,
                    createdAt: new Date(),
                    from: workerAddress,
                    to,
                    nonce,
                    status: RfqmTransactionSubmissionStatus.Presubmit,
                    type: submissionType,
                };
                transactionSubmissionEntity = await this._dbUtils.writeV2RfqmTransactionSubmissionToDbAsync(
                    partialEntity,
                );
                break;
            case 'meta_transaction_job':
                partialEntity = {
                    ...gasFees,
                    transactionHash,
                    metaTransactionJobId: identifier,
                    createdAt: new Date(),
                    from: workerAddress,
                    to,
                    nonce,
                    status: RfqmTransactionSubmissionStatus.Presubmit,
                    type: submissionType,
                };
                transactionSubmissionEntity = await this._dbUtils.writeMetaTransactionSubmissionAsync(partialEntity);
                break;
            default:
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }

        const transactionHashFromSubmit = await this._blockchainUtils.submitSignedTransactionAsync(signedTransaction);

        if (transactionHash !== transactionHashFromSubmit) {
            // This should never ever happen
            logger.error(
                { kind, submissionType, identifier, transactionHashFromSubmit, transactionHash },
                'Mismatch between transaction hash calculated before submit and after submit',
            );
            throw new Error('Mismatch between transaction hash calculated before submit and after submit');
        }

        logger.info(
            { kind, submissionType, identifier, workerAddress, transactionHash },
            'Transaction calldata submitted to exchange proxy',
        );

        const updatedTransactionSubmission = [
            {
                ...transactionSubmissionEntity,
                status: RfqmTransactionSubmissionStatus.Submitted,
            },
        ] as RfqmV2TransactionSubmissionEntity[] | MetaTransactionSubmissionEntity[];

        await this._dbUtils.updateRfqmTransactionSubmissionsAsync(updatedTransactionSubmission);

        let updatedEntity;
        switch (kind) {
            case 'rfqm_v2_job':
                updatedEntity = await this._dbUtils.findV2TransactionSubmissionByTransactionHashAsync(
                    transactionHashFromSubmit,
                );
                break;
            case 'meta_transaction_job':
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line no-case-declarations
                const updatedSubmissionEntities =
                    await this._dbUtils.findMetaTransactionSubmissionsByTransactionHashAsync(
                        transactionHashFromSubmit,
                        submissionType,
                    );
                if (updatedSubmissionEntities.length !== 1) {
                    // A transaction hash should never be submitted twice in our system. However, RFQ-562 mentioned cases like this could
                    // happen in our system. Add more log and throw the error to surface it.
                    logger.error(
                        { kind, submissionType, transactionHash },
                        'Transaction hash have been submitted not exactly once',
                    );
                    throw new Error('Transaction hash have been submitted not exactly once');
                }

                updatedEntity = updatedSubmissionEntities[0];
                break;
            default:
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }

        if (!updatedEntity) {
            // This should never happen -- we just saved it
            throw new Error(
                `Could not find updated entity with transaction hash ${transactionHashFromSubmit} of kind ${kind} and submission type ${submissionType}`,
            );
        }

        return updatedEntity;
    }
}
