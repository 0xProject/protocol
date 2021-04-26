import { FillQuoteTransformerData, FillQuoteTransformerOrderType } from '@0x/protocol-utils';

import { ExchangeProxyContractOpts, MarketBuySwapQuote, MarketOperation, SwapQuote } from '../types';
import {
    createBridgeDataForBridgeOrder,
    getErc20BridgeSourceToBridgeSource,
} from '../utils/market_operation_utils/orders';
import {
    ERC20BridgeSource,
    NativeLimitOrderFillData,
    NativeRfqOrderFillData,
    OptimizedMarketBridgeOrder,
    OptimizedMarketOrder,
    OptimizedMarketOrderBase,
} from '../utils/market_operation_utils/types';

const MULTIPLEX_BATCH_FILL_SOURCES = [
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.LiquidityProvider,
    ERC20BridgeSource.Native,
];

/**
 * Returns true iff a quote can be filled via `MultiplexFeature.batchFill`.
 */
export function isMultiplexBatchFillCompatible(quote: SwapQuote, opts: ExchangeProxyContractOpts): boolean {
    if (requiresTransformERC20(opts)) {
        return false;
    }
    if (quote.isTwoHop) {
        return false;
    }
    // batchFill does not support WETH wrapping/unwrapping at the moment
    if (opts.isFromETH || opts.isToETH) {
        return false;
    }
    if (quote.orders.map(o => o.type).includes(FillQuoteTransformerOrderType.Limit)) {
        return false;
    }
    // Use Multiplex if the non-fallback sources are a subset of
    // {Uniswap, Sushiswap, RFQ, PLP}
    const nonFallbackSources = Object.keys(quote.sourceBreakdown);
    return nonFallbackSources.every(source => MULTIPLEX_BATCH_FILL_SOURCES.includes(source as ERC20BridgeSource));
}

const MULTIPLEX_MULTIHOP_FILL_SOURCES = [
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.LiquidityProvider,
];

/**
 * Returns true iff a quote can be filled via `MultiplexFeature.multiHopFill`.
 */
export function isMultiplexMultiHopFillCompatible(quote: SwapQuote, opts: ExchangeProxyContractOpts): boolean {
    if (requiresTransformERC20(opts)) {
        return false;
    }
    if (!quote.isTwoHop) {
        return false;
    }
    const [firstHopOrder, secondHopOrder] = quote.orders;
    return (
        MULTIPLEX_MULTIHOP_FILL_SOURCES.includes(firstHopOrder.source) &&
        MULTIPLEX_MULTIHOP_FILL_SOURCES.includes(secondHopOrder.source)
    );
}

/**
 * Returns true iff a quote can be filled via a VIP feature.
 */

export function isDirectSwapCompatible(
    quote: SwapQuote,
    opts: ExchangeProxyContractOpts,
    directSources: ERC20BridgeSource[],
): boolean {
    if (requiresTransformERC20(opts)) {
        return false;
    }
    // Must be a single order.
    if (quote.orders.length !== 1) {
        return false;
    }
    const order = quote.orders[0];
    if (!directSources.includes(order.source)) {
        return false;
    }
    return true;
}

/**
 * Whether a quote is a market buy or not.
 */
export function isBuyQuote(quote: SwapQuote): quote is MarketBuySwapQuote {
    return quote.type === MarketOperation.Buy;
}

function isOptimizedBridgeOrder(x: OptimizedMarketOrder): x is OptimizedMarketBridgeOrder {
    return x.type === FillQuoteTransformerOrderType.Bridge;
}

function isOptimizedLimitOrder(x: OptimizedMarketOrder): x is OptimizedMarketOrderBase<NativeLimitOrderFillData> {
    return x.type === FillQuoteTransformerOrderType.Limit;
}

function isOptimizedRfqOrder(x: OptimizedMarketOrder): x is OptimizedMarketOrderBase<NativeRfqOrderFillData> {
    return x.type === FillQuoteTransformerOrderType.Rfq;
}

/**
 * Converts the given `OptimizedMarketOrder`s into bridge, limit, and RFQ orders for
 * FillQuoteTransformer.
 */
export function getFQTTransformerDataFromOptimizedOrders(
    orders: OptimizedMarketOrder[],
): Pick<FillQuoteTransformerData, 'bridgeOrders' | 'limitOrders' | 'rfqOrders' | 'fillSequence'> {
    const fqtData: Pick<FillQuoteTransformerData, 'bridgeOrders' | 'limitOrders' | 'rfqOrders' | 'fillSequence'> = {
        bridgeOrders: [],
        limitOrders: [],
        rfqOrders: [],
        fillSequence: [],
    };

    for (const order of orders) {
        if (isOptimizedBridgeOrder(order)) {
            fqtData.bridgeOrders.push({
                bridgeData: createBridgeDataForBridgeOrder(order),
                makerTokenAmount: order.makerAmount,
                takerTokenAmount: order.takerAmount,
                source: getErc20BridgeSourceToBridgeSource(order.source),
            });
        } else if (isOptimizedLimitOrder(order)) {
            fqtData.limitOrders.push({
                order: order.fillData.order,
                signature: order.fillData.signature,
                maxTakerTokenFillAmount: order.takerAmount,
            });
        } else if (isOptimizedRfqOrder(order)) {
            fqtData.rfqOrders.push({
                order: order.fillData.order,
                signature: order.fillData.signature,
                maxTakerTokenFillAmount: order.takerAmount,
            });
        } else {
            // Should never happen
            throw new Error('Unknown Order type');
        }
        fqtData.fillSequence.push(order.type);
    }
    return fqtData;
}

/**
 * Returns true if swap quote must go through `tranformERC20`.
 */
export function requiresTransformERC20(opts: ExchangeProxyContractOpts): boolean {
    // Is a mtx.
    if (opts.isMetaTransaction) {
        return true;
    }
    // Has an affiliate fee.
    if (!opts.affiliateFee.buyTokenFeeAmount.eq(0) || !opts.affiliateFee.sellTokenFeeAmount.eq(0)) {
        return true;
    }
    // VIP does not support selling the entire balance
    if (opts.shouldSellEntireBalance) {
        return true;
    }
    return false;
}
