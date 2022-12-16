// tslint:disable:max-file-line-count
import { TooManyRequestsError } from '@0x/api-utils';
import { AssetSwapperContractAddresses, MarketOperation } from '@0x/asset-swapper';
import { OtcOrder, ZERO } from '@0x/protocol-utils';
import {
    getTokenMetadataIfExists,
    nativeTokenSymbol,
    nativeWrappedTokenSymbol,
    TokenMetadata,
} from '@0x/token-metadata';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { retry } from '@lifeomic/attempt';
import { Producer as KafkaProducer } from 'kafkajs';
import * as _ from 'lodash';
import { Counter } from 'prom-client';
import { Producer } from 'sqs-producer';

import { ENABLE_LLR_COOLDOWN, RFQM_MAINTENANCE_MODE } from '../config';
import { NULL_ADDRESS, ONE_SECOND_MS, RFQM_MINIMUM_EXPIRY_DURATION_MS, RFQM_NUM_BUCKETS } from '../core/constants';
import { MetaTransactionSubmissionEntity, RfqmV2TransactionSubmissionEntity } from '../entities';
import { RfqmV2JobApprovalOpts, RfqmV2JobConstructorOpts } from '../entities/RfqmV2JobEntity';
import {
    JobFailureReason,
    RfqmJobStatus,
    RfqmTransactionSubmissionStatus,
    RfqmTransactionSubmissionType,
} from '../entities/types';
import { REASON_ON_STATUS_ERROR_RESPONSE_ENABLED } from '../config';
import { InternalServerError, NotFoundError, ValidationError, ValidationErrorCodes } from '../core/errors';
import { logger } from '../logger';
import { feeToStoredFee } from '../core/fee_utils';
import { toPairString } from '../core/pair_utils';
import {
    Eip712DataField,
    ExecuteMetaTransactionApproval,
    ExecuteMetaTransactionEip712Context,
    Fee,
    FeeModelVersion,
    FirmOtcQuote,
    GaslessApprovalTypes,
    IndicativeQuote,
    PermitApproval,
    PermitEip712Context,
} from '../core/types';
import { CacheClient } from '../utils/cache_client';
import { getBestQuote } from '../utils/quote_comparison_utils';
import { ExtendedQuoteReport, quoteReportUtils } from '../utils/quote_report_utils';
import { QuoteServerClient } from '../utils/quote_server_client';
import { otcOrderToStoredOtcOrder, RfqmDbUtils } from '../utils/rfqm_db_utils';
import { computeHealthCheckAsync, HealthCheckResult } from '../utils/rfqm_health_check';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { RfqMakerManager } from '../utils/rfq_maker_manager';
import { getSignerFromHash, padSignature } from '../utils/signature_utils';
import { TokenMetadataManager } from '../utils/TokenMetadataManager';

import { FeeService } from './fee_service';
import { RfqMakerBalanceCacheService } from './rfq_maker_balance_cache_service';
import {
    ApprovalResponse,
    FetchFirmQuoteParams,
    FetchIndicativeQuoteParams,
    FetchIndicativeQuoteResponse,
    OtcOrderRfqmQuoteResponse,
    OtcOrderSubmitRfqmSignedQuoteParams,
    OtcOrderSubmitRfqmSignedQuoteResponse,
    QuoteContext,
    RfqmTypes,
    StatusResponse,
    SubmitApprovalParams,
    SubmitRfqmSignedQuoteWithApprovalParams,
    SubmitRfqmSignedQuoteWithApprovalResponse,
    TransactionDetails,
} from './types';

const RFQM_QUOTE_INSERTED = new Counter({
    name: 'rfqm_quote_inserted',
    help: 'An RfqmQuote was inserted in the DB',
    labelNames: ['apiKey', 'integratorId', 'makerUri'],
});

const RFQM_SIGNED_QUOTE_NOT_FOUND = new Counter({
    name: 'rfqm_signed_quote_not_found',
    labelNames: ['chain_id'],
    help: 'A submitted quote did not match any stored quotes',
});
const RFQM_TAKER_AND_TAKERTOKEN_TRADE_EXISTS = new Counter({
    name: 'rfqm_signed_quote_taker_and_takertoken_trade_exists',
    labelNames: ['chain_id'],
    help: 'A trade was submitted when the system already had a pending trade for the same taker and takertoken',
});
const RFQM_SUBMIT_BALANCE_CHECK_FAILED = new Counter({
    name: 'rfqm_submit_balance_check_failed',
    labelNames: ['makerAddress', 'chain_id'],
    help: 'A trade was submitted but our on-chain balance check failed',
});

const RFQM_MAKER_BLOCKED_FOR_LLR_COOLDOWN = new Counter({
    name: 'rfqm_maker_blocked_for_llr_cooldown',
    help: 'A maker get blocked because of LLR cooldown',
    labelNames: ['maker_id', 'chain_id', 'pair_key'],
});

const RFQM_MM_RETURNED_DIFFERENT_AMOUNT = new Counter({
    name: 'rfqm_mm_returned_different_amount_total',
    help: 'A maker responded a quote with different amount than requested',
    labelNames: ['maker_uri', 'chain_id', 'modification_type'],
});

const PRICE_DECIMAL_PLACES = 6;

const getTokenAddressFromSymbol = (symbol: string, chainId: number): string => {
    return (getTokenMetadataIfExists(symbol, chainId) as TokenMetadata).tokenAddress;
};

/**
 * RfqmService is the coordination layer for HTTP based RFQM flows.
 */
