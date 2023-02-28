import * as chai from 'chai';
import 'mocha';
import {
    BigNumber,
    ERC20BridgeSource,
    Fill,
    FillQuoteTransformerOrderType,
    MarketOperation,
} from '../../../../src/asset-swapper';
import {
    MAX_UINT256,
    ONE_ETHER,
    SOURCE_FLAGS,
} from '../../../../src/asset-swapper/utils/market_operation_utils/constants';
import { Path } from '../../../../src/asset-swapper/utils/market_operation_utils/path';
import { chaiSetup } from '../chai_setup';

chaiSetup.configure();
const expect = chai.expect;

// TODO: add tests for MarketOperation.Buy
describe('Path', () => {
    describe('adjustedRate()', () => {
        it('Returns the adjusted rate based on adjustedOutput and exchange proxy overhead', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [createFakeBridgeFill({ input: ONE_ETHER, adjustedOutput: ONE_ETHER.times(990) })],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => ONE_ETHER.times(0.01), // 10 * 10e18 output amount
                },
            );

            // 990 (adjusted output) - 10 (overhead)
            expect(path.adjustedRate()).bignumber.eq(new BigNumber(990 - 10));
        });

        it('Returns the adjusted rate without interpolating penalty when sum of the input amounts is greater than the target input amount', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [
                    createFakeBridgeFill({
                        input: ONE_ETHER,
                        adjustedOutput: ONE_ETHER.times(990),
                    }),
                    createFakeBridgeFill({
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(990),
                    }),
                ],
                ONE_ETHER.times(1.5),
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => ONE_ETHER.times(0.01), // 10 * 10e18 output amount
                },
            );

            // 990 (adjusted output) + 1000 (output) /2 - 10 (penalty) - 10 (overhead)
            expect(path.adjustedRate()).bignumber.eq(new BigNumber(990 + 1000 / 2 - 10 - 10).div(1.5));
        });
    });

    describe('source flags', () => {
        it('Returns merged source flags from fills', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [
                    createFakeFillWithFlags(BigInt(1)),
                    createFakeFillWithFlags(BigInt(2)),
                    createFakeFillWithFlags(BigInt(8)),
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            expect(path.sourceFlags).eq(BigInt(1 + 2 + 8));
        });
    });

    describe('hasTwoHop()', () => {
        it('Returns false when the path does not include a two hop', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [
                    createFakeFillWithFlags(SOURCE_FLAGS[ERC20BridgeSource.UniswapV3]),
                    createFakeFillWithFlags(SOURCE_FLAGS[ERC20BridgeSource.Curve]),
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            expect(path.hasTwoHop()).to.be.false();
        });

        it('Returns true when the path includes a two hop', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [
                    createFakeFillWithFlags(SOURCE_FLAGS[ERC20BridgeSource.UniswapV3]),
                    createFakeFillWithFlags(SOURCE_FLAGS[ERC20BridgeSource.MultiHop]),
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            expect(path.hasTwoHop()).to.be.true();
        });
    });

    describe('getOrdersByType()', () => {
        it('Returns corresponding orders by type for a single native order (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(1000),
                        gas: 0,
                        source: ERC20BridgeSource.Native,
                        type: FillQuoteTransformerOrderType.Otc,
                        fillData: {
                            order: {
                                takerToken: 'fake-weth-address',
                                makerToken: 'fake-usdc-address',
                            },
                        },
                        sourcePathId: 'fake-path-id',
                        flags: BigInt(0),
                    },
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const ordersByType = path.getOrdersByType();

            expect(ordersByType).to.deep.eq({
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
                        },
                        fill: {
                            input: ONE_ETHER,
                            output: ONE_ETHER.times(1000),
                            adjustedOutput: ONE_ETHER.times(1000),
                            gas: 0,
                        },
                    },
                ],
                twoHopOrders: [],
                bridgeOrders: [],
            });
        });

        it('Returns corresponding orders by type for a single bridge order (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(990),
                        gas: 0,
                        source: ERC20BridgeSource.UniswapV2,
                        type: FillQuoteTransformerOrderType.Bridge,
                        fillData: { fakeFillData: 'fakeFillData' },
                        sourcePathId: 'fake-path-id',
                        flags: BigInt(0),
                    },
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const ordersByType = path.getOrdersByType();

            expect(ordersByType).to.deep.eq({
                nativeOrders: [],
                twoHopOrders: [],
                bridgeOrders: [
                    {
                        type: FillQuoteTransformerOrderType.Bridge,
                        source: ERC20BridgeSource.UniswapV2,
                        makerToken: 'fake-usdc-address',
                        takerToken: 'fake-weth-address',
                        takerAmount: ONE_ETHER,
                        makerAmount: ONE_ETHER.times(1000),
                        fillData: { fakeFillData: 'fakeFillData' },
                        fill: {
                            input: ONE_ETHER,
                            output: ONE_ETHER.times(1000),
                            adjustedOutput: ONE_ETHER.times(990),
                            gas: 0,
                        },
                    },
                ],
            });
        });

        it('Returns corresponding `OptimizedOrder`s for a two hop order (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(990),
                        gas: 0,
                        source: ERC20BridgeSource.MultiHop,
                        type: FillQuoteTransformerOrderType.Bridge,
                        fillData: {
                            firstHopSource: {
                                source: ERC20BridgeSource.Curve,
                                fillData: { fakeFillData: 'curve' },
                            },
                            secondHopSource: {
                                source: ERC20BridgeSource.BalancerV2,
                                fillData: { fakeFillData: 'balancer v2' },
                            },
                            intermediateToken: 'fake-usdt-address',
                        },
                        sourcePathId: 'fake-path-id',
                        flags: BigInt(0),
                    },
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const ordersByType = path.getOrdersByType();

            expect(ordersByType).deep.eq({
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
                            fillData: { fakeFillData: 'curve' },
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
                            fillData: { fakeFillData: 'balancer v2' },
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
            });
        });
    });

    describe('getOrders()', () => {
        it('Returns flattened orders', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(1000),
                        gas: 0,
                        source: ERC20BridgeSource.Native,
                        type: FillQuoteTransformerOrderType.Otc,
                        fillData: {
                            order: {
                                takerToken: 'fake-weth-address',
                                makerToken: 'fake-usdc-address',
                            },
                        },
                        sourcePathId: 'fake-path-id',
                        flags: BigInt(0),
                    },
                    {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(990),
                        gas: 0,
                        source: ERC20BridgeSource.UniswapV2,
                        type: FillQuoteTransformerOrderType.Bridge,
                        fillData: { fakeFillData: 'fakeFillData' },
                        sourcePathId: 'fake-path-id',
                        flags: BigInt(0),
                    },
                    {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(990),
                        gas: 0,
                        source: ERC20BridgeSource.MultiHop,
                        type: FillQuoteTransformerOrderType.Bridge,
                        fillData: {
                            firstHopSource: {
                                source: ERC20BridgeSource.Curve,
                                fillData: { fakeFillData: 'curve' },
                            },
                            secondHopSource: {
                                source: ERC20BridgeSource.BalancerV2,
                                fillData: { fakeFillData: 'balancer v2' },
                            },
                            intermediateToken: 'fake-usdt-address',
                        },
                        sourcePathId: 'fake-path-id',
                        flags: BigInt(0),
                    },
                ],
                ONE_ETHER.times(2),
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const orders = path.getOrders();

            expect(orders).deep.eq([
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
                    },
                    fill: {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(1000),
                        gas: 0,
                    },
                },
                {
                    type: FillQuoteTransformerOrderType.Bridge,
                    source: ERC20BridgeSource.UniswapV2,
                    makerToken: 'fake-usdc-address',
                    takerToken: 'fake-weth-address',
                    takerAmount: ONE_ETHER,
                    makerAmount: ONE_ETHER.times(1000),
                    fillData: { fakeFillData: 'fakeFillData' },
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
                    takerToken: 'fake-weth-address',
                    makerToken: 'fake-usdt-address',
                    takerAmount: ONE_ETHER,
                    makerAmount: new BigNumber(0),
                    fillData: { fakeFillData: 'curve' },
                    fill: {
                        input: ONE_ETHER,
                        output: new BigNumber(0),
                        adjustedOutput: new BigNumber(0),
                        gas: 1,
                    },
                },
                {
                    type: FillQuoteTransformerOrderType.Bridge,
                    source: ERC20BridgeSource.BalancerV2,
                    takerToken: 'fake-usdt-address',
                    makerToken: 'fake-usdc-address',
                    takerAmount: MAX_UINT256,
                    makerAmount: ONE_ETHER.times(1000),
                    fillData: { fakeFillData: 'balancer v2' },
                    fill: {
                        input: MAX_UINT256,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(1000),
                        gas: 1,
                    },
                },
            ]);
        });
    });

    describe('getSlippedOrdersByType()', () => {
        describe('Invalid `maxSlippage`', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [createFakeBridgeFill({ input: ONE_ETHER, adjustedOutput: ONE_ETHER.times(990) })],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => ONE_ETHER.times(0.01), // 10 * 10e18 output amount
                },
            );

            [-1, -0.01, 1.01, 2].forEach((maxSlippage) => {
                it(`Throws an error when maxSlippage is ${maxSlippage}`, () => {
                    expect(() => path.getSlippedOrdersByType(maxSlippage)).to.throw('slippage must be [0, 1]');
                });
            });
        });

        it('Does not apply slippage to native orders (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [
                    createFakeNativeFill({
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                    }),
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const { nativeOrders } = path.getSlippedOrdersByType(0.1);
            expect(nativeOrders).to.have.lengthOf(1);
            expect(nativeOrders[0].takerAmount).to.be.bignumber.eq(ONE_ETHER);
            expect(nativeOrders[0].makerAmount).to.be.bignumber.eq(ONE_ETHER.times(1000)); // not affected.
        });

        it('Returns a slipped single bridge order (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    createFakeBridgeFill({
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                    }),
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const { bridgeOrders } = path.getSlippedOrdersByType(0.01);
            expect(bridgeOrders).to.have.lengthOf(1);
            expect(bridgeOrders[0].takerAmount).to.be.bignumber.eq(ONE_ETHER);
            expect(bridgeOrders[0].makerAmount).to.be.bignumber.eq(ONE_ETHER.times(990)); // 1000 * 0.99
        });

        it('Returns slipped orders for a two hop order (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(990),
                        gas: 0,
                        source: ERC20BridgeSource.MultiHop,
                        type: FillQuoteTransformerOrderType.Bridge,
                        fillData: {
                            firstHopSource: {
                                source: ERC20BridgeSource.Curve,
                                fillData: { fakeFillData: 'curve' },
                            },
                            secondHopSource: {
                                source: ERC20BridgeSource.BalancerV2,
                                fillData: { fakeFillData: 'balancer v2' },
                            },
                            intermediateToken: 'fake-usdt-address',
                        },
                        sourcePathId: 'fake-path-id',
                        flags: BigInt(0),
                    },
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const { twoHopOrders } = path.getSlippedOrdersByType(0.01);
            expect(twoHopOrders).to.have.lengthOf(1);

            const { firstHopOrder, secondHopOrder } = twoHopOrders[0];
            expect(firstHopOrder.takerAmount).to.be.bignumber.eq(ONE_ETHER);
            expect(firstHopOrder.makerAmount).to.be.bignumber.eq(new BigNumber(0)); // Preserve 0

            expect(secondHopOrder.takerAmount).to.be.bignumber.eq(MAX_UINT256); // Preserve max
            expect(secondHopOrder.makerAmount).to.be.bignumber.eq(ONE_ETHER.times(990));
        });
    });

    describe('getSlippedOrders()', () => {
        describe('Invalid `maxSlippage`', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [createFakeBridgeFill({ input: ONE_ETHER, adjustedOutput: ONE_ETHER.times(990) })],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => ONE_ETHER.times(0.01), // 10 * 10e18 output amount
                },
            );

            [-1, -0.01, 1.01, 2].forEach((maxSlippage) => {
                it(`Throws an error when maxSlippage is ${maxSlippage}`, () => {
                    expect(() => path.getSlippedOrders(maxSlippage)).to.throw('slippage must be [0, 1]');
                });
            });
        });

        it('Does not apply slippage to native orders (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                [
                    createFakeNativeFill({
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                    }),
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const orders = path.getSlippedOrders(0.1);

            expect(orders).to.have.lengthOf(1);
            expect(orders[0].takerAmount).to.be.bignumber.eq(ONE_ETHER);
            expect(orders[0].makerAmount).to.be.bignumber.eq(ONE_ETHER.times(1000)); // not affected.
        });

        it('Returns a slipped single bridge order (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    createFakeBridgeFill({
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                    }),
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const orders = path.getSlippedOrders(0.01);
            expect(orders).to.have.lengthOf(1);
            expect(orders[0].takerAmount).to.be.bignumber.eq(ONE_ETHER);
            expect(orders[0].makerAmount).to.be.bignumber.eq(ONE_ETHER.times(990)); // 1000 * 0.99
        });

        it('Do not slip when max slippage is 0 (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    createFakeBridgeFill({
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                    }),
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const orders = path.getSlippedOrders(0);
            expect(orders).to.have.lengthOf(1);
            expect(orders[0].takerAmount).to.be.bignumber.eq(ONE_ETHER);
            expect(orders[0].makerAmount).to.be.bignumber.eq(ONE_ETHER.times(1000));
        });

        it('Returns slipped orders for a two hop order (sell)', () => {
            const path = Path.create(
                {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-weth-address',
                    outputToken: 'fake-usdc-address',
                },
                [
                    {
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(990),
                        gas: 0,
                        source: ERC20BridgeSource.MultiHop,
                        type: FillQuoteTransformerOrderType.Bridge,
                        fillData: {
                            firstHopSource: {
                                source: ERC20BridgeSource.Curve,
                                fillData: { fakeFillData: 'curve' },
                            },
                            secondHopSource: {
                                source: ERC20BridgeSource.BalancerV2,
                                fillData: { fakeFillData: 'balancer v2' },
                            },
                            intermediateToken: 'fake-usdt-address',
                        },
                        sourcePathId: 'fake-path-id',
                        flags: BigInt(0),
                    },
                ],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => new BigNumber(0),
                },
            );

            const orders = path.getSlippedOrders(0.01);
            expect(orders).to.have.lengthOf(2);

            const [firstHopOrder, secondHopOrder] = orders;
            expect(firstHopOrder.takerAmount).to.be.bignumber.eq(ONE_ETHER);
            expect(firstHopOrder.makerAmount).to.be.bignumber.eq(new BigNumber(0)); // Preserve 0

            expect(secondHopOrder.takerAmount).to.be.bignumber.eq(MAX_UINT256); // Preserve max
            expect(secondHopOrder.makerAmount).to.be.bignumber.eq(ONE_ETHER.times(990));
        });
    });
});

