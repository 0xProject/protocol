import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { MarketOperation, SwapQuote, SwapQuoteInfo } from '../types';
import { ERC20BridgeSource, OptimizedMarketOrder } from '../utils/market_operation_utils/types';

/**
 * Compute the minimum buy token amount for market operations by inferring
 * the slippage from the orders in a quote. We cannot rely on
 * `worstCaseQuoteInfo.makerAmount` because that does not stop at
 * maximum slippage.
 */
export function getSwapMinBuyAmount(quote: SwapQuote): BigNumber {
    if (quote.type === MarketOperation.Buy || quote.isTwoHop) {
        return quote.worstCaseQuoteInfo.makerAmount;
    }
    let slipRatio = new BigNumber(1);
    // Infer the allowed maker asset slippage from any non-native order.
    for (const o of quote.orders) {
        if (o.fills.length === 0 || o.fills[0].source === ERC20BridgeSource.Native) {
            // No slippage on native orders.
            continue;
        }
        const totalFillmakerAmount = BigNumber.sum(...o.fills.map(f => f.output));
        slipRatio = o.makerTokenAmount.div(totalFillmakerAmount);
        break;
    }
    if (slipRatio.gte(1)) {
        // No slippage allowed across all orders.
        return quote.bestCaseQuoteInfo.makerAmount;
    }
    return quote.bestCaseQuoteInfo.makerAmount.times(slipRatio).integerValue(BigNumber.ROUND_DOWN);
}

/**
 * Same as `getSwapMinBuyAmount` but operates
 * on a single quote info instead of using best and worst case
 * Orders must be derived from the same path as the quote info
 */
export function getQuoteInfoMinBuyAmount(
    quoteInfo: SwapQuoteInfo,
    orders: OptimizedMarketOrder[],
    marketOperation: MarketOperation,
): BigNumber {
    if (marketOperation === MarketOperation.Buy) {
        return quoteInfo.makerAmount;
    }
    let slipRatio = new BigNumber(1);
    // Infer the allowed maker asset slippage from any non-native order.
    for (const o of orders) {
        if (o.fills.length === 0 || o.fills[0].source === ERC20BridgeSource.Native) {
            // No slippage on native orders.
            continue;
        }
        const totalFillmakerAmount = BigNumber.sum(...o.fills.map(f => f.output));
        slipRatio = o.makerTokenAmount.div(totalFillmakerAmount);
        break;
    }
    if (slipRatio.gte(1)) {
        // No slippage allowed across all orders.
        return quoteInfo.makerAmount;
    }
    return quoteInfo.makerAmount.times(slipRatio).integerValue(BigNumber.ROUND_DOWN);
}
