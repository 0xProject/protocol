// tslint:disable:max-file-line-count
import { InternalServerError, TooManyRequestsError, ValidationError, ValidationErrorCodes } from '@0x/api-utils';
import { ITransformERC20Contract } from '@0x/contract-wrappers';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { utils as ethersUtils } from 'ethers';
import Redis from 'ioredis';
import * as _ from 'lodash';
import { Counter, Summary } from 'prom-client';
import { Producer } from 'sqs-producer';

import { META_TRANSACTION_V1_EIP_712_TYPES, ONE_MINUTE_S, ONE_SECOND_MS } from '../core/constants';
import { MetaTransactionJobConstructorOpts } from '../entities/MetaTransactionJobEntity';
import { RfqmJobStatus } from '../entities/types';
import { logger } from '../logger';
import { feesToTruncatedFees, getFeeConfigsFromParams } from '../core/meta_transaction_fee_utils';
import { GaslessTypes, Approval } from '../core/types';
import { FeeConfigs, TruncatedFees } from '../core/types/meta_transaction_fees';
import { getV1QuoteAsync, getV2QuoteAsync, MetaTransactionClientQuoteResponse } from '../utils/MetaTransactionClient';
import { RfqmDbUtils } from '../utils/rfqm_db_utils';
import { HealthCheckResult } from '../utils/rfqm_health_check';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { getSignerFromHash, padSignature } from '../utils/signature_utils';

import {
    FetchFirmQuoteParams,
    FetchIndicativeQuoteParams,
    FetchIndicativeQuoteResponse,
    MetaTransactionV1QuoteResponse,
    MetaTransactionV2QuoteResponse,
    OtcOrderRfqmQuoteResponse,
    SubmitMetaTransactionSignedQuoteParams,
    SubmitMetaTransactionSignedQuoteResponse,
    SubmitRfqmSignedQuoteWithApprovalParams,
    SubmitRfqmSignedQuoteWithApprovalResponse,
    LiquiditySource,
    SubmitMetaTransactionV2SignedQuoteParams,
    SubmitMetaTransactionV2SignedQuoteResponse,
    StatusResponse,
    FetchQuoteParamsBase,
    TradeResponse,
} from './types';
import { getZeroExEip712Domain } from '../eip712registry';
import { extractEIP712DomainType } from '../utils/Eip712Utils';

import { RfqmService } from './rfqm_service';

/**
 * When a metatransaction quote is issued, the hash
 * is stored in Redis. When a quote is submitted, it
 * is only accepted if the metatransaction hash is in
 * Redis. This prevents a malicious user submitting
 * a quote which was not issued by 0x.
 *
 * The length of time the quote metatransaction hash
 * is stored in Redis.
 */
const META_TRANSACTION_HASH_TTL_S = 15 * ONE_MINUTE_S; // tslint:disable-line binary-expression-operand-order custom-no-magic-numbers

enum GaslessSwapServiceErrorReason {
    MetaTransactionAboutToExpire = 'meta_transaction_about_to_expire', // meta-transaction is about to expire
    MetaTransactionPendingJobAlreadyExist = 'meta_transaction_pending_job_already_exist', // a pendingmeta-transaction job already exists for a taker-takerToken
    MetaTransactionTakerBalanceCheckFailed = 'meta_transaction_taker_balance_check_failed', // taker balance check failed when submitting a meta-transaction
    MetaTransactionHashNotExist = 'meta_transaction_hash_does_not_exist', // meta-transaction hash does not exist
    MetaTransactionInvalidSigner = 'meta_transaction_invalid_signer', // invalid signer for the mta-transaction
    MetaTransactionFailedToQueue = 'meta_transaction_failed_to_queue', // failed to queue meta-transaction
    RfqPriceError = 'rfq_price_error', // encountered error when fetching rfq price
    AmmPriceError = 'amm_price_error', // encountered error when fetching amm price
    RfqQuoteError = 'rfq_quote_error', // encountered error when fetching rfq quote
    AmmQuoteError = 'amm_quote_error', // encountered error when fetching amm quote
}

/**
 * Produces a key for Redis using the MetaTransaction hash
 */
function metaTransactionHashRedisKey(hash: string): string {
    return `metaTransactionHash.${hash}`;
}

/**
 * Accepts calldata for a transformErc20 call and extracts
 * arguments from the calldata.
 */
