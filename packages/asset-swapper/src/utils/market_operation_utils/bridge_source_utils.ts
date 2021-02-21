import { BigNumber, NULL_BYTES } from '@0x/utils';

import {
    KYBER_BRIDGED_LIQUIDITY_PREFIX,
    MAINNET_SHELL_POOLS,
    MAINNET_SNOWSWAP_INFOS,
    MAINNET_SWERVE_INFOS,
    MAX_DODOV2_POOLS_QUERIED,
    MAX_KYBER_RESERVES_QUERIED,
} from './constants';
import { CurveInfo, SnowSwapInfo, SwerveInfo } from './types';

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

// tslint:disable completed-docs
export function getDodoV2Offsets(): BigNumber[] {
    return Array(MAX_DODOV2_POOLS_QUERIED)
        .fill(0)
        .map((_v, i) => new BigNumber(i));
}

// tslint:disable completed-docs
export function getShellsForPair(takerToken: string, makerToken: string): string[] {
    return Object.values(MAINNET_SHELL_POOLS)
        .filter(c => [makerToken, takerToken].every(t => c.tokens.includes(t)))
        .map(i => i.poolAddress);
}

// tslint:disable completed-docs
export function getCurveInfosForPair(takerToken: string, makerToken: string): CurveInfo[] {
    return Object.values(MAINNET_SWERVE_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getSwerveInfosForPair(takerToken: string, makerToken: string): SwerveInfo[] {
    return Object.values(MAINNET_SWERVE_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getSnowSwapInfosForPair(takerToken: string, makerToken: string): SnowSwapInfo[] {
    return Object.values(MAINNET_SNOWSWAP_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}
