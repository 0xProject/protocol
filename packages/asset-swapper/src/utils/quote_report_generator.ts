import {
    FillQuoteTransformerOrderType,
    LimitOrder,
    LimitOrderFields,
    RfqOrder,
    RfqOrderFields,
} from '@0x/protocol-utils';
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
    const dexReportSourcesConsidered = dexQuotes.map(quote => _dexSampleToReportSource(quote, marketOperation));
    const nativeOrderSourcesConsidered = nativeOrders.map(order =>
        _nativeOrderToReportEntry(order.type, order as any, order.fillableTakerAmount, comparisonPrice, quoteRequestor),
    );
    const multiHopSourcesConsidered = multiHopQuotes.map(quote =>
        _multiHopSampleToReportSource(quote, marketOperation),
    );
    const sourcesConsidered = [
        ...dexReportSourcesConsidered,
        ...nativeOrderSourcesConsidered,
        ...multiHopSourcesConsidered,
    ];

    let sourcesDelivered;
    if (Array.isArray(liquidityDelivered)) {
        // create easy way to look up fillable amounts
        const nativeOrderSignaturesToFillableAmounts = _.fromPairs(
            nativeOrders.map(o => {
                return [
                    o.type === FillQuoteTransformerOrderType.Rfq
                        ? new RfqOrder(o.order).getHash()
                        : new LimitOrder(o.order).getHash(),
                    o.fillableTakerAmount,
                ];
            }),
        );
        // map sources delivered
        sourcesDelivered = liquidityDelivered.map(collapsedFill => {
            const foundNativeFill = _nativeOrderFromCollapsedFill(collapsedFill);
            if (foundNativeFill) {
                return _nativeOrderToReportEntry(
                    foundNativeFill.type,
                    foundNativeFill.fillData!,
                    nativeOrderSignaturesToFillableAmounts[getOrder(foundNativeFill.fillData!).getHash()],
                    comparisonPrice,
                    quoteRequestor,
                );
            } else {
                return _dexSampleToReportSource(collapsedFill, marketOperation);
            }
        });
    } else {
        sourcesDelivered = [
            // tslint:disable-next-line: no-unnecessary-type-assertion
            _multiHopSampleToReportSource(liquidityDelivered as DexSample<MultiHopFillData>, marketOperation),
        ];
    }
    return {
        sourcesConsidered,
        sourcesDelivered,
    };
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

function _nativeOrderFromCollapsedFill(cf: CollapsedFill): NativeCollapsedFill | undefined {
    // Cast as NativeCollapsedFill and then check
    // if it really is a NativeCollapsedFill
    const { type } = cf;
    if (type === FillQuoteTransformerOrderType.Limit || type === FillQuoteTransformerOrderType.Rfq) {
        return cf as NativeCollapsedFill;
    } else {
        return undefined;
    }
}

function _nativeOrderToReportEntry(
    type: FillQuoteTransformerOrderType,
    fillData: NativeLimitOrderFillData | NativeRfqOrderFillData,
    fillableAmount: BigNumber,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): NativeRfqOrderQuoteReportEntry | NativeLimitOrderQuoteReportEntry {
    const nativeOrderBase = {
        liquiditySource: ERC20BridgeSource.Native,
        makerAmount: fillData.order.makerAmount,
        takerAmount: fillData.order.takerAmount,
        fillableTakerAmount: fillableAmount,
    };

    // if we find this is an rfqt order, label it as such and associate makerUri
    const isRfqt = type === FillQuoteTransformerOrderType.Rfq;
    const rfqtMakerUri = isRfqt ? quoteRequestor!.getMakerUriForSignature(fillData.signature) : undefined;

    if (isRfqt) {
        // tslint:disable-next-line: no-object-literal-type-assertion
        return {
            ...nativeOrderBase,
            nativeOrder: fillData.order as RfqOrderFields,
            isRfqt: true,
            makerUri: rfqtMakerUri || '', // potentially undefined, do we want to return as limit order instead?
            ...(comparisonPrice ? { comparisonPrice: comparisonPrice.toNumber() } : {}),
        } as NativeRfqOrderQuoteReportEntry;
    } else {
        // tslint:disable-next-line: no-object-literal-type-assertion
        return {
            ...nativeOrderBase,
            isRfqt: false,
            nativeOrder: fillData.order,
        } as NativeLimitOrderQuoteReportEntry;
    }
}
