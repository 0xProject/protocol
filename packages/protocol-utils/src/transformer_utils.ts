import { AbiEncoder, BigNumber, hexUtils, NULL_ADDRESS } from '@0x/utils';
import * as ethjs from 'ethereumjs-util';

import { LimitOrder, LimitOrderFields, RfqOrder, RfqOrderFields } from './orders';
import { Signature, SIGNATURE_ABI } from './signature_utils';

const BRIDGE_ORDER_ABI_COMPONENTS = [
    { name: 'source', type: 'bytes32' },
    { name: 'takerTokenAmount', type: 'uint256' },
    { name: 'makerTokenAmount', type: 'uint256' },
    { name: 'bridgeData', type: 'bytes' },
];

const LIMIT_ORDER_INFO_ABI_COMPONENTS = [
    {
        name: 'order',
        type: 'tuple',
        components: LimitOrder.STRUCT_ABI,
    },
    {
        name: 'signature',
        type: 'tuple',
        components: SIGNATURE_ABI,
    },
    { name: 'maxTakerTokenFillAmount', type: 'uint256' },
];

const RFQ_ORDER_INFO_ABI_COMPONENTS = [
    {
        name: 'order',
        type: 'tuple',
        components: RfqOrder.STRUCT_ABI,
    },
    {
        name: 'signature',
        type: 'tuple',
        components: SIGNATURE_ABI,
    },
    { name: 'maxTakerTokenFillAmount', type: 'uint256' },
];

/**
 * ABI encoder for `FillQuoteTransformer.TransformData`
 */
export const fillQuoteTransformerDataEncoder = AbiEncoder.create([
    {
        name: 'data',
        type: 'tuple',
        components: [
            { name: 'side', type: 'uint8' },
            { name: 'sellToken', type: 'address' },
            { name: 'buyToken', type: 'address' },
            {
                name: 'bridgeOrders',
                type: 'tuple[]',
                components: BRIDGE_ORDER_ABI_COMPONENTS,
            },
            {
                name: 'limitOrders',
                type: 'tuple[]',
                components: LIMIT_ORDER_INFO_ABI_COMPONENTS,
            },
            {
                name: 'rfqOrders',
                type: 'tuple[]',
                components: RFQ_ORDER_INFO_ABI_COMPONENTS,
            },
            { name: 'fillSequence', type: 'uint8[]' },
            { name: 'fillAmount', type: 'uint256' },
            { name: 'refundReceiver', type: 'address' },
        ],
    },
]);

/**
 * Market operation for `FillQuoteTransformerData`.
 */
export enum FillQuoteTransformerSide {
    Sell,
    Buy,
}

/**
 * `FillQuoteTransformer.OrderType`
 */
