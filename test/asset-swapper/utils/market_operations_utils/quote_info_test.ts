import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';
import 'mocha';
import {
    ERC20BridgeSource,
    GasSchedule,
    IPath,
    MarketOperation,
    NativeOtcOrderFillData,
    OptimizedOrdersByType,
} from '../../../../src/asset-swapper/types';
import { MAX_UINT256, ONE_ETHER } from '../../../../src/asset-swapper/utils/market_operation_utils/constants';
import { calculateQuoteInfo } from '../../../../src/asset-swapper/utils/quote_info';
import { chaiSetup } from '../chai_setup';
import * as _ from 'lodash';

chaiSetup.configure();
const expect = chai.expect;

const FAKE_GAS_SCHEDULE: GasSchedule = (() => {
    const sources = Object.values(ERC20BridgeSource);
    const gasSchedule = _.zipObject(
        sources,
        new Array(sources.length).fill(() => 100e3),
    ) as GasSchedule;

    gasSchedule[ERC20BridgeSource.Native] = () => 50e3;
    gasSchedule[ERC20BridgeSource.MultiHop] = () => 242e3;
    return gasSchedule;
})();

describe('QuoteInfo', () => {
    describe('calculateQuoteInfo()', () => {
        it('Returns quote info for single hop orders (sell)', async () => {
            const path = createFakePath({
                ordersByType: {
                    nativeOrders: [],
                    bridgeOrders: [
                        {
                            type: FillQuoteTransformerOrderType.Bridge,
                            source: ERC20BridgeSource.UniswapV2,
                            makerToken: 'fake-usdc-address',
                            takerToken: 'fake-weth-address',
                            takerAmount: ONE_ETHER,
                            makerAmount: ONE_ETHER.times(1000),
                            fillData: {},
                            fill: {
                                input: ONE_ETHER,
                                output: ONE_ETHER.times(1000),
                                adjustedOutput: ONE_ETHER.times(990),
                                gas: 0,
                            },
                        },
                        {
                            type: FillQuoteTransformerOrderType.Bridge,
                            source: ERC20BridgeSource.Curve,
                            makerToken: 'fake-usdc-address',
                            takerToken: 'fake-weth-address',
                            takerAmount: ONE_ETHER,
                            makerAmount: ONE_ETHER.times(1000),
                            fillData: {},
                            fill: {
                                input: ONE_ETHER,
                                output: ONE_ETHER.times(1000),
                                adjustedOutput: ONE_ETHER.times(990),
                                gas: 0,
                            },
                        },
                    ],
                    twoHopOrders: [],
                },
            });

            const quoteInfo = calculateQuoteInfo({
                path,
                operation: MarketOperation.Sell,
                assetFillAmount: ONE_ETHER.times(2),
                gasPrice: new BigNumber(0),
                gasSchedule: FAKE_GAS_SCHEDULE,
                slippage: 0.01,
            });

            expect(quoteInfo.bestCaseQuoteInfo).to.be.deep.eq({
                makerAmount: ONE_ETHER.times(2000),
                takerAmount: ONE_ETHER.times(2),
                totalTakerAmount: ONE_ETHER.times(2),
                protocolFeeInWeiAmount: new BigNumber(0),
                gas: 200e3,
                slippage: 0,
            });
            expect(quoteInfo.worstCaseQuoteInfo).to.be.deep.eq({
                makerAmount: ONE_ETHER.times(1980),
                takerAmount: ONE_ETHER.times(2),
                totalTakerAmount: ONE_ETHER.times(2),
                protocolFeeInWeiAmount: new BigNumber(0),
                gas: 200e3,
                slippage: 0.01,
            });
            expect(quoteInfo.sourceBreakdown).to.be.deep.eq({
                singleSource: {
                    [ERC20BridgeSource.UniswapV2]: new BigNumber(0.5),
                    [ERC20BridgeSource.Curve]: new BigNumber(0.5),
                },
                multihop: [],
            });
        });

        it('Returns quote info for a two hop order (sell)', async () => {
            const path = createFakePath({
                ordersByType: {
                    nativeOrders: [],
                    twoHopOrders: [
                        {
                            firstHopOrder: {
                                type: FillQuoteTransformerOrderType.Bridge,
                                source: ERC20BridgeSource.Curve,
                                takerToken: 'fake-weth-address',
                                makerToken: 'fake-usdt-address',
                                takerAmount: ONE_ETHER,
                                makerAmount: new BigNumber(0),
                                fillData: {},
                                fill: {
                                    input: ONE_ETHER,
                                    output: new BigNumber(0),
                                    adjustedOutput: new BigNumber(0),
                                    gas: 1,
                                },
                            },
                            secondHopOrder: {
                                type: FillQuoteTransformerOrderType.Bridge,
                                source: ERC20BridgeSource.BalancerV2,
                                takerToken: 'fake-usdt-address',
                                makerToken: 'fake-usdc-address',
                                takerAmount: MAX_UINT256,
                                makerAmount: ONE_ETHER.times(1000),
                                fillData: {},
                                fill: {
                                    input: MAX_UINT256,
                                    output: ONE_ETHER.times(1000),
                                    adjustedOutput: ONE_ETHER.times(1000),
                                    gas: 1,
                                },
                            },
                        },
                    ],
                    bridgeOrders: [],
                },
            });

            const quoteInfo = calculateQuoteInfo({
                path,
                operation: MarketOperation.Sell,
                assetFillAmount: ONE_ETHER,
                gasPrice: new BigNumber(0),
                gasSchedule: FAKE_GAS_SCHEDULE,
                slippage: 0.01,
            });

            expect(quoteInfo.bestCaseQuoteInfo).to.be.deep.eq({
                makerAmount: ONE_ETHER.times(1000),
                takerAmount: ONE_ETHER,
                totalTakerAmount: ONE_ETHER,
                protocolFeeInWeiAmount: new BigNumber(0),
                gas: 242e3,
                slippage: 0,
            });
            expect(quoteInfo.worstCaseQuoteInfo).to.be.deep.eq({
                makerAmount: ONE_ETHER.times(990),
                takerAmount: ONE_ETHER,
                totalTakerAmount: ONE_ETHER,
                protocolFeeInWeiAmount: new BigNumber(0),
                gas: 242e3,
                slippage: 0.01,
            });
            expect(quoteInfo.sourceBreakdown).to.be.deep.eq({
                singleSource: {},
                multihop: [
                    {
                        proportion: new BigNumber(1),
                        intermediateToken: 'fake-usdt-address',
                        hops: [ERC20BridgeSource.Curve, ERC20BridgeSource.BalancerV2],
                    },
                ],
            });
        });

        it('Returns aggregated quote info for all orders (sell)', async () => {
            const path = createFakePath({
                ordersByType: {
                    nativeOrders: [
                        {
                            type: FillQuoteTransformerOrderType.Otc,
                            source: ERC20BridgeSource.Native,
                            makerToken: 'fake-usdc-address',
                            takerToken: 'fake-weth-address',
                            takerAmount: ONE_ETHER,
                            makerAmount: ONE_ETHER.times(1000),
                            fillData: {
                                order: {
                                    takerToken: 'fake-weth-address',
                                    makerToken: 'fake-usdc-address',
                                },
                            } as unknown as NativeOtcOrderFillData,
                            fill: {
                                input: ONE_ETHER,
                                output: ONE_ETHER.times(1000),
                                adjustedOutput: ONE_ETHER.times(1000),
                                gas: 0,
                            },
                        },
                    ],
                    bridgeOrders: [
                        {
                            type: FillQuoteTransformerOrderType.Bridge,
                            source: ERC20BridgeSource.UniswapV2,
                            makerToken: 'fake-usdc-address',
                            takerToken: 'fake-weth-address',
                            takerAmount: ONE_ETHER,
                            makerAmount: ONE_ETHER.times(1000),
                            fillData: {},
                            fill: {
                                input: ONE_ETHER,
                                output: ONE_ETHER.times(1000),
                                adjustedOutput: ONE_ETHER.times(990),
                                gas: 0,
                            },
                        },
                        {
                            type: FillQuoteTransformerOrderType.Bridge,
                            source: ERC20BridgeSource.Curve,
                            makerToken: 'fake-usdc-address',
                            takerToken: 'fake-weth-address',
                            takerAmount: ONE_ETHER,
                            makerAmount: ONE_ETHER.times(1000),
                            fillData: {},
                            fill: {
                                input: ONE_ETHER,
                                output: ONE_ETHER.times(1000),
                                adjustedOutput: ONE_ETHER.times(990),
                                gas: 0,
                            },
                        },
                    ],
                    twoHopOrders: [
                        {
                            firstHopOrder: {
                                type: FillQuoteTransformerOrderType.Bridge,
                                source: ERC20BridgeSource.Curve,
                                takerToken: 'fake-weth-address',
                                makerToken: 'fake-usdt-address',
                                takerAmount: ONE_ETHER,
                                makerAmount: new BigNumber(0),
                                fillData: {},
                                fill: {
                                    input: ONE_ETHER,
                                    output: new BigNumber(0),
                                    adjustedOutput: new BigNumber(0),
                                    gas: 1,
                                },
                            },
                            secondHopOrder: {
                                type: FillQuoteTransformerOrderType.Bridge,
                                source: ERC20BridgeSource.BalancerV2,
                                takerToken: 'fake-usdt-address',
                                makerToken: 'fake-usdc-address',
                                takerAmount: MAX_UINT256,
                                makerAmount: ONE_ETHER.times(1000),
                                fillData: {},
                                fill: {
                                    input: MAX_UINT256,
                                    output: ONE_ETHER.times(1000),
                                    adjustedOutput: ONE_ETHER.times(1000),
                                    gas: 1,
                                },
                            },
                        },
                    ],
                },
            });

            const quoteInfo = calculateQuoteInfo({
                path,
                operation: MarketOperation.Sell,
                assetFillAmount: ONE_ETHER.times(4),
                gasPrice: new BigNumber(0),
                gasSchedule: FAKE_GAS_SCHEDULE,
                slippage: 0.01,
            });

            expect(quoteInfo.bestCaseQuoteInfo).to.be.deep.eq({
                makerAmount: ONE_ETHER.times(4000),
                takerAmount: ONE_ETHER.times(4),
                totalTakerAmount: ONE_ETHER.times(4),
                protocolFeeInWeiAmount: new BigNumber(0),
                gas: 50e3 + 200e3 + 242e3,
                slippage: 0,
            });
            expect(quoteInfo.worstCaseQuoteInfo).to.be.deep.eq({
                makerAmount: ONE_ETHER.times(3960),
                takerAmount: ONE_ETHER.times(4),
                totalTakerAmount: ONE_ETHER.times(4),
                protocolFeeInWeiAmount: new BigNumber(0),
                gas: 50e3 + 200e3 + 242e3,
                slippage: 0.01,
            });
            expect(quoteInfo.sourceBreakdown).to.be.deep.eq({
                singleSource: {
                    [ERC20BridgeSource.Native]: new BigNumber(0.25),
                    [ERC20BridgeSource.UniswapV2]: new BigNumber(0.25),
                    [ERC20BridgeSource.Curve]: new BigNumber(0.25),
                },
                multihop: [
                    {
                        proportion: new BigNumber(0.25),
                        intermediateToken: 'fake-usdt-address',
                        hops: [ERC20BridgeSource.Curve, ERC20BridgeSource.BalancerV2],
                    },
                ],
            });
        });
    });
});

function createFakePath(params: { ordersByType: OptimizedOrdersByType }): IPath {
    return {
        getOrdersByType: () => params.ordersByType,
        // unused
        hasTwoHop: () => false,
        getOrders: () => [],
        getSlippedOrders: () => [],
        getSlippedOrdersByType: () => {
            throw new Error('Unimplemented');
        },
    };
}
