import { AxiosInstance } from 'axios';
import { Summary } from 'prom-client';

import { logger } from '../logger';

/**
 * With this summary metric, some of the things you can do are:
 * - Get the rate of failed price fetch requests:
 *      rate(rfq_token_price_fetch_request_duration_seconds_count{success="false"}[5m])
 * - Get the rate of success price fetch requests:
 *      rate(rfq_token_price_fetch_request_duration_seconds_count{success="true"}[5m])
 * - Get the p95 of request duration of all success price fetch:
 *      rate(rfq_token_price_fetch_request_duration_seconds{quantile="0.99", success="true"}[5m])
 *      /
 *      rate(rfq_token_price_fetch_request_duration_seconds_count{quantile="0.99", success="true"}[5m])
 */
const RFQ_TOKEN_PRICE_FETCH_REQUEST_DURATION_SECONDS = new Summary({
    name: 'rfq_token_price_fetch_request_duration_seconds',
    help: 'Histogram of request duration of token price fetch request',
    percentiles: [0.5, 0.9, 0.95, 0.99, 0.999], // tslint:disable-line: custom-no-magic-numbers
    labelNames: ['success'],
});

export interface FetchTokenPriceParams {
    chainId: number;
    /**
     * Must be a valid ERC-20 contract address
     */
    tokenAddress: string;
}

export class TokenPriceOracle {
    public constructor(private readonly _axiosInstance: AxiosInstance, private readonly _definedFiApiKey: string) {
        if (!_definedFiApiKey) {
            throw new Error('Missing Defined.Fi API Key');
        }
    }

    /**
     * Fetch the current price of multiple tokens. The returned array will be a list
     * of result for each item in passed via params in the same order.
     */
    public async batchFetchTokenPriceAsync(params: FetchTokenPriceParams[]): Promise<(number | null)[]> {
        // Note: we can actually batching the getPrice requests in a single GraphQL query
        // but this is for future improvement. For now, batching via sending multiple graphql requests
        // in parallel should be sufficient
        return Promise.all(params.map((p) => this._fetchTokenPriceAsync(p)));
    }

    private async _fetchTokenPriceAsync(params: FetchTokenPriceParams): Promise<number | null> {
        const stopTimer = RFQ_TOKEN_PRICE_FETCH_REQUEST_DURATION_SECONDS.startTimer();
        try {
            const { data } = await this._axiosInstance.post(
                'https://api.defined.fi',
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
            if (!priceInUsd) {
                throw new Error(data);
            }

            stopTimer({ success: 'true' });
            return priceInUsd;
        } catch (error) {
            logger.error({ ...params, error }, 'Failed to fetch token price');

            stopTimer({ success: 'false' });
            return null;
        }
    }
}