function decodeTransformErc20Calldata(calldata: string): {
    inputToken: string;
    outputToken: string;
    inputTokenAmount: BigNumber;
    minOutputTokenAmount: BigNumber;
} {
    const transformErc20Interface = new ethersUtils.Interface(ITransformERC20Contract.ABI());

    const result = transformErc20Interface.parseTransaction({ data: calldata });

    const {
        args: [inputToken, outputToken, inputTokenAmount, minOutputTokenAmount],
    } = result;

    return {
        inputToken: inputToken as string,
        outputToken: outputToken as string,
        // Use `toString` because these are actually Ethers BigNumbers
        inputTokenAmount: new BigNumber(inputTokenAmount.toString()),
        minOutputTokenAmount: new BigNumber(minOutputTokenAmount.toString()),
    };
}

/**
 * Transient function that prunes `/v1` suffixes, if present.
 * Used to roll out MetaTransactionClient URL change in a safe manner.
 */
function removeV1SuffixFromUrl(url: string): URL {
    return new URL(url.replace(/\/+v1/, ''));
}

const ZEROG_META_TRANSACTION_QUOTE_REQUEST_DURATION_SECONDS = new Summary({
    name: 'zerog_meta_transaction_quote_request_duration_seconds',
    help: 'Histogram of request duration of gasless swap',
    // tslint:disable-next-line: custom-no-magic-numbers
    percentiles: [0.5, 0.9, 0.95, 0.99, 0.999],
    labelNames: ['chainId', 'success'],
    maxAgeSeconds: 60,
    ageBuckets: 5,
});
const ZEROG_GASLESSS_SWAP_SERVICE_ERRORS = new Counter({
    name: 'zerog_gasless_swap_service_errors_total',
    labelNames: ['chainId', 'reason'],
    help: 'Number of errors (with specific reason) encountered in galess swap service',
});

/**
 * Contains logic to fetch RFQm quotes, but with a fallback to
 * a MetaTransaction-wrapped AMM trade in the case no RFQm
 * liquidity is available.
 */
export class GaslessSwapService {
    constructor(
        private readonly _chainId: number,
        private readonly _rfqmService: RfqmService,
        private readonly _metaTransactionServiceBaseUrl: URL,
        private readonly _axiosInstance: AxiosInstance,
        private readonly _redis: Redis,
        private readonly _dbUtils: RfqmDbUtils,
        private readonly _blockchainUtils: RfqBlockchainUtils,
        private readonly _sqsProducer: Producer,
    ) {}

    /**
     * Fetches a "price" (aka "Indicative Quote").
     *
     * The request is first sent to market maker servers and then to the metatransaction
     * service if the market makers don't provide liquidity or errors out.
     *
     * If RFQ liquidity exists, then it is used to compute the price.
     * If AMM liquidity exists but RFQ liquidity is unavailable then
     * AMM liquidity is used to compute the price.
     *
     * Returns `null` if neither AMM or RFQ liquidity exists.
     */
    public async fetchPriceAsync(
        params: FetchIndicativeQuoteParams,
        kind: GaslessTypes,
    ): Promise<
        | (FetchIndicativeQuoteResponse &
              ({ liquiditySource: 'rfq' | 'amm' } | { sources: LiquiditySource[]; fees?: TruncatedFees }))
        | null
    > {
        if (kind === GaslessTypes.MetaTransaction) {
            try {
                const rfqPrice = await this._rfqmService.fetchIndicativeQuoteAsync(params, 'gaslessSwapRfq');

                if (rfqPrice) {
                    return { ...rfqPrice, liquiditySource: 'rfq' };
                }
            } catch (e) {
                ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                    this._chainId.toString(),
                    GaslessSwapServiceErrorReason.RfqPriceError,
                ).inc();
                logger.error(
                    { params, errorMessage: e.message, stack: e.stack },
                    'Encountered error when fetching RFQ price in `GaslessSwapService`',
                );
            }
        }

