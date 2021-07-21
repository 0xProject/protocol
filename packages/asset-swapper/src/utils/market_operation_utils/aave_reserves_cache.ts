import { gql, request } from 'graphql-request';

import { constants } from '../../constants';

const RESERVES_GQL_QUERY = gql`
    {
        reserves(where: { isActive: true, isFrozen: false }, orderBy: totalLiquidity, orderDirection: desc) {
            id
            name
            isActive
            isFrozen
            underlyingAsset
            totalLiquidity
            aToken {
                id
                underlyingAssetAddress
            }
            pool {
                id
                lendingPool
            }
            decimals
            symbol
        }
    }
`;

export interface AaveReserve {
    decimals: number;
    id: string;
    isActive: boolean;
    isFrozen: boolean;
    name: string;
    symbol: string;
    totalLiquidity: string;
    underlyingAsset: string;
    aToken: {
        id: string;
        underlyingAssetAddress: string;
    };
    pool: {
        id: string;
        lendingPool: string;
    };
}

interface Cache {
    [key: string]: AaveReserve[];
}

const RESERVES_REFRESH_INTERVAL_MS = 30 * constants.ONE_MINUTE_MS;

export class AaveReservesCache {
    private _cache: Cache = {};
    constructor(private readonly _subgraphUrl: string) {
        const resfreshReserves = async () => this.fetchAndUpdateReservesAsync();
        // tslint:disable-next-line:no-floating-promises
        resfreshReserves();
        setInterval(resfreshReserves, RESERVES_REFRESH_INTERVAL_MS);
    }
    public async fetchAndUpdateReservesAsync() {
        try {
            const { reserves } = await request<{ reserves: AaveReserve[] }>(this._subgraphUrl, RESERVES_GQL_QUERY);
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
            // TODO(kimpers): handle this properly
            // tslint:disable-next-line:no-console
            console.error(err);
            // Empty cache just to be safe
            this._cache = {};
        }
    }
    public get(takerToken: string, makerToken: string): AaveReserve | undefined {
        // Deposit takerToken into reserve
        if (this._cache[takerToken.toLowerCase()]) {
            const matchingReserve = this._cache[takerToken.toLowerCase()].find(
                r => r.aToken.id === makerToken.toLowerCase(),
            );
            if (matchingReserve) {
                return matchingReserve;
            }
        }

        // Withdraw makerToken from reserve
        if (this._cache[makerToken.toLowerCase()]) {
            const matchingReserve = this._cache[makerToken.toLowerCase()].find(
                r => r.aToken.id === takerToken.toLowerCase(),
            );
            if (matchingReserve) {
                return matchingReserve;
            }
        }

        // No match
        return undefined;
    }
}
