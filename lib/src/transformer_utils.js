"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeBridgeSourceId = exports.decodePositiveSlippageFeeTransformerData = exports.encodePositiveSlippageFeeTransformerData = exports.positiveSlippageFeeTransformerDataEncoder = exports.getTransformerAddress = exports.findTransformerNonce = exports.decodeAffiliateFeeTransformerData = exports.encodeAffiliateFeeTransformerData = exports.affiliateFeeTransformerDataEncoder = exports.decodePayTakerTransformerData = exports.encodePayTakerTransformerData = exports.payTakerTransformerDataEncoder = exports.decodeWethTransformerData = exports.encodeWethTransformerData = exports.wethTransformerDataEncoder = exports.decodeFillQuoteTransformerData = exports.encodeFillQuoteTransformerData = exports.BridgeProtocol = exports.FillQuoteTransformerOrderType = exports.FillQuoteTransformerSide = exports.fillQuoteTransformerDataEncoder = void 0;
const utils_1 = require("@0x/utils");
const ethjs = require("ethereumjs-util");
const orders_1 = require("./orders");
const signature_utils_1 = require("./signature_utils");
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
        components: orders_1.LimitOrder.STRUCT_ABI,
    },
    {
        name: 'signature',
        type: 'tuple',
        components: signature_utils_1.SIGNATURE_ABI,
    },
    { name: 'maxTakerTokenFillAmount', type: 'uint256' },
];
const RFQ_ORDER_INFO_ABI_COMPONENTS = [
    {
        name: 'order',
        type: 'tuple',
        components: orders_1.RfqOrder.STRUCT_ABI,
    },
    {
        name: 'signature',
        type: 'tuple',
        components: signature_utils_1.SIGNATURE_ABI,
    },
    { name: 'maxTakerTokenFillAmount', type: 'uint256' },
];
/**
 * ABI encoder for `FillQuoteTransformer.TransformData`
 */
