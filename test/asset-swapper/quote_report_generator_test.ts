import { FillQuoteTransformerOrderType, LimitOrder, LimitOrderFields, RfqOrder } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';
import * as TypeMoq from 'typemoq';

import { MarketOperation, NativeOrderWithFillableAmounts } from '../../src/asset-swapper/types';
import {
    DexSample,
    ERC20BridgeSource,
    Fill,
    MultiHopFillData,
    NativeFillData,
    NativeLimitOrderFillData,
    NativeRfqOrderFillData,
} from '../../src/asset-swapper/utils/market_operation_utils/types';
import { QuoteRequestor } from '../../src/asset-swapper/utils/quote_requestor';

import {
    BridgeQuoteReportEntry,
    generateQuoteReport,
    MultiHopQuoteReportEntry,
    NativeLimitOrderQuoteReportEntry,
    NativeRfqOrderQuoteReportEntry,
    QuoteReportEntry,
} from './../../src/asset-swapper/utils/quote_report_generator';
import { chaiSetup } from './utils/chai_setup';
import { getRandomAmount, getRandomSignature } from './utils/utils';

chaiSetup.configure();
const expect = chai.expect;

function fillFromNativeOrder(order: NativeOrderWithFillableAmounts): Fill<NativeFillData> {
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
        adjustedOutput: order.order.makerAmount,
        flags: BigInt(0),
        gas: 1,
    };
}