        try {
            let feeConfigs: FeeConfigs | undefined;
            if (kind === GaslessTypes.MetaTransactionV2) {
                feeConfigs = this._getFeeConfigs(params, 'on-chain'); // integrator billing type would always be on-chain for now
            }

            const metaTransactionRequestParams = {
                ...params,
                chainId: this._chainId,
                integratorId: params.integrator.integratorId,
                // Can use the null address here since we won't be returning
                // the actual metatransaction
                takerAddress: params.takerAddress ?? NULL_ADDRESS,
                metaTransactionVersion: 'v1' as 'v1' | 'v2',
                feeConfigs,
            };

            let metaTransactionQuote: MetaTransactionClientQuoteResponse | null;

            // In this context, `kind` refers to the type of endpoints that the quote will be fetched from.
            // MetaTransaction refers to the old zero-g flow, and MetaTransactionV2 refers to /tx-relay.
            switch (kind) {
                case GaslessTypes.MetaTransaction:
                    metaTransactionQuote = await getV1QuoteAsync(
                        this._axiosInstance,
                        new URL(`${removeV1SuffixFromUrl(this._metaTransactionServiceBaseUrl.toString())}/v1/quote`),
                        metaTransactionRequestParams,
                        {
                            requestDurationSummary: ZEROG_META_TRANSACTION_QUOTE_REQUEST_DURATION_SECONDS,
                            chainId: this._chainId,
                        },
                        logger.warn.bind(logger),
                    );
                    break;
                case GaslessTypes.MetaTransactionV2:
                    metaTransactionQuote = await getV2QuoteAsync(
                        this._axiosInstance,
                        new URL(`${removeV1SuffixFromUrl(this._metaTransactionServiceBaseUrl.toString())}/v2/quote`),
                        metaTransactionRequestParams,
                        {
                            requestDurationSummary: ZEROG_META_TRANSACTION_QUOTE_REQUEST_DURATION_SECONDS,
                            chainId: this._chainId,
                        },
                        logger.warn.bind(logger),
                    );
                    break;
                case GaslessTypes.OtcOrder:
                    // This should never happen
                    throw new Error('GaslessTypes.OtcOrder should not be reached');
                default:
                    ((_x: never) => {
                        throw new Error('unreachable');
                    })(kind);
            }

            if (metaTransactionQuote) {
                if (kind === GaslessTypes.MetaTransaction) {
                    return {
                        ...metaTransactionQuote.price,
                        allowanceTarget: this._blockchainUtils.getExchangeProxyAddress(),
                        liquiditySource: 'amm',
                    };
                } else {
                    return {
                        ...metaTransactionQuote.price,
                        sources: metaTransactionQuote.sources ?? [],
                        fees: feesToTruncatedFees(metaTransactionQuote.fees),
                        allowanceTarget: this._blockchainUtils.getExchangeProxyAddress(),
                    };
                }
            }

            return null;
        } catch (e) {
            if (e instanceof ValidationError) {
                throw e;
            }
            ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                this._chainId.toString(),
                GaslessSwapServiceErrorReason.AmmPriceError,
            ).inc();
            logger.error(
                { params, errorMessage: e.message, stack: e.stack },
                'Encountered error when fetching AMM price in `GaslessSwapService`',
            );

