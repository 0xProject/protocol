import { FillQuoteTransformerOrderType, RfqOrderFields, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import _ = require('lodash');

import { MarketOperation, NativeOrderWithFillableAmounts } from '../types';

import { NATIVE_LIMIT_ORDER_GAS_USED, NATIVE_RFQT_GAS_USED } from './market_operation_utils/constants';
import {
    CollapsedFill,
    DexSample,
    ERC20BridgeSource,
    FillData,
    MultiHopFillData,
    NativeCollapsedFill,
    NativeFillData,
    NativeLimitOrderFillData,
    NativeRfqOrderFillData,
} from './market_operation_utils/types';
import { QuoteRequestor } from './quote_requestor';

export interface QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    fillData: FillData;
    gasUsed: BigNumber;
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
    fillData: NativeFillData;
    fillableTakerAmount: BigNumber;
    isRfqt: false;
}

export interface NativeRfqOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillData: NativeFillData;
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
export function generateQuoteReport(
    marketOperation: MarketOperation,
    nativeOrders: NativeOrderWithFillableAmounts[],
    liquidityDelivered: ReadonlyArray<CollapsedFill> | DexSample<MultiHopFillData>,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): QuoteReport {
    const nativeOrderSourcesConsidered = nativeOrders.map(order =>
        nativeOrderToReportEntry(order.type, order as any, order.fillableTakerAmount, comparisonPrice, quoteRequestor),
    );
    const sourcesConsidered = [...nativeOrderSourcesConsidered.filter(order => order.isRfqt)];

    let sourcesDelivered;
    if (Array.isArray(liquidityDelivered)) {
        // create easy way to look up fillable amounts
        const nativeOrderSignaturesToFillableAmounts = _.fromPairs(
            nativeOrders.map(o => {
                return [_nativeDataToId(o), o.fillableTakerAmount];
            }),
        );
        // map sources delivered
        sourcesDelivered = liquidityDelivered.map(collapsedFill => {
            if (_isNativeOrderFromCollapsedFill(collapsedFill)) {
                return nativeOrderToReportEntry(
                    collapsedFill.type,
                    collapsedFill.fillData,
                    nativeOrderSignaturesToFillableAmounts[_nativeDataToId(collapsedFill.fillData)],
                    comparisonPrice,
                    quoteRequestor,
                );
            } else {
                return dexSampleToReportSource(collapsedFill, marketOperation);
            }
        });
    } else {
        sourcesDelivered = [
            // tslint:disable-next-line: no-unnecessary-type-assertion
            multiHopSampleToReportSource(liquidityDelivered as DexSample<MultiHopFillData>, marketOperation),
        ];
    }
    return {
        sourcesConsidered,
        sourcesDelivered,
    };
}

function _nativeDataToId(data: { signature: Signature }): string {
    const { v, r, s } = data.signature;
    return `${v}${r}${s}`;
}

/**
 * Generates a report sample for a DEX source
 * NOTE: this is used for the QuoteReport and quote price comparison data
 */
export function dexSampleToReportSource(ds: DexSample, marketOperation: MarketOperation): BridgeQuoteReportEntry {
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
            gasUsed: ds.gasUsed,
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            makerAmount: ds.output,
            takerAmount: ds.input,
            liquiditySource,
            fillData: ds.fillData,
            gasUsed: ds.gasUsed,
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}

/**
 * Generates a report sample for a MultiHop source
 * NOTE: this is used for the QuoteReport and quote price comparison data
 */
export function multiHopSampleToReportSource(
    ds: DexSample<MultiHopFillData>,
    marketOperation: MarketOperation,
): MultiHopQuoteReportEntry {
    const { firstHopSource: firstHop, secondHopSource: secondHop } = ds.fillData;
    // input and output map to different values
    // based on the market operation
    if (marketOperation === MarketOperation.Buy) {
        return {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: ds.input,
            takerAmount: ds.output,
            fillData: ds.fillData,
            hopSources: [firstHop.source, secondHop.source],
            gasUsed: ds.gasUsed,
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: ds.output,
            takerAmount: ds.input,
            fillData: ds.fillData,
            hopSources: [firstHop.source, secondHop.source],
            gasUsed: ds.gasUsed,
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}

function _isNativeOrderFromCollapsedFill(cf: CollapsedFill): cf is NativeCollapsedFill {
    const { type } = cf;
    return type === FillQuoteTransformerOrderType.Limit || type === FillQuoteTransformerOrderType.Rfq;
}

/**
 * Generates a report entry for a native order
 * NOTE: this is used for the QuoteReport and quote price comparison data
 */
export function nativeOrderToReportEntry(
    type: FillQuoteTransformerOrderType,
    fillData: NativeLimitOrderFillData | NativeRfqOrderFillData,
    fillableAmount: BigNumber,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): NativeRfqOrderQuoteReportEntry | NativeLimitOrderQuoteReportEntry {
    const nativeOrderBase = {
        makerAmount: fillData.order.makerAmount,
        takerAmount: fillData.order.takerAmount,
        fillableTakerAmount: fillableAmount,
    };

    // if we find this is an rfqt order, label it as such and associate makerUri
    const isRfqt = type === FillQuoteTransformerOrderType.Rfq;
    const rfqtMakerUri =
        isRfqt && quoteRequestor ? quoteRequestor.getMakerUriForSignature(fillData.signature) : undefined;

    if (isRfqt) {
        const nativeOrder = fillData.order as RfqOrderFields;
        // tslint:disable-next-line: no-object-literal-type-assertion
        return {
            liquiditySource: ERC20BridgeSource.Native,
            ...nativeOrderBase,
            isRfqt: true,
            makerUri: rfqtMakerUri || '',
            ...(comparisonPrice ? { comparisonPrice: comparisonPrice.toNumber() } : {}),
            nativeOrder,
            fillData,
            gasUsed: NATIVE_RFQT_GAS_USED,
        };
    } else {
        // tslint:disable-next-line: no-object-literal-type-assertion
        return {
            liquiditySource: ERC20BridgeSource.Native,
            ...nativeOrderBase,
            isRfqt: false,
            fillData,
            gasUsed: NATIVE_LIMIT_ORDER_GAS_USED,
        };
    }
}
