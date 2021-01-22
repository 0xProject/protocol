// tslint:disable:custom-no-magic-numbers
import {
    FillQuoteTransformerOrderType,
    LimitOrder,
    LimitOrderFields,
    NativeOrder,
    RfqOrder,
    RfqOrderFields,
} from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';
import * as TypeMoq from 'typemoq';

import { MarketOperation } from '../src/types';
import {
    CollapsedFill,
    DexSample,
    ERC20BridgeSource,
    MultiHopFillData,
    NativeCollapsedFill,
    NativeOrderWithFillableAmounts,
} from '../src/utils/market_operation_utils/types';
import { QuoteRequestor } from '../src/utils/quote_requestor';

import {
    BridgeQuoteReportEntry,
    MultiHopQuoteReportEntry,
    NativeLimitOrderQuoteReportEntry,
    NativeRfqOrderQuoteReportEntry,
    QuoteReportEntry,
} from './../src/utils/quote_report_generator';
import { chaiSetup } from './utils/chai_setup';
import { getRandomAmount, getRandomSignature } from './utils/utils';

chaiSetup.configure();
const expect = chai.expect;

function collapsedFillFromNativeOrder(order: NativeOrderWithFillableAmounts): NativeCollapsedFill {
    return {
        sourcePathId: hexUtils.random(),
        source: ERC20BridgeSource.Native,
        type: order.type,
        input: order.order.takerAmount,
        output: order.order.makerAmount,
        fillData: {
            order: order.order as any, // hack, should be RfqOrderFields or LimitOrderFields
            signature: order.signature,
            maxTakerTokenFillAmount: order.fillableTakerAmount,
        },
        subFills: [],
    };
}

