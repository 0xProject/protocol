import { BigNumber, NULL_BYTES } from '@0x/utils';

import { KYBER_BRIDGED_LIQUIDITY_PREFIX, MAX_KYBER_RESERVES_QUERIED } from './constants';

/**
 * Filter Kyber reserves which should not be used (0xbb bridged reserves)
 * @param reserveId Kyber reserveId
 */
export function isAllowedKyberReserveId(reserveId: string): boolean {
    return reserveId !== NULL_BYTES && !reserveId.startsWith(KYBER_BRIDGED_LIQUIDITY_PREFIX);
}

/**
 * Returns the offsets to be used to discover Kyber reserves
 */
export function getKyberOffsets(): BigNumber[] {
    return Array(MAX_KYBER_RESERVES_QUERIED)
        .fill(0)
        .map((_v, i) => new BigNumber(i));
}
