import { ChainId } from '@0x/contract-addresses';
export interface TokenMetadata {
    symbol: string;
    decimals: number;
    tokenAddress: string;
}
/**
 * Get the configured value for a specified chain, or the default value if none exist
 * @param rest configured values
 * @param defaultValue value to use if no configured value exists for chain
 */
export declare function valueByChainId<T>(rest: Partial<{
    [key in ChainId]: T;
}>, defaultValue: T): {
    [key in ChainId]: T;
};
/**
 * Returns the symbol of the wrapped native token for the specified chain
 * @param chainId the integer id of the chain
 */
export declare function nativeWrappedTokenSymbol(chainId: ChainId): string;
/**
 * Returns the symbol of the native token for the specified chain
 * @param chainId the integer id of the chain
 */
export declare function nativeTokenSymbol(chainId: ChainId): string;
/**
 * Returns a TokenMetadata instance, given either a token address or symobl and the network that the token is deployed on.
 *
 * @param tokenAddressOrSymbol the address or symbol of an ERC20 token
 * @param chainId the Network ID
 */
export declare function getTokenMetadataIfExists(tokenAddressOrSymbol: string, chainId: ChainId): TokenMetadata | undefined;
/**
 *  Returns true if this symbol or address represents ETH on
 *
 * @param tokenSymbolOrAddress the symbol of the token
 */
export declare function isNativeSymbolOrAddress(tokenSymbolOrAddress: string, chainId: ChainId): boolean;
/**
 *  Returns true if this symbol represents the native token in wrapped form
 *  e.g  WETH on Ethereum networks
 *
 * @param tokenSymbol the symbol of the token
 */
export declare function isNativeWrappedSymbolOrAddress(tokenAddressOrSymbol: string, chainId: number): boolean;
/**
 * Returns the address of a token.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
export declare function findTokenAddressOrThrow(symbolOrAddress: string, chainId: ChainId): string;
/**
 * Returns whether a string is an address or not.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 */
export declare function isTokenAddress(symbolOrAddress: string): boolean;
/**
 * Returns the decimals of a token.
 *
 * @param symbolOrAddress the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
export declare function findTokenDecimalsIfExists(symbolOrAddress: string, chainId: ChainId): number | undefined;
//# sourceMappingURL=utils.d.ts.map