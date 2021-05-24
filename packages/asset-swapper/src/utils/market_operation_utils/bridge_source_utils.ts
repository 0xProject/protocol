import { ChainId } from '@0x/contract-addresses';
import { BigNumber, NULL_BYTES } from '@0x/utils';

import {
    APESWAP_ROUTER_BY_CHAIN_ID,
    BAKERYSWAP_ROUTER_BY_CHAIN_ID,
    BELT_BSC_INFOS,
    CAFESWAP_ROUTER_BY_CHAIN_ID,
    CHEESESWAP_ROUTER_BY_CHAIN_ID,
    COMETHSWAP_ROUTER_BY_CHAIN_ID,
    COMPONENT_POOLS_BY_CHAIN_ID,
    CRYPTO_COM_ROUTER_BY_CHAIN_ID,
    CURVE_MAINNET_INFOS,
    CURVE_POLYGON_INFOS,
    DFYN_ROUTER_BY_CHAIN_ID,
    ELLIPSIS_BSC_INFOS,
    JULSWAP_ROUTER_BY_CHAIN_ID,
    KYBER_BANNED_RESERVES,
    KYBER_BRIDGED_LIQUIDITY_PREFIX,
    MAX_DODOV2_POOLS_QUERIED,
    MAX_KYBER_RESERVES_QUERIED,
    MSTABLE_POOLS_BY_CHAIN_ID,
    NERVE_BSC_INFOS,
    NULL_ADDRESS,
    PANCAKESWAP_ROUTER_BY_CHAIN_ID,
    PANCAKESWAPV2_ROUTER_BY_CHAIN_ID,
    QUICKSWAP_ROUTER_BY_CHAIN_ID,
    SADDLE_MAINNET_INFOS,
    SHELL_POOLS_BY_CHAIN_ID,
    SMOOTHY_BSC_INFOS,
    SMOOTHY_MAINNET_INFOS,
    SNOWSWAP_MAINNET_INFOS,
    SUSHISWAP_ROUTER_BY_CHAIN_ID,
    SWERVE_MAINNET_INFOS,
    UNISWAPV2_ROUTER_BY_CHAIN_ID,
    XSIGMA_MAINNET_INFOS,
} from './constants';
import { CurveInfo, ERC20BridgeSource } from './types';

/**
 * Filter Kyber reserves which should not be used (0xbb bridged reserves)
 * @param reserveId Kyber reserveId
 */
export function isAllowedKyberReserveId(reserveId: string): boolean {
    return (
        reserveId !== NULL_BYTES &&
        !reserveId.startsWith(KYBER_BRIDGED_LIQUIDITY_PREFIX) &&
        !KYBER_BANNED_RESERVES.includes(reserveId)
    );
}

// tslint:disable-next-line: completed-docs ban-types
export function isValidAddress(address: string | String): address is string {
    return (typeof address === 'string' || address instanceof String) && address.toString() !== NULL_ADDRESS;
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
export function getShellsForPair(chainId: ChainId, takerToken: string, makerToken: string): string[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(SHELL_POOLS_BY_CHAIN_ID[chainId])
        .filter(c => [makerToken, takerToken].every(t => c.tokens.includes(t)))
        .map(i => i.poolAddress);
}

// tslint:disable completed-docs
export function getComponentForPair(chainId: ChainId, takerToken: string, makerToken: string): string[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(COMPONENT_POOLS_BY_CHAIN_ID[chainId])
        .filter(c => [makerToken, takerToken].every(t => c.tokens.includes(t)))
        .map(i => i.poolAddress);
}

// tslint:disable completed-docs
export function getMStableForPair(chainId: ChainId, takerToken: string, makerToken: string): string[] {
    if (chainId !== ChainId.Mainnet && chainId !== ChainId.Polygon) {
        return [];
    }
    return Object.values(MSTABLE_POOLS_BY_CHAIN_ID[chainId])
        .filter(c => [makerToken, takerToken].every(t => c.tokens.includes(t)))
        .map(i => i.poolAddress);
}

// tslint:disable completed-docs
export function getCurveInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    switch (chainId) {
        case ChainId.Mainnet:
            return Object.values(CURVE_MAINNET_INFOS).filter(c =>
                [makerToken, takerToken].every(
                    t =>
                        (c.tokens.includes(t) && c.metaToken === undefined) ||
                        (c.tokens.includes(t) &&
                            c.metaToken !== undefined &&
                            [makerToken, takerToken].includes(c.metaToken)),
                ),
            );
        case ChainId.Polygon:
            return Object.values(CURVE_POLYGON_INFOS).filter(c =>
                [makerToken, takerToken].every(
                    t =>
                        (c.tokens.includes(t) && c.metaToken === undefined) ||
                        (c.tokens.includes(t) &&
                            c.metaToken !== undefined &&
                            [makerToken, takerToken].includes(c.metaToken)),
                ),
            );
        default:
            return [];
    }
}

