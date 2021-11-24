import { MetaTransaction, OtcOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { Integrator } from '../config';

export enum RfqmTypes {
    MetaTransaction = 'metatransaction',
    OtcOrder = 'otc',
}

export interface FetchIndicativeQuoteParams {
    integrator: Integrator;
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
    integrator: Integrator;
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
    integrator: Integrator;
    metaTransaction: MetaTransaction;
    signature: Signature;
    type: RfqmTypes.MetaTransaction;
}

export interface MetaTransactionSubmitRfqmSignedQuoteResponse {
    type: RfqmTypes.MetaTransaction;
    metaTransactionHash: string;
    orderHash: string;
}
export interface OtcOrderSubmitRfqmSignedQuoteParams {
    integrator: Integrator;
    order: OtcOrder;
    signature: Signature;
    type: RfqmTypes.OtcOrder;
}

export interface OtcOrderSubmitRfqmSignedQuoteResponse {
    type: RfqmTypes.OtcOrder;
    orderHash: string;
}

export interface MetaTransactionRfqmQuoteResponse extends BaseRfqmQuoteResponse {
    type: RfqmTypes.MetaTransaction;
    metaTransaction: MetaTransaction;
    metaTransactionHash: string;
    orderHash: string;
}

export interface OtcOrderRfqmQuoteResponse extends BaseRfqmQuoteResponse {
    type: RfqmTypes.OtcOrder;
    order: OtcOrder;
    orderHash: string;
}

export type FetchFirmQuoteResponse = MetaTransactionRfqmQuoteResponse | OtcOrderRfqmQuoteResponse;
export type SubmitRfqmSignedQuoteParams =
    | MetaTransactionSubmitRfqmSignedQuoteParams
    | OtcOrderSubmitRfqmSignedQuoteParams;
export type SubmitRfqmSignedQuoteResponse =
    | MetaTransactionSubmitRfqmSignedQuoteResponse
    | OtcOrderSubmitRfqmSignedQuoteResponse;

export interface StatusResponse {
    status: 'pending' | 'submitted' | 'failed' | 'succeeded' | 'confirmed';
    // For pending, expect no transactions. For successful transactions, expect just the mined transaction.
    transactions: { hash: string; timestamp: number /* unix ms */ }[];
}
