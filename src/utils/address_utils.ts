import { ValidationError, ValidationErrorCodes } from '@0x/api-utils';
import { findTokenAddressOrThrow } from '@0x/token-metadata';
import { addressUtils } from '@0x/utils';

import { ChainId } from '../asset-swapper';

/**
 * Checks top level attributes of an object for values matching an ETH address
 * and normalizes the address by turning it to lowercase
 */
export const objectETHAddressNormalizer = <T>(obj: T) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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
