import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';

import { SignedNativeOrder } from '../types';

import { RfqClientV1Quote } from './irfq_client';

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
