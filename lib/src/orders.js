"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
    pool: utils_1.hexUtils.leftPad(0),
    expiry: constants_1.ZERO,
    salt: constants_1.ZERO,
    chainId: 1,
    verifyingContract: contract_addresses_1.getContractAddressesForChainOrThrow(1).exchangeProxy,
};
const LIMIT_ORDER_DEFAULT_VALUES = Object.assign({}, COMMON_ORDER_DEFAULT_VALUES, { takerTokenFeeAmount: constants_1.ZERO, sender: utils_1.NULL_ADDRESS, feeRecipient: utils_1.NULL_ADDRESS });
const RFQ_ORDER_DEFAULT_VALUES = Object.assign({}, COMMON_ORDER_DEFAULT_VALUES, { txOrigin: utils_1.NULL_ADDRESS });
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
        const _fields = Object.assign({}, COMMON_ORDER_DEFAULT_VALUES, fields);
        this.makerToken = _fields.makerToken;
        this.takerToken = _fields.takerToken;
        this.makerAmount = _fields.makerAmount;
        this.takerAmount = _fields.takerAmount;
        this.maker = _fields.maker;
        this.taker = _fields.taker;
        this.pool = _fields.pool;
        this.expiry = _fields.expiry;
        this.salt = _fields.salt;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }
    getHash() {
        return eip712_utils_1.getExchangeProxyEIP712Hash(this.getStructHash(), this.chainId, this.verifyingContract);
    }
    willExpire(secondsFromNow = 0) {
        const millisecondsInSecond = 1000;
        const currentUnixTimestampSec = new utils_1.BigNumber(Date.now() / millisecondsInSecond).integerValue();
        return this.expiry.isLessThan(currentUnixTimestampSec.plus(secondsFromNow));
    }
    getSignatureWithProviderAsync(provider, type = signature_utils_1.SignatureType.EthSign) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (type) {
                case signature_utils_1.SignatureType.EIP712:
                    return signature_utils_1.eip712SignTypedDataWithProviderAsync(this.getEIP712TypedData(), this.maker, provider);
                case signature_utils_1.SignatureType.EthSign:
                    return signature_utils_1.ethSignHashWithProviderAsync(this.getHash(), this.maker, provider);
                default:
                    throw new Error(`Cannot sign with signature type: ${type}`);
            }
        });
    }
    getSignatureWithKey(key, type = signature_utils_1.SignatureType.EthSign) {
        switch (type) {
            case signature_utils_1.SignatureType.EIP712:
                return signature_utils_1.eip712SignTypedDataWithKey(this.getEIP712TypedData(), key);
            case signature_utils_1.SignatureType.EthSign:
                return signature_utils_1.ethSignHashWithKey(this.getHash(), key);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }
}
exports.OrderBase = OrderBase;
class LimitOrder extends OrderBase {
    constructor(fields = {}) {
        const _fields = Object.assign({}, LIMIT_ORDER_DEFAULT_VALUES, fields);
        super(_fields);
        this.takerTokenFeeAmount = _fields.takerTokenFeeAmount;
        this.sender = _fields.sender;
        this.feeRecipient = _fields.feeRecipient;
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
            domain: eip712_utils_1.createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract),
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
}
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
LimitOrder.TYPE_HASH = eip712_utils_1.getTypeHash(LimitOrder.STRUCT_NAME, LimitOrder.STRUCT_ABI);
exports.LimitOrder = LimitOrder;
class RfqOrder extends OrderBase {
    constructor(fields = {}) {
        const _fields = Object.assign({}, RFQ_ORDER_DEFAULT_VALUES, fields);
        super(_fields);
        this.txOrigin = _fields.txOrigin;
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
            domain: eip712_utils_1.createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract),
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
}
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
RfqOrder.TYPE_HASH = eip712_utils_1.getTypeHash(RfqOrder.STRUCT_NAME, RfqOrder.STRUCT_ABI);
exports.RfqOrder = RfqOrder;
//# sourceMappingURL=orders.js.map