describe('generateQuoteReport', async () => {
    it('should generate report properly for sell', () => {
        const marketOperation: MarketOperation = MarketOperation.Sell;

        const balancerSample2: DexSample = {
            source: ERC20BridgeSource.BalancerV2,
            input: new BigNumber(10003),
            output: new BigNumber(10004),
            fillData: {},
        };
        const uniswapSample2: DexSample = {
            source: ERC20BridgeSource.UniswapV2,
            input: new BigNumber(10005),
            output: new BigNumber(10006),
            fillData: {},
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
        const uniswap2Fill: Fill = {
            ...uniswapSample2,
            sourcePathId: hexUtils.random(),
            type: FillQuoteTransformerOrderType.Bridge,
            adjustedOutput: uniswapSample2.output,
            flags: BigInt(0),
            gas: 1,
        };
        const balancer2Fill: Fill = {
            ...balancerSample2,
            sourcePathId: hexUtils.random(),
            type: FillQuoteTransformerOrderType.Bridge,
            adjustedOutput: balancerSample2.output,
            flags: BigInt(0),
            gas: 1,
        };
        const orderbookOrder2Fill: Fill = fillFromNativeOrder(orderbookOrder2);
        const rfqtOrder2Fill: Fill = fillFromNativeOrder(rfqtOrder2);
        const pathGenerated: Fill[] = [rfqtOrder2Fill, orderbookOrder2Fill, uniswap2Fill, balancer2Fill];

        // quote generator mock
        const quoteRequestor = TypeMoq.Mock.ofType<QuoteRequestor>();
        quoteRequestor
            .setup((qr) => qr.getMakerUriForSignature(rfqtOrder1.signature))
            .returns(() => {
                return 'https://rfqt1.provider.club';
            })
            .verifiable(TypeMoq.Times.atLeastOnce());
        quoteRequestor
            .setup((qr) => qr.getMakerUriForSignature(rfqtOrder2.signature))
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
            isRFQ: true,
            makerUri: 'https://rfqt1.provider.club',
            nativeOrder: rfqtOrder1.order,
            fillData: {
                order: rfqtOrder1.order,
            } as NativeRfqOrderFillData,
        };
        const rfqtOrder2Source: NativeRfqOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: rfqtOrder2.order.makerAmount,
            takerAmount: rfqtOrder2.order.takerAmount,
            fillableTakerAmount: rfqtOrder2.fillableTakerAmount,
            isRFQ: true,
            makerUri: 'https://rfqt2.provider.club',
            nativeOrder: rfqtOrder2.order,
            fillData: {
                order: rfqtOrder2.order,
            } as NativeRfqOrderFillData,
        };
        const orderbookOrder2Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder2.order.makerAmount,
            takerAmount: orderbookOrder2.order.takerAmount,
            fillableTakerAmount: orderbookOrder2.fillableTakerAmount,
            isRFQ: false,
            fillData: {
                order: orderbookOrder2.order,
            } as NativeLimitOrderFillData,
        };
        const uniswap2Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.UniswapV2,
            makerAmount: uniswapSample2.output,
            takerAmount: uniswapSample2.input,
            fillData: {},
        };
        const balancer2Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.BalancerV2,
            makerAmount: balancerSample2.output,
            takerAmount: balancerSample2.input,
            fillData: {},
        };

        const expectedSourcesConsidered: QuoteReportEntry[] = [rfqtOrder1Source, rfqtOrder2Source];
        const expectedSourcesDelivered: QuoteReportEntry[] = [
            rfqtOrder2Source,
            orderbookOrder2Source,
            uniswap2Source,
            balancer2Source,
        ];
        expectEqualQuoteReportEntries(orderReport.sourcesConsidered, expectedSourcesConsidered, `sourcesConsidered`);
        expectEqualQuoteReportEntries(orderReport.sourcesDelivered, expectedSourcesDelivered, `sourcesDelivered`);
        quoteRequestor.verifyAll();
    });
    it('should handle properly for buy without quoteRequestor', () => {
        const marketOperation: MarketOperation = MarketOperation.Buy;
        const balancerSample1: DexSample = {
            source: ERC20BridgeSource.BalancerV2,
            input: new BigNumber(10000),
            output: new BigNumber(10001),
            fillData: {},
        };
        const uniswapSample1: DexSample = {
            source: ERC20BridgeSource.UniswapV2,
            input: new BigNumber(10003),
            output: new BigNumber(10004),
            fillData: {},
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
        const orderbookOrder1Fill: Fill = fillFromNativeOrder(orderbookOrder1);
        const uniswap1Fill: Fill = {
            ...uniswapSample1,
            sourcePathId: hexUtils.random(),
            type: FillQuoteTransformerOrderType.Bridge,
            adjustedOutput: uniswapSample1.output,
            flags: BigInt(0),
            gas: 1,
        };
        const balancer1Fill: Fill = {
            ...balancerSample1,
            sourcePathId: hexUtils.random(),
            type: FillQuoteTransformerOrderType.Bridge,
            adjustedOutput: balancerSample1.output,
            flags: BigInt(0),
            gas: 1,
        };
        const pathGenerated: Fill[] = [orderbookOrder1Fill, uniswap1Fill, balancer1Fill];

        const orderReport = generateQuoteReport(marketOperation, nativeOrders, pathGenerated);

        const orderbookOrder1Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder1.order.makerAmount,
            takerAmount: orderbookOrder1.order.takerAmount,
            fillableTakerAmount: orderbookOrder1.fillableTakerAmount,
            isRFQ: false,
            fillData: {
                order: orderbookOrder1.order,
            } as NativeLimitOrderFillData,
        };
        const uniswap1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.UniswapV2,
            makerAmount: uniswapSample1.input,
            takerAmount: uniswapSample1.output,
            fillData: {},
        };
        const balancer1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.BalancerV2,
            makerAmount: balancerSample1.input,
            takerAmount: balancerSample1.output,
            fillData: {},
        };

        // No order is considered here because only Native RFQ orders are considered.
        const expectedSourcesConsidered: QuoteReportEntry[] = [];
        const expectedSourcesDelivered: QuoteReportEntry[] = [orderbookOrder1Source, uniswap1Source, balancer1Source];
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
                handleCallResults: (_callResults) => [new BigNumber(1337)],
                handleRevert: (_c) => [],
            },
            secondHopSource: {
                source: ERC20BridgeSource.Curve,
                fillData: {},
                encodeCall: () => '',
                handleCallResults: (_callResults) => [new BigNumber(1337)],
                handleRevert: (_c) => [],
            },
        };
        const twoHopSample: DexSample<MultiHopFillData> = {
            source: ERC20BridgeSource.MultiHop,
            input: new BigNumber(3005),
            output: new BigNumber(3006),
            fillData: twoHopFillData,
        };

        const orderReport = generateQuoteReport(marketOperation, [orderbookOrder1], twoHopSample);
        const twoHopSource: MultiHopQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: twoHopSample.output,
            takerAmount: twoHopSample.input,
            hopSources: [ERC20BridgeSource.Balancer, ERC20BridgeSource.Curve],
            fillData: twoHopFillData,
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
    variableName = 'quote report entries',
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
                (expectedEntry.fillData as NativeFillData).order,
                `${variableName} incorrect at index ${idx}`,
            );
        }
        expect(_.omit(actualEntry, 'fillData')).to.eql(
            _.omit(expectedEntry, 'fillData'),
            `${variableName} incorrect at index ${idx}`,
        );
    });
}
