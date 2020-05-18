import { ADDRESS_HEX_LENGTH, ETH_SYMBOL, WETH_SYMBOL } from '../constants';
import { ValidationError, ValidationErrorCodes } from '../errors';
import { TokenMetadataAndChainAddresses, TokenMetadatasForChains } from '../token_metadatas_for_networks';
import { ChainId, TokenMetadata } from '../types';

/**
 * Returns a TokenMetadata instance, given either a token address or symobl and the network that the token is deployed on.
 *
 * @param tokenAddressOrSymbol the address or symbol of an ERC20 token
 * @param chainId the Network ID
 */
export function getTokenMetadataIfExists(tokenAddressOrSymbol: string, chainId: ChainId): TokenMetadata | undefined {
    let entry: TokenMetadataAndChainAddresses | undefined;
    if (isTokenAddress(tokenAddressOrSymbol)) {
        entry = TokenMetadatasForChains.find(
            tm => tm.tokenAddresses[chainId].toLowerCase() === tokenAddressOrSymbol.toLowerCase(),
        );
    } else {
        const normalizedSymbol = (isETHSymbol(tokenAddressOrSymbol) ? 'WETH' : tokenAddressOrSymbol).toLowerCase();
        entry = TokenMetadatasForChains.find(tm => tm.symbol.toLowerCase() === normalizedSymbol);
    }

    if (entry) {
        return {
            symbol: entry.symbol,
            decimals: entry.decimals,
            tokenAddress: entry.tokenAddresses[chainId],
        };
    }
}

/**
 *  Returns true if this symbol represents ETH
 *
 * @param tokenSymbol the symbol of the token
 */
export function isETHSymbol(tokenSymbol: string): boolean {
    return tokenSymbol.toLowerCase() === ETH_SYMBOL.toLowerCase();
}

/**
 *  Returns true if this symbol represents WETH
 *
 * @param tokenSymbol the symbol of the token
 */
export function isWETHSymbolOrAddress(tokenAddressOrSymbol: string, chainId: number): boolean {
    // force downcast to TokenMetadata the optional
    const wethAddress = ((getTokenMetadataIfExists(WETH_SYMBOL, chainId) as any) as TokenMetadata).tokenAddress;
    return (
        tokenAddressOrSymbol.toLowerCase() === WETH_SYMBOL.toLowerCase() ||
        tokenAddressOrSymbol.toLowerCase() === wethAddress
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
 * Attempts to find the address of the token and throws if not found
 *
 * @param address the uppercase symbol of the token (ex. `REP`) or the address of the contract
 * @param chainId the Network where the address should be hosted on.
 */
export function findTokenAddressOrThrowApiError(address: string, field: string, chainId: ChainId): string {
    try {
        return findTokenAddressOrThrow(address, chainId);
    } catch (e) {
        throw new ValidationError([
            {
                field,
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: e.message,
            },
        ]);
    }
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
}
