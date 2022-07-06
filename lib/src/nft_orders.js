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
exports.ERC1155Order = exports.ERC721Order = exports.NFTOrder = exports.OrderStatus = exports.TradeDirection = void 0;
const contract_addresses_1 = require("@0x/contract-addresses");
const utils_1 = require("@0x/utils");
const constants_1 = require("./constants");
const eip712_utils_1 = require("./eip712_utils");
const signature_utils_1 = require("./signature_utils");
// tslint:disable:enum-naming
var TradeDirection;
(function (TradeDirection) {
    TradeDirection[TradeDirection["SellNFT"] = 0] = "SellNFT";
    TradeDirection[TradeDirection["BuyNFT"] = 1] = "BuyNFT";
})(TradeDirection = exports.TradeDirection || (exports.TradeDirection = {}));
// tslint:enable:enum-naming
var OrderStatus;
(function (OrderStatus) {
    OrderStatus[OrderStatus["Invalid"] = 0] = "Invalid";
    OrderStatus[OrderStatus["Fillable"] = 1] = "Fillable";
    OrderStatus[OrderStatus["Unfillable"] = 2] = "Unfillable";
    OrderStatus[OrderStatus["Expired"] = 3] = "Expired";
})(OrderStatus = exports.OrderStatus || (exports.OrderStatus = {}));
const NFT_ORDER_DEFAULT_VALUES = {
    direction: TradeDirection.SellNFT,
    maker: utils_1.NULL_ADDRESS,
    taker: utils_1.NULL_ADDRESS,
    expiry: constants_1.ZERO,
    nonce: constants_1.ZERO,
    erc20Token: utils_1.NULL_ADDRESS,
    erc20TokenAmount: constants_1.ZERO,
    fees: [],
    chainId: 1,
    verifyingContract: (0, contract_addresses_1.getContractAddressesForChainOrThrow)(1).exchangeProxy,
};
const ERC721_ORDER_DEFAULT_VALUES = {
    direction: TradeDirection.SellNFT,
    maker: utils_1.NULL_ADDRESS,
    taker: utils_1.NULL_ADDRESS,
    expiry: constants_1.ZERO,
    nonce: constants_1.ZERO,
    erc20Token: utils_1.NULL_ADDRESS,
    erc20TokenAmount: constants_1.ZERO,
    fees: [],
    erc721Token: utils_1.NULL_ADDRESS,
    erc721TokenId: constants_1.ZERO,
    erc721TokenProperties: [],
    chainId: 1,
    verifyingContract: (0, contract_addresses_1.getContractAddressesForChainOrThrow)(1).exchangeProxy,
};
const ERC1155_ORDER_DEFAULT_VALUES = {
    direction: TradeDirection.SellNFT,
    maker: utils_1.NULL_ADDRESS,
    taker: utils_1.NULL_ADDRESS,
    expiry: constants_1.ZERO,
    nonce: constants_1.ZERO,
    erc20Token: utils_1.NULL_ADDRESS,
    erc20TokenAmount: constants_1.ZERO,
    fees: [],
    erc1155Token: utils_1.NULL_ADDRESS,
    erc1155TokenId: constants_1.ZERO,
    erc1155TokenProperties: [],
    erc1155TokenAmount: constants_1.ZERO,
    chainId: 1,
    verifyingContract: (0, contract_addresses_1.getContractAddressesForChainOrThrow)(1).exchangeProxy,
};
class NFTOrder {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, NFT_ORDER_DEFAULT_VALUES), fields);
        this.direction = _fields.direction;
        this.maker = _fields.maker;
        this.taker = _fields.taker;
        this.expiry = _fields.expiry;
        this.nonce = _fields.nonce;
        this.erc20Token = _fields.erc20Token;
        this.erc20TokenAmount = _fields.erc20TokenAmount;
        this.fees = _fields.fees;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }
    willExpire(secondsFromNow = 0) {
        const millisecondsInSecond = 1000;
        const currentUnixTimestampSec = new utils_1.BigNumber(Date.now() / millisecondsInSecond).integerValue();
        return this.expiry.isLessThan(currentUnixTimestampSec.plus(secondsFromNow));
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
                return (0, signature_utils_1.eip712SignHashWithKey)(this.getHash(), key);
            case signature_utils_1.SignatureType.EthSign:
                return (0, signature_utils_1.ethSignHashWithKey)(this.getHash(), key);
            default:
                throw new Error(`Cannot sign with signature type: ${type}`);
        }
    }
    _getPropertiesHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(...this._getProperties().map(property => utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(NFTOrder.PROPERTY_TYPE_HASH), utils_1.hexUtils.leftPad(property.propertyValidator), utils_1.hexUtils.hash(property.propertyData))))));
    }
    _getFeesHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(...this.fees.map(fee => utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(NFTOrder.FEE_TYPE_HASH), utils_1.hexUtils.leftPad(fee.recipient), utils_1.hexUtils.leftPad(fee.amount), utils_1.hexUtils.hash(fee.feeData))))));
    }
}
exports.NFTOrder = NFTOrder;
NFTOrder.FEE_ABI = [
    { type: 'address', name: 'recipient' },
    { type: 'uint256', name: 'amount' },
    { type: 'bytes', name: 'feeData' },
];
NFTOrder.PROPERTY_ABI = [
    { type: 'address', name: 'propertyValidator' },
    { type: 'bytes', name: 'propertyData' },
];
NFTOrder.FEE_TYPE_HASH = (0, eip712_utils_1.getTypeHash)('Fee', NFTOrder.FEE_ABI);
NFTOrder.PROPERTY_TYPE_HASH = (0, eip712_utils_1.getTypeHash)('Property', NFTOrder.PROPERTY_ABI);
class ERC721Order extends NFTOrder {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, ERC721_ORDER_DEFAULT_VALUES), fields);
        super(_fields);
        this.erc721Token = _fields.erc721Token;
        this.erc721TokenId = _fields.erc721TokenId;
        this.erc721TokenProperties = _fields.erc721TokenProperties;
    }
    clone(fields = {}) {
        return new ERC721Order(Object.assign({ direction: this.direction, maker: this.maker, taker: this.taker, expiry: this.expiry, nonce: this.nonce, erc20Token: this.erc20Token, erc20TokenAmount: this.erc20TokenAmount, fees: this.fees, erc721Token: this.erc721Token, erc721TokenId: this.erc721TokenId, erc721TokenProperties: this.erc721TokenProperties, chainId: this.chainId, verifyingContract: this.verifyingContract }, fields));
    }
    getStructHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(ERC721Order.TYPE_HASH), utils_1.hexUtils.leftPad(this.direction), utils_1.hexUtils.leftPad(this.maker), utils_1.hexUtils.leftPad(this.taker), utils_1.hexUtils.leftPad(this.expiry), utils_1.hexUtils.leftPad(this.nonce), utils_1.hexUtils.leftPad(this.erc20Token), utils_1.hexUtils.leftPad(this.erc20TokenAmount), this._getFeesHash(), utils_1.hexUtils.leftPad(this.erc721Token), utils_1.hexUtils.leftPad(this.erc721TokenId), this._getPropertiesHash()));
    }
    getEIP712TypedData() {
        return {
            types: {
                EIP712Domain: eip712_utils_1.EIP712_DOMAIN_PARAMETERS,
                [ERC721Order.STRUCT_NAME]: ERC721Order.STRUCT_ABI,
                ['Fee']: NFTOrder.FEE_ABI,
                ['Property']: NFTOrder.PROPERTY_ABI,
            },
            domain: (0, eip712_utils_1.createExchangeProxyEIP712Domain)(this.chainId, this.verifyingContract),
            primaryType: ERC721Order.STRUCT_NAME,
            message: {
                direction: this.direction,
                maker: this.maker,
                taker: this.taker,
                expiry: this.expiry.toString(10),
                nonce: this.nonce.toString(10),
                erc20Token: this.erc20Token,
                erc20TokenAmount: this.erc20TokenAmount.toString(10),
                fees: this.fees.map(fee => ({
                    recipient: fee.recipient,
                    amount: fee.amount.toString(10),
                    feeData: fee.feeData,
                })),
                erc721Token: this.erc721Token,
                erc721TokenId: this.erc721TokenId.toString(10),
                erc721TokenProperties: this.erc721TokenProperties,
            },
        };
    }
    _getProperties() {
        return this.erc721TokenProperties;
    }
}
exports.ERC721Order = ERC721Order;
ERC721Order.STRUCT_NAME = 'ERC721Order';
ERC721Order.STRUCT_ABI = [
    { type: 'uint8', name: 'direction' },
    { type: 'address', name: 'maker' },
    { type: 'address', name: 'taker' },
    { type: 'uint256', name: 'expiry' },
    { type: 'uint256', name: 'nonce' },
    { type: 'address', name: 'erc20Token' },
    { type: 'uint256', name: 'erc20TokenAmount' },
    { type: 'Fee[]', name: 'fees' },
    { type: 'address', name: 'erc721Token' },
    { type: 'uint256', name: 'erc721TokenId' },
    { type: 'Property[]', name: 'erc721TokenProperties' },
];
ERC721Order.TYPE_HASH = (0, eip712_utils_1.getTypeHash)(ERC721Order.STRUCT_NAME, ERC721Order.STRUCT_ABI, {
    ['Fee']: NFTOrder.FEE_ABI,
    ['Property']: NFTOrder.PROPERTY_ABI,
});
class ERC1155Order extends NFTOrder {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, ERC1155_ORDER_DEFAULT_VALUES), fields);
        super(_fields);
        this.erc1155Token = _fields.erc1155Token;
        this.erc1155TokenId = _fields.erc1155TokenId;
        this.erc1155TokenProperties = _fields.erc1155TokenProperties;
        this.erc1155TokenAmount = _fields.erc1155TokenAmount;
    }
    clone(fields = {}) {
        return new ERC1155Order(Object.assign({ direction: this.direction, maker: this.maker, taker: this.taker, expiry: this.expiry, nonce: this.nonce, erc20Token: this.erc20Token, erc20TokenAmount: this.erc20TokenAmount, fees: this.fees, erc1155Token: this.erc1155Token, erc1155TokenId: this.erc1155TokenId, erc1155TokenProperties: this.erc1155TokenProperties, erc1155TokenAmount: this.erc1155TokenAmount, chainId: this.chainId, verifyingContract: this.verifyingContract }, fields));
    }
    getStructHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(ERC1155Order.TYPE_HASH), utils_1.hexUtils.leftPad(this.direction), utils_1.hexUtils.leftPad(this.maker), utils_1.hexUtils.leftPad(this.taker), utils_1.hexUtils.leftPad(this.expiry), utils_1.hexUtils.leftPad(this.nonce), utils_1.hexUtils.leftPad(this.erc20Token), utils_1.hexUtils.leftPad(this.erc20TokenAmount), this._getFeesHash(), utils_1.hexUtils.leftPad(this.erc1155Token), utils_1.hexUtils.leftPad(this.erc1155TokenId), this._getPropertiesHash(), utils_1.hexUtils.leftPad(this.erc1155TokenAmount)));
    }
    getEIP712TypedData() {
        return {
            types: {
                EIP712Domain: eip712_utils_1.EIP712_DOMAIN_PARAMETERS,
                [ERC1155Order.STRUCT_NAME]: ERC1155Order.STRUCT_ABI,
                ['Fee']: NFTOrder.FEE_ABI,
                ['Property']: NFTOrder.PROPERTY_ABI,
            },
            domain: (0, eip712_utils_1.createExchangeProxyEIP712Domain)(this.chainId, this.verifyingContract),
            primaryType: ERC1155Order.STRUCT_NAME,
            message: {
                direction: this.direction,
                maker: this.maker,
                taker: this.taker,
                expiry: this.expiry.toString(10),
                nonce: this.nonce.toString(10),
                erc20Token: this.erc20Token,
                erc20TokenAmount: this.erc20TokenAmount.toString(10),
                fees: this.fees.map(fee => ({
                    recipient: fee.recipient,
                    amount: fee.amount.toString(10),
                    feeData: fee.feeData,
                })),
                erc1155Token: this.erc1155Token,
                erc1155TokenId: this.erc1155TokenId.toString(10),
                erc1155TokenProperties: this.erc1155TokenProperties,
                erc1155TokenAmount: this.erc1155TokenAmount.toString(10),
            },
        };
    }
    _getProperties() {
        return this.erc1155TokenProperties;
    }
}
exports.ERC1155Order = ERC1155Order;
ERC1155Order.STRUCT_NAME = 'ERC1155Order';
ERC1155Order.STRUCT_ABI = [
    { type: 'uint8', name: 'direction' },
    { type: 'address', name: 'maker' },
    { type: 'address', name: 'taker' },
    { type: 'uint256', name: 'expiry' },
    { type: 'uint256', name: 'nonce' },
    { type: 'address', name: 'erc20Token' },
    { type: 'uint256', name: 'erc20TokenAmount' },
    { type: 'Fee[]', name: 'fees' },
    { type: 'address', name: 'erc1155Token' },
    { type: 'uint256', name: 'erc1155TokenId' },
    { type: 'Property[]', name: 'erc1155TokenProperties' },
    { type: 'uint128', name: 'erc1155TokenAmount' },
];
ERC1155Order.TYPE_HASH = (0, eip712_utils_1.getTypeHash)(ERC1155Order.STRUCT_NAME, ERC1155Order.STRUCT_ABI, {
    ['Fee']: NFTOrder.FEE_ABI,
    ['Property']: NFTOrder.PROPERTY_ABI,
});
//# sourceMappingURL=nft_orders.js.map