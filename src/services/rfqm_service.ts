// tslint:disable:max-file-line-count
import { AssetSwapperContractAddresses, MarketOperation, ProtocolFeeUtils, QuoteRequestor } from '@0x/asset-swapper';
import { RfqmRequestOptions } from '@0x/asset-swapper/lib/src/types';
import { MetaTransaction, RfqOrder, Signature } from '@0x/protocol-utils';
import { Fee, SubmitRequest } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import delay from 'delay';
import { Counter, Gauge, Summary } from 'prom-client';
import { Producer } from 'sqs-producer';

import {
    CHAIN_ID,
    META_TX_WORKER_REGISTRY,
    RFQM_MAINTENANCE_MODE,
    RFQM_MAKER_ASSET_OFFERINGS,
    RFQM_WORKER_INDEX,
    RFQT_REQUEST_MAX_RESPONSE_MS,
} from '../config';
import {
    ETH_DECIMALS,
    NULL_ADDRESS,
    ONE_SECOND_MS,
    RFQM_MINIMUM_EXPIRY_DURATION_MS,
    RFQM_TX_GAS_ESTIMATE,
} from '../constants';
import { RfqmJobEntity, RfqmQuoteEntity, RfqmTransactionSubmissionEntity } from '../entities';
import { RfqmJobStatus } from '../entities/RfqmJobEntity';
import { RfqmTransactionSubmissionStatus } from '../entities/RfqmTransactionSubmissionEntity';
import { InternalServerError, NotFoundError, ValidationError, ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { getBestQuote } from '../utils/quote_comparison_utils';
import { QuoteServerClient } from '../utils/quote_server_client';
import {
    feeToStoredFee,
    RfqmDbUtils,
    storedFeeToFee,
    storedOrderToRfqmOrder,
    v4RfqOrderToStoredOrder,
} from '../utils/rfqm_db_utils';
import { calculateGasEstimate } from '../utils/rfqm_gas_estimate_utils';
import { computeHealthCheckAsync, HealthCheckResult } from '../utils/rfqm_health_check';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';

export const BLOCK_FINALITY_THRESHOLD = 3;
const MIN_GAS_PRICE_INCREASE = 0.1;

export enum RfqmTypes {
    MetaTransaction = 'metatransaction',
}

export interface FetchIndicativeQuoteParams {
    integratorId: string;
    buyAmount?: BigNumber;
    buyToken: string;
    buyTokenDecimals: number;
    sellAmount?: BigNumber;
    sellToken: string;
    sellTokenDecimals: number;
    takerAddress?: string;
    affiliateAddress?: string;
}

export interface FetchIndicativeQuoteResponse {
    allowanceTarget?: string;
    buyAmount: BigNumber;
    buyTokenAddress: string;
    gas: BigNumber;
    price: BigNumber;
    sellAmount: BigNumber;
    sellTokenAddress: string;
}

export interface FetchFirmQuoteParams {
    integratorId: string;
    buyAmount?: BigNumber;
    buyToken: string;
    buyTokenDecimals: number;
    sellAmount?: BigNumber;
    sellToken: string;
    sellTokenDecimals: number;
    takerAddress: string;
    affiliateAddress?: string;
}

export interface BaseRfqmQuoteResponse {
    allowanceTarget?: string;
    buyAmount: BigNumber;
    buyTokenAddress: string;
    gas: BigNumber;
    price: BigNumber;
    sellAmount: BigNumber;
    sellTokenAddress: string;
}

export interface MetaTransactionSubmitRfqmSignedQuoteParams {
    integratorId: string;
    metaTransaction: MetaTransaction;
    signature: Signature;
    type: RfqmTypes.MetaTransaction;
}

export interface MetaTransactionSubmitRfqmSignedQuoteResponse {
    type: RfqmTypes.MetaTransaction;
    metaTransactionHash: string;
    orderHash: string;
}

export interface MetaTransactionRfqmQuoteResponse extends BaseRfqmQuoteResponse {
    type: RfqmTypes.MetaTransaction;
    metaTransaction: MetaTransaction;
    metaTransactionHash: string;
    orderHash: string;
}

export interface SubmissionsMapStatus {
    isTxMined: boolean;
    isTxConfirmed: boolean;
    submissionsMap: SubmissionsMap;
}

export interface SubmissionsMap {
    [transactionHash: string]: RfqmTransactionSubmissionEntity;
}

export interface SubmissionContext {
    submissionsMap: SubmissionsMap;
    nonce: number;
    gasEstimate: number;
    gasPrice: BigNumber;
}

export type FetchFirmQuoteResponse = MetaTransactionRfqmQuoteResponse;
export type SubmitRfqmSignedQuoteParams = MetaTransactionSubmitRfqmSignedQuoteParams;
export type SubmitRfqmSignedQuoteResponse = MetaTransactionSubmitRfqmSignedQuoteResponse;

export interface StatusResponse {
    status: 'pending' | 'submitted' | 'failed' | 'succeeded' | 'confirmed';
    // For pending, expect no transactions. For successful transactions, expect just the mined transaction.
    transactions: { hash: string; timestamp: number /* unix ms */ }[];
}

const RFQM_QUOTE_INSERTED = new Counter({
    name: 'rfqm_quote_inserted',
    help: 'An RfqmQuote was inserted in the DB',
    labelNames: ['apiKey', 'integratorId', 'makerUri'],
});

const RFQM_DEFAULT_OPTS = {
    takerAddress: NULL_ADDRESS,
    txOrigin: META_TX_WORKER_REGISTRY || NULL_ADDRESS,
    makerEndpointMaxResponseTimeMs: RFQT_REQUEST_MAX_RESPONSE_MS,
    nativeExclusivelyRFQ: true,
    altRfqAssetOfferings: {},
    isLastLook: true,
};

const RFQM_WORKER_BALANCE = new Gauge({
    name: 'rfqm_worker_balance',
    labelNames: ['address'],
    help: 'Worker balance for RFQM',
});

const RFQM_WORKER_READY = new Counter({
    name: 'rfqm_worker_ready',
    labelNames: ['address'],
    help: 'A worker passed the readiness check, and is ready to pick up work',
});

const RFQM_WORKER_NOT_READY = new Counter({
    name: 'rfqm_worker_not_ready',
    labelNames: ['address'],
    help: 'A worker did not pass the readiness check, and was not able to pick up work',
});

const RFQM_JOB_REPAIR = new Gauge({
    name: 'rfqm_job_to_repair',
    labelNames: ['address'],
    help: 'A submitted job failed and started repair mode',
});

const RFQM_SIGNED_QUOTE_NOT_FOUND = new Counter({
    name: 'rfqm_signed_quote_not_found',
    help: 'A submitted quote did not match any stored quotes',
});
const RFQM_SIGNED_QUOTE_FAILED_ETHCALL_VALIDATION = new Counter({
    name: 'rfqm_signed_quote_failed_ethcall_validation',
    help: 'A signed quote failed eth_call validation before being queued',
});
const RFQM_SIGNED_QUOTE_EXPIRY_TOO_SOON = new Counter({
    name: 'rfqm_signed_quote_expiry_too_soon',
    help: 'A signed quote was not queued because it would expire too soon',
});
const RFQM_JOB_FAILED_ETHCALL_VALIDATION = new Counter({
    name: 'rfqm_job_failed_ethcall_validation',
    help: 'A job failed eth_call validation before being queued',
});
const RFQM_JOB_MM_REJECTED_LAST_LOOK = new Counter({
    name: 'rfqm_job_mm_rejected_last_look',
    help: 'A job rejected by market maker on last look',
    labelNames: ['makerUri'],
});

const RFQM_PROCESS_JOB_LATENCY = new Summary({
    name: 'rfqm_process_job_latency',
    help: 'Latency for the worker processing the job',
});
const PRICE_DECIMAL_PLACES = 6;

/**
 * RfqmService is the coordination layer for HTTP based RFQM flows.
 */
export class RfqmService {
    public static shouldResubmitTransaction(oldGasPrice: BigNumber, newGasPrice: BigNumber): boolean {
        // Geth only allows replacement of transactions if the replacement gas price
        // is at least 10% higher than the gas price of the  transaction being replaced
        return newGasPrice.gte(oldGasPrice.multipliedBy(MIN_GAS_PRICE_INCREASE + 1));
    }

    public static isBlockConfirmed(currentBlock: number, receiptBlockNumber: number): boolean {
        // We specify a finality threshold of n blocks deep to have greater confidence
        // in the transaction receipt
        return currentBlock - receiptBlockNumber >= BLOCK_FINALITY_THRESHOLD;
    }

    private static _getSellAmountGivenBuyAmountAndQuote(
        buyAmount: BigNumber,
        quotedTakerAmount: BigNumber,
        quotedMakerAmount: BigNumber,
    ): BigNumber {
        // Solving for x given the following proportion:
        // x / buyAmount = quotedTakerAmount / quotedMakerAmount
        return quotedTakerAmount.div(quotedMakerAmount).times(buyAmount).decimalPlaces(0);
    }

    private static _getBuyAmountGivenSellAmountAndQuote(
        sellAmount: BigNumber,
        quotedTakerAmount: BigNumber,
        quotedMakerAmount: BigNumber,
    ): BigNumber {
        // Solving for y given the following proportion:
        // y / sellAmount =  quotedMakerAmount / quotedTakerAmount
        return quotedMakerAmount.div(quotedTakerAmount).times(sellAmount).decimalPlaces(0);
    }

    // Returns a failure status for invalide jobs and null if the job is valid.
    private static _validateJob(job: RfqmJobEntity): RfqmJobStatus | null {
        const { calldata, makerUri, order, fee } = job;
        if (calldata === undefined) {
            return RfqmJobStatus.FailedValidationNoCallData;
        }

        if (makerUri === undefined) {
            return RfqmJobStatus.FailedValidationNoMakerUri;
        }

        if (order === null) {
            return RfqmJobStatus.FailedValidationNoOrder;
        }

        if (fee === null) {
            return RfqmJobStatus.FailedValidationNoFee;
        }

        return null;
    }

    /**
     * update RfqmJobStatus based on transaction status
     */
    private static _getJobStatusFromSubmissions(submissionsMap: SubmissionsMap): RfqmJobStatus {
        // there should only be one mined transaction, which will either be successful or a revert
        for (const submission of Object.values(submissionsMap)) {
            if (submission.status === RfqmTransactionSubmissionStatus.SucceededConfirmed) {
                return RfqmJobStatus.SucceededConfirmed;
            } else if (submission.status === RfqmTransactionSubmissionStatus.RevertedConfirmed) {
                return RfqmJobStatus.FailedRevertedConfirmed;
            }
        }
        throw new Error('no transactions mined in submissions');
    }

    constructor(
        private readonly _quoteRequestor: QuoteRequestor,
        private readonly _protocolFeeUtils: ProtocolFeeUtils,
        private readonly _contractAddresses: AssetSwapperContractAddresses,
        private readonly _registryAddress: string,
        private readonly _blockchainUtils: RfqBlockchainUtils,
        private readonly _dbUtils: RfqmDbUtils,
        private readonly _sqsProducer: Producer,
        private readonly _quoteServerClient: QuoteServerClient,
        private readonly _transactionWatcherSleepTimeMs: number,
    ) {}

    /**
     * Fetch the best indicative quote available. Returns null if no valid quotes found
     */
    public async fetchIndicativeQuoteAsync(
        params: FetchIndicativeQuoteParams,
    ): Promise<FetchIndicativeQuoteResponse | null> {
        // Extract params
        const {
            sellAmount,
            buyAmount,
            sellToken: takerToken,
            buyToken: makerToken,
            sellTokenDecimals: takerTokenDecimals,
            buyTokenDecimals: makerTokenDecimals,
            integratorId,
        } = params;

        // Quote Requestor specific params
        const isSelling = sellAmount !== undefined;
        const marketOperation = isSelling ? MarketOperation.Sell : MarketOperation.Buy;
        const assetFillAmount = isSelling ? sellAmount! : buyAmount!;

        // Prepare gas estimate and fee
        const gasPrice: BigNumber = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        const feeAmount = gasPrice.times(RFQM_TX_GAS_ESTIMATE);

        // Fetch quotes
        const opts: RfqmRequestOptions = {
            ...RFQM_DEFAULT_OPTS,
            txOrigin: this._registryAddress,
            apiKey: integratorId, // Send the integrator ID instead of the api key to the market makers
            intentOnFilling: false,
            isIndicative: true,
            isLastLook: true,
            fee: {
                amount: feeAmount,
                token: this._contractAddresses.etherToken,
                type: 'fixed',
            },
        };
        const indicativeQuotes = await this._quoteRequestor.requestRfqmIndicativeQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            undefined,
            opts,
        );

        // Get the best quote
        const bestQuote = getBestQuote(
            indicativeQuotes,
            isSelling,
            takerToken,
            makerToken,
            assetFillAmount,
            RFQM_MINIMUM_EXPIRY_DURATION_MS,
        );

        // No quotes found
        if (bestQuote === null) {
            return null;
        }

        // Prepare the price
        const makerAmountInUnit = Web3Wrapper.toUnitAmount(bestQuote.makerAmount, makerTokenDecimals);
        const takerAmountInUnit = Web3Wrapper.toUnitAmount(bestQuote.takerAmount, takerTokenDecimals);
        const price = isSelling ? makerAmountInUnit.div(takerAmountInUnit) : takerAmountInUnit.div(makerAmountInUnit);
        // The way the BigNumber round down behavior (https://mikemcl.github.io/bignumber.js/#dp) works requires us
        // to add 1 to PRICE_DECIMAL_PLACES in order to actually come out with the decimal places specified.
        const roundedPrice = price.decimalPlaces(PRICE_DECIMAL_PLACES + 1, BigNumber.ROUND_DOWN);

        // Prepare response
        return {
            price: roundedPrice,
            gas: gasPrice,
            buyAmount: bestQuote.makerAmount,
            buyTokenAddress: bestQuote.makerToken,
            sellAmount: bestQuote.takerAmount,
            sellTokenAddress: bestQuote.takerToken,
            allowanceTarget: this._contractAddresses.exchangeProxy,
        };
    }

    /**
     * Fetch the best firm quote available, including a metatransaction. Returns null if no valid quotes found
     */
    public async fetchFirmQuoteAsync(params: FetchFirmQuoteParams): Promise<FetchFirmQuoteResponse | null> {
        // Extract params
        const {
            sellAmount,
            buyAmount,
            sellToken: takerToken,
            buyToken: makerToken,
            sellTokenDecimals: takerTokenDecimals,
            buyTokenDecimals: makerTokenDecimals,
            integratorId,
            takerAddress,
            affiliateAddress,
        } = params;

        // Quote Requestor specific params
        const isSelling = sellAmount !== undefined;
        const marketOperation = isSelling ? MarketOperation.Sell : MarketOperation.Buy;
        const assetFillAmount = isSelling ? sellAmount! : buyAmount!;

        // Prepare gas estimate and fee
        const gasPrice: BigNumber = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        const gasEstimate = calculateGasEstimate(makerToken, takerToken);
        const feeAmount = gasPrice.times(gasEstimate);
        const fee: Fee = {
            amount: feeAmount,
            token: this._contractAddresses.etherToken,
            type: 'fixed',
        };

        // Fetch quotes
        const opts: RfqmRequestOptions = {
            ...RFQM_DEFAULT_OPTS,
            takerAddress,
            txOrigin: this._registryAddress,
            apiKey: integratorId, // Send the integrator id instead of the API key to the market makers
            intentOnFilling: true,
            isIndicative: false,
            isLastLook: true,
            fee,
        };
        const firmQuotes = await this._quoteRequestor.requestRfqmFirmQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            undefined,
            opts,
        );

        const firmQuotesWithCorrectChainId = firmQuotes.filter((quote) => {
            if (quote.order.chainId !== CHAIN_ID) {
                logger.error(`Received a quote with incorrect chain id: ${quote}`);
                return false;
            }
            return true;
        });

        // Get the best quote
        const bestQuote = getBestQuote(
            firmQuotesWithCorrectChainId,
            isSelling,
            takerToken,
            makerToken,
            assetFillAmount,
            RFQM_MINIMUM_EXPIRY_DURATION_MS,
        );

        // No quote found
        if (bestQuote === null) {
            return null;
        }

        // Get the makerUri
        const makerUri = this._quoteRequestor.getMakerUriForSignature(bestQuote.signature);
        if (makerUri === undefined) {
            throw new Error(`makerUri unknown for maker address ${bestQuote.order.maker}`);
        }

        // Prepare the price
        const makerAmountInUnit = Web3Wrapper.toUnitAmount(bestQuote.order.makerAmount, makerTokenDecimals);
        const takerAmountInUnit = Web3Wrapper.toUnitAmount(bestQuote.order.takerAmount, takerTokenDecimals);
        const price = isSelling ? makerAmountInUnit.div(takerAmountInUnit) : takerAmountInUnit.div(makerAmountInUnit);
        // The way the BigNumber round down behavior (https://mikemcl.github.io/bignumber.js/#dp) works requires us
        // to add 1 to PRICE_DECIMAL_PLACES in order to actually come out with the decimal places specified.
        const roundedPrice = price.decimalPlaces(PRICE_DECIMAL_PLACES + 1, BigNumber.ROUND_DOWN);

        // Prepare the final takerAmount and makerAmount
        const takerAmount = isSelling
            ? sellAmount!
            : RfqmService._getSellAmountGivenBuyAmountAndQuote(
                  buyAmount!,
                  bestQuote.order.takerAmount,
                  bestQuote.order.makerAmount,
              );

        const makerAmount = isSelling
            ? RfqmService._getBuyAmountGivenSellAmountAndQuote(
                  sellAmount!,
                  bestQuote.order.takerAmount,
                  bestQuote.order.makerAmount,
              )
            : buyAmount!;

        // Get the Order and its hash
        const rfqOrder = new RfqOrder(bestQuote.order);
        const orderHash = rfqOrder.getHash();

        // Generate the Meta Transaction and its hash
        const metaTransaction = this._blockchainUtils.generateMetaTransaction(
            rfqOrder,
            bestQuote.signature,
            takerAddress,
            takerAmount,
            CHAIN_ID,
        );
        const metaTransactionHash = metaTransaction.getHash();

        // TODO: Save the integratorId
        // Save the RfqmQuote
        await this._dbUtils.writeRfqmQuoteToDbAsync(
            new RfqmQuoteEntity({
                orderHash,
                metaTransactionHash,
                chainId: CHAIN_ID,
                fee: feeToStoredFee(fee),
                order: v4RfqOrderToStoredOrder(rfqOrder),
                makerUri,
                affiliateAddress,
            }),
        );
        RFQM_QUOTE_INSERTED.labels(integratorId, integratorId, makerUri).inc();

        // Prepare response
        return {
            type: RfqmTypes.MetaTransaction,
            price: roundedPrice,
            gas: gasPrice,
            buyAmount: makerAmount,
            buyTokenAddress: bestQuote.order.makerToken,
            sellAmount: takerAmount,
            sellTokenAddress: bestQuote.order.takerToken,
            allowanceTarget: this._contractAddresses.exchangeProxy,
            metaTransaction,
            metaTransactionHash,
            orderHash,
        };
    }

    public async workerBeforeLogicAsync(workerAddress: string): Promise<boolean> {
        let gasPrice;
        try {
            gasPrice = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        } catch (error) {
            logger.error({ error }, 'Current gas price is unable to be fetched, marking worker as not ready.');
            RFQM_WORKER_NOT_READY.labels(workerAddress).inc();
            return false;
        }

        const balance = await this._blockchainUtils.getAccountBalanceAsync(workerAddress);
        const balanceUnitAmount = Web3Wrapper.toUnitAmount(balance, ETH_DECIMALS).decimalPlaces(PRICE_DECIMAL_PLACES);
        RFQM_WORKER_BALANCE.labels(workerAddress).set(balanceUnitAmount.toNumber());

        // check for outstanding jobs from the worker and resolve them
        const unresolvedJobs = await this._dbUtils.findUnresolvedJobsAsync(workerAddress);
        RFQM_JOB_REPAIR.labels(workerAddress).inc(unresolvedJobs.length);
        for (const job of unresolvedJobs) {
            logger.info({ workerAddress, orderHash: job.orderHash }, `Unresolved job found, attempting to re-process`);
            await this.processRfqmJobAsync(job.orderHash, workerAddress);
        }

        const isWorkerReady = await this._blockchainUtils.isWorkerReadyAsync(workerAddress, balance, gasPrice);
        if (!isWorkerReady) {
            RFQM_WORKER_NOT_READY.labels(workerAddress).inc();
            return false;
        }

        // Publish a heartbeat if the worker is ready to go
        try {
            if (RFQM_WORKER_INDEX === undefined) {
                throw new Error('Worker index is undefined');
            }
            await this._dbUtils.upsertRfqmWorkerHeartbeatToDbAsync(workerAddress, RFQM_WORKER_INDEX, balance);
        } catch (e) {
            logger.error({ workerAddress, balance }, `Worker failed to write a heartbeat to storage: ${e}`);
        }

        RFQM_WORKER_READY.labels(workerAddress).inc();
        return true;
    }

    public async getOrderStatusAsync(orderHash: string): Promise<StatusResponse | null> {
        const transformSubmission = (submission: RfqmTransactionSubmissionEntity) => {
            const { transactionHash: hash, createdAt } = submission;
            return hash ? { hash, timestamp: createdAt.getTime() } : null;
        };

        const transformSubmissions = (submissions: RfqmTransactionSubmissionEntity[]) =>
            submissions.map(transformSubmission).flatMap((s) => (s ? s : []));

        const job = await this._dbUtils.findJobByOrderHashAsync(orderHash);
        if (!job) {
            return null;
        }
        const { status } = job;
        if (status === RfqmJobStatus.PendingEnqueued && job.expiry.multipliedBy(ONE_SECOND_MS).lt(Date.now())) {
            // the workers are dead/on vacation and the expiration time has passed
            return {
                status: 'failed',
                transactions: [],
            };
        }
        const transactionSubmissions = await this._dbUtils.findRfqmTransactionSubmissionsByOrderHashAsync(orderHash);
        switch (status) {
            case RfqmJobStatus.PendingEnqueued:
            case RfqmJobStatus.PendingProcessing:
            case RfqmJobStatus.PendingLastLookAccepted:
                return { status: 'pending', transactions: [] };
            case RfqmJobStatus.PendingSubmitted:
                return {
                    status: 'submitted',
                    transactions: transformSubmissions(transactionSubmissions),
                };
            case RfqmJobStatus.FailedEthCallFailed:
            case RfqmJobStatus.FailedExpired:
            case RfqmJobStatus.FailedLastLookDeclined:
            case RfqmJobStatus.FailedRevertedConfirmed:
            case RfqmJobStatus.FailedRevertedUnconfirmed:
            case RfqmJobStatus.FailedSubmitFailed:
            case RfqmJobStatus.FailedValidationNoCallData:
            case RfqmJobStatus.FailedValidationNoFee:
            case RfqmJobStatus.FailedValidationNoMakerUri:
            case RfqmJobStatus.FailedValidationNoOrder:
                return {
                    status: 'failed',
                    transactions: transformSubmissions(transactionSubmissions),
                };
            case RfqmJobStatus.SucceededConfirmed:
            case RfqmJobStatus.SucceededUnconfirmed:
                const successfulTransactions = transactionSubmissions.filter(
                    (s) =>
                        s.status === RfqmTransactionSubmissionStatus.SucceededUnconfirmed ||
                        s.status === RfqmTransactionSubmissionStatus.SucceededConfirmed,
                );
                if (successfulTransactions.length !== 1) {
                    throw new Error(
                        `Expected exactly one successful transmission for order ${orderHash}; found ${successfulTransactions.length}`,
                    );
                }
                const successfulTransaction = successfulTransactions[0];
                const successfulTransactionData = transformSubmission(successfulTransaction);
                if (!successfulTransactionData) {
                    throw new Error(`Successful transaction did not have a hash`);
                }
                return {
                    status: status === RfqmJobStatus.SucceededUnconfirmed ? 'succeeded' : 'confirmed',
                    transactions: [successfulTransactionData],
                };
            default:
                ((_x: never): never => {
                    throw new Error('Unreachable');
                })(status);
        }
    }

    /**
     * Runs checks to determine the health of the RFQm system. The results may be distilled to a format needed by integrators.
     */
    public async runHealthCheckAsync(): Promise<HealthCheckResult> {
        const heartbeats = await this._dbUtils.findRfqmWorkerHeartbeatsAsync();
        const registryBalance = await this._blockchainUtils.getAccountBalanceAsync(this._registryAddress);
        return computeHealthCheckAsync(
            RFQM_MAINTENANCE_MODE,
            registryBalance,
            RFQM_MAKER_ASSET_OFFERINGS,
            this._sqsProducer,
            heartbeats,
        );
    }

    public async submitMetaTransactionSignedQuoteAsync(
        params: MetaTransactionSubmitRfqmSignedQuoteParams,
    ): Promise<MetaTransactionSubmitRfqmSignedQuoteResponse> {
        const metaTransactionHash = params.metaTransaction.getHash();

        // check that the firm quote is recognized as a previously returned quote
        const quote = await this._dbUtils.findQuoteByMetaTransactionHashAsync(metaTransactionHash);
        if (quote === undefined) {
            RFQM_SIGNED_QUOTE_NOT_FOUND.inc();
            throw new NotFoundError('quote not found');
        }

        // validate that the expiration window is long enough to fill quote
        const currentTimeMs = new Date().getTime();
        if (
            !params.metaTransaction.expirationTimeSeconds
                .times(ONE_SECOND_MS)
                .isGreaterThan(currentTimeMs + RFQM_MINIMUM_EXPIRY_DURATION_MS)
        ) {
            RFQM_SIGNED_QUOTE_EXPIRY_TOO_SOON.inc();
            throw new ValidationError([
                {
                    field: 'expirationTimeSeconds',
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: `metatransaction will expire too soon`,
                },
            ]);
        }

        // validate that the firm quote is fillable using the origin registry address (this address is assumed to hold ETH)
        try {
            await this._blockchainUtils.validateMetaTransactionOrThrowAsync(
                params.metaTransaction,
                params.signature,
                this._registryAddress,
            );
        } catch (error) {
            logger.error({ error }, 'RFQM quote failed eth_call validation.');
            RFQM_SIGNED_QUOTE_FAILED_ETHCALL_VALIDATION.inc();
            throw new ValidationError([
                {
                    field: 'n/a',
                    code: ValidationErrorCodes.InvalidOrder,
                    reason: `metatransaction is not fillable`,
                },
            ]);
        }

        const rfqmJobOpts = {
            orderHash: quote.orderHash!,
            metaTransactionHash,
            createdAt: new Date(),
            expiry: params.metaTransaction.expirationTimeSeconds,
            chainId: CHAIN_ID,
            integratorId: quote.integratorId ? quote.integratorId : null,
            makerUri: quote.makerUri,
            status: RfqmJobStatus.PendingEnqueued,
            statusReason: null,
            calldata: this._blockchainUtils.generateMetaTransactionCallData(
                params.metaTransaction,
                params.signature,
                quote.affiliateAddress === null ? undefined : quote.affiliateAddress,
            ),
            fee: quote.fee,
            order: quote.order,
            metadata: {
                metaTransaction: params.metaTransaction,
            },
            affiliateAddress: quote.affiliateAddress,
        };

        // this insert will fail if a job has already been created, ensuring
        // that a signed quote cannot be queued twice
        try {
            // make sure job data is persisted to Postgres before queueing task
            await this._dbUtils.writeRfqmJobToDbAsync(rfqmJobOpts);
            await this._enqueueJobAsync(quote.orderHash!);
        } catch (error) {
            logger.error({ error }, 'Failed to queue the quote for submission.');
            throw new InternalServerError(
                `failed to queue the quote for submission, it may have already been submitted`,
            );
        }

        return {
            type: RfqmTypes.MetaTransaction,
            metaTransactionHash,
            orderHash: quote.orderHash!,
        };
    }

    /**
     * Process an orderHash as an RfqmJob. Throws an error if job must be retried
     */
    public async processRfqmJobAsync(orderHash: string, workerAddress: string): Promise<void> {
        logger.info({ orderHash }, 'start processing job');
        const timerStopFn = RFQM_PROCESS_JOB_LATENCY.startTimer();

        // Get job
        const job = await this._dbUtils.findJobByOrderHashAsync(orderHash);
        if (job === undefined) {
            throw new NotFoundError(`job for orderHash ${orderHash} not found`);
        }

        // Basic validation
        const errorStatus = RfqmService._validateJob(job);
        if (errorStatus !== null) {
            await this._dbUtils.updateRfqmJobAsync(orderHash, true, {
                status: errorStatus,
            });
            return;
        }
        const { calldata, makerUri, order, fee } = job;

        // update status to processing if it's a fresh job
        if (job.status === RfqmJobStatus.PendingEnqueued) {
            await this._dbUtils.updateRfqmJobAsync(orderHash, false, {
                status: RfqmJobStatus.PendingProcessing,
            });
        }

        // if haven't performed lastLook yet
        if (job.lastLookResult === null) {
            // Validate w/Eth Call
            // verify the order is fillable before confirming with MM
            try {
                await this._blockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(calldata!, workerAddress);
            } catch (e) {
                RFQM_JOB_FAILED_ETHCALL_VALIDATION.inc();
                logger.warn({ error: e, orderHash }, 'The eth_call validation failed');
                // Terminate with an error transition
                await this._dbUtils.updateRfqmJobAsync(orderHash, true, {
                    status: RfqmJobStatus.FailedEthCallFailed,
                });
                return;
            }

            const takerTokenFillAmount = this._blockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(calldata!);
            const submitRequest: SubmitRequest = {
                order: storedOrderToRfqmOrder(order!),
                orderHash,
                fee: storedFeeToFee(fee!),
                takerTokenFillAmount,
            };
            const shouldProceed = await this._quoteServerClient.confirmLastLookAsync(makerUri!, submitRequest);
            logger.info({ makerUri, shouldProceed, orderHash }, 'Got last look response from market maker');

            if (!shouldProceed) {
                RFQM_JOB_MM_REJECTED_LAST_LOOK.labels(makerUri!).inc();
                // Terminate with an error transition
                await this._dbUtils.updateRfqmJobAsync(orderHash, true, {
                    status: RfqmJobStatus.FailedLastLookDeclined,
                    calldata: '', // clear out calldata so transaction can never be submitted, even by accident
                    lastLookResult: shouldProceed,
                });
                return;
            } else {
                await this._dbUtils.updateRfqmJobAsync(orderHash, false, {
                    status: RfqmJobStatus.PendingLastLookAccepted,
                    lastLookResult: shouldProceed,
                });
            }
        } else {
            // log if last look completed and was previously accepted
            logger.info({ workerAddress, orderHash }, 'last look previously accepted, skipping ahead to submission');
        }

        // submit to chain
        let submissionsMap: SubmissionsMap;
        try {
            submissionsMap = await this.completeSubmissionLifecycleAsync(orderHash, workerAddress, calldata!);
        } catch (err) {
            logger.warn({ error: err, orderHash, workerAddress }, `encountered an error in transaction submission`);
            throw new Error(`encountered an error in transaction submission`);
        }

        // update job status based on transaction submission status
        const finalJobStatus = RfqmService._getJobStatusFromSubmissions(submissionsMap);
        await this._dbUtils.updateRfqmJobAsync(orderHash, true, {
            status: finalJobStatus,
        });

        timerStopFn();
    }

    /**
     * Submit a transaction, re-submit if necessary, and poll for resolution
     */
    public async completeSubmissionLifecycleAsync(
        orderHash: string,
        workerAddress: string,
        callData: string,
    ): Promise<SubmissionsMap> {
        let submissionsMap: SubmissionsMap;

        const previousSubmissions = await this._dbUtils.findRfqmTransactionSubmissionsByOrderHashAsync(orderHash);

        // if there are previous tx submissions (repair mode), pick up monitoring and re-submission
        // else initaliaze the submission context and send the first tx
        const submissionContext =
            previousSubmissions.length > 0
                ? await this._recoverSubmissionContextAsync(workerAddress, orderHash, callData, previousSubmissions)
                : await this._initializeSubmissionContextAsync(workerAddress, orderHash, callData);

        submissionsMap = submissionContext.submissionsMap;
        const nonce = submissionContext.nonce;
        const gasEstimate = submissionContext.gasEstimate;
        let gasPrice = submissionContext.gasPrice;

        const expectedTakerTokenFillAmount = this._blockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(callData);

        let isTxMined = false;
        let isTxConfirmed = false;
        while (!isTxConfirmed) {
            await delay(this._transactionWatcherSleepTimeMs);

            const statusCheckResult = await this._checkSubmissionMapReceiptsAndUpdateDbAsync(
                orderHash,
                submissionsMap,
                expectedTakerTokenFillAmount,
            );
            isTxMined = statusCheckResult.isTxMined;
            isTxConfirmed = statusCheckResult.isTxConfirmed;
            submissionsMap = statusCheckResult.submissionsMap;

            if (!isTxMined) {
                const newGasPrice = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();

                if (RfqmService.shouldResubmitTransaction(gasPrice, newGasPrice)) {
                    logger.info(
                        {
                            workerAddress,
                            orderHash,
                            oldGasPrice: gasPrice,
                            newGasPrice,
                        },
                        're-submitting tx with higher gas price',
                    );
                    gasPrice = newGasPrice;

                    const submission = await this._submitTransactionAsync(
                        orderHash,
                        workerAddress,
                        callData,
                        gasPrice,
                        nonce,
                        gasEstimate,
                    );
                    submissionsMap[submission.transactionHash!] = submission;
                }
            }
        }
        return submissionsMap;
    }

    /**
     * Recover context from a previous submission attempt
     */
    private async _recoverSubmissionContextAsync(
        workerAddress: string,
        orderHash: string,
        callData: string,
        previousSubmissions: RfqmTransactionSubmissionEntity[],
    ): Promise<SubmissionContext> {
        logger.info({ workerAddress, orderHash }, `previous submissions found, recovering context`);
        const submissionsMap: SubmissionsMap = {};

        // setting values to override them
        const nonce = previousSubmissions[0].nonce;
        let gasPrice = previousSubmissions[0].gasPrice;
        for (const submission of previousSubmissions) {
            // make sure this order hasn't been submitted by another worker
            if (submission.from !== workerAddress) {
                logger.warn(
                    { workerAddress, orderHash },
                    `found submissions from a different worker when recovering context`,
                );
                throw new Error('found tx submissions from a different worker');
            }
            submissionsMap[submission.transactionHash!] = submission;

            if (submission.nonce! !== nonce) {
                logger.warn(
                    { workerAddress, orderHash },
                    `found submissions with a different nonce when recovering context`,
                );
                throw new Error(`found different nonces in tx submissions`);
            }

            if (submission.gasPrice!.gt(gasPrice!)) {
                gasPrice = submission.gasPrice!;
            }
        }
        const gasEstimate = await this._blockchainUtils.estimateGasForExchangeProxyCallAsync(callData, workerAddress);

        return {
            submissionsMap,
            nonce: nonce!,
            gasPrice: gasPrice!,
            gasEstimate,
        };
    }

    /**
     * Initialize submission context and send the first transaction
     */
    private async _initializeSubmissionContextAsync(
        workerAddress: string,
        orderHash: string,
        callData: string,
    ): Promise<SubmissionContext> {
        // claim this job for the worker, and set status to submitted
        await this._dbUtils.updateRfqmJobAsync(orderHash, false, {
            status: RfqmJobStatus.PendingSubmitted,
            workerAddress,
        });

        const [gasPrice, nonce, gasEstimate] = await Promise.all([
            this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync(),
            this._blockchainUtils.getNonceAsync(workerAddress),
            this._blockchainUtils.estimateGasForExchangeProxyCallAsync(callData, workerAddress),
        ]);

        const firstSubmission = await this._submitTransactionAsync(
            orderHash,
            workerAddress,
            callData,
            gasPrice,
            nonce,
            gasEstimate,
        );
        const submissionsMap = { [firstSubmission.transactionHash!]: firstSubmission };

        return {
            submissionsMap,
            nonce,
            gasPrice,
            gasEstimate,
        };
    }

    /**
     * Check for receipts from the tx's in a SubmissionsMap object
     * Update database with status of all tx's
     */
    private async _checkSubmissionMapReceiptsAndUpdateDbAsync(
        orderHash: string,
        submissionsMap: SubmissionsMap,
        expectedTakerTokenFillAmount: BigNumber,
    ): Promise<SubmissionsMapStatus> {
        let isTxMined: boolean = false;
        let isTxConfirmed: boolean = false;
        let jobStatus: RfqmJobStatus | null = null;

        // check if any tx has been mined
        const receipts = await Promise.all(
            Object.keys(submissionsMap).map(async (transactionHash) => {
                return {
                    transactionHash,
                    response: await this._blockchainUtils.getTransactionReceiptIfExistsAsync(transactionHash),
                };
            }),
        );

        for (const receipt of receipts) {
            if (receipt.response !== undefined) {
                isTxMined = true;
                const currentBlock = await this._blockchainUtils.getCurrentBlockAsync();
                isTxConfirmed = RfqmService.isBlockConfirmed(currentBlock, receipt.response.blockNumber);

                // update all entities
                // since the same nonce is being re-used, we expect only 1 defined receipt
                for (const r of receipts) {
                    if (r.response !== undefined) {
                        if (r.response.status === 1) {
                            const decodedLog = this._blockchainUtils.getDecodedRfqOrderFillEventLogFromLogs(
                                r.response.logs,
                            );
                            jobStatus = isTxConfirmed
                                ? RfqmJobStatus.SucceededConfirmed
                                : RfqmJobStatus.SucceededUnconfirmed;
                            submissionsMap[r.transactionHash].status = isTxConfirmed
                                ? RfqmTransactionSubmissionStatus.SucceededConfirmed
                                : RfqmTransactionSubmissionStatus.SucceededUnconfirmed;
                            submissionsMap[r.transactionHash].metadata = {
                                expectedTakerTokenFillAmount: expectedTakerTokenFillAmount.toString(),
                                actualTakerFillAmount: decodedLog.args.takerTokenFilledAmount.toString(),
                                decodedFillLog: JSON.stringify(decodedLog),
                            };
                        } else {
                            jobStatus = isTxConfirmed
                                ? RfqmJobStatus.FailedRevertedConfirmed
                                : RfqmJobStatus.FailedRevertedUnconfirmed;
                            submissionsMap[r.transactionHash].status = isTxConfirmed
                                ? RfqmTransactionSubmissionStatus.RevertedConfirmed
                                : RfqmTransactionSubmissionStatus.RevertedUnconfirmed;
                            submissionsMap[r.transactionHash].metadata = null;
                            submissionsMap[r.transactionHash].metadata = {
                                expectedTakerTokenFillAmount: expectedTakerTokenFillAmount.toString(),
                                actualTakerFillAmount: '0',
                                decodedFillLog: '{}',
                            };
                        }
                        submissionsMap[r.transactionHash].blockMined = new BigNumber(r.response.blockNumber);
                        submissionsMap[r.transactionHash].gasUsed = new BigNumber(r.response.gasUsed);
                        submissionsMap[r.transactionHash].updatedAt = new Date();
                    } else {
                        submissionsMap[r.transactionHash].status = RfqmTransactionSubmissionStatus.DroppedAndReplaced;
                        submissionsMap[r.transactionHash].blockMined = null;
                        submissionsMap[r.transactionHash].gasUsed = null;
                        submissionsMap[r.transactionHash].updatedAt = new Date();
                        submissionsMap[r.transactionHash].metadata = {
                            expectedTakerTokenFillAmount: expectedTakerTokenFillAmount.toString(),
                            actualTakerFillAmount: '0',
                            decodedFillLog: '{}',
                        };
                    }
                }
                await this._dbUtils.updateRfqmTransactionSubmissionsAsync(Object.values(submissionsMap));
                if (jobStatus !== null) {
                    await this._dbUtils.updateRfqmJobAsync(orderHash, false, { status: jobStatus });
                }
                break;
            }
        }

        return {
            isTxMined,
            isTxConfirmed,
            submissionsMap,
        };
    }

    /**
     * Determine transaction properties and submit a transaction
     */
    private async _submitTransactionAsync(
        orderHash: string,
        workerAddress: string,
        callData: string,
        gasPrice: BigNumber,
        nonce: number,
        gasEstimate: number,
    ): Promise<RfqmTransactionSubmissionEntity> {
        const txOptions = {
            nonce,
            gas: gasEstimate,
            gasPrice,
            value: 0,
        };

        // submit tx to chain
        // TODO: get transaction hash prior to submission and save to DB first
        const transactionHash = await this._blockchainUtils.submitCallDataToExchangeProxyAsync(
            callData,
            workerAddress,
            txOptions,
        );

        // save tx submission to DB
        const partialEntity: Partial<RfqmTransactionSubmissionEntity> = {
            transactionHash,
            orderHash,
            createdAt: new Date(),
            from: workerAddress,
            to: this._blockchainUtils.getExchangeProxyAddress(),
            gasPrice,
            nonce,
            status: RfqmTransactionSubmissionStatus.Submitted,
        };

        return this._dbUtils.writeRfqmTransactionSubmissionToDbAsync(partialEntity);
    }

    private async _enqueueJobAsync(orderHash: string): Promise<void> {
        await this._sqsProducer.send({
            // wait, it's all order hash?
            // always has been.
            groupId: orderHash,
            id: orderHash,
            body: JSON.stringify({ orderHash }),
            deduplicationId: orderHash,
        });
    }
}
