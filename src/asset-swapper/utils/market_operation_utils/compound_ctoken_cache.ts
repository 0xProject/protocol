import { logUtils } from '@0x/utils';
import axios from 'axios';

import { constants } from '../../constants';

export interface CToken {
    tokenAddress: string;
    underlyingAddress: string;
}

interface CTokenApiResponse {
    cToken: {
        token_address: string;
        underlying_address: string;
    }[];
}

interface Cache {
    [key: string]: CToken;
}

const CTOKEN_REFRESH_INTERVAL_MS = 30 * constants.ONE_MINUTE_MS;

/**
 * Fetches a list of CTokens from Compound's official API.
 * The token information is updated every 30 minutes and cached
 * so that it can be accessed with the underlying token's address.
 */
export class CompoundCTokenCache {
    private _cache: Cache = {};
    constructor(private readonly _apiUrl: string, private readonly _wethAddress: string) {
        const refreshCTokenCache = async () => this.fetchAndUpdateCTokensAsync();
        refreshCTokenCache();
        setInterval(refreshCTokenCache, CTOKEN_REFRESH_INTERVAL_MS);
    }

    public async fetchAndUpdateCTokensAsync(): Promise<void> {
        try {
            const { data } = await axios.get<CTokenApiResponse>(`${this._apiUrl}/ctoken`);
            const newCache = data?.cToken.reduce<Cache>((memo, cToken) => {
                // NOTE: Re-map cETH with null underlying token address to WETH address (we only handle WETH internally)
                const underlyingAddressClean = cToken.underlying_address
                    ? cToken.underlying_address.toLowerCase()
                    : this._wethAddress;

                const tokenData: CToken = {
                    tokenAddress: cToken.token_address.toLowerCase(),
                    underlyingAddress: underlyingAddressClean,
                };
                memo[underlyingAddressClean] = tokenData;
                return memo;
            }, {});

            this._cache = newCache;
        } catch (err) {
            logUtils.warn(`Failed to update Compound cToken cache: ${err.message}`);
            // NOTE: Safe to keep already cached data as tokens should only be added to the list
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
