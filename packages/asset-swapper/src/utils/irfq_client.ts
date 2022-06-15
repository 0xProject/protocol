import { OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { AltRfqMakerAssetOfferings } from '../types';

export interface RfqClientV1PriceRequest {
    altRfqAssetOfferings: AltRfqMakerAssetOfferings | undefined;
    assetFillAmount: BigNumber;
    chainId: number;
    comparisonPrice: BigNumber | undefined;
    integratorId: string;
    intentOnFilling: boolean;
    makerToken: string;
    marketOperation: 'Sell' | 'Buy';
    takerAddress: string;
    takerToken: string;
    txOrigin: string;
}

export interface RfqClientV1QuoteRequest extends RfqClientV1PriceRequest {}

export interface RfqClientV1Price {
    expiry: BigNumber;
    kind: 'rfq' | 'otc';
    makerAmount: BigNumber;
    makerToken: string;
    makerUri: string;
    takerAmount: BigNumber;
    takerToken: string;
}

export interface RfqClientV1PriceResponse {
    prices: RfqClientV1Price[];
}

export interface RfqClientV1Quote {
    makerUri: string;
    order: RfqOrder;
    signature: Signature;
}

export interface RfqClientV1QuoteResponse {
    quotes: RfqClientV1Quote[];
}

export interface RfqClientV2PriceRequest {
    assetFillAmount: BigNumber;
    chainId: number;
    comparisonPrice: BigNumber | undefined;
    integratorId: string;
    intentOnFilling: boolean;
    makerToken: string;
    marketOperation: 'Sell' | 'Buy';
    takerAddress: string;
    takerToken: string;
    txOrigin: string;
}

export interface RfqClientV2QuoteRequest extends RfqClientV2PriceRequest {}

export interface RfqClientV2Price {
    expiry: BigNumber;
    maker: string;
    makerAmount: BigNumber;
    makerToken: string;
    makerUri: string;
    takerAmount: BigNumber;
    takerToken: string;
}

export interface RfqClientV2PriceResponse {
    prices: RfqClientV2Price[];
}

export interface RfqClientV2Quote {
    makerUri: string;
    order: OtcOrder;
    signature: Signature;
    fillableMakerAmount: BigNumber;
    fillableTakerAmount: BigNumber;
    fillableTakerFeeAmount: BigNumber;
}

export interface RfqClientV2QuoteResponse {
    quotes: RfqClientV2Quote[];
}

/**
 * IRfqClient is an interface that defines how to connect with an Rfq system.
 */
export interface IRfqClient {
    /**
     * Fetches a list of "indicative quotes" or prices from a remote Rfq server
     */
    getV1PricesAsync(request: RfqClientV1PriceRequest): Promise<RfqClientV1PriceResponse>;

    /**
     * Fetches a list of "firm quotes" or signed quotes from a remote Rfq server.
     */
    getV1QuotesAsync(request: RfqClientV1QuoteRequest): Promise<RfqClientV1QuoteResponse>;

    /**
     * Fetches a list of "v2 indicative quotes" or prices from a remote Rfq server
     */
    getV2PricesAsync(request: RfqClientV2PriceRequest): Promise<RfqClientV2PriceResponse>;

    /**
     * Fetches a list of "v2 firm quotes" or signed quotes from a remote Rfq server.
     */
    getV2QuotesAsync(request: RfqClientV2QuoteRequest): Promise<RfqClientV2QuoteResponse>;
}
