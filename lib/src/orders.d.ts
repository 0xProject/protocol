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
    expiry: BigNumber;
    salt: BigNumber;
    chainId: number;
    verifyingContract: string;
};
declare const LIMIT_ORDER_DEFAULT_VALUES: {
    pool: string;
    takerTokenFeeAmount: BigNumber;
    sender: string;
    feeRecipient: string;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    expiry: BigNumber;
    salt: BigNumber;
    chainId: number;
    verifyingContract: string;
};
declare const RFQ_ORDER_DEFAULT_VALUES: {
    pool: string;
    txOrigin: string;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    expiry: BigNumber;
    salt: BigNumber;
    chainId: number;
    verifyingContract: string;
};
declare const TAKERSIGNED_RFQ_ORDER_DEFAULT_VALUES: {
    txOrigin: string;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    expiry: BigNumber;
    salt: BigNumber;
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
export declare type TakerSignedRfqOrderFields = typeof TAKERSIGNED_RFQ_ORDER_DEFAULT_VALUES;
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
export declare abstract class OrderBase {
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    maker: string;
    taker: string;
    expiry: BigNumber;
    salt: BigNumber;
    chainId: number;
    verifyingContract: string;
    protected constructor(fields?: Partial<CommonOrderFields>);
    abstract getStructHash(): string;
    abstract getEIP712TypedData(): EIP712TypedData;
    getHash(): string;
    willExpire(secondsFromNow?: number): boolean;
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
    pool: string;
    takerTokenFeeAmount: BigNumber;
    sender: string;
    feeRecipient: string;
    constructor(fields?: Partial<LimitOrderFields>);
    clone(fields?: Partial<LimitOrderFields>): LimitOrder;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
}
export declare class RfqOrder extends OrderBase {
    static readonly STRUCT_NAME = "RfqOrder";
    static readonly STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly TYPE_HASH: string;
    pool: string;
    txOrigin: string;
    constructor(fields?: Partial<RfqOrderFields>);
    clone(fields?: Partial<RfqOrderFields>): RfqOrder;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
}
export declare class TakerSignedRfqOrder extends OrderBase {
    static readonly STRUCT_NAME = "TakerSignedRfqOrder";
    static readonly STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly TYPE_HASH: string;
    txOrigin: string;
    constructor(fields?: Partial<TakerSignedRfqOrderFields>);
    clone(fields?: Partial<TakerSignedRfqOrder>): TakerSignedRfqOrder;
    getStructHash(): string;
    getEIP712TypedData(): EIP712TypedData;
}
export {};
//# sourceMappingURL=orders.d.ts.map