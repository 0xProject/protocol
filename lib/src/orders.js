"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtcOrder = exports.RfqOrder = exports.LimitOrder = exports.OrderBase = exports.OrderStatus = void 0;
const contract_addresses_1 = require("@0x/contract-addresses");
const utils_1 = require("@0x/utils");
const constants_1 = require("./constants");
const eip712_utils_1 = require("./eip712_utils");
const signature_utils_1 = require("./signature_utils");
const COMMON_ORDER_DEFAULT_VALUES = {
    makerToken: utils_1.NULL_ADDRESS,
    takerToken: utils_1.NULL_ADDRESS,
    makerAmount: constants_1.ZERO,
    takerAmount: constants_1.ZERO,
    maker: utils_1.NULL_ADDRESS,
    taker: utils_1.NULL_ADDRESS,
    chainId: 1,
    verifyingContract: (0, contract_addresses_1.getContractAddressesForChainOrThrow)(1).exchangeProxy,
};
const LIMIT_ORDER_DEFAULT_VALUES = Object.assign(Object.assign({}, COMMON_ORDER_DEFAULT_VALUES), { takerTokenFeeAmount: constants_1.ZERO, sender: utils_1.NULL_ADDRESS, feeRecipient: utils_1.NULL_ADDRESS, expiry: constants_1.ZERO, pool: utils_1.hexUtils.leftPad(0), salt: constants_1.ZERO });
const RFQ_ORDER_DEFAULT_VALUES = Object.assign(Object.assign({}, COMMON_ORDER_DEFAULT_VALUES), { txOrigin: utils_1.NULL_ADDRESS, expiry: constants_1.ZERO, pool: utils_1.hexUtils.leftPad(0), salt: constants_1.ZERO });
const OTC_ORDER_DEFAULT_VALUES = Object.assign(Object.assign({}, COMMON_ORDER_DEFAULT_VALUES), { txOrigin: utils_1.NULL_ADDRESS, expiryAndNonce: constants_1.ZERO });
const BRIDGE_ORDER_DEFAULT_VALUES = {
    source: constants_1.ZERO,
    takerTokenAmount: constants_1.ZERO,
    makerTokenAmount: constants_1.ZERO,
    bridgeData: '',
};
var OrderStatus;
(function (OrderStatus) {
    OrderStatus[OrderStatus["Invalid"] = 0] = "Invalid";
    OrderStatus[OrderStatus["Fillable"] = 1] = "Fillable";
    OrderStatus[OrderStatus["Filled"] = 2] = "Filled";
    OrderStatus[OrderStatus["Cancelled"] = 3] = "Cancelled";
    OrderStatus[OrderStatus["Expired"] = 4] = "Expired";
})(OrderStatus = exports.OrderStatus || (exports.OrderStatus = {}));
class OrderBase {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, COMMON_ORDER_DEFAULT_VALUES), fields);
        this.makerToken = _fields.makerToken;
        this.takerToken = _fields.takerToken;
        this.makerAmount = _fields.makerAmount;
        this.takerAmount = _fields.takerAmount;
        this.maker = _fields.maker;
        this.taker = _fields.taker;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }
    getHash() {
        return (0, eip712_utils_1.getExchangeProxyEIP712Hash)(this.getStructHash(), this.chainId, this.verifyingContract);
    }
    getSignatureWithProviderAsync(provider, type = signature_utils_1.SignatureType.EthSign, signer = this.maker) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (type) {
                case signature_utils_1.SignatureType.EIP712:
                    return (0, signature_utils_1.eip712SignTypedDataWithProviderAsync)(this.getEIP712TypedData(), signer, provider);
                case signature_utils_1.SignatureType.EthSign:
                    return (0, signature_utils_1.ethSignHashWithProviderAsync)(this.getHash(), signer, provider);
                default:
                    throw new Error(`Cannot sign with signature type: ${type}`);
            }
        });
    }
    getSignatureWithKey(key, type = signature_utils_1.SignatureType.EthSign) {
        switch (type) {
            case signature_utils_1.SignatureType.EIP712:
                return (0, signature_utils_1.eip712SignTypedDataWithKey)(this.getEIP712TypedData(), key);
            case signature_utils_1.SignatureType.EthSign:
                return (0, signature_utils_1.ethSignHashWithKey)(this.getHash(), key);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }
}
exports.OrderBase = OrderBase;
class LimitOrder extends OrderBase {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, LIMIT_ORDER_DEFAULT_VALUES), fields);
        super(_fields);
        this.takerTokenFeeAmount = _fields.takerTokenFeeAmount;
        this.sender = _fields.sender;
        this.feeRecipient = _fields.feeRecipient;
        this.pool = _fields.pool;
        this.salt = _fields.salt;
        this.expiry = _fields.expiry;
    }
    clone(fields = {}) {
        return new LimitOrder(Object.assign({ makerToken: this.makerToken, takerToken: this.takerToken, makerAmount: this.makerAmount, takerAmount: this.takerAmount, takerTokenFeeAmount: this.takerTokenFeeAmount, maker: this.maker, taker: this.taker, sender: this.sender, feeRecipient: this.feeRecipient, pool: this.pool, expiry: this.expiry, salt: this.salt, chainId: this.chainId, verifyingContract: this.verifyingContract }, fields));
    }
    getStructHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(LimitOrder.TYPE_HASH), utils_1.hexUtils.leftPad(this.makerToken), utils_1.hexUtils.leftPad(this.takerToken), utils_1.hexUtils.leftPad(this.makerAmount), utils_1.hexUtils.leftPad(this.takerAmount), utils_1.hexUtils.leftPad(this.takerTokenFeeAmount), utils_1.hexUtils.leftPad(this.maker), utils_1.hexUtils.leftPad(this.taker), utils_1.hexUtils.leftPad(this.sender), utils_1.hexUtils.leftPad(this.feeRecipient), utils_1.hexUtils.leftPad(this.pool), utils_1.hexUtils.leftPad(this.expiry), utils_1.hexUtils.leftPad(this.salt)));
    }
    getEIP712TypedData() {
        return {
            types: {
                EIP712Domain: eip712_utils_1.EIP712_DOMAIN_PARAMETERS,
                [LimitOrder.STRUCT_NAME]: LimitOrder.STRUCT_ABI,
            },
            domain: (0, eip712_utils_1.createExchangeProxyEIP712Domain)(this.chainId, this.verifyingContract),
            primaryType: LimitOrder.STRUCT_NAME,
            message: {
                makerToken: this.makerToken,
                takerToken: this.takerToken,
                makerAmount: this.makerAmount.toString(10),
                takerAmount: this.takerAmount.toString(10),
                takerTokenFeeAmount: this.takerTokenFeeAmount.toString(10),
                maker: this.maker,
                taker: this.taker,
                sender: this.sender,
                feeRecipient: this.feeRecipient,
                pool: this.pool,
                expiry: this.expiry.toString(10),
                salt: this.salt.toString(10),
            },
        };
    }
    willExpire(secondsFromNow = 0) {
        const millisecondsInSecond = 1000;
        const currentUnixTimestampSec = new utils_1.BigNumber(Date.now() / millisecondsInSecond).integerValue();
        return this.expiry.isLessThan(currentUnixTimestampSec.plus(secondsFromNow));
    }
}
exports.LimitOrder = LimitOrder;
LimitOrder.STRUCT_NAME = 'LimitOrder';
LimitOrder.STRUCT_ABI = [
    { type: 'address', name: 'makerToken' },
    { type: 'address', name: 'takerToken' },
    { type: 'uint128', name: 'makerAmount' },
    { type: 'uint128', name: 'takerAmount' },
    { type: 'uint128', name: 'takerTokenFeeAmount' },
    { type: 'address', name: 'maker' },
    { type: 'address', name: 'taker' },
    { type: 'address', name: 'sender' },
    { type: 'address', name: 'feeRecipient' },
    { type: 'bytes32', name: 'pool' },
    { type: 'uint64', name: 'expiry' },
    { type: 'uint256', name: 'salt' },
];
LimitOrder.TYPE_HASH = (0, eip712_utils_1.getTypeHash)(LimitOrder.STRUCT_NAME, LimitOrder.STRUCT_ABI);
class RfqOrder extends OrderBase {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, RFQ_ORDER_DEFAULT_VALUES), fields);
        super(_fields);
        this.txOrigin = _fields.txOrigin;
        this.pool = _fields.pool;
        this.salt = _fields.salt;
        this.expiry = _fields.expiry;
    }
    clone(fields = {}) {
        return new RfqOrder(Object.assign({ makerToken: this.makerToken, takerToken: this.takerToken, makerAmount: this.makerAmount, takerAmount: this.takerAmount, maker: this.maker, taker: this.taker, txOrigin: this.txOrigin, pool: this.pool, expiry: this.expiry, salt: this.salt, chainId: this.chainId, verifyingContract: this.verifyingContract }, fields));
    }
    getStructHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(RfqOrder.TYPE_HASH), utils_1.hexUtils.leftPad(this.makerToken), utils_1.hexUtils.leftPad(this.takerToken), utils_1.hexUtils.leftPad(this.makerAmount), utils_1.hexUtils.leftPad(this.takerAmount), utils_1.hexUtils.leftPad(this.maker), utils_1.hexUtils.leftPad(this.taker), utils_1.hexUtils.leftPad(this.txOrigin), utils_1.hexUtils.leftPad(this.pool), utils_1.hexUtils.leftPad(this.expiry), utils_1.hexUtils.leftPad(this.salt)));
    }
    getEIP712TypedData() {
        return {
            types: {
                EIP712Domain: eip712_utils_1.EIP712_DOMAIN_PARAMETERS,
                [RfqOrder.STRUCT_NAME]: RfqOrder.STRUCT_ABI,
            },
            domain: (0, eip712_utils_1.createExchangeProxyEIP712Domain)(this.chainId, this.verifyingContract),
            primaryType: RfqOrder.STRUCT_NAME,
            message: {
                makerToken: this.makerToken,
                takerToken: this.takerToken,
                makerAmount: this.makerAmount.toString(10),
                takerAmount: this.takerAmount.toString(10),
                maker: this.maker,
                taker: this.taker,
                txOrigin: this.txOrigin,
                pool: this.pool,
                expiry: this.expiry.toString(10),
                salt: this.salt.toString(10),
            },
        };
    }
    willExpire(secondsFromNow = 0) {
        const millisecondsInSecond = 1000;
        const currentUnixTimestampSec = new utils_1.BigNumber(Date.now() / millisecondsInSecond).integerValue();
        return this.expiry.isLessThan(currentUnixTimestampSec.plus(secondsFromNow));
    }
}
exports.RfqOrder = RfqOrder;
RfqOrder.STRUCT_NAME = 'RfqOrder';
RfqOrder.STRUCT_ABI = [
    { type: 'address', name: 'makerToken' },
    { type: 'address', name: 'takerToken' },
    { type: 'uint128', name: 'makerAmount' },
    { type: 'uint128', name: 'takerAmount' },
    { type: 'address', name: 'maker' },
    { type: 'address', name: 'taker' },
    { type: 'address', name: 'txOrigin' },
    { type: 'bytes32', name: 'pool' },
    { type: 'uint64', name: 'expiry' },
    { type: 'uint256', name: 'salt' },
];
RfqOrder.TYPE_HASH = (0, eip712_utils_1.getTypeHash)(RfqOrder.STRUCT_NAME, RfqOrder.STRUCT_ABI);
class OtcOrder extends OrderBase {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, OTC_ORDER_DEFAULT_VALUES), fields);
        super(_fields);
        this.txOrigin = _fields.txOrigin;
        this.expiryAndNonce = _fields.expiryAndNonce;
        const { expiry, nonceBucket, nonce } = OtcOrder.parseExpiryAndNonce(_fields.expiryAndNonce);
        this.expiry = expiry;
        this.nonceBucket = nonceBucket;
        this.nonce = nonce;
    }
    static parseExpiryAndNonce(expiryAndNonce) {
        const expiryAndNonceHex = utils_1.hexUtils.leftPad(expiryAndNonce);
        const expiry = new utils_1.BigNumber(utils_1.hexUtils.slice(expiryAndNonceHex, 0, 8).substr(2), 16);
        const nonceBucket = new utils_1.BigNumber(utils_1.hexUtils.slice(expiryAndNonceHex, 8, 16).substr(2), 16);
        const nonce = new utils_1.BigNumber(utils_1.hexUtils.slice(expiryAndNonceHex, 16, 32).substr(2), 16);
        return {
            expiry,
            nonceBucket,
            nonce,
        };
    }
    static encodeExpiryAndNonce(expiry, nonceBucket, nonce) {
        if (expiry.isLessThan(0) || expiry.isGreaterThan(this.MAX_EXPIRY)) {
            throw new Error('Expiry out of range');
        }
        if (nonceBucket.isLessThan(0) || nonceBucket.isGreaterThan(this.MAX_NONCE_BUCKET)) {
            throw new Error('Nonce bucket out of range');
        }
        if (nonce.isLessThan(0) || nonce.isGreaterThan(this.MAX_NONCE_VALUE)) {
            throw new Error('Nonce out of range');
        }
        return new utils_1.BigNumber(utils_1.hexUtils
            .concat(utils_1.hexUtils.leftPad(expiry, 8), utils_1.hexUtils.leftPad(nonceBucket, 8), utils_1.hexUtils.leftPad(nonce, 16))
            .substr(2), 16);
    }
    clone(fields = {}) {
        return new OtcOrder(Object.assign({ makerToken: this.makerToken, takerToken: this.takerToken, makerAmount: this.makerAmount, takerAmount: this.takerAmount, maker: this.maker, taker: this.taker, txOrigin: this.txOrigin, expiryAndNonce: this.expiryAndNonce, chainId: this.chainId, verifyingContract: this.verifyingContract }, fields));
    }
    getStructHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(OtcOrder.TYPE_HASH), utils_1.hexUtils.leftPad(this.makerToken), utils_1.hexUtils.leftPad(this.takerToken), utils_1.hexUtils.leftPad(this.makerAmount), utils_1.hexUtils.leftPad(this.takerAmount), utils_1.hexUtils.leftPad(this.maker), utils_1.hexUtils.leftPad(this.taker), utils_1.hexUtils.leftPad(this.txOrigin), utils_1.hexUtils.leftPad(this.expiryAndNonce)));
    }
    getEIP712TypedData() {
        return {
            types: {
                EIP712Domain: eip712_utils_1.EIP712_DOMAIN_PARAMETERS,
                [OtcOrder.STRUCT_NAME]: OtcOrder.STRUCT_ABI,
            },
            domain: (0, eip712_utils_1.createExchangeProxyEIP712Domain)(this.chainId, this.verifyingContract),
            primaryType: OtcOrder.STRUCT_NAME,
            message: {
                makerToken: this.makerToken,
                takerToken: this.takerToken,
                makerAmount: this.makerAmount.toString(10),
                takerAmount: this.takerAmount.toString(10),
                maker: this.maker,
                taker: this.taker,
                txOrigin: this.txOrigin,
                expiryAndNonce: this.expiryAndNonce.toString(10),
            },
        };
    }
    willExpire(secondsFromNow = 0) {
        const millisecondsInSecond = 1000;
        const currentUnixTimestampSec = new utils_1.BigNumber(Date.now() / millisecondsInSecond).integerValue();
        const expiryRightShift = new utils_1.BigNumber(2).pow(192);
        const expiry = this.expiryAndNonce.dividedToIntegerBy(expiryRightShift);
        return expiry.isLessThan(currentUnixTimestampSec.plus(secondsFromNow));
    }
}
exports.OtcOrder = OtcOrder;
OtcOrder.STRUCT_NAME = 'OtcOrder';
OtcOrder.STRUCT_ABI = [
    { type: 'address', name: 'makerToken' },
    { type: 'address', name: 'takerToken' },
    { type: 'uint128', name: 'makerAmount' },
    { type: 'uint128', name: 'takerAmount' },
    { type: 'address', name: 'maker' },
    { type: 'address', name: 'taker' },
    { type: 'address', name: 'txOrigin' },
    { type: 'uint256', name: 'expiryAndNonce' },
];
OtcOrder.TYPE_HASH = (0, eip712_utils_1.getTypeHash)(OtcOrder.STRUCT_NAME, OtcOrder.STRUCT_ABI);
OtcOrder.MAX_EXPIRY = new utils_1.BigNumber(2).pow(64).minus(1);
OtcOrder.MAX_NONCE_BUCKET = new utils_1.BigNumber(2).pow(64).minus(1);
OtcOrder.MAX_NONCE_VALUE = new utils_1.BigNumber(2).pow(128).minus(1);
//# sourceMappingURL=orders.js.map