// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-object-literal-type-assertion
import { FillQuoteTransformerOrderType, LimitOrder, LimitOrderFields, RfqOrder } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';
import * as TypeMoq from 'typemoq';

import { MarketOperation, NativeOrderWithFillableAmounts } from '../src/types';
import { NATIVE_LIMIT_ORDER_GAS_USED, NATIVE_RFQT_GAS_USED } from '../src/utils/market_operation_utils/constants';
import {
    CollapsedFill,
    DexSample,
    ERC20BridgeSource,
    MultiHopFillData,
    NativeCollapsedFill,
    NativeFillData,
    NativeLimitOrderFillData,
    NativeRfqOrderFillData,
} from '../src/utils/market_operation_utils/types';
import { QuoteRequestor } from '../src/utils/quote_requestor';

import {
    BridgeQuoteReportEntry,
    generateQuoteReport,
    MultiHopQuoteReportEntry,
    NativeLimitOrderQuoteReportEntry,
    NativeRfqOrderQuoteReportEntry,
    QuoteReportEntry,
} from './../src/utils/quote_report_generator';
import { chaiSetup } from './utils/chai_setup';
import { getRandomAmount, getRandomSignature } from './utils/utils';

chaiSetup.configure();
const expect = chai.expect;

const ONE = new BigNumber(1);
const GAS_USED = ONE;

function collapsedFillFromNativeOrder(order: NativeOrderWithFillableAmounts): NativeCollapsedFill {
    const fillData = {
        order: order.order,
        signature: order.signature,
        maxTakerTokenFillAmount: order.fillableTakerAmount,
    };
    return {
        sourcePathId: hexUtils.random(),
        source: ERC20BridgeSource.Native,
        type: order.type,
        input: order.order.takerAmount,
        output: order.order.makerAmount,
        fillData:
            order.type === FillQuoteTransformerOrderType.Limit
                ? (fillData as NativeLimitOrderFillData)
                : (fillData as NativeRfqOrderFillData),
        subFills: [],
        gasUsed:
            order.type === FillQuoteTransformerOrderType.Limit ? NATIVE_LIMIT_ORDER_GAS_USED : NATIVE_RFQT_GAS_USED,
    };
}

