import { OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

export interface RfqClientPriceRequest {
    takerAddress: string;
    txOrigin: string;
    makerToken: string;
    takerToken: string;
    assetFillAmount: BigNumber;
    marketOperation: 'Sell' | 'Buy';
    comparisonPrice: BigNumber | undefined;
    feeAmount: BigNumber | undefined;
    feeToken: string | undefined;
}

export interface RfqClientQuoteRequest extends RfqClientPriceRequest {}

export interface RfqClientIndicativeQuote {
    maker: string;
    makerUri: string;
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    expiry: BigNumber;
    kind: 'rfq' | 'otc';
}

export interface RfqClientPriceResponse {
    quotes: RfqClientIndicativeQuote[];
}

export interface RfqClientRfqOrderFirmQuote {
    order: RfqOrder;
    makerUri: string;
    signature: Signature;
    kind: 'rfq';
}

export interface RfqClientOtcOrderFirmQuote {
    order: OtcOrder;
    makerUri: string;
    signature: Signature;
    kind: 'otc';
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
