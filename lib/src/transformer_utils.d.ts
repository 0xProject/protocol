import { AbiEncoder, BigNumber } from '@0x/utils';
import { LimitOrderFields, RfqOrderFields } from './orders';
import { Signature } from './signature_utils';
/**
 * ABI encoder for `FillQuoteTransformer.TransformData`
 */
export declare const fillQuoteTransformerDataEncoder: AbiEncoder.DataType;
/**
 * Market operation for `FillQuoteTransformerData`.
 */
export declare enum FillQuoteTransformerSide {
    Sell = 0,
    Buy = 1
}
/**
 * `FillQuoteTransformer.OrderType`
 */
export declare enum FillQuoteTransformerOrderType {
    Bridge = 0,
    Limit = 1,
    Rfq = 2
}
/**
 * `FillQuoteTransformer.TransformData`
 */
export interface FillQuoteTransformerData {
    side: FillQuoteTransformerSide;
    sellToken: string;
    buyToken: string;
    bridgeOrders: FillQuoteTransformerBridgeOrder[];
    limitOrders: FillQuoteTransformerLimitOrderInfo[];
    rfqOrders: FillQuoteTransformerRfqOrderInfo[];
    fillSequence: FillQuoteTransformerOrderType[];
    fillAmount: BigNumber;
    refundReceiver: string;
}
/**
 * Identifies the DEX type of a bridge order.
 */
export declare enum BridgeSource {
    Balancer = 0,
    Bancor = 1,
    CoFiX = 2,
    Curve = 3,
    Cream = 4,
    CryptoCom = 5,
    Dodo = 6,
    Kyber = 7,
    LiquidityProvider = 8,
    Mooniswap = 9,
    MStable = 10,
    Oasis = 11,
    Shell = 12,
    Snowswap = 13,
    Sushiswap = 14,
    Swerve = 15,
    Uniswap = 16,
    UniswapV2 = 17
}
/**
 * `FillQuoteTransformer.BridgeOrder`
 */
export interface FillQuoteTransformerBridgeOrder {
    source: BridgeSource;
    takerTokenAmount: BigNumber;
    makerTokenAmount: BigNumber;
    bridgeData: string;
}
/**
 * Represents either `FillQuoteTransformer.LimitOrderInfo`
 * or `FillQuoteTransformer.RfqOrderInfo`
 */
interface FillQuoteTransformerNativeOrderInfo<T> {
    order: T;
    signature: Signature;
    maxTakerTokenFillAmount: BigNumber;
}
/**
 * `FillQuoteTransformer.LimitOrderInfo`
 */
export declare type FillQuoteTransformerLimitOrderInfo = FillQuoteTransformerNativeOrderInfo<LimitOrderFields>;
/**
 * `FillQuoteTransformer.RfqOrderInfo`
 */
export declare type FillQuoteTransformerRfqOrderInfo = FillQuoteTransformerNativeOrderInfo<RfqOrderFields>;
/**
 * ABI-encode a `FillQuoteTransformer.TransformData` type.
 */
export declare function encodeFillQuoteTransformerData(data: FillQuoteTransformerData): string;
/**
 * ABI-decode a `FillQuoteTransformer.TransformData` type.
 */
export declare function decodeFillQuoteTransformerData(encoded: string): FillQuoteTransformerData;
/**
 * ABI encoder for `WethTransformer.TransformData`
 */
export declare const wethTransformerDataEncoder: AbiEncoder.DataType;
/**
 * `WethTransformer.TransformData`
 */
export interface WethTransformerData {
    token: string;
    amount: BigNumber;
}
/**
 * ABI-encode a `WethTransformer.TransformData` type.
 */
export declare function encodeWethTransformerData(data: WethTransformerData): string;
/**
 * ABI-decode a `WethTransformer.TransformData` type.
 */
export declare function decodeWethTransformerData(encoded: string): WethTransformerData;
/**
 * ABI encoder for `PayTakerTransformer.TransformData`
 */
export declare const payTakerTransformerDataEncoder: AbiEncoder.DataType;
/**
 * `PayTakerTransformer.TransformData`
 */
export interface PayTakerTransformerData {
    tokens: string[];
    amounts: BigNumber[];
}
/**
 * ABI-encode a `PayTakerTransformer.TransformData` type.
 */
export declare function encodePayTakerTransformerData(data: PayTakerTransformerData): string;
/**
 * ABI-decode a `PayTakerTransformer.TransformData` type.
 */
export declare function decodePayTakerTransformerData(encoded: string): PayTakerTransformerData;
/**
 * ABI encoder for `PayTakerTransformer.TransformData`
 */
export declare const affiliateFeeTransformerDataEncoder: AbiEncoder.DataType;
/**
 * `AffiliateFeeTransformer.TransformData`
 */
export interface AffiliateFeeTransformerData {
    fees: Array<{
        token: string;
        amount: BigNumber;
        recipient: string;
    }>;
}
/**
 * ABI-encode a `AffiliateFeeTransformer.TransformData` type.
 */
export declare function encodeAffiliateFeeTransformerData(data: AffiliateFeeTransformerData): string;
/**
 * ABI-decode a `AffiliateFeeTransformer.TransformData` type.
 */
export declare function decodeAffiliateFeeTransformerData(encoded: string): AffiliateFeeTransformerData;
/**
 * Find the nonce for a transformer given its deployer.
 * If `deployer` is the null address, zero will always be returned.
 */
export declare function findTransformerNonce(transformer: string, deployer?: string, maxGuesses?: number): number;
/**
 * Compute the deployed address for a transformer given a deployer and nonce.
 */
export declare function getTransformerAddress(deployer: string, nonce: number): string;
export {};
//# sourceMappingURL=transformer_utils.d.ts.map