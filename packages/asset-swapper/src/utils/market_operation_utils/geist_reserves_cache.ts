import { logUtils } from '@0x/utils';
import { gql, request } from 'graphql-request';

import { constants } from '../../constants';

const RESERVES_GQL_QUERY = gql`
    {
        reserves(
            first: 300
            where: { isActive: true, isFrozen: false }
            orderBy: totalLiquidity
            orderDirection: desc
        ) {
            id
            underlyingAsset
            gToken {
                id
            }
            pool {
                id
                lendingPool
            }
        }
    }
`;

export interface GeistReserve {
    id: string;
    underlyingAsset: string;
    gToken: {
        id: string;
    };
    pool: {
        id: string;
        lendingPool: string;
    };
}

interface Cache {
    [key: string]: GeistReserve[];
}

// tslint:disable-next-line:custom-no-magic-numbers
const RESERVES_REFRESH_INTERVAL_MS = 30 * constants.ONE_MINUTE_MS;

/**
 * Fetches Geist(Aave fork) reserve information from the official subgraph(s).
 * The reserve information is updated every 30 minutes and cached
 * so that it can be accessed with the underlying token's address
 */
export class GeistReservesCache {
    private _cache: Cache = {};
    constructor(private readonly _subgraphUrl: string) {
        const resfreshReserves = async () => this.fetchAndUpdateReservesAsync();
        // tslint:disable-next-line:no-floating-promises
        resfreshReserves();
        setInterval(resfreshReserves, RESERVES_REFRESH_INTERVAL_MS);
    }
    /**
     * Fetches Geist(Aave fork) reserves from the subgraph and updates the cache
     */
    public async fetchAndUpdateReservesAsync(): Promise<void> {
        try {
            const { reserves } = await request<{ reserves: GeistReserve[] }>(this._subgraphUrl, RESERVES_GQL_QUERY);
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
            logUtils.warn(`Failed to update Geist reserves cache: ${err.message}`);
            // Empty cache just to be safe
            this._cache = {};
        }
    }
    public get(takerToken: string, makerToken: string): GeistReserve | undefined {
        // Deposit takerToken into reserve
        if (this._cache[takerToken.toLowerCase()]) {
            const matchingReserve = this._cache[takerToken.toLowerCase()].find(
                r => r.gToken.id === makerToken.toLowerCase(),
            );
            if (matchingReserve) {
                return matchingReserve;
            }
        }

        // Withdraw makerToken from reserve
        if (this._cache[makerToken.toLowerCase()]) {
            const matchingReserve = this._cache[makerToken.toLowerCase()].find(
                r => r.gToken.id === takerToken.toLowerCase(),
            );
            if (matchingReserve) {
                return matchingReserve;
            }
        }

        // No match
        return undefined;
    }
}
