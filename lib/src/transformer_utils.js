"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@0x/utils");
const ethjs = require("ethereumjs-util");
const orders_1 = require("./orders");
const signature_utils_1 = require("./signature_utils");
const BRIDGE_ORDER_ABI_COMPONENTS = [
    { name: 'source', type: 'uint256' },
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
/**
 * Identifies the DEX type of a bridge order.
 */
var BridgeSource;
(function (BridgeSource) {
    BridgeSource[BridgeSource["Balancer"] = 0] = "Balancer";
    BridgeSource[BridgeSource["Bancor"] = 1] = "Bancor";
    // tslint:disable-next-line: enum-naming
    BridgeSource[BridgeSource["CoFiX"] = 2] = "CoFiX";
    BridgeSource[BridgeSource["Curve"] = 3] = "Curve";
    BridgeSource[BridgeSource["Cream"] = 4] = "Cream";
    BridgeSource[BridgeSource["CryptoCom"] = 5] = "CryptoCom";
    BridgeSource[BridgeSource["Dodo"] = 6] = "Dodo";
    BridgeSource[BridgeSource["Kyber"] = 7] = "Kyber";
    BridgeSource[BridgeSource["LiquidityProvider"] = 8] = "LiquidityProvider";
    BridgeSource[BridgeSource["Mooniswap"] = 9] = "Mooniswap";
    BridgeSource[BridgeSource["MStable"] = 10] = "MStable";
    BridgeSource[BridgeSource["Oasis"] = 11] = "Oasis";
    BridgeSource[BridgeSource["Shell"] = 12] = "Shell";
    BridgeSource[BridgeSource["Snowswap"] = 13] = "Snowswap";
    BridgeSource[BridgeSource["Sushiswap"] = 14] = "Sushiswap";
    BridgeSource[BridgeSource["Swerve"] = 15] = "Swerve";
    BridgeSource[BridgeSource["Uniswap"] = 16] = "Uniswap";
    BridgeSource[BridgeSource["UniswapV2"] = 17] = "UniswapV2";
})(BridgeSource = exports.BridgeSource || (exports.BridgeSource = {}));
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
        components: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }],
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
        components: [{ name: 'tokens', type: 'address[]' }, { name: 'amounts', type: 'uint256[]' }],
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
 * ABI encoder for `PayTakerTransformer.TransformData`
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
//# sourceMappingURL=transformer_utils.js.map