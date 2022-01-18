import { GEIST_FANTOM_POOLS } from './constants';
import { GeistInfo } from './types';

export function getGeistInfoForPair(
    takerToken: string,
    makerToken: string,
): GeistInfo {
    // TODO(Cece)
    // find whichever of takerToken/makerToken is in GEIST_FANTOM_TOKENS
    // that one is the gToken and the other one has to be underlyingToken

    return {
        lendingPool: GEIST_FANTOM_POOLS.lendingPool,
        gToken: takerToken, // placeholder
        underlyingToken: makerToken, // placeholder
    };
}
