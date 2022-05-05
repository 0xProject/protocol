import { OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { AltRfqMakerAssetOfferings } from '../types';

export interface RfqClientPriceRequest {
    altRfqAssetOfferings: AltRfqMakerAssetOfferings | undefined;
    assetFillAmount: BigNumber;
    chainId: number;
    comparisonPrice: BigNumber | undefined;
    feeAmount: BigNumber | undefined;
    feeToken: string | undefined;
    integratorId: string;
    makerToken: string;
    marketOperation: 'Sell' | 'Buy';
    takerAddress: string;
    takerToken: string;
    txOrigin: string;
}

export interface RfqClientQuoteRequest extends RfqClientPriceRequest {}

export interface RfqClientIndicativeQuote {
    expiry: BigNumber;
    kind: 'rfq' | 'otc';
    makerAmount: BigNumber;
    makerToken: string;
    makerUri: string;
    takerAmount: BigNumber;
    takerToken: string;
}

export interface RfqClientPriceResponse {
    quotes: RfqClientIndicativeQuote[];
}

export interface RfqClientRfqOrderFirmQuote {
    kind: 'rfq';
    makerUri: string;
    order: RfqOrder;
    signature: Signature;
}

export interface RfqClientOtcOrderFirmQuote {
    kind: 'otc';
    makerUri: string;
    order: OtcOrder;
    signature: Signature;
}

export type RfqClientFirmQuote = RfqClientRfqOrderFirmQuote | RfqClientOtcOrderFirmQuote;

export interface RfqClientQuoteResponse {
    quotes: RfqClientFirmQuote[];
}

/**
 * IRfqClient is an interface that defines how to connect with an Rfq system.
 */
export interface IRfqClient {
    /**
     * Fetches a list of "indicative quotes" or prices from a remote Rfq server
     */
    fetchPricesAsync(request: RfqClientPriceRequest): Promise<RfqClientPriceResponse>;

    /**
     * Fetches a list of "firm quotes" or signed quotes from a remote Rfq server.
     */
    fetchQuotesAsync(request: RfqClientQuoteRequest): Promise<RfqClientQuoteResponse>;
}