describe('generateQuoteReport', async () => {
    it('should generate report properly for sell', () => {
        const marketOperation: MarketOperation = MarketOperation.Sell;

        const kyberSample1: DexSample = {
            source: ERC20BridgeSource.Kyber,
            input: new BigNumber(10000),
            output: new BigNumber(10001),
            fillData: {},
        };
        const kyberSample2: DexSample = {
            source: ERC20BridgeSource.Kyber,
            input: new BigNumber(10003),
            output: new BigNumber(10004),
            fillData: {},
        };
        const uniswapSample1: DexSample = {
            source: ERC20BridgeSource.UniswapV2,
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
        const dexQuotes: DexSample[] = [kyberSample1, kyberSample2, uniswapSample1, uniswapSample2];

        const orderbookOrder1 = {
            order: new LimitOrder({ takerAmount: new BigNumber(1000) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(1000),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const orderbookOrder2 = {
            order: new LimitOrder({ takerAmount: new BigNumber(198) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(99), // takerAmount minus 99
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const rfqtOrder1 = {
            order: new RfqOrder({ takerAmount: new BigNumber(100) }),
            type: FillQuoteTransformerOrderType.Bridge,
            fillableTakerAmount: new BigNumber(100),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const rfqtOrder2 = {
            order: new RfqOrder({ takerAmount: new BigNumber(1101) }),
            type: FillQuoteTransformerOrderType.Bridge,
            fillableTakerAmount: new BigNumber(1001),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };

        const nativeOrders: Array<NativeOrderWithFillableAmounts> = [
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
            .setup(qr => qr.getMakerUriForOrderHash(orderbookOrder2.order.getHash()))
            .returns(() => {
                return undefined;
            })
            .verifiable(TypeMoq.Times.atLeastOnce());
        quoteRequestor
            .setup(qr => qr.getMakerUriForOrderHash(rfqtOrder1.order.getHash()))
            .returns(() => {
                return 'https://rfqt1.provider.club';
            })
            .verifiable(TypeMoq.Times.atLeastOnce());
        quoteRequestor
            .setup(qr => qr.getMakerUriForOrderHash(rfqtOrder2.order.getHash()))
            .returns(() => {
                return 'https://rfqt2.provider.club';
            })
            .verifiable(TypeMoq.Times.atLeastOnce());

        const orderReport = generateQuoteReport(
            marketOperation,
            dexQuotes,
            [],
            nativeOrders,
            pathGenerated,
            undefined,
            quoteRequestor.object,
        );

        const rfqtOrder1Source: NativeRfqOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: rfqtOrder1.order.makerAmount,
            takerAmount: rfqtOrder1.order.takerAmount,
            nativeOrder: rfqtOrder1.order,
            fillableTakerAmount: rfqtOrder1.fillableTakerAmount,
            isRfqt: true,
            makerUri: 'https://rfqt1.provider.club',
        };
        const rfqtOrder2Source: NativeRfqOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: rfqtOrder2.order.makerAmount,
            takerAmount: rfqtOrder2.order.takerAmount,
            nativeOrder: rfqtOrder2.order,
            fillableTakerAmount: rfqtOrder2.fillableTakerAmount,
            isRfqt: true,
            makerUri: 'https://rfqt2.provider.club',
        };
        const orderbookOrder1Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder1.order.makerAmount,
            takerAmount: orderbookOrder1.order.takerAmount,
            nativeOrder: orderbookOrder1.order,
            fillableTakerAmount: orderbookOrder1.fillableTakerAmount,
            isRfqt: false,
        };
        const orderbookOrder2Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder2.order.makerAmount,
            takerAmount: orderbookOrder2.order.takerAmount,
            nativeOrder: orderbookOrder2.order,
            fillableTakerAmount: orderbookOrder2.fillableTakerAmount,
            isRfqt: false,
        };
        const uniswap1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.UniswapV2,
            makerAmount: uniswapSample1.output,
            takerAmount: uniswapSample1.input,
            fillData: {},
        };
        const uniswap2Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.UniswapV2,
            makerAmount: uniswapSample2.output,
            takerAmount: uniswapSample2.input,
            fillData: {},
        };
        const kyber1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Kyber,
            makerAmount: kyberSample1.output,
            takerAmount: kyberSample1.input,
            fillData: {},
        };
        const kyber2Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Kyber,
            makerAmount: kyberSample2.output,
            takerAmount: kyberSample2.input,
            fillData: {},
        };

        const expectedSourcesConsidered: QuoteReportEntry[] = [
            kyber1Source,
            kyber2Source,
            uniswap1Source,
            uniswap2Source,
            orderbookOrder1Source,
            rfqtOrder1Source,
            rfqtOrder2Source,
            orderbookOrder2Source,
        ];

        expect(orderReport.sourcesConsidered.length).to.eql(expectedSourcesConsidered.length);

        orderReport.sourcesConsidered.forEach((actualSourcesConsidered, idx) => {
            const expectedSourceConsidered = expectedSourcesConsidered[idx];
            expect(actualSourcesConsidered).to.eql(
                expectedSourceConsidered,
                `sourceConsidered incorrect at index ${idx}`,
            );
        });

        const expectedSourcesDelivered: QuoteReportEntry[] = [
            rfqtOrder2Source,
            orderbookOrder2Source,
            uniswap2Source,
            kyber2Source,
        ];
        expect(orderReport.sourcesDelivered.length).to.eql(expectedSourcesDelivered.length);
        orderReport.sourcesDelivered.forEach((actualSourceDelivered, idx) => {
            const expectedSourceDelivered = expectedSourcesDelivered[idx];

            // remove fillable values
            if (actualSourceDelivered.liquiditySource === ERC20BridgeSource.Native) {
                actualSourceDelivered.nativeOrder = _.omit(actualSourceDelivered.nativeOrder, [
                    'fillableMakerAmount',
                    'fillableTakerAmount',
                    'fillableTakerFeeAmount',
                ]) as NativeOrder;
            }

            expect(actualSourceDelivered).to.eql(expectedSourceDelivered, `sourceDelivered incorrect at index ${idx}`);
        });

        quoteRequestor.verifyAll();
    });
    it('should handle properly for buy without quoteRequestor', () => {
        const marketOperation: MarketOperation = MarketOperation.Buy;
        const kyberSample1: DexSample = {
            source: ERC20BridgeSource.Kyber,
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
        const dexQuotes: DexSample[] = [kyberSample1, uniswapSample1];
        const orderbookOrder1 = {
            order: new LimitOrder({ takerAmount: new BigNumber(1101) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(1000),
            fillableMakerAmount: getRandomAmount(),
            fillableTakerFeeAmount: getRandomAmount(),
            signature: getRandomSignature(),
        };
        const orderbookOrder2 = {
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

        const orderReport = generateQuoteReport(marketOperation, dexQuotes, [], nativeOrders, pathGenerated);

        const orderbookOrder1Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder1.order.makerAmount,
            takerAmount: orderbookOrder1.order.takerAmount,
            nativeOrder: orderbookOrder1.order,
            fillableTakerAmount: orderbookOrder1.fillableTakerAmount,
            isRfqt: false,
        };
        const orderbookOrder2Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder2.order.makerAmount,
            takerAmount: orderbookOrder2.order.takerAmount,
            nativeOrder: orderbookOrder2.order,
            fillableTakerAmount: orderbookOrder2.fillableTakerAmount,
            isRfqt: false,
        };
        const uniswap1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.UniswapV2,
            makerAmount: uniswapSample1.input,
            takerAmount: uniswapSample1.output,
            fillData: {},
        };
        const kyber1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Kyber,
            makerAmount: kyberSample1.input,
            takerAmount: kyberSample1.output,
            fillData: {},
        };

        const expectedSourcesConsidered: QuoteReportEntry[] = [
            kyber1Source,
            uniswap1Source,
            orderbookOrder1Source,
            orderbookOrder2Source,
        ];
        expect(orderReport.sourcesConsidered.length).to.eql(expectedSourcesConsidered.length);
        orderReport.sourcesConsidered.forEach((actualSourcesConsidered, idx) => {
            const expectedSourceConsidered = expectedSourcesConsidered[idx];
            expect(actualSourcesConsidered).to.eql(
                expectedSourceConsidered,
                `sourceConsidered incorrect at index ${idx}`,
            );
        });

        const expectedSourcesDelivered: QuoteReportEntry[] = [orderbookOrder1Source, uniswap1Source, kyber1Source];
        expect(orderReport.sourcesDelivered.length).to.eql(expectedSourcesDelivered.length);
        orderReport.sourcesDelivered.forEach((actualSourceDelivered, idx) => {
            const expectedSourceDelivered = expectedSourcesDelivered[idx];

            // remove fillable values
            if (actualSourceDelivered.liquiditySource === ERC20BridgeSource.Native) {
                actualSourceDelivered.nativeOrder = _.omit(actualSourceDelivered.nativeOrder, [
                    'fillableMakerAmount',
                    'fillableTakerAmount',
                    'fillableTakerFeeAmount',
                ]) as NativeOrder;
            }

            expect(actualSourceDelivered).to.eql(expectedSourceDelivered, `sourceDelivered incorrect at index ${idx}`);
        });
    });
    it('should correctly generate report for a two-hop quote', () => {
        const marketOperation: MarketOperation = MarketOperation.Sell;
        const kyberSample1: DexSample = {
            source: ERC20BridgeSource.Kyber,
            input: new BigNumber(10000),
            output: new BigNumber(10001),
            fillData: {},
        };
        const orderbookOrder1 = {
            order: new LimitOrder({ takerAmount: new BigNumber(1101) }),
            type: FillQuoteTransformerOrderType.Limit,
            fillableTakerAmount: new BigNumber(1000),
        };
        const twoHopFillData: MultiHopFillData = {
            intermediateToken: hexUtils.random(20),
            firstHopSource: {
                source: ERC20BridgeSource.Balancer,
                fillData: {},
                encodeCall: () => '',
                handleCallResults: _callResults => [new BigNumber(1337)],
                handleRevert: _c => [],
            },
            secondHopSource: {
                source: ERC20BridgeSource.Curve,
                fillData: {},
                encodeCall: () => '',
                handleCallResults: _callResults => [new BigNumber(1337)],
                handleRevert: _c => [],
            },
        };
        const twoHopSample: DexSample<MultiHopFillData> = {
            source: ERC20BridgeSource.MultiHop,
            input: new BigNumber(3005),
            output: new BigNumber(3006),
            fillData: twoHopFillData,
        };

        const orderReport = generateQuoteReport(
            marketOperation,
            [kyberSample1],
            [twoHopSample],
            [orderbookOrder1],
            twoHopSample,
        );
        const orderbookOrder1Source: NativeLimitOrderQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Native,
            makerAmount: orderbookOrder1.order.makerAmount,
            takerAmount: orderbookOrder1.order.takerAmount,
            nativeOrder: orderbookOrder1.order,
            fillableTakerAmount: orderbookOrder1.fillableTakerAmount,
            isRfqt: false,
        };
        const kyber1Source: BridgeQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.Kyber,
            makerAmount: kyberSample1.output,
            takerAmount: kyberSample1.input,
            fillData: {},
        };
        const twoHopSource: MultiHopQuoteReportEntry = {
            liquiditySource: ERC20BridgeSource.MultiHop,
            makerAmount: twoHopSample.output,
            takerAmount: twoHopSample.input,
            hopSources: [ERC20BridgeSource.Balancer, ERC20BridgeSource.Curve],
            fillData: twoHopFillData,
        };

        const expectedSourcesConsidered: QuoteReportEntry[] = [kyber1Source, orderbookOrder1Source, twoHopSource];
        expect(orderReport.sourcesConsidered.length).to.eql(expectedSourcesConsidered.length);
        orderReport.sourcesConsidered.forEach((actualSourcesConsidered, idx) => {
            const expectedSourceConsidered = expectedSourcesConsidered[idx];
            expect(actualSourcesConsidered).to.eql(
                expectedSourceConsidered,
                `sourceConsidered incorrect at index ${idx}`,
            );
        });

        expect(orderReport.sourcesDelivered.length).to.eql(1);
        expect(orderReport.sourcesDelivered[0]).to.deep.equal(twoHopSource);
    });
});
