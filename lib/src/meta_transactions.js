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
exports.MetaTransaction = void 0;
const contract_addresses_1 = require("@0x/contract-addresses");
const utils_1 = require("@0x/utils");
const constants_1 = require("./constants");
const eip712_utils_1 = require("./eip712_utils");
const signature_utils_1 = require("./signature_utils");
const MTX_DEFAULT_VALUES = {
    signer: utils_1.NULL_ADDRESS,
    sender: utils_1.NULL_ADDRESS,
    minGasPrice: constants_1.ZERO,
    maxGasPrice: constants_1.ZERO,
    expirationTimeSeconds: constants_1.ZERO,
    salt: constants_1.ZERO,
    callData: utils_1.hexUtils.leftPad(0),
    value: constants_1.ZERO,
    feeToken: utils_1.NULL_ADDRESS,
    feeAmount: constants_1.ZERO,
    chainId: 1,
    verifyingContract: contract_addresses_1.getContractAddressesForChainOrThrow(1).exchangeProxy,
};
class MetaTransaction {
    constructor(fields = {}) {
        const _fields = Object.assign(Object.assign({}, MTX_DEFAULT_VALUES), fields);
        this.signer = _fields.signer;
        this.sender = _fields.sender;
        this.minGasPrice = _fields.minGasPrice;
        this.maxGasPrice = _fields.maxGasPrice;
        this.expirationTimeSeconds = _fields.expirationTimeSeconds;
        this.salt = _fields.salt;
        this.callData = _fields.callData;
        this.value = _fields.value;
        this.feeToken = _fields.feeToken;
        this.feeAmount = _fields.feeAmount;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }
    clone(fields = {}) {
        return new MetaTransaction(Object.assign({ signer: this.signer, sender: this.sender, minGasPrice: this.minGasPrice, maxGasPrice: this.maxGasPrice, expirationTimeSeconds: this.expirationTimeSeconds, salt: this.salt, callData: this.callData, value: this.value, feeToken: this.feeToken, feeAmount: this.feeAmount, chainId: this.chainId, verifyingContract: this.verifyingContract }, fields));
    }
    getStructHash() {
        return utils_1.hexUtils.hash(utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(MetaTransaction.TYPE_HASH), utils_1.hexUtils.leftPad(this.signer), utils_1.hexUtils.leftPad(this.sender), utils_1.hexUtils.leftPad(this.minGasPrice), utils_1.hexUtils.leftPad(this.maxGasPrice), utils_1.hexUtils.leftPad(this.expirationTimeSeconds), utils_1.hexUtils.leftPad(this.salt), utils_1.hexUtils.hash(this.callData), utils_1.hexUtils.leftPad(this.value), utils_1.hexUtils.leftPad(this.feeToken), utils_1.hexUtils.leftPad(this.feeAmount)));
    }
    getEIP712TypedData() {
        return {
            types: {
                EIP712Domain: eip712_utils_1.EIP712_DOMAIN_PARAMETERS,
                [MetaTransaction.STRUCT_NAME]: MetaTransaction.STRUCT_ABI,
            },
            domain: eip712_utils_1.createExchangeProxyEIP712Domain(this.chainId, this.verifyingContract),
            primaryType: MetaTransaction.STRUCT_NAME,
            message: {
                signer: this.signer,
                sender: this.sender,
                minGasPrice: this.minGasPrice.toString(10),
                maxGasPrice: this.maxGasPrice.toString(10),
                expirationTimeSeconds: this.expirationTimeSeconds.toString(10),
                salt: this.salt.toString(10),
                callData: this.callData,
                value: this.value.toString(10),
                feeToken: this.feeToken,
                feeAmount: this.feeAmount.toString(10),
            },
        };
    }
    getHash() {
        return eip712_utils_1.getExchangeProxyEIP712Hash(this.getStructHash(), this.chainId, this.verifyingContract);
    }
    getSignatureWithProviderAsync(provider, type = signature_utils_1.SignatureType.EthSign) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (type) {
                case signature_utils_1.SignatureType.EIP712:
                    return signature_utils_1.eip712SignTypedDataWithProviderAsync(this.getEIP712TypedData(), this.signer, provider);
                case signature_utils_1.SignatureType.EthSign:
                    return signature_utils_1.ethSignHashWithProviderAsync(this.getHash(), this.signer, provider);
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
exports.MetaTransaction = MetaTransaction;
MetaTransaction.STRUCT_NAME = 'MetaTransactionData';
MetaTransaction.STRUCT_ABI = [
    { type: 'address', name: 'signer' },
    { type: 'address', name: 'sender' },
    { type: 'uint256', name: 'minGasPrice' },
    { type: 'uint256', name: 'maxGasPrice' },
    { type: 'uint256', name: 'expirationTimeSeconds' },
    { type: 'uint256', name: 'salt' },
    { type: 'bytes', name: 'callData' },
    { type: 'uint256', name: 'value' },
    { type: 'address', name: 'feeToken' },
    { type: 'uint256', name: 'feeAmount' },
];
MetaTransaction.TYPE_HASH = eip712_utils_1.getTypeHash(MetaTransaction.STRUCT_NAME, MetaTransaction.STRUCT_ABI);
//# sourceMappingURL=meta_transactions.js.map