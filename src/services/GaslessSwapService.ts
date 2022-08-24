import { NULL_ADDRESS } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { RedisClientType } from 'redis';

import { ONE_MINUTE_S } from '../constants';
import { getQuoteAsync } from '../utils/MetaTransactionClient';

import { RfqmService } from './rfqm_service';
import {
    FetchFirmQuoteParams,
    FetchIndicativeQuoteParams,
    FetchIndicativeQuoteResponse,
    MetaTransactionQuoteResponse,
    OtcOrderRfqmQuoteResponse,
    RfqmTypes,
} from './types';

/**
 * When a metatransaction quote is issued, the hash
 * is stored in Redis. When a quote is submitted, it
 * is only accepted if the metatransaction hash is in
 * Redis. This prevents a malicious user submitting
 * a quote which was not issued by 0x.
 *
 * The length of time the quote metatransaction hash
 * is stored in Redis.
 */
const META_TRANSACTION_HASH_TTL_S = 15 * ONE_MINUTE_S; // tslint:disable-line binary-expression-operand-order custom-no-magic-numbers
function metaTransactionHashRedisKey(hash: string): string {
    return `metaTransactionHash.${hash}`;
}

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
        private readonly _redisClient: RedisClientType,
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
            }).then((r) => r?.price),
        ]);

        if (rfqPrice) {
            return { ...rfqPrice, source: 'rfq' };
        }
        if (ammPrice) {
            return { ...ammPrice, source: 'amm' };
        }
        return null;
    }

    /**
     * Fetches a "quote" (aka "Firm Quote").
     *
     * Liquidity selection logic is the same as with `fetchPriceAsync`.
     *
     * If an AMM metatransaction is selected as the liquidity source,
     * its metatransaction hash is stored in Redis to be verified upon
     * submit.
     */
    public async fetchQuoteAsync(
        params: FetchFirmQuoteParams & { slippagePercentage?: number },
    ): Promise<OtcOrderRfqmQuoteResponse | MetaTransactionQuoteResponse | null> {
        const [rfqQuote, ammQuote] = await Promise.all([
            this._rfqmService.fetchFirmQuoteAsync(params),
            getQuoteAsync(this._axiosInstance, new URL('/quote', this._metaTransactionServiceBaseUrl), params),
        ]);

        if (rfqQuote) {
            return rfqQuote;
        }

        if (ammQuote) {
            const approval = params.checkApproval
                ? await this._rfqmService.getGaslessApprovalResponseAsync(
                      params.takerAddress,
                      params.sellToken,
                      ammQuote.price.sellAmount,
                  )
                : null;
            await this._storeMetaTransactionHashAsync(ammQuote.metaTransaction.getHash());
            return {
                ...ammQuote.price,
                approval: approval ?? undefined,
                metaTransaction: ammQuote.metaTransaction,
                metaTransactionHash: ammQuote.metaTransaction.getHash(),
                type: RfqmTypes.MetaTransaction,
            };
        }
        return null;
    }

    private async _storeMetaTransactionHashAsync(hash: string): Promise<void> {
        await this._redisClient.set(metaTransactionHashRedisKey(hash), /* value */ 0, {
            EX: META_TRANSACTION_HASH_TTL_S,
        });
    }
}
