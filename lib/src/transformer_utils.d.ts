import { AbiEncoder, BigNumber } from '@0x/utils';
import { LimitOrderFields, RfqOrderFields, OtcOrderFields } from './orders';
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
    Rfq = 2,
    Otc = 3
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
 * Identifies the DEX protocol used to fill a bridge order.
 */
export declare enum BridgeProtocol {
    Unknown = 0,
    Curve = 1,
    UniswapV2 = 2,
    Uniswap = 3,
    Balancer = 4,
    Mooniswap = 5,
    MStable = 6,
    Shell = 7,
    Dodo = 8,
    DodoV2 = 9,
    CryptoCom = 10,
    Bancor = 11,
    Nerve = 12,
    MakerPsm = 13,
    BalancerV2 = 14,
    UniswapV3 = 15,
    KyberDmm = 16,
    CurveV2 = 17,
    Lido = 18,
    Clipper = 19,
    AaveV2 = 20,
    Compound = 21,
    BalancerV2Batch = 22,
    GMX = 23,
    Platypus = 24
}
/**
 * `FillQuoteTransformer.BridgeOrder`
 */
export interface FillQuoteTransformerBridgeOrder {
    source: string;
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
 * `FillQuoteTransformer.OtcOrderInfo`
 */
export declare type FillQuoteTransformerOtcOrderInfo = FillQuoteTransformerNativeOrderInfo<OtcOrderFields>;
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
 * ABI encoder for `affiliateFeetransformer.TransformData`
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
/**
 * ABI encoder for `PositiveSlippageFeeTransformer.TransformData`
 */
export declare const positiveSlippageFeeTransformerDataEncoder: AbiEncoder.DataType;
/**
 * `PositiveSlippageFeeTransformer.TransformData`
 */
export interface PositiveSlippageFeeTransformerData {
    token: string;
    bestCaseAmount: BigNumber;
    recipient: string;
}
/**
 * ABI-encode a `PositiveSlippageFeeTransformer.TransformData` type.
 */
export declare function encodePositiveSlippageFeeTransformerData(data: PositiveSlippageFeeTransformerData): string;
/**
 * ABI-decode a `PositiveSlippageFeeTransformer.TransformData` type.
 */
export declare function decodePositiveSlippageFeeTransformerData(encoded: string): PositiveSlippageFeeTransformerData;
/**
 * Packs a bridge protocol ID and an ASCII DEX name into a single byte32.
 */
export declare function encodeBridgeSourceId(protocol: BridgeProtocol, name: string): string;
export {};
//# sourceMappingURL=transformer_utils.d.ts.map