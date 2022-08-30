import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import {
    ACRYPTOS_BSC_INFOS,
    APESWAP_ROUTER_BY_CHAIN_ID,
    BAKERYSWAP_ROUTER_BY_CHAIN_ID,
    BELT_BSC_INFOS,
    BISWAP_ROUTER_BY_CHAIN_ID,
    CHEESESWAP_ROUTER_BY_CHAIN_ID,
    COMPONENT_POOLS_BY_CHAIN_ID,
    CRYPTO_COM_ROUTER_BY_CHAIN_ID,
    CURVE_ARBITRUM_INFOS,
    CURVE_AVALANCHE_INFOS,
    CURVE_FANTOM_INFOS,
    CURVE_MAINNET_INFOS,
    CURVE_OPTIMISM_INFOS,
    CURVE_POLYGON_INFOS,
    CURVE_V2_AVALANCHE_INFOS,
    CURVE_V2_FANTOM_INFOS,
    CURVE_V2_MAINNET_INFOS,
    CURVE_V2_POLYGON_INFOS,
    DFYN_ROUTER_BY_CHAIN_ID,
    ELLIPSIS_BSC_INFOS,
    FIREBIRDONESWAP_BSC_INFOS,
    FIREBIRDONESWAP_POLYGON_INFOS,
    IRONSWAP_POLYGON_INFOS,
    KNIGHTSWAP_ROUTER_BY_CHAIN_ID,
    MAX_DODOV2_POOLS_QUERIED,
    MDEX_ROUTER_BY_CHAIN_ID,
    MESHSWAP_ROUTER_BY_CHAIN_ID,
    MOBIUSMONEY_CELO_INFOS,
    MORPHEUSSWAP_ROUTER_BY_CHAIN_ID,
    MSTABLE_POOLS_BY_CHAIN_ID,
    NERVE_BSC_INFOS,
    NULL_ADDRESS,
    PANCAKESWAPV2_ROUTER_BY_CHAIN_ID,
    PANCAKESWAP_ROUTER_BY_CHAIN_ID,
    PANGOLIN_ROUTER_BY_CHAIN_ID,
    PLATYPUS_AVALANCHE_INFOS,
    QUICKSWAP_ROUTER_BY_CHAIN_ID,
    SADDLE_MAINNET_INFOS,
    SHELL_POOLS_BY_CHAIN_ID,
    SHIBASWAP_ROUTER_BY_CHAIN_ID,
    SPIRITSWAP_ROUTER_BY_CHAIN_ID,
    SPOOKYSWAP_ROUTER_BY_CHAIN_ID,
    SUSHISWAP_ROUTER_BY_CHAIN_ID,
    SYNAPSE_ARBITRUM_INFOS,
    SYNAPSE_AVALANCHE_INFOS,
    SYNAPSE_BSC_INFOS,
    SYNAPSE_FANTOM_INFOS,
    SYNAPSE_MAINNET_INFOS,
    SYNAPSE_OPTIMISM_INFOS,
    SYNAPSE_POLYGON_INFOS,
    TRADER_JOE_ROUTER_BY_CHAIN_ID,
    UBESWAP_ROUTER_BY_CHAIN_ID,
    UNISWAPV2_ROUTER_BY_CHAIN_ID,
    WAULTSWAP_ROUTER_BY_CHAIN_ID,
    XSIGMA_MAINNET_INFOS,
    YOSHI_ROUTER_BY_CHAIN_ID,
} from './constants';
import { CurveInfo, ERC20BridgeSource, PlatypusInfo } from './types';

// eslint-disable-next-line @typescript-eslint/ban-types
export function isValidAddress(address: string | String): address is string {
    return (typeof address === 'string' || address instanceof String) && address.toString() !== NULL_ADDRESS;
}

export function getDodoV2Offsets(): BigNumber[] {
    return Array(MAX_DODOV2_POOLS_QUERIED)
        .fill(0)
        .map((_v, i) => new BigNumber(i));
}

export function getShellsForPair(chainId: ChainId, takerToken: string, makerToken: string): string[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(SHELL_POOLS_BY_CHAIN_ID[chainId])
        .filter((c) => [makerToken, takerToken].every((t) => c.tokens.includes(t)))
        .map((i) => i.poolAddress);
}

export function getComponentForPair(chainId: ChainId, takerToken: string, makerToken: string): string[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(COMPONENT_POOLS_BY_CHAIN_ID[chainId])
        .filter((c) => [makerToken, takerToken].every((t) => c.tokens.includes(t)))
        .map((i) => i.poolAddress);
}