function createFakeBridgeFill(params: { input: BigNumber; output?: BigNumber; adjustedOutput?: BigNumber }): Fill {
    const { input, output, adjustedOutput } = params;
    return {
        input,
        output: output || new BigNumber(0),
        adjustedOutput: adjustedOutput || new BigNumber(0),
        gas: 42,
        source: ERC20BridgeSource.UniswapV2,
        type: FillQuoteTransformerOrderType.Bridge,
        fillData: {
            tokenAddressPath: ['fake-taker-token', 'fake_maker-token'],
            router: 'fake-router',
        },
        sourcePathId: 'fake-path-id',
        flags: BigInt(0),
    };
}

function createFakeNativeFill(params: { input: BigNumber; output?: BigNumber; adjustedOutput?: BigNumber }): Fill {
    const { input, output, adjustedOutput } = params;
    return {
        input,
        output: output || new BigNumber(0),
        adjustedOutput: adjustedOutput || new BigNumber(0),
        gas: 0,
        source: ERC20BridgeSource.Native,
        type: FillQuoteTransformerOrderType.Otc,
        fillData: {
            order: {
                takerToken: 'fake-taker-token',
                makerToken: 'fake-maker-token',
            },
        },
        sourcePathId: 'fake-path-id',
        flags: BigInt(0),
    };
}

function createFakeFillWithFlags(flags: bigint): Fill {
    return {
        input: ONE_ETHER,
        output: ONE_ETHER,
        adjustedOutput: ONE_ETHER,
        gas: 42,
        source: ERC20BridgeSource.UniswapV2,
        type: FillQuoteTransformerOrderType.Bridge,
        fillData: {
            tokenAddressPath: ['fake-taker-token', 'fake_maker-token'],
            router: 'fake-router',
        },
        sourcePathId: 'fake-path-id',
        flags,
    };
}
