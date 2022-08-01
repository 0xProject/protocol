import { OtcOrder, Signature } from '@0x/protocol-utils';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';

import { EXECUTE_META_TRANSACTION_EIP_712_TYPES, PERMIT_EIP_712_TYPES } from './constants';
import { GaslessApprovalTypes } from './services/types';

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
    }[Keys];

export interface IndicativeQuote {
    maker: string;
    makerUri: string;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    expiry: BigNumber;
}

/**
 * FirmOtcQuote is a quote for an OtcOrder. The makerSignature may not be present if the maker gets
 * the "last look" (RFQm).
 */
export interface FirmOtcQuote {
    kind: 'otc';
    makerUri: string;
    order: OtcOrder;
    makerSignature?: Signature;
}

/**
 * Approval is an object that encapsulates the EIP-712 context that will eventually be signed by takers
 * for gasless approvals. There are multiple flavors of these approval objects, which can be distinguished
 * by their `kind`
 */
export type Approval = ExecuteMetaTransactionApproval | PermitApproval;
export interface ExecuteMetaTransactionApproval {
    kind: GaslessApprovalTypes.ExecuteMetaTransaction;
    eip712: {
        types: typeof EXECUTE_META_TRANSACTION_EIP_712_TYPES;
        primaryType: 'MetaTransaction';
        domain: EIP712Domain;
        message: {
            nonce: number;
            from: string;
            functionSignature: string;
        };
    };
}

export interface PermitApproval {
    kind: GaslessApprovalTypes.Permit;
    eip712: {
        types: typeof PERMIT_EIP_712_TYPES;
        primaryType: 'Permit';
        domain: EIP712Domain;
        message: {
            owner: string;
            spender: string;
            value: string;
            nonce: number;
            deadline: string;
        };
    };
}

export interface EIP712Context {
    types: Record<string, EIP712DataField[]>;
    primaryType: string;
    domain: EIP712Domain;
    message: Record<string, any>;
}

export interface EIP712Domain {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    salt?: string;
}

export interface EIP712DataField {
    name: string;
    type: string;
}

/**
 * Parameters for the request from 0x API
 * to 0x RFQ api for the RFQt v2 `prices` endpoint
 */
export interface RfqtV2PricesApiRequest {
    assetFillAmount: BigNumber;
    makerToken: string;
    marketOperation: MarketOperation;
    takerToken: string; // expect this to be NULL_ADDRESS
    takerAddress: string;
    txOrigin: string; // expect this to be the taker address
    intentOnFilling: boolean;
    integratorId: string;
}

/**
 * Response format for the response to 0x API
 * from 0x RFQ API for the RFQt v2 `prices` endpoint
 */
export type RfqtV2PricesApiResponse = {
    expiry: BigNumber;
    makerAddress: string;
    makerAmount: BigNumber;
    makerId: string;
    makerToken: string;
    makerUri: string;
    takerAmount: BigNumber;
    takerToken: string;
}[];

/**
 * Response format for the response to 0x API
 * from 0x RFQ API for the RFQt v2 `quotes` endpoint
 */
export type RfqtV2QuotesApiResponse = {
    fillableMakerAmount: BigNumber;
    fillableTakerAmount: BigNumber;
    fillableTakerFeeAmount: BigNumber;
    makerId: string;
    makerUri: string;
    order: OtcOrder;
    signature: Signature;
}[];

export type QuoteServerPriceParams = RequireOnlyOne<
    {
        buyAmountBaseUnits?: string;
        buyTokenAddress: string;
        chainId?: string; // TODO - make this required after the rollout
        comparisonPrice?: string;
        feeAmount?: string;
        feeToken?: string;
        feeType?: string;
        isLastLook?: string;
        integratorId?: string;
        nonce?: string;
        nonceBucket?: string;
        protocolVersion?: string;
        sellAmountBaseUnits?: string;
        sellTokenAddress: string;
        takerAddress: string;
        txOrigin?: string;
    },
    'sellAmountBaseUnits' | 'buyAmountBaseUnits'
>;
export interface TokenMetadata {
    symbol: string;
    decimals: number;
    tokenAddress: string;
}

export enum OrderEventEndState {
    // The order was successfully validated and added to the Mesh node. The order is now being watched and any changes to
    // the fillability will result in subsequent order events.
    Added = 'ADDED',
    // The order was filled for a partial amount. The order is still fillable up to the fillableTakerAssetAmount.
    Filled = 'FILLED',
    // The order was fully filled and its remaining fillableTakerAssetAmount is 0. The order is no longer fillable.
    FullyFilled = 'FULLY_FILLED',
    // The order was cancelled and is no longer fillable.
    Cancelled = 'CANCELLED',
    // The order expired and is no longer fillable.
    Expired = 'EXPIRED',
    // Catch all 'Invalid' state when invalid orders are submitted.
    Invalid = 'INVALID',
    // The order was previously expired, but due to a block re-org it is no longer considered expired (should be rare).
    Unexpired = 'UNEXPIRED',
    // The order has become unfunded and is no longer fillable. This can happen if the maker makes a transfer or changes their allowance.
    Unfunded = 'UNFUNDED',
    // The fillability of the order has increased. This can happen if a previously processed fill event gets reverted due to a block re-org,
    // or if a maker makes a transfer or changes their allowance.
    FillabilityIncreased = 'FILLABILITY_INCREASED',
    // The order is potentially still valid but was removed for a different reason (e.g.
    // the database is full or the peer that sent the order was misbehaving). The order will no longer be watched
    // and no further events for this order will be emitted. In some cases, the order may be re-added in the
    // future.
    StoppedWatching = 'STOPPED_WATCHING',
}

// tslint:disable-line:max-file-line-count
