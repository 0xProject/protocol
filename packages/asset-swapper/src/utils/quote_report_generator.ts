import { assetDataUtils } from '@0x/order-utils';
import { ERC20AssetData, SignedOrder } from '@0x/types';
import { BigNumber } from '@0x/utils';
import _ = require('lodash');

import { MarketOperation } from '../types';

import { getSourceId } from './market_operation_utils/sampler_operations';
import {
    CollapsedFill,
    DexSample,
    ERC20BridgeSource,
    FeeSchedule,
    FillData,
    MultiHopFillData,
    NativeCollapsedFill,
    RelevantTokenInfo,
} from './market_operation_utils/types';
import { QuoteRequestor } from './quote_requestor';

export interface SharedSourceFields {
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    gasCost: BigNumber;
    costInMakerToken: BigNumber;
    sourceId: string;
    takerToken: string;
    makerToken: string;
    shouldIgnore: boolean;
}

export interface BridgeReportSource extends SharedSourceFields {
    liquiditySource: Exclude<ERC20BridgeSource, ERC20BridgeSource.Native>;
    fillData?: FillData;
}

export interface MultiHopReportSource extends SharedSourceFields {
    liquiditySource: ERC20BridgeSource.MultiHop;
    hopSources: ERC20BridgeSource[];
    fillData: FillData;
}

interface NativeReportSourceBase extends SharedSourceFields {
    liquiditySource: ERC20BridgeSource.Native;
    nativeOrder: SignedOrder;
    fillableTakerAmount: BigNumber;
}
export interface NativeOrderbookReportSource extends NativeReportSourceBase {
    isRfqt: false;
}
export interface NativeRFQTReportSource extends NativeReportSourceBase {
    isRfqt: true;
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
    gasPrice: BigNumber;
    sellAmount: BigNumber;
    buyAmount: BigNumber;
    relevantTokensInfos: { [tokenAddress: string]: RelevantTokenInfo };
}

interface CostCalculationOpts {
    feeSchedule: FeeSchedule;
    gasSchedule: FeeSchedule;
    relevantTokensInfos: { [tokenAddress: string]: RelevantTokenInfo };
    gasPrice: BigNumber;
}

/**
 * Generates a report of sources considered while computing the optimized
 * swap quote, and the sources ultimately included in the computed quote.
 */
export function generateQuoteReport(
    marketOperation: MarketOperation,
    dexQuotes: Array<Array<DexSample<FillData>>>,
    multiHopQuotes: Array<DexSample<MultiHopFillData>>,
    nativeOrders: SignedOrder[],
    orderFillableAmounts: BigNumber[],
    liquidityDelivered: ReadonlyArray<CollapsedFill> | DexSample<MultiHopFillData>,
    gasPrice: BigNumber,
    feeSchedule: FeeSchedule,
    gasSchedule: FeeSchedule,
    sellAmount: BigNumber,
    buyAmount: BigNumber,
    relevantTokensInfos: { [tokenAddress: string]: RelevantTokenInfo },
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): QuoteReport {
    const costOpts = {
        gasPrice,
        gasSchedule,
        feeSchedule,
        relevantTokensInfos,
    };
    const quotesWithSourceIds = dexQuotes
        .map(quotes => {
            return quotes
                .filter(q => q && !q.output.isZero())
                .map(q => ({ ...q, sourceId: getSourceId(q.source, q.fillData!) }));
        })
        .filter(qs => qs.length > 0);
    const dexReportSourcesConsidered = _.flatten(quotesWithSourceIds).map(quote =>
        _dexSampleToReportSource(quote, marketOperation, costOpts),
    );
    const nativeOrderSourcesConsidered = nativeOrders.map((order, idx) =>
        _nativeOrderToReportSource(order, orderFillableAmounts[idx], costOpts, comparisonPrice, quoteRequestor),
    );
    const multiHopSourcesConsidered = multiHopQuotes.map(quote =>
        _multiHopSampleToReportSource(quote, marketOperation, costOpts),
    );
    const sourcesConsidered = [
        ...dexReportSourcesConsidered,
        ...nativeOrderSourcesConsidered,
        ...multiHopSourcesConsidered,
    ];

    let sourcesDelivered;
    if (Array.isArray(liquidityDelivered)) {
        // create easy way to look up fillable amounts
        const nativeOrderSignaturesToFillableAmounts = _nativeOrderSignaturesToFillableAmounts(
            nativeOrders,
            orderFillableAmounts,
        );
        // map sources delivered
        sourcesDelivered = liquidityDelivered.map(collapsedFill => {
            const foundNativeOrder = _nativeOrderFromCollapsedFill(collapsedFill);
            if (foundNativeOrder) {
                return _nativeOrderToReportSource(
                    foundNativeOrder,
                    nativeOrderSignaturesToFillableAmounts[foundNativeOrder.signature],
                    costOpts,
                    comparisonPrice,
                    quoteRequestor,
                );
            } else {
                return _dexSampleToReportSource(collapsedFill, marketOperation, costOpts);
            }
        });
    } else {
        sourcesDelivered = [
            _multiHopSampleToReportSource(liquidityDelivered as DexSample<MultiHopFillData>, marketOperation, costOpts),
        ];
    }
    return {
        sourcesConsidered,
        sourcesDelivered,
        gasPrice,
        sellAmount,
        buyAmount,
        relevantTokensInfos,
    };
}

