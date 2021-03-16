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
const _ = require("lodash");
const wrappers_1 = require("../../src/wrappers");
const artifacts_1 = require("../artifacts");
const abis_1 = require("../utils/abis");
const orders_1 = require("../utils/orders");
contracts_test_utils_1.blockchainTests.resets('BatchFillNativeOrdersFeature', env => {
    const { NULL_ADDRESS, ZERO_AMOUNT } = contracts_test_utils_1.constants;
    let maker;
    let taker;
    let zeroEx;
    let feature;
    let verifyingContract;
    let makerToken;
    let takerToken;
    let testUtils;
    before(() => __awaiter(this, void 0, void 0, function* () {
        testUtils = yield orders_1.NativeOrdersTestEnvironment.createAsync(env);
        maker = testUtils.maker;
        taker = testUtils.taker;
        zeroEx = testUtils.zeroEx;
        makerToken = testUtils.makerToken;
        takerToken = testUtils.takerToken;
        verifyingContract = zeroEx.address;
        const featureImpl = yield wrappers_1.BatchFillNativeOrdersFeatureContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.BatchFillNativeOrdersFeature, env.provider, env.txDefaults, artifacts_1.artifacts, zeroEx.address);
        const [owner] = yield env.getAccountAddressesAsync();
        yield zeroEx
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();
        feature = new wrappers_1.BatchFillNativeOrdersFeatureContract(zeroEx.address, env.provider, Object.assign({}, env.txDefaults, { gasPrice: testUtils.gasPrice }), abis_1.abis);
    }));
    function getTestLimitOrder(fields = {}) {
        return orders_1.getRandomLimitOrder(Object.assign({ maker,
            verifyingContract, chainId: 1337, takerToken: takerToken.address, makerToken: makerToken.address, taker: NULL_ADDRESS, sender: NULL_ADDRESS }, fields));
    }
    function getTestRfqOrder(fields = {}) {
        return orders_1.getRandomRfqOrder(Object.assign({ maker,
            verifyingContract, chainId: 1337, takerToken: takerToken.address, makerToken: makerToken.address, txOrigin: taker }, fields));
    }
    contracts_test_utils_1.describe('batchFillLimitOrders', () => {
        function assertExpectedFinalBalancesAsync(orders, takerTokenFillAmounts = orders.map(order => order.takerAmount), takerTokenAlreadyFilledAmounts = orders.map(() => ZERO_AMOUNT), receipt) {
            return __awaiter(this, void 0, void 0, function* () {
                const expectedFeeRecipientBalances = {};
                const { makerTokenFilledAmount, takerTokenFilledAmount } = orders
                    .map((order, i) => orders_1.computeLimitOrderFilledAmounts(order, takerTokenFillAmounts[i], takerTokenAlreadyFilledAmounts[i]))
                    .reduce((previous, current, i) => {
                    _.update(expectedFeeRecipientBalances, orders[i].feeRecipient, balance => (balance || ZERO_AMOUNT).plus(current.takerTokenFeeFilledAmount));
                    return {
                        makerTokenFilledAmount: previous.makerTokenFilledAmount.plus(current.makerTokenFilledAmount),
                        takerTokenFilledAmount: previous.takerTokenFilledAmount.plus(current.takerTokenFilledAmount),
                    };
                }, { makerTokenFilledAmount: ZERO_AMOUNT, takerTokenFilledAmount: ZERO_AMOUNT });
                const makerBalance = yield takerToken.balanceOf(maker).callAsync();
                const takerBalance = yield makerToken.balanceOf(taker).callAsync();
                contracts_test_utils_1.expect(makerBalance, 'maker token balance').to.bignumber.eq(takerTokenFilledAmount);
                contracts_test_utils_1.expect(takerBalance, 'taker token balance').to.bignumber.eq(makerTokenFilledAmount);
                for (const [feeRecipient, expectedFeeRecipientBalance] of Object.entries(expectedFeeRecipientBalances)) {
                    const feeRecipientBalance = yield takerToken.balanceOf(feeRecipient).callAsync();
                    contracts_test_utils_1.expect(feeRecipientBalance, `fee recipient balance`).to.bignumber.eq(expectedFeeRecipientBalance);
                }
                if (receipt) {
                    const balanceOfTakerNow = yield env.web3Wrapper.getBalanceInWeiAsync(taker);
                    const balanceOfTakerBefore = yield env.web3Wrapper.getBalanceInWeiAsync(taker, receipt.blockNumber - 1);
                    const protocolFees = testUtils.protocolFee.times(orders.length);
                    const totalCost = testUtils.gasPrice.times(receipt.gasUsed).plus(protocolFees);
                    contracts_test_utils_1.expect(balanceOfTakerBefore.minus(totalCost), 'taker ETH balance').to.bignumber.eq(balanceOfTakerNow);
                }
            });
        }
        it('Fully fills multiple orders', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = yield feature
                .batchFillLimitOrders(orders, signatures, orders.map(order => order.takerAmount), false)
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = yield zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: orders[i].getHash(),
                takerTokenFilledAmount: orders[i].takerAmount,
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, orders.map(order => testUtils.createLimitOrderFilledEventArgs(order)), wrappers_1.IZeroExEvents.LimitOrderFilled);
            return assertExpectedFinalBalancesAsync(orders);
        }));
        it('Partially fills multiple orders', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(getTestLimitOrder);
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const fillAmounts = orders.map(order => contracts_test_utils_1.getRandomPortion(order.takerAmount));
            const tx = yield feature
                .batchFillLimitOrders(orders, signatures, fillAmounts, false)
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = yield zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Fillable,
                orderHash: orders[i].getHash(),
                takerTokenFilledAmount: fillAmounts[i],
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, orders.map((order, i) => testUtils.createLimitOrderFilledEventArgs(order, fillAmounts[i])), wrappers_1.IZeroExEvents.LimitOrderFilled);
            return assertExpectedFinalBalancesAsync(orders, fillAmounts);
        }));
        it('Fills multiple orders and refunds excess ETH', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length).plus(420);
            const tx = yield feature
                .batchFillLimitOrders(orders, signatures, orders.map(order => order.takerAmount), false)
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = yield zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: orders[i].getHash(),
                takerTokenFilledAmount: orders[i].takerAmount,
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, orders.map(order => testUtils.createLimitOrderFilledEventArgs(order)), wrappers_1.IZeroExEvents.LimitOrderFilled);
            return assertExpectedFinalBalancesAsync(orders);
        }));
        it('Skips over unfillable orders and refunds excess ETH', () => __awaiter(this, void 0, void 0, function* () {
            const fillableOrders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const expiredOrder = getTestLimitOrder({ expiry: orders_1.createExpiry(-1), takerTokenFeeAmount: ZERO_AMOUNT });
            const orders = [expiredOrder, ...fillableOrders];
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = yield feature
                .batchFillLimitOrders(orders, signatures, orders.map(order => order.takerAmount), false)
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = yield zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            const [expiredOrderInfo, ...filledOrderInfos] = orderInfos;
            orders_1.assertOrderInfoEquals(expiredOrderInfo, {
                status: protocol_utils_1.OrderStatus.Expired,
                orderHash: expiredOrder.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            filledOrderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: fillableOrders[i].getHash(),
                takerTokenFilledAmount: fillableOrders[i].takerAmount,
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, fillableOrders.map(order => testUtils.createLimitOrderFilledEventArgs(order)), wrappers_1.IZeroExEvents.LimitOrderFilled);
            return assertExpectedFinalBalancesAsync(fillableOrders);
        }));
        it('Fills multiple orders with revertIfIncomplete=true', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = yield feature
                .batchFillLimitOrders(orders, signatures, orders.map(order => order.takerAmount), true)
                .awaitTransactionSuccessAsync({ from: taker, value });
            const [orderInfos] = yield zeroEx.batchGetLimitOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: orders[i].getHash(),
                takerTokenFilledAmount: orders[i].takerAmount,
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, orders.map(order => testUtils.createLimitOrderFilledEventArgs(order)), wrappers_1.IZeroExEvents.LimitOrderFilled);
            return assertExpectedFinalBalancesAsync(orders);
        }));
        it('If revertIfIncomplete==true, reverts on an unfillable order', () => __awaiter(this, void 0, void 0, function* () {
            const fillableOrders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const expiredOrder = getTestLimitOrder({ expiry: orders_1.createExpiry(-1), takerTokenFeeAmount: ZERO_AMOUNT });
            const orders = [expiredOrder, ...fillableOrders];
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = feature
                .batchFillLimitOrders(orders, signatures, orders.map(order => order.takerAmount), true)
                .awaitTransactionSuccessAsync({ from: taker, value });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.BatchFillIncompleteError(expiredOrder.getHash(), ZERO_AMOUNT, expiredOrder.takerAmount));
        }));
        it('If revertIfIncomplete==true, reverts on an incomplete fill ', () => __awaiter(this, void 0, void 0, function* () {
            const fillableOrders = [...new Array(3)].map(() => getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT }));
            const partiallyFilledOrder = getTestLimitOrder({ takerTokenFeeAmount: ZERO_AMOUNT });
            const partialFillAmount = contracts_test_utils_1.getRandomPortion(partiallyFilledOrder.takerAmount);
            yield testUtils.fillLimitOrderAsync(partiallyFilledOrder, { fillAmount: partialFillAmount });
            const orders = [partiallyFilledOrder, ...fillableOrders];
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const value = testUtils.protocolFee.times(orders.length);
            const tx = feature
                .batchFillLimitOrders(orders, signatures, orders.map(order => order.takerAmount), true)
                .awaitTransactionSuccessAsync({ from: taker, value });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.BatchFillIncompleteError(partiallyFilledOrder.getHash(), partiallyFilledOrder.takerAmount.minus(partialFillAmount), partiallyFilledOrder.takerAmount));
        }));
    });
    contracts_test_utils_1.describe('batchFillRfqOrders', () => {
        function assertExpectedFinalBalancesAsync(orders, takerTokenFillAmounts = orders.map(order => order.takerAmount), takerTokenAlreadyFilledAmounts = orders.map(() => ZERO_AMOUNT)) {
            return __awaiter(this, void 0, void 0, function* () {
                const { makerTokenFilledAmount, takerTokenFilledAmount } = orders
                    .map((order, i) => orders_1.computeRfqOrderFilledAmounts(order, takerTokenFillAmounts[i], takerTokenAlreadyFilledAmounts[i]))
                    .reduce((previous, current) => ({
                    makerTokenFilledAmount: previous.makerTokenFilledAmount.plus(current.makerTokenFilledAmount),
                    takerTokenFilledAmount: previous.takerTokenFilledAmount.plus(current.takerTokenFilledAmount),
                }));
                const makerBalance = yield takerToken.balanceOf(maker).callAsync();
                const takerBalance = yield makerToken.balanceOf(taker).callAsync();
                contracts_test_utils_1.expect(makerBalance).to.bignumber.eq(takerTokenFilledAmount);
                contracts_test_utils_1.expect(takerBalance).to.bignumber.eq(makerTokenFilledAmount);
            });
        }
        it('Fully fills multiple orders', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = yield feature
                .batchFillRfqOrders(orders, signatures, orders.map(order => order.takerAmount), false)
                .awaitTransactionSuccessAsync({ from: taker });
            const [orderInfos] = yield zeroEx.batchGetRfqOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: orders[i].getHash(),
                takerTokenFilledAmount: orders[i].takerAmount,
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, orders.map(order => testUtils.createRfqOrderFilledEventArgs(order)), wrappers_1.IZeroExEvents.RfqOrderFilled);
            return assertExpectedFinalBalancesAsync(orders);
        }));
        it('Partially fills multiple orders', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            const fillAmounts = orders.map(order => contracts_test_utils_1.getRandomPortion(order.takerAmount));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = yield feature
                .batchFillRfqOrders(orders, signatures, fillAmounts, false)
                .awaitTransactionSuccessAsync({ from: taker });
            const [orderInfos] = yield zeroEx.batchGetRfqOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Fillable,
                orderHash: orders[i].getHash(),
                takerTokenFilledAmount: fillAmounts[i],
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, orders.map((order, i) => testUtils.createRfqOrderFilledEventArgs(order, fillAmounts[i])), wrappers_1.IZeroExEvents.RfqOrderFilled);
            return assertExpectedFinalBalancesAsync(orders, fillAmounts);
        }));
        it('Skips over unfillable orders', () => __awaiter(this, void 0, void 0, function* () {
            const fillableOrders = [...new Array(3)].map(() => getTestRfqOrder());
            const expiredOrder = getTestRfqOrder({ expiry: orders_1.createExpiry(-1) });
            const orders = [expiredOrder, ...fillableOrders];
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = yield feature
                .batchFillRfqOrders(orders, signatures, orders.map(order => order.takerAmount), false)
                .awaitTransactionSuccessAsync({ from: taker });
            const [orderInfos] = yield zeroEx.batchGetRfqOrderRelevantStates(orders, signatures).callAsync();
            const [expiredOrderInfo, ...filledOrderInfos] = orderInfos;
            orders_1.assertOrderInfoEquals(expiredOrderInfo, {
                status: protocol_utils_1.OrderStatus.Expired,
                orderHash: expiredOrder.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            filledOrderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: fillableOrders[i].getHash(),
                takerTokenFilledAmount: fillableOrders[i].takerAmount,
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, fillableOrders.map(order => testUtils.createRfqOrderFilledEventArgs(order)), wrappers_1.IZeroExEvents.RfqOrderFilled);
            return assertExpectedFinalBalancesAsync(fillableOrders);
        }));
        it('Fills multiple orders with revertIfIncomplete=true', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = yield feature
                .batchFillRfqOrders(orders, signatures, orders.map(order => order.takerAmount), true)
                .awaitTransactionSuccessAsync({ from: taker });
            const [orderInfos] = yield zeroEx.batchGetRfqOrderRelevantStates(orders, signatures).callAsync();
            orderInfos.map((orderInfo, i) => orders_1.assertOrderInfoEquals(orderInfo, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: orders[i].getHash(),
                takerTokenFilledAmount: orders[i].takerAmount,
            }));
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, orders.map(order => testUtils.createRfqOrderFilledEventArgs(order)), wrappers_1.IZeroExEvents.RfqOrderFilled);
            return assertExpectedFinalBalancesAsync(orders);
        }));
        it('If revertIfIncomplete==true, reverts on an unfillable order', () => __awaiter(this, void 0, void 0, function* () {
            const fillableOrders = [...new Array(3)].map(() => getTestRfqOrder());
            const expiredOrder = getTestRfqOrder({ expiry: orders_1.createExpiry(-1) });
            const orders = [expiredOrder, ...fillableOrders];
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = feature
                .batchFillRfqOrders(orders, signatures, orders.map(order => order.takerAmount), true)
                .awaitTransactionSuccessAsync({ from: taker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.BatchFillIncompleteError(expiredOrder.getHash(), ZERO_AMOUNT, expiredOrder.takerAmount));
        }));
        it('If revertIfIncomplete==true, reverts on an incomplete fill ', () => __awaiter(this, void 0, void 0, function* () {
            const fillableOrders = [...new Array(3)].map(() => getTestRfqOrder());
            const partiallyFilledOrder = getTestRfqOrder();
            const partialFillAmount = contracts_test_utils_1.getRandomPortion(partiallyFilledOrder.takerAmount);
            yield testUtils.fillRfqOrderAsync(partiallyFilledOrder, partialFillAmount);
            const orders = [partiallyFilledOrder, ...fillableOrders];
            const signatures = yield Promise.all(orders.map(order => order.getSignatureWithProviderAsync(env.provider)));
            yield testUtils.prepareBalancesForOrdersAsync(orders);
            const tx = feature
                .batchFillRfqOrders(orders, signatures, orders.map(order => order.takerAmount), true)
                .awaitTransactionSuccessAsync({ from: taker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.BatchFillIncompleteError(partiallyFilledOrder.getHash(), partiallyFilledOrder.takerAmount.minus(partialFillAmount), partiallyFilledOrder.takerAmount));
        }));
    });
});
//# sourceMappingURL=batch_fill_native_orders_test.js.map