exports.fillQuoteTransformerDataEncoder = utils_1.AbiEncoder.create([
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
var FillQuoteTransformerSide;
(function (FillQuoteTransformerSide) {
    FillQuoteTransformerSide[FillQuoteTransformerSide["Sell"] = 0] = "Sell";
    FillQuoteTransformerSide[FillQuoteTransformerSide["Buy"] = 1] = "Buy";
})(FillQuoteTransformerSide = exports.FillQuoteTransformerSide || (exports.FillQuoteTransformerSide = {}));
/**
 * `FillQuoteTransformer.OrderType`
 */
var FillQuoteTransformerOrderType;
(function (FillQuoteTransformerOrderType) {
    FillQuoteTransformerOrderType[FillQuoteTransformerOrderType["Bridge"] = 0] = "Bridge";
    FillQuoteTransformerOrderType[FillQuoteTransformerOrderType["Limit"] = 1] = "Limit";
    FillQuoteTransformerOrderType[FillQuoteTransformerOrderType["Rfq"] = 2] = "Rfq";
})(FillQuoteTransformerOrderType = exports.FillQuoteTransformerOrderType || (exports.FillQuoteTransformerOrderType = {}));
// tslint:disable: enum-naming
/**
 * Identifies the DEX protocol used to fill a bridge order.
 */
var BridgeProtocol;
(function (BridgeProtocol) {
    BridgeProtocol[BridgeProtocol["Unknown"] = 0] = "Unknown";
    BridgeProtocol[BridgeProtocol["Curve"] = 1] = "Curve";
    BridgeProtocol[BridgeProtocol["UniswapV2"] = 2] = "UniswapV2";
    BridgeProtocol[BridgeProtocol["Uniswap"] = 3] = "Uniswap";
    BridgeProtocol[BridgeProtocol["Balancer"] = 4] = "Balancer";
    BridgeProtocol[BridgeProtocol["Kyber"] = 5] = "Kyber";
    BridgeProtocol[BridgeProtocol["Mooniswap"] = 6] = "Mooniswap";
    BridgeProtocol[BridgeProtocol["MStable"] = 7] = "MStable";
    BridgeProtocol[BridgeProtocol["Oasis"] = 8] = "Oasis";
    BridgeProtocol[BridgeProtocol["Shell"] = 9] = "Shell";
    BridgeProtocol[BridgeProtocol["Dodo"] = 10] = "Dodo";
    BridgeProtocol[BridgeProtocol["DodoV2"] = 11] = "DodoV2";
    BridgeProtocol[BridgeProtocol["CryptoCom"] = 12] = "CryptoCom";
    BridgeProtocol[BridgeProtocol["Bancor"] = 13] = "Bancor";
    BridgeProtocol[BridgeProtocol["CoFiX"] = 14] = "CoFiX";
    BridgeProtocol[BridgeProtocol["Nerve"] = 15] = "Nerve";
    BridgeProtocol[BridgeProtocol["MakerPsm"] = 16] = "MakerPsm";
    BridgeProtocol[BridgeProtocol["BalancerV2"] = 17] = "BalancerV2";
    BridgeProtocol[BridgeProtocol["UniswapV3"] = 18] = "UniswapV3";
    BridgeProtocol[BridgeProtocol["KyberDmm"] = 19] = "KyberDmm";
    BridgeProtocol[BridgeProtocol["CurveV2"] = 20] = "CurveV2";
    BridgeProtocol[BridgeProtocol["Lido"] = 21] = "Lido";
    BridgeProtocol[BridgeProtocol["Clipper"] = 22] = "Clipper";
})(BridgeProtocol = exports.BridgeProtocol || (exports.BridgeProtocol = {}));
/**
 * ABI-encode a `FillQuoteTransformer.TransformData` type.
 */
function encodeFillQuoteTransformerData(data) {
    return exports.fillQuoteTransformerDataEncoder.encode([data]);
}
exports.encodeFillQuoteTransformerData = encodeFillQuoteTransformerData;
/**
 * ABI-decode a `FillQuoteTransformer.TransformData` type.
 */
function decodeFillQuoteTransformerData(encoded) {
    return exports.fillQuoteTransformerDataEncoder.decode(encoded).data;
}
exports.decodeFillQuoteTransformerData = decodeFillQuoteTransformerData;
/**
 * ABI encoder for `WethTransformer.TransformData`
 */
exports.wethTransformerDataEncoder = utils_1.AbiEncoder.create([
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
 * ABI-encode a `WethTransformer.TransformData` type.
 */
function encodeWethTransformerData(data) {
    return exports.wethTransformerDataEncoder.encode([data]);
}
exports.encodeWethTransformerData = encodeWethTransformerData;
/**
 * ABI-decode a `WethTransformer.TransformData` type.
 */
function decodeWethTransformerData(encoded) {
    return exports.wethTransformerDataEncoder.decode(encoded).data;
}
exports.decodeWethTransformerData = decodeWethTransformerData;
/**
 * ABI encoder for `PayTakerTransformer.TransformData`
 */
exports.payTakerTransformerDataEncoder = utils_1.AbiEncoder.create([
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
 * ABI-encode a `PayTakerTransformer.TransformData` type.
 */
function encodePayTakerTransformerData(data) {
    return exports.payTakerTransformerDataEncoder.encode([data]);
}
exports.encodePayTakerTransformerData = encodePayTakerTransformerData;
/**
 * ABI-decode a `PayTakerTransformer.TransformData` type.
 */
function decodePayTakerTransformerData(encoded) {
    return exports.payTakerTransformerDataEncoder.decode(encoded).data;
}
exports.decodePayTakerTransformerData = decodePayTakerTransformerData;
/**
 * ABI encoder for `affiliateFeetransformer.TransformData`
 */
exports.affiliateFeeTransformerDataEncoder = utils_1.AbiEncoder.create({
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
 * ABI-encode a `AffiliateFeeTransformer.TransformData` type.
 */
function encodeAffiliateFeeTransformerData(data) {
    return exports.affiliateFeeTransformerDataEncoder.encode(data);
}
exports.encodeAffiliateFeeTransformerData = encodeAffiliateFeeTransformerData;
/**
 * ABI-decode a `AffiliateFeeTransformer.TransformData` type.
 */
function decodeAffiliateFeeTransformerData(encoded) {
    return exports.affiliateFeeTransformerDataEncoder.decode(encoded);
}
exports.decodeAffiliateFeeTransformerData = decodeAffiliateFeeTransformerData;
/**
 * Find the nonce for a transformer given its deployer.
 * If `deployer` is the null address, zero will always be returned.
 */
function findTransformerNonce(transformer, deployer = utils_1.NULL_ADDRESS, maxGuesses = 1024) {
    if (deployer === utils_1.NULL_ADDRESS) {
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
exports.findTransformerNonce = findTransformerNonce;
/**
 * Compute the deployed address for a transformer given a deployer and nonce.
 */
function getTransformerAddress(deployer, nonce) {
    return ethjs.bufferToHex(
    // tslint:disable-next-line: custom-no-magic-numbers
    ethjs.rlphash([deployer, nonce]).slice(12));
}
exports.getTransformerAddress = getTransformerAddress;
/**
 * ABI encoder for `PositiveSlippageFeeTransformer.TransformData`
 */
exports.positiveSlippageFeeTransformerDataEncoder = utils_1.AbiEncoder.create({
    name: 'data',
    type: 'tuple',
    components: [
        { name: 'token', type: 'address' },
        { name: 'bestCaseAmount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
    ],
});
/**
 * ABI-encode a `PositiveSlippageFeeTransformer.TransformData` type.
 */
function encodePositiveSlippageFeeTransformerData(data) {
    return exports.positiveSlippageFeeTransformerDataEncoder.encode(data);
}
exports.encodePositiveSlippageFeeTransformerData = encodePositiveSlippageFeeTransformerData;
/**
 * ABI-decode a `PositiveSlippageFeeTransformer.TransformData` type.
 */
function decodePositiveSlippageFeeTransformerData(encoded) {
    return exports.positiveSlippageFeeTransformerDataEncoder.decode(encoded);
}
exports.decodePositiveSlippageFeeTransformerData = decodePositiveSlippageFeeTransformerData;
/**
 * Packs a bridge protocol ID and an ASCII DEX name into a single byte32.
 */
function encodeBridgeSourceId(protocol, name) {
    const nameBuf = Buffer.from(name);
    if (nameBuf.length > 16) {
        throw new Error(`"${name}" is too long to be a bridge source name (max of 16 ascii chars)`);
    }
    return utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(utils_1.hexUtils.toHex(protocol), 16), utils_1.hexUtils.rightPad(utils_1.hexUtils.toHex(Buffer.from(name)), 16));
}
exports.encodeBridgeSourceId = encodeBridgeSourceId;
//# sourceMappingURL=transformer_utils.js.map