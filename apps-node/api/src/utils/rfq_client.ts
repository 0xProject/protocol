import { OtcOrder, RfqOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { OK } from 'http-status-codes';

import {
    RfqClientV1PriceRequest,
    RfqClientV1PriceResponse,
    RfqClientV1QuoteRequest,
    RfqClientV1QuoteResponse,
} from '../asset-swapper';
import { RfqtV2Price, RfqtV2Quote, RfqtV2Request } from '../types';
import { RFQT_REQUEST_MAX_RESPONSE_MS } from '../config';
import { logger } from '../logger';

// A mapper function to return a serialized RfqOrder into one with BigNumbers
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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

// A mapper function to return a serialized OtcOrder into one with BigNumbers
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
const toOtcOrder = (obj: any): OtcOrder => {
    return new OtcOrder({
        makerToken: obj.makerToken,
        takerToken: obj.takerToken,
        makerAmount: new BigNumber(obj.makerAmount),
        takerAmount: new BigNumber(obj.takerAmount),
        maker: obj.maker,
        taker: obj.taker,
        chainId: obj.chainId,
        verifyingContract: obj.verifyingContract,
        txOrigin: obj.txOrigin,
        expiryAndNonce: new BigNumber(obj.expiryAndNonce),
    });
};

export class RfqClient {
    constructor(private readonly _rfqApiUrl: string, private readonly _axiosInstance: AxiosInstance) {}

    /**
     * Communicates to an RFQ Client to fetch available prices
     */
    public async getV1PricesAsync(request: RfqClientV1PriceRequest): Promise<RfqClientV1PriceResponse> {
        try {
            const response = await this._axiosInstance.post(`${this._rfqApiUrl}/rfqt/v1/prices`, request, {
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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

    /**
     * Communicates to an RFQ Client to fetch available v2 prices
     */
    public async getV2PricesAsync(request: RfqtV2Request): Promise<RfqtV2Price[]> {
        try {
            const response = await this._axiosInstance.post(`${this._rfqApiUrl}/internal/rfqt/v2/prices`, request, {
                timeout: RFQT_REQUEST_MAX_RESPONSE_MS * 3,
                headers: {
                    '0x-chain-id': request.chainId,
                },
            });

            if (response.status !== OK) {
                logger.warn({ request }, 'Unable to get RFQt v2 prices');
                return [];
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
            return response.data?.prices?.map((q: any) => {
                return {
                    ...q,
                    expiry: new BigNumber(q.expiry),
                    makerAmount: new BigNumber(q.makerAmount),
                    takerAmount: new BigNumber(q.takerAmount),
                };
            });
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'Encountered an error fetching for /internal/rfqt/v2/prices');
            return [];
        }
    }

    /**
     * Communicates to an RFQ Client to fetch available signed v2 quotes
     */
    public async getV2QuotesAsync(request: RfqtV2Request): Promise<RfqtV2Quote[]> {
        try {
            const response = await this._axiosInstance.post(`${this._rfqApiUrl}/internal/rfqt/v2/quotes`, request, {
                timeout: RFQT_REQUEST_MAX_RESPONSE_MS * 3,
                headers: {
                    '0x-chain-id': request.chainId,
                },
            });

            if (response.status !== OK) {
                logger.warn({ request }, 'Unable to get RFQt v2 quotes');
                return [];
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
            const quotes: RfqtV2Quote[] = response.data?.quotes?.map((q: any) => {
                return {
                    fillableMakerAmount: new BigNumber(q.fillableMakerAmount),
                    fillableTakerAmount: new BigNumber(q.fillableTakerAmount),
                    fillableTakerFeeAmount: new BigNumber(q.fillableTakerFeeAmount),
                    signature: q.signature,
                    makerUri: q.makerUri,
                    makerId: q.makerId,
                    order: toOtcOrder(q.order),
                };
            });
            return quotes;
        } catch (error) {
            logger.error({ errorMessage: error.message }, 'Encountered an error fetching for /internal/rfqt/v2/quotes');
            return [];
        }
    }

    public isRfqtEnabled(): boolean {
        return this._rfqApiUrl.length !== 0;
    }
}
