import { LimitOrder, LimitOrderFields, RfqOrder, RfqOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { MarketOperation } from '../types';

import {
    CollapsedFill,
    DexSample,
    ERC20BridgeSource,
    FillData,
    MultiHopFillData,
    NativeCollapsedFill,
    NativeLimitOrderFillData,
    NativeOrderWithFillableAmounts,
    NativeRfqOrderFillData,
} from './market_operation_utils/types';
import { QuoteRequestor } from './quote_requestor';

export interface QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
}
export interface BridgeQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: Exclude<ERC20BridgeSource, ERC20BridgeSource.Native>;
    fillData?: FillData;
}

export interface MultiHopQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.MultiHop;
    hopSources: ERC20BridgeSource[];
    fillData: FillData;
}

export interface NativeLimitOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    nativeOrder: LimitOrderFields;
    fillableTakerAmount: BigNumber;
    isRfqt: false;
}

export interface NativeRfqOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    nativeOrder: RfqOrderFields;
    fillableTakerAmount: BigNumber;
    isRfqt: true;
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

function isFillDataLimitOrder(fillData: NativeRfqOrderFillData | NativeLimitOrderFillData): boolean {
    return (fillData as NativeRfqOrderFillData).order.txOrigin === undefined;
}

function getOrder(fillData: NativeRfqOrderFillData | NativeLimitOrderFillData): RfqOrder | LimitOrder {
    return isFillDataLimitOrder(fillData) ? new LimitOrder(fillData.order) : new RfqOrder(fillData.order);
}

/**
 * Generates a report of sources considered while computing the optimized
 * swap quote, and the sources ultimately included in the computed quote.
 */
export function generateQuoteReport(
    marketOperation: MarketOperation,
    dexQuotes: DexSample[],
    multiHopQuotes: Array<DexSample<MultiHopFillData>>,
    nativeOrders: NativeOrderWithFillableAmounts[],
    liquidityDelivered: ReadonlyArray<CollapsedFill> | DexSample<MultiHopFillData>,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): QuoteReport {
    throw new Error('Bleh');
    // const dexReportSourcesConsidered = dexQuotes.map(quote => _dexSampleToReportSource(quote, marketOperation));
    // const nativeOrderSourcesConsidered = nativeOrders.map(order =>
    //    _nativeOrderToReportSource(
    //        { ...order.order, signature: order.signature },
    //        order.fillableTakerAmount,
    //        comparisonPrice,
    //        quoteRequestor,
    //    ),
    // );
    // const multiHopSourcesConsidered = multiHopQuotes.map(quote =>
    //    _multiHopSampleToReportSource(quote, marketOperation),
    // );
    // const sourcesConsidered = [
    //    ...dexReportSourcesConsidered,
    //    ...nativeOrderSourcesConsidered,
    //    ...multiHopSourcesConsidered,
    // ];

    // let sourcesDelivered;
    // if (Array.isArray(liquidityDelivered)) {
    //    // create easy way to look up fillable amounts
    //    const nativeOrderSignaturesToFillableAmounts = Object.fromEntries(
    //        nativeOrders.map(o => {
    //            return [
    //                o.type === FillQuoteTransformerOrderType.Rfq
    //                    ? new RfqOrder(o.order).getHash()
    //                    : new LimitOrder(o.order).getHash(),
    //                o.fillableTakerAmount,
    //            ];
    //        }),
    //    );
    //    // map sources delivered
    //    sourcesDelivered = liquidityDelivered.map(collapsedFill => {
    //        const foundNativeOrder = _nativeOrderFromCollapsedFill(collapsedFill);
    //        if (foundNativeOrder) {
    //            return _nativeOrderToReportSource(
    //                foundNativeOrder,
    //                nativeOrderSignaturesToFillableAmounts[getOrder(foundNativeOrder).getHash()],
    //                comparisonPrice,
    //                quoteRequestor,
    //            );
    //        } else {
    //            return _dexSampleToReportSource(collapsedFill, marketOperation);
    //        }
    //    });
    // } else {
    //    sourcesDelivered = [_multiHopSampleToReportSource(liquidityDelivered, marketOperation)];
    // }
    // return {
    //    sourcesConsidered,
    //    sourcesDelivered,
    // };
}

function _dexSampleToReportSource(ds: DexSample, marketOperation: MarketOperation): BridgeQuoteReportEntry {
    const liquiditySource = ds.source;

    if (liquiditySource === ERC20BridgeSource.Native) {
        throw new Error(`Unexpected liquidity source Native`);
    }

    // input and output map to different values
    // based on the market operation
    if (marketOperation === MarketOperation.Buy) {
        return {
            makerAmount: ds.input,
            takerAmount: ds.output,
            liquiditySource,
            fillData: ds.fillData,
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            makerAmount: ds.output,
            takerAmount: ds.input,
            liquiditySource,
            fillData: ds.fillData,
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}

function _multiHopSampleToReportSource(
    ds: DexSample<MultiHopFillData>,
    marketOperation: MarketOperation,
): MultiHopQuoteReportEntry {
    const { firstHopSource: firstHop, secondHopSource: secondHop } = ds.fillData!;
    // input and output map to different values
    // based on the market operation
    if (marketOperation === MarketOperation.Buy) {
        return {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: ds.input,
            takerAmount: ds.output,
            fillData: ds.fillData!,
            hopSources: [firstHop.source, secondHop.source],
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: ds.output,
            takerAmount: ds.input,
            fillData: ds.fillData!,
            hopSources: [firstHop.source, secondHop.source],
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}

function _nativeOrderFromCollapsedFill(
    cf: CollapsedFill,
): NativeRfqOrderFillData | NativeLimitOrderFillData | undefined {
    // Cast as NativeCollapsedFill and then check
    // if it really is a NativeCollapsedFill
    const possibleNativeCollapsedFill = cf as NativeCollapsedFill;
    if (possibleNativeCollapsedFill.fillData) {
        return possibleNativeCollapsedFill.fillData;
    } else {
        return undefined;
    }
}

function _nativeOrderToReportEntry(
    nativeOrder: NativeRfqOrderFillData | NativeLimitOrderFillData,
    fillableAmount: BigNumber,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): NativeRfqOrderQuoteReportEntry | NativeLimitOrderQuoteReportEntry {
    const nativeOrderBase = {
        liquiditySource: ERC20BridgeSource.Native,
        makerAmount: nativeOrder.order.makerAmount,
        takerAmount: nativeOrder.order.takerAmount,
        fillableTakerAmount: fillableAmount,
    };

    // if we find this is an rfqt order, label it as such and associate makerUri
    const isRfqt =
        quoteRequestor &&
        // TODO jacob HACK
        (nativeOrder as NativeRfqOrderFillData).order.txOrigin;

    const rfqtMakerUri = isRfqt ? quoteRequestor!.getMakerUriForSignature(nativeOrder.signature) : undefined;

    if (isRfqt) {
        return {
            ...nativeOrderBase,
            nativeOrder: nativeOrder.order as RfqOrderFields,
            isRfqt: true,
            makerUri: rfqtMakerUri || '', // potentially undefined, do we want to return as limit order instead?
            comparisonPrice: comparisonPrice ? comparisonPrice.toNumber() : comparisonPrice,
        } as NativeRfqOrderQuoteReportEntry;
    } else {
        return {
            ...nativeOrderBase,
            isRfqt: false,
            nativeOrder: nativeOrder.order,
        } as NativeLimitOrderQuoteReportEntry;
    }
}
