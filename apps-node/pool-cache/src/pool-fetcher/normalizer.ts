import * as _ from 'lodash';
import { getBigInt } from 'ethers';
import { UniswapV3Fee, UniswapV3Pool, UniswapV3PoolCache } from 'pool-cache-interface';
import { UniswapV3PoolStructOutput } from '../typechain/PoolFetcher';
import { ZERO_ADDRESS } from '../utils/constants';

const NUM_UNISWAP_V3_FEE_TIERS = 4;

export function toUniswapV3PoolCache(
    uniswapPoolStructs: Pick<UniswapV3PoolStructOutput, 'fee' | 'poolAddress' | 'totalValueInToken1'>[],
): UniswapV3PoolCache[] {
    if (uniswapPoolStructs.length % NUM_UNISWAP_V3_FEE_TIERS !== 0) {
        throw new Error(`Invalid input: uniswapPoolStructs must be multiple of ${NUM_UNISWAP_V3_FEE_TIERS}`);
    }

    const uniPoolStructsByPair = _.chunk(uniswapPoolStructs, NUM_UNISWAP_V3_FEE_TIERS);
    return uniPoolStructsByPair.map((structs) => {
        const nonEmptyPools = structs.filter((s) => s.poolAddress !== ZERO_ADDRESS && s.totalValueInToken1 > 0n);
        if (nonEmptyPools.length === 0) {
            return {
                pools: [],
            };
        }

        const sortedNonEmptyPools = _.sortBy(nonEmptyPools, (p) => -p.totalValueInToken1);
        const maxTvl = sortedNonEmptyPools[0].totalValueInToken1;
        const pools: UniswapV3Pool[] = sortedNonEmptyPools.map((p) => ({
            fee: Number(p.fee) as unknown as UniswapV3Fee,
            score: Number((getBigInt(p.totalValueInToken1) * 100n) / maxTvl),
            poolAddress: p.poolAddress,
        }));
        return {
            pools,
        };
    });
}