export function getSwerveInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(SWERVE_MAINNET_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getSnowSwapInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(SNOWSWAP_MAINNET_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getNerveInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.BSC) {
        return [];
    }
    return Object.values(NERVE_BSC_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getBeltInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.BSC) {
        return [];
    }
    return Object.values(BELT_BSC_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getEllipsisInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.BSC) {
        return [];
    }
    return Object.values(ELLIPSIS_BSC_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getSmoothyInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId === ChainId.BSC) {
        return Object.values(SMOOTHY_BSC_INFOS).filter(c =>
            [makerToken, takerToken].every(
                t =>
                    (c.tokens.includes(t) && c.metaToken === undefined) ||
                    (c.tokens.includes(t) &&
                        c.metaToken !== undefined &&
                        [makerToken, takerToken].includes(c.metaToken)),
            ),
        );
    } else if (chainId === ChainId.Mainnet) {
        return Object.values(SMOOTHY_MAINNET_INFOS).filter(c =>
            [makerToken, takerToken].every(
                t =>
                    (c.tokens.includes(t) && c.metaToken === undefined) ||
                    (c.tokens.includes(t) &&
                        c.metaToken !== undefined &&
                        [makerToken, takerToken].includes(c.metaToken)),
            ),
        );
    } else {
        return [];
    }
}

export function getSaddleInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(SADDLE_MAINNET_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getXSigmaInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(XSIGMA_MAINNET_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getShellLikeInfosForPair(
    chainId: ChainId,
    takerToken: string,
    makerToken: string,
    source: ERC20BridgeSource.Shell | ERC20BridgeSource.Component | ERC20BridgeSource.MStable,
): string[] {
    switch (source) {
        case ERC20BridgeSource.Shell:
            return getShellsForPair(chainId, takerToken, makerToken);
        case ERC20BridgeSource.Component:
            return getComponentForPair(chainId, takerToken, makerToken);
        case ERC20BridgeSource.MStable:
            return getMStableForPair(chainId, takerToken, makerToken);
        default:
            throw new Error(`Unknown Shell like source ${source}`);
    }
}

export interface CurveDetailedInfo extends CurveInfo {
    makerTokenIdx: number;
    takerTokenIdx: number;
}

export function getCurveLikeInfosForPair(
    chainId: ChainId,
    takerToken: string,
    makerToken: string,
    source:
        | ERC20BridgeSource.Curve
        | ERC20BridgeSource.Swerve
        | ERC20BridgeSource.SnowSwap
        | ERC20BridgeSource.Nerve
        | ERC20BridgeSource.Belt
        | ERC20BridgeSource.Ellipsis
        | ERC20BridgeSource.Smoothy
        | ERC20BridgeSource.Saddle
        | ERC20BridgeSource.XSigma,
): CurveDetailedInfo[] {
    let pools: CurveInfo[] = [];
    switch (source) {
        case ERC20BridgeSource.Curve:
            pools = getCurveInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Swerve:
            pools = getSwerveInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.SnowSwap:
            pools = getSnowSwapInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Nerve:
            pools = getNerveInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Belt:
            pools = getBeltInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Ellipsis:
            pools = getEllipsisInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Smoothy:
            pools = getSmoothyInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Saddle:
            pools = getSaddleInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.XSigma:
            pools = getXSigmaInfosForPair(chainId, takerToken, makerToken);
            break;
        default:
            throw new Error(`Unknown Curve like source ${source}`);
    }
    return pools.map(pool => ({
        ...pool,
        makerTokenIdx: pool.tokens.indexOf(makerToken),
        takerTokenIdx: pool.tokens.indexOf(takerToken),
    }));
}

export function uniswapV2LikeRouterAddress(
    chainId: ChainId,
    source:
        | ERC20BridgeSource.UniswapV2
        | ERC20BridgeSource.SushiSwap
        | ERC20BridgeSource.CryptoCom
        | ERC20BridgeSource.PancakeSwap
        | ERC20BridgeSource.PancakeSwapV2
        | ERC20BridgeSource.BakerySwap
        | ERC20BridgeSource.ApeSwap
        | ERC20BridgeSource.CafeSwap
        | ERC20BridgeSource.CheeseSwap
        | ERC20BridgeSource.JulSwap
        | ERC20BridgeSource.QuickSwap
        | ERC20BridgeSource.ComethSwap
        | ERC20BridgeSource.Dfyn,
): string {
    switch (source) {
        case ERC20BridgeSource.UniswapV2:
            return UNISWAPV2_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.SushiSwap:
            return SUSHISWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.CryptoCom:
            return CRYPTO_COM_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.PancakeSwap:
            return PANCAKESWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.PancakeSwapV2:
            return PANCAKESWAPV2_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.BakerySwap:
            return BAKERYSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.ApeSwap:
            return APESWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.CafeSwap:
            return CAFESWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.CheeseSwap:
            return CHEESESWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.JulSwap:
            return JULSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.QuickSwap:
            return QUICKSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.ComethSwap:
            return COMETHSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.Dfyn:
            return DFYN_ROUTER_BY_CHAIN_ID[chainId];
        default:
            throw new Error(`Unknown UniswapV2 like source ${source}`);
    }
}

const BAD_TOKENS_BY_SOURCE: Partial<{ [key in ERC20BridgeSource]: string[] }> = {
    [ERC20BridgeSource.Uniswap]: [
        '0xb8c77482e45f1f44de1745f52c74426c631bdd52', // BNB
    ],
};

export function isBadTokenForSource(token: string, source: ERC20BridgeSource): boolean {
    return (BAD_TOKENS_BY_SOURCE[source] || []).includes(token.toLowerCase());
}
