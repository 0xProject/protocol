import { FillQuoteTransformerOrderType, RfqOrderFields, Signature } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import _ = require('lodash');

import {
    MarketOperation,
    NativeOrderWithFillableAmounts,
    ERC20BridgeSource,
    Fill,
    NativeFillData,
    ExtendedQuoteReportIndexedEntry,
    BridgeQuoteReportEntry,
    MultiHopQuoteReportEntry,
    NativeLimitOrderQuoteReportEntry,
    NativeRfqOrderQuoteReportEntry,
    ExtendedQuoteReportSources,
    ExtendedQuoteReportEntry,
    IndicativeRfqOrderQuoteReportEntry,
    QuoteReport,
} from '../types';

import { DexSample, MultiHopFillData, RawQuotes } from './market_operation_utils/types';
import { QuoteRequestor, V4RFQIndicativeQuoteMM } from './quote_requestor';

type ExtendedQuoteReportIndexedEntryOutbound = Omit<ExtendedQuoteReportIndexedEntry, 'fillData'> & {
    fillData?: string;
};

export interface ExtendedQuoteReport {
    quoteId?: string;
    taker?: string;
    timestamp: number;
    firmQuoteReport: boolean;
    submissionBy: 'taker' | 'gaslessSwapAmm' | 'rfqm';
    buyAmount?: string;
    sellAmount?: string;
    buyTokenAddress: string;
    sellTokenAddress: string;
    integratorId?: string;
    slippageBips?: number;
    zeroExTransactionHash?: string;
    decodedUniqueId?: string;
    sourcesConsidered: ExtendedQuoteReportIndexedEntryOutbound[];
    sourcesDelivered: ExtendedQuoteReportIndexedEntryOutbound[] | undefined;
    blockNumber: number | undefined;
    estimatedGas: string;
    enableSlippageProtection?: boolean;
    expectedSlippage?: string;
    estimatedPriceImpact?: string;
    priceImpactProtectionPercentage: number;
}

/**
 * Generates a report of sources considered while computing the optimized
 * swap quote, and the sources ultimately included in the computed quote.
 */
