import { BigNumber } from '@0x/utils';
/**
 * This has been copied from https://github.com/balancer-labs/balancer-sor/blob/john/rc2/src/helpers.ts.
 * Still awaiting V2 support for @balancer-labs/sor, once full V2 support is shipped we can upgrade sor and delete this file
 */
export const parsePoolData = (
    directPools: SubGraphPoolDictionary,
    tokenIn: string,
    tokenOut: string,
    mostLiquidPoolsFirstHop: SubGraphPool[] = [],
    mostLiquidPoolsSecondHop: SubGraphPool[] = [],
    hopTokens: string[] = [],
): [SubGraphPoolDictionary, Path[]] => {
    const pathDataList: Path[] = [];
    const pools: SubGraphPoolDictionary = {};

    // First add direct pair paths
    // tslint:disable-next-line:forin
    for (const idKey in directPools) {
        const p: SubGraphPool = directPools[idKey];
        // Add pool to the set with all pools (only adds if it's still not present in dict)
        pools[idKey] = p;

        const swap: Swap = {
            pool: p.id,
            tokenIn,
            tokenOut,
            tokenInDecimals: 18, // Placeholder for actual decimals
            tokenOutDecimals: 18,
        };

        const path: Path = {
            id: p.id,
            swaps: [swap],
        };
        pathDataList.push(path);
    }

    // Now add multi-hop paths.
    // mostLiquidPoolsFirstHop and mostLiquidPoolsSecondHop always has the same
    // lengh of hopTokens
    for (let i = 0; i < hopTokens.length; i++) {
        // Add pools to the set with all pools (only adds if it's still not present in dict)
        pools[mostLiquidPoolsFirstHop[i].id] = mostLiquidPoolsFirstHop[i];
        pools[mostLiquidPoolsSecondHop[i].id] = mostLiquidPoolsSecondHop[i];

        const swap1: Swap = {
            pool: mostLiquidPoolsFirstHop[i].id,
            tokenIn,
            tokenOut: hopTokens[i],
            tokenInDecimals: 18, // Placeholder for actual decimals
            tokenOutDecimals: 18,
        };

        const swap2: Swap = {
            pool: mostLiquidPoolsSecondHop[i].id,
            tokenIn: hopTokens[i],
            tokenOut,
            tokenInDecimals: 18, // Placeholder for actual decimals
            tokenOutDecimals: 18,
        };

        const path: Path = {
            id: mostLiquidPoolsFirstHop[i].id + mostLiquidPoolsSecondHop[i].id, // Path id is the concatenation of the ids of poolFirstHop and poolSecondHop
            swaps: [swap1, swap2],
        };
        pathDataList.push(path);
    }
    return [pools, pathDataList];
};

interface SubGraphPool {
    id: string;
    swapFee: string;
    totalWeight: string;
    totalShares: string;
    tokens: SubGraphToken[];
    tokensList: string[];
    poolType?: string;

    // Only for stable pools
    amp: string;

    // Only for element pools
    lpShares?: BigNumber;
    time?: BigNumber;
    principalToken?: string;
    baseToken?: string;
}

interface SubGraphPoolDictionary {
    [poolId: string]: SubGraphPool;
}

interface SubGraphToken {
    address: string;
    balance: string;
    decimals: string | number;
    // Stable & Element field
    weight?: string;
}
interface Path {
    id: string; // pool address if direct path, contactenation of pool addresses if multihop
    swaps: Swap[];
    poolPairData?: PoolPairData[];
    limitAmount?: BigNumber;
    filterEffectivePrice?: BigNumber; // TODO: This is just used for filtering, maybe there is a better way to filter?
}

interface Swap {
    pool: string;
    tokenIn: string;
    tokenOut: string;
    swapAmount?: string;
    limitReturnAmount?: string;
    maxPrice?: string;
    tokenInDecimals: number;
    tokenOutDecimals: number;
}

export interface PoolPairData {
    id: string;
    poolType?: string; // Todo: make this a mandatory field?
    pairType?: string; // Todo: make this a mandatory field?
    tokenIn: string;
    tokenOut: string;
    balanceIn?: BigNumber;
    balanceOut?: BigNumber;
    decimalsIn: number;
    decimalsOut: number;
    swapFee: BigNumber;

    // For weighted & element pools
    weightIn?: BigNumber;
    weightOut?: BigNumber;

    // Only for stable pools
    allBalances: BigNumber[];
    invariant?: BigNumber;
    amp?: BigNumber;
    tokenIndexIn?: number;
    tokenIndexOut?: number;

    // Only for element pools
    lpShares?: BigNumber;
    time?: BigNumber;
    principalToken?: string;
    baseToken?: string;
}