export class RfqmService {
    private readonly _nativeTokenAddress: string;
    private readonly _nativeTokenSymbol: string;
    private readonly _nativeWrappedTokenSymbol: string;
    private readonly _nativeWrappedTokenAddress: string;

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

    /**
     * Transform a transaction submission to type `TransactionDetails`.
     *
     * @returns Corresponding `TransactionDetails` or null if transaction hash is not available.
     */
    private static _transformTransactionSubmission(
        transactionSubmission: Pick<
            RfqmV2TransactionSubmissionEntity | MetaTransactionSubmissionEntity,
            'createdAt' | 'transactionHash'
        >,
    ): TransactionDetails | null {
        const { transactionHash: hash, createdAt } = transactionSubmission;
        return hash ? { hash, timestamp: createdAt.getTime() } : null;
    }

    /**
     * Get details of the successful transaction submission (there will only be one).
     *
     * @param opts Options object that contains:
     *             - `hash`: The hash of the order or metatransaction.
     *             - `type`: The type of the transaction submissions.
     *             - `transactionSubmssions`: List of transaction submissions to filter.
     * @returns The details (hash and timestamp) of the successful transaction submission.
     * @throws - When the number of the successful transaction submission is not 1
     *         - The successful transaction submission does not have transaction hash
     */
    private static _getSuccessfulTransactionSubmissionDetails(opts: {
        hash: string;
        type: RfqmTransactionSubmissionType;
        transactionSubmssions: Pick<
            RfqmV2TransactionSubmissionEntity | MetaTransactionSubmissionEntity,
            'createdAt' | 'status' | 'transactionHash'
        >[];
    }): TransactionDetails {
        const { hash, type, transactionSubmssions } = opts;
        const successfulTransactionSubmissions = transactionSubmssions.filter(
            (s) =>
                s.status === RfqmTransactionSubmissionStatus.SucceededUnconfirmed ||
                s.status === RfqmTransactionSubmissionStatus.SucceededConfirmed,
        );
        if (successfulTransactionSubmissions.length !== 1) {
            throw new Error(
                `Expected exactly one successful transaction submission of type ${type} for hash ${hash}; found ${successfulTransactionSubmissions.length}`,
            );
        }
        const successfulTransactionSubmission = successfulTransactionSubmissions[0];
        const successfulTransactionSubmissionDetails = this._transformTransactionSubmission(
            successfulTransactionSubmission,
        );
        if (!successfulTransactionSubmissionDetails) {
            throw new Error(`Successful transaction of type ${type} does not have a hash ${hash}`);
        }

        return successfulTransactionSubmissionDetails;
    }

    private static _jobFailureStatusToReason(failureStatus: RfqmJobStatus): JobFailureReason {
        switch (failureStatus) {
            case RfqmJobStatus.FailedEthCallFailed:
                return JobFailureReason.TransactionSimulationFailed;
            case RfqmJobStatus.FailedExpired:
                return JobFailureReason.OrderExpired;
            case RfqmJobStatus.FailedLastLookDeclined:
                return JobFailureReason.LastLookDeclined;
            case RfqmJobStatus.FailedSignFailed:
                return JobFailureReason.MarketMakerSignatureError;
            case RfqmJobStatus.FailedRevertedConfirmed:
            case RfqmJobStatus.FailedRevertedUnconfirmed:
                return JobFailureReason.TransactionReverted;
            default:
                return JobFailureReason.InternalError;
        }
    }

    constructor(
        private readonly _chainId: number,
        private readonly _feeService: FeeService,
        private readonly _feeModelVersion: FeeModelVersion,
        private readonly _contractAddresses: AssetSwapperContractAddresses,
        private readonly _registryAddress: string,
        private readonly _blockchainUtils: RfqBlockchainUtils,
        private readonly _dbUtils: RfqmDbUtils,
        private readonly _sqsProducer: Producer,
        private readonly _quoteServerClient: QuoteServerClient,
        private readonly _cacheClient: CacheClient,
        private readonly _rfqMakerBalanceCacheService: RfqMakerBalanceCacheService,
        private readonly _rfqMakerManager: RfqMakerManager,
        private readonly _tokenMetadataManager: TokenMetadataManager,
        private readonly _kafkaProducer?: KafkaProducer,
        private readonly _quoteReportTopic?: string,
    ) {
        this._nativeTokenSymbol = nativeTokenSymbol(this._chainId);
        this._nativeTokenAddress = getTokenAddressFromSymbol(this._nativeTokenSymbol, this._chainId);
        this._nativeWrappedTokenSymbol = nativeWrappedTokenSymbol(this._chainId);
        this._nativeWrappedTokenAddress = getTokenAddressFromSymbol(this._nativeWrappedTokenSymbol, this._chainId);
    }

    /**
     * Passthrough to TokenMetadataManager's `getTokenDecimalsAsync` method
     */
    public async getTokenDecimalsAsync(tokenAddress: string): Promise<number> {
        return this._tokenMetadataManager.getTokenDecimalsAsync(tokenAddress);
    }