export function getMStableForPair(chainId: ChainId, takerToken: string, makerToken: string): string[] {
    if (chainId !== ChainId.Mainnet && chainId !== ChainId.Polygon) {
        return [];
    }
    return Object.values(MSTABLE_POOLS_BY_CHAIN_ID[chainId])
        .filter((c) => [makerToken, takerToken].every((t) => c.tokens.includes(t)))
        .map((i) => i.poolAddress);
}

export function getCurveInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    switch (chainId) {
        case ChainId.Mainnet:
            return Object.values(CURVE_MAINNET_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Polygon:
            return Object.values(CURVE_POLYGON_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Fantom:
            return Object.values(CURVE_FANTOM_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Avalanche:
            return Object.values(CURVE_AVALANCHE_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Optimism:
            return Object.values(CURVE_OPTIMISM_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Arbitrum:
            return Object.values(CURVE_ARBITRUM_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        default:
            return [];
    }
}

export function getCurveV2InfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    switch (chainId) {
        case ChainId.Mainnet:
            return Object.values(CURVE_V2_MAINNET_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Polygon:
            return Object.values(CURVE_V2_POLYGON_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Fantom:
            return Object.values(CURVE_V2_FANTOM_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Avalanche:
            return Object.values(CURVE_V2_AVALANCHE_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        default:
            return [];
    }
}

export function getNerveInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.BSC) {
        return [];
    }
    return Object.values(NERVE_BSC_INFOS).filter((c) =>
        [makerToken, takerToken].every(
            (t) =>
                (c.tokens.includes(t) && c.metaTokens === undefined) ||
                (c.tokens.includes(t) && [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
        ),
    );
}

export function getSynapseInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    switch (chainId) {
        case ChainId.Mainnet:
            return Object.values(SYNAPSE_MAINNET_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Optimism:
            return Object.values(SYNAPSE_OPTIMISM_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.BSC:
            return Object.values(SYNAPSE_BSC_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Polygon:
            return Object.values(SYNAPSE_POLYGON_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Fantom:
            return Object.values(SYNAPSE_FANTOM_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Avalanche:
            return Object.values(SYNAPSE_AVALANCHE_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        case ChainId.Arbitrum:
            return Object.values(SYNAPSE_ARBITRUM_INFOS).filter((c) =>
                [makerToken, takerToken].every(
                    (t) =>
                        (c.tokens.includes(t) && c.metaTokens === undefined) ||
                        (c.tokens.includes(t) &&
                            [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
                ),
            );
        default:
            return [];
    }
}

export function getFirebirdOneSwapInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId === ChainId.BSC) {
        return Object.values(FIREBIRDONESWAP_BSC_INFOS).filter((c) =>
            [makerToken, takerToken].every(
                (t) =>
                    (c.tokens.includes(t) && c.metaTokens === undefined) ||
                    (c.tokens.includes(t) &&
                        [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
            ),
        );
    } else if (chainId === ChainId.Polygon) {
        return Object.values(FIREBIRDONESWAP_POLYGON_INFOS).filter((c) =>
            [makerToken, takerToken].every(
                (t) =>
                    (c.tokens.includes(t) && c.metaTokens === undefined) ||
                    (c.tokens.includes(t) &&
                        [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
            ),
        );
    } else {
        return [];
    }
}

export function getBeltInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.BSC) {
        return [];
    }
    return Object.values(BELT_BSC_INFOS).filter((c) =>
        [makerToken, takerToken].every(
            (t) =>
                (c.tokens.includes(t) && c.metaTokens === undefined) ||
                (c.tokens.includes(t) && [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
        ),
    );
}

export function getEllipsisInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.BSC) {
        return [];
    }
    return Object.values(ELLIPSIS_BSC_INFOS).filter((c) =>
        [makerToken, takerToken].every(
            (t) =>
                (c.tokens.includes(t) && c.metaTokens === undefined) ||
                (c.tokens.includes(t) && [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
        ),
    );
}

export function getSaddleInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(SADDLE_MAINNET_INFOS).filter((c) =>
        [makerToken, takerToken].every(
            (t) =>
                (c.tokens.includes(t) && c.metaTokens === undefined) ||
                (c.tokens.includes(t) && [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
        ),
    );
}

export function getIronSwapInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Polygon) {
        return [];
    }
    return Object.values(IRONSWAP_POLYGON_INFOS).filter((c) =>
        [makerToken, takerToken].every(
            (t) =>
                (c.tokens.includes(t) && c.metaTokens === undefined) ||
                (c.tokens.includes(t) && [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
        ),
    );
}

export function getXSigmaInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Mainnet) {
        return [];
    }
    return Object.values(XSIGMA_MAINNET_INFOS).filter((c) =>
        [makerToken, takerToken].every(
            (t) =>
                (c.tokens.includes(t) && c.metaTokens === undefined) ||
                (c.tokens.includes(t) && [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
        ),
    );
}

export function getAcryptosInfosForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.BSC) {
        return [];
    }
    return Object.values(ACRYPTOS_BSC_INFOS).filter((c) =>
        [makerToken, takerToken].every(
            (t) =>
                (c.tokens.includes(t) && c.metaTokens === undefined) ||
                (c.tokens.includes(t) && [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
        ),
    );
}
export function getMobiusMoneyInfoForPair(chainId: ChainId, takerToken: string, makerToken: string): CurveInfo[] {
    if (chainId !== ChainId.Celo) {
        return [];
    }
    return Object.values(MOBIUSMONEY_CELO_INFOS).filter((c) =>
        [makerToken, takerToken].every(
            (t) =>
                (c.tokens.includes(t) && c.metaTokens === undefined) ||
                (c.tokens.includes(t) && [makerToken, takerToken].filter((v) => c.metaTokens?.includes(v)).length > 0),
        ),
    );
}

export function getPlatypusInfoForPair(chainId: ChainId, takerToken: string, makerToken: string): PlatypusInfo[] {
    if (chainId !== ChainId.Avalanche) {
        return [];
    }
    return Object.values(PLATYPUS_AVALANCHE_INFOS).filter((c) =>
        [makerToken, takerToken].every((t) => c.tokens.includes(t)),
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
        | ERC20BridgeSource.CurveV2
        | ERC20BridgeSource.Nerve
        | ERC20BridgeSource.Synapse
        | ERC20BridgeSource.Belt
        | ERC20BridgeSource.Ellipsis
        | ERC20BridgeSource.Saddle
        | ERC20BridgeSource.IronSwap
        | ERC20BridgeSource.XSigma
        | ERC20BridgeSource.FirebirdOneSwap
        | ERC20BridgeSource.ACryptos
        | ERC20BridgeSource.MobiusMoney,
): CurveDetailedInfo[] {
    let pools: CurveInfo[] = [];
    switch (source) {
        case ERC20BridgeSource.Curve:
            pools = getCurveInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.CurveV2:
            pools = getCurveV2InfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Nerve:
            pools = getNerveInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Synapse:
            pools = getSynapseInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Belt:
            pools = getBeltInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Ellipsis:
            pools = getEllipsisInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.Saddle:
            pools = getSaddleInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.XSigma:
            pools = getXSigmaInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.FirebirdOneSwap:
            pools = getFirebirdOneSwapInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.IronSwap:
            pools = getIronSwapInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.ACryptos:
            pools = getAcryptosInfosForPair(chainId, takerToken, makerToken);
            break;
        case ERC20BridgeSource.MobiusMoney:
            pools = getMobiusMoneyInfoForPair(chainId, takerToken, makerToken);
            break;
        default:
            throw new Error(`Unknown Curve like source ${source}`);
    }
    return pools.map((pool) => ({
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
        | ERC20BridgeSource.CheeseSwap
        | ERC20BridgeSource.QuickSwap
        | ERC20BridgeSource.Dfyn
        | ERC20BridgeSource.WaultSwap
        | ERC20BridgeSource.ShibaSwap
        | ERC20BridgeSource.TraderJoe
        | ERC20BridgeSource.Pangolin
        | ERC20BridgeSource.UbeSwap
        | ERC20BridgeSource.MorpheusSwap
        | ERC20BridgeSource.SpookySwap
        | ERC20BridgeSource.SpiritSwap
        | ERC20BridgeSource.BiSwap
        | ERC20BridgeSource.Yoshi
        | ERC20BridgeSource.MDex
        | ERC20BridgeSource.KnightSwap
        | ERC20BridgeSource.MeshSwap,
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
        case ERC20BridgeSource.CheeseSwap:
            return CHEESESWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.QuickSwap:
            return QUICKSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.Dfyn:
            return DFYN_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.WaultSwap:
            return WAULTSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.ShibaSwap:
            return SHIBASWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.Pangolin:
            return PANGOLIN_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.TraderJoe:
            return TRADER_JOE_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.UbeSwap:
            return UBESWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.MorpheusSwap:
            return MORPHEUSSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.SpookySwap:
            return SPOOKYSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.SpiritSwap:
            return SPIRITSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.BiSwap:
            return BISWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.Yoshi:
            return YOSHI_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.MeshSwap:
            return MESHSWAP_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.MDex:
            return MDEX_ROUTER_BY_CHAIN_ID[chainId];
        case ERC20BridgeSource.KnightSwap:
            return KNIGHTSWAP_ROUTER_BY_CHAIN_ID[chainId];
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
