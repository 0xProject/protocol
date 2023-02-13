/**
 * Alternate Market Maker types.
 * See: https://github.com/0xProject/protocol/blob/2fdca24d4e09bcf6a2aefb027099e9c0703a8052/packages/asset-swapper/src/types.ts
 */

import { TakerRequestQueryParamsUnnested, V4SignedRfqOrder } from '../quote-server/types';

/**
 * Represents a mocked RFQ-T/M alternative maker responses.
 */
export interface AltMockedRfqQuoteResponse {
    endpoint: string;
    mmApiKey: string;
    requestData: AltQuoteRequestData;
    responseData: unknown;
    responseCode: number;
}

export enum AltQuoteModel {
    Firm = 'firm',
    Indicative = 'indicative',
}

export enum AltQuoteSide {
    Buy = 'buy',
    Sell = 'sell',
}
export interface AltQuoteRequestData {
    market: string;
    model: AltQuoteModel;
    profile: string;
    side: AltQuoteSide;
    value?: string;
    amount?: string;
    meta: {
        txOrigin: string;
        taker: string;
        client: string;
        existingOrder?: {
            price: string;
            value?: string;
            amount?: string;
        };
    };
}

export interface AltOffering {
    id: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetDecimals: number;
    quoteAssetDecimals: number;
}
export interface AltRfqMakerAssetOfferings {
    [endpoint: string]: AltOffering[];
}

/**
 * Represents a mocked RFQ-T/M maker responses.
 */
export interface MockedRfqQuoteResponse {
    endpoint: string;
    requestApiKey: string;
    requestParams: TakerRequestQueryParamsUnnested;
    responseData: unknown;
    responseCode: number;
    callback?: (config: unknown) => Promise<unknown>;
}

export enum RfqQuoteEndpoint {
    Indicative = 'price',
    Firm = 'quote',
}

export interface AltQuoteRequestData {
    market: string;
    model: AltQuoteModel;
    profile: string;
    side: AltQuoteSide;
    value?: string;
    amount?: string;
    meta: {
        txOrigin: string;
        taker: string;
        client: string;
        existingOrder?: {
            price: string;
            value?: string;
            amount?: string;
        };
    };
}
export interface AltBaseRfqResponse extends AltQuoteRequestData {
    id: string;
    price?: string;
}
export interface AltIndicativeQuoteResponse extends AltBaseRfqResponse {
    model: AltQuoteModel.Indicative;
    status: 'live' | 'rejected';
}
export interface AltFirmQuoteResponse extends AltBaseRfqResponse {
    model: AltQuoteModel.Firm;
    data: {
        '0xv4order': V4SignedRfqOrder;
    };
    status: 'active' | 'rejected';
}
