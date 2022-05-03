import { AxiosInstance } from 'axios';

import { logger } from '../logger';

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

            return priceInUsd;
        } catch (error) {
            // TODO: add prometheus metrics
            logger.error({ ...params, error }, 'Failed to fetch token price');

            return null;
        }
    }
}
