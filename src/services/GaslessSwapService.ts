import { NULL_ADDRESS } from '@0x/utils';
import { AxiosInstance } from 'axios';

import { getQuoteAsync } from '../utils/MetaTransactionClient';

import { RfqmService } from './rfqm_service';
import { FetchIndicativeQuoteParams, FetchIndicativeQuoteResponse } from './types';

/**
 * Contains logic to fetch RFQm quotes, but with a fallback to
 * a MetaTransaction-wrapped AMM trade in the case no RFQm
 * liquidity is available.
 */
export class GaslessSwapService {
    constructor(
        private readonly _rfqmService: RfqmService,
        private readonly _metaTransactionServiceBaseUrl: URL,
        private readonly _axiosInstance: AxiosInstance,
    ) {}

    /**
     * Fetches a "price" (aka "Indicative Quote").
     *
     * For speed, both the market maker servers and the metatransaction
     * service are queried in parallel.
     *
     * If RFQ liquidity exists, then it is used to compute the price.
     * If AMM liquidity exists but RFQ liquidity is unavailable then
     * AMM liquidity is used to compute the price.
     *
     * Returns `null` if neither AMM or RFQ liquidity exists.
     */
    public async fetchPriceAsync(
        params: FetchIndicativeQuoteParams & { slippagePercentage?: number },
    ): Promise<(FetchIndicativeQuoteResponse & { source: 'rfq' | 'amm' }) | null> {
        const [rfqPrice, ammPrice] = await Promise.all([
            this._rfqmService.fetchIndicativeQuoteAsync(params),
            getQuoteAsync(this._axiosInstance, new URL('/quote', this._metaTransactionServiceBaseUrl), {
                ...params,
                // Can use the null address here since we won't be returning
                // the actual metatransaction
                takerAddress: params.takerAddress ?? NULL_ADDRESS,
            }).then((r) => r?.quote),
        ]);

        if (rfqPrice) {
            return { ...rfqPrice, source: 'rfq' };
        }
        if (ammPrice) {
            return { ...ammPrice, source: 'amm' };
        }
        return null;
    }
}