function _dexSampleToReportSource(
    ds: DexSample & { sourceId: string },
    marketOperation: MarketOperation,
    costOpts: CostCalculationOpts,
): BridgeReportSource {
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
            gasCost: new BigNumber(costOpts.gasSchedule[liquiditySource]!(ds.fillData)),
            costInMakerToken: new BigNumber(costOpts.feeSchedule[liquiditySource]!(ds.fillData))
                .times(costOpts.relevantTokensInfos[ds.fillData!.makerToken].ethRateInTokenBaseUnits)
                .integerValue(),
            sourceId: ds.sourceId,
            takerToken: ds.fillData!.takerToken,
            makerToken: ds.fillData!.makerToken,
            shouldIgnore: !!ds.fillData!.shouldIgnore,
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            makerAmount: ds.output,
            takerAmount: ds.input,
            liquiditySource,
            fillData: ds.fillData,
            gasCost: new BigNumber(costOpts.gasSchedule[liquiditySource]!(ds.fillData)),
            costInMakerToken: new BigNumber(costOpts.feeSchedule[liquiditySource]!(ds.fillData))
                .times(costOpts.relevantTokensInfos[ds.fillData!.makerToken].ethRateInTokenBaseUnits)
                .integerValue(),
            sourceId: ds.sourceId,
            takerToken: ds.fillData!.takerToken,
            makerToken: ds.fillData!.makerToken,
            shouldIgnore: !!ds.fillData!.shouldIgnore,
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}

