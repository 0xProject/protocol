import { addressUtils } from '@0x/utils';

/**
 * Checks top level attributes of an object for values matching an ETH address
 * and normalizes the address by turning it to lowercase
 */
export const objectETHAddressNormalizer = <T>(obj: T) => {
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