    /**
     * Fetch the best indicative quote available. Returns null if no valid quotes found
     */
    public async fetchIndicativeQuoteAsync(
        params: FetchIndicativeQuoteParams,
        extendedQuoteReportSubmissionBy: ExtendedQuoteReport['submissionBy'] = 'rfqm',
    ): Promise<FetchIndicativeQuoteResponse | null> {
        const affiliateAddress = params.affiliateAddress ?? params.integrator.affiliateAddress;

        // Retrieve quote context
        const quoteContext = this._retrieveQuoteContext({ ...params, affiliateAddress }, /* isFirm */ false);
        const {
            isFirm,
            takerAmount,
            makerAmount,
            takerToken,
            makerToken,
            originalMakerToken,
            takerTokenDecimals,
            makerTokenDecimals,
            takerAddress,
            isSelling,
            assetFillAmount,
            integrator,
        } = quoteContext;

        // (Optimization) When `quotesWithGasFee` is returned, we can use this value and revise it, to avoid another fetch to MMs
        const { feeWithDetails, quotesWithGasFee, ammQuoteUniqueId } = await this._feeService.calculateFeeAsync(
            quoteContext,
            this._fetchIndicativeQuotesAsync.bind(this),
        );

        // Calculate fees (other than gas fee) to charge MMs
        const otherFeesAmount = feeWithDetails.amount.minus(feeWithDetails.details.gasFeeAmount);

        const finalQuotes = quotesWithGasFee
            ? await this._feeService.reviseQuotesAsync(quotesWithGasFee, otherFeesAmount, quoteContext)
            : await this._fetchIndicativeQuotesAsync(quoteContext, feeWithDetails);

        // (Quote Report) If otherFees > 0, then we "revised" the quotes from MMs. We want to save both the original quotes (aka intermediateQuotes) and the revised (finalQuotes)
        const intermediateQuotes = quotesWithGasFee && otherFeesAmount.gt(ZERO) ? quotesWithGasFee : [];

        // Get the best quote
        const bestQuote = getBestQuote(
            finalQuotes,
            isSelling,
            takerToken,
            makerToken,
            assetFillAmount,
            RFQM_MINIMUM_EXPIRY_DURATION_MS,
        );

        const isLiquidityAvailable = bestQuote !== null;

        // Quote Report
        if (this._kafkaProducer) {
            await quoteReportUtils.publishRFQMQuoteReportAsync(
                {
                    isFirmQuote: isFirm,
                    taker: takerAddress,
                    buyTokenAddress: originalMakerToken,
                    sellTokenAddress: takerToken,
                    buyAmount: makerAmount,
                    sellAmount: takerAmount,
                    integratorId: integrator?.integratorId,
                    finalQuotes,
                    intermediateQuotes,
                    bestQuote,
                    fee: feeToStoredFee(feeWithDetails),
                    ammQuoteUniqueId,
                    isLiquidityAvailable,
                },
                this._kafkaProducer,
                this._quoteReportTopic,
                extendedQuoteReportSubmissionBy,
            );
        }

        // No quotes found
        if (!isLiquidityAvailable) {
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
            gas: feeWithDetails.details.gasPrice,
            buyAmount: bestQuote.makerAmount,
            buyTokenAddress: originalMakerToken,
            sellAmount: bestQuote.takerAmount,
            sellTokenAddress: bestQuote.takerToken,
            allowanceTarget: this._contractAddresses.exchangeProxy,
        };
    }

