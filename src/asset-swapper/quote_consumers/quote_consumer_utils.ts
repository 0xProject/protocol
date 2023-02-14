import { ContractAddresses } from '@0x/contract-addresses';
import { IZeroExContract } from '@0x/contract-wrappers';
import { FillQuoteTransformerData, FillQuoteTransformerOrderType, findTransformerNonce } from '@0x/protocol-utils';

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
import { TransformerNonces } from './types';

const MULTIPLEX_BATCH_FILL_SOURCES = [
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.Native,
    ERC20BridgeSource.UniswapV3,
];

export function createExchangeProxyWithoutProvider(exchangeProxyAddress: string): IZeroExContract {
    const fakeProvider = {
        sendAsync(): void {
            return;
        },
    };
    return new IZeroExContract(exchangeProxyAddress, fakeProvider);
}

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
            .getOrders()
            .map((o) => o.type)
            .includes(FillQuoteTransformerOrderType.Limit)
    ) {
        return false;
    }
    // Use Multiplex if the non-fallback sources are a subset of
    // {UniswapV2, Sushiswap, RFQ, PLP, UniswapV3}
    const nonFallbackSources = quote.path.getOrders().map((o) => o.source);
    return nonFallbackSources.every((source) => MULTIPLEX_BATCH_FILL_SOURCES.includes(source as ERC20BridgeSource));
}

const MULTIPLEX_MULTIHOP_FILL_SOURCES = [
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.UniswapV3,
];

/**
 * Returns true if a path can be filled via `MultiplexFeature.multiplexMultiHop*`.
 */
export function isMultiplexMultiHopFillCompatible(path: IPath, opts: ExchangeProxyContractOpts): boolean {
    if (requiresTransformERC20(opts)) {
        return false;
    }
    const { bridgeOrders, nativeOrders, twoHopOrders } = path.getOrdersByType();

    // Path shouldn't have any other type of order.
    if (bridgeOrders.length !== 0 || nativeOrders.length !== 0) {
        return false;
    }

    // MultiplexFeature only supports single two hop order.
    if (twoHopOrders.length !== 1) {
        return false;
    }

    const { firstHopOrder, secondHopOrder } = twoHopOrders[0];
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

    const orders = path.getOrders();
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

export function getMaxQuoteSlippageRate(quote: SwapQuote): number {
    return quote.worstCaseQuoteInfo.slippage;
}

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
 * Returns true if swap quote must go through `transformERC20`.
 */
export function requiresTransformERC20(opts: ExchangeProxyContractOpts): boolean {
    // Is a mtx.
    if (opts.metaTransactionVersion !== undefined) {
        return true;
    }
    // Has an affiliate fee.
    const affiliateFees = [...opts.sellTokenAffiliateFees, ...opts.buyTokenAffiliateFees];
    if (affiliateFees.some((f) => f.buyTokenFeeAmount.gt(0) || f.sellTokenFeeAmount.gt(0))) {
        return true;
    }

    // VIP does not support selling the entire balance
    if (opts.shouldSellEntireBalance) {
        return true;
    }
    return false;
}

export function getTransformerNonces(contractAddresses: ContractAddresses): TransformerNonces {
    return {
        wethTransformer: findTransformerNonce(
            contractAddresses.transformers.wethTransformer,
            contractAddresses.exchangeProxyTransformerDeployer,
        ),
        payTakerTransformer: findTransformerNonce(
            contractAddresses.transformers.payTakerTransformer,
            contractAddresses.exchangeProxyTransformerDeployer,
        ),
        fillQuoteTransformer: findTransformerNonce(
            contractAddresses.transformers.fillQuoteTransformer,
            contractAddresses.exchangeProxyTransformerDeployer,
        ),
        affiliateFeeTransformer: findTransformerNonce(
            contractAddresses.transformers.affiliateFeeTransformer,
            contractAddresses.exchangeProxyTransformerDeployer,
        ),
        positiveSlippageFeeTransformer: findTransformerNonce(
            contractAddresses.transformers.positiveSlippageFeeTransformer,
            contractAddresses.exchangeProxyTransformerDeployer,
        ),
    };
}
