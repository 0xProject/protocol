import {
    IRfqClient,
    RfqClientV1PriceRequest,
    RfqClientV1PriceResponse,
    RfqClientV1QuoteRequest,
    RfqClientV1QuoteResponse,
} from '@0x/asset-swapper';
import { RfqOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { OK } from 'http-status-codes';

import { RFQT_REQUEST_MAX_RESPONSE_MS } from '../config';
import { logger } from '../logger';

// A mapper function to return a serialized RfqOrder into one with BigNumbers
const toRfqOrder = (obj: any): RfqOrder => {
    return new RfqOrder({
        makerToken: obj.makerToken,
        takerToken: obj.takerToken,
        makerAmount: new BigNumber(obj.makerAmount),
        takerAmount: new BigNumber(obj.takerAmount),
        maker: obj.maker,
        taker: obj.taker,
        chainId: obj.chainId,
        verifyingContract: obj.verifyingContract,
        txOrigin: obj.txOrigin,
        pool: obj.pool,
        salt: new BigNumber(obj.salt),
        expiry: new BigNumber(obj.expiry),
    });
};

export class RfqClient implements IRfqClient {
    constructor(private readonly _rfqApiUrl: string, private readonly _axiosInstance: AxiosInstance) {}

    /**
     * Communicates to an RFQ Client to fetch available prices
     */
    public async getV1PricesAsync(request: RfqClientV1PriceRequest): Promise<RfqClientV1PriceResponse> {
        try {
            const response = await this._axiosInstance.post(`${this._rfqApiUrl}/rfqt/v1/prices`, request, {
                // tslint:disable-next-line: custom-no-magic-numbers
                timeout: RFQT_REQUEST_MAX_RESPONSE_MS + 150,
                headers: {
                    '0x-chain-id': request.chainId,
                },
            });

            if (response.status !== OK) {
                logger.warn({ request }, 'Unable to get RFQt v1 prices');
                return {
                    prices: [],
                };
            }

            return response.data as RfqClientV1PriceResponse;
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'Encountered an error fetching for /rfqt/v1/prices');
            return {
                prices: [],
            };
        }
    }

    /**
     * Communicates to an RFQ Client to fetch available signed quotes
     */
    public async getV1QuotesAsync(request: RfqClientV1QuoteRequest): Promise<RfqClientV1QuoteResponse> {
        try {
            const response = await this._axiosInstance.post(`${this._rfqApiUrl}/rfqt/v1/quotes`, request, {
                // tslint:disable-next-line: custom-no-magic-numbers
                timeout: RFQT_REQUEST_MAX_RESPONSE_MS + 150,
                headers: {
                    '0x-chain-id': request.chainId,
                },
            });

            if (response.status !== OK) {
                logger.warn({ request }, 'Unable to get RFQt v1 quotes');
                return {
                    quotes: [],
                };
            }

            const updatedQuotes = response.data?.quotes.map((q: any) => {
                return {
                    signature: q.signature,
                    makerUri: q.makerUri,
                    order: toRfqOrder(q.order),
                };
            });
            return {
                quotes: updatedQuotes,
            };
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'Encountered an error fetching for /rfqt/v1/quotes');
            return {
                quotes: [],
            };
        }
    }
}
