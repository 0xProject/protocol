"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const protocol_utils_1 = require("@0x/protocol-utils");
const utils_1 = require("@0x/utils");
const _ = require("lodash");
const artifacts_1 = require("../artifacts");
const test_fill_quote_transformer_bridge_1 = require("../generated-wrappers/test_fill_quote_transformer_bridge");
const orders_1 = require("../utils/orders");
const wrappers_1 = require("../wrappers");
const { NULL_ADDRESS, NULL_BYTES, MAX_UINT256, ZERO_AMOUNT } = contracts_test_utils_1.constants;
contracts_test_utils_1.blockchainTests.resets('FillQuoteTransformer', env => {
    let maker;
    let feeRecipient;
    let sender;
    let taker;
    let exchange;
    let bridge;
    let transformer;
    let host;
    let makerToken;
    let takerToken;
    let takerFeeToken;
    let singleProtocolFee;
    const GAS_PRICE = 1337;
    const TEST_BRIDGE_SOURCE = 12345678;
    const HIGH_BIT = new utils_1.BigNumber(2).pow(255);
    const REVERT_AMOUNT = new utils_1.BigNumber('0xdeadbeef');
    before(() => __awaiter(this, void 0, void 0, function* () {
        [maker, feeRecipient, sender, taker] = yield env.getAccountAddressesAsync();
        exchange = yield wrappers_1.TestFillQuoteTransformerExchangeContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestFillQuoteTransformerExchange, env.provider, env.txDefaults, artifacts_1.artifacts);
        const bridgeAdapter = yield wrappers_1.BridgeAdapterContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.BridgeAdapter, env.provider, env.txDefaults, artifacts_1.artifacts, NULL_ADDRESS);
        transformer = yield wrappers_1.FillQuoteTransformerContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.FillQuoteTransformer, env.provider, env.txDefaults, artifacts_1.artifacts, bridgeAdapter.address, exchange.address);
        host = yield wrappers_1.TestFillQuoteTransformerHostContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestFillQuoteTransformerHost, env.provider, Object.assign({}, env.txDefaults, { gasPrice: GAS_PRICE }), artifacts_1.artifacts);
        bridge = yield test_fill_quote_transformer_bridge_1.TestFillQuoteTransformerBridgeContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestFillQuoteTransformerBridge, env.provider, Object.assign({}, env.txDefaults, { from: sender }), artifacts_1.artifacts);
        [makerToken, takerToken, takerFeeToken] = yield Promise.all(_.times(3, () => __awaiter(this, void 0, void 0, function* () {
            return wrappers_1.TestMintableERC20TokenContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestMintableERC20Token, env.provider, env.txDefaults, artifacts_1.artifacts);
        })));
        singleProtocolFee = (yield exchange.getProtocolFeeMultiplier().callAsync()).times(GAS_PRICE);
    }));
    function createLimitOrder(fields = {}) {
        return orders_1.getRandomLimitOrder(Object.assign({ maker,
            feeRecipient, makerToken: makerToken.address, takerToken: takerToken.address, makerAmount: contracts_test_utils_1.getRandomInteger('0.1e18', '1e18'), takerAmount: contracts_test_utils_1.getRandomInteger('0.1e18', '1e18'), takerTokenFeeAmount: contracts_test_utils_1.getRandomInteger('0.1e18', '1e18') }, fields));
    }
    function createRfqOrder(fields = {}) {
        return orders_1.getRandomRfqOrder(Object.assign({ maker, makerToken: makerToken.address, takerToken: takerToken.address, makerAmount: contracts_test_utils_1.getRandomInteger('0.1e18', '1e18'), takerAmount: contracts_test_utils_1.getRandomInteger('0.1e18', '1e18') }, fields));
    }
    function createBridgeOrder(fillRatio = 1.0) {
        const makerTokenAmount = contracts_test_utils_1.getRandomInteger('0.1e18', '1e18');
        return {
            makerTokenAmount,
            source: TEST_BRIDGE_SOURCE,
            takerTokenAmount: contracts_test_utils_1.getRandomInteger('0.1e18', '1e18'),
            bridgeData: encodeBridgeData(makerTokenAmount.times(fillRatio).integerValue()),
        };
    }
    function createOrderSignature(preFilledTakerAmount = 0) {
        return {
            // The r field of the signature is the pre-filled amount.
            r: utils_1.hexUtils.leftPad(preFilledTakerAmount),
            s: NULL_BYTES,
            v: 0,
            signatureType: 0,
        };
    }
    function orderSignatureToPreFilledTakerAmount(signature) {
        return new utils_1.BigNumber(signature.r);
    }
    function encodeBridgeData(boughtAmount) {
        // abi.encode(bridgeAddress, bridgeData)
        return utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(bridge.address), utils_1.hexUtils.leftPad(32), utils_1.hexUtils.leftPad(boughtAmount));
    }
    function getExpectedQuoteFillResults(data, state = createSimulationState()) {
        const EMPTY_FILL_ORDER_RESULTS = {
            takerTokenSoldAmount: ZERO_AMOUNT,
            makerTokenBoughtAmount: ZERO_AMOUNT,
            protocolFeePaid: ZERO_AMOUNT,
        };
        let takerTokenBalanceRemaining = state.takerTokenBalance;
        if (data.side === protocol_utils_1.FillQuoteTransformerSide.Sell && !data.fillAmount.eq(MAX_UINT256)) {
            takerTokenBalanceRemaining = data.fillAmount;
        }
        let ethBalanceRemaining = state.ethBalance;
        let soldAmount = ZERO_AMOUNT;
        let boughtAmount = ZERO_AMOUNT;
        const fillAmount = normalizeFillAmount(data.fillAmount, state.takerTokenBalance);
        const orderIndices = [0, 0, 0];
        function computeTakerTokenFillAmount(orderTakerTokenAmount, orderMakerTokenAmount, orderTakerTokenFeeAmount = ZERO_AMOUNT) {
            let takerTokenFillAmount = ZERO_AMOUNT;
            if (data.side === protocol_utils_1.FillQuoteTransformerSide.Sell) {
                takerTokenFillAmount = fillAmount.minus(soldAmount);
                if (orderTakerTokenFeeAmount.gt(0)) {
                    takerTokenFillAmount = takerTokenFillAmount
                        .times(orderTakerTokenAmount)
                        .div(orderTakerTokenAmount.plus(orderTakerTokenFeeAmount))
                        .integerValue(utils_1.BigNumber.ROUND_UP);
                }
            }
            else {
                // Buy
                takerTokenFillAmount = fillAmount
                    .minus(boughtAmount)
                    .times(orderTakerTokenAmount)
                    .div(orderMakerTokenAmount)
                    .integerValue(utils_1.BigNumber.ROUND_UP);
            }
            return utils_1.BigNumber.min(takerTokenFillAmount, orderTakerTokenAmount, takerTokenBalanceRemaining);
        }
        function fillBridgeOrder(order) {
            const bridgeBoughtAmount = decodeBridgeData(order.bridgeData).boughtAmount;
            if (bridgeBoughtAmount.eq(REVERT_AMOUNT)) {
                return EMPTY_FILL_ORDER_RESULTS;
            }
            return Object.assign({}, EMPTY_FILL_ORDER_RESULTS, { takerTokenSoldAmount: computeTakerTokenFillAmount(order.takerTokenAmount, order.makerTokenAmount), makerTokenBoughtAmount: bridgeBoughtAmount });
        }
        function fillLimitOrder(oi) {
            const preFilledTakerAmount = orderSignatureToPreFilledTakerAmount(oi.signature);
            if (preFilledTakerAmount.gte(oi.order.takerAmount) || preFilledTakerAmount.eq(REVERT_AMOUNT)) {
                return EMPTY_FILL_ORDER_RESULTS;
            }
            if (ethBalanceRemaining.lt(singleProtocolFee)) {
                return EMPTY_FILL_ORDER_RESULTS;
            }
            const takerTokenFillAmount = utils_1.BigNumber.min(computeTakerTokenFillAmount(oi.order.takerAmount, oi.order.makerAmount, oi.order.takerTokenFeeAmount), oi.order.takerAmount.minus(preFilledTakerAmount), oi.maxTakerTokenFillAmount);
            const fillRatio = takerTokenFillAmount.div(oi.order.takerAmount);
            return Object.assign({}, EMPTY_FILL_ORDER_RESULTS, { takerTokenSoldAmount: takerTokenFillAmount.plus(fillRatio.times(oi.order.takerTokenFeeAmount).integerValue(utils_1.BigNumber.ROUND_DOWN)), makerTokenBoughtAmount: fillRatio.times(oi.order.makerAmount).integerValue(utils_1.BigNumber.ROUND_DOWN), protocolFeePaid: singleProtocolFee });
        }
        function fillRfqOrder(oi) {
            const preFilledTakerAmount = orderSignatureToPreFilledTakerAmount(oi.signature);
            if (preFilledTakerAmount.gte(oi.order.takerAmount) || preFilledTakerAmount.eq(REVERT_AMOUNT)) {
                return EMPTY_FILL_ORDER_RESULTS;
            }
            const takerTokenFillAmount = utils_1.BigNumber.min(computeTakerTokenFillAmount(oi.order.takerAmount, oi.order.makerAmount), oi.order.takerAmount.minus(preFilledTakerAmount), oi.maxTakerTokenFillAmount);
            const fillRatio = takerTokenFillAmount.div(oi.order.takerAmount);
            return Object.assign({}, EMPTY_FILL_ORDER_RESULTS, { takerTokenSoldAmount: takerTokenFillAmount, makerTokenBoughtAmount: fillRatio.times(oi.order.makerAmount).integerValue(utils_1.BigNumber.ROUND_DOWN) });
        }
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < data.fillSequence.length; ++i) {
            const orderType = data.fillSequence[i];
            if (data.side === protocol_utils_1.FillQuoteTransformerSide.Sell) {
                if (soldAmount.gte(fillAmount)) {
                    break;
                }
            }
            else {
                if (boughtAmount.gte(fillAmount)) {
                    break;
                }
            }
            let results = EMPTY_FILL_ORDER_RESULTS;
            switch (orderType) {
                case protocol_utils_1.FillQuoteTransformerOrderType.Bridge:
                    {
                        results = fillBridgeOrder(data.bridgeOrders[orderIndices[orderType]]);
                    }
                    break;
                case protocol_utils_1.FillQuoteTransformerOrderType.Limit:
                    {
                        results = fillLimitOrder(data.limitOrders[orderIndices[orderType]]);
                    }
                    break;
                case protocol_utils_1.FillQuoteTransformerOrderType.Rfq:
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
    const ZERO_BALANCES = {
        makerTokenBalance: ZERO_AMOUNT,
        takerTokensBalance: ZERO_AMOUNT,
        takerFeeBalance: ZERO_AMOUNT,
        ethBalance: ZERO_AMOUNT,
    };
    function getBalancesAsync(owner) {
        return __awaiter(this, void 0, void 0, function* () {
            const balances = Object.assign({}, ZERO_BALANCES);
            [
                balances.makerTokenBalance,
                balances.takerTokensBalance,
                balances.takerFeeBalance,
                balances.ethBalance,
            ] = yield Promise.all([
                makerToken.balanceOf(owner).callAsync(),
                takerToken.balanceOf(owner).callAsync(),
                takerFeeToken.balanceOf(owner).callAsync(),
                env.web3Wrapper.getBalanceInWeiAsync(owner),
            ]);
            return balances;
        });
    }
    function assertBalances(actual, expected) {
        contracts_test_utils_1.assertIntegerRoughlyEquals(actual.makerTokenBalance, expected.makerTokenBalance, 10, 'makerTokenBalance');
        contracts_test_utils_1.assertIntegerRoughlyEquals(actual.takerTokensBalance, expected.takerTokensBalance, 10, 'takerTokensBalance');
        contracts_test_utils_1.assertIntegerRoughlyEquals(actual.takerFeeBalance, expected.takerFeeBalance, 10, 'takerFeeBalance');
        contracts_test_utils_1.assertIntegerRoughlyEquals(actual.ethBalance, expected.ethBalance, 10, 'ethBalance');
    }
    function assertCurrentBalancesAsync(owner, expected) {
        return __awaiter(this, void 0, void 0, function* () {
            assertBalances(yield getBalancesAsync(owner), expected);
        });
    }
    function encodeFractionalFillAmount(frac) {
        return HIGH_BIT.plus(new utils_1.BigNumber(frac).times('1e18').integerValue());
    }
    function normalizeFillAmount(raw, balance) {
        if (raw.gte(HIGH_BIT)) {
            return raw
                .minus(HIGH_BIT)
                .div('1e18')
                .times(balance)
                .integerValue(utils_1.BigNumber.ROUND_DOWN);
        }
        return raw;
    }
    function decodeBridgeData(encoded) {
        return {
            bridge: utils_1.hexUtils.slice(encoded, 0, 32),
            boughtAmount: new utils_1.BigNumber(utils_1.hexUtils.slice(encoded, 64)),
        };
    }
    function createTransformData(fields = {}) {
        return Object.assign({ side: protocol_utils_1.FillQuoteTransformerSide.Sell, sellToken: takerToken.address, buyToken: makerToken.address, bridgeOrders: [], limitOrders: [], rfqOrders: [], fillSequence: [], fillAmount: MAX_UINT256, refundReceiver: NULL_ADDRESS }, fields);
    }
    function createSimulationState(fields = {}) {
        return Object.assign({ ethBalance: ZERO_AMOUNT, takerTokenBalance: ZERO_AMOUNT }, fields);
    }
    function executeTransformAsync(params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = params.data || createTransformData(params.data);
            const _params = Object.assign({ takerTokenBalance: data.fillAmount, sender,
                taker,
                data }, params);
            return host
                .executeTransform(transformer.address, takerToken.address, _params.takerTokenBalance, _params.sender, _params.taker, protocol_utils_1.encodeFillQuoteTransformerData(_params.data))
                .awaitTransactionSuccessAsync({ value: _params.ethBalance });
        });
    }
    function assertFinalBalancesAsync(qfr) {
        return __awaiter(this, void 0, void 0, function* () {
            yield assertCurrentBalancesAsync(host.address, Object.assign({}, ZERO_BALANCES, { makerTokenBalance: qfr.makerTokensBought }));
            yield assertCurrentBalancesAsync(exchange.address, Object.assign({}, ZERO_BALANCES, { ethBalance: qfr.protocolFeePaid }));
        });
    }
    describe('sell quotes', () => {
        it('can fully sell to a single bridge order with -1 fillAmount', () => __awaiter(this, void 0, void 0, function* () {
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                fillAmount: utils_1.BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount)),
                fillSequence: bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
            });
            const qfr = getExpectedQuoteFillResults(data);
            yield executeTransformAsync({
                takerTokenBalance: data.fillAmount,
                data: Object.assign({}, data, { fillAmount: MAX_UINT256 }),
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can partially sell to a single bridge order with a fractional fillAmount', () => __awaiter(this, void 0, void 0, function* () {
            const bridgeOrders = [createBridgeOrder()];
            const totalTakerBalance = utils_1.BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount));
            const data = createTransformData({
                bridgeOrders,
                fillAmount: encodeFractionalFillAmount(0.5),
                fillSequence: bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({ takerTokenBalance: totalTakerBalance }));
            yield executeTransformAsync({
                takerTokenBalance: totalTakerBalance,
                data,
            });
            yield assertCurrentBalancesAsync(host.address, Object.assign({}, ZERO_BALANCES, { takerTokensBalance: totalTakerBalance.minus(qfr.takerTokensSpent), makerTokenBalance: qfr.makerTokensBought }));
        }));
        it('fails if incomplete sell', () => __awaiter(this, void 0, void 0, function* () {
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                fillAmount: utils_1.BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount)),
                fillSequence: bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
            });
            const tx = executeTransformAsync({
                takerTokenBalance: data.fillAmount,
                data: Object.assign({}, data, { fillAmount: data.fillAmount.plus(1) }),
            });
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.ZeroExRevertErrors.TransformERC20.IncompleteFillSellQuoteError(data.sellToken, data.fillAmount, data.fillAmount.plus(1)));
        }));
        it('can fully sell to a single bridge order', () => __awaiter(this, void 0, void 0, function* () {
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                fillAmount: utils_1.BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount)),
                fillSequence: bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
            });
            const qfr = getExpectedQuoteFillResults(data);
            yield executeTransformAsync({
                takerTokenBalance: data.fillAmount,
                data,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can fully sell to a single limit order', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrders = [createLimitOrder()];
            const data = createTransformData({
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount))),
                fillSequence: limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can partial sell to a single limit order', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrders = [createLimitOrder()];
            const data = createTransformData({
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount))).dividedToIntegerBy(2),
                fillSequence: limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can fully sell to a single limit order without fees', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrders = [createLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT })];
            const data = createTransformData({
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount))),
                fillSequence: limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can partial sell to a single limit order without fees', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrders = [createLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT })];
            const data = createTransformData({
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount))).dividedToIntegerBy(2),
                fillSequence: limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can fully sell to a single RFQ order', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrders = [createRfqOrder()];
            const data = createTransformData({
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...rfqOrders.map(o => o.takerAmount)),
                fillSequence: rfqOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Rfq),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState());
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can partially sell to a single RFQ order', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrders = [createRfqOrder()];
            const data = createTransformData({
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...rfqOrders.map(o => o.takerAmount)).dividedToIntegerBy(2),
                fillSequence: rfqOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Rfq),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState());
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can fully sell to one of each order type', () => __awaiter(this, void 0, void 0, function* () {
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
                fillAmount: utils_1.BigNumber.sum(...rfqOrders.map(o => o.takerAmount), ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)), ...bridgeOrders.map(o => o.takerTokenAmount)),
                fillSequence: _.shuffle([
                    ...bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
                    ...rfqOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Rfq),
                    ...limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
                ]),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
        it('can partially sell to one of each order type', () => __awaiter(this, void 0, void 0, function* () {
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
                fillAmount: utils_1.BigNumber.sum(...rfqOrders.map(o => o.takerAmount), ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)), ...bridgeOrders.map(o => o.takerTokenAmount)).dividedToIntegerBy(2),
                fillSequence: _.shuffle([
                    ...bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
                    ...rfqOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Rfq),
                    ...limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
                ]),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
        it('can fully sell to multiple of each order type', () => __awaiter(this, void 0, void 0, function* () {
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
                fillAmount: utils_1.BigNumber.sum(...rfqOrders.map(o => o.takerAmount), ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)), ...bridgeOrders.map(o => o.takerTokenAmount)),
                fillSequence: _.shuffle([
                    ...bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
                    ...rfqOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Rfq),
                    ...limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
                ]),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
        it('can recover from a failed order', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrder = createRfqOrder();
            const limitOrder = createLimitOrder();
            const bridgeOrder = createBridgeOrder();
            const fillSequence = _.shuffle([protocol_utils_1.FillQuoteTransformerOrderType.Bridge, protocol_utils_1.FillQuoteTransformerOrderType.Rfq, protocol_utils_1.FillQuoteTransformerOrderType.Limit]);
            // Fail the first order in the sequence.
            const failedOrderType = fillSequence[0];
            const data = createTransformData({
                fillSequence,
                bridgeOrders: [
                    Object.assign({}, bridgeOrder, { bridgeData: failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Bridge
                            ? encodeBridgeData(REVERT_AMOUNT)
                            : bridgeOrder.bridgeData }),
                ],
                rfqOrders: [
                    {
                        order: rfqOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Rfq ? REVERT_AMOUNT : ZERO_AMOUNT),
                    },
                ],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Limit ? REVERT_AMOUNT : ZERO_AMOUNT),
                    },
                ],
                // Only require the last two orders to be filled.
                fillAmount: utils_1.BigNumber.sum(rfqOrder.takerAmount, limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount), bridgeOrder.takerTokenAmount)
                    .minus(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Bridge ? bridgeOrder.takerTokenAmount : 0)
                    .minus(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Rfq ? rfqOrder.takerAmount : 0)
                    .minus(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Limit
                    ? limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount)
                    : 0),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
        it('can recover from a slipped order', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrder = createRfqOrder();
            const limitOrder = createLimitOrder();
            const bridgeOrder = createBridgeOrder();
            const fillSequence = _.shuffle([protocol_utils_1.FillQuoteTransformerOrderType.Bridge, protocol_utils_1.FillQuoteTransformerOrderType.Rfq, protocol_utils_1.FillQuoteTransformerOrderType.Limit]);
            // Slip the first order in the sequence.
            const slippedOrderType = fillSequence[0];
            const data = createTransformData({
                fillSequence,
                bridgeOrders: [
                    Object.assign({}, bridgeOrder, { 
                        // If slipped, produce half the tokens.
                        bridgeData: slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Bridge
                            ? encodeBridgeData(bridgeOrder.makerTokenAmount.dividedToIntegerBy(2))
                            : bridgeOrder.bridgeData }),
                ],
                rfqOrders: [
                    {
                        order: rfqOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        // If slipped, set half the order to filled.
                        signature: createOrderSignature(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Rfq
                            ? rfqOrder.takerAmount.div(2).integerValue(utils_1.BigNumber.ROUND_DOWN)
                            : ZERO_AMOUNT),
                    },
                ],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        // If slipped, set half the order to filled.
                        signature: createOrderSignature(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Limit
                            ? limitOrder.takerAmount.div(2).integerValue(utils_1.BigNumber.ROUND_DOWN)
                            : ZERO_AMOUNT),
                    },
                ],
                // Only require half the first order to be filled.
                fillAmount: utils_1.BigNumber.sum(rfqOrder.takerAmount, limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount), bridgeOrder.takerTokenAmount)
                    .minus(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Bridge
                    ? bridgeOrder.takerTokenAmount.div(2).integerValue(utils_1.BigNumber.ROUND_UP)
                    : 0)
                    .minus(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Rfq
                    ? rfqOrder.takerAmount.div(2).integerValue(utils_1.BigNumber.ROUND_UP)
                    : 0)
                    .minus(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Limit
                    ? limitOrder.takerAmount
                        .plus(limitOrder.takerTokenFeeAmount)
                        .div(2)
                        .integerValue(utils_1.BigNumber.ROUND_UP)
                    : 0),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
        it('skips limit orders when not enough protocol fee balance', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrder = createLimitOrder();
            const bridgeOrder = {
                source: TEST_BRIDGE_SOURCE,
                makerTokenAmount: limitOrder.makerAmount,
                takerTokenAmount: limitOrder.takerAmount,
                bridgeData: encodeBridgeData(limitOrder.makerAmount),
            };
            const fillSequence = [protocol_utils_1.FillQuoteTransformerOrderType.Limit, protocol_utils_1.FillQuoteTransformerOrderType.Bridge];
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
            contracts_test_utils_1.expect(qfr.takerTokensSpent).to.bignumber.eq(bridgeOrder.takerTokenAmount);
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
    });
    describe('buy quotes', () => {
        it('fails if incomplete buy', () => __awaiter(this, void 0, void 0, function* () {
            const bridgeOrders = [createBridgeOrder()];
            const data = createTransformData({
                bridgeOrders,
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                fillAmount: utils_1.BigNumber.sum(...bridgeOrders.map(o => o.makerTokenAmount)),
                fillSequence: bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
            });
            const tx = executeTransformAsync({
                takerTokenBalance: utils_1.BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount)),
                data: Object.assign({}, data, { fillAmount: data.fillAmount.plus(1) }),
            });
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.ZeroExRevertErrors.TransformERC20.IncompleteFillBuyQuoteError(data.buyToken, data.fillAmount, data.fillAmount.plus(1)));
        }));
        it('can fully buy to a single bridge order', () => __awaiter(this, void 0, void 0, function* () {
            const bridgeOrders = [createBridgeOrder()];
            const totalTakerTokens = utils_1.BigNumber.sum(...bridgeOrders.map(o => o.takerTokenAmount));
            const data = createTransformData({
                bridgeOrders,
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                fillAmount: utils_1.BigNumber.sum(...bridgeOrders.map(o => o.makerTokenAmount)),
                fillSequence: bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({ takerTokenBalance: totalTakerTokens }));
            yield executeTransformAsync({
                takerTokenBalance: totalTakerTokens,
                data,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can fully buy to a single limit order', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrders = [createLimitOrder()];
            const totalTakerTokens = utils_1.BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)));
            const data = createTransformData({
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...limitOrders.map(o => o.makerAmount)),
                fillSequence: limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
                takerTokenBalance: totalTakerTokens,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: totalTakerTokens,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can partial buy to a single limit order', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrders = [createLimitOrder()];
            const totalTakerTokens = utils_1.BigNumber.sum(...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)));
            const data = createTransformData({
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...limitOrders.map(o => o.makerAmount)).dividedToIntegerBy(2),
                fillSequence: limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
                takerTokenBalance: totalTakerTokens,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can fully buy to a single limit order without fees', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrders = [createLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT })];
            const totalTakerTokens = utils_1.BigNumber.sum(...limitOrders.map(o => o.takerAmount));
            const data = createTransformData({
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...limitOrders.map(o => o.makerAmount)),
                fillSequence: limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
                takerTokenBalance: totalTakerTokens,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can partial buy to a single limit order without fees', () => __awaiter(this, void 0, void 0, function* () {
            const limitOrders = [createLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT })];
            const totalTakerTokens = utils_1.BigNumber.sum(...limitOrders.map(o => o.takerAmount));
            const data = createTransformData({
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                limitOrders: limitOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...limitOrders.map(o => o.makerAmount)).dividedToIntegerBy(2),
                fillSequence: limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
                takerTokenBalance: totalTakerTokens,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can fully buy to a single RFQ order', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrders = [createRfqOrder()];
            const totalTakerTokens = utils_1.BigNumber.sum(...rfqOrders.map(o => o.takerAmount));
            const data = createTransformData({
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...rfqOrders.map(o => o.makerAmount)),
                fillSequence: rfqOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Rfq),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({ takerTokenBalance: totalTakerTokens }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can partially buy to a single RFQ order', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrders = [createRfqOrder()];
            const totalTakerTokens = utils_1.BigNumber.sum(...rfqOrders.map(o => o.takerAmount));
            const data = createTransformData({
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                rfqOrders: rfqOrders.map(o => ({
                    order: o,
                    maxTakerTokenFillAmount: MAX_UINT256,
                    signature: createOrderSignature(),
                })),
                fillAmount: utils_1.BigNumber.sum(...rfqOrders.map(o => o.makerAmount)).dividedToIntegerBy(2),
                fillSequence: rfqOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Rfq),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({ takerTokenBalance: totalTakerTokens }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
            });
            return assertFinalBalancesAsync(qfr);
        }));
        it('can fully buy to one of each order type', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrders = [createRfqOrder()];
            const limitOrders = [createLimitOrder()];
            const bridgeOrders = [createBridgeOrder()];
            const totalTakerTokens = utils_1.BigNumber.sum(...rfqOrders.map(o => o.takerAmount), ...limitOrders.map(o => o.takerAmount.plus(o.takerTokenFeeAmount)), ...bridgeOrders.map(o => o.takerTokenAmount));
            const data = createTransformData({
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
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
                fillAmount: utils_1.BigNumber.sum(...rfqOrders.map(o => o.makerAmount), ...limitOrders.map(o => o.makerAmount), ...bridgeOrders.map(o => o.makerTokenAmount)),
                fillSequence: _.shuffle([
                    ...bridgeOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Bridge),
                    ...rfqOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Rfq),
                    ...limitOrders.map(() => protocol_utils_1.FillQuoteTransformerOrderType.Limit),
                ]),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee.times(limitOrders.length),
                takerTokenBalance: totalTakerTokens,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
        it('can recover from a failed order', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrder = createRfqOrder();
            const limitOrder = createLimitOrder();
            const bridgeOrder = createBridgeOrder();
            const fillSequence = _.shuffle([protocol_utils_1.FillQuoteTransformerOrderType.Bridge, protocol_utils_1.FillQuoteTransformerOrderType.Rfq, protocol_utils_1.FillQuoteTransformerOrderType.Limit]);
            const totalTakerTokens = utils_1.BigNumber.sum(rfqOrder.takerAmount, limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount), bridgeOrder.takerTokenAmount);
            // Fail the first order in the sequence.
            const failedOrderType = fillSequence[0];
            const data = createTransformData({
                fillSequence,
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                bridgeOrders: [
                    Object.assign({}, bridgeOrder, { bridgeData: failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Bridge
                            ? encodeBridgeData(REVERT_AMOUNT)
                            : bridgeOrder.bridgeData }),
                ],
                rfqOrders: [
                    {
                        order: rfqOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Rfq ? REVERT_AMOUNT : ZERO_AMOUNT),
                    },
                ],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        signature: createOrderSignature(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Limit ? REVERT_AMOUNT : ZERO_AMOUNT),
                    },
                ],
                // Only require the last two orders to be filled.
                fillAmount: utils_1.BigNumber.sum(rfqOrder.makerAmount, limitOrder.makerAmount, bridgeOrder.makerTokenAmount)
                    .minus(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Bridge ? bridgeOrder.makerTokenAmount : 0)
                    .minus(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Rfq ? rfqOrder.makerAmount : 0)
                    .minus(failedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Limit ? limitOrder.makerAmount : 0),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee,
                takerTokenBalance: totalTakerTokens,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
        it('can recover from a slipped order', () => __awaiter(this, void 0, void 0, function* () {
            const rfqOrder = createRfqOrder();
            const limitOrder = createLimitOrder();
            const bridgeOrder = createBridgeOrder();
            const fillSequence = _.shuffle([protocol_utils_1.FillQuoteTransformerOrderType.Bridge, protocol_utils_1.FillQuoteTransformerOrderType.Rfq, protocol_utils_1.FillQuoteTransformerOrderType.Limit]);
            const totalTakerTokens = utils_1.BigNumber.sum(rfqOrder.takerAmount, limitOrder.takerAmount.plus(limitOrder.takerTokenFeeAmount), bridgeOrder.takerTokenAmount);
            // Slip the first order in the sequence.
            const slippedOrderType = fillSequence[0];
            const data = createTransformData({
                fillSequence,
                side: protocol_utils_1.FillQuoteTransformerSide.Buy,
                bridgeOrders: [
                    Object.assign({}, bridgeOrder, { 
                        // If slipped, produce half the tokens.
                        bridgeData: slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Bridge
                            ? encodeBridgeData(bridgeOrder.makerTokenAmount.dividedToIntegerBy(2))
                            : bridgeOrder.bridgeData }),
                ],
                rfqOrders: [
                    {
                        order: rfqOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        // If slipped, set half the order to filled.
                        signature: createOrderSignature(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Rfq
                            ? rfqOrder.takerAmount.div(2).integerValue(utils_1.BigNumber.ROUND_DOWN)
                            : ZERO_AMOUNT),
                    },
                ],
                limitOrders: [
                    {
                        order: limitOrder,
                        maxTakerTokenFillAmount: MAX_UINT256,
                        // If slipped, set half the order to filled.
                        signature: createOrderSignature(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Limit
                            ? limitOrder.takerAmount.div(2).integerValue(utils_1.BigNumber.ROUND_DOWN)
                            : ZERO_AMOUNT),
                    },
                ],
                // Only require half the first order to be filled.
                fillAmount: utils_1.BigNumber.sum(rfqOrder.makerAmount, limitOrder.makerAmount, bridgeOrder.makerTokenAmount)
                    .minus(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Bridge
                    ? bridgeOrder.makerTokenAmount.div(2).integerValue(utils_1.BigNumber.ROUND_UP)
                    : 0)
                    .minus(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Rfq
                    ? rfqOrder.makerAmount.div(2).integerValue(utils_1.BigNumber.ROUND_UP)
                    : 0)
                    .minus(slippedOrderType === protocol_utils_1.FillQuoteTransformerOrderType.Limit
                    ? limitOrder.makerAmount.div(2).integerValue(utils_1.BigNumber.ROUND_UP)
                    : 0),
            });
            const qfr = getExpectedQuoteFillResults(data, createSimulationState({
                ethBalance: singleProtocolFee,
                takerTokenBalance: totalTakerTokens,
            }));
            yield executeTransformAsync({
                data,
                takerTokenBalance: qfr.takerTokensSpent,
                ethBalance: qfr.protocolFeePaid,
            });
            yield assertFinalBalancesAsync(qfr);
        }));
    });
});
//# sourceMappingURL=fill_quote_transformer_test.js.map