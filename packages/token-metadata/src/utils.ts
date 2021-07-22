import { ChainId } from '@0x/contract-addresses';
import { TokenMetadatasForChains } from './token_metadata';

export interface TokenMetadata {
    symbol: string;
    decimals: number;
    tokenAddress: string;
}

const ADDRESS_HEX_LENGTH = 42;

/**
 * Get the configured value for a specified chain, or the default value if none exist
 * @param rest configured values
 * @param defaultValue value to use if no configured value exists for chain
 */
export function valueByChainId<T>(
    rest: Partial<
        {
            [key in ChainId]: T;
        }
    >,
    defaultValue: T,
) {
    // TODO I don't like this but iterating through enums is weird
    return {
        [ChainId.Mainnet]: defaultValue,
        [ChainId.Ropsten]: defaultValue,
        [ChainId.Rinkeby]: defaultValue,
        [ChainId.Kovan]: defaultValue,
        [ChainId.Ganache]: defaultValue,
        [ChainId.BSC]: defaultValue,
        [ChainId.Chapel]: defaultValue,
        [ChainId.Polygon]: defaultValue,
        [ChainId.PolygonMumbai]: defaultValue,
        ...(rest || {}),
    };
}

/**
 * Returns the symbol of the wrapped native token for the specified chain
 * @param chainId the integer id of the chain
 */
export function nativeWrappedTokenSymbol(chainId: ChainId): string {
    switch (chainId) {
        case ChainId.BSC:
            return 'WBNB';
        case ChainId.Polygon:
            return 'WMATIC';
        default:
            return 'WETH';
    }
}

/**
 * Returns the symbol of the native token for the specified chain
 * @param chainId the integer id of the chain
 */
export function nativeTokenSymbol(chainId: ChainId): string {
    switch (chainId) {
        case ChainId.BSC:
            return 'BNB';
        case ChainId.Polygon:
            return 'MATIC';
        default:
            return 'ETH';
    }
}

/**
 * Returns a TokenMetadata instance, given either a token address or symobl and the network that the token is deployed on.
 *
 * @param tokenAddressOrSymbol the address or symbol of an ERC20 token
 * @param chainId the Network ID
 */
export function getTokenMetadataIfExists(tokenAddressOrSymbol: string, chainId: ChainId): TokenMetadata | undefined {
    let entry;
    if (isTokenAddress(tokenAddressOrSymbol)) {
        entry = TokenMetadatasForChains.find(
            tm => tm.tokenAddresses[chainId].toLowerCase() === tokenAddressOrSymbol.toLowerCase(),
        );
    } else {
        const normalizedSymbol = tokenAddressOrSymbol.toLowerCase();
        entry = TokenMetadatasForChains.find(tm => tm.symbol.toLowerCase() === normalizedSymbol);
    }
    if (entry) {
        return {
            symbol: entry.symbol,
            decimals: entry.decimals,
            tokenAddress: entry.tokenAddresses[chainId],
        };
    }
    return undefined;
}

/**
 *  Returns true if this symbol or address represents ETH on
 *
 * @param tokenSymbolOrAddress the symbol of the token
 */
export function isNativeSymbolOrAddress(tokenSymbolOrAddress: string, chainId: ChainId): boolean {
    const nativeAddress = getTokenMetadataIfExists(nativeTokenSymbol(chainId), chainId)?.tokenAddress;
    return (
        tokenSymbolOrAddress.toLowerCase() === nativeTokenSymbol(chainId).toLowerCase() ||
        tokenSymbolOrAddress.toLowerCase() === nativeAddress
    );
}

/**
 *  Returns true if this symbol represents the native token in wrapped form
 *  e.g  WETH on Ethereum networks
 *
 * @param tokenSymbol the symbol of the token
 */
export function isNativeWrappedSymbolOrAddress(tokenAddressOrSymbol: string, chainId: ChainId): boolean {
    // force downcast to TokenMetadata the optional
    const wrappedAddress = getTokenMetadataIfExists(nativeWrappedTokenSymbol(chainId), chainId)?.tokenAddress;
    return (
        tokenAddressOrSymbol.toLowerCase() === nativeWrappedTokenSymbol(chainId).toLowerCase() ||
        tokenAddressOrSymbol.toLowerCase() === wrappedAddress
    );
}

/**
 * Returns the address of a token.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
export function findTokenAddressOrThrow(symbolOrAddress: string, chainId: ChainId): string {
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

/**
 * Returns whether a string is an address or not.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 */
export function isTokenAddress(symbolOrAddress: string): boolean {
    return symbolOrAddress.startsWith('0x') && symbolOrAddress.length === ADDRESS_HEX_LENGTH;
}

/**
 * Returns the decimals of a token.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
export function findTokenDecimalsIfExists(symbolOrAddress: string, chainId: ChainId): number | undefined {
    const entry = getTokenMetadataIfExists(symbolOrAddress, chainId);
    if (entry) {
        return entry.decimals;
    }
    return undefined;
}