export enum FillQuoteTransformerOrderType {
    Bridge,
    Limit,
    Rfq,
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

// tslint:disable: enum-naming
/**
 * Identifies the DEX protocol used to fill a bridge order.
 */
export enum BridgeProtocol {
    Unknown,
    Curve,
    UniswapV2,
    Uniswap,
    Balancer,
    Kyber,
    Mooniswap,
    MStable,
    Oasis,
    Shell,
    Dodo,
    DodoV2,
    CryptoCom,
    Bancor,
    CoFiX,
    Nerve,
    MakerPsm,
    BalancerV2,
    UniswapV3,
    KyberDmm,
    CurveV2,
    Lido,
    Clipper, // Not used: Clipper is now using PLP interface
    AaveV2,
    Compound,
}
// tslint:enable: enum-naming

/**
 * `FillQuoteTransformer.BridgeOrder`
 */
export interface FillQuoteTransformerBridgeOrder {
    // A bytes32 hex where the upper 16 bytes are an int128, right-aligned
    // protocol ID and the lower 16 bytes are a bytes16, left-aligned,
    // ASCII source name.
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
export type FillQuoteTransformerLimitOrderInfo = FillQuoteTransformerNativeOrderInfo<LimitOrderFields>;

/**
 * `FillQuoteTransformer.RfqOrderInfo`
 */
export type FillQuoteTransformerRfqOrderInfo = FillQuoteTransformerNativeOrderInfo<RfqOrderFields>;

/**
 * ABI-encode a `FillQuoteTransformer.TransformData` type.
 */
export function encodeFillQuoteTransformerData(data: FillQuoteTransformerData): string {
    return fillQuoteTransformerDataEncoder.encode([data]);
}

/**
 * ABI-decode a `FillQuoteTransformer.TransformData` type.
 */
export function decodeFillQuoteTransformerData(encoded: string): FillQuoteTransformerData {
    return fillQuoteTransformerDataEncoder.decode(encoded).data;
}

/**
 * ABI encoder for `WethTransformer.TransformData`
 */
export const wethTransformerDataEncoder = AbiEncoder.create([
    {
        name: 'data',
        type: 'tuple',
        components: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
    },
]);

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
export function encodeWethTransformerData(data: WethTransformerData): string {
    return wethTransformerDataEncoder.encode([data]);
}

/**
 * ABI-decode a `WethTransformer.TransformData` type.
 */
export function decodeWethTransformerData(encoded: string): WethTransformerData {
    return wethTransformerDataEncoder.decode(encoded).data;
}

/**
 * ABI encoder for `PayTakerTransformer.TransformData`
 */
export const payTakerTransformerDataEncoder = AbiEncoder.create([
    {
        name: 'data',
        type: 'tuple',
        components: [
            { name: 'tokens', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
        ],
    },
]);

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
export function encodePayTakerTransformerData(data: PayTakerTransformerData): string {
    return payTakerTransformerDataEncoder.encode([data]);
}

/**
 * ABI-decode a `PayTakerTransformer.TransformData` type.
 */
export function decodePayTakerTransformerData(encoded: string): PayTakerTransformerData {
    return payTakerTransformerDataEncoder.decode(encoded).data;
}

/**
 * ABI encoder for `affiliateFeetransformer.TransformData`
 */
export const affiliateFeeTransformerDataEncoder = AbiEncoder.create({
    name: 'data',
    type: 'tuple',
    components: [
        {
            name: 'fees',
            type: 'tuple[]',
            components: [
                { name: 'token', type: 'address' },
                { name: 'amount', type: 'uint256' },
                { name: 'recipient', type: 'address' },
            ],
        },
    ],
});

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
export function encodeAffiliateFeeTransformerData(data: AffiliateFeeTransformerData): string {
    return affiliateFeeTransformerDataEncoder.encode(data);
}

/**
 * ABI-decode a `AffiliateFeeTransformer.TransformData` type.
 */
export function decodeAffiliateFeeTransformerData(encoded: string): AffiliateFeeTransformerData {
    return affiliateFeeTransformerDataEncoder.decode(encoded);
}

/**
 * Find the nonce for a transformer given its deployer.
 * If `deployer` is the null address, zero will always be returned.
 */
export function findTransformerNonce(
    transformer: string,
    deployer: string = NULL_ADDRESS,
    maxGuesses: number = 1024,
): number {
    if (deployer === NULL_ADDRESS) {
        return 0;
    }
    const lowercaseTransformer = transformer.toLowerCase();
    // Try to guess the nonce.
    for (let nonce = 0; nonce < maxGuesses; ++nonce) {
        const deployedAddress = getTransformerAddress(deployer, nonce);
        if (deployedAddress === lowercaseTransformer) {
            return nonce;
        }
    }
    throw new Error(`${deployer} did not deploy ${transformer}!`);
}

/**
 * Compute the deployed address for a transformer given a deployer and nonce.
 */
export function getTransformerAddress(deployer: string, nonce: number): string {
    return ethjs.bufferToHex(
        // tslint:disable-next-line: custom-no-magic-numbers
        ethjs.rlphash([deployer, nonce] as any).slice(12),
    );
}

/**
 * ABI encoder for `PositiveSlippageFeeTransformer.TransformData`
 */
export const positiveSlippageFeeTransformerDataEncoder = AbiEncoder.create({
    name: 'data',
    type: 'tuple',
    components: [
        { name: 'token', type: 'address' },
        { name: 'bestCaseAmount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
    ],
});

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
export function encodePositiveSlippageFeeTransformerData(data: PositiveSlippageFeeTransformerData): string {
    return positiveSlippageFeeTransformerDataEncoder.encode(data);
}

/**
 * ABI-decode a `PositiveSlippageFeeTransformer.TransformData` type.
 */
export function decodePositiveSlippageFeeTransformerData(encoded: string): PositiveSlippageFeeTransformerData {
    return positiveSlippageFeeTransformerDataEncoder.decode(encoded);
}

/**
 * Packs a bridge protocol ID and an ASCII DEX name into a single byte32.
 */
export function encodeBridgeSourceId(protocol: BridgeProtocol, name: string): string {
    const nameBuf = Buffer.from(name);
    if (nameBuf.length > 16) {
        throw new Error(`"${name}" is too long to be a bridge source name (max of 16 ascii chars)`);
    }
    return hexUtils.concat(
        hexUtils.leftPad(hexUtils.toHex(protocol), 16),
        hexUtils.rightPad(hexUtils.toHex(Buffer.from(name)), 16),
    );
}
