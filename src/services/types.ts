import { MetaTransaction, OtcOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { Integrator } from '../config';
import { JobFailureReason } from '../entities/types';
import {
    ExecuteMetaTransactionEip712Context,
    FeeModelVersion,
    GaslessApprovalTypes,
    GaslessTypes,
    PermitEip712Context,
} from '../core/types';

export interface FetchIndicativeQuoteParams extends FetchQuoteParamsBase {
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

export interface FetchFirmQuoteParams extends FetchQuoteParamsBase {
    takerAddress: string;
    checkApproval: boolean;
}

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
    feeType?: 'volume';
    feeSellTokenPercentage?: BigNumber;
    feeRecipient?: string;
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
export interface MetaTransactionQuoteResponse extends BaseRfqmQuoteResponse {
    type: GaslessTypes.MetaTransaction;
    metaTransaction: MetaTransaction;
    metaTransactionHash: string;
    approval?: ApprovalResponse;
}

export interface ApprovalResponse {
    isRequired: boolean;
    isGaslessAvailable?: boolean;
    type?: GaslessApprovalTypes;
    eip712?: ExecuteMetaTransactionEip712Context | PermitEip712Context;
}

export interface OtcOrderSubmitRfqmSignedQuoteParams {
    type: GaslessTypes.OtcOrder;
    order: OtcOrder;
    signature: Signature;
}

/**
 * Payload for the Gasless Swap `/submit` endpoint in the
 * metatransaction flow
 */
export interface SubmitMetaTransactionSignedQuoteParams<
    T extends ExecuteMetaTransactionEip712Context | PermitEip712Context,
> {
    approval?: SubmitApprovalParams<T>;
    // Used to distinguish between `SubmitRfqmSignedQuoteWithApprovalParams` during type check.
    // Note that this information is in `trade`, but TypeScript does not narrow types based
    // on nested values.
    kind: GaslessTypes.MetaTransaction;
    trade: { metaTransaction: MetaTransaction; signature: Signature; type: GaslessTypes.MetaTransaction };
}

export interface OtcOrderSubmitRfqmSignedQuoteResponse {
    type: GaslessTypes.OtcOrder;
    orderHash: string;
}

export interface SubmitApprovalParams<T extends ExecuteMetaTransactionEip712Context | PermitEip712Context> {
    type: T extends ExecuteMetaTransactionEip712Context
        ? GaslessApprovalTypes.ExecuteMetaTransaction
        : GaslessApprovalTypes.Permit;
    eip712: T;
    signature: Signature;
}

export interface SubmitRfqmSignedQuoteWithApprovalParams<
    T extends ExecuteMetaTransactionEip712Context | PermitEip712Context,
> {
    approval?: SubmitApprovalParams<T>;
    // Used to distinguish between `SubmitMetaTransactionSignedQuoteParams` during type check.
    // Note that this information is in `trade`, but TypeScript does not narrow types based
    // on nested values.
    kind: GaslessTypes.OtcOrder;
    trade: OtcOrderSubmitRfqmSignedQuoteParams;
}

export interface SubmitRfqmSignedQuoteWithApprovalResponse {
    type: GaslessTypes.OtcOrder;
    orderHash: string;
}

export interface SubmitMetaTransactionSignedQuoteResponse {
    type: GaslessTypes.MetaTransaction;
    metaTransactionHash: string;
}

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
}

/**
 * Context for indicative quote
 */
interface IndicativeQuoteContext extends QuoteContextBase {
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
}

export type QuoteContext = IndicativeQuoteContext | FirmQuoteContext;
