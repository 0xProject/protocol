import { logUtils } from '@0x/utils';
import { gql, request } from 'graphql-request';

import { constants } from '../../constants';

const AAVE_V2_RESERVES_GQL_QUERY = gql`
    {
        reserves(
            first: 300
            where: { isActive: true, isFrozen: false }
            orderBy: totalLiquidity
            orderDirection: desc
        ) {
            id
            underlyingAsset
            aToken {
                id
            }
            pool {
                id
                lendingPool
            }
        }
    }
`;

const AAVE_V3_RESERVES_GQL_QUERY = gql`
    {
        reserves(
            first: 300
            where: { isActive: true, isFrozen: false }
            orderBy: totalLiquidity
            orderDirection: desc
        ) {
            id
            underlyingAsset
            aToken {
                id
            }
            pool {
                id
                pool
            }
        }
    }
`;

export interface AaveV2Reserve {
    id: string;
    underlyingAsset: string;
    aToken: {
        id: string;
    };
    pool: {
        id: string;
        lendingPool: string;
    };
}

export interface AaveV3Reserve {
    id: string;
    underlyingAsset: string;
    aToken: {
        id: string;
    };
    pool: {
        id: string;
        pool: string;
    };
}

interface Cache {
    [key: string]: (AaveV2Reserve | AaveV3Reserve)[];
}

const RESERVES_REFRESH_INTERVAL_MS = 30 * constants.ONE_MINUTE_MS;
/**
 * Fetches Aave V2/V3 reserve information from the official subgraph(s).
 * The reserve information is updated every 30 minutes and cached
 * so that it can be accessed with the underlying token's address
 */
export class AaveReservesCache {
    private _cache: Cache = {};
    constructor(private readonly _subgraphUrl: string, private readonly _isV3: boolean) {
        const resfreshReserves = async () => this.fetchAndUpdateReservesAsync();
        resfreshReserves();
        setInterval(resfreshReserves, RESERVES_REFRESH_INTERVAL_MS);
    }
    /**
     * Fetches Aave V2/V3 reserves from the subgraph and updates the cache
     */
    public async fetchAndUpdateReservesAsync(): Promise<void> {
        try {
            let reserves: (AaveV2Reserve | AaveV3Reserve)[];
            if (this._isV3) {
                ({ reserves } = await request<{ reserves: AaveV3Reserve[] }>(
                    this._subgraphUrl,
                    AAVE_V3_RESERVES_GQL_QUERY,
                ));
            } else {
                ({ reserves } = await request<{ reserves: AaveV2Reserve[] }>(
                    this._subgraphUrl,
                    AAVE_V2_RESERVES_GQL_QUERY,
                ));
            }
            const newCache = reserves.reduce<Cache>((memo, reserve) => {
                const underlyingAsset = reserve.underlyingAsset.toLowerCase();
                if (!memo[underlyingAsset]) {
                    memo[underlyingAsset] = [];
                }

                memo[underlyingAsset].push(reserve);
                return memo;
            }, {});

            this._cache = newCache;
        } catch (err) {
            logUtils.warn(`Failed to update Aave V2 reserves cache: ${err.message}`);
            // Empty cache just to be safe
            this._cache = {};
        }
    }
    public get(takerToken: string, makerToken: string): AaveV2Reserve | AaveV3Reserve | undefined {
        // Deposit takerToken into reserve
        if (this._cache[takerToken.toLowerCase()]) {
            const matchingReserve = this._cache[takerToken.toLowerCase()].find(
                (r) => r.aToken.id === makerToken.toLowerCase(),
            );
            if (matchingReserve) {
                return matchingReserve;
            }
        }

        // Withdraw makerToken from reserve
        if (this._cache[makerToken.toLowerCase()]) {
            const matchingReserve = this._cache[makerToken.toLowerCase()].find(
                (r) => r.aToken.id === takerToken.toLowerCase(),
            );
            if (matchingReserve) {
                return matchingReserve;
            }
        }

        // No match
        return undefined;
    }
}
