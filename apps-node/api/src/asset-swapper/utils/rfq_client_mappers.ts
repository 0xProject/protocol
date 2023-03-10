import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';

import { RfqtV2Quote } from '../../types';
import { NativeOrderWithFillableAmounts } from '../types';

/**
 * Converts a RfqtV2Quote to a NativeOrderWithFillableAmounts
 */
export const toSignedNativeOrderWithFillableAmounts = (quote: RfqtV2Quote): NativeOrderWithFillableAmounts => {
    return {
        type: FillQuoteTransformerOrderType.Otc,
        order: quote.order,
        signature: quote.signature,
        fillableTakerAmount: quote.fillableTakerAmount,
        fillableMakerAmount: quote.fillableMakerAmount,
        fillableTakerFeeAmount: quote.fillableTakerFeeAmount,
    };
};
