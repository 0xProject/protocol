import {
    assertIntegerRoughlyEquals,
    blockchainTests,
    constants,
    expect,
    getRandomInteger,
    Numberish,
} from '@0x/contracts-test-utils';
import {
    encodeFillQuoteTransformerData,
    FillQuoteTransformerBridgeOrder as BridgeOrder,
    FillQuoteTransformerData,
    FillQuoteTransformerLimitOrderInfo,
    FillQuoteTransformerOrderType as OrderType,
    FillQuoteTransformerRfqOrderInfo,
    FillQuoteTransformerSide as Side,
    LimitOrder,
    LimitOrderFields,
    RfqOrder,
    RfqOrderFields,
    Signature,
} from '@0x/protocol-utils';
import { BigNumber, hexUtils, ZeroExRevertErrors } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs as TxReceipt } from 'ethereum-types';
import * as _ from 'lodash';

import { artifacts } from '../artifacts';
import { TestFillQuoteTransformerBridgeContract } from '../generated-wrappers/test_fill_quote_transformer_bridge';
import { getRandomLimitOrder, getRandomRfqOrder } from '../utils/orders';
import {
    EthereumBridgeAdapterContract,
    FillQuoteTransformerContract,
    TestFillQuoteTransformerExchangeContract,
    TestFillQuoteTransformerHostContract,
    TestMintableERC20TokenContract,
} from '../wrappers';

const { NULL_ADDRESS, NULL_BYTES, MAX_UINT256, ZERO_AMOUNT } = constants;