function _multiHopSampleToReportSource(
    ds: DexSample<MultiHopFillData>,
    marketOperation: MarketOperation,
    costOpts: CostCalculationOpts,
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
            gasCost: new BigNumber(costOpts.gasSchedule[firstHop.source]!(firstHop.fillData)).plus(
                costOpts.gasSchedule[secondHop.source]!(secondHop.fillData),
            ),
            costInMakerToken: new BigNumber(costOpts.feeSchedule[firstHop.source]!(firstHop.fillData))
                .plus(costOpts.feeSchedule[secondHop.source]!(secondHop.fillData))
                .times(costOpts.relevantTokensInfos[ds.fillData!.makerToken].ethRateInTokenBaseUnits)
                .integerValue(),
            sourceId: ds.source,
            takerToken: firstHop.fillData!.takerToken,
            makerToken: secondHop.fillData!.makerToken,
            shouldIgnore: !!ds.fillData!.shouldIgnore,
        };
    } else if (marketOperation === MarketOperation.Sell) {
        return {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: ds.output,
            takerAmount: ds.input,
            fillData: ds.fillData!,
            hopSources: [firstHop.source, secondHop.source],
            gasCost: new BigNumber(costOpts.gasSchedule[firstHop.source]!(firstHop.fillData)).plus(
                costOpts.gasSchedule[secondHop.source]!(secondHop.fillData),
            ),
            costInMakerToken: new BigNumber(costOpts.feeSchedule[firstHop.source]!(firstHop.fillData))
                .plus(costOpts.feeSchedule[secondHop.source]!(secondHop.fillData))
                .times(costOpts.relevantTokensInfos[ds.fillData!.makerToken].ethRateInTokenBaseUnits)
                .integerValue(),
            sourceId: ds.source,
            takerToken: firstHop.fillData!.takerToken,
            makerToken: secondHop.fillData!.makerToken,
            shouldIgnore: !!ds.fillData!.shouldIgnore,
        };
    } else {
        throw new Error(`Unexpected marketOperation ${marketOperation}`);
    }
}

function _nativeOrderSignaturesToFillableAmounts(
    nativeOrders: SignedOrder[],
    fillableAmounts: BigNumber[],
): { [orderSignature: string]: BigNumber } {
    // create easy way to look up fillable amounts based on native order signatures
    if (fillableAmounts.length !== nativeOrders.length) {
        // length mismatch, abort
        throw new Error('orderFillableAmounts must be the same length as nativeOrders');
    }
    const nativeOrderSignaturesToFillableAmounts: { [orderSignature: string]: BigNumber } = {};
    nativeOrders.forEach((nativeOrder, idx) => {
        nativeOrderSignaturesToFillableAmounts[nativeOrder.signature] = fillableAmounts[idx];
    });
    return nativeOrderSignaturesToFillableAmounts;
}

function _nativeOrderFromCollapsedFill(cf: CollapsedFill): SignedOrder | undefined {
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
    nativeOrder: SignedOrder,
    fillableAmount: BigNumber,
    costOpts: CostCalculationOpts,
    comparisonPrice?: BigNumber | undefined,
    quoteRequestor?: QuoteRequestor,
): NativeRFQTReportSource | NativeOrderbookReportSource {
    const nativeOrderBase: NativeReportSourceBase = {
        liquiditySource: ERC20BridgeSource.Native,
        makerAmount: nativeOrder.makerAssetAmount,
        takerAmount: nativeOrder.takerAssetAmount,
        fillableTakerAmount: fillableAmount,
        nativeOrder,
        gasCost: new BigNumber(costOpts.gasSchedule[ERC20BridgeSource.Native]!()),
        costInMakerToken: new BigNumber(costOpts.feeSchedule[ERC20BridgeSource.Native]!())
            .times(
                costOpts.relevantTokensInfos[
                    (assetDataUtils.decodeAssetDataOrThrow(nativeOrder.makerAssetData) as ERC20AssetData).tokenAddress
                ].ethRateInTokenBaseUnits,
            )
            .integerValue(),
        sourceId: nativeOrder.salt.toString(),
        makerToken: (assetDataUtils.decodeAssetDataOrThrow(nativeOrder.makerAssetData) as ERC20AssetData).tokenAddress,
        takerToken: (assetDataUtils.decodeAssetDataOrThrow(nativeOrder.takerAssetData) as ERC20AssetData).tokenAddress,
        shouldIgnore: false,
    };

    // if we find this is an rfqt order, label it as such and associate makerUri
    const foundRfqtMakerUri = quoteRequestor && quoteRequestor.getMakerUriForOrderSignature(nativeOrder.signature);
    if (foundRfqtMakerUri) {
        const rfqtSource: NativeRFQTReportSource = {
            ...nativeOrderBase,
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
            isRfqt: false,
        };
        return regularNativeOrder;
    }
}
