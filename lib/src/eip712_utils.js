"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypeHash = exports.getExchangeProxyEIP712Hash = exports.getExchangeProxyEIP712DomainHash = exports.createExchangeProxyEIP712Domain = exports.EIP712_DOMAIN_PARAMETERS = void 0;
const utils_1 = require("@0x/utils");
exports.EIP712_DOMAIN_PARAMETERS = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
];
const EXCHANGE_PROXY_EIP712_DOMAIN_DEFAULT = {
    chainId: 1,
    verifyingContract: utils_1.NULL_ADDRESS,
    name: 'ZeroEx',
    version: '1.0.0',
};
const EXCHANGE_PROXY_DOMAIN_TYPEHASH = utils_1.hexUtils.hash(utils_1.hexUtils.toHex(Buffer.from([
    'EIP712Domain(',
    ['string name', 'string version', 'uint256 chainId', 'address verifyingContract'].join(','),
    ')',
].join(''))));
/**
 * Create an exchange proxy EIP712 domain.
 */
function createExchangeProxyEIP712Domain(chainId, verifyingContract) {
    return Object.assign(Object.assign(Object.assign({}, EXCHANGE_PROXY_EIP712_DOMAIN_DEFAULT), (chainId ? { chainId } : {})), (verifyingContract ? { verifyingContract } : {}));
}
exports.createExchangeProxyEIP712Domain = createExchangeProxyEIP712Domain;
/**
 * Get the hash of the exchange proxy EIP712 domain.
 */
function getExchangeProxyEIP712DomainHash(chainId, verifyingContract) {
    const domain = createExchangeProxyEIP712Domain(chainId, verifyingContract);
    return utils_1.hexUtils.hash(utils_1.hexUtils.concat(EXCHANGE_PROXY_DOMAIN_TYPEHASH, utils_1.hexUtils.hash(utils_1.hexUtils.toHex(Buffer.from(domain.name))), utils_1.hexUtils.hash(utils_1.hexUtils.toHex(Buffer.from(domain.version))), utils_1.hexUtils.leftPad(domain.chainId), utils_1.hexUtils.leftPad(domain.verifyingContract)));
}
exports.getExchangeProxyEIP712DomainHash = getExchangeProxyEIP712DomainHash;
/**
 * Compute a complete EIP712 hash given a struct hash.
 */
function getExchangeProxyEIP712Hash(structHash, chainId, verifyingContract) {
    return utils_1.hexUtils.hash(utils_1.hexUtils.concat('0x1901', getExchangeProxyEIP712DomainHash(chainId, verifyingContract), structHash));
}
exports.getExchangeProxyEIP712Hash = getExchangeProxyEIP712Hash;
/**
 * Compute the type hash of an EIP712 struct given its ABI.
 */
function getTypeHash(structName, abi) {
    return utils_1.hexUtils.hash(utils_1.hexUtils.toHex(Buffer.from([`${structName}(`, abi.map(a => `${a.type} ${a.name}`).join(','), ')'].join(''))));
}
exports.getTypeHash = getTypeHash;
//# sourceMappingURL=eip712_utils.js.map