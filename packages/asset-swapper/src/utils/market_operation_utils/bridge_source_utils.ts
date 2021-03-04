import { ChainId } from '@0x/contract-addresses';
import { BigNumber, NULL_BYTES } from '@0x/utils';

import {
    BAKERYSWAP_ROUTER_BY_CHAIN_ID,
    CRYPTO_COM_ROUTER_BY_CHAIN_ID,
    KYBER_BRIDGED_LIQUIDITY_PREFIX,
    MAINNET_CURVE_INFOS,
    MAINNET_SNOWSWAP_INFOS,
    MAINNET_SWERVE_INFOS,
    MAX_DODOV2_POOLS_QUERIED,
    MAX_KYBER_RESERVES_QUERIED,
    NULL_ADDRESS,
    PANCAKESWAP_ROUTER_BY_CHAIN_ID,
    SHELL_POOLS_BY_CHAIN_ID,
    SUSHISWAP_ROUTER_BY_CHAIN_ID,
    UNISWAPV2_ROUTER_BY_CHAIN_ID,
} from './constants';
import { CurveInfo, ERC20BridgeSource, SnowSwapInfo, SwerveInfo } from './types';

/**
 * Filter Kyber reserves which should not be used (0xbb bridged reserves)
 * @param reserveId Kyber reserveId
 */
export function isAllowedKyberReserveId(reserveId: string): boolean {
    return reserveId !== NULL_BYTES && !reserveId.startsWith(KYBER_BRIDGED_LIQUIDITY_PREFIX);
}

// tslint:disable-next-line: completed-docs
export function isValidAddress(address: any): address is string {
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
export function getCurveInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(MAINNET_CURVE_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getSwerveInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): SwerveInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(MAINNET_SWERVE_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function getSnowSwapInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): SnowSwapInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(MAINNET_SNOWSWAP_INFOS).filter(c =>
        [makerToken, takerToken].every(
            t =>
                (c.tokens.includes(t) && c.metaToken === undefined) ||
                (c.tokens.includes(t) && c.metaToken !== undefined && [makerToken, takerToken].includes(c.metaToken)),
        ),
    );
}

export function uniswapV2LikeRouterAddress(
    chainId: ChainId,
    source:
        | ERC20BridgeSource.UniswapV2
        | ERC20BridgeSource.SushiSwap
        | ERC20BridgeSource.CryptoCom
        | ERC20BridgeSource.PancakeSwap
        | ERC20BridgeSource.BakerySwap,
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
        case ERC20BridgeSource.BakerySwap:
            return BAKERYSWAP_ROUTER_BY_CHAIN_ID[chainId];
        default:
            throw new Error(`Unknown UniswapV2 like source ${source}`);
    }
}