            // Throw here as it means RFQ throws / does not liquidity and AMM throws
            throw new Error(`Error fetching price for ${params}`);
        }
    }

    /**
     * Fetches a "quote" (aka "Firm Quote").
     *
     * Liquidity selection logic is the same as with `fetchPriceAsync`.
     *
     * If an AMM metatransaction is selected as the liquidity source,
     * its metatransaction hash is stored in Redis to be verified upon
     * submit.
     */
    public async fetchQuoteAsync(
        params: FetchFirmQuoteParams,
        kind: GaslessTypes,
    ): Promise<
        | ((OtcOrderRfqmQuoteResponse | MetaTransactionV1QuoteResponse) & { liquiditySource: 'rfq' | 'amm' })
        | MetaTransactionV2QuoteResponse
        | null
    > {
        let rfqQuoteReportId: string | null = null;
        if (kind === GaslessTypes.MetaTransaction) {
            try {
                const { quote: rfqQuote, quoteReportId } = await this._rfqmService.fetchFirmQuoteAsync(
                    params,
                    'gaslessSwapRfq',
                );
                rfqQuoteReportId = quoteReportId;
                if (rfqQuote) {
                    return { ...rfqQuote, liquiditySource: 'rfq' };
                }
            } catch (e) {
                ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                    this._chainId.toString(),
                    GaslessSwapServiceErrorReason.RfqQuoteError,
                ).inc();
                logger.error(
                    { params, errorMessage: e.message, stack: e.stack },
                    'Encountered error when fetching RFQ quote in `GaslessSwapService`',
                );
            }
        }

        try {
            let feeConfigs: FeeConfigs | undefined;
            if (kind === GaslessTypes.MetaTransactionV2) {
                feeConfigs = this._getFeeConfigs(params, 'on-chain'); // integrator billing type would always be on-chain for now
            }

            const metaTransactionRequestParams = {
                ...params,
                chainId: this._chainId,
                affiliateAddress: params.affiliateAddress ?? params.integrator.affiliateAddress,
                integratorId: params.integrator.integratorId,
                quoteUniqueId: kind === GaslessTypes.MetaTransaction ? rfqQuoteReportId ?? undefined : undefined,
                metaTransactionVersion: 'v1' as 'v1' | 'v2',
                feeConfigs,
            };

            let metaTransactionQuote: MetaTransactionClientQuoteResponse | null;

            // In this context, `kind` refers to the type of endpoints that the quote will be fetched from.
            // MetaTransaction refers to the old zero-g flow, and MetaTransactionV2 refers to /tx-relay.
            switch (kind) {
                case GaslessTypes.MetaTransaction:
                    metaTransactionQuote = await getV1QuoteAsync(
                        this._axiosInstance,
                        new URL(`${removeV1SuffixFromUrl(this._metaTransactionServiceBaseUrl.toString())}/v1/quote`),
                        metaTransactionRequestParams,
                        {
                            requestDurationSummary: ZEROG_META_TRANSACTION_QUOTE_REQUEST_DURATION_SECONDS,
                            chainId: this._chainId,
                        },
                        logger.warn.bind(logger),
                    );
                    break;
                case GaslessTypes.MetaTransactionV2:
                    metaTransactionQuote = await getV2QuoteAsync(
                        this._axiosInstance,
                        new URL(`${removeV1SuffixFromUrl(this._metaTransactionServiceBaseUrl.toString())}/v2/quote`),
                        metaTransactionRequestParams,
                        {
                            requestDurationSummary: ZEROG_META_TRANSACTION_QUOTE_REQUEST_DURATION_SECONDS,
                            chainId: this._chainId,
                        },
                        logger.warn.bind(logger),
                    );
                    break;
                case GaslessTypes.OtcOrder:
                    // This should never happen
                    throw new Error('GaslessTypes.OtcOrder should not be reached');
                default:
                    ((_x: never) => {
                        throw new Error('unreachable');
                    })(kind);
            }

            if (metaTransactionQuote) {
                const approval = params.checkApproval
                    ? await this._rfqmService.getGaslessApprovalResponseAsync(
                          params.takerAddress,
                          params.sellToken,
                          metaTransactionQuote.price.sellAmount,
                      )
                    : null;
                const { metaTransaction, hash: metaTransactionHash } = metaTransactionQuote.trade;
                // TODO: Publish fee event for meta-transaction v2
                await this._storeMetaTransactionHashAsync(metaTransaction.getHash());

                if (kind === GaslessTypes.MetaTransaction) {
                    // Response from /meta_transaction/v1 endpoint. The meta-transaction type
                    // can ONLY be meta-transaction v1
                    return {
                        ...metaTransactionQuote.price,
                        approval: approval ?? undefined,
                        metaTransaction,
                        metaTransactionHash,
                        type: GaslessTypes.MetaTransaction,
                        allowanceTarget: this._blockchainUtils.getExchangeProxyAddress(),
                        liquiditySource: 'amm',
                    };
                } else {
                    // Response from /meta_transaction/v2 endpoint. The meta-transaction type
                    // can either be meta-transaction v1 / v2
                    const trade = await this.getGaslessTradeResponse(metaTransactionQuote);
                    return {
                        ...metaTransactionQuote.price,
                        approval: approval ?? undefined,
                        trade,
                        sources: metaTransactionQuote.sources ?? [],
                        fees: feesToTruncatedFees(metaTransactionQuote.fees),
                        allowanceTarget: this._blockchainUtils.getExchangeProxyAddress(),
                    };
                }
            }

            return null;
        } catch (e) {
            if (e instanceof ValidationError) {
                throw e;
            }

            ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                this._chainId.toString(),
                GaslessSwapServiceErrorReason.AmmQuoteError,
            ).inc();
            logger.error(
                { params, errorMessage: e.message, stack: e.stack },
                'Encountered error when fetching AMM quote in `GaslessSwapService`',
            );

            // Throw here as it means RFQ throws / does not liquidity and AMM throws
            throw new Error(`Error fetching quote for ${params}`);
        }
    }

    /**
     * Gets the quote response from MetaTransaction client and transforms it into external
     * `TradeResponse` response format. Response consists of Trade `type` (internally represented as `kind`),
     * trade hash, and the EIP-712 object.
     *
     * @param quote Quote response returned by MetaTransactionClient
     * @returns The `TradeResponse` response object.
     */
    public async getGaslessTradeResponse(quote: MetaTransactionClientQuoteResponse): Promise<TradeResponse> {
        const eip712Domain = getZeroExEip712Domain(this._chainId);
        const eip712DomainType = extractEIP712DomainType(eip712Domain);
        const { kind, hash } = quote.trade;

        switch (kind) {
            case GaslessTypes.MetaTransaction: {
                const message = _.omit(quote.trade.metaTransaction, ['chainId', 'verifyingContract']);
                return {
                    type: kind,
                    hash,
                    eip712: {
                        types: {
                            ...eip712DomainType,
                            ...META_TRANSACTION_V1_EIP_712_TYPES,
                        },
                        primaryType: 'MetaTransactionData',
                        domain: eip712Domain,
                        message,
                    },
                };
            }
            // TODO: uncomment once MetaTransaction v2 is supported
            // case GaslessTypes.MetaTransactionV2:
            //     return {
            //         kind,
            //         hash,
            //         eip712: {
            //             types: {
            //                 ...eip712DomainType,
            //                 ...META_TRANSACTION_V2_EIP_712_TYPES,
            //             },
            //             primaryType: 'MetaTransactionDataV2',
            //             domain: eip712Domain,
            //             message: {
            //                 ...quote.trade.metaTransaction,
            //                 fees: feesToMetaTransactionV2Eip712Fees(quote.fees),
            //             },
            //         },
            //     };
            //     break;
            default:
                ((_x: never) => {
                    throw new Error('unreachable');
                })(kind);
        }
    }

    /**
     * Accepts a taker-signed MetaTransaction or OtcOrder trade, and optionally,
     * a signed permit transaction, and produces the appropriate Job and sends
     * a message to SQS.
     *
     * For lots of discussion on why the type assertions are needed, see:
     * https://github.com/microsoft/TypeScript/issues/33912
     */
    public async processSubmitAsync<
        T extends
            | SubmitRfqmSignedQuoteWithApprovalParams<Approval>
            | SubmitMetaTransactionSignedQuoteParams<Approval>
            | SubmitMetaTransactionV2SignedQuoteParams<Approval>,
    >(
        params: T,
        integratorId: string,
    ): Promise<
        T extends SubmitRfqmSignedQuoteWithApprovalParams<Approval>
            ? SubmitRfqmSignedQuoteWithApprovalResponse
            : T extends SubmitMetaTransactionSignedQuoteParams<Approval>
            ? SubmitMetaTransactionSignedQuoteResponse
            : SubmitMetaTransactionV2SignedQuoteResponse
    > {
        // OtcOrder
        if (params.kind === GaslessTypes.OtcOrder) {
            const otcOrderResult = await this._rfqmService.submitTakerSignedOtcOrderWithApprovalAsync(params);
            return otcOrderResult as T extends SubmitRfqmSignedQuoteWithApprovalParams<Approval>
                ? SubmitRfqmSignedQuoteWithApprovalResponse
                : T extends SubmitMetaTransactionSignedQuoteParams<Approval>
                ? SubmitMetaTransactionSignedQuoteResponse
                : SubmitMetaTransactionV2SignedQuoteResponse;
        }

        // TODO: Add the logic to handle meta-transaction v2 when the type is ready
        // MetaTransaction
        const metaTransaction = 'metaTransaction' in params.trade ? params.trade.metaTransaction : params.trade.trade;
        const type = params.trade.type;
        let signature = params.trade.signature;
        const { inputToken, inputTokenAmount, outputToken, minOutputTokenAmount } = decodeTransformErc20Calldata(
            metaTransaction.callData,
        );
        const metaTransactionHash = metaTransaction.getHash();

        // Verify that the metatransaction is not expired
        const currentTimeMs = new Date().getTime();
        const bufferS = 30;
        if (
            metaTransaction.expirationTimeSeconds.minus(bufferS).times(ONE_SECOND_MS).isLessThanOrEqualTo(currentTimeMs)
        ) {
            ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                this._chainId.toString(),
                GaslessSwapServiceErrorReason.MetaTransactionAboutToExpire,
            ).inc();
            logger.warn({ metaTransactionHash }, 'Received metatransaction submission which is about to expire');

            throw new ValidationError([
                {
                    field: 'expirationTimeSeconds',
                    code: ValidationErrorCodes.FieldInvalid,
                    reason: `trade will expire too soon`,
                },
            ]);
        }

        // Verify that the metatransaction was created by 0x API
        const doesMetaTransactionHashExist = await this._doesMetaTransactionHashExistAsync(metaTransactionHash);
        if (!doesMetaTransactionHashExist) {
            ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                this._chainId.toString(),
                GaslessSwapServiceErrorReason.MetaTransactionHashNotExist,
            ).inc();
            logger.warn({ metaTransactionHash }, 'Received metatransaction submission not created by 0x API');
            throw new Error('MetaTransaction hash not found');
        }

        // Verify that there is not a pending transaction for this taker and taker token

        // TODO (rhinodavid): optimize this query by adding the taker & takerToken instead
        // of filtering it out in the next step
        const pendingJobs = await this._dbUtils.findMetaTransactionJobsWithStatusesAsync([
            RfqmJobStatus.PendingEnqueued,
            RfqmJobStatus.PendingProcessing,
            RfqmJobStatus.PendingLastLookAccepted,
            RfqmJobStatus.PendingSubmitted,
        ]);

        if (
            pendingJobs.some(
                (job) =>
                    job.takerAddress.toLowerCase() === metaTransaction.signer.toLowerCase() &&
                    job.inputToken.toLowerCase() === inputToken.toLowerCase() &&
                    // Other logic handles the case where the same order is submitted twice
                    job.metaTransactionHash !== metaTransactionHash,
            )
        ) {
            ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                this._chainId.toString(),
                GaslessSwapServiceErrorReason.MetaTransactionPendingJobAlreadyExist,
            ).inc();
            logger.warn(
                {
                    metaTransactionHash: metaTransactionHash,
                    takerToken: inputToken,
                    takerAddress: metaTransaction.signer.toLowerCase(),
                },
                'Metatransaction submission rejected because a job is pending with the same taker and taker token',
            );
            throw new TooManyRequestsError('a pending trade for this taker and takertoken already exists');
        }

        // pad approval signature if there are missing bytes
        const paddedSignature = padSignature(signature);
        if (paddedSignature.r !== signature.r || paddedSignature.s !== signature.s) {
            logger.warn(
                { tradeHash: metaTransactionHash, r: paddedSignature.r, s: paddedSignature.s },
                'Got approval signature with missing bytes',
            );
            signature = paddedSignature;
        }

        // validate that the given taker signature is valid
        const signerAddress = getSignerFromHash(metaTransactionHash, signature).toLowerCase();
        if (signerAddress !== metaTransaction.signer) {
            ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                this._chainId.toString(),
                GaslessSwapServiceErrorReason.MetaTransactionInvalidSigner,
            ).inc();
            logger.warn(
                {
                    metaTransactionHash,
                    metaTransactionSigner: metaTransaction.signer,
                    transactionSigner: signerAddress,
                },
                'Received submission with signer mismatch',
            );
            throw new ValidationError([
                {
                    field: 'signature',
                    code: ValidationErrorCodes.InvalidSignatureOrHash,
                    reason: `signature is not valid`,
                },
            ]);
        }

        // Validate that order is fillable according to balance and/or allowance.
        const [takerBalance] = params.approval
            ? await this._blockchainUtils.getTokenBalancesAsync([{ owner: metaTransaction.signer, token: inputToken }])
            : await this._blockchainUtils.getMinOfBalancesAndAllowancesAsync([
                  { owner: metaTransaction.signer, token: inputToken },
              ]);

        if (takerBalance.isLessThan(inputTokenAmount)) {
            ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                this._chainId.toString(),
                GaslessSwapServiceErrorReason.MetaTransactionTakerBalanceCheckFailed,
            ).inc();
            logger.warn(
                {
                    takerBalance,
                    takerAddress: metaTransaction.signer,
                    metaTransactionHash,
                },
                'Balance check failed while user was submitting',
            );
            throw new ValidationError([
                {
                    field: 'n/a',
                    code: ValidationErrorCodes.InvalidOrder,
                    reason: `order is not fillable`,
                },
            ]);
        }

        const rfqmApprovalOpts = params.approval
            ? await this._rfqmService.createApprovalAsync(params.approval, metaTransactionHash, inputToken)
            : undefined;

        const jobOptions: MetaTransactionJobConstructorOpts = {
            chainId: this._chainId,
            expiry: metaTransaction.expirationTimeSeconds,
            fee: { token: metaTransaction.feeToken, amount: metaTransaction.feeAmount, type: 'fixed' },
            inputToken,
            inputTokenAmount,
            integratorId,
            metaTransaction,
            metaTransactionHash,
            minOutputTokenAmount,
            outputToken,
            takerAddress: metaTransaction.signer,
            takerSignature: signature,
            ...rfqmApprovalOpts,
        };

        try {
            const { id } = await this._dbUtils.writeMetaTransactionJobAsync(jobOptions);
            await this._enqueueJobAsync(id, GaslessTypes.MetaTransaction);
        } catch (error) {
            ZEROG_GASLESSS_SWAP_SERVICE_ERRORS.labels(
                this._chainId.toString(),
                GaslessSwapServiceErrorReason.MetaTransactionFailedToQueue,
            ).inc();
            logger.error({ errorMessage: error.message }, 'Failed to queue the quote for submission.');
            throw new InternalServerError(
                `failed to queue the quote for submission, it may have already been submitted`,
            );
        }

        const result = {
            type,
            ...('metaTransaction' in params.trade ? { metaTransactionHash } : { tradeHash: metaTransactionHash }),
        };

        return result as T extends SubmitRfqmSignedQuoteWithApprovalParams<Approval>
            ? SubmitRfqmSignedQuoteWithApprovalResponse
            : T extends SubmitMetaTransactionSignedQuoteParams<Approval>
            ? SubmitMetaTransactionSignedQuoteResponse
            : SubmitMetaTransactionV2SignedQuoteResponse;
    }

    public async getStatusAsync(hash: string): Promise<StatusResponse | null> {
        return this._rfqmService.getStatusAsync(hash);
    }

    /**
     * Passthrough to RFQm Service's `runHealthCheckAsync` method
     */
    public async runHealthCheckAsync(): Promise<HealthCheckResult> {
        return this._rfqmService.runHealthCheckAsync();
    }

    /**
     * Passthrough to RFQm Service's `getTokenDecimalsAsync` method
     */
    public async getTokenDecimalsAsync(tokenAddress: string): Promise<number> {
        return this._rfqmService.getTokenDecimalsAsync(tokenAddress);
    }

    private async _enqueueJobAsync(id: string, type: GaslessTypes): Promise<void> {
        await this._sqsProducer.send({
            groupId: id,
            id,
            body: JSON.stringify({ id, type }),
            deduplicationId: id,
        });
    }

    private async _doesMetaTransactionHashExistAsync(hash: string): Promise<boolean> {
        return this._redis.get(metaTransactionHashRedisKey(hash)).then((r) => !!r);
    }

    private async _storeMetaTransactionHashAsync(hash: string): Promise<void> {
        await this._redis.set(metaTransactionHashRedisKey(hash), /* value */ 0, 'EX', META_TRANSACTION_HASH_TTL_S);
    }

    private _getFeeConfigs(params: FetchQuoteParamsBase, integratorBillingType: 'on-chain' | 'off-chain'): FeeConfigs {
        let integratorFeeConfig;

        if (params.feeType && params.feeRecipient && params.feeSellTokenPercentage) {
            integratorFeeConfig = {
                type: params.feeType,
                recipient: params.feeRecipient,
                billingType: integratorBillingType,
                sellTokenPercentage: params.feeSellTokenPercentage,
            };
        }

        return getFeeConfigsFromParams({
            integratorId: params.integrator.integratorId,
            chainId: this._chainId,
            sellToken: params.sellToken,
            buyToken: params.buyToken,
            integratorFeeConfig,
        });
    }
}
