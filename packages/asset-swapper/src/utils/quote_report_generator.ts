import { LimitOrder, RfqOrder } from '@0x/protocol-utils';
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
} from './market_operation_utils/types';
import { QuoteRequestor } from './quote_requestor';

export interface BridgeReportSource {
    liquiditySource: Exclude<ERC20BridgeSource, ERC20BridgeSource.Native>;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    fillData?: FillData;
}

export interface MultiHopReportSource {
    liquiditySource: ERC20BridgeSource.MultiHop;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    hopSources: ERC20BridgeSource[];
    fillData: FillData;
}

interface NativeReportSourceBase {
    liquiditySource: ERC20BridgeSource.Native;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    fillableTakerAmount: BigNumber;
}
export interface NativeOrderbookReportSource extends NativeReportSourceBase {
    isRfqt: false;
    nativeOrder: LimitOrder;
}
export interface NativeRFQTReportSource extends NativeReportSourceBase {
    isRfqt: true;
    nativeOrder: RfqOrder;
    makerUri: string;
    comparisonPrice?: number;
}
export type QuoteReportSource =
    | BridgeReportSource
    | NativeOrderbookReportSource
    | NativeRFQTReportSource
    | MultiHopReportSource;

export interface QuoteReport {
    sourcesConsidered: QuoteReportSource[];
    sourcesDelivered: QuoteReportSource[];
}

/**
 * Generates a report of sources considered while computing the optimized
 * swap quote, and the sources ultimately included in the computed quote.
 */
export function generateQuoteReport(
    marketOperation: MarketOperation,
    dexQuotes: DexSample[],
    multiHopQuotes: Array<DexSample<MultiHopFillData>>,
    nativeOrders: Array<{ order: LimitOrder | RfqOrder; orderFillableAmount: BigNumber }>,
    liquidityDelivered: ReadonlyArray<CollapsedFill> | DexSample<MultiHopFillData>,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): QuoteReport {
    const dexReportSourcesConsidered = dexQuotes.map(quote => _dexSampleToReportSource(quote, marketOperation));
    const nativeOrderSourcesConsidered = nativeOrders.map(order =>
        _nativeOrderToReportSource(order.order, order.orderFillableAmount, comparisonPrice, quoteRequestor),
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
        const nativeOrderSignaturesToFillableAmounts = Object.fromEntries(
            nativeOrders.map(o => {
                return [o.order.getHash(), o.orderFillableAmount];
            }),
        );
        // map sources delivered
        sourcesDelivered = liquidityDelivered.map(collapsedFill => {
            const foundNativeOrder = _nativeOrderFromCollapsedFill(collapsedFill);
            if (foundNativeOrder) {
                return _nativeOrderToReportSource(
                    foundNativeOrder,
                    nativeOrderSignaturesToFillableAmounts[foundNativeOrder.getHash()],
                    comparisonPrice,
                    quoteRequestor,
                );
            } else {
                return _dexSampleToReportSource(collapsedFill, marketOperation);
            }
        });
    } else {
        sourcesDelivered = [_multiHopSampleToReportSource(liquidityDelivered, marketOperation)];
    }
    return {
        sourcesConsidered,
        sourcesDelivered,
    };
}

function _dexSampleToReportSource(ds: DexSample, marketOperation: MarketOperation): BridgeReportSource {
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
): MultiHopReportSource {
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

function _nativeOrderFromCollapsedFill(cf: CollapsedFill): LimitOrder | RfqOrder | undefined {
    // Cast as NativeCollapsedFill and then check
    // if it really is a NativeCollapsedFill
    const possibleNativeCollapsedFill = cf as NativeCollapsedFill;
    if (possibleNativeCollapsedFill.fillData && possibleNativeCollapsedFill.fillData.order) {
        return possibleNativeCollapsedFill.fillData.order;
    } else {
        return undefined;
    }
}

function _nativeOrderToReportSource(
    nativeOrder: RfqOrder | LimitOrder,
    fillableAmount: BigNumber,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): NativeRFQTReportSource | NativeOrderbookReportSource {
    const nativeOrderBase: NativeReportSourceBase = {
        liquiditySource: ERC20BridgeSource.Native,
        makerAmount: nativeOrder.makerAmount,
        takerAmount: nativeOrder.takerAmount,
        fillableTakerAmount: fillableAmount,
    };

    // if we find this is an rfqt order, label it as such and associate makerUri
    const foundRfqtMakerUri = quoteRequestor && quoteRequestor.getMakerUriForOrderHash(nativeOrder.getHash());
    if (foundRfqtMakerUri) {
        const rfqtSource: NativeRFQTReportSource = {
            ...nativeOrderBase,
            nativeOrder: nativeOrder as RfqOrder,
            isRfqt: true,
            makerUri: foundRfqtMakerUri,
        };
        if (comparisonPrice) {
            rfqtSource.comparisonPrice = comparisonPrice.toNumber();
        }
        return rfqtSource;
    } else {
        // if it's not an rfqt order, treat as normal
        const regularNativeOrder: NativeOrderbookReportSource = {
            ...nativeOrderBase,
            nativeOrder: nativeOrder as LimitOrder,
            isRfqt: false,
        };
        return regularNativeOrder;
    }
}
