// tslint:disable:max-file-line-count
import { AssetSwapperContractAddresses, MarketOperation, ProtocolFeeUtils, QuoteRequestor } from '@0x/asset-swapper';
import { RfqmRequestOptions } from '@0x/asset-swapper/lib/src/types';
import { MetaTransaction, RfqOrder, Signature } from '@0x/protocol-utils';
import { Fee, SubmitRequest } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Counter } from 'prom-client';
import { Producer } from 'sqs-producer';

import { CHAIN_ID, META_TX_WORKER_REGISTRY, RFQT_REQUEST_MAX_RESPONSE_MS } from '../config';
import { NULL_ADDRESS, ONE_SECOND_MS, RFQM_MINIMUM_EXPIRY_DURATION_MS, RFQM_TX_GAS_ESTIMATE } from '../constants';
import { RfqmJobEntity, RfqmQuoteEntity } from '../entities';
import { InternalServerError, NotFoundError, ValidationError, ValidationErrorCodes } from '../errors';
import { logger } from '../logger';
import { getBestQuote } from '../utils/quote_comparison_utils';
import { QuoteServerClient } from '../utils/quote_server_client';
import {
    feeToStoredFee,
    RfqmDbUtils,
    RfqmJobStatus,
    storedFeeToFee,
    storedOrderToRfqmOrder,
    v4RfqOrderToStoredOrder,
} from '../utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';

export enum RfqmTypes {
    MetaTransaction = 'metatransaction',
}

export interface FetchIndicativeQuoteParams {
    apiKey: string;
    buyAmount?: BigNumber;
    buyToken: string;
    buyTokenDecimals: number;
    sellAmount?: BigNumber;
    sellToken: string;
    sellTokenDecimals: number;
    takerAddress?: string;
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
    apiKey: string;
    buyAmount?: BigNumber;
    buyToken: string;
    buyTokenDecimals: number;
    sellAmount?: BigNumber;
    sellToken: string;
    sellTokenDecimals: number;
    takerAddress: string;
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
    type: RfqmTypes.MetaTransaction;
    metaTransaction: MetaTransaction;
    signature: Signature;
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

export type FetchFirmQuoteResponse = MetaTransactionRfqmQuoteResponse;
export type SubmitRfqmSignedQuoteParams = MetaTransactionSubmitRfqmSignedQuoteParams;
export type SubmitRfqmSignedQuoteResponse = MetaTransactionSubmitRfqmSignedQuoteResponse;

const RFQM_QUOTE_INSERTED = new Counter({
    name: 'rfqm_quote_inserted',
    help: 'An RfqmQuote was inserted in the DB',
    labelNames: ['apiKey', 'makerUri'],
});

const RFQM_DEFAULT_OPTS = {
    takerAddress: NULL_ADDRESS,
    txOrigin: META_TX_WORKER_REGISTRY || NULL_ADDRESS,
    makerEndpointMaxResponseTimeMs: RFQT_REQUEST_MAX_RESPONSE_MS,
    nativeExclusivelyRFQ: true,
    altRfqAssetOfferings: {},
    isLastLook: true,
};

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
const PRICE_DECIMAL_PLACES = 6;

/**
 * RfqmService is the coordination layer for HTTP based RFQM flows.
 */
export class RfqmService {
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
            apiKey,
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
            apiKey,
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
            apiKey,
            takerAddress,
        } = params;

        // Quote Requestor specific params
        const isSelling = sellAmount !== undefined;
        const marketOperation = isSelling ? MarketOperation.Sell : MarketOperation.Buy;
        const assetFillAmount = isSelling ? sellAmount! : buyAmount!;

        // Prepare gas estimate and fee
        const gasPrice: BigNumber = await this._protocolFeeUtils.getGasPriceEstimationOrThrowAsync();
        const feeAmount = gasPrice.times(RFQM_TX_GAS_ESTIMATE);
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
            apiKey,
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
            }),
        );
        RFQM_QUOTE_INSERTED.labels(apiKey, makerUri).inc();

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
                META_TX_WORKER_REGISTRY!,
            );
        } catch (err) {
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
            status: RfqmJobStatus.InQueue,
            statusReason: null,
            calldata: this._blockchainUtils.generateMetaTransactionCallData(params.metaTransaction, params.signature),
            fee: quote.fee,
            order: quote.order,
            metadata: {
                metaTransaction: params.metaTransaction,
            },
        };

        // this insert will fail if a job has already been created, ensuring
        // that a signed quote cannot be queued twice
        try {
            // make sure job data is persisted to Postgres before queueing task
            await this._dbUtils.writeRfqmJobToDbAsync(rfqmJobOpts);
            await this._enqueueJobAsync(quote.orderHash!);
        } catch (err) {
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

        // Get job
        const job = await this._dbUtils.findJobByOrderHashAsync(orderHash);
        if (job === undefined) {
            throw new NotFoundError(`job for orderHash ${orderHash} not found`);
        }

        // Basic validation
        await this._validateJobAsync(orderHash, job);
        const { calldata, makerUri, order, fee } = job;

        // Start processing
        await this._dbUtils.updateRfqmJobAsync(orderHash, {
            status: RfqmJobStatus.Processing,
        });

        // Validate w/Eth Call
        try {
            await this._blockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(calldata!, workerAddress);
        } catch (e) {
            RFQM_JOB_FAILED_ETHCALL_VALIDATION.inc();
            logger.warn({ error: e, orderHash }, 'The eth_call validation failed');
            // Terminate with an error transition
            await this._dbUtils.updateRfqmJobAsync(orderHash, {
                status: RfqmJobStatus.Failed,
                statusReason: 'eth_call failed',
            });
            return;
        }

        // Get last look from MM
        const submitRequest: SubmitRequest = {
            order: storedOrderToRfqmOrder(order!),
            orderHash,
            fee: storedFeeToFee(fee!),
        };

        const shouldProceed = await this._quoteServerClient.confirmLastLookAsync(makerUri!, submitRequest);
        RFQM_JOB_MM_REJECTED_LAST_LOOK.labels(makerUri!).inc();
        logger.info({ makerUri, shouldProceed, orderHash }, 'Got last look response from market maker');

        if (!shouldProceed) {
            // Terminate with an error transition
            await this._dbUtils.updateRfqmJobAsync(orderHash, {
                status: RfqmJobStatus.Failed,
                statusReason: 'Rejected by MM last look',
            });
            return;
        }

        // TODO: Submit To Chain

        // Update Status
        await this._dbUtils.updateRfqmJobAsync(orderHash, {
            status: RfqmJobStatus.Successful,
        });
        return;
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

    private async _validateJobAsync(orderHash: string, job: RfqmJobEntity): Promise<void> {
        const { calldata, makerUri, order, fee } = job;
        if (calldata === undefined) {
            await this._dbUtils.updateRfqmJobAsync(orderHash, {
                status: RfqmJobStatus.Failed,
                statusReason: 'Missing Calldata',
            });
            return;
        }

        if (makerUri === undefined) {
            await this._dbUtils.updateRfqmJobAsync(orderHash, {
                status: RfqmJobStatus.Failed,
                statusReason: 'Missing makerUri',
            });
            return;
        }

        if (order === null) {
            await this._dbUtils.updateRfqmJobAsync(orderHash, {
                status: RfqmJobStatus.Failed,
                statusReason: 'Missing order on job',
            });
            return;
        }

        if (fee === null) {
            await this._dbUtils.updateRfqmJobAsync(orderHash, {
                status: RfqmJobStatus.Failed,
                statusReason: 'Missing fee on job',
            });
            return;
        }
    }
}
