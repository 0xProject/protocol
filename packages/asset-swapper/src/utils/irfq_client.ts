import { OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

export interface RfqClientPriceRequest {
    takerAddress: string;
    txOrigin: string;
    makerToken: string;
    takerToken: string;
    assetFillAmount: BigNumber;
    marketOperation: 'sell' | 'buy';
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

export interface IRfqClient {
    fetchPricesAsync(request: RfqClientPriceRequest): Promise<RfqClientPriceResponse>;
    fetchQuotesAsync(request: RfqClientQuoteRequest): Promise<RfqClientQuoteResponse>;
}
