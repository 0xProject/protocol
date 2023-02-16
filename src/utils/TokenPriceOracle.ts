import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { Summary } from 'prom-client';

import { logger } from '../logger';

/**
 * With this summary metric, some of the things you can do are:
 * - Get the rate of failed price fetch requests:
 *      rate(rfq_token_price_fetch_request_duration_seconds_count{success="false"}[5m])
 * - Get the rate of success price fetch requests:
 *      rate(rfq_token_price_fetch_request_duration_seconds_count{success="true"}[5m])
 * - Get the p95 of request duration of all success price fetch (with the sliding window of 1 minute):
 *      rfq_token_price_fetch_request_duration_seconds{quantile="0.99", success="true"}
 */
const RFQ_TOKEN_PRICE_FETCH_REQUEST_DURATION_SECONDS = new Summary({
    name: 'rfq_token_price_fetch_request_duration_seconds',
    help: 'Histogram of request duration of token price fetch request',
    percentiles: [0.5, 0.9, 0.95, 0.99, 0.999], // tslint:disable-line: custom-no-magic-numbers
    labelNames: ['chainId', 'success'],
    // Set sliding window to 1 minutes
    maxAgeSeconds: 60,
    // The more number of age buckets, the smoother the time window is moved
    // but it also consumes more memory & CPU for maintaining the bucket.
    ageBuckets: 5,
});

export interface FetchTokenPriceParams {
    chainId: number;
    /**
     * Must be a valid ERC-20 contract address
     */
    tokenAddress: string;
    tokenDecimals: number;
}

type TokenPriceFetchResponse = BigNumber | null;

export class TokenPriceOracle {
    /**
     * In-memory cache implementation for token price. A map with:
     * - Key is `${chainId}:${tokenAddress}`
     * - Value is a 2-items array with the first item is cache expiry timestamp (ms), second item
     *   is the cached response.
     */
    private readonly _tokenPriceCache: Map<string, [number, TokenPriceFetchResponse]>;

    public constructor(
        private readonly _axiosInstance: AxiosInstance,
        private readonly _definedFiApiKey: string,
        private readonly _definedFiEndpoint: string,
        private readonly _cacheTTLMs: number = 20000,
    ) {
        if (!_definedFiApiKey) {
            throw new Error('Missing Defined.Fi API Key');
        }
        this._tokenPriceCache = new Map();
    }

    /**
     * Fetch the current price of multiple tokens. The returned array will be a list
     * of result for each item in passed via params in the same order.
     */
    public async batchFetchTokenPriceAsync(params: FetchTokenPriceParams[]): Promise<TokenPriceFetchResponse[]> {
        // Note: we can actually batching the getPrice requests in a single GraphQL query
        // but this is for future improvement. For now, batching via sending multiple graphql requests
        // in parallel should be sufficient
        return Promise.all(params.map((p) => this._fetchTokenPriceCachedAsync(p)));
    }

    private async _fetchTokenPriceCachedAsync(params: FetchTokenPriceParams): Promise<TokenPriceFetchResponse> {
        const cacheKey = `${params.chainId}:${params.tokenAddress}`;
        const cacheData = this._tokenPriceCache.get(cacheKey);
        if (cacheData && cacheData[0] > Date.now()) {
            return cacheData[1];
        }
        const freshData = await this._fetchTokenPriceAsync(params);
        this._tokenPriceCache.set(cacheKey, [Date.now() + this._cacheTTLMs, freshData]);
        return freshData;
    }

    private async _fetchTokenPriceAsync(params: FetchTokenPriceParams): Promise<TokenPriceFetchResponse> {
        const stopTimer = RFQ_TOKEN_PRICE_FETCH_REQUEST_DURATION_SECONDS.startTimer({
            chainId: params.chainId.toString(),
        });
        try {
            const { data } = await this._axiosInstance.post(
                this._definedFiEndpoint,
                {
                    query: `
                        query getPrice {
                            getPrice(address: "${params.tokenAddress}", networkId: ${params.chainId}) {
                              priceUsd
                            }
                        }
                    `,
                },
                {
                    headers: { 'x-api-key': this._definedFiApiKey },
                },
            );

            const priceInUsd = data?.data?.getPrice?.priceUsd || null;
            logger.info(
                {
                    priceInUsd,
                    params,
                },
                'price and params in `_fetchTokenPriceAsync`',
            );
            if (!priceInUsd) {
                throw new Error(`Got 200 but without price value. Response body: ${JSON.stringify(data)}`);
            }

            stopTimer({ success: 'true' });
            return new BigNumber(priceInUsd).shiftedBy(params.tokenDecimals * -1); // USD price of 1 base unit
        } catch (error) {
            logger.error({ ...params, message: error.message }, 'Failed to fetch token price');

            stopTimer({ success: 'false' });
            return null;
        }
    }
}