blockchainTests.resets('FillQuoteTransformer', env => {
    let maker: string;
    let feeRecipient: string;
    let sender: string;
    let taker: string;
    let exchange: TestFillQuoteTransformerExchangeContract;
    let bridge: TestFillQuoteTransformerBridgeContract;
    let transformer: FillQuoteTransformerContract;
    let host: TestFillQuoteTransformerHostContract;
    let makerToken: TestMintableERC20TokenContract;
    let takerToken: TestMintableERC20TokenContract;
    let takerFeeToken: TestMintableERC20TokenContract;
    let singleProtocolFee: BigNumber;

    const GAS_PRICE = 1337;
    // Left half is 0, corresponding to BridgeProtocol.Unknown
    const TEST_BRIDGE_SOURCE = hexUtils.leftPad(hexUtils.random(16), 32);
    const HIGH_BIT = new BigNumber(2).pow(255);
    const REVERT_AMOUNT = new BigNumber('0xdeadbeef');

    before(async () => {
        [maker, feeRecipient, sender, taker] = await env.getAccountAddressesAsync();
        exchange = await TestFillQuoteTransformerExchangeContract.deployFrom0xArtifactAsync(
            artifacts.TestFillQuoteTransformerExchange,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        const bridgeAdapter = await EthereumBridgeAdapterContract.deployFrom0xArtifactAsync(
            artifacts.EthereumBridgeAdapter,
            env.provider,
            env.txDefaults,
            artifacts,
            NULL_ADDRESS,
        );
        transformer = await FillQuoteTransformerContract.deployFrom0xArtifactAsync(
            artifacts.FillQuoteTransformer,
            env.provider,
            env.txDefaults,
            artifacts,
            bridgeAdapter.address,
            exchange.address,
        );
        host = await TestFillQuoteTransformerHostContract.deployFrom0xArtifactAsync(
            artifacts.TestFillQuoteTransformerHost,
            env.provider,
            {
                ...env.txDefaults,
                gasPrice: GAS_PRICE,
            },
            artifacts,
        );
        bridge = await TestFillQuoteTransformerBridgeContract.deployFrom0xArtifactAsync(
            artifacts.TestFillQuoteTransformerBridge,
            env.provider,
            { ...env.txDefaults, from: sender },
            artifacts,
        );
        [makerToken, takerToken, takerFeeToken] = await Promise.all(
            _.times(3, async () =>
                TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
                    artifacts.TestMintableERC20Token,
                    env.provider,
                    env.txDefaults,
                    artifacts,
                ),
            ),
        );
        singleProtocolFee = (await exchange.getProtocolFeeMultiplier().callAsync()).times(GAS_PRICE);
    });

    function createLimitOrder(fields: Partial<LimitOrderFields> = {}): LimitOrder {
        return getRandomLimitOrder({
            maker,
            feeRecipient,
            makerToken: makerToken.address,
            takerToken: takerToken.address,
            makerAmount: getRandomInteger('0.1e18', '1e18'),
            takerAmount: getRandomInteger('0.1e18', '1e18'),
            takerTokenFeeAmount: getRandomInteger('0.1e18', '1e18'),
            ...fields,
        });
    }

    function createRfqOrder(fields: Partial<RfqOrderFields> = {}): RfqOrder {
        return getRandomRfqOrder({
            maker,
            makerToken: makerToken.address,
            takerToken: takerToken.address,
            makerAmount: getRandomInteger('0.1e18', '1e18'),
            takerAmount: getRandomInteger('0.1e18', '1e18'),
            ...fields,
        });
    }

    function createBridgeOrder(fillRatio: Numberish = 1.0): BridgeOrder {
        const makerTokenAmount = getRandomInteger('0.1e18', '1e18');
        return {
            makerTokenAmount,
            source: TEST_BRIDGE_SOURCE,
            takerTokenAmount: getRandomInteger('0.1e18', '1e18'),
            bridgeData: encodeBridgeData(makerTokenAmount.times(fillRatio).integerValue()),
        };
    }

    function createOrderSignature(preFilledTakerAmount: Numberish = 0): Signature {
        return {
            // The r field of the signature is the pre-filled amount.
            r: hexUtils.leftPad(preFilledTakerAmount),
            s: NULL_BYTES,
            v: 0,
            signatureType: 0,
        };
    }

    function orderSignatureToPreFilledTakerAmount(signature: Signature): BigNumber {
        return new BigNumber(signature.r);
    }

    function encodeBridgeData(boughtAmount: BigNumber): string {
        // abi.encode(bridgeAddress, bridgeData)
        return hexUtils.concat(hexUtils.leftPad(bridge.address), hexUtils.leftPad(32), hexUtils.leftPad(boughtAmount));
    }

    interface QuoteFillResults {
        makerTokensBought: BigNumber;
        takerTokensSpent: BigNumber;
        protocolFeePaid: BigNumber;
    }

    interface SimulationState {
        takerTokenBalance: BigNumber;
        ethBalance: BigNumber;
    }

    function getExpectedQuoteFillResults(
        data: FillQuoteTransformerData,
        state: SimulationState = createSimulationState(),
    ): QuoteFillResults {
        const EMPTY_FILL_ORDER_RESULTS = {
            takerTokenSoldAmount: ZERO_AMOUNT,
            makerTokenBoughtAmount: ZERO_AMOUNT,
            protocolFeePaid: ZERO_AMOUNT,
        };
        type FillOrderResults = typeof EMPTY_FILL_ORDER_RESULTS;

        let takerTokenBalanceRemaining = state.takerTokenBalance;
        if (data.side === Side.Sell && !data.fillAmount.eq(MAX_UINT256)) {
            takerTokenBalanceRemaining = data.fillAmount;
        }
        let ethBalanceRemaining = state.ethBalance;
        let soldAmount = ZERO_AMOUNT;
        let boughtAmount = ZERO_AMOUNT;
        const fillAmount = normalizeFillAmount(data.fillAmount, state.takerTokenBalance);
        const orderIndices = [0, 0, 0];

        function computeTakerTokenFillAmount(
            orderTakerTokenAmount: BigNumber,
            orderMakerTokenAmount: BigNumber,
            orderTakerTokenFeeAmount: BigNumber = ZERO_AMOUNT,
        ): BigNumber {
            let takerTokenFillAmount = ZERO_AMOUNT;
            if (data.side === Side.Sell) {
                takerTokenFillAmount = fillAmount.minus(soldAmount);
                if (orderTakerTokenFeeAmount.gt(0)) {
                    takerTokenFillAmount = takerTokenFillAmount
                        .times(orderTakerTokenAmount)
                        .div(orderTakerTokenAmount.plus(orderTakerTokenFeeAmount))
                        .integerValue(BigNumber.ROUND_UP);
                }
            } else {
                // Buy
                takerTokenFillAmount = fillAmount
                    .minus(boughtAmount)
                    .times(orderTakerTokenAmount)
                    .div(orderMakerTokenAmount)
                    .integerValue(BigNumber.ROUND_UP);
            }
            return BigNumber.min(takerTokenFillAmount, orderTakerTokenAmount, takerTokenBalanceRemaining);
        }

        function fillBridgeOrder(order: BridgeOrder): FillOrderResults {
            const bridgeBoughtAmount = decodeBridgeData(order.bridgeData).boughtAmount;
            if (bridgeBoughtAmount.eq(REVERT_AMOUNT)) {
                return EMPTY_FILL_ORDER_RESULTS;
            }
            return {
                ...EMPTY_FILL_ORDER_RESULTS,
                takerTokenSoldAmount: computeTakerTokenFillAmount(order.takerTokenAmount, order.makerTokenAmount),
                makerTokenBoughtAmount: bridgeBoughtAmount,
            };
        }

        function fillLimitOrder(oi: FillQuoteTransformerLimitOrderInfo): FillOrderResults {
            const preFilledTakerAmount = orderSignatureToPreFilledTakerAmount(oi.signature);
            if (preFilledTakerAmount.gte(oi.order.takerAmount) || preFilledTakerAmount.eq(REVERT_AMOUNT)) {
                return EMPTY_FILL_ORDER_RESULTS;
            }
            if (ethBalanceRemaining.lt(singleProtocolFee)) {
                return EMPTY_FILL_ORDER_RESULTS;
            }
            const takerTokenFillAmount = BigNumber.min(
                computeTakerTokenFillAmount(oi.order.takerAmount, oi.order.makerAmount, oi.order.takerTokenFeeAmount),
                oi.order.takerAmount.minus(preFilledTakerAmount),
                oi.maxTakerTokenFillAmount,
            );
            const fillRatio = takerTokenFillAmount.div(oi.order.takerAmount);
            return {
                ...EMPTY_FILL_ORDER_RESULTS,
                takerTokenSoldAmount: takerTokenFillAmount.plus(
                    fillRatio.times(oi.order.takerTokenFeeAmount).integerValue(BigNumber.ROUND_DOWN),
                ),
                makerTokenBoughtAmount: fillRatio.times(oi.order.makerAmount).integerValue(BigNumber.ROUND_DOWN),
                protocolFeePaid: singleProtocolFee,
            };
        }

        function fillRfqOrder(oi: FillQuoteTransformerRfqOrderInfo): FillOrderResults {
            const preFilledTakerAmount = orderSignatureToPreFilledTakerAmount(oi.signature);
            if (preFilledTakerAmount.gte(oi.order.takerAmount) || preFilledTakerAmount.eq(REVERT_AMOUNT)) {
                return EMPTY_FILL_ORDER_RESULTS;
            }
            const takerTokenFillAmount = BigNumber.min(
                computeTakerTokenFillAmount(oi.order.takerAmount, oi.order.makerAmount),
                oi.order.takerAmount.minus(preFilledTakerAmount),
                oi.maxTakerTokenFillAmount,
            );
            const fillRatio = takerTokenFillAmount.div(oi.order.takerAmount);
            return {
                ...EMPTY_FILL_ORDER_RESULTS,
                takerTokenSoldAmount: takerTokenFillAmount,
                makerTokenBoughtAmount: fillRatio.times(oi.order.makerAmount).integerValue(BigNumber.ROUND_DOWN),
            };
        }

        for (let i = 0; i < data.fillSequence.length; ++i) {
            const orderType = data.fillSequence[i];
            if (data.side === Side.Sell) {
                if (soldAmount.gte(fillAmount)) {
                    break;
                }
            } else {
                if (boughtAmount.gte(fillAmount)) {
                    break;
                }
            }
            let results = EMPTY_FILL_ORDER_RESULTS;
            switch (orderType) {
                case OrderType.Bridge:
                    {
                        results = fillBridgeOrder(data.bridgeOrders[orderIndices[orderType]]);
                    }
                    break;
                case OrderType.Limit:
                    {
                        results = fillLimitOrder(data.limitOrders[orderIndices[orderType]]);
                    }
                    break;
                case OrderType.Rfq:
                    {
                        results = fillRfqOrder(data.rfqOrders[orderIndices[orderType]]);
                    }
                    break;
                default:
                    throw new Error('Unknown order type');
            }
            soldAmount = soldAmount.plus(results.takerTokenSoldAmount);
            boughtAmount = boughtAmount.plus(results.makerTokenBoughtAmount);
            ethBalanceRemaining = ethBalanceRemaining.minus(results.protocolFeePaid);
            takerTokenBalanceRemaining = takerTokenBalanceRemaining.minus(results.takerTokenSoldAmount);
            orderIndices[orderType]++;
        }

        return {
            takerTokensSpent: soldAmount,
            makerTokensBought: boughtAmount,
            protocolFeePaid: state.ethBalance.minus(ethBalanceRemaining),
        };
    }

    interface Balances {
        makerTokenBalance: BigNumber;
        takerTokensBalance: BigNumber;
        takerFeeBalance: BigNumber;
        ethBalance: BigNumber;
    }

    const ZERO_BALANCES = {
        makerTokenBalance: ZERO_AMOUNT,
        takerTokensBalance: ZERO_AMOUNT,
        takerFeeBalance: ZERO_AMOUNT,
        ethBalance: ZERO_AMOUNT,
    };

    async function getBalancesAsync(owner: string): Promise<Balances> {
        const balances = { ...ZERO_BALANCES };
        [balances.makerTokenBalance, balances.takerTokensBalance, balances.takerFeeBalance, balances.ethBalance] =
            await Promise.all([
                makerToken.balanceOf(owner).callAsync(),
                takerToken.balanceOf(owner).callAsync(),
                takerFeeToken.balanceOf(owner).callAsync(),
                env.web3Wrapper.getBalanceInWeiAsync(owner),
            ]);
        return balances;
    }

    function assertBalances(actual: Balances, expected: Balances): void {
        assertIntegerRoughlyEquals(actual.makerTokenBalance, expected.makerTokenBalance, 10, 'makerTokenBalance');
        assertIntegerRoughlyEquals(actual.takerTokensBalance, expected.takerTokensBalance, 10, 'takerTokensBalance');
        assertIntegerRoughlyEquals(actual.takerFeeBalance, expected.takerFeeBalance, 10, 'takerFeeBalance');
        assertIntegerRoughlyEquals(actual.ethBalance, expected.ethBalance, 10, 'ethBalance');
    }

    async function assertCurrentBalancesAsync(owner: string, expected: Balances): Promise<void> {
        assertBalances(await getBalancesAsync(owner), expected);
    }

    function encodeFractionalFillAmount(frac: number): BigNumber {
        return HIGH_BIT.plus(new BigNumber(frac).times('1e18').integerValue());
    }

    function normalizeFillAmount(raw: BigNumber, balance: BigNumber): BigNumber {
        if (raw.gte(HIGH_BIT)) {
            return raw.minus(HIGH_BIT).div('1e18').times(balance).integerValue(BigNumber.ROUND_DOWN);
        }
        return raw;
    }

    interface BridgeData {
        bridge: string;
        boughtAmount: BigNumber;
    }

    function decodeBridgeData(encoded: string): BridgeData {
        return {
            bridge: hexUtils.slice(encoded, 0, 32),
            boughtAmount: new BigNumber(hexUtils.slice(encoded, 64)),
        };
    }

    function createTransformData(fields: Partial<FillQuoteTransformerData> = {}): FillQuoteTransformerData {
        return {
            side: Side.Sell,
            sellToken: takerToken.address,
            buyToken: makerToken.address,
            bridgeOrders: [],
            limitOrders: [],
            otcOrders: [],
            rfqOrders: [],
            fillSequence: [],
            fillAmount: MAX_UINT256,
            refundReceiver: NULL_ADDRESS,
            ...fields,
        };
    }

    function createSimulationState(fields: Partial<SimulationState> = {}): SimulationState {
        return {
            ethBalance: ZERO_AMOUNT,
            takerTokenBalance: ZERO_AMOUNT,
            ...fields,
        };
    }

    interface ExecuteTransformParams {
        takerTokenBalance: BigNumber;
        ethBalance: BigNumber;
        sender: string;
        taker: string;
        data: FillQuoteTransformerData;
    }

    async function executeTransformAsync(params: Partial<ExecuteTransformParams> = {}): Promise<TxReceipt> {
        const data = params.data || createTransformData(params.data);
        const _params = {
            takerTokenBalance: data.fillAmount,
            sender,
            taker,
            data,
            ...params,
        };
        return host
            .executeTransform(
                transformer.address,
                takerToken.address,
                _params.takerTokenBalance,
                _params.sender,
                _params.taker,
                encodeFillQuoteTransformerData(_params.data),
            )
            .awaitTransactionSuccessAsync({ value: _params.ethBalance });
    }

    async function assertFinalBalancesAsync(qfr: QuoteFillResults): Promise<void> {
        await assertCurrentBalancesAsync(host.address, {
            ...ZERO_BALANCES,
            makerTokenBalance: qfr.makerTokensBought,
        });
        await assertCurrentBalancesAsync(exchange.address, { ...ZERO_BALANCES, ethBalance: qfr.protocolFeePaid });
    }

    describe('sell quotes', () => {
        it('can fully sell to a single bridge order with -1 fillAmount', async () => {
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                fillAmount: BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount)),
                fillSequence: bridgeOrders.map(() => OrderType.Bridge),
            });
            const qfr = getExpectedQuoteFillResults(data);
            await executeTransformAsync({
                takerTokenBalance: data.fillAmount,
                data: { ...data, fillAmount: MAX_UINT256 },
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can partially sell to a single bridge order with a fractional fillAmount', async () => {
            const bridgeOrders = [createBridgeOrder()];
            const totalTakerBalance = BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount));
            const data = createTransformData({
                bridgeOrders,
                fillAmount: encodeFractionalFillAmount(0.5),
                fillSequence: bridgeOrders.map(() => OrderType.Bridge),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({ takerTokenBalance: totalTakerBalance }),
            );
            await executeTransformAsync({
                takerTokenBalance: totalTakerBalance,
                data,
            });
            await assertCurrentBalancesAsync(host.address, {
                ...ZERO_BALANCES,
                takerTokensBalance: totalTakerBalance.minus(qfr.takerTokensSpent),
                makerTokenBalance: qfr.makerTokensBought,
            });
        });

        it('fails if incomplete sell', async () => {
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                fillAmount: BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount)),
                fillSequence: bridgeOrders.map(() => OrderType.Bridge),
            });
            const tx = executeTransformAsync({
                takerTokenBalance: data.fillAmount,
                data: { ...data, fillAmount: data.fillAmount.plus(1) },
            });
            return expect(tx).to.revertWith(
                new ZeroExRevertErrors.TransformERC20.IncompleteFillSellQuoteError(
                    data.sellToken,
                    data.fillAmount,
                    data.fillAmount.plus(1),
                ),
            );
        });

        it('can fully sell to a single bridge order', async () => {
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                fillAmount: BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount)),
                fillSequence: bridgeOrders.map(() => OrderType.Bridge),
            });
            const qfr = getExpectedQuoteFillResults(data);
            await executeTransformAsync({
                takerTokenBalance: data.fillAmount,
                data,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can fully sell to a single limit order', async () => {
            const limitOrders = [createLimitOrder()];
            const data = createTransformData({
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount))),
                fillSequence: limitOrders.map(() => OrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can partial sell to a single limit order', async () => {
            const limitOrders = [createLimitOrder()];
            const data = createTransformData({
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(
                    ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)),
                ).dividedToIntegerBy(2),
                fillSequence: limitOrders.map(() => OrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can fully sell to a single limit order without fees', async () => {
            const limitOrders = [createLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT })];
            const data = createTransformData({
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount))),
                fillSequence: limitOrders.map(() => OrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can partial sell to a single limit order without fees', async () => {
            const limitOrders = [createLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT })];
            const data = createTransformData({
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(
                    ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)),
                ).dividedToIntegerBy(2),
                fillSequence: limitOrders.map(() => OrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can fully sell to a single RFQ order', async () => {
            const rfqOrders = [createRfqOrder()];
            const data = createTransformData({
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...rfqOrders.map(o => o.takerAmount)),
                fillSequence: rfqOrders.map(() => OrderType.Rfq),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState());
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can partially sell to a single RFQ order', async () => {
            const rfqOrders = [createRfqOrder()];
            const data = createTransformData({
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...rfqOrders.map(o => o.takerAmount)).dividedToIntegerBy(2),
                fillSequence: rfqOrders.map(() => OrderType.Rfq),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState());
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can fully sell to one of each order type', async () => {
            const rfqOrders = [createRfqOrder()];
            const limitOrders = [createLimitOrder()];
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(
                    ...rfqOrders.map(o => o.takerAmount),
                    ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)),
                    ...bridgeOrders.map(o => o.takerTokenAmount),
                ),
                fillSequence: _.shuffle([
                    ...bridgeOrders.map(() => OrderType.Bridge),
                    ...rfqOrders.map(() => OrderType.Rfq),
                    ...limitOrders.map(() => OrderType.Limit),
                ]),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            await assertFinalBalancesAsync(qfr);
        });

        it('can partially sell to one of each order type', async () => {
            const rfqOrders = [createRfqOrder()];
            const limitOrders = [createLimitOrder()];
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(
                    ...rfqOrders.map(o => o.takerAmount),
                    ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)),
                    ...bridgeOrders.map(o => o.takerTokenAmount),
                ).dividedToIntegerBy(2),
                fillSequence: _.shuffle([
                    ...bridgeOrders.map(() => OrderType.Bridge),
                    ...rfqOrders.map(() => OrderType.Rfq),
                    ...limitOrders.map(() => OrderType.Limit),
                ]),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            await assertFinalBalancesAsync(qfr);
        });

        it('can fully sell to multiple of each order type', async () => {
            const rfqOrders = _.times(2, () => createRfqOrder());
            const limitOrders = _.times(3, () => createLimitOrder());
            const bridgeOrders = _.times(4, () => createBridgeOrder());
            const data = createTransformData({
                bridgeOrders,
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(
                    ...rfqOrders.map(o => o.takerAmount),
                    ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)),
                    ...bridgeOrders.map(o => o.takerTokenAmount),
                ),
                fillSequence: _.shuffle([
                    ...bridgeOrders.map(() => OrderType.Bridge),
                    ...rfqOrders.map(() => OrderType.Rfq),
                    ...limitOrders.map(() => OrderType.Limit),
                ]),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            await assertFinalBalancesAsync(qfr);
        });

        it('can recover from a failed order', async () => {
            const rfqOrder = createRfqOrder();
            const limitOrder = createLimitOrder();
            const bridgeOrder = createBridgeOrder();
            const fillSequence = _.shuffle([OrderType.Bridge, OrderType.Rfq, OrderType.Limit]);
            // Fail the first order in the sequence.
            const failedOrderType = fillSequence[0];
            const data = createTransformData({
                fillSequence,
                bridgeOrders: [
                    {
                        ...bridgeOrder,
                        bridgeData:
                            failedOrderType === OrderType.Bridge
                                ? encodeBridgeData(REVERT_AMOUNT)
                                : bridgeOrder.bridgeData,
                    },
                ],
                rfqOrders: [
                    {
                        order: rfqOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(
                            failedOrderType === OrderType.Rfq ? REVERT_AMOUNT : ZERO_AMOUNT,
                        ),
                    },
                ],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(
                            failedOrderType === OrderType.Limit ? REVERT_AMOUNT : ZERO_AMOUNT,
                        ),
                    },
                ],
                // Only require the last two orders to be filled.
                fillAmount: BigNumber.sum(
                    rfqOrder.takerAmount,
                    limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount),
                    bridgeOrder.takerTokenAmount,
                )
                    .minus(failedOrderType === OrderType.Bridge ? bridgeOrder.takerTokenAmount : 0)
                    .minus(failedOrderType === OrderType.Rfq ? rfqOrder.takerAmount : 0)
                    .minus(
                        failedOrderType === OrderType.Limit
                            ? limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount)
                            : 0,
                    ),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            await assertFinalBalancesAsync(qfr);
        });

        it('can recover from a slipped order', async () => {
            const rfqOrder = createRfqOrder();
            const limitOrder = createLimitOrder();
            const bridgeOrder = createBridgeOrder();
            const fillSequence = _.shuffle([OrderType.Bridge, OrderType.Rfq, OrderType.Limit]);
            // Slip the first order in the sequence.
            const slippedOrderType = fillSequence[0];
            const data = createTransformData({
                fillSequence,
                bridgeOrders: [
                    {
                        ...bridgeOrder,
                        // If slipped, produce half the tokens.
                        bridgeData:
                            slippedOrderType === OrderType.Bridge
                                ? encodeBridgeData(bridgeOrder.makerTokenAmount.dividedToIntegerBy(2))
                                : bridgeOrder.bridgeData,
                    },
                ],
                rfqOrders: [
                    {
                        order: rfqOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        // If slipped, set half the order to filled.
                        signature: createOrderSignature(
                            slippedOrderType === OrderType.Rfq
                                ? rfqOrder.takerAmount.div(2).integerValue(BigNumber.ROUND_DOWN)
                                : ZERO_AMOUNT,
                        ),
                    },
                ],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        // If slipped, set half the order to filled.
                        signature: createOrderSignature(
                            slippedOrderType === OrderType.Limit
                                ? limitOrder.takerAmount.div(2).integerValue(BigNumber.ROUND_DOWN)
                                : ZERO_AMOUNT,
                        ),
                    },
                ],
                // Only require half the first order to be filled.
                fillAmount: BigNumber.sum(
                    rfqOrder.takerAmount,
                    limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount),
                    bridgeOrder.takerTokenAmount,
                )
                    .minus(
                        slippedOrderType === OrderType.Bridge
                            ? bridgeOrder.takerTokenAmount.div(2).integerValue(BigNumber.ROUND_UP)
                            : 0,
                    )
                    .minus(
                        slippedOrderType === OrderType.Rfq
                            ? rfqOrder.takerAmount.div(2).integerValue(BigNumber.ROUND_UP)
                            : 0,
                    )
                    .minus(
                        slippedOrderType === OrderType.Limit
                            ? limitOrder.takerAmount
                                  .plus(limitOrder.takerTokenFeeAmount)
                                  .div(2)
                                  .integerValue(BigNumber.ROUND_UP)
                            : 0,
                    ),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            await assertFinalBalancesAsync(qfr);
        });

        it('skips limit orders when not enough protocol fee balance', async () => {
            const limitOrder = createLimitOrder();
            const bridgeOrder = {
                source: TEST_BRIDGE_SOURCE,
                makerTokenAmount: limitOrder.makerAmount,
                takerTokenAmount: limitOrder.takerAmount,
                bridgeData: encodeBridgeData(limitOrder.makerAmount),
            };
            const fillSequence = [OrderType.Limit, OrderType.Bridge];
            const data = createTransformData({
                fillSequence,
                bridgeOrders: [bridgeOrder],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(),
                    },
                ],
                // Only require one order to be filled (they are both the same size).
                fillAmount: bridgeOrder.takerTokenAmount,
            });
            const qfr = getExpectedQuoteFillResults(data);
            expect(qfr.takerTokensSpent).to.bignumber.eq(bridgeOrder.takerTokenAmount);
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            await assertFinalBalancesAsync(qfr);
        });
    });

    describe('buy quotes', () => {
        it('fails if incomplete buy', async () => {
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                side: Side.Buy,
                fillAmount: BigNumber.sum(...bridgeOrders.map(o => o.makerTokenAmount)),
                fillSequence: bridgeOrders.map(() => OrderType.Bridge),
            });
            const tx = executeTransformAsync({
                takerTokenBalance: BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount)),
                data: { ...data, fillAmount: data.fillAmount.plus(1) },
            });
            return expect(tx).to.revertWith(
                new ZeroExRevertErrors.TransformERC20.IncompleteFillBuyQuoteError(
                    data.buyToken,
                    data.fillAmount,
                    data.fillAmount.plus(1),
                ),
            );
        });

        it('can fully buy to a single bridge order', async () => {
            const bridgeOrders = [createBridgeOrder()];
            const totalTakerTokens = BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount));
            const data = createTransformData({
                bridgeOrders,
                side: Side.Buy,
                fillAmount: BigNumber.sum(...bridgeOrders.map(o => o.makerTokenAmount)),
                fillSequence: bridgeOrders.map(() => OrderType.Bridge),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({ takerTokenBalance: totalTakerTokens }),
            );
            await executeTransformAsync({
                takerTokenBalance: totalTakerTokens,
                data,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can fully buy to a single limit order', async () => {
            const limitOrders = [createLimitOrder()];
            const totalTakerTokens = BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)));
            const data = createTransformData({
                side: Side.Buy,
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...limitOrders.map(o => o.makerAmount)),
                fillSequence: limitOrders.map(() => OrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                    takerTokenBalance: totalTakerTokens,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: totalTakerTokens,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can partial buy to a single limit order', async () => {
            const limitOrders = [createLimitOrder()];
            const totalTakerTokens = BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)));
            const data = createTransformData({
                side: Side.Buy,
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...limitOrders.map(o => o.makerAmount)).dividedToIntegerBy(2),
                fillSequence: limitOrders.map(() => OrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                    takerTokenBalance: totalTakerTokens,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can fully buy to a single limit order without fees', async () => {
            const limitOrders = [createLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT })];
            const totalTakerTokens = BigNumber.sum(...limitOrders.map(o => o.takerAmount));
            const data = createTransformData({
                side: Side.Buy,
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...limitOrders.map(o => o.makerAmount)),
                fillSequence: limitOrders.map(() => OrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                    takerTokenBalance: totalTakerTokens,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can partial buy to a single limit order without fees', async () => {
            const limitOrders = [createLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT })];
            const totalTakerTokens = BigNumber.sum(...limitOrders.map(o => o.takerAmount));
            const data = createTransformData({
                side: Side.Buy,
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...limitOrders.map(o => o.makerAmount)).dividedToIntegerBy(2),
                fillSequence: limitOrders.map(() => OrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                    takerTokenBalance: totalTakerTokens,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can fully buy to a single RFQ order', async () => {
            const rfqOrders = [createRfqOrder()];
            const totalTakerTokens = BigNumber.sum(...rfqOrders.map(o => o.takerAmount));
            const data = createTransformData({
                side: Side.Buy,
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...rfqOrders.map(o => o.makerAmount)),
                fillSequence: rfqOrders.map(() => OrderType.Rfq),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({ takerTokenBalance: totalTakerTokens }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can partially buy to a single RFQ order', async () => {
            const rfqOrders = [createRfqOrder()];
            const totalTakerTokens = BigNumber.sum(...rfqOrders.map(o => o.takerAmount));
            const data = createTransformData({
                side: Side.Buy,
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(...rfqOrders.map(o => o.makerAmount)).dividedToIntegerBy(2),
                fillSequence: rfqOrders.map(() => OrderType.Rfq),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({ takerTokenBalance: totalTakerTokens }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            return assertFinalBalancesAsync(qfr);
        });

        it('can fully buy to one of each order type', async () => {
            const rfqOrders = [createRfqOrder()];
            const limitOrders = [createLimitOrder()];
            const bridgeOrders = [createBridgeOrder()];
            const totalTakerTokens = BigNumber.sum(
                ...rfqOrders.map(o => o.takerAmount),
                ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)),
                ...bridgeOrders.map(o => o.takerTokenAmount),
            );
            const data = createTransformData({
                side: Side.Buy,
                bridgeOrders,
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: BigNumber.sum(
                    ...rfqOrders.map(o => o.makerAmount),
                    ...limitOrders.map(o => o.makerAmount),
                    ...bridgeOrders.map(o => o.makerTokenAmount),
                ),
                fillSequence: _.shuffle([
                    ...bridgeOrders.map(() => OrderType.Bridge),
                    ...rfqOrders.map(() => OrderType.Rfq),
                    ...limitOrders.map(() => OrderType.Limit),
                ]),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee.times(limitOrders.length),
                    takerTokenBalance: totalTakerTokens,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            await assertFinalBalancesAsync(qfr);
        });

        it('can recover from a failed order', async () => {
            const rfqOrder = createRfqOrder();
            const limitOrder = createLimitOrder();
            const bridgeOrder = createBridgeOrder();
            const fillSequence = _.shuffle([OrderType.Bridge, OrderType.Rfq, OrderType.Limit]);
            const totalTakerTokens = BigNumber.sum(
                rfqOrder.takerAmount,
                limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount),
                bridgeOrder.takerTokenAmount,
            );
            // Fail the first order in the sequence.
            const failedOrderType = fillSequence[0];
            const data = createTransformData({
                fillSequence,
                side: Side.Buy,
                bridgeOrders: [
                    {
                        ...bridgeOrder,
                        bridgeData:
                            failedOrderType === OrderType.Bridge
                                ? encodeBridgeData(REVERT_AMOUNT)
                                : bridgeOrder.bridgeData,
                    },
                ],
                rfqOrders: [
                    {
                        order: rfqOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(
                            failedOrderType === OrderType.Rfq ? REVERT_AMOUNT : ZERO_AMOUNT,
                        ),
                    },
                ],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(
                            failedOrderType === OrderType.Limit ? REVERT_AMOUNT : ZERO_AMOUNT,
                        ),
                    },
                ],
                // Only require the last two orders to be filled.
                fillAmount: BigNumber.sum(rfqOrder.makerAmount, limitOrder.makerAmount, bridgeOrder.makerTokenAmount)
                    .minus(failedOrderType === OrderType.Bridge ? bridgeOrder.makerTokenAmount : 0)
                    .minus(failedOrderType === OrderType.Rfq ? rfqOrder.makerAmount : 0)
                    .minus(failedOrderType === OrderType.Limit ? limitOrder.makerAmount : 0),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee,
                    takerTokenBalance: totalTakerTokens,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            await assertFinalBalancesAsync(qfr);
        });

        it('can recover from a slipped order', async () => {
            const rfqOrder = createRfqOrder();
            const limitOrder = createLimitOrder();
            const bridgeOrder = createBridgeOrder();
            const fillSequence = _.shuffle([OrderType.Bridge, OrderType.Rfq, OrderType.Limit]);
            const totalTakerTokens = BigNumber.sum(
                rfqOrder.takerAmount,
                limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount),
                bridgeOrder.takerTokenAmount,
            );
            // Slip the first order in the sequence.
            const slippedOrderType = fillSequence[0];
            const data = createTransformData({
                fillSequence,
                side: Side.Buy,
                bridgeOrders: [
                    {
                        ...bridgeOrder,
                        // If slipped, produce half the tokens.
                        bridgeData:
                            slippedOrderType === OrderType.Bridge
                                ? encodeBridgeData(bridgeOrder.makerTokenAmount.dividedToIntegerBy(2))
                                : bridgeOrder.bridgeData,
                    },
                ],
                rfqOrders: [
                    {
                        order: rfqOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        // If slipped, set half the order to filled.
                        signature: createOrderSignature(
                            slippedOrderType === OrderType.Rfq
                                ? rfqOrder.takerAmount.div(2).integerValue(BigNumber.ROUND_DOWN)
                                : ZERO_AMOUNT,
                        ),
                    },
                ],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        // If slipped, set half the order to filled.
                        signature: createOrderSignature(
                            slippedOrderType === OrderType.Limit
                                ? limitOrder.takerAmount.div(2).integerValue(BigNumber.ROUND_DOWN)
                                : ZERO_AMOUNT,
                        ),
                    },
                ],
                // Only require half the first order to be filled.
                fillAmount: BigNumber.sum(rfqOrder.makerAmount, limitOrder.makerAmount, bridgeOrder.makerTokenAmount)
                    .minus(
                        slippedOrderType === OrderType.Bridge
                            ? bridgeOrder.makerTokenAmount.div(2).integerValue(BigNumber.ROUND_UP)
                            : 0,
                    )
                    .minus(
                        slippedOrderType === OrderType.Rfq
                            ? rfqOrder.makerAmount.div(2).integerValue(BigNumber.ROUND_UP)
                            : 0,
                    )
                    .minus(
                        slippedOrderType === OrderType.Limit
                            ? limitOrder.makerAmount.div(2).integerValue(BigNumber.ROUND_UP)
                            : 0,
                    ),
            });
            const qfr = getExpectedQuoteFillResults(
                data,
                createSimulationState({
                    ethBalance: singleProtocolFee,
                    takerTokenBalance: totalTakerTokens,
                }),
            );
            await executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            await assertFinalBalancesAsync(qfr);
        });
    });
});
