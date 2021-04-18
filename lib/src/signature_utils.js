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
exports.ecSignHashWithKey = exports.eip712SignHashWithKey = exports.eip712SignTypedDataWithKey = exports.eip712SignTypedDataWithProviderAsync = exports.ethSignHashWithKey = exports.ethSignHashWithProviderAsync = exports.SIGNATURE_ABI = exports.SignatureType = void 0;
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const ethjs = require("ethereumjs-util");
/**
 * Valid signature types on the Exchange Proxy.
 */
var SignatureType;
(function (SignatureType) {
    SignatureType[SignatureType["Illegal"] = 0] = "Illegal";
    SignatureType[SignatureType["Invalid"] = 1] = "Invalid";
    SignatureType[SignatureType["EIP712"] = 2] = "EIP712";
    SignatureType[SignatureType["EthSign"] = 3] = "EthSign";
})(SignatureType = exports.SignatureType || (exports.SignatureType = {}));
/**
 * ABI definition for the `Signature` struct.
 */
exports.SIGNATURE_ABI = [
    { name: 'signatureType', type: 'uint8' },
    { name: 'v', type: 'uint8' },
    { name: 'r', type: 'bytes32' },
    { name: 's', type: 'bytes32' },
];
/**
 * Sign a hash with the EthSign signature type on a provider.
 */
function ethSignHashWithProviderAsync(hash, signer, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const w3w = new web3_wrapper_1.Web3Wrapper(utils_1.providerUtils.standardizeOrThrow(provider));
        const rpcSig = yield w3w.signMessageAsync(signer, hash);
        return Object.assign(Object.assign({}, parseRpcSignature(rpcSig)), { signatureType: SignatureType.EthSign });
    });
}
exports.ethSignHashWithProviderAsync = ethSignHashWithProviderAsync;
/**
 * Sign a hash with the EthSign signature type, given a private key.
 */
function ethSignHashWithKey(hash, key) {
    const ethHash = utils_1.hexUtils.toHex(ethjs.sha3(utils_1.hexUtils.concat(ethjs.toBuffer('\x19Ethereum Signed Message:\n32'), hash)));
    return Object.assign(Object.assign({}, ecSignHashWithKey(ethHash, key)), { signatureType: SignatureType.EthSign });
}
exports.ethSignHashWithKey = ethSignHashWithKey;
/**
 * Sign a typed data object with the EIP712 signature type on a provider.
 */
function eip712SignTypedDataWithProviderAsync(data, signer, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const w3w = new web3_wrapper_1.Web3Wrapper(utils_1.providerUtils.standardizeOrThrow(provider));
        const rpcSig = yield w3w.signTypedDataAsync(signer, data);
        return Object.assign(Object.assign({}, parseRpcSignature(rpcSig)), { signatureType: SignatureType.EIP712 });
    });
}
exports.eip712SignTypedDataWithProviderAsync = eip712SignTypedDataWithProviderAsync;
/**
 * Sign a typed data object with the EIP712 signature type, given a private key.
 */
function eip712SignTypedDataWithKey(typedData, key) {
    const hash = utils_1.hexUtils.toHex(utils_1.signTypedDataUtils.generateTypedDataHash(typedData));
    return Object.assign(Object.assign({}, ecSignHashWithKey(hash, key)), { signatureType: SignatureType.EIP712 });
}
exports.eip712SignTypedDataWithKey = eip712SignTypedDataWithKey;
/**
 * Sign an EIP712 hash with the EIP712 signature type, given a private key.
 */
function eip712SignHashWithKey(hash, key) {
    return Object.assign(Object.assign({}, ecSignHashWithKey(hash, key)), { signatureType: SignatureType.EIP712 });
}
exports.eip712SignHashWithKey = eip712SignHashWithKey;
/**
 * Generate the EC signature for a hash given a private key.
 */
function ecSignHashWithKey(hash, key) {
    const { v, r, s } = ethjs.ecsign(ethjs.toBuffer(hash), ethjs.toBuffer(key));
    return {
        v,
        r: ethjs.bufferToHex(r),
        s: ethjs.bufferToHex(s),
    };
}
exports.ecSignHashWithKey = ecSignHashWithKey;
// Parse a hex signature returned by an RPC call into an `ECSignature`.
function parseRpcSignature(rpcSig) {
    if (utils_1.hexUtils.size(rpcSig) !== 65) {
        throw new Error(`Invalid RPC signature length: "${rpcSig}"`);
    }
    // Some providers encode V as 0,1 instead of 27,28.
    const VALID_V_VALUES = [0, 1, 27, 28];
    // Some providers return the signature packed as V,R,S and others R,S,V.
    // Try to guess which encoding it is (with a slight preference for R,S,V).
    let v = parseInt(rpcSig.slice(-2), 16);
    if (VALID_V_VALUES.includes(v)) {
        // Format is R,S,V
        v = v >= 27 ? v : v + 27;
        return {
            r: utils_1.hexUtils.slice(rpcSig, 0, 32),
            s: utils_1.hexUtils.slice(rpcSig, 32, 64),
            v,
        };
    }
    // Format should be V,R,S
    v = parseInt(rpcSig.slice(2, 4), 16);
    if (!VALID_V_VALUES.includes(v)) {
        throw new Error(`Cannot determine RPC signature layout from V value: "${rpcSig}"`);
    }
    v = v >= 27 ? v : v + 27;
    return {
        v,
        r: utils_1.hexUtils.slice(rpcSig, 1, 33),
        s: utils_1.hexUtils.slice(rpcSig, 33, 65),
    };
}
//# sourceMappingURL=signature_utils.js.map