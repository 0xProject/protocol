import { MetaTransaction, OtcOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { Integrator } from '../config';
import { Fee } from '../quote-server/types';
import { JobFailureReason } from '../entities/types';
import {
    ExecuteMetaTransactionEip712Context,
    FeeModelVersion,
    GaslessApprovalTypes,
    PermitEip712Context,
} from '../core/types';

export enum RfqmTypes {
    MetaTransaction = 'metatransaction',
    OtcOrder = 'otc',
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
    slippagePercentage?: BigNumber;
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

/**
 * Response from the Gasless Swap Service `/quote` endpoint.
 *
 * `approval` will be populated if `checkApproval` is `true`
 * in the parameters, the token supports gasless approval,
 * and no allowance already exists.
 */
export interface MetaTransactionQuoteResponse extends BaseRfqmQuoteResponse {
    type: RfqmTypes.MetaTransaction;
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
    type: RfqmTypes.OtcOrder;
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
    kind: RfqmTypes.MetaTransaction;
    trade: { metaTransaction: MetaTransaction; signature: Signature; type: RfqmTypes.MetaTransaction };
}

export interface OtcOrderSubmitRfqmSignedQuoteResponse {
    type: RfqmTypes.OtcOrder;
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
    kind: RfqmTypes.OtcOrder;
    trade: OtcOrderSubmitRfqmSignedQuoteParams;
}

export interface SubmitRfqmSignedQuoteWithApprovalResponse {
    type: RfqmTypes.OtcOrder;
    orderHash: string;
}

export interface SubmitMetaTransactionSignedQuoteResponse {
    type: RfqmTypes.MetaTransaction;
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
    workflow: 'rfqm' | 'rfqt';
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
    takerAddress?: string;
    txOrigin?: string;
}

/**
 * Context for firm quote
 */
export interface FirmQuoteContext extends QuoteContextBase {
    isFirm: true;
    takerAddress: string;
    txOrigin: string;
}

export type QuoteContext = IndicativeQuoteContext | FirmQuoteContext;

/**
 * (Deprecated) base interface for FeeDetails type.
 */
interface FeeDetailsBaseDeprecated {
    /**
     * `kind` is used to mark the type of FeeDetails.
     */
    kind: 'gasOnly' | 'default' | 'margin';
    /**
     * Version number of fee model which determines the fee amount to charge MMs.
     *   * Version 0 includes estimated gas cost only.
     *   * Version 1 charge an additional bps as 0x fee, based on trade size, on top of gas.
     *   * Version 2 charge 0x fee based on detected margin of RFQm with AMMs.
     * While Verion 0 will use `gasOnly` FeeDetails, and Version 1 will use `default`, Version 2
     * will use all three of them: `gasOnly` for margin detection, `margin` if margin detection
     * succeeded, and `default` if margin detection failed.
     */
    feeModelVersion: FeeModelVersion;
    gasFeeAmount: BigNumber;
    gasPrice: BigNumber;
}

/**
 * (Deprecated) interface for `margin` FeeDetails type. In this case the Fee is
 * calculated using margin based method
 */
export interface MarginBasedFeeDetailsDeprecated extends FeeDetailsBaseDeprecated {
    kind: 'margin';
    margin: BigNumber;
    marginRakeRatio: number;
    zeroExFeeAmount: BigNumber;
    /**
     * All token prices are from TokenPriceOracle. `null` value means the oracle
     * failed to provide price, or we don't need to query it. For example, the token
     * is not involved in fee calculation, or bps for given pair is 0.
     */
    feeTokenBaseUnitPriceUsd: BigNumber | null;
    takerTokenBaseUnitPriceUsd: BigNumber | null;
    makerTokenBaseUnitPriceUsd: BigNumber | null;
}

/**
 * (Deprecated) interface for `default` FeeDetails type. In this case the Fee is
 * calculated using default method, based on trade size and bps of underlying
 * pairs.
 */
export interface DefaultFeeDetailsDeprecated extends FeeDetailsBaseDeprecated {
    kind: 'default';
    tradeSizeBps: number;
    zeroExFeeAmount: BigNumber;
    feeTokenBaseUnitPriceUsd: BigNumber | null;
    takerTokenBaseUnitPriceUsd: BigNumber | null;
    makerTokenBaseUnitPriceUsd: BigNumber | null;
}

/**
 * (Deprecated) interface for `gasOnly` FeeDetails type. Only gas related information
 * is included.
 */
export interface GasOnlyFeeDetailsDeprecated extends FeeDetailsBaseDeprecated {
    kind: 'gasOnly';
}

interface GasFeeBreakdownDetails {
    gasPrice: BigNumber;
    estimatedGas: BigNumber;
}

interface VolumeBasedFeeBreakdownDetails {
    kind: 'volume';
    tradeSizeBps: number;
}

interface PriceImprovementBasedFeeBreakdownDetails {
    kind: 'price_improvement';
    priceImprovement: BigNumber;
    rakeRatio: number;
}

export interface FeeBreakdown {
    gas?: {
        amount: BigNumber;
        details: GasFeeBreakdownDetails;
    };
    zeroEx?: {
        amount: BigNumber;
        details: VolumeBasedFeeBreakdownDetails | PriceImprovementBasedFeeBreakdownDetails;
    };
}

export interface ConversionRates {
    nativeTokenBaseUnitPriceUsd: BigNumber | null;
    feeTokenBaseUnitPriceUsd: BigNumber | null;
    takerTokenBaseUnitPriceUsd: BigNumber | null;
    makerTokenBaseUnitPriceUsd: BigNumber | null;
}

/**
 * Extends Fee data schema to include a details session, which could be one
 * of `gasOnly`, `default` or `margin` type, depending on the approach used
 * to calculate the Fee.
 */
export interface FeeWithDetails extends Fee {
    details: GasOnlyFeeDetailsDeprecated | DefaultFeeDetailsDeprecated | MarginBasedFeeDetailsDeprecated;
    breakdown: FeeBreakdown;
    conversionRates: ConversionRates;
}
