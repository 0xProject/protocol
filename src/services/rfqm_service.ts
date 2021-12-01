// tslint:disable:max-file-line-count
import { TooManyRequestsError } from '@0x/api-utils';
import { AssetSwapperContractAddresses, MarketOperation, ProtocolFeeUtils, QuoteRequestor } from '@0x/asset-swapper';
// tslint:disable-next-line:no-duplicate-imports
import { V4RFQIndicativeQuoteMM } from '@0x/asset-swapper';
import { RfqmRequestOptions } from '@0x/asset-swapper/lib/src/types';
import { OtcOrder, RfqOrder } from '@0x/protocol-utils';
import { Fee, SubmitRequest } from '@0x/quote-server/lib/src/types';
import { getTokenMetadataIfExists } from '@0x/token-metadata';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import delay from 'delay';
import { Producer as KafkaProducer } from 'kafkajs';
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
    RFQM_NUM_BUCKETS,
    RFQM_TX_GAS_ESTIMATE,
    RFQM_TX_OTC_ORDER_GAS_ESTIMATE,
} from '../constants';
import {
    RfqmJobEntity,
    RfqmQuoteEntity,
    RfqmTransactionSubmissionEntity,
    RfqmV2TransactionSubmissionEntity,
} from '../entities';
import { RfqmV2JobConstructorOpts } from '../entities/RfqmV2JobEntity';
import { RfqmJobStatus, RfqmOrderTypes, RfqmTransactionSubmissionStatus } from '../entities/types';
import { InternalServerError, NotFoundError, ValidationError, ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { FirmOtcQuote, FirmQuote, IndicativeQuote } from '../types';
import { CacheClient } from '../utils/cache_client';
import { PairsManager } from '../utils/pairs_manager';
import { getBestQuote } from '../utils/quote_comparison_utils';
import { quoteReportUtils } from '../utils/quote_report_utils';
import { QuoteServerClient } from '../utils/quote_server_client';
import {
    feeToStoredFee,
    otcOrderToStoredOtcOrder,
    RfqmDbUtils,
    storedFeeToFee,
    storedOrderToRfqmOrder,
    v4RfqOrderToStoredOrder,
} from '../utils/rfqm_db_utils';
import { calculateGasEstimate } from '../utils/rfqm_gas_estimate_utils';
import { computeHealthCheckAsync, HealthCheckResult } from '../utils/rfqm_health_check';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { getSignerFromHash } from '../utils/signature_utils';

import {
    FetchFirmQuoteParams,
    FetchFirmQuoteResponse,
    FetchIndicativeQuoteParams,
    FetchIndicativeQuoteResponse,
    MetaTransactionSubmitRfqmSignedQuoteParams,
    MetaTransactionSubmitRfqmSignedQuoteResponse,
    OtcOrderSubmitRfqmSignedQuoteParams,
    OtcOrderSubmitRfqmSignedQuoteResponse,
    RfqmTypes,
    StatusResponse,
} from './types';

export const BLOCK_FINALITY_THRESHOLD = 3;
const MIN_GAS_PRICE_INCREASE = 0.1;
interface SubmissionsMap {
    [transactionHash: string]: Partial<RfqmTransactionSubmissionEntity>;
}

interface GasFees {
    maxFeePerGas: BigNumber;
    maxPriorityFeePerGas: BigNumber;
}
interface SubmissionContext {
    submissionsMap: SubmissionsMap;
    nonce: number;
    gasEstimate: number;
    gasFees: GasFees;
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
const RFQM_TAKER_AND_TAKERTOKEN_TRADE_EXISTS = new Counter({
    name: 'rfqm_signed_quote_taker_and_takertoken_trade_exists',
    help: 'A trade was submitted when the system already had a pending trade for the same taker and takertoken',
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

const INITIAL_MAX_PRIORITY_FEE_PER_GAS = new BigNumber(2e9); // in wei
// Retrying an EIP 1559 transaction: https://docs.alchemy.com/alchemy/guides/eip-1559/retry-eip-1559-tx
const MAX_PRIORITY_FEE_PER_GAS_MULTIPLIER = new BigNumber(1.5);

/**
 * RfqmService is the coordination layer for HTTP based RFQM flows.
 */
export class RfqmService {
    private readonly _tokenDecimalsCache: Map<string, number> = new Map();

    public static shouldResubmitTransaction(gasFees: GasFees, gasPriceEstimate: BigNumber): boolean {
        // Geth only allows replacement of transactions if the replacement gas price
        // is at least 10% higher than the gas price of the transaction being replaced
        return gasPriceEstimate.gte(gasFees.maxFeePerGas.multipliedBy(MIN_GAS_PRICE_INCREASE + 1));
    }

    public static isBlockConfirmed(currentBlock: number, receiptBlockNumber: number): boolean {
        // We specify a finality threshold of n blocks deep to have greater confidence
        // in the transaction receipt
        return currentBlock - receiptBlockNumber >= BLOCK_FINALITY_THRESHOLD;
    }

    // Returns a failure status for invalid jobs and null if the job is valid.
    public static validateJob(job: RfqmJobEntity): RfqmJobStatus | null {
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

        if (order.type === RfqmOrderTypes.V4Rfq) {
            // Orders can expire if any of the following happen:
            // 1) workers are backed up
            // 2) an RFQM order broke during submission and the order is stuck in the queue for a long time.
            const v4Order = order.order;
            const expiryTimeMs = new BigNumber(v4Order.expiry).times(ONE_SECOND_MS);
            if (expiryTimeMs.isNaN() || expiryTimeMs.lte(new Date().getTime())) {
                return RfqmJobStatus.FailedExpired;
            }
        }

        return null;
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
        private readonly _cacheClient: CacheClient,
        private readonly _pairsManager: PairsManager,
        private readonly _kafkaProducer?: KafkaProducer,
    ) {}

    /**
     * Utility function to get the decimals for an ERC20 token by its address.
     * First checks 0x/token-metadata for the information, and if not present,
     * queries the data from the blockchain.
     *
     * Uses an in-memory cache to store previously-fetched values.
     *
     * Throws if there is a problem fetching the data from on chain.
     */
    public async getTokenDecimalsAsync(tokenAddress: string): Promise<number> {
        const localMetadata = getTokenMetadataIfExists(tokenAddress, CHAIN_ID);
        if (localMetadata) {
            return localMetadata.decimals;
        }
        const cachedDecimals = this._tokenDecimalsCache.get(tokenAddress);
        if (cachedDecimals) {
            return cachedDecimals;
        }
        const onchainDecimals = await this._blockchainUtils.getTokenDecimalsAsync(tokenAddress);
        logger.info(
            { tokenAddress, decimals: onchainDecimals, cacheSize: this._tokenDecimalsCache.size },
            'Token decimals fetched from blockchain',
        );
        this._tokenDecimalsCache.set(tokenAddress, onchainDecimals);
        return onchainDecimals;
    }

    /**
     * Fetch the best indicative quote available. Returns null if no valid quotes found
     */
    public async fetchIndicativeQuoteAsync(
        params: FetchIndicativeQuoteParams,
    ): Promise<FetchIndicativeQuoteResponse | null> {
        const {
            sellAmount,
            buyAmount,
            sellToken: takerToken,
            buyToken: makerToken,
            sellTokenDecimals: takerTokenDecimals,
            buyTokenDecimals: makerTokenDecimals,
        } = params;

        // Get desired fill amount
        const isSelling = sellAmount !== undefined;
        const assetFillAmount = isSelling ? sellAmount! : buyAmount!;

        // Get the gas price
        const gasPrice: BigNumber = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();

        // Fetch all indicative quotes
        const indicativeQuotes = await this._fetchIndicativeQuotesAsync(params, gasPrice);

        // Get the best quote
        const bestQuote = getBestQuote(
            indicativeQuotes,
            isSelling,
            takerToken,
            makerToken,
            assetFillAmount,
            RFQM_MINIMUM_EXPIRY_DURATION_MS,
        );

        // Quote Report
        if (this._kafkaProducer) {
            quoteReportUtils.publishRFQMQuoteReport(
                {
                    taker: params.takerAddress,
                    buyTokenAddress: makerToken,
                    sellTokenAddress: takerToken,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    integratorId: params.integrator?.integratorId,
                    allQuotes: indicativeQuotes,
                    bestQuote,
                },
                this._kafkaProducer,
            );
        }

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
            integrator,
            takerAddress,
            affiliateAddress,
        } = params;

        // Quote Requestor specific params
        const isSelling = sellAmount !== undefined;
        const assetFillAmount = isSelling ? sellAmount! : buyAmount!;

        // Fetch the current gas price
        const gasPrice: BigNumber = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();

        // Fetch all firm quotes and fee
        const { quotes: firmQuotes, otcOrderFee, rfqOrderFee } = await this._fetchFirmQuotesAsync(params, gasPrice);

        // Get the best quote
        const bestQuote = getBestQuote(
            firmQuotes,
            isSelling,
            takerToken,
            makerToken,
            assetFillAmount,
            RFQM_MINIMUM_EXPIRY_DURATION_MS,
        );

        // Quote Report
        if (this._kafkaProducer) {
            quoteReportUtils.publishRFQMQuoteReport(
                {
                    taker: params.takerAddress,
                    buyTokenAddress: makerToken,
                    sellTokenAddress: takerToken,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    integratorId: params.integrator?.integratorId,
                    allQuotes: firmQuotes,
                    bestQuote,
                },
                this._kafkaProducer,
            );
        }

        // No quote found
        if (bestQuote === null) {
            return null;
        }

        // Get the fee
        const fee = bestQuote.kind === 'rfq' ? rfqOrderFee : otcOrderFee;

        // Get the makerUri
        const makerUri = bestQuote.makerUri;
        if (makerUri === undefined) {
            logger.error({ makerAddress: bestQuote.order.maker }, 'makerUri unknown for maker address');
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
        const orderHash = bestQuote.order.getHash();

        // Handle Metatransaction flow
        if (bestQuote.kind === 'rfq') {
            const rfqOrder = bestQuote.order;

            // Generate the Meta Transaction and its hash
            const metaTransaction = this._blockchainUtils.generateMetaTransaction(
                rfqOrder,
                bestQuote.makerSignature,
                takerAddress,
                takerAmount,
                CHAIN_ID,
            );
            const metaTransactionHash = metaTransaction.getHash();

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
                    integratorId: integrator.integratorId,
                }),
            );
            RFQM_QUOTE_INSERTED.labels(integrator.integratorId, integrator.integratorId, makerUri).inc();

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

        // Otherwise, OtcOrder flow
        const otcOrder = bestQuote.order;
        await this._dbUtils.writeV2QuoteAsync({
            orderHash,
            chainId: CHAIN_ID,
            fee: feeToStoredFee(fee),
            order: otcOrderToStoredOtcOrder(otcOrder),
            makerUri,
            affiliateAddress,
            integratorId: integrator.integratorId,
        });
        RFQM_QUOTE_INSERTED.labels(integrator.integratorId, integrator.integratorId, makerUri).inc();
        return {
            type: RfqmTypes.OtcOrder,
            price: roundedPrice,
            gas: gasPrice,
            buyAmount: makerAmount,
            buyTokenAddress: bestQuote.order.makerToken,
            sellAmount: takerAmount,
            sellTokenAddress: bestQuote.order.takerToken,
            allowanceTarget: this._contractAddresses.exchangeProxy,
            order: bestQuote.order,
            orderHash,
        };
    }

    public async workerBeforeLogicAsync(workerAddress: string): Promise<boolean> {
        let gasPrice;
        try {
            gasPrice = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        } catch (error) {
            logger.error(
                { errorMessage: error.message },
                'Current gas price is unable to be fetched, marking worker as not ready.',
            );
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
            try {
                await this.processRfqmJobAsync(job.orderHash, workerAddress);
            } catch (error) {
                logger.error(
                    { errorMessage: error.message, orderHash: job.orderHash, workerAddress },
                    'Error reprocessing rfqm job',
                );
                throw error;
            }
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
        } catch (error) {
            logger.error(
                { workerAddress, balance, errorMessage: error.message },
                'Worker failed to write a heartbeat to storage',
            );
        }

        RFQM_WORKER_READY.labels(workerAddress).inc();
        return true;
    }

    public async getOrderStatusAsync(orderHash: string): Promise<StatusResponse | null> {
        const transformSubmission = (
            submission: RfqmTransactionSubmissionEntity | RfqmV2TransactionSubmissionEntity,
        ) => {
            const { transactionHash: hash, createdAt } = submission;
            return hash ? { hash, timestamp: createdAt.getTime() } : null;
        };

        const transformSubmissions = (
            submissions: (RfqmTransactionSubmissionEntity | RfqmV2TransactionSubmissionEntity)[],
        ) => submissions.map(transformSubmission).flatMap((s) => (s ? s : []));

        const [jobV1, jobV2] = await Promise.all([
            this._dbUtils.findJobByOrderHashAsync(orderHash),
            this._dbUtils.findV2JobByOrderHashAsync(orderHash),
        ]);

        let isV2 = false;
        let status: RfqmJobStatus;
        let expiry: BigNumber;

        if (jobV1 === undefined && jobV2 === undefined) {
            // Both not found
            return null;
        } else if (jobV2 !== undefined && jobV1 !== undefined) {
            // Both found
            throw new Error(`Multiple jobs found for ${orderHash}`);
        } else if (jobV2 !== undefined) {
            // Only V2 found
            isV2 = true;
            status = jobV2.status;
            expiry = jobV2.expiry;
        } else {
            // Only V1 found
            status = jobV1!.status;
            expiry = jobV1!.expiry;
        }

        if (status === RfqmJobStatus.PendingEnqueued && expiry.multipliedBy(ONE_SECOND_MS).lt(Date.now())) {
            // the workers are dead/on vacation and the expiration time has passed
            return {
                status: 'failed',
                transactions: [],
            };
        }

        const transactionSubmissions: (RfqmTransactionSubmissionEntity | RfqmV2TransactionSubmissionEntity)[] = isV2
            ? await this._dbUtils.findV2TransactionSubmissionsByOrderHashAsync(orderHash)
            : await this._dbUtils.findRfqmTransactionSubmissionsByOrderHashAsync(orderHash);

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
        let gasPrice: BigNumber | undefined;
        try {
            gasPrice = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        } catch (error) {
            logger.warn({ errorMessage: error.message }, 'Failed to get gas price for health check');
        }
        return computeHealthCheckAsync(
            RFQM_MAINTENANCE_MODE,
            registryBalance,
            RFQM_MAKER_ASSET_OFFERINGS,
            this._sqsProducer,
            heartbeats,
            gasPrice,
        );
    }

    /**
     * Validates and Enqueues the signed MetaTransaction for processing
     */
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

        // verify that there is not a pending transaction for this taker and taker token
        const pendingJobs = await this._dbUtils.findJobsWithStatusesAsync([
            RfqmJobStatus.PendingEnqueued,
            RfqmJobStatus.PendingProcessing,
            RfqmJobStatus.PendingLastLookAccepted,
            RfqmJobStatus.PendingSubmitted,
        ]);

        if (
            pendingJobs.some(
                (job) =>
                    job.order?.order.taker.toLowerCase() === quote.order?.order.taker.toLowerCase() &&
                    job.order?.order.takerToken.toLowerCase() === quote.order?.order.takerToken.toLowerCase() &&
                    // Other logic handles the case where the same order is submitted twice
                    job.metaTransactionHash !== quote.metaTransactionHash,
            )
        ) {
            RFQM_TAKER_AND_TAKERTOKEN_TRADE_EXISTS.inc();
            throw new TooManyRequestsError('a pending trade for this taker and takertoken already exists');
        }
        // validate that the firm quote is fillable using the origin registry address (this address is assumed to hold ETH)
        try {
            await this._blockchainUtils.validateMetaTransactionOrThrowAsync(
                params.metaTransaction,
                params.signature,
                this._registryAddress,
            );
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'RFQM quote failed eth_call validation.');
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
            await this._enqueueJobAsync(quote.orderHash!, RfqmTypes.MetaTransaction);
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'Failed to queue the quote for submission.');
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
     * Validates and enqueues the Taker Signed Otc Order for submission
     */
    public async submitTakerSignedOtcOrderAsync(
        params: OtcOrderSubmitRfqmSignedQuoteParams,
    ): Promise<OtcOrderSubmitRfqmSignedQuoteResponse> {
        const { order, signature: takerSignature } = params;
        const orderHash = params.order.getHash();

        // check that the orderHash is indeed a recognized quote
        const quote = await this._dbUtils.findV2QuoteByOrderHashAsync(orderHash);
        if (quote === undefined) {
            RFQM_SIGNED_QUOTE_NOT_FOUND.inc();
            throw new NotFoundError('quote not found');
        }

        // validate that the expiration window is long enough to fill quote
        const currentTimeMs = new Date().getTime();
        if (!params.order.expiry.times(ONE_SECOND_MS).isGreaterThan(currentTimeMs + RFQM_MINIMUM_EXPIRY_DURATION_MS)) {
            RFQM_SIGNED_QUOTE_EXPIRY_TOO_SOON.inc();
            throw new ValidationError([
                {
                    field: 'expiryAndNonce',
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: `order will expire too soon`,
                },
            ]);
        }

        // validate that there is not a pending transaction for this taker and taker token
        const pendingJobs = await this._dbUtils.findV2JobsWithStatusesAsync([
            RfqmJobStatus.PendingEnqueued,
            RfqmJobStatus.PendingProcessing,
            RfqmJobStatus.PendingLastLookAccepted,
            RfqmJobStatus.PendingSubmitted,
        ]);

        if (
            pendingJobs.some(
                (job) =>
                    job.order?.order.taker.toLowerCase() === quote.order?.order.taker.toLowerCase() &&
                    job.order?.order.takerToken.toLowerCase() === quote.order?.order.takerToken.toLowerCase() &&
                    // Other logic handles the case where the same order is submitted twice
                    job.orderHash !== quote.orderHash,
            )
        ) {
            RFQM_TAKER_AND_TAKERTOKEN_TRADE_EXISTS.inc();
            throw new TooManyRequestsError('a pending trade for this taker and takertoken already exists');
        }

        // validate that the given taker signature is valid
        const signerAddress = getSignerFromHash(orderHash, takerSignature).toLowerCase();
        const takerAddress = order.taker.toLowerCase();
        if (signerAddress !== takerAddress) {
            logger.warn({ signerAddress, takerAddress, orderHash }, 'Signature is invalid');
            throw new ValidationError([
                {
                    field: 'signature',
                    code: ValidationErrorCodes.InvalidSignatureOrHash,
                    reason: `signature is not valid`,
                },
            ]);
        }

        // validate that order is fillable by both the maker and the taker according to balances and allowances
        const [makerBalance, takerBalance] = await this._blockchainUtils.getTokenBalancesAsync(
            [order.maker, order.taker],
            [order.makerAmount.toString(), order.takerAmount.toString()],
        );
        if (makerBalance.lt(order.makerAmount) || takerBalance.lt(order.takerAmount)) {
            throw new ValidationError([
                {
                    field: 'n/a',
                    code: ValidationErrorCodes.InvalidOrder,
                    reason: `order is not fillable`,
                },
            ]);
        }

        // prepare the job
        const rfqmJobOpts: RfqmV2JobConstructorOpts = {
            orderHash: quote.orderHash!,
            createdAt: new Date(),
            expiry: order.expiry,
            chainId: CHAIN_ID,
            integratorId: quote.integratorId ? quote.integratorId : null,
            makerUri: quote.makerUri,
            status: RfqmJobStatus.PendingEnqueued,
            fee: quote.fee,
            order: quote.order,
            takerSignature,
            affiliateAddress: quote.affiliateAddress,
        };

        // this insert will fail if a job has already been created, ensuring
        // that a signed quote cannot be queued twice
        try {
            // make sure job data is persisted to Postgres before queueing task
            await this._dbUtils.writeV2JobAsync(rfqmJobOpts);
            await this._enqueueJobAsync(quote.orderHash!, RfqmTypes.OtcOrder);
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'Failed to queue the quote for submission.');
            throw new InternalServerError(
                `failed to queue the quote for submission, it may have already been submitted`,
            );
        }

        return {
            type: RfqmTypes.OtcOrder,
            orderHash: quote.orderHash!,
        };
    }

    /**
     * Process an orderHash as an RfqmJob. Throws an error if job must be retried
     */
    public async processRfqmJobAsync(orderHash: string, workerAddress: string): Promise<void> {
        logger.info({ orderHash, workerAddress }, 'Start processing job');
        const timerStopFn = RFQM_PROCESS_JOB_LATENCY.startTimer();

        // Get job
        const job = await this._dbUtils.findJobByOrderHashAsync(orderHash);
        if (job === undefined) {
            throw new NotFoundError(`job for orderHash ${orderHash} not found`);
        }

        // Basic validation
        const errorStatus = RfqmService.validateJob(job);
        if (errorStatus !== null) {
            await this._dbUtils.updateRfqmJobAsync(orderHash, true, {
                status: errorStatus,
            });

            if (errorStatus === RfqmJobStatus.FailedExpired) {
                logger.error({ orderHash }, 'Job expired and cannot be processed. Marking job as complete');
                RFQM_SIGNED_QUOTE_EXPIRY_TOO_SOON.inc();
            }
            timerStopFn();
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
                logger.error({ errorMessage: e.message, orderHash }, 'The eth_call validation failed');
                // Terminate with an error transition
                await this._dbUtils.updateRfqmJobAsync(orderHash, true, {
                    status: RfqmJobStatus.FailedEthCallFailed,
                });
                timerStopFn();
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

            if (shouldProceed) {
                await this._dbUtils.updateRfqmJobAsync(orderHash, false, {
                    status: RfqmJobStatus.PendingLastLookAccepted,
                    lastLookResult: shouldProceed,
                });
            } else {
                RFQM_JOB_MM_REJECTED_LAST_LOOK.labels(makerUri!).inc();
                // Terminate with an error transition
                await this._dbUtils.updateRfqmJobAsync(orderHash, true, {
                    status: RfqmJobStatus.FailedLastLookDeclined,
                    calldata: '', // clear out calldata so transaction can never be submitted, even by accident
                    lastLookResult: shouldProceed,
                });
                return;
            }
        } else {
            // log if last look completed and was previously accepted
            logger.info({ workerAddress, orderHash }, 'Last look previously accepted, skipping ahead to submission');
        }

        // submit to chain
        let finalJobStatus: RfqmJobStatus.FailedRevertedConfirmed | RfqmJobStatus.SucceededConfirmed;
        try {
            finalJobStatus = await this.completeSubmissionLifecycleAsync(orderHash, workerAddress, calldata!);
        } catch (error) {
            logger.error(
                { errorMessage: error.message, orderHash, workerAddress },
                `Encountered an error in transaction submission`,
            );
            timerStopFn();
            throw new Error(`encountered an error in transaction submission`);
        }

        // update job status based on final transaction submission status
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
    ): Promise<RfqmJobStatus.FailedRevertedConfirmed | RfqmJobStatus.SucceededConfirmed> {
        const previousSubmissions = await this._dbUtils.findRfqmTransactionSubmissionsByOrderHashAsync(orderHash);

        // if there are previous tx submissions (repair mode), pick up monitoring and re-submission
        // else initialize the submission context and send the first tx
        const submissionContext =
            previousSubmissions.length > 0
                ? await this._recoverSubmissionContextAsync(workerAddress, orderHash, callData, previousSubmissions)
                : await this._initializeSubmissionContextAsync(workerAddress, orderHash, callData);

        const submittedTxHashes = Object.keys(submissionContext.submissionsMap);
        const { nonce, gasEstimate } = submissionContext;
        let gasFees = submissionContext.gasFees;

        const expectedTakerTokenFillAmount = this._blockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(callData);

        while (true) {
            // We've already submitted the transaction once at this point, so we first need to wait checking the status.
            await delay(this._transactionWatcherSleepTimeMs);

            const jobStatus = await this._checkSubmissionMapReceiptsAndUpdateDbAsync(
                orderHash,
                submittedTxHashes,
                expectedTakerTokenFillAmount,
            );

            switch (jobStatus) {
                case RfqmJobStatus.PendingSubmitted:
                    const gasPriceEstimate = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();

                    if (RfqmService.shouldResubmitTransaction(gasFees, gasPriceEstimate)) {
                        logger.info(
                            {
                                workerAddress,
                                orderHash,
                                gasFees,
                                gasPriceEstimate,
                            },
                            'Resubmitting tx with higher gas price',
                        );

                        gasFees = {
                            maxFeePerGas: gasPriceEstimate,
                            maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas.multipliedBy(
                                MAX_PRIORITY_FEE_PER_GAS_MULTIPLIER,
                            ),
                        };

                        // TODO(rhinodavid): make sure a throw here gets handled
                        const transactionHash = (
                            await this._submitTransactionAsync(
                                orderHash,
                                workerAddress,
                                callData,
                                gasFees,
                                nonce,
                                gasEstimate,
                            )
                        ).transactionHash!;
                        logger.info(
                            { workerAddress, orderHash, transactionHash },
                            'Successfully resubmited tx with higher gas price',
                        );
                        submittedTxHashes.push(transactionHash);
                    }
                    break;
                case RfqmJobStatus.FailedRevertedUnconfirmed:
                case RfqmJobStatus.SucceededUnconfirmed:
                    break;
                case RfqmJobStatus.FailedRevertedConfirmed:
                case RfqmJobStatus.SucceededConfirmed:
                    return jobStatus;
                default:
                    throw new Error('Unreachable');
            }
        }
    }

    /**
     * Internal method to fetch indicative quotes. Handles fetching both Rfq and Otc quotes
     */
    private async _fetchIndicativeQuotesAsync(
        params: FetchIndicativeQuoteParams,
        gasPrice: BigNumber,
    ): Promise<V4RFQIndicativeQuoteMM[]> {
        // Extract params
        const { sellAmount, buyAmount, sellToken: takerToken, buyToken: makerToken, integrator } = params;

        // Quote Requestor specific params
        const isSelling = sellAmount !== undefined;
        const marketOperation = isSelling ? MarketOperation.Sell : MarketOperation.Buy;
        const assetFillAmount = isSelling ? sellAmount! : buyAmount!;

        // Prepare gas estimate and fee
        const rfqOrderFeeAmount = gasPrice.times(RFQM_TX_GAS_ESTIMATE);
        const otcOrderFeeAmount = gasPrice.times(RFQM_TX_OTC_ORDER_GAS_ESTIMATE);

        // Create Rfq Order request options
        const rfqOrderOpts: RfqmRequestOptions = {
            ...RFQM_DEFAULT_OPTS,
            txOrigin: this._registryAddress,
            integrator,
            intentOnFilling: false,
            isIndicative: true,
            isLastLook: true,
            fee: {
                amount: rfqOrderFeeAmount,
                token: this._contractAddresses.etherToken,
                type: 'fixed',
            },
        };

        // Create Otc Order request options
        const otcOrderParams = QuoteServerClient.makeQueryParameters({
            txOrigin: this._registryAddress,
            takerAddress: NULL_ADDRESS,
            marketOperation,
            buyTokenAddress: makerToken,
            sellTokenAddress: takerToken,
            assetFillAmount,
            isLastLook: true,
            fee: {
                amount: otcOrderFeeAmount,
                token: this._contractAddresses.etherToken,
                type: 'fixed',
            },
        });
        const otcOrderMakerUris = this._pairsManager.getRfqmMakerUrisForPairOnOtcOrder(makerToken, takerToken);

        // Fetch quotes
        const [rfqOrderQuotes, otcOrderQuotes] = await Promise.all([
            this._quoteRequestor.requestRfqmIndicativeQuotesAsync(
                makerToken,
                takerToken,
                assetFillAmount,
                marketOperation,
                undefined,
                rfqOrderOpts,
            ),
            otcOrderMakerUris.length > 0
                ? this._quoteServerClient.batchGetPriceV2Async(otcOrderMakerUris, integrator, otcOrderParams)
                : Promise.resolve([]),
        ]);
        const indicativeQuotes = rfqOrderQuotes.concat(otcOrderQuotes);
        return indicativeQuotes;
    }

    /**
     * Internal method to fetch firm quotes. Handles fetching both Rfq and Otc quotes
     */
    private async _fetchFirmQuotesAsync(
        params: FetchFirmQuoteParams,
        gasPrice: BigNumber,
    ): Promise<{
        quotes: FirmQuote[];
        otcOrderFee: Fee;
        rfqOrderFee: Fee;
    }> {
        // Extract params
        const { sellAmount, buyAmount, sellToken: takerToken, buyToken: makerToken, integrator, takerAddress } = params;

        // Quote Requestor specific params
        const isSelling = sellAmount !== undefined;
        const marketOperation = isSelling ? MarketOperation.Sell : MarketOperation.Buy;
        const assetFillAmount = isSelling ? sellAmount! : buyAmount!;

        // Prepare gas estimate and fee
        const rfqOrderGasEstimate = calculateGasEstimate(makerToken, takerToken, 'rfq');
        const rfqOrderFeeAmount = gasPrice.times(rfqOrderGasEstimate);
        const rfqOrderFee: Fee = {
            amount: rfqOrderFeeAmount,
            token: this._contractAddresses.etherToken,
            type: 'fixed',
        };

        const otcOrderGasEstimate = calculateGasEstimate(makerToken, takerToken, 'otc');
        const otcOrderFeeAmount = gasPrice.times(otcOrderGasEstimate);
        const otcOrderFee: Fee = {
            amount: otcOrderFeeAmount,
            token: this._contractAddresses.etherToken,
            type: 'fixed',
        };

        // Fetch the current bucket
        const currentBucket = (await this._cacheClient.getNextOtcOrderBucketAsync()) % RFQM_NUM_BUCKETS;

        // Create RfqOrder request options
        const opts: RfqmRequestOptions = {
            ...RFQM_DEFAULT_OPTS,
            takerAddress,
            txOrigin: this._registryAddress,
            integrator,
            intentOnFilling: true,
            isIndicative: false,
            isLastLook: true,
            fee: rfqOrderFee,
        };

        // Create Otc Order request options
        const nowSeconds = Math.floor(Date.now() / ONE_SECOND_MS);
        const otcOrderParams = QuoteServerClient.makeQueryParameters({
            txOrigin: this._registryAddress,
            takerAddress,
            marketOperation,
            buyTokenAddress: makerToken,
            sellTokenAddress: takerToken,
            assetFillAmount,
            isLastLook: true,
            fee: otcOrderFee,
        });
        const otcOrderMakerUris = this._pairsManager.getRfqmMakerUrisForPairOnOtcOrder(makerToken, takerToken);

        // Fetch quotes
        const [rfqQuotes, otcQuotes] = await Promise.all([
            this._quoteRequestor
                .requestRfqmFirmQuotesAsync(makerToken, takerToken, assetFillAmount, marketOperation, undefined, opts)
                .then((quotes) =>
                    quotes.map((q): FirmQuote => {
                        return {
                            order: new RfqOrder(q.order),
                            kind: 'rfq',
                            makerSignature: q.signature,
                            makerUri: this._quoteRequestor.getMakerUriForSignature(q.signature)!,
                        };
                    }),
                ),
            otcOrderMakerUris.length > 0
                ? this._quoteServerClient
                      .batchGetPriceV2Async(otcOrderMakerUris, integrator, otcOrderParams)
                      .then((quotes) =>
                          quotes.map(
                              (q): FirmQuote =>
                                  this._mapIndicativeQuoteToFirmOtcQuote(
                                      q,
                                      takerAddress,
                                      new BigNumber(currentBucket),
                                      new BigNumber(nowSeconds),
                                  ),
                          ),
                      )
                : Promise.resolve([]),
        ]);

        const firmQuotes: FirmQuote[] = rfqQuotes.concat(otcQuotes);

        const firmQuotesWithCorrectChainId = firmQuotes.filter((quote) => {
            if (quote.order.chainId !== CHAIN_ID) {
                logger.error({ quote }, 'Received a quote with incorrect chain id');
                return false;
            }
            return true;
        });

        return {
            quotes: firmQuotesWithCorrectChainId,
            otcOrderFee,
            rfqOrderFee,
        };
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
        logger.info({ workerAddress, orderHash }, `Previous submissions found, recovering context`);
        const submissionsMap: SubmissionsMap = {};

        // setting values to override them
        const nonce = previousSubmissions[0].nonce;
        for (const submission of previousSubmissions) {
            // make sure this order hasn't been submitted by another worker
            if (submission.from !== workerAddress) {
                logger.warn(
                    { workerAddress, orderHash },
                    `Found submissions from a different worker when recovering context`,
                );
                throw new Error('found tx submissions from a different worker');
            }
            submissionsMap[submission.transactionHash!] = submission;

            if (submission.nonce! !== nonce) {
                logger.warn(
                    { workerAddress, orderHash },
                    `Found submissions with a different nonce when recovering context`,
                );
                throw new Error(`found different nonces in tx submissions`);
            }
        }
        const [gasEstimate, gasPriceEstimate] = await Promise.all([
            this._blockchainUtils.estimateGasForExchangeProxyCallAsync(callData, workerAddress),
            this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync(),
        ]);

        return {
            submissionsMap,
            nonce: nonce!,
            gasFees: { maxPriorityFeePerGas: INITIAL_MAX_PRIORITY_FEE_PER_GAS, maxFeePerGas: gasPriceEstimate },
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
        logger.info({ orderHash, workerAddress }, 'Initializing submission context');

        // claim this job for the worker, and set status to submitted
        await this._dbUtils.updateRfqmJobAsync(orderHash, false, {
            status: RfqmJobStatus.PendingSubmitted,
            workerAddress,
        });

        const [gasPriceEstimate, nonce, gasEstimate] = await Promise.all([
            this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync(),
            this._blockchainUtils.getNonceAsync(workerAddress),
            this._blockchainUtils.estimateGasForExchangeProxyCallAsync(callData, workerAddress),
        ]);

        const gasFees = { maxFeePerGas: gasPriceEstimate, maxPriorityFeePerGas: INITIAL_MAX_PRIORITY_FEE_PER_GAS };

        const firstSubmission = await this._submitTransactionAsync(
            orderHash,
            workerAddress,
            callData,
            gasFees,
            nonce,
            gasEstimate,
        );
        logger.info(
            { workerAddress, orderHash, transactionHash: firstSubmission.transactionHash },
            'Successfully submitted tx',
        );
        const submissionsMap = { [firstSubmission.transactionHash!]: firstSubmission };

        return {
            submissionsMap,
            nonce,
            gasFees,
            gasEstimate,
        };
    }

    /**
     * Check for receipts from the tx hashes and update databases with status of all tx's.
     */
    private async _checkSubmissionMapReceiptsAndUpdateDbAsync(
        orderHash: string,
        txHashes: string[],
        expectedTakerTokenFillAmount: BigNumber,
    ): Promise<
        | RfqmJobStatus.PendingSubmitted
        | RfqmJobStatus.FailedRevertedConfirmed
        | RfqmJobStatus.FailedRevertedUnconfirmed
        | RfqmJobStatus.SucceededConfirmed
        | RfqmJobStatus.SucceededUnconfirmed
    > {
        // At most one tx can be mined, since they all have the same nonce.
        const minedReceipt = await Promise.all(
            txHashes.map((h) => this._blockchainUtils.getTransactionReceiptIfExistsAsync(h)),
        ).then((receipts) => receipts.find((r) => r !== undefined));

        // If the tx hasn't been mined yet, there're no database updates to do.
        if (minedReceipt === undefined) {
            return RfqmJobStatus.PendingSubmitted;
        }

        const isTxSuccessful = minedReceipt.status === 1;

        const currentBlock = await this._blockchainUtils.getCurrentBlockAsync();
        const isTxConfirmed = RfqmService.isBlockConfirmed(currentBlock, minedReceipt.blockNumber);

        const submissionsMap: SubmissionsMap = {};
        for (const hash of txHashes) {
            const submissionUpdate: Partial<RfqmTransactionSubmissionEntity> = {
                transactionHash: hash,
                updatedAt: new Date(),
                metadata: {
                    expectedTakerTokenFillAmount: expectedTakerTokenFillAmount.toString(),
                    actualTakerFillAmount: '0',
                    decodedFillLog: '{}',
                },
            };
            if (hash === minedReceipt.transactionHash) {
                if (isTxSuccessful) {
                    const decodedLog = this._blockchainUtils.getDecodedRfqOrderFillEventLogFromLogs(minedReceipt.logs);
                    submissionUpdate.metadata = {
                        expectedTakerTokenFillAmount: expectedTakerTokenFillAmount.toString(),
                        actualTakerFillAmount: decodedLog.args.takerTokenFilledAmount.toString(),
                        decodedFillLog: JSON.stringify(decodedLog),
                    };
                }

                const submissionStatus = isTxSuccessful
                    ? isTxConfirmed
                        ? RfqmTransactionSubmissionStatus.SucceededConfirmed
                        : RfqmTransactionSubmissionStatus.SucceededUnconfirmed
                    : isTxConfirmed
                    ? RfqmTransactionSubmissionStatus.RevertedConfirmed
                    : RfqmTransactionSubmissionStatus.RevertedUnconfirmed;

                submissionUpdate.status = submissionStatus;
                submissionUpdate.blockMined = new BigNumber(minedReceipt.blockNumber);
                submissionUpdate.gasUsed = new BigNumber(minedReceipt.gasUsed);
            } else {
                submissionUpdate.status = RfqmTransactionSubmissionStatus.DroppedAndReplaced;
            }

            submissionsMap[hash] = submissionUpdate;
        }

        const jobStatus = isTxConfirmed
            ? isTxSuccessful
                ? RfqmJobStatus.SucceededConfirmed
                : RfqmJobStatus.FailedRevertedConfirmed
            : isTxSuccessful
            ? RfqmJobStatus.SucceededUnconfirmed
            : RfqmJobStatus.FailedRevertedUnconfirmed;
        await Promise.all([
            this._dbUtils.updateRfqmTransactionSubmissionsAsync(Object.values(submissionsMap)),
            this._dbUtils.updateRfqmJobAsync(orderHash, false, { status: jobStatus }),
        ]);

        return jobStatus;
    }

    /**
     * Determine transaction properties and submit a transaction
     */
    private async _submitTransactionAsync(
        orderHash: string,
        workerAddress: string,
        callData: string,
        gasFees: GasFees,
        nonce: number,
        gasEstimate: number,
    ): Promise<RfqmTransactionSubmissionEntity> {
        const txOptions = {
            ...gasFees,
            from: workerAddress,
            gas: gasEstimate,
            nonce,
            value: 0,
        };

        const transactionRequest = this._blockchainUtils.transformTxDataToTransactionRequest(
            txOptions,
            CHAIN_ID,
            callData,
        );
        const { signedTransaction, transactionHash } = await this._blockchainUtils.signTransactionAsync(
            transactionRequest,
        );

        const partialEntity: Partial<RfqmTransactionSubmissionEntity> = {
            ...gasFees,
            transactionHash,
            orderHash,
            createdAt: new Date(),
            from: workerAddress,
            to: this._blockchainUtils.getExchangeProxyAddress(),
            nonce,
            status: RfqmTransactionSubmissionStatus.Presubmit,
        };

        await this._dbUtils.writeRfqmTransactionSubmissionToDbAsync(partialEntity);

        const transactionHashFromSubmit = await this._blockchainUtils.submitSignedTransactionAsync(signedTransaction);

        if (transactionHash !== transactionHashFromSubmit) {
            // This should never ever happen
            logger.error(
                { transactionHashFromSubmit, transactionHash },
                'Mismatch between transaction hash calculated before submit and after submit',
            );
        }

        logger.info(
            { orderHash, workerAddress, transactionHash: transactionHashFromSubmit },
            'Transaction calldata submitted to exchange proxy',
        );

        await this._dbUtils.updateRfqmTransactionSubmissionsAsync([
            {
                transactionHash: transactionHashFromSubmit,
                status: RfqmTransactionSubmissionStatus.Submitted,
            },
        ]);

        const updatedEntity = await this._dbUtils.findRfqmTransactionSubmissionByTransactionHashAsync(
            transactionHashFromSubmit,
        );

        if (updatedEntity === undefined) {
            // This should never happen -- we just saved it
            throw new Error(`Could not find updated entity with transaction hash ${transactionHashFromSubmit}`);
        }

        return updatedEntity;
    }

    private async _enqueueJobAsync(orderHash: string, type: RfqmTypes): Promise<void> {
        await this._sqsProducer.send({
            // wait, it's all order hash?
            // always has been.
            groupId: orderHash,
            id: orderHash,
            body: JSON.stringify({ orderHash, type }),
            deduplicationId: orderHash,
        });
    }

    /**
     * Maps an IndicativeQuote to a FirmOtcQuote. Handles txOrigin, chainId, expiryAndNonce, etc
     */
    private _mapIndicativeQuoteToFirmOtcQuote(
        q: IndicativeQuote,
        takerAddress: string,
        nonceBucket: BigNumber,
        nonce: BigNumber,
    ): FirmOtcQuote {
        return {
            kind: 'otc',
            makerUri: q.makerUri,
            order: new OtcOrder({
                txOrigin: this._registryAddress,
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(q.expiry, nonceBucket, nonce),
                maker: q.maker,
                taker: takerAddress,
                makerToken: q.makerToken,
                takerToken: q.takerToken,
                makerAmount: q.makerAmount,
                takerAmount: q.takerAmount,
                chainId: CHAIN_ID,
                verifyingContract: this._contractAddresses.exchangeProxy,
            }),
        };
    }
}