    /**
     * Fetch the best firm quote available, including a metatransaction. Returns null if no valid quotes found
     */
    public async fetchFirmQuoteAsync(
        params: FetchFirmQuoteParams,
        extendedQuoteReportSubmissionBy: ExtendedQuoteReport['submissionBy'] = 'rfqm',
    ): Promise<{ quote: OtcOrderRfqmQuoteResponse | null; quoteReportId: string | null }> {
        const affiliateAddress = params.affiliateAddress ?? params.integrator.affiliateAddress;
        // Retrieve quote context
        const quoteContext = this._retrieveQuoteContext({ ...params, affiliateAddress }, /* isFirm */ true);
        const {
            isFirm,
            takerAmount,
            makerAmount,
            takerToken,
            makerToken,
            originalMakerToken,
            takerTokenDecimals,
            makerTokenDecimals,
            takerAddress,
            integrator,
            isUnwrap,
            isSelling,
            assetFillAmount,
        } = quoteContext;

        // (Optimization) When `quotesWithGasFee` is returned, we can sometimes reuse it, to avoid another fetch to MMs
        // NOTE: this optimization differs from the optimization for indicative quotes because we do NOT revise firm quotes
        const { feeWithDetails, quotesWithGasFee, ammQuoteUniqueId } = await this._feeService.calculateFeeAsync(
            quoteContext,
            this._fetchIndicativeQuotesAsync.bind(this),
        );

        // Calculate fees (other than gas fee) to charge MMs. If there are other fees, we don't reuse `quotesWithGasFee`
        const otherFeesAmount = feeWithDetails.amount.minus(feeWithDetails.details.gasFeeAmount);

        // If `quotesWithGasFee` have been obtained and there are no other fees, reuse the quotes. Otherwise call MMs with full fee to get new quotes.
        const finalQuotes =
            quotesWithGasFee && otherFeesAmount.eq(ZERO)
                ? await this._convertToFirmQuotesAsync(quotesWithGasFee, quoteContext)
                : await this._fetchFirmQuotesAsync(quoteContext, feeWithDetails);

        // (Quote Report) If `quotesWithGasFee` have not been reused, save them as intermediate quotes
        const intermediateQuotes = quotesWithGasFee && otherFeesAmount.gt(ZERO) ? quotesWithGasFee : [];

        // (Maker Balance Cache) Fetch maker balances to validate whether quotes are fully fillable
        let quotedMakerBalances: BigNumber[] | undefined;
        const quotedERC20Owners = finalQuotes.map((quote) => {
            return {
                owner: quote.order.maker,
                token: makerToken,
            };
        });
        try {
            quotedMakerBalances = await this._rfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(
                this._chainId,
                quotedERC20Owners,
            );
        } catch (e) {
            logger.error(
                { chainId: this._chainId, quotedERC20Owners, errorMessage: e.message },
                'Failed to fetch maker balances to validate firm quotes',
            );
        }

        // Get the best quote
        const bestQuote = getBestQuote(
            finalQuotes,
            isSelling,
            takerToken,
            makerToken,
            assetFillAmount,
            RFQM_MINIMUM_EXPIRY_DURATION_MS,
            quotedMakerBalances,
        );

        const isLiquidityAvailable = bestQuote !== null;

        const storedFeeWithDetails = feeToStoredFee(feeWithDetails);

        let quoteReportId: string | null = null;
        // Quote Report
        if (this._kafkaProducer) {
            quoteReportId = await quoteReportUtils.publishRFQMQuoteReportAsync(
                {
                    isFirmQuote: isFirm,
                    taker: takerAddress,
                    buyTokenAddress: originalMakerToken,
                    sellTokenAddress: takerToken,
                    buyAmount: makerAmount,
                    sellAmount: takerAmount,
                    integratorId: integrator?.integratorId,
                    finalQuotes,
                    intermediateQuotes,
                    bestQuote,
                    fee: storedFeeWithDetails,
                    ammQuoteUniqueId,
                    isLiquidityAvailable,
                },
                this._kafkaProducer,
                this._quoteReportTopic,
                extendedQuoteReportSubmissionBy,
            );
        }

        // No quote found
        if (!isLiquidityAvailable) {
            return { quote: null, quoteReportId };
        }

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
        const sellAmount = isSelling
            ? // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              takerAmount!
            : RfqmService._getSellAmountGivenBuyAmountAndQuote(
                  // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  makerAmount!,
                  bestQuote.order.takerAmount,
                  bestQuote.order.makerAmount,
              );

        const buyAmount = isSelling
            ? RfqmService._getBuyAmountGivenSellAmountAndQuote(
                  // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  takerAmount!,
                  bestQuote.order.takerAmount,
                  bestQuote.order.makerAmount,
              )
            : // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              makerAmount!;

        // Get the Order and its hash
        const orderHash = bestQuote.order.getHash();

        const otcOrder = bestQuote.order;
        await this._dbUtils.writeV2QuoteAsync({
            orderHash,
            chainId: this._chainId,
            fee: storedFeeWithDetails,
            order: otcOrderToStoredOtcOrder(otcOrder),
            makerUri,
            affiliateAddress,
            integratorId: integrator.integratorId,
            isUnwrap,
            takerSpecifiedSide: params.sellAmount ? 'takerToken' : 'makerToken',
        });

        const approval = params.checkApproval
            ? // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              await this.getGaslessApprovalResponseAsync(takerAddress!, takerToken, sellAmount)
            : null;

        RFQM_QUOTE_INSERTED.labels(integrator.integratorId, integrator.integratorId, makerUri).inc();
        return {
            quote: {
                type: RfqmTypes.OtcOrder,
                price: roundedPrice,
                gas: feeWithDetails.details.gasPrice,
                buyAmount,
                buyTokenAddress: originalMakerToken,
                sellAmount,
                sellTokenAddress: bestQuote.order.takerToken,
                allowanceTarget: this._contractAddresses.exchangeProxy,
                order: bestQuote.order,
                orderHash,
                // use approval variable directly is not ideal as we don't want to include approval field if `approval` is null
                ...(approval && { approval }),
            },
            quoteReportId,
        };
    }

    /**
     * Get the value of the approval response in firm quote responses. The approval response contains whether an approval is required, is gasless approval
     * is available for the token (optional), the type of the gasless approval (optional) and the EIP712 context (optional).
     *
     * @param takerAddress The address of the taker.
     * @param tokenToApprove Token address to be approved.
     * @param sellAmount Amount of token to sell in base unit.
     * @returns The approval response.
     */
    public async getGaslessApprovalResponseAsync(
        takerAddress: string,
        tokenToApprove: string,
        sellAmount: BigNumber,
    ): Promise<ApprovalResponse> {
        const allowance = await this._blockchainUtils.getAllowanceAsync(
            tokenToApprove,
            takerAddress,
            this._blockchainUtils.getExchangeProxyAddress(),
        );
        const isRequired = allowance.lte(sellAmount);
        if (!isRequired) {
            return {
                isRequired,
            };
        }

        const gaslessApproval = await this._blockchainUtils.getGaslessApprovalAsync(
            this._chainId,
            tokenToApprove,
            takerAddress,
        );
        const isGaslessAvailable = gaslessApproval !== null;
        if (!isGaslessAvailable) {
            return {
                isRequired,
                isGaslessAvailable,
            };
        }

        return {
            isRequired,
            isGaslessAvailable,
            type: gaslessApproval.kind,
            eip712: gaslessApproval.eip712,
        };
    }

