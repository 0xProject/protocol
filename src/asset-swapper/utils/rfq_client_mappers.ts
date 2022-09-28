import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';

import { SignedNativeOrder, RfqClientV1Quote } from '../types';

/**
 * Converts a RfqClientRfqOrderFirmQuote to a SignedNativeOrder
 */
export const toSignedNativeOrder = (quote: RfqClientV1Quote): SignedNativeOrder => {
    return {
        type: FillQuoteTransformerOrderType.Rfq,
        order: quote.order,
        signature: quote.signature,
    };
};