export function generateQuoteReport(
    marketOperation: MarketOperation,
    nativeOrders: NativeOrderWithFillableAmounts[],
    liquidityDelivered: ReadonlyArray<Fill> | DexSample<MultiHopFillData>,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): QuoteReport {
    const nativeOrderSourcesConsidered = nativeOrders.map((order) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
        nativeOrderToReportEntry(order.type, order as any, order.fillableTakerAmount, comparisonPrice, quoteRequestor),
    );
    const sourcesConsidered = [...nativeOrderSourcesConsidered.filter((order) => order.isRFQ)];

    let sourcesDelivered;
    if (Array.isArray(liquidityDelivered)) {
        // create easy way to look up fillable amounts
        const nativeOrderSignaturesToFillableAmounts = _.fromPairs(
            nativeOrders.map((o) => {
                return [_nativeDataToId(o), o.fillableTakerAmount];
            }),
        );
        // map sources delivered
        sourcesDelivered = liquidityDelivered.map((collapsedFill) => {
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
            multiHopSampleToReportSource(liquidityDelivered as DexSample<MultiHopFillData>, marketOperation),
        ];
    }
    return {
        sourcesConsidered,
        sourcesDelivered,
    };
}

/**
 * Generates a report of sources considered while computing the optimized
 * swap quote, the sources ultimately included in the computed quote. This
 * extende version incudes all considered quotes, not only native liquidity.
 */
export function generateExtendedQuoteReportSources(
    marketOperation: MarketOperation,
    quotes: RawQuotes,
    liquidityDelivered: ReadonlyArray<Fill> | DexSample<MultiHopFillData>,
    amount: BigNumber,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): ExtendedQuoteReportSources {
    const sourcesConsidered: ExtendedQuoteReportEntry[] = [];

    // NativeOrders
    sourcesConsidered.push(
        ...quotes.nativeOrders.map((order) =>
            nativeOrderToReportEntry(
                order.type,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
                order as any,
                order.fillableTakerAmount,
                comparisonPrice,
                quoteRequestor,
            ),
        ),
    );

    // IndicativeQuotes
    sourcesConsidered.push(
        ...quotes.rfqtIndicativeQuotes.map((order) => indicativeQuoteToReportEntry(order, comparisonPrice)),
    );

    // MultiHop
    sourcesConsidered.push(
        ..._.flatMap(quotes.twoHopQuotes, (samples) => {
            return samples.map((sample) => multiHopSampleToReportSource(sample, marketOperation));
        }),
    );

    // Dex Quotes
    sourcesConsidered.push(
        ..._.flatten(
            quotes.dexQuotes.map((dex) =>
                dex
                    .filter((quote) => isDexSampleFilter(quote, amount))
                    .map((quote) => dexSampleToReportSource(quote, marketOperation)),
            ),
        ),
    );
    const sourcesConsideredIndexed = sourcesConsidered.map((quote, index): ExtendedQuoteReportIndexedEntry => {
        return {
            ...quote,
            quoteEntryIndex: index,
            isDelivered: false,
        };
    });
    let sourcesDelivered;
    if (Array.isArray(liquidityDelivered)) {
        // create easy way to look up fillable amounts
        const nativeOrderSignaturesToFillableAmounts = _.fromPairs(
            quotes.nativeOrders.map((o) => {
                return [_nativeDataToId(o), o.fillableTakerAmount];
            }),
        );
        // map sources delivered
        sourcesDelivered = liquidityDelivered.map((collapsedFill) => {
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
            multiHopSampleToReportSource(liquidityDelivered as DexSample<MultiHopFillData>, marketOperation),
        ];
    }
    const sourcesDeliveredIndexed = sourcesDelivered.map((quote, index): ExtendedQuoteReportIndexedEntry => {
        return {
            ...quote,
            quoteEntryIndex: index,
            isDelivered: false,
        };
    });

    return {
        sourcesConsidered: sourcesConsideredIndexed,
        sourcesDelivered: sourcesDeliveredIndexed,
    };
}

function _nativeDataToId(data: { signature: Signature }): string {
    const { v, r, s } = data.signature;
    return `${v}${r}${s}`;
}

/**
 * Generates a report sample for a DEX source
 * NOTE: this is used for the QuoteReport.
 */
function dexSampleToReportSource(ds: DexSample, marketOperation: MarketOperation): BridgeQuoteReportEntry {
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

/**
 * Checks if a DEX sample is the one that represents the whole amount requested by taker
 * NOTE: this is used for the QuoteReport to filter samples
 */
function isDexSampleFilter(ds: DexSample, amount: BigNumber): boolean {
    // The entry is for the total amont, not a sampler entry && there was liquidity in the source
    return ds.input.eq(amount) && ds.output.isGreaterThan(0);
}

/**
 * Generates a report sample for a MultiHop source
 * NOTE: this is used for the QuoteReport.
 */
function multiHopSampleToReportSource(
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
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: ds.output,
            takerAmount: ds.input,
            fillData: ds.fillData,
            hopSources: [firstHop.source, secondHop.source],
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}

function _isNativeOrderFromCollapsedFill(cf: Fill): cf is Fill<NativeFillData> {
    const { type } = cf;
    switch (type) {
        case FillQuoteTransformerOrderType.Limit:
        case FillQuoteTransformerOrderType.Rfq:
        case FillQuoteTransformerOrderType.Otc:
            return true;
        case FillQuoteTransformerOrderType.Bridge:
            return false;
        default:
            ((_x: never) => {
                throw new Error('unreachable');
            })(type);
    }
}

function _isRFQOrderfromType(orderType: FillQuoteTransformerOrderType) {
    switch (orderType) {
        case FillQuoteTransformerOrderType.Rfq:
        case FillQuoteTransformerOrderType.Otc:
            return true;
        case FillQuoteTransformerOrderType.Limit:
        case FillQuoteTransformerOrderType.Bridge:
            return false;
        default:
            ((_: never) => {
                throw new Error('unreachable');
            })(orderType);
    }
}

/**
 * Generates a report entry for a native order
 * NOTE: this is used for the QuoteReport.
 */
function nativeOrderToReportEntry(
    type: FillQuoteTransformerOrderType,
    fillData: NativeFillData,
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
    const isRFQ = _isRFQOrderfromType(type);
    const rfqtMakerUri =
        isRFQ && quoteRequestor ? quoteRequestor.getMakerUriForSignature(fillData.signature) : undefined;

    if (isRFQ) {
        const nativeOrder = fillData.order as RfqOrderFields;
        return {
            liquiditySource: ERC20BridgeSource.Native,
            ...nativeOrderBase,
            isRFQ: true,
            makerUri: rfqtMakerUri || '',
            ...(comparisonPrice ? { comparisonPrice: comparisonPrice.toNumber() } : {}),
            nativeOrder,
            fillData,
        };
    } else {
        return {
            liquiditySource: ERC20BridgeSource.Native,
            ...nativeOrderBase,
            isRFQ: false,
            fillData,
        };
    }
}

/**
 * Generates a report entry for an indicative RFQ Quote
 * NOTE: this is used for the QuoteReport and quote price comparison data
 */
function indicativeQuoteToReportEntry(
    order: V4RFQIndicativeQuoteMM,
    comparisonPrice?: BigNumber | undefined,
): IndicativeRfqOrderQuoteReportEntry {
    const nativeOrderBase = {
        makerAmount: order.makerAmount,
        takerAmount: order.takerAmount,
        fillableTakerAmount: order.takerAmount,
    };

    return {
        liquiditySource: ERC20BridgeSource.Native,
        ...nativeOrderBase,
        isRFQ: true,
        makerUri: order.makerUri,
        fillData: {},
        ...(comparisonPrice ? { comparisonPrice: comparisonPrice.toNumber() } : {}),
    };
}

/**
 * For the extended quote report, we output the filldata as JSON
 */
export function jsonifyFillData(source: ExtendedQuoteReportIndexedEntry): ExtendedQuoteReportIndexedEntryOutbound {
    return {
        ...source,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
        fillData: JSON.stringify(source.fillData, (key: string, value: any) => {
            if (key === '_samplerContract') {
                return {};
            } else {
                return value;
            }
        }),
    };
}