    public async getStatusAsync(tradeHash: string): Promise<StatusResponse | null> {
        const transformSubmissions = (
            submissions: RfqmV2TransactionSubmissionEntity[] | MetaTransactionSubmissionEntity[],
        ) => {
            // `_transformTransactionSubmission` is a static method so no-unbound-method does not apply here
            // tslint:disable-next-line:no-unbound-method
            return submissions.map(RfqmService._transformTransactionSubmission).flatMap((s) => (s ? s : []));
        };

        const job = await Promise.all([
            this._dbUtils.findV2JobByOrderHashAsync(tradeHash),
            this._dbUtils.findMetaTransactionJobByMetaTransactionHashAsync(tradeHash),
        ]).then((jobs) => jobs.find((x) => x));

        if (!job) {
            return null;
        }

        const { status, expiry } = job;

        if (status === RfqmJobStatus.PendingEnqueued && expiry.multipliedBy(ONE_SECOND_MS).lt(Date.now())) {
            // the workers are dead/on vacation and the expiration time has passed
            return {
                status: 'failed',
                transactions: [],
                ...(REASON_ON_STATUS_ERROR_RESPONSE_ENABLED && {
                    reason: JobFailureReason.OrderExpired,
                }),
            };
        }

        const tradeTransactionSubmissions =
            job.kind === 'rfqm_v2_job'
                ? await this._dbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                      job.orderHash,
                      RfqmTransactionSubmissionType.Trade,
                  )
                : await this._dbUtils.findMetaTransactionSubmissionsByJobIdAsync(
                      job.id,
                      RfqmTransactionSubmissionType.Trade,
                  );
        const shouldIncludeApproval = !!job.approval;
        let approvalTransactionSubmissions: RfqmV2TransactionSubmissionEntity[] | MetaTransactionSubmissionEntity[] =
            [];
        if (shouldIncludeApproval) {
            approvalTransactionSubmissions =
                job.kind === 'rfqm_v2_job'
                    ? await this._dbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                          job.orderHash,
                          RfqmTransactionSubmissionType.Approval,
                      )
                    : await this._dbUtils.findMetaTransactionSubmissionsByJobIdAsync(
                          job.id,
                          RfqmTransactionSubmissionType.Approval,
                      );
        }

        switch (status) {
            case RfqmJobStatus.PendingEnqueued:
            case RfqmJobStatus.PendingProcessing:
            case RfqmJobStatus.PendingLastLookAccepted:
                return { status: 'pending', transactions: [] };
            case RfqmJobStatus.PendingSubmitted:
                return {
                    status: 'submitted',
                    transactions: transformSubmissions(tradeTransactionSubmissions),
                    ...(shouldIncludeApproval && {
                        approvalTransactions: transformSubmissions(approvalTransactionSubmissions),
                    }),
                };
            case RfqmJobStatus.FailedEthCallFailed:
            case RfqmJobStatus.FailedExpired:
            case RfqmJobStatus.FailedLastLookDeclined:
            case RfqmJobStatus.FailedPresignValidationFailed:
            case RfqmJobStatus.FailedRevertedConfirmed:
            case RfqmJobStatus.FailedRevertedUnconfirmed:
            case RfqmJobStatus.FailedSignFailed:
            case RfqmJobStatus.FailedSubmitFailed:
            case RfqmJobStatus.FailedValidationNoCallData:
            case RfqmJobStatus.FailedValidationNoFee:
            case RfqmJobStatus.FailedValidationNoMakerUri:
            case RfqmJobStatus.FailedValidationNoOrder:
            case RfqmJobStatus.FailedValidationNoTakerSignature:
                return {
                    status: 'failed',
                    transactions: transformSubmissions(tradeTransactionSubmissions),
                    ...(shouldIncludeApproval && {
                        approvalTransactions: transformSubmissions(approvalTransactionSubmissions),
                    }),
                    ...(REASON_ON_STATUS_ERROR_RESPONSE_ENABLED && {
                        reason: RfqmService._jobFailureStatusToReason(status),
                    }),
                };
            case RfqmJobStatus.SucceededConfirmed:
            case RfqmJobStatus.SucceededUnconfirmed:
                return {
                    status: status === RfqmJobStatus.SucceededUnconfirmed ? 'succeeded' : 'confirmed',
                    transactions: [
                        RfqmService._getSuccessfulTransactionSubmissionDetails({
                            hash: job.getHash(),
                            type: RfqmTransactionSubmissionType.Trade,
                            transactionSubmssions: tradeTransactionSubmissions,
                        }),
                    ],
                    ...(shouldIncludeApproval && {
                        approvalTransactions: [
                            RfqmService._getSuccessfulTransactionSubmissionDetails({
                                hash: job.getHash(),
                                type: RfqmTransactionSubmissionType.Approval,
                                transactionSubmssions: approvalTransactionSubmissions,
                            }),
                        ],
                    }),
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
        const heartbeats = await this._dbUtils.findRfqmWorkerHeartbeatsAsync(this._chainId);
        let gasPrice: BigNumber | undefined;
        try {
            gasPrice = await this._feeService.getGasPriceEstimationAsync();
        } catch (error) {
            logger.warn({ errorMessage: error.message }, 'Failed to get gas price for health check');
        }
        return computeHealthCheckAsync(
            RFQM_MAINTENANCE_MODE,
            this._rfqMakerManager.getRfqmV2MakerOfferings(),
            this._sqsProducer,
            heartbeats,
            this._chainId,
            gasPrice,
        );
    }

    /**
     * Validates and enqueues the Taker Signed Otc Order with approval for submission.
     * Can also be used to submit order without approval if approval params are not supplied.
     */
    public async submitTakerSignedOtcOrderWithApprovalAsync<
        T extends ExecuteMetaTransactionEip712Context | PermitEip712Context,
    >(params: SubmitRfqmSignedQuoteWithApprovalParams<T>): Promise<SubmitRfqmSignedQuoteWithApprovalResponse> {
        let submitRfqmSignedQuoteWithApprovalRes: SubmitRfqmSignedQuoteWithApprovalResponse;
        const { approval, trade } = params;

        const rfqmApprovalOpts = approval
            ? await this.createApprovalAsync(approval, trade.order.getHash(), trade.order.takerToken)
            : undefined;
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line prefer-const
        submitRfqmSignedQuoteWithApprovalRes = await this.submitTakerSignedOtcOrderAsync(trade, rfqmApprovalOpts);

        return submitRfqmSignedQuoteWithApprovalRes;
    }

    /**
     * Processes a signed approval sent to the submission endpoint in order to
     * create the approval data needed by the job.
     */
    public async createApprovalAsync<T extends ExecuteMetaTransactionEip712Context | PermitEip712Context>(
        approval: SubmitApprovalParams<T>,
        tradeHash: string,
        takerToken: string,
    ): Promise<RfqmV2JobApprovalOpts> {
        let { signature } = approval;

        // validate and convert EIP712 context to corresponding Approval object
        const parsedApproval = this._convertEIP712ContextToApproval(approval.eip712, tradeHash);

        // pad approval signature if there are missing bytes
        const paddedSignature = padSignature(signature);
        if (paddedSignature.r !== signature.r || paddedSignature.s !== signature.s) {
            logger.warn(
                { tradeHash, r: paddedSignature.r, s: paddedSignature.s },
                'Got approval signature with missing bytes',
            );
            signature = paddedSignature;
        }

        // perform an eth_call on the approval object and signature
        try {
            const approvalCalldata = await this._blockchainUtils.generateApprovalCalldataAsync(
                takerToken,
                parsedApproval,
                signature,
            );
            await retry(
                async () => {
                    // Use `estimateGasForAsync` to simulate the transaction. In ethers.js, provider.call and
                    // provider.send('eth_call', ...) might not throw exception and the behavior might be dependent
                    // on providers. Revisit this later
                    return this._blockchainUtils.estimateGasForAsync({ to: takerToken, data: approvalCalldata });
                },
                {
                    delay: ONE_SECOND_MS,
                    factor: 1,
                    maxAttempts: 3,
                    handleError: (error, context, _options) => {
                        const { attemptNum: attemptNumber, attemptsRemaining } = context;
                        logger.warn(
                            {
                                attemptNumber,
                                attemptsRemaining,
                                errorMessage: error.message,
                                stack: error.stack,
                                tradeHash,
                            },
                            'Error during eth_call approval validation. Retrying.',
                        );
                    },
                },
            );
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'Eth call approval validation failed');
            throw new Error('Eth call approval validation failed');
        }

        return {
            approval: parsedApproval,
            approvalSignature: signature,
        };
    }

    /**
     * Validates and enqueues the Taker Signed Otc Order for submission
     */
    public async submitTakerSignedOtcOrderAsync(
        params: OtcOrderSubmitRfqmSignedQuoteParams,
        rfqmApprovalOpts?: RfqmV2JobApprovalOpts,
    ): Promise<OtcOrderSubmitRfqmSignedQuoteResponse> {
        const { order } = params;
        let { signature: takerSignature } = params;
        const orderHash = order.getHash();
        const takerAddress = order.taker.toLowerCase();
        const makerAddress = order.maker.toLowerCase();
        const takerToken = order.takerToken.toLowerCase();
        const makerToken = order.makerToken.toLowerCase();
        // check that the orderHash is indeed a recognized quote
        const quote = await this._dbUtils.findV2QuoteByOrderHashAsync(orderHash);
        if (!quote) {
            RFQM_SIGNED_QUOTE_NOT_FOUND.inc();
            throw new NotFoundError('quote not found');
        }

        // validate that the expiration window is long enough to fill quote
        const currentTimeMs = new Date().getTime();
        if (!order.expiry.times(ONE_SECOND_MS).isGreaterThan(currentTimeMs + RFQM_MINIMUM_EXPIRY_DURATION_MS)) {
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
            RFQM_TAKER_AND_TAKERTOKEN_TRADE_EXISTS.labels(this._chainId.toString()).inc();
            throw new TooManyRequestsError('a pending trade for this taker and takertoken already exists');
        }

        // In the unlikely event that takers submit a signature with a missing byte, pad the signature.
        const paddedSignature = padSignature(takerSignature);
        if (paddedSignature.r !== takerSignature.r || paddedSignature.s !== takerSignature.s) {
            logger.warn(
                { orderHash, r: paddedSignature.r, s: paddedSignature.s },
                'Got taker signature with missing bytes',
            );
            takerSignature = paddedSignature;
        }

        // validate that the given taker signature is valid
        const signerAddress = getSignerFromHash(orderHash, takerSignature).toLowerCase();
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

        // Validate that order is fillable by both the maker and the taker according to balances and/or allowances.
        // If rfqmApprovalOpts is not passed, allowances are not checked at this stage since gasless approval has not been done yet.
        const [makerBalance] = await this._rfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(this._chainId, [
            {
                owner: makerAddress,
                token: makerToken,
            },
        ]);
        const [takerBalance] = rfqmApprovalOpts
            ? await this._blockchainUtils.getTokenBalancesAsync({ owner: takerAddress, token: takerToken })
            : await this._blockchainUtils.getMinOfBalancesAndAllowancesAsync({
                  owner: takerAddress,
                  token: takerToken,
              });

        if (makerBalance.lt(order.makerAmount) || takerBalance.lt(order.takerAmount)) {
            RFQM_SUBMIT_BALANCE_CHECK_FAILED.labels(makerAddress, this._chainId.toString()).inc();
            logger.warn(
                {
                    makerBalance,
                    takerBalance,
                    makerAddress,
                    takerAddress,
                    orderHash,
                    order,
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

        // prepare the job
        let rfqmJobOpts: RfqmV2JobConstructorOpts = {
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            orderHash: quote.orderHash!,
            createdAt: new Date(),
            expiry: order.expiry,
            chainId: this._chainId,
            integratorId: quote.integratorId ? quote.integratorId : null,
            makerUri: quote.makerUri,
            status: RfqmJobStatus.PendingEnqueued,
            fee: quote.fee,
            order: quote.order,
            takerSignature,
            affiliateAddress: quote.affiliateAddress,
            isUnwrap: quote.isUnwrap,
            takerSpecifiedSide: quote.takerSpecifiedSide,
        };

        // if approval opts are supplied, add params to job table
        if (rfqmApprovalOpts) {
            rfqmJobOpts = {
                ...rfqmJobOpts,
                ...rfqmApprovalOpts,
            };
        }

        // this insert will fail if a job has already been created, ensuring
        // that a signed quote cannot be queued twice
        try {
            // make sure job data is persisted to Postgres before queueing task
            await this._dbUtils.writeV2JobAsync(rfqmJobOpts);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await this._enqueueJobAsync(quote.orderHash!, RfqmTypes.OtcOrder);
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'Failed to queue the quote for submission.');
            throw new InternalServerError(
                `failed to queue the quote for submission, it may have already been submitted`,
            );
        }

        return {
            type: RfqmTypes.OtcOrder,
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            orderHash: quote.orderHash!,
        };
    }

    /**
     * Internal method to retrieve quote context, based on either indicative or firm quote parameters
     */
    private _retrieveQuoteContext(
        params: FetchIndicativeQuoteParams | FetchFirmQuoteParams,
        isFirm: boolean,
    ): QuoteContext {
        const {
            sellAmount: takerAmount,
            buyAmount: makerAmount,
            sellToken: takerToken,
            buyToken: originalMakerToken,
            takerAddress,
            sellTokenDecimals: takerTokenDecimals,
            buyTokenDecimals: makerTokenDecimals,
            integrator,
            affiliateAddress,
        } = params;

        const isUnwrap = originalMakerToken === this._nativeTokenAddress;
        const isSelling = takerAmount !== undefined;
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const assetFillAmount = isSelling ? takerAmount! : makerAmount!;

        let makerToken = originalMakerToken;

        // If the originalMakerToken is the native token, we will trade the wrapped version and unwrap at the end
        if (isUnwrap) {
            makerToken = this._nativeWrappedTokenAddress;
        }

        return {
            workflow: 'rfqm',
            chainId: this._chainId,
            isFirm,
            takerAmount,
            makerAmount,
            takerToken,
            makerToken,
            originalMakerToken,
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            takerAddress: takerAddress!,
            txOrigin: this._registryAddress,
            takerTokenDecimals,
            makerTokenDecimals,
            integrator,
            affiliateAddress,
            isUnwrap,
            isSelling,
            assetFillAmount,
            feeModelVersion: this._feeModelVersion,
        };
    }

    /**
     * Internal method to fetch indicative quotes.
     */
    private async _fetchIndicativeQuotesAsync(quoteContext: QuoteContext, fee: Fee): Promise<IndicativeQuote[]> {
        // Extract quote context
        const { isSelling, assetFillAmount, takerToken, makerToken, integrator } = quoteContext;

        // Create Otc Order request options
        const otcOrderParams = QuoteServerClient.makeQueryParameters({
            chainId: this._chainId,
            txOrigin: this._registryAddress,
            takerAddress: NULL_ADDRESS,
            marketOperation: isSelling ? MarketOperation.Sell : MarketOperation.Buy,
            buyTokenAddress: makerToken,
            sellTokenAddress: takerToken,
            assetFillAmount,
            isLastLook: true,
            fee,
        });

        // If LLR Cooldown is enabled, filter out makers in cooldown before querying the quote server
        let makerIdsInCooldown: string[] | undefined;
        if (ENABLE_LLR_COOLDOWN) {
            try {
                makerIdsInCooldown = await this._cacheClient.getMakersInCooldownForPairAsync(
                    this._chainId,
                    makerToken,
                    takerToken,
                );
                // log blocked maker ids
                makerIdsInCooldown.map((makerId) => {
                    RFQM_MAKER_BLOCKED_FOR_LLR_COOLDOWN.labels(
                        makerId,
                        this._chainId.toString(),
                        toPairString(makerToken, takerToken),
                    ).inc();
                    logger.warn(
                        {
                            makerId,
                            makerToken,
                            takerToken,
                            timestamp: Date.now(),
                        },
                        'Maker is on cooldown due to a bad last look reject',
                    );
                });
            } catch (e) {
                logger.error(
                    { chainId: this._chainId, makerToken, takerToken, errorMessage: e.message },
                    'Encountered an error while filtering makers on LLR cooldown',
                );
            }
        }

        const otcOrderMakerUris = this._rfqMakerManager.getRfqmV2MakerUrisForPair(
            makerToken,
            takerToken,
            integrator.whitelistMakerIds || null,
            makerIdsInCooldown || null,
        );

        const quotes = await this._quoteServerClient.batchGetPriceV2Async(
            otcOrderMakerUris,
            integrator,
            otcOrderParams,
        );

        // Log any quotes that are for the incorrect amount
        quotes.forEach((quote) => {
            const quotedAmount = isSelling ? quote.takerAmount : quote.makerAmount;
            if (quotedAmount.eq(assetFillAmount)) {
                return;
            }
            const modificationType = quotedAmount.gt(assetFillAmount) ? 'overfill' : 'underfill';
            logger.warn(
                {
                    isSelling,
                    overOrUnder: modificationType,
                    requestedAmount: assetFillAmount,
                    quotedAmount,
                    quote,
                },
                'Maker returned an incorrect amount',
            );
            RFQM_MM_RETURNED_DIFFERENT_AMOUNT.labels(quote.makerUri, this._chainId.toString(), modificationType).inc();
        });

        return quotes;
    }

    /**
     * Internal method to fetch firm quotes.
     */
    private async _fetchFirmQuotesAsync(quoteContext: QuoteContext, fee: Fee): Promise<FirmOtcQuote[]> {
        const quotes = await this._fetchIndicativeQuotesAsync(quoteContext, fee);
        return this._convertToFirmQuotesAsync(quotes, quoteContext);
    }

    /**
     * Internal method to convert indicative quotes to firm quotes.
     */
    private async _convertToFirmQuotesAsync(
        quotes: IndicativeQuote[],
        quoteContext: QuoteContext,
    ): Promise<FirmOtcQuote[]> {
        const { takerAddress } = quoteContext;
        const currentBucket = (await this._cacheClient.getNextOtcOrderBucketAsync(this._chainId)) % RFQM_NUM_BUCKETS;
        const nowSeconds = Math.floor(Date.now() / ONE_SECOND_MS);
        const otcQuotes = quotes.map((q) =>
            this._mapIndicativeQuoteToFirmOtcQuote(
                q,
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                takerAddress!,
                new BigNumber(currentBucket),
                new BigNumber(nowSeconds),
            ),
        );

        const firmQuotesWithCorrectChainId = otcQuotes.filter((quote) => {
            if (quote.order.chainId !== this._chainId) {
                logger.error({ quote }, 'Received a quote with incorrect chain id');
                return false;
            }
            return true;
        });

        return firmQuotesWithCorrectChainId;
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
                chainId: this._chainId,
                verifyingContract: this._contractAddresses.exchangeProxy,
            }),
        };
    }

    /**
     * Validates and converts EIP-712 context to an Approval object.
     * @param kind Type of gasless approval
     * @param eip712 EIP-712 context parsed from the handler
     * @param tradeHash The order hash or metatransaction hash,
     *  only used for logging in case of validation error
     * @returns The Approval object
     */
    // tslint:disable-next-line: prefer-function-over-method
    private _convertEIP712ContextToApproval<T extends ExecuteMetaTransactionEip712Context | PermitEip712Context>(
        eip712: T,
        tradeHash: string,
    ): T extends ExecuteMetaTransactionEip712Context ? ExecuteMetaTransactionApproval : PermitApproval {
        const { types, primaryType, domain, message } = eip712;
        switch (primaryType) {
            case 'MetaTransaction': {
                if (
                    !_.isEqual(
                        _.keys(message).sort(),
                        types.MetaTransaction.map((dataField: Eip712DataField) => dataField.name).sort(),
                    )
                ) {
                    logger.warn({ primaryType, tradeHash }, 'Invalid message field provided for Approval');
                    throw new ValidationError([
                        {
                            field: 'message',
                            code: ValidationErrorCodes.FieldInvalid,
                            reason: `Invalid message field provided for Approval of primaryType ${primaryType}`,
                        },
                    ]);
                }
                const executeMetaTransactionApproval: ExecuteMetaTransactionApproval = {
                    kind: GaslessApprovalTypes.ExecuteMetaTransaction,
                    eip712: {
                        types,
                        primaryType,
                        domain,
                        message: {
                            nonce: message.nonce,
                            from: message.from,
                            functionSignature: message.functionSignature,
                        },
                    },
                };
                return executeMetaTransactionApproval as T extends ExecuteMetaTransactionEip712Context
                    ? ExecuteMetaTransactionApproval
                    : PermitApproval;
            }
            case 'Permit': {
                if (
                    !_.isEqual(
                        _.keys(message).sort(),
                        types.Permit.map((dataField: Eip712DataField) => dataField.name).sort(),
                    )
                ) {
                    logger.warn({ primaryType, tradeHash }, 'Invalid message field provided for Approval');
                    throw new ValidationError([
                        {
                            field: 'message',
                            code: ValidationErrorCodes.FieldInvalid,
                            reason: `Invalid message field provided for Approval of primaryType ${primaryType}`,
                        },
                    ]);
                }
                const permitApproval: PermitApproval = {
                    kind: GaslessApprovalTypes.Permit,
                    eip712: {
                        types,
                        primaryType,
                        domain,
                        message: {
                            owner: message.owner,
                            spender: message.spender,
                            value: message.value,
                            nonce: message.nonce,
                            deadline: message.deadline,
                        },
                    },
                };

                return permitApproval as T extends ExecuteMetaTransactionEip712Context
                    ? ExecuteMetaTransactionApproval
                    : PermitApproval;
            }
            default:
                ((_x: never) => {
                    throw new Error('unreachable');
                })(primaryType);
        }
    }
}
