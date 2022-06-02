import { SupportedProvider } from '@0x/subproviders';
import { EIP712TypedData } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Signature, SignatureType } from './signature_utils';
declare const COMMON_ORDER_DEFAULT_VALUES: {
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    chainId: number;
    verifyingContract: string;
};
declare const LIMIT_ORDER_DEFAULT_VALUES: {
    takerTokenFeeAmount: BigNumber;
    sender: string;
    feeRecipient: string;
    expiry: BigNumber;
    pool: string;
    salt: BigNumber;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    chainId: number;
    verifyingContract: string;
};
declare const RFQ_ORDER_DEFAULT_VALUES: {
    txOrigin: string;
    expiry: BigNumber;
    pool: string;
    salt: BigNumber;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    chainId: number;
    verifyingContract: string;
};
declare const OTC_ORDER_DEFAULT_VALUES: {
    txOrigin: string;
    expiryAndNonce: BigNumber;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    chainId: number;
    verifyingContract: string;
};
declare const BRIDGE_ORDER_DEFAULT_VALUES: {
    source: BigNumber;
    takerTokenAmount: BigNumber;
    makerTokenAmount: BigNumber;
    bridgeData: string;
};
export declare type CommonOrderFields = typeof COMMON_ORDER_DEFAULT_VALUES;
export declare type LimitOrderFields = typeof LIMIT_ORDER_DEFAULT_VALUES;
export declare type RfqOrderFields = typeof RFQ_ORDER_DEFAULT_VALUES;
export declare type OtcOrderFields = typeof OTC_ORDER_DEFAULT_VALUES;
export declare type BridgeOrderFields = typeof BRIDGE_ORDER_DEFAULT_VALUES;
export declare type NativeOrder = RfqOrder | LimitOrder;
export declare enum OrderStatus {
    Invalid = 0,
    Fillable = 1,
    Filled = 2,
    Cancelled = 3,
    Expired = 4
}
export interface OrderInfo {
    status: OrderStatus;
    orderHash: string;
    takerTokenFilledAmount: BigNumber;
}
export interface OtcOrderInfo {
    status: OrderStatus;
    orderHash: string;
}
export declare abstract class OrderBase {
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    chainId: number;
    verifyingContract: string;
    protected constructor(fields?: Partial<CommonOrderFields>);
    abstract getStructHash(): string;
    abstract getEIP712TypedData(): EIP712TypedData;
    abstract willExpire(secondsFromNow: number): boolean;
    getHash(): string;
    getSignatureWithProviderAsync(provider: SupportedProvider, type?: SignatureType, signer?: string): Promise<Signature>;
    getSignatureWithKey(key: string, type?: SignatureType): Signature;
}
export declare class LimitOrder extends OrderBase {
    static readonly STRUCT_NAME = "LimitOrder";
    static readonly STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly TYPE_HASH: string;
    takerTokenFeeAmount: BigNumber;
    sender: string;
    feeRecipient: string;
    pool: string;
    salt: BigNumber;
    expiry: BigNumber;
    constructor(fields?: Partial<LimitOrderFields>);
    clone(fields?: Partial<LimitOrderFields>): LimitOrder;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
    willExpire(secondsFromNow?: number): boolean;
}
export declare class RfqOrder extends OrderBase {
    static readonly STRUCT_NAME = "RfqOrder";
    static readonly STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly TYPE_HASH: string;
    txOrigin: string;
    pool: string;
    salt: BigNumber;
    expiry: BigNumber;
    constructor(fields?: Partial<RfqOrderFields>);
    clone(fields?: Partial<RfqOrderFields>): RfqOrder;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
    willExpire(secondsFromNow?: number): boolean;
}
export declare class OtcOrder extends OrderBase {
    static readonly STRUCT_NAME = "OtcOrder";
    static readonly STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly TYPE_HASH: string;
    static readonly MAX_EXPIRY: BigNumber;
    static readonly MAX_NONCE_BUCKET: BigNumber;
    static readonly MAX_NONCE_VALUE: BigNumber;
    txOrigin: string;
    expiryAndNonce: BigNumber;
    expiry: BigNumber;
    nonceBucket: BigNumber;
    nonce: BigNumber;
    static parseExpiryAndNonce(expiryAndNonce: BigNumber): {
        expiry: BigNumber;
        nonceBucket: BigNumber;
        nonce: BigNumber;
    };
    static encodeExpiryAndNonce(expiry: BigNumber, nonceBucket: BigNumber, nonce: BigNumber): BigNumber;
    constructor(fields?: Partial<OtcOrderFields>);
    clone(fields?: Partial<OtcOrder>): OtcOrder;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
    willExpire(secondsFromNow?: number): boolean;
}
export {};
//# sourceMappingURL=orders.d.ts.map