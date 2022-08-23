import { FANTOM_TOKENS, GEIST_FANTOM_POOLS } from './constants';
import { GeistInfo } from './types';

const gTokenToUnderlyingToken = new Map<string, string>([
    [FANTOM_TOKENS.gFTM, FANTOM_TOKENS.WFTM],
    [FANTOM_TOKENS.gfUSDT, FANTOM_TOKENS.fUSDT],
    [FANTOM_TOKENS.gDAI, FANTOM_TOKENS.DAI],
    [FANTOM_TOKENS.gUSDC, FANTOM_TOKENS.USDC],
    [FANTOM_TOKENS.gETH, FANTOM_TOKENS.WETH],
    [FANTOM_TOKENS.gWBTC, FANTOM_TOKENS.WBTC],
    [FANTOM_TOKENS.gCRV, FANTOM_TOKENS.WCRV],
    [FANTOM_TOKENS.gMIM, FANTOM_TOKENS.MIM],
]);

/**
 * Returns GeistInfo for a certain pair if that pair exists on Geist
 */
export function getGeistInfoForPair(takerToken: string, makerToken: string): GeistInfo | undefined {
    let gToken;
    let underlyingToken;
    if (gTokenToUnderlyingToken.get(takerToken) === makerToken) {
        gToken = takerToken;
        underlyingToken = makerToken;
    } else if (gTokenToUnderlyingToken.get(makerToken) === takerToken) {
        gToken = makerToken;
        underlyingToken = takerToken;
    } else {
        return undefined;
    }

    return {
        lendingPool: GEIST_FANTOM_POOLS.lendingPool,
        gToken,
        underlyingToken,
    };
}
