import { MetaTransaction, OtcOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { Integrator } from '../config';
import { JobFailureReason } from '../entities/types';
import {
    Approval,
    ExecuteMetaTransactionEip712Context,
    FeeModelVersion,
    GaslessApprovalTypes,
    GaslessTypes,
    MetaTransactionV1Eip712Context,
    MetaTransactionV2Eip712Context,
    PermitEip712Context,
} from '../core/types';
import { TruncatedFees } from '../core/types/meta_transaction_fees';

/**
 * RFQm Indicative Quote (`/price`) and Firm Quote (`/quote`) endpoints.
 */
export interface FetchQuoteParamsBase {
    affiliateAddress?: string;
    buyAmount?: BigNumber;
    buyToken: string;
    buyTokenDecimals: number;
    integrator: Integrator;
    sellAmount?: BigNumber;
    sellToken: string;
    sellTokenDecimals: number;
    // fields specific to gasless endpoints
    slippagePercentage?: BigNumber;
    priceImpactProtectionPercentage?: BigNumber;
    acceptedTypes?: GaslessTypes[];
    feeType?: 'volume';
    feeSellTokenPercentage?: BigNumber;
    feeRecipient?: string;
}

export interface FetchIndicativeQuoteParams extends FetchQuoteParamsBase {
    takerAddress?: string;
}

export interface FetchIndicativeQuoteResponse {
    allowanceTarget?: string;
    buyAmount: BigNumber;
    buyTokenAddress: string;
    gas?: BigNumber;
    estimatedPriceImpact?: BigNumber | null;
    price: BigNumber;
    sellAmount: BigNumber;
    sellTokenAddress: string;
}

export interface FetchFirmQuoteParams extends FetchQuoteParamsBase {
    takerAddress: string;
    checkApproval: boolean;
}

export interface BaseRfqmQuoteResponse {
    allowanceTarget?: string;
    buyAmount: BigNumber;
    buyTokenAddress: string;
    gas?: BigNumber;
    estimatedPriceImpact?: BigNumber | null;
    price: BigNumber;
    sellAmount: BigNumber;
    sellTokenAddress: string;
}

export interface OtcOrderRfqmQuoteResponse extends BaseRfqmQuoteResponse {
    type: GaslessTypes.OtcOrder;
    order: OtcOrder;
    orderHash: string;
    approval?: ApprovalResponse;
}

/**
 * Response from the Gasless Swap Service `/quote` endpoint.
 *
 * `approval` will be populated if `checkApproval` is `true`
 * in the parameters, the token supports gasless approval,
 * and no allowance already exists.
 */
export interface MetaTransactionV1QuoteResponse extends BaseRfqmQuoteResponse {
    type: GaslessTypes.MetaTransaction;
    metaTransaction: MetaTransaction;
    metaTransactionHash: string;
    approval?: ApprovalResponse;
    trade?: TradeResponse;
}

export interface MetaTransactionV2QuoteResponse extends BaseRfqmQuoteResponse {
    trade: TradeResponse;
    approval?: ApprovalResponse;
    sources: LiquiditySource[];
    fees?: TruncatedFees;
}

export interface LiquiditySource {
    name: string;
    proportion: BigNumber;
    intermediateToken?: string;
    hops?: string[];
}

/**
 * EIP-712 response fields for the Tx Relay `/quote` endpoint
 */
export interface ApprovalResponse {
    isRequired: boolean;
    isGaslessAvailable?: boolean;
    type?: GaslessApprovalTypes;
    hash?: string;
    eip712?: ExecuteMetaTransactionEip712Context | PermitEip712Context;
}

export interface TradeResponse {
    type: GaslessTypes;
    hash: string;
    eip712: MetaTransactionV1Eip712Context | MetaTransactionV2Eip712Context;
}

/**
 * RFQm OtcOrder `/submit` endpoint params
 * If approval is needed, order can be submitted with approval via `/submit-with-approval`.
 */
export interface OtcOrderSubmitRfqmSignedQuoteParams {
    type: GaslessTypes.OtcOrder;
    order: OtcOrder;
    signature: Signature;
}

export interface SubmitRfqmSignedQuoteWithApprovalParams<T extends Approval> {
    approval?: SubmitApprovalParams<T>;
    // Used to distinguish between `SubmitMetaTransactionSignedQuoteParams` during type check.
    // Note that this information is in `trade`, but TypeScript does not narrow types based
    // on nested values.
    kind: GaslessTypes.OtcOrder;
    trade: OtcOrderSubmitRfqmSignedQuoteParams;
}

/**
 * Payload for the Gasless Swap `/submit` endpoint in the
 * metatransaction flow
 */
export interface SubmitMetaTransactionSignedQuoteParams<ApprovalType extends Approval> {
    approval?: SubmitApprovalParams<ApprovalType>;
    // Used to distinguish between `SubmitRfqmSignedQuoteWithApprovalParams` during type check.
    // Note that this information is in `trade`, but TypeScript does not narrow types based
    // on nested values.
    kind: GaslessTypes.MetaTransaction;
    trade:
        | { metaTransaction: MetaTransaction; signature: Signature; type: GaslessTypes.MetaTransaction }
        | MetatransactionTradeParams;
}

export interface SubmitMetaTransactionV2SignedQuoteParams<ApprovalType extends Approval> {
    approval?: SubmitApprovalParams<ApprovalType>;
    // Used to distinguish between `SubmitRfqmSignedQuoteWithApprovalParams` and `SubmitMetaTransactionV2SignedQuoteParams` during type check.
    // Note that this information is in `trade`, but TypeScript does not narrow types based
    // on nested values.
    kind: GaslessTypes.MetaTransactionV2;
    // TODO: This needs to be updated to the new meta-transaction type when smart contract changes are finished and corresponding types are published in packages
    trade: MetatransactionV2TradeParams;
}

export interface SubmitApprovalParams<T extends Approval> {
    type: T['kind'];
    eip712: T['eip712'];
    signature: Signature;
}

/**
 * The `trade` params fields of `/submit` endpoint payload. The fields are
 * destructured before usage, from which the trade object may be represented as
 * `params.trade.trade` (params.{trade params}.{trade object}), but is not accessed
 * beyond the destructuring.
 */
export interface MetatransactionTradeParams {
    type: GaslessTypes.MetaTransaction;
    trade: MetaTransaction;
    signature: Signature;
}

export interface MetatransactionV2TradeParams {
    type: GaslessTypes.MetaTransactionV2;
    trade: MetaTransaction; // TODO: upgrade to v2
    signature: Signature;
}

export interface OtcOrderSubmitRfqmSignedQuoteResponse {
    type: GaslessTypes.OtcOrder;
    orderHash: string;
}

export interface SubmitRfqmSignedQuoteWithApprovalResponse {
    type: GaslessTypes.OtcOrder;
    orderHash: string;
}

export interface SubmitMetaTransactionSignedQuoteResponse {
    type: GaslessTypes.MetaTransaction;
    // Returns hash as `metaTransactionHash` for zero-g, and `tradeHash` for tx-relay.
    metaTransactionHash?: string;
    tradeHash?: string;
}

export interface SubmitMetaTransactionV2SignedQuoteResponse {
    type: GaslessTypes.MetaTransactionV2;
    tradeHash: string;
}

/**
 * `/status` endpoint response for Gasless services
 */
export interface TransactionDetails {
    hash: string;
    timestamp: number /* unix ms */;
}

export type StatusResponse = {
    transactions: TransactionDetails[];
    approvalTransactions?: TransactionDetails[];
} & ({ status: 'pending' | 'submitted' | 'succeeded' | 'confirmed' } | { status: 'failed'; reason?: JobFailureReason });

/**
 * Result type used by the cleanup jobs functionality of the
 * rfq admin service
 */
export interface CleanupJobsResponse {
    // Jobs successfuly cleaned up by `cleanupJobsAsync`
    modifiedJobs: string[];
    // Jobs that could not be cleaned up by `cleanupJobsAsync`. This includes
    // jobs that could not be found, jobs too close to expiration, or jobs
    // with non-pending statuses.
    unmodifiedJobs: string[];
}

/**
 * Base interface for quote context, which includes input query parameters, derived
 * variables, and configuration information.
 */
interface QuoteContextBase {
    workflow: 'rfqm' | 'rfqt' | 'gasless-rfqt';
    chainId: number;
    isFirm: boolean;
    takerAmount?: BigNumber;
    makerAmount?: BigNumber;
    takerToken: string;
    makerToken: string;
    originalMakerToken: string;
    takerTokenDecimals: number;
    makerTokenDecimals: number;
    integrator: Integrator;
    affiliateAddress?: string;
    isUnwrap: boolean;
    isSelling: boolean;
    assetFillAmount: BigNumber;
    feeModelVersion: FeeModelVersion;
    volumeUSD?: BigNumber; // an estimate of the volume of the asset in USD
}

/**
 * Context for indicative quote
 */
export interface IndicativeQuoteContext extends QuoteContextBase {
    isFirm: false;
    trader?: string;
    takerAddress?: string;
    txOrigin?: string;
}

/**
 * Context for firm quote
 */
export interface FirmQuoteContext extends QuoteContextBase {
    isFirm: true;
    trader: string;
    takerAddress: string;
    txOrigin: string;
    bucket?: number;
}

export type QuoteContext = IndicativeQuoteContext | FirmQuoteContext;
