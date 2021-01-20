import { LimitOrderFields as Order } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { constants } from '../constants';
import { PriceAwareRFQFlags } from '../types';

// tslint:disable: no-unnecessary-type-assertion completed-docs

/**
 * Returns 2 flags (one for firm quotes and another for indicative quotes) that serve as rollout flags for the price-aware RFQ feature.
 * By default, indicative quotes should *always* go through the new price-aware flow. This means that all indicative RFQ requests made to
 * market makers will contain the new price-aware `suggestedPrice` field.
 * The `isPriceAwareRFQEnabled` feature object that is passed in by the 0x API will then control whether firm quotes go through price-aware RFQ.
 *
 * @param isPriceAwareRFQEnabled the feature flag that is passed in by the 0x API.
 */
export function getPriceAwareRFQRolloutFlags(priceAwareRFQFlags?: PriceAwareRFQFlags): PriceAwareRFQFlags {
    return priceAwareRFQFlags !== undefined
        ? priceAwareRFQFlags
        : {
              isFirmPriceAwareEnabled: false,
              isIndicativePriceAwareEnabled: false,
          };
}

export function numberPercentageToEtherTokenAmountPercentage(percentage: number): BigNumber {
    return Web3Wrapper.toBaseUnitAmount(constants.ONE_AMOUNT, constants.ETHER_TOKEN_DECIMALS).multipliedBy(percentage);
}

export function getAdjustedTakerAmountFromFees<T extends Order>(order: T): BigNumber {
    return order.takerAmount.plus(order.takerTokenFeeAmount);
}
