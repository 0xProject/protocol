import { FillQuoteTransformerOrderType, RfqOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { Address, MarketOperation } from '../types';

import {
    DexSample,
    ERC20BridgeSource,
    RawHopQuotes,
    OptimizedHop,
    OptimizedNativeOrder,
} from './market_operation_utils/types';
import { NativeOrderWithFillableAmounts } from './native_orders';
import { QuoteRequestor } from './quote_requestor';

export interface QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    fillData: any;
}
export interface BridgeQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: Exclude<ERC20BridgeSource, ERC20BridgeSource.Native>;
}

export interface MultiHopQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.MultiHop;
    hopSources: ERC20BridgeSource[];
}

export interface NativeLimitOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillData: any;
    fillableTakerAmount: BigNumber;
    isRfqt: false;
}

export interface NativeRfqOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillData: any;
    fillableTakerAmount: BigNumber;
    isRfqt: true;
    nativeOrder: RfqOrderFields;
    makerUri: string;
    comparisonPrice?: number;
}

export type QuoteReportEntry =
    | BridgeQuoteReportEntry
    | MultiHopQuoteReportEntry
    | NativeLimitOrderQuoteReportEntry
    | NativeRfqOrderQuoteReportEntry;

export interface QuoteReport {
    sourcesConsidered: QuoteReportEntry[];
    sourcesDelivered: QuoteReportEntry[];
}

export interface PriceComparisonsReport {
    dexSources: BridgeQuoteReportEntry[];
    multiHopSources: MultiHopQuoteReportEntry[];
    nativeSources: Array<NativeLimitOrderQuoteReportEntry | NativeRfqOrderQuoteReportEntry>;
}

/**
 * Generates a report of sources considered while computing the optimized
 * swap quote, and the sources ultimately included in the computed quote.
 */
export function generateQuoteReport(opts: {
    side: MarketOperation,
    inputToken: Address,
    outputToken: Address,
    rawHopQuotes: RawHopQuotes[],
    hops: OptimizedHop[],
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
}): QuoteReport {
    const { inputToken, outputToken, side } = opts;
    // Only handle direct taker -> maker raw hops.
    const { nativeOrders } = opts.rawHopQuotes
        .filter(h => h.inputToken === inputToken && h.outputToken === outputToken)
        .flat(1)
        .reduce((a, q) => ({ ...a, dexQuotes: a.dexQuotes.concat(q.dexQuotes), nativeOrders: a.nativeOrders.concat(q.nativeOrders)}));
    // According to the old code, we only include RFQT samples in quote report?
    const sourcesConsidered = nativeOrders
        .filter(o => o.type === FillQuoteTransformerOrderType.Rfq)
        .map(o => nativeOrderToReportEntry(side, o, opts.comparisonPrice, opts.quoteRequestor));

    let sourcesDelivered;
    if (opts.hops.length === 1) {
        // Single-hop.
        const [hop] = opts.hops;
        sourcesDelivered = hop.orders.map(o => {
            switch (o.type) {
                default: {
                    const [makerAmount, takerAmount] = side === MarketOperation.Sell
                    ? [o.outputAmount, o.inputAmount]
                    : [o.inputAmount, o.outputAmount];
                    return {
                        makerAmount,
                        takerAmount,
                        liquiditySource: o.source,
                        fillData: {}, // Does this matter?
                    } as BridgeQuoteReportEntry;
                }
                case FillQuoteTransformerOrderType.Limit:
                case FillQuoteTransformerOrderType.Rfq: {
                    return nativeOrderToReportEntry(side, o, opts.comparisonPrice, opts.quoteRequestor);
                }
            }
        });
    } else {
        // Multi-hop.
        const firstHop = opts.hops[0];
        const lastHop = opts.hops[opts.hops.length - 1];
        const [makerAmount, takerAmount] = side === MarketOperation.Sell
            ? [lastHop.outputAmount, firstHop.inputAmount]
            : [firstHop.inputAmount, lastHop.outputAmount];
        sourcesDelivered = [
            {
                makerAmount,
                takerAmount,
                liquiditySource: ERC20BridgeSource.MultiHop,
                fillData: {},
                hopSources: opts.hops.map(h => h.orders.map(o => o.source)).flat(1),
            } as MultiHopQuoteReportEntry,
        ];
    }
    return {
        sourcesConsidered,
        sourcesDelivered,
    };
}

export function dexSampleToReportSource(
    side: MarketOperation,
    sample: DexSample,
): BridgeQuoteReportEntry {
    const [makerAmount, takerAmount] = side === MarketOperation.Sell
        ? [sample.output, sample.input]
        : [sample.input, sample.output];
    return {
        makerAmount,
        takerAmount,
        liquiditySource: sample.source,
        fillData: {}, // Does this matter?
    } as BridgeQuoteReportEntry;
}

/**
 * Generates a report entry for a native order
 * NOTE: this is used for the QuoteReport and quote price comparison data
 */
export function nativeOrderToReportEntry(
    side: MarketOperation,
    order: OptimizedNativeOrder | NativeOrderWithFillableAmounts,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): NativeRfqOrderQuoteReportEntry | NativeLimitOrderQuoteReportEntry {
    let nativeOrder;
    let makerAmount;
    let takerAmount;
    let fillableTakerAmount;
    let signature;
    if (isOptimizedNativeOrder(order)) {
        nativeOrder = order.fillData.order;
        fillableTakerAmount = order.fillData.fillableTakerAmount;
        signature = order.fillData.signature;
        [makerAmount, takerAmount] = side === MarketOperation.Sell
            ? [order.outputAmount, order.outputAmount]
            : [order.inputAmount, order.outputAmount];
    } else {
        nativeOrder = order.order;
        fillableTakerAmount = order.fillableTakerAmount;
        signature = order.signature;
        [makerAmount, takerAmount] = [nativeOrder.makerAmount, nativeOrder.takerAmount];
    }
    const isRfqt = order.type === FillQuoteTransformerOrderType.Rfq;
    // if we find this is an rfqt order, label it as such and associate makerUri
    const rfqtMakerUri =
        isRfqt && quoteRequestor ? quoteRequestor.getMakerUriForSignature(signature) : '';

    return {
        makerAmount,
        takerAmount,
        isRfqt,
        fillableTakerAmount,
        liquiditySource: ERC20BridgeSource.Native,
        fillData: {},
        ...(isRfqt
            ? {
                makerUri: rfqtMakerUri,
                nativeOrder,
                ...(comparisonPrice ? { comparisonPrice: comparisonPrice.toNumber() } : {}),
            }
            : {}
        ),
    } as NativeRfqOrderQuoteReportEntry | NativeLimitOrderQuoteReportEntry;
}

function isOptimizedNativeOrder(order: OptimizedNativeOrder | NativeOrderWithFillableAmounts): order is OptimizedNativeOrder {
    return !!(order as any).fillData;
}
