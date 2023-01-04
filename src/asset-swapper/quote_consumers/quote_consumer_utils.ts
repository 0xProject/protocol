import { FillQuoteTransformerData, FillQuoteTransformerOrderType } from '@0x/protocol-utils';

import {
    ExchangeProxyContractOpts,
    MarketBuySwapQuote,
    MarketOperation,
    SwapQuote,
    ERC20BridgeSource,
    OptimizedMarketBridgeOrder,
    OptimizedOrder,
    OptimizedOtcOrder,
    OptimizedRfqOrder,
    OptimizedLimitOrder,
    IPath,
} from '../types';
import {
    createBridgeDataForBridgeOrder,
    getErc20BridgeSourceToBridgeSource,
} from '../utils/market_operation_utils/orders';

const MULTIPLEX_BATCH_FILL_SOURCES = [
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.Native,
    ERC20BridgeSource.UniswapV3,
];

/**
 * Returns true iff a quote can be filled via `MultiplexFeature.batchFill`.
 */
export function isMultiplexBatchFillCompatible(quote: SwapQuote, opts: ExchangeProxyContractOpts): boolean {
    if (requiresTransformERC20(opts)) {
        return false;
    }
    if (quote.path.hasTwoHop()) {
        return false;
    }
    if (
        quote.path
            .createOrders()
            .map((o) => o.type)
            .includes(FillQuoteTransformerOrderType.Limit)
    ) {
        return false;
    }
    // Use Multiplex if the non-fallback sources are a subset of
    // {UniswapV2, Sushiswap, RFQ, PLP, UniswapV3}
    const nonFallbackSources = Object.keys(quote.sourceBreakdown);
    return nonFallbackSources.every((source) => MULTIPLEX_BATCH_FILL_SOURCES.includes(source as ERC20BridgeSource));
}

const MULTIPLEX_MULTIHOP_FILL_SOURCES = [
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.UniswapV3,
];

/**
 * Returns true iff a quote can be filled via `MultiplexFeature.multiHopFill`.
 */
export function isMultiplexMultiHopFillCompatible(quote: SwapQuote, opts: ExchangeProxyContractOpts): boolean {
    if (requiresTransformERC20(opts)) {
        return false;
    }
    if (!quote.path.hasTwoHop()) {
        return false;
    }
    const [firstHopOrder, secondHopOrder] = quote.path.createOrders();
    return (
        MULTIPLEX_MULTIHOP_FILL_SOURCES.includes(firstHopOrder.source) &&
        MULTIPLEX_MULTIHOP_FILL_SOURCES.includes(secondHopOrder.source)
    );
}

/**
 * Returns true iff a quote can be filled via a VIP feature.
 */

export function isDirectSwapCompatible(
    path: IPath,
    opts: ExchangeProxyContractOpts,
    directSources: ERC20BridgeSource[],
): boolean {
    if (requiresTransformERC20(opts)) {
        return false;
    }

    const orders = path.createOrders();
    // Must be a single order.
    if (orders.length !== 1) {
        return false;
    }
    const order = orders[0];
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

function isOptimizedBridgeOrder(x: OptimizedOrder): x is OptimizedMarketBridgeOrder {
    return x.type === FillQuoteTransformerOrderType.Bridge;
}

function isOptimizedLimitOrder(x: OptimizedOrder): x is OptimizedLimitOrder {
    return x.type === FillQuoteTransformerOrderType.Limit;
}

function isOptimizedRfqOrder(x: OptimizedOrder): x is OptimizedRfqOrder {
    return x.type === FillQuoteTransformerOrderType.Rfq;
}

function isOptimizedOtcOrder(x: OptimizedOrder): x is OptimizedOtcOrder {
    return x.type === FillQuoteTransformerOrderType.Otc;
}

/**
 * Converts the given `OptimizedMarketOrder`s into bridge, limit, and RFQ orders for
 * FillQuoteTransformer.
 */
export function getFQTTransformerDataFromOptimizedOrders(
    orders: OptimizedOrder[],
): Pick<FillQuoteTransformerData, 'bridgeOrders' | 'limitOrders' | 'rfqOrders' | 'otcOrders' | 'fillSequence'> {
    const fqtData: Pick<
        FillQuoteTransformerData,
        'bridgeOrders' | 'limitOrders' | 'rfqOrders' | 'otcOrders' | 'fillSequence'
    > = {
        bridgeOrders: [],
        limitOrders: [],
        rfqOrders: [],
        otcOrders: [],
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
        } else if (isOptimizedOtcOrder(order)) {
            fqtData.otcOrders.push({
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
