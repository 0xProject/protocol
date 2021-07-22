"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTokenDecimalsIfExists = exports.isTokenAddress = exports.findTokenAddressOrThrow = exports.isNativeWrappedSymbolOrAddress = exports.isNativeSymbolOrAddress = exports.getTokenMetadataIfExists = exports.nativeTokenSymbol = exports.nativeWrappedTokenSymbol = exports.valueByChainId = void 0;
const contract_addresses_1 = require("@0x/contract-addresses");
const index_1 = require("./index");
const ADDRESS_HEX_LENGTH = 42;
/**
 * Get the configured value for a specified chain, or the default value if none exist
 * @param rest configured values
 * @param defaultValue value to use if no configured value exists for chain
 */
function valueByChainId(rest, defaultValue) {
    // TODO I don't like this but iterating through enums is weird
    return {
        [contract_addresses_1.ChainId.Mainnet]: defaultValue,
        [contract_addresses_1.ChainId.Ropsten]: defaultValue,
        [contract_addresses_1.ChainId.Rinkeby]: defaultValue,
        [contract_addresses_1.ChainId.Kovan]: defaultValue,
        [contract_addresses_1.ChainId.Ganache]: defaultValue,
        [contract_addresses_1.ChainId.BSC]: defaultValue,
        [contract_addresses_1.ChainId.Polygon]: defaultValue,
        [contract_addresses_1.ChainId.PolygonMumbai]: defaultValue,
        ...(rest || {}),
    };
}
exports.valueByChainId = valueByChainId;
/**
 * Returns the symbol of the wrapped native token for the specified chain
 * @param chainId the integer id of the chain
 */
function nativeWrappedTokenSymbol(chainId) {
    switch (chainId) {
        case contract_addresses_1.ChainId.BSC:
            return 'WBNB';
        case contract_addresses_1.ChainId.Polygon:
            return 'WMATIC';
        default:
            return 'WETH';
    }
}
exports.nativeWrappedTokenSymbol = nativeWrappedTokenSymbol;
/**
 * Returns the symbol of the native token for the specified chain
 * @param chainId the integer id of the chain
 */
function nativeTokenSymbol(chainId) {
    switch (chainId) {
        case contract_addresses_1.ChainId.BSC:
            return 'BNB';
        case contract_addresses_1.ChainId.Polygon:
            return 'MATIC';
        default:
            return 'ETH';
    }
}
exports.nativeTokenSymbol = nativeTokenSymbol;
/**
 * Returns a TokenMetadata instance, given either a token address or symobl and the network that the token is deployed on.
 *
 * @param tokenAddressOrSymbol the address or symbol of an ERC20 token
 * @param chainId the Network ID
 */
function getTokenMetadataIfExists(tokenAddressOrSymbol, chainId) {
    let entry;
    if (isTokenAddress(tokenAddressOrSymbol)) {
        entry = index_1.TokenMetadatasForChains.find((tm) => tm.tokenAddresses[chainId].toLowerCase() === tokenAddressOrSymbol.toLowerCase());
    }
    else {
        const normalizedSymbol = tokenAddressOrSymbol.toLowerCase();
        entry = index_1.TokenMetadatasForChains.find((tm) => tm.symbol.toLowerCase() === normalizedSymbol);
    }
    if (entry) {
        return {
            symbol: entry.symbol,
            decimals: entry.decimals,
            tokenAddress: entry.tokenAddresses[chainId],
        };
    }
}
exports.getTokenMetadataIfExists = getTokenMetadataIfExists;
/**
 *  Returns true if this symbol or address represents ETH on
 *
 * @param tokenSymbolOrAddress the symbol of the token
 */
function isNativeSymbolOrAddress(tokenSymbolOrAddress, chainId) {
    const nativeAddress = getTokenMetadataIfExists(nativeTokenSymbol(chainId), chainId).tokenAddress;
    return (tokenSymbolOrAddress.toLowerCase() === nativeTokenSymbol(chainId).toLowerCase() ||
        tokenSymbolOrAddress.toLowerCase() === nativeAddress);
}
exports.isNativeSymbolOrAddress = isNativeSymbolOrAddress;
/**
 *  Returns true if this symbol represents the native token in wrapped form
 *  e.g  WETH on Ethereum networks
 *
 * @param tokenSymbol the symbol of the token
 */
function isNativeWrappedSymbolOrAddress(tokenAddressOrSymbol, chainId) {
    // force downcast to TokenMetadata the optional
    const wrappedAddress = getTokenMetadataIfExists(nativeWrappedTokenSymbol(chainId), chainId).tokenAddress;
    return (tokenAddressOrSymbol.toLowerCase() === nativeWrappedTokenSymbol(chainId).toLowerCase() ||
        tokenAddressOrSymbol.toLowerCase() === wrappedAddress);
}
exports.isNativeWrappedSymbolOrAddress = isNativeWrappedSymbolOrAddress;
/**
 * Returns the address of a token.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
function findTokenAddressOrThrow(symbolOrAddress, chainId) {
    if (isTokenAddress(symbolOrAddress)) {
        return symbolOrAddress;
    }
    const entry = getTokenMetadataIfExists(symbolOrAddress, chainId);
    if (!entry) {
        // NOTE(jalextowle): Use the original symbol to increase readability.
        throw new Error(`Could not find token \`${symbolOrAddress}\``);
    }
    return entry.tokenAddress;
}
exports.findTokenAddressOrThrow = findTokenAddressOrThrow;
/**
 * Returns whether a string is an address or not.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 */
function isTokenAddress(symbolOrAddress) {
    return symbolOrAddress.startsWith('0x') && symbolOrAddress.length === ADDRESS_HEX_LENGTH;
}
exports.isTokenAddress = isTokenAddress;
/**
 * Returns the decimals of a token.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
function findTokenDecimalsIfExists(symbolOrAddress, chainId) {
    const entry = getTokenMetadataIfExists(symbolOrAddress, chainId);
    if (entry) {
        return entry.decimals;
    }
}
exports.findTokenDecimalsIfExists = findTokenDecimalsIfExists;
