import { ValidationError, ValidationErrorCodes } from '@0x/api-utils';
import { ChainId } from '@0x/contract-addresses';
import { findTokenAddressOrThrow } from '@0x/token-metadata';
import { addressUtils } from '@0x/utils';

import { ERC20Owner } from '../core/types';

/**
 * Checks top level attributes of an object for values matching an ETH address
 * and normalizes the address by turning it to lowercase
 */
export const objectETHAddressNormalizer = <T extends Record<string, unknown>>(obj: T) => {
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && addressUtils.isAddress(value as string)) {
            normalized[key] = (value as string).toLowerCase();
        }
    }

    return {
        ...obj,
        ...normalized,
    };
};

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
 * Splits an array of ERC20Owner objects into string arrays of owner and token addresses.
 * This serves as an intermediate step before passing the objects to the Balance Checker contract.
 */
export function splitAddresses(erc20Owners: ERC20Owner | ERC20Owner[]): { owners: string[]; tokens: string[] } {
    const splitAddrs: { owners: string[]; tokens: string[] } = { owners: [], tokens: [] };
    if (Array.isArray(erc20Owners)) {
        return erc20Owners.reduce(({ owners, tokens }, erc20Owner) => {
            return {
                owners: owners.concat(erc20Owner.owner),
                tokens: tokens.concat(erc20Owner.token),
            };
        }, splitAddrs);
    } else {
        return {
            owners: [erc20Owners.owner],
            tokens: [erc20Owners.token],
        };
    }
}
