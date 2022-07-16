import { OtcOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { Integrator } from '../config';
import { EIP712Context } from '../types';

export enum RfqmTypes {
    MetaTransaction = 'metatransaction',
    OtcOrder = 'otc',
}

export enum GaslessApprovalTypes {
    ExecuteMetaTransaction = 'executeMetaTransaction::approve',
    Permit = 'permit',
    DaiPermit = 'daiPermit',
}

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
    type: RfqmTypes.OtcOrder;
    order: OtcOrder;
    orderHash: string;
    approval?: ApprovalResponse;
}

export interface ApprovalResponse {
    isRequired: boolean;
    isGaslessAvailable?: boolean;
    type?: GaslessApprovalTypes;
    eip712?: EIP712Context;
}

export interface OtcOrderSubmitRfqmSignedQuoteParams {
    type: RfqmTypes.OtcOrder;
    order: OtcOrder;
    signature: Signature;
}

export interface OtcOrderSubmitRfqmSignedQuoteResponse {
    type: RfqmTypes.OtcOrder;
    orderHash: string;
}

interface SubmitApprovalParams {
    type: GaslessApprovalTypes;
    eip712: EIP712Context;
    signature: Signature;
}

export interface SubmitRfqmSignedQuoteWithApprovalParams {
    approval?: SubmitApprovalParams;
    trade: OtcOrderSubmitRfqmSignedQuoteParams;
}

export interface SubmitRfqmSignedQuoteWithApprovalResponse {
    type: RfqmTypes.OtcOrder;
    orderHash: string;
}

export interface StatusResponse {
    status: 'pending' | 'submitted' | 'failed' | 'succeeded' | 'confirmed';
    // For pending, expect no transactions. For successful transactions, expect just the mined transaction.
    transactions: { hash: string; timestamp: number /* unix ms */ }[];
}

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
    feeModelVersion: number;
}

/**
 * Context for indicative quote
 */
interface IndicativeQuoteContext extends QuoteContextBase {
    isFirm: false;
    takerAddress?: string;
}

/**
 * Context for firm quote
 */
interface FirmQuoteContext extends QuoteContextBase {
    isFirm: true;
    takerAddress: string;
}

export type QuoteContext = IndicativeQuoteContext | FirmQuoteContext;
