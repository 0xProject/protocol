import { BigNumber } from '@0x/utils';

import { ERC20BridgeSource, OptimizedMarketOrder } from '../../src';
import { constants } from '../../src/constants';
import { MarketOperation, SwapQuote, SwapQuoteBase } from '../../src/types';

/**
 * Creates a swap quote given orders.
 */
export async function getFullyFillableSwapQuoteWithNoFeesAsync(
    makerToken: string,
    takerToken: string,
    orders: OptimizedMarketOrder[],
    operation: MarketOperation,
    gasPrice: BigNumber,
): Promise<SwapQuote> {
    const makerAmount = BigNumber.sum(...[0, ...orders.map(o => o.makerAmount)]);
    const takerAmount = BigNumber.sum(...[0, ...orders.map(o => o.takerAmount)]);
    const protocolFeePerOrder = constants.PROTOCOL_FEE_MULTIPLIER.times(gasPrice);
    const quoteInfo = {
        makerAmount,
        feeTakerTokenAmount: constants.ZERO_AMOUNT,
        takerAmount,
        totalTakerAmount: takerAmount,
        protocolFeeInWeiAmount: protocolFeePerOrder.times(orders.length),
        gas: 200e3,
        slippage: 0,
    };

    const breakdown = {
        [ERC20BridgeSource.Native]: new BigNumber(1),
    };

    const quoteBase: SwapQuoteBase = {
        makerToken,
        takerToken,
        orders: orders.map(order => ({ ...order, fills: [] })),
        gasPrice,
        bestCaseQuoteInfo: quoteInfo,
        worstCaseQuoteInfo: quoteInfo,
        sourceBreakdown: breakdown,
        isTwoHop: false,
        takerAmountPerEth: constants.ZERO_AMOUNT,
        makerAmountPerEth: constants.ZERO_AMOUNT,
        makerTokenDecimals: 18,
        takerTokenDecimals: 18,
        blockNumber: 1337420,
    };

    if (operation === MarketOperation.Buy) {
        return {
            ...quoteBase,
            type: MarketOperation.Buy,
            makerTokenFillAmount: makerAmount,
        };
    } else {
        return {
            ...quoteBase,
            type: MarketOperation.Sell,
            takerTokenFillAmount: takerAmount,
        };
    }
}
