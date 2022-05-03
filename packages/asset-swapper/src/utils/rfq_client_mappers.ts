import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';

import { SignedNativeOrder } from '../types';

import { RfqClientFirmQuote, RfqClientRfqOrderFirmQuote } from './irfq_client';

/**
 * Filters for RfqOrders from an array of RfqClientFirmQuotes. Refines the type.
 */
export const filterRfqOrder = (quotes: RfqClientFirmQuote[]): RfqClientRfqOrderFirmQuote[] => {
    return quotes.filter(q => q.kind === 'rfq') as RfqClientRfqOrderFirmQuote[];
};

/**
 * Converts a RfqClientRfqOrderFirmQuote to a SignedNativeOrder
 */
export const toSignedNativeOrder = (quote: RfqClientRfqOrderFirmQuote): SignedNativeOrder => {
    return {
        type: FillQuoteTransformerOrderType.Rfq,
        order: quote.order,
        signature: quote.signature,
    };
};
