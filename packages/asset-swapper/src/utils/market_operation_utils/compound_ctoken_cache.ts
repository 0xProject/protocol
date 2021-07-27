import { logUtils } from '@0x/utils';
import axios from 'axios';

import { constants } from '../../constants';

export interface CToken {
    symbol: string;
    tokenAddress: string;
    underlyingAddress: string;
    underlyingSymbol: string;
}

interface CTokenApiResponse {
    cToken: Array<{
        symbol: string;
        token_address: string;
        underlying_address: string;
        underlying_symbol: string;
    }>;
}

interface Cache {
    [key: string]: CToken;
}

// tslint:disable-next-line:custom-no-magic-numbers
const RESERVES_REFRESH_INTERVAL_MS = 30 * constants.ONE_MINUTE_MS;

export class CompoundCTokenCache {
    private _cache: Cache = {};
    constructor(private readonly _apiUrl: string, private readonly _wethAddress: string) {
        const resfreshReserves = async () => this.fetchAndUpdateCTokensAsync();
        // tslint:disable-next-line:no-floating-promises
        resfreshReserves();
        setInterval(resfreshReserves, RESERVES_REFRESH_INTERVAL_MS);
    }

    public async fetchAndUpdateCTokensAsync(): Promise<void> {
        try {
            const { data } = await axios.get<CTokenApiResponse>(`${this._apiUrl}/ctoken`);
            const newCache = data?.cToken.reduce<Cache>((memo, cToken) => {
                // NOTE: Re-map null underlying (ETH) to WETH address (as we only deal with WETH internally)
                const underlyingAddressClean = cToken.underlying_address
                    ? cToken.underlying_address.toLowerCase()
                    : this._wethAddress;

                const tokenData: CToken = {
                    symbol: cToken.symbol,
                    tokenAddress: cToken.token_address.toLowerCase(),
                    underlyingAddress: underlyingAddressClean,
                    underlyingSymbol: cToken.underlying_symbol,
                };
                memo[underlyingAddressClean] = tokenData;
                return memo;
            }, {});

            this._cache = newCache;
        } catch (err) {
            logUtils.warn(`Failed to update Compound cToken cache: ${err.message}`);
        }
    }
    public get(takerToken: string, makerToken: string): CToken | undefined {
        // mint cToken
        let cToken = this._cache[takerToken.toLowerCase()];
        if (cToken && makerToken.toLowerCase() === cToken.tokenAddress.toLowerCase()) {
            return cToken;
        }

        // redeem cToken
        cToken = this._cache[makerToken.toLowerCase()];
        if (cToken && takerToken.toLowerCase() === cToken.tokenAddress.toLowerCase()) {
            return cToken;
        }

        // No match
        return undefined;
    }
}