describe('generateQuoteReport', async () => {
    it('should generate report properly for sell', () => {
        const marketOperation: MarketOperation = MarketOperation.Sell;

        const kyberSample2: DexSample = {
            source: ERC20BridgeSource.Kyber,
            input: new BigNumber(10003),
            output: new BigNumber(10004),
            fillData: {},
            gasUsed: GAS_USED,
        };
        const uniswapSample2: DexSample = {
            source: ERC20BridgeSource.UniswapV2,
            input: new BigNumber(10005),
            output: new BigNumber(10006),
            fillData: {},
            gasUsed: GAS_USED,
        };
        const orderbookOrder1: NativeOrderWithFillableAmounts = {
            order: new LimitOrder({ takerAmount: new BigNumber(1000) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(1000),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const orderbookOrder2: NativeOrderWithFillableAmounts = {
            order: new LimitOrder({ takerAmount: new BigNumber(198) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(99), // takerAmount minus 99
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const rfqtOrder1: NativeOrderWithFillableAmounts = {
            order: new RfqOrder({ takerAmount: new BigNumber(100) }),
            type: FillQuoteTransformerOrderType.Rfq,
            fillableTakerAmount: new BigNumber(100),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const rfqtOrder2: NativeOrderWithFillableAmounts = {
            order: new RfqOrder({ takerAmount: new BigNumber(1101) }),
            type: FillQuoteTransformerOrderType.Rfq,
            fillableTakerAmount: new BigNumber(1001),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };

        const nativeOrders: NativeOrderWithFillableAmounts[] = [
            orderbookOrder1,
            rfqtOrder1,
            rfqtOrder2,
            orderbookOrder2,
        ];

        // generate path
        const uniswap2Fill: CollapsedFill = {
            ...uniswapSample2,
            subFills: [],
            sourcePathId: hexUtils.random(),
            type: FillQuoteTransformerOrderType.Bridge,
        };
        const kyber2Fill: CollapsedFill = {
            ...kyberSample2,
            subFills: [],
            sourcePathId: hexUtils.random(),
            type: FillQuoteTransformerOrderType.Bridge,
        };
        const orderbookOrder2Fill: CollapsedFill = collapsedFillFromNativeOrder(orderbookOrder2);
        const rfqtOrder2Fill: CollapsedFill = collapsedFillFromNativeOrder(rfqtOrder2);
        const pathGenerated: CollapsedFill[] = [rfqtOrder2Fill, orderbookOrder2Fill, uniswap2Fill, kyber2Fill];

        // quote generator mock
        const quoteRequestor = TypeMoq.Mock.ofType<QuoteRequestor>();
        quoteRequestor
            .setup(qr => qr.getMakerUriForSignature(rfqtOrder1.signature))
            .returns(() => {
                return 'https://rfqt1.provider.club';
            })
            .verifiable(TypeMoq.Times.atLeastOnce());
        quoteRequestor
            .setup(qr => qr.getMakerUriForSignature(rfqtOrder2.signature))
            .returns(() => {
                return 'https://rfqt2.provider.club';
            })
            .verifiable(TypeMoq.Times.atLeastOnce());

        const orderReport = generateQuoteReport(
            marketOperation,
            nativeOrders,
            pathGenerated,
            undefined,
            quoteRequestor.object,
        );

        const rfqtOrder1Source: NativeRfqOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: rfqtOrder1.order.makerAmount,
            takerAmount: rfqtOrder1.order.takerAmount,
            fillableTakerAmount: rfqtOrder1.fillableTakerAmount,
            isRfqt: true,
            makerUri: 'https://rfqt1.provider.club',
            nativeOrder: rfqtOrder1.order,
            fillData: {
                order: rfqtOrder1.order,
            } as NativeRfqOrderFillData,
            gasUsed: NATIVE_RFQT_GAS_USED,
        };
        const rfqtOrder2Source: NativeRfqOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: rfqtOrder2.order.makerAmount,
            takerAmount: rfqtOrder2.order.takerAmount,
            fillableTakerAmount: rfqtOrder2.fillableTakerAmount,
            isRfqt: true,
            makerUri: 'https://rfqt2.provider.club',
            nativeOrder: rfqtOrder2.order,
            fillData: {
                order: rfqtOrder2.order,
            } as NativeRfqOrderFillData,
            gasUsed: NATIVE_RFQT_GAS_USED,
        };
        const orderbookOrder2Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder2.order.makerAmount,
            takerAmount: orderbookOrder2.order.takerAmount,
            fillableTakerAmount: orderbookOrder2.fillableTakerAmount,
            isRfqt: false,
            fillData: {
                order: orderbookOrder2.order,
            } as NativeLimitOrderFillData,
            gasUsed: NATIVE_LIMIT_ORDER_GAS_USED,
        };
        const uniswap2Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.UniswapV2,
            makerAmount: uniswapSample2.output,
            takerAmount: uniswapSample2.input,
            fillData: {},
            gasUsed: GAS_USED,
        };
        const kyber2Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Kyber,
            makerAmount: kyberSample2.output,
            takerAmount: kyberSample2.input,
            fillData: {},
            gasUsed: GAS_USED,
        };

        const expectedSourcesConsidered: QuoteReportEntry[] = [rfqtOrder1Source, rfqtOrder2Source];
        const expectedSourcesDelivered: QuoteReportEntry[] = [
            rfqtOrder2Source,
            orderbookOrder2Source,
            uniswap2Source,
            kyber2Source,
        ];
        expectEqualQuoteReportEntries(orderReport.sourcesConsidered, expectedSourcesConsidered, `sourcesConsidered`);
        expectEqualQuoteReportEntries(orderReport.sourcesDelivered, expectedSourcesDelivered, `sourcesDelivered`);
        quoteRequestor.verifyAll();
    });
    it('should handle properly for buy without quoteRequestor', () => {
        const marketOperation: MarketOperation = MarketOperation.Buy;
        const kyberSample1: DexSample = {
            source: ERC20BridgeSource.Kyber,
            input: new BigNumber(10000),
            output: new BigNumber(10001),
            fillData: {},
            gasUsed: GAS_USED,
        };
        const uniswapSample1: DexSample = {
            source: ERC20BridgeSource.UniswapV2,
            input: new BigNumber(10003),
            output: new BigNumber(10004),
            fillData: {},
            gasUsed: GAS_USED,
        };
        const orderbookOrder1: NativeOrderWithFillableAmounts = {
            order: new LimitOrder({ takerAmount: new BigNumber(1101) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(1000),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const orderbookOrder2: NativeOrderWithFillableAmounts = {
            order: new LimitOrder({ takerAmount: new BigNumber(5101) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(5000), // takerAmount minus 99
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const nativeOrders = [orderbookOrder1, orderbookOrder2];

        // generate path
        const orderbookOrder1Fill: CollapsedFill = collapsedFillFromNativeOrder(orderbookOrder1);
        const uniswap1Fill: CollapsedFill = {
            ...uniswapSample1,
            subFills: [],
            sourcePathId: hexUtils.random(),
            type: FillQuoteTransformerOrderType.Bridge,
        };
        const kyber1Fill: CollapsedFill = {
            ...kyberSample1,
            subFills: [],
            sourcePathId: hexUtils.random(),
            type: FillQuoteTransformerOrderType.Bridge,
        };
        const pathGenerated: CollapsedFill[] = [orderbookOrder1Fill, uniswap1Fill, kyber1Fill];

        const orderReport = generateQuoteReport(marketOperation, nativeOrders, pathGenerated);

        const orderbookOrder1Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder1.order.makerAmount,
            takerAmount: orderbookOrder1.order.takerAmount,
            fillableTakerAmount: orderbookOrder1.fillableTakerAmount,
            isRfqt: false,
            fillData: {
                order: orderbookOrder1.order,
            } as NativeLimitOrderFillData,
            gasUsed: NATIVE_LIMIT_ORDER_GAS_USED,
        };
        const uniswap1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.UniswapV2,
            makerAmount: uniswapSample1.input,
            takerAmount: uniswapSample1.output,
            fillData: {},
            gasUsed: GAS_USED,
        };
        const kyber1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Kyber,
            makerAmount: kyberSample1.input,
            takerAmount: kyberSample1.output,
            fillData: {},
            gasUsed: GAS_USED,
        };

        // No order is considered here because only Native RFQ orders are considered.
        const expectedSourcesConsidered: QuoteReportEntry[] = [];
        const expectedSourcesDelivered: QuoteReportEntry[] = [orderbookOrder1Source, uniswap1Source, kyber1Source];
        expectEqualQuoteReportEntries(orderReport.sourcesConsidered, expectedSourcesConsidered, `sourcesConsidered`);
        expectEqualQuoteReportEntries(orderReport.sourcesDelivered, expectedSourcesDelivered, `sourcesDelivered`);
    });
    it('should correctly generate report for a two-hop quote', () => {
        const marketOperation: MarketOperation = MarketOperation.Sell;
        const orderbookOrder1: NativeOrderWithFillableAmounts = {
            order: new LimitOrder({ takerAmount: new BigNumber(1101) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(1000),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const twoHopFillData: MultiHopFillData = {
            intermediateToken: hexUtils.random(20),
            firstHopSource: {
                source: ERC20BridgeSource.Balancer,
                fillData: {},
                encodeCall: () => '',
                handleCallResults: _callResults => ({ gasUsed: [], samples: [new BigNumber(1337)] }),
                handleRevert: _c => ({ gasUsed: [], samples: [] }),
            },
            secondHopSource: {
                source: ERC20BridgeSource.Curve,
                fillData: {},
                encodeCall: () => '',
                handleCallResults: _callResults => ({ gasUsed: [], samples: [new BigNumber(1337)] }),
                handleRevert: _c => ({ gasUsed: [], samples: [] }),
            },
        };
        const twoHopSample: DexSample<MultiHopFillData> = {
            source: ERC20BridgeSource.MultiHop,
            input: new BigNumber(3005),
            output: new BigNumber(3006),
            fillData: twoHopFillData,
            gasUsed: GAS_USED,
        };

        const orderReport = generateQuoteReport(marketOperation, [orderbookOrder1], twoHopSample);
        const twoHopSource: MultiHopQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: twoHopSample.output,
            takerAmount: twoHopSample.input,
            hopSources: [ERC20BridgeSource.Balancer, ERC20BridgeSource.Curve],
            fillData: twoHopFillData,
            gasUsed: GAS_USED,
        };

        // No entry is present in considered because No RFQ orders were reported.
        const expectedSourcesConsidered: QuoteReportEntry[] = [];
        expectEqualQuoteReportEntries(orderReport.sourcesConsidered, expectedSourcesConsidered, `sourcesConsidered`);
        expect(orderReport.sourcesDelivered.length).to.eql(1);
        expect(orderReport.sourcesDelivered[0]).to.deep.equal(twoHopSource);
    });
});

function expectEqualQuoteReportEntries(
    actual: QuoteReportEntry[],
    expected: QuoteReportEntry[],
    variableName: string = 'quote report entries',
): void {
    expect(actual.length).to.eql(expected.length);
    actual.forEach((actualEntry, idx) => {
        const expectedEntry = expected[idx];
        // remove fillable values
        if (actualEntry.liquiditySource === ERC20BridgeSource.Native) {
            actualEntry.fillData.order = _.omit(actualEntry.fillData.order, [
                'fillableMakerAmount',
                'fillableTakerAmount',
                'fillableTakerFeeAmount',
            ]) as LimitOrderFields;
            expect(actualEntry.fillData.order).to.eql(
                // tslint:disable-next-line:no-unnecessary-type-assertion
                (expectedEntry.fillData as NativeFillData).order,
                `${actualEntry.liquiditySource} ${variableName} incorrect at index ${idx}`,
            );
        }
        expect(_.omit(actualEntry, 'fillData')).to.eql(
            _.omit(expectedEntry, 'fillData'),
            `${actualEntry.liquiditySource} ${variableName} incorrect at index ${idx}`,
        );
    });
}
