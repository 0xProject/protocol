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
const wrappers_1 = require("../../src/wrappers");
const artifacts_1 = require("../artifacts");
const migration_1 = require("../utils/migration");
const orders_1 = require("../utils/orders");
const wrappers_2 = require("../wrappers");
contracts_test_utils_1.blockchainTests.resets('NativeOrdersFeature', env => {
    const { NULL_ADDRESS, MAX_UINT256, NULL_BYTES32, ZERO_AMOUNT } = contracts_test_utils_1.constants;
    const GAS_PRICE = new utils_1.BigNumber('123e9');
    const PROTOCOL_FEE_MULTIPLIER = 1337e3;
    const SINGLE_PROTOCOL_FEE = GAS_PRICE.times(PROTOCOL_FEE_MULTIPLIER);
    let maker;
    let taker;
    let notMaker;
    let notTaker;
    let zeroEx;
    let verifyingContract;
    let makerToken;
    let takerToken;
    let wethToken;
    let testRfqOriginRegistration;
    let testUtils;
    before(() => __awaiter(this, void 0, void 0, function* () {
        let owner;
        [owner, maker, taker, notMaker, notTaker] = yield env.getAccountAddressesAsync();
        [makerToken, takerToken, wethToken] = yield Promise.all([...new Array(3)].map(() => __awaiter(this, void 0, void 0, function* () {
            return wrappers_2.TestMintableERC20TokenContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestMintableERC20Token, env.provider, env.txDefaults, artifacts_1.artifacts);
        })));
        zeroEx = yield migration_1.fullMigrateAsync(owner, env.provider, Object.assign({}, env.txDefaults, { gasPrice: GAS_PRICE }), {}, { wethAddress: wethToken.address, protocolFeeMultiplier: PROTOCOL_FEE_MULTIPLIER }, { nativeOrders: artifacts_1.artifacts.TestNativeOrdersFeature });
        verifyingContract = zeroEx.address;
        yield Promise.all([maker, notMaker].map(a => makerToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: a })));
        yield Promise.all([taker, notTaker].map(a => takerToken.approve(zeroEx.address, MAX_UINT256).awaitTransactionSuccessAsync({ from: a })));
        testRfqOriginRegistration = yield wrappers_2.TestRfqOriginRegistrationContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestRfqOriginRegistration, env.provider, env.txDefaults, artifacts_1.artifacts);
        testUtils = new orders_1.NativeOrdersTestEnvironment(maker, taker, makerToken, takerToken, zeroEx, GAS_PRICE, SINGLE_PROTOCOL_FEE, env);
    }));
    function getTestLimitOrder(fields = {}) {
        return orders_1.getRandomLimitOrder(Object.assign({ maker,
            verifyingContract, chainId: 1337, takerToken: takerToken.address, makerToken: makerToken.address, taker: NULL_ADDRESS, sender: NULL_ADDRESS }, fields));
    }
    function getTestRfqOrder(fields = {}) {
        return orders_1.getRandomRfqOrder(Object.assign({ maker,
            verifyingContract, chainId: 1337, takerToken: takerToken.address, makerToken: makerToken.address, txOrigin: taker }, fields));
    }
    contracts_test_utils_1.describe('getProtocolFeeMultiplier()', () => {
        it('returns the protocol fee multiplier', () => __awaiter(this, void 0, void 0, function* () {
            const r = yield zeroEx.getProtocolFeeMultiplier().callAsync();
            contracts_test_utils_1.expect(r).to.bignumber.eq(PROTOCOL_FEE_MULTIPLIER);
        }));
    });
    contracts_test_utils_1.describe('getLimitOrderHash()', () => {
        it('returns the correct hash', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const hash = yield zeroEx.getLimitOrderHash(order).callAsync();
            contracts_test_utils_1.expect(hash).to.eq(order.getHash());
        }));
    });
    contracts_test_utils_1.describe('getRfqOrderHash()', () => {
        it('returns the correct hash', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const hash = yield zeroEx.getRfqOrderHash(order).callAsync();
            contracts_test_utils_1.expect(hash).to.eq(order.getHash());
        }));
    });
    contracts_test_utils_1.describe('getLimitOrderInfo()', () => {
        it('unfilled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const info = yield zeroEx.getLimitOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Fillable,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        }));
        it('unfilled cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = yield zeroEx.getLimitOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Cancelled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        }));
        it('unfilled expired order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder({ expiry: orders_1.createExpiry(-60) });
            const info = yield zeroEx.getLimitOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Expired,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        }));
        it('filled then expired order', () => __awaiter(this, void 0, void 0, function* () {
            const expiry = orders_1.createExpiry(60);
            const order = getTestLimitOrder({ expiry });
            // Fill the order first.
            yield testUtils.fillLimitOrderAsync(order);
            // Advance time to expire the order.
            yield env.web3Wrapper.increaseTimeAsync(61);
            const info = yield zeroEx.getLimitOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            // Fill the order first.
            yield testUtils.fillLimitOrderAsync(order);
            const info = yield zeroEx.getLimitOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('partially filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.minus(1);
            // Fill the order first.
            yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            const info = yield zeroEx.getLimitOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Fillable,
                orderHash: order.getHash(),
                takerTokenFilledAmount: fillAmount,
            });
        }));
        it('filled then cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            // Fill the order first.
            yield testUtils.fillLimitOrderAsync(order);
            yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = yield zeroEx.getLimitOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('partially filled then cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.minus(1);
            // Fill the order first.
            yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = yield zeroEx.getLimitOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Cancelled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: fillAmount,
            });
        }));
    });
    contracts_test_utils_1.describe('getRfqOrderInfo()', () => {
        it('unfilled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Fillable,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        }));
        it('unfilled cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Cancelled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        }));
        it('unfilled expired order', () => __awaiter(this, void 0, void 0, function* () {
            const expiry = orders_1.createExpiry(-60);
            const order = getTestRfqOrder({ expiry });
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Expired,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        }));
        it('filled then expired order', () => __awaiter(this, void 0, void 0, function* () {
            const expiry = orders_1.createExpiry(60);
            const order = getTestRfqOrder({ expiry });
            yield testUtils.prepareBalancesForOrdersAsync([order]);
            const sig = yield order.getSignatureWithProviderAsync(env.provider);
            // Fill the order first.
            yield zeroEx.fillRfqOrder(order, sig, order.takerAmount).awaitTransactionSuccessAsync({ from: taker });
            // Advance time to expire the order.
            yield env.web3Wrapper.increaseTimeAsync(61);
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            // Fill the order first.
            yield testUtils.fillRfqOrderAsync(order, order.takerAmount, taker);
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('partially filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const fillAmount = order.takerAmount.minus(1);
            // Fill the order first.
            yield testUtils.fillRfqOrderAsync(order, fillAmount);
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Fillable,
                orderHash: order.getHash(),
                takerTokenFilledAmount: fillAmount,
            });
        }));
        it('filled then cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            // Fill the order first.
            yield testUtils.fillRfqOrderAsync(order);
            yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Filled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('partially filled then cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const fillAmount = order.takerAmount.minus(1);
            // Fill the order first.
            yield testUtils.fillRfqOrderAsync(order, fillAmount);
            yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Cancelled,
                orderHash: order.getHash(),
                takerTokenFilledAmount: fillAmount,
            });
        }));
        it('invalid origin', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder({ txOrigin: NULL_ADDRESS });
            const info = yield zeroEx.getRfqOrderInfo(order).callAsync();
            orders_1.assertOrderInfoEquals(info, {
                status: protocol_utils_1.OrderStatus.Invalid,
                orderHash: order.getHash(),
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
        }));
    });
    contracts_test_utils_1.describe('cancelLimitOrder()', () => __awaiter(this, void 0, void 0, function* () {
        it('can cancel an unfilled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const receipt = yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getLimitOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Cancelled);
        }));
        it('can cancel a fully filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield testUtils.fillLimitOrderAsync(order);
            const receipt = yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getLimitOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Filled); // Still reports filled.
        }));
        it('can cancel a partially filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield testUtils.fillLimitOrderAsync(order, { fillAmount: order.takerAmount.minus(1) });
            const receipt = yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getLimitOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Cancelled);
        }));
        it('can cancel an expired order', () => __awaiter(this, void 0, void 0, function* () {
            const expiry = orders_1.createExpiry(-60);
            const order = getTestLimitOrder({ expiry });
            const receipt = yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getLimitOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Cancelled);
        }));
        it('can cancel a cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const receipt = yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getLimitOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Cancelled);
        }));
        it("cannot cancel someone else's order", () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const tx = zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: notMaker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OnlyOrderMakerAllowed(order.getHash(), notMaker, order.maker));
        }));
    }));
    contracts_test_utils_1.describe('cancelRfqOrder()', () => __awaiter(this, void 0, void 0, function* () {
        it('can cancel an unfilled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const receipt = yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getRfqOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Cancelled);
        }));
        it('can cancel a fully filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield testUtils.fillRfqOrderAsync(order);
            const receipt = yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getRfqOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Filled); // Still reports filled.
        }));
        it('can cancel a partially filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield testUtils.fillRfqOrderAsync(order, order.takerAmount.minus(1));
            const receipt = yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getRfqOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Cancelled); // Still reports filled.
        }));
        it('can cancel an expired order', () => __awaiter(this, void 0, void 0, function* () {
            const expiry = orders_1.createExpiry(-60);
            const order = getTestRfqOrder({ expiry });
            const receipt = yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getRfqOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Cancelled);
        }));
        it('can cancel a cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const receipt = yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ maker: order.maker, orderHash: order.getHash() }], wrappers_1.IZeroExEvents.OrderCancelled);
            const { status } = yield zeroEx.getRfqOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Cancelled);
        }));
        it("cannot cancel someone else's order", () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const tx = zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: notMaker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OnlyOrderMakerAllowed(order.getHash(), notMaker, order.maker));
        }));
    }));
    contracts_test_utils_1.describe('batchCancelLimitOrders()', () => __awaiter(this, void 0, void 0, function* () {
        it('can cancel multiple orders', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestLimitOrder());
            const receipt = yield zeroEx.batchCancelLimitOrders(orders).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, orders.map(o => ({ maker: o.maker, orderHash: o.getHash() })), wrappers_1.IZeroExEvents.OrderCancelled);
            const infos = yield Promise.all(orders.map(o => zeroEx.getLimitOrderInfo(o).callAsync()));
            contracts_test_utils_1.expect(infos.map(i => i.status)).to.deep.eq(infos.map(() => protocol_utils_1.OrderStatus.Cancelled));
        }));
        it("cannot cancel someone else's orders", () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestLimitOrder());
            const tx = zeroEx.batchCancelLimitOrders(orders).awaitTransactionSuccessAsync({ from: notMaker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OnlyOrderMakerAllowed(orders[0].getHash(), notMaker, orders[0].maker));
        }));
    }));
    contracts_test_utils_1.describe('batchCancelRfqOrders()', () => __awaiter(this, void 0, void 0, function* () {
        it('can cancel multiple orders', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const receipt = yield zeroEx.batchCancelRfqOrders(orders).awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, orders.map(o => ({ maker: o.maker, orderHash: o.getHash() })), wrappers_1.IZeroExEvents.OrderCancelled);
            const infos = yield Promise.all(orders.map(o => zeroEx.getRfqOrderInfo(o).callAsync()));
            contracts_test_utils_1.expect(infos.map(i => i.status)).to.deep.eq(infos.map(() => protocol_utils_1.OrderStatus.Cancelled));
        }));
        it("cannot cancel someone else's orders", () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map(() => getTestRfqOrder());
            const tx = zeroEx.batchCancelRfqOrders(orders).awaitTransactionSuccessAsync({ from: notMaker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OnlyOrderMakerAllowed(orders[0].getHash(), notMaker, orders[0].maker));
        }));
    }));
    contracts_test_utils_1.describe('cancelPairOrders()', () => __awaiter(this, void 0, void 0, function* () {
        it('can cancel multiple limit orders of the same pair with salt < minValidSalt', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map((_v, i) => getTestLimitOrder().clone({ salt: new utils_1.BigNumber(i) }));
            // Cancel the first two orders.
            const minValidSalt = orders[2].salt;
            const receipt = yield zeroEx
                .cancelPairLimitOrders(makerToken.address, takerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    maker,
                    makerToken: makerToken.address,
                    takerToken: takerToken.address,
                    minValidSalt,
                },
            ], wrappers_1.IZeroExEvents.PairCancelledLimitOrders);
            const statuses = (yield Promise.all(orders.map(o => zeroEx.getLimitOrderInfo(o).callAsync()))).map(oi => oi.status);
            contracts_test_utils_1.expect(statuses).to.deep.eq([protocol_utils_1.OrderStatus.Cancelled, protocol_utils_1.OrderStatus.Cancelled, protocol_utils_1.OrderStatus.Fillable]);
        }));
        it('does not cancel limit orders of a different pair', () => __awaiter(this, void 0, void 0, function* () {
            const order = orders_1.getRandomLimitOrder({ salt: new utils_1.BigNumber(1) });
            // Cancel salts <= the order's, but flip the tokens to be a different
            // pair.
            const minValidSalt = order.salt.plus(1);
            yield zeroEx
                .cancelPairLimitOrders(takerToken.address, makerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            const { status } = yield zeroEx.getLimitOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Fillable);
        }));
        it('can cancel multiple RFQ orders of the same pair with salt < minValidSalt', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [...new Array(3)].map((_v, i) => getTestRfqOrder().clone({ salt: new utils_1.BigNumber(i) }));
            // Cancel the first two orders.
            const minValidSalt = orders[2].salt;
            const receipt = yield zeroEx
                .cancelPairRfqOrders(makerToken.address, takerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    maker,
                    makerToken: makerToken.address,
                    takerToken: takerToken.address,
                    minValidSalt,
                },
            ], wrappers_1.IZeroExEvents.PairCancelledRfqOrders);
            const statuses = (yield Promise.all(orders.map(o => zeroEx.getRfqOrderInfo(o).callAsync()))).map(oi => oi.status);
            contracts_test_utils_1.expect(statuses).to.deep.eq([protocol_utils_1.OrderStatus.Cancelled, protocol_utils_1.OrderStatus.Cancelled, protocol_utils_1.OrderStatus.Fillable]);
        }));
        it('does not cancel RFQ orders of a different pair', () => __awaiter(this, void 0, void 0, function* () {
            const order = orders_1.getRandomRfqOrder({ salt: new utils_1.BigNumber(1) });
            // Cancel salts <= the order's, but flip the tokens to be a different
            // pair.
            const minValidSalt = order.salt.plus(1);
            yield zeroEx
                .cancelPairRfqOrders(takerToken.address, makerToken.address, minValidSalt)
                .awaitTransactionSuccessAsync({ from: maker });
            const { status } = yield zeroEx.getRfqOrderInfo(order).callAsync();
            contracts_test_utils_1.expect(status).to.eq(protocol_utils_1.OrderStatus.Fillable);
        }));
    }));
    contracts_test_utils_1.describe('batchCancelPairOrders()', () => __awaiter(this, void 0, void 0, function* () {
        it('can cancel multiple limit order pairs', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [
                getTestLimitOrder({ salt: new utils_1.BigNumber(1) }),
                // Flip the tokens for the other order.
                getTestLimitOrder({
                    makerToken: takerToken.address,
                    takerToken: makerToken.address,
                    salt: new utils_1.BigNumber(1),
                }),
            ];
            const minValidSalt = new utils_1.BigNumber(2);
            const receipt = yield zeroEx
                .batchCancelPairLimitOrders([makerToken.address, takerToken.address], [takerToken.address, makerToken.address], [minValidSalt, minValidSalt])
                .awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    maker,
                    makerToken: makerToken.address,
                    takerToken: takerToken.address,
                    minValidSalt,
                },
                {
                    maker,
                    makerToken: takerToken.address,
                    takerToken: makerToken.address,
                    minValidSalt,
                },
            ], wrappers_1.IZeroExEvents.PairCancelledLimitOrders);
            const statuses = (yield Promise.all(orders.map(o => zeroEx.getLimitOrderInfo(o).callAsync()))).map(oi => oi.status);
            contracts_test_utils_1.expect(statuses).to.deep.eq([protocol_utils_1.OrderStatus.Cancelled, protocol_utils_1.OrderStatus.Cancelled]);
        }));
        it('can cancel multiple RFQ order pairs', () => __awaiter(this, void 0, void 0, function* () {
            const orders = [
                getTestRfqOrder({ salt: new utils_1.BigNumber(1) }),
                // Flip the tokens for the other order.
                getTestRfqOrder({
                    makerToken: takerToken.address,
                    takerToken: makerToken.address,
                    salt: new utils_1.BigNumber(1),
                }),
            ];
            const minValidSalt = new utils_1.BigNumber(2);
            const receipt = yield zeroEx
                .batchCancelPairRfqOrders([makerToken.address, takerToken.address], [takerToken.address, makerToken.address], [minValidSalt, minValidSalt])
                .awaitTransactionSuccessAsync({ from: maker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    maker,
                    makerToken: makerToken.address,
                    takerToken: takerToken.address,
                    minValidSalt,
                },
                {
                    maker,
                    makerToken: takerToken.address,
                    takerToken: makerToken.address,
                    minValidSalt,
                },
            ], wrappers_1.IZeroExEvents.PairCancelledRfqOrders);
            const statuses = (yield Promise.all(orders.map(o => zeroEx.getRfqOrderInfo(o).callAsync()))).map(oi => oi.status);
            contracts_test_utils_1.expect(statuses).to.deep.eq([protocol_utils_1.OrderStatus.Cancelled, protocol_utils_1.OrderStatus.Cancelled]);
        }));
    }));
    function assertExpectedFinalBalancesFromLimitOrderFillAsync(order, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { takerTokenFillAmount, takerTokenAlreadyFilledAmount, receipt } = Object.assign({ takerTokenFillAmount: order.takerAmount, takerTokenAlreadyFilledAmount: ZERO_AMOUNT, receipt: undefined }, opts);
            const { makerTokenFilledAmount, takerTokenFilledAmount, takerTokenFeeFilledAmount, } = orders_1.computeLimitOrderFilledAmounts(order, takerTokenFillAmount, takerTokenAlreadyFilledAmount);
            const makerBalance = yield takerToken.balanceOf(maker).callAsync();
            const takerBalance = yield makerToken.balanceOf(taker).callAsync();
            const feeRecipientBalance = yield takerToken.balanceOf(order.feeRecipient).callAsync();
            contracts_test_utils_1.expect(makerBalance).to.bignumber.eq(takerTokenFilledAmount);
            contracts_test_utils_1.expect(takerBalance).to.bignumber.eq(makerTokenFilledAmount);
            contracts_test_utils_1.expect(feeRecipientBalance).to.bignumber.eq(takerTokenFeeFilledAmount);
            if (receipt) {
                const balanceOfTakerNow = yield env.web3Wrapper.getBalanceInWeiAsync(taker);
                const balanceOfTakerBefore = yield env.web3Wrapper.getBalanceInWeiAsync(taker, receipt.blockNumber - 1);
                const protocolFee = order.taker === NULL_ADDRESS ? SINGLE_PROTOCOL_FEE : 0;
                const totalCost = GAS_PRICE.times(receipt.gasUsed).plus(protocolFee);
                contracts_test_utils_1.expect(balanceOfTakerBefore.minus(totalCost)).to.bignumber.eq(balanceOfTakerNow);
            }
        });
    }
    contracts_test_utils_1.describe('fillLimitOrder()', () => {
        it('can fully fill an order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const receipt = yield testUtils.fillLimitOrderAsync(order);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order)], wrappers_1.IZeroExEvents.LimitOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            yield assertExpectedFinalBalancesFromLimitOrderFillAsync(order, { receipt });
        }));
        it('can partially fill an order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.minus(1);
            const receipt = yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order, fillAmount)], wrappers_1.IZeroExEvents.LimitOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Fillable,
                takerTokenFilledAmount: fillAmount,
            });
            yield assertExpectedFinalBalancesFromLimitOrderFillAsync(order, {
                takerTokenFillAmount: fillAmount,
            });
        }));
        it('can fully fill an order in two steps', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order, fillAmount)], wrappers_1.IZeroExEvents.LimitOrderFilled);
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount);
            receipt = yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)], wrappers_1.IZeroExEvents.LimitOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('clamps fill amount to remaining available', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const fillAmount = order.takerAmount.plus(1);
            const receipt = yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order, fillAmount)], wrappers_1.IZeroExEvents.LimitOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            yield assertExpectedFinalBalancesFromLimitOrderFillAsync(order, {
                takerTokenFillAmount: fillAmount,
            });
        }));
        it('clamps fill amount to remaining available in partial filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order, fillAmount)], wrappers_1.IZeroExEvents.LimitOrderFilled);
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount).plus(1);
            receipt = yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)], wrappers_1.IZeroExEvents.LimitOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getLimitOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('cannot fill an expired order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder({ expiry: orders_1.createExpiry(-60) });
            const tx = testUtils.fillLimitOrderAsync(order);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), protocol_utils_1.OrderStatus.Expired));
        }));
        it('cannot fill a cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const tx = testUtils.fillLimitOrderAsync(order);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), protocol_utils_1.OrderStatus.Cancelled));
        }));
        it('cannot fill a salt/pair cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield zeroEx
                .cancelPairLimitOrders(makerToken.address, takerToken.address, order.salt.plus(1))
                .awaitTransactionSuccessAsync({ from: maker });
            const tx = testUtils.fillLimitOrderAsync(order);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), protocol_utils_1.OrderStatus.Cancelled));
        }));
        it('non-taker cannot fill order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder({ taker });
            const tx = testUtils.fillLimitOrderAsync(order, { fillAmount: order.takerAmount, taker: notTaker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableByTakerError(order.getHash(), notTaker, order.taker));
        }));
        it('non-sender cannot fill order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder({ sender: taker });
            const tx = testUtils.fillLimitOrderAsync(order, { fillAmount: order.takerAmount, taker: notTaker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableBySenderError(order.getHash(), notTaker, order.sender));
        }));
        it('cannot fill order with bad signature', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = testUtils.fillLimitOrderAsync(order.clone({ chainId: 1234 }));
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker));
        }));
        it('fails if no protocol fee attached', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield testUtils.prepareBalancesForOrdersAsync([order]);
            const tx = zeroEx
                .fillLimitOrder(order, yield order.getSignatureWithProviderAsync(env.provider), new utils_1.BigNumber(order.takerAmount))
                .awaitTransactionSuccessAsync({ from: taker, value: ZERO_AMOUNT });
            // The exact revert error depends on whether we are still doing a
            // token spender fallthroigh, so we won't get too specific.
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.AnyRevertError());
        }));
        it('refunds excess protocol fee', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            const receipt = yield testUtils.fillLimitOrderAsync(order, { protocolFee: SINGLE_PROTOCOL_FEE.plus(1) });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order)], wrappers_1.IZeroExEvents.LimitOrderFilled);
            yield assertExpectedFinalBalancesFromLimitOrderFillAsync(order, { receipt });
        }));
    });
    contracts_test_utils_1.describe('registerAllowedRfqOrigins()', () => {
        it('cannot register through a contract', () => __awaiter(this, void 0, void 0, function* () {
            const tx = testRfqOriginRegistration
                .registerAllowedRfqOrigins(zeroEx.address, [], true)
                .awaitTransactionSuccessAsync();
            contracts_test_utils_1.expect(tx).to.revertWith('NativeOrdersFeature/NO_CONTRACT_ORIGINS');
        }));
    });
    function assertExpectedFinalBalancesFromRfqOrderFillAsync(order, takerTokenFillAmount = order.takerAmount, takerTokenAlreadyFilledAmount = ZERO_AMOUNT) {
        return __awaiter(this, void 0, void 0, function* () {
            const { makerTokenFilledAmount, takerTokenFilledAmount } = orders_1.computeRfqOrderFilledAmounts(order, takerTokenFillAmount, takerTokenAlreadyFilledAmount);
            const makerBalance = yield takerToken.balanceOf(maker).callAsync();
            const takerBalance = yield makerToken.balanceOf(taker).callAsync();
            contracts_test_utils_1.expect(makerBalance).to.bignumber.eq(takerTokenFilledAmount);
            contracts_test_utils_1.expect(takerBalance).to.bignumber.eq(makerTokenFilledAmount);
        });
    }
    contracts_test_utils_1.describe('fillRfqOrder()', () => {
        it('can fully fill an order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const receipt = yield testUtils.fillRfqOrderAsync(order);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createRfqOrderFilledEventArgs(order)], wrappers_1.IZeroExEvents.RfqOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            yield assertExpectedFinalBalancesFromRfqOrderFillAsync(order);
        }));
        it('can partially fill an order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const fillAmount = order.takerAmount.minus(1);
            const receipt = yield testUtils.fillRfqOrderAsync(order, fillAmount);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createRfqOrderFilledEventArgs(order, fillAmount)], wrappers_1.IZeroExEvents.RfqOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Fillable,
                takerTokenFilledAmount: fillAmount,
            });
            yield assertExpectedFinalBalancesFromRfqOrderFillAsync(order, fillAmount);
        }));
        it('can fully fill an order in two steps', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = yield testUtils.fillRfqOrderAsync(order, fillAmount);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createRfqOrderFilledEventArgs(order, fillAmount)], wrappers_1.IZeroExEvents.RfqOrderFilled);
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount);
            receipt = yield testUtils.fillRfqOrderAsync(order, fillAmount);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createRfqOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)], wrappers_1.IZeroExEvents.RfqOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('clamps fill amount to remaining available', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const fillAmount = order.takerAmount.plus(1);
            const receipt = yield testUtils.fillRfqOrderAsync(order, fillAmount);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createRfqOrderFilledEventArgs(order, fillAmount)], wrappers_1.IZeroExEvents.RfqOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            yield assertExpectedFinalBalancesFromRfqOrderFillAsync(order, fillAmount);
        }));
        it('clamps fill amount to remaining available in partial filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            let fillAmount = order.takerAmount.dividedToIntegerBy(2);
            let receipt = yield testUtils.fillRfqOrderAsync(order, fillAmount);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createRfqOrderFilledEventArgs(order, fillAmount)], wrappers_1.IZeroExEvents.RfqOrderFilled);
            const alreadyFilledAmount = fillAmount;
            fillAmount = order.takerAmount.minus(fillAmount).plus(1);
            receipt = yield testUtils.fillRfqOrderAsync(order, fillAmount);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createRfqOrderFilledEventArgs(order, fillAmount, alreadyFilledAmount)], wrappers_1.IZeroExEvents.RfqOrderFilled);
            orders_1.assertOrderInfoEquals(yield zeroEx.getRfqOrderInfo(order).callAsync(), {
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
        }));
        it('cannot fill an order with wrong tx.origin', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const tx = testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTaker, taker));
        }));
        it('can fill an order from a different tx.origin if registered', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            const receipt = yield zeroEx
                .registerAllowedRfqOrigins([notTaker], true)
                .awaitTransactionSuccessAsync({ from: taker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    origin: taker,
                    addrs: [notTaker],
                    allowed: true,
                },
            ], wrappers_1.IZeroExEvents.RfqOrderOriginsAllowed);
            return testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
        }));
        it('cannot fill an order with registered then unregistered tx.origin', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield zeroEx.registerAllowedRfqOrigins([notTaker], true).awaitTransactionSuccessAsync({ from: taker });
            const receipt = yield zeroEx
                .registerAllowedRfqOrigins([notTaker], false)
                .awaitTransactionSuccessAsync({ from: taker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    origin: taker,
                    addrs: [notTaker],
                    allowed: false,
                },
            ], wrappers_1.IZeroExEvents.RfqOrderOriginsAllowed);
            const tx = testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableByOriginError(order.getHash(), notTaker, taker));
        }));
        it('cannot fill an order with a zero tx.origin', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder({ txOrigin: NULL_ADDRESS });
            const tx = testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), protocol_utils_1.OrderStatus.Invalid));
        }));
        it('non-taker cannot fill order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder({ taker, txOrigin: notTaker });
            const tx = testUtils.fillRfqOrderAsync(order, order.takerAmount, notTaker);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableByTakerError(order.getHash(), notTaker, order.taker));
        }));
        it('cannot fill an expired order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder({ expiry: orders_1.createExpiry(-60) });
            const tx = testUtils.fillRfqOrderAsync(order);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), protocol_utils_1.OrderStatus.Expired));
        }));
        it('cannot fill a cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const tx = testUtils.fillRfqOrderAsync(order);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), protocol_utils_1.OrderStatus.Cancelled));
        }));
        it('cannot fill a salt/pair cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield zeroEx
                .cancelPairRfqOrders(makerToken.address, takerToken.address, order.salt.plus(1))
                .awaitTransactionSuccessAsync({ from: maker });
            const tx = testUtils.fillRfqOrderAsync(order);
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotFillableError(order.getHash(), protocol_utils_1.OrderStatus.Cancelled));
        }));
        it('cannot fill order with bad signature', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            // Overwrite chainId to result in a different hash and therefore different
            // signature.
            const tx = testUtils.fillRfqOrderAsync(order.clone({ chainId: 1234 }));
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.OrderNotSignedByMakerError(order.getHash(), undefined, order.maker));
        }));
        it('fails if ETH is attached', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield testUtils.prepareBalancesForOrdersAsync([order], taker);
            const tx = zeroEx
                .fillRfqOrder(order, yield order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: 1 });
            // This will revert at the language level because the fill function is not payable.
            return contracts_test_utils_1.expect(tx).to.be.rejectedWith('revert');
        }));
    });
    contracts_test_utils_1.describe('fillOrKillLimitOrder()', () => {
        it('can fully fill an order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield testUtils.prepareBalancesForOrdersAsync([order]);
            const receipt = yield zeroEx
                .fillOrKillLimitOrder(order, yield order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createLimitOrderFilledEventArgs(order)], wrappers_1.IZeroExEvents.LimitOrderFilled);
        }));
        it('reverts if cannot fill the exact amount', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield testUtils.prepareBalancesForOrdersAsync([order]);
            const fillAmount = order.takerAmount.plus(1);
            const tx = zeroEx
                .fillOrKillLimitOrder(order, yield order.getSignatureWithProviderAsync(env.provider), fillAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.FillOrKillFailedError(order.getHash(), order.takerAmount, fillAmount));
        }));
        it('refunds excess protocol fee', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield testUtils.prepareBalancesForOrdersAsync([order]);
            const takerBalanceBefore = yield env.web3Wrapper.getBalanceInWeiAsync(taker);
            const receipt = yield zeroEx
                .fillOrKillLimitOrder(order, yield order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: SINGLE_PROTOCOL_FEE.plus(1) });
            const takerBalanceAfter = yield env.web3Wrapper.getBalanceInWeiAsync(taker);
            const totalCost = GAS_PRICE.times(receipt.gasUsed).plus(SINGLE_PROTOCOL_FEE);
            contracts_test_utils_1.expect(takerBalanceBefore.minus(totalCost)).to.bignumber.eq(takerBalanceAfter);
        }));
    });
    contracts_test_utils_1.describe('fillOrKillRfqOrder()', () => {
        it('can fully fill an order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield testUtils.prepareBalancesForOrdersAsync([order]);
            const receipt = yield zeroEx
                .fillOrKillRfqOrder(order, yield order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker });
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [testUtils.createRfqOrderFilledEventArgs(order)], wrappers_1.IZeroExEvents.RfqOrderFilled);
        }));
        it('reverts if cannot fill the exact amount', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield testUtils.prepareBalancesForOrdersAsync([order]);
            const fillAmount = order.takerAmount.plus(1);
            const tx = zeroEx
                .fillOrKillRfqOrder(order, yield order.getSignatureWithProviderAsync(env.provider), fillAmount)
                .awaitTransactionSuccessAsync({ from: taker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new protocol_utils_1.RevertErrors.NativeOrders.FillOrKillFailedError(order.getHash(), order.takerAmount, fillAmount));
        }));
        it('fails if ETH is attached', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield testUtils.prepareBalancesForOrdersAsync([order]);
            const tx = zeroEx
                .fillOrKillRfqOrder(order, yield order.getSignatureWithProviderAsync(env.provider), order.takerAmount)
                .awaitTransactionSuccessAsync({ from: taker, value: 1 });
            // This will revert at the language level because the fill function is not payable.
            return contracts_test_utils_1.expect(tx).to.be.rejectedWith('revert');
        }));
    });
    function fundOrderMakerAsync(order, balance = order.makerAmount, allowance = order.makerAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            yield makerToken.burn(maker, yield makerToken.balanceOf(maker).callAsync()).awaitTransactionSuccessAsync();
            yield makerToken.mint(maker, balance).awaitTransactionSuccessAsync();
            yield makerToken.approve(zeroEx.address, allowance).awaitTransactionSuccessAsync({ from: maker });
        });
    }
    contracts_test_utils_1.describe('getLimitOrderRelevantState()', () => {
        it('works with an empty order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder({
                takerAmount: ZERO_AMOUNT,
            });
            yield fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getLimitOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(0);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
        it('works with cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield fundOrderMakerAsync(order);
            yield zeroEx.cancelLimitOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getLimitOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Cancelled,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(0);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
        it('works with a bad signature', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getLimitOrderRelevantState(order, yield order.clone({ maker: notMaker }).getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Fillable,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(order.takerAmount);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(false);
        }));
        it('works with an unfilled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            yield fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getLimitOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Fillable,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(order.takerAmount);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
        it('works with a fully filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            // Fully Fund maker and taker.
            yield fundOrderMakerAsync(order);
            yield takerToken
                .mint(taker, order.takerAmount.plus(order.takerTokenFeeAmount))
                .awaitTransactionSuccessAsync();
            yield testUtils.fillLimitOrderAsync(order);
            // Partially fill the order.
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getLimitOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(0);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
        it('works with an under-funded, partially-filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestLimitOrder();
            // Fully Fund maker and taker.
            yield fundOrderMakerAsync(order);
            yield takerToken
                .mint(taker, order.takerAmount.plus(order.takerTokenFeeAmount))
                .awaitTransactionSuccessAsync();
            // Partially fill the order.
            const fillAmount = contracts_test_utils_1.getRandomPortion(order.takerAmount);
            yield testUtils.fillLimitOrderAsync(order, { fillAmount });
            // Reduce maker funds to be < remaining.
            const remainingMakerAmount = orders_1.getFillableMakerTokenAmount(order, fillAmount);
            const balance = contracts_test_utils_1.getRandomPortion(remainingMakerAmount);
            const allowance = contracts_test_utils_1.getRandomPortion(remainingMakerAmount);
            yield fundOrderMakerAsync(order, balance, allowance);
            // Get order state.
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getLimitOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Fillable,
                takerTokenFilledAmount: fillAmount,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(orders_1.getActualFillableTakerTokenAmount(order, balance, allowance, fillAmount));
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
    });
    contracts_test_utils_1.describe('getRfqOrderRelevantState()', () => {
        it('works with an empty order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder({
                takerAmount: ZERO_AMOUNT,
            });
            yield fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getRfqOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(0);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
        it('works with cancelled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield fundOrderMakerAsync(order);
            yield zeroEx.cancelRfqOrder(order).awaitTransactionSuccessAsync({ from: maker });
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getRfqOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Cancelled,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(0);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
        it('works with a bad signature', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getRfqOrderRelevantState(order, yield order.clone({ maker: notMaker }).getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Fillable,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(order.takerAmount);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(false);
        }));
        it('works with an unfilled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            yield fundOrderMakerAsync(order);
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getRfqOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Fillable,
                takerTokenFilledAmount: ZERO_AMOUNT,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(order.takerAmount);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
        it('works with a fully filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            // Fully Fund maker and taker.
            yield fundOrderMakerAsync(order);
            yield takerToken.mint(taker, order.takerAmount);
            yield testUtils.fillRfqOrderAsync(order);
            // Partially fill the order.
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getRfqOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Filled,
                takerTokenFilledAmount: order.takerAmount,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(0);
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
        it('works with an under-funded, partially-filled order', () => __awaiter(this, void 0, void 0, function* () {
            const order = getTestRfqOrder();
            // Fully Fund maker and taker.
            yield fundOrderMakerAsync(order);
            yield takerToken.mint(taker, order.takerAmount).awaitTransactionSuccessAsync();
            // Partially fill the order.
            const fillAmount = contracts_test_utils_1.getRandomPortion(order.takerAmount);
            yield testUtils.fillRfqOrderAsync(order, fillAmount);
            // Reduce maker funds to be < remaining.
            const remainingMakerAmount = orders_1.getFillableMakerTokenAmount(order, fillAmount);
            const balance = contracts_test_utils_1.getRandomPortion(remainingMakerAmount);
            const allowance = contracts_test_utils_1.getRandomPortion(remainingMakerAmount);
            yield fundOrderMakerAsync(order, balance, allowance);
            // Get order state.
            const [orderInfo, fillableTakerAmount, isSignatureValid] = yield zeroEx
                .getRfqOrderRelevantState(order, yield order.getSignatureWithProviderAsync(env.provider))
                .callAsync();
            contracts_test_utils_1.expect(orderInfo).to.deep.eq({
                orderHash: order.getHash(),
                status: protocol_utils_1.OrderStatus.Fillable,
                takerTokenFilledAmount: fillAmount,
            });
            contracts_test_utils_1.expect(fillableTakerAmount).to.bignumber.eq(orders_1.getActualFillableTakerTokenAmount(order, balance, allowance, fillAmount));
            contracts_test_utils_1.expect(isSignatureValid).to.eq(true);
        }));
    });
    function batchFundOrderMakerAsync(orders) {
        return __awaiter(this, void 0, void 0, function* () {
            yield makerToken.burn(maker, yield makerToken.balanceOf(maker).callAsync()).awaitTransactionSuccessAsync();
            const balance = utils_1.BigNumber.sum(...orders.map(o => o.makerAmount));
            yield makerToken.mint(maker, balance).awaitTransactionSuccessAsync();
            yield makerToken.approve(zeroEx.address, balance).awaitTransactionSuccessAsync({ from: maker });
        });
    }
    contracts_test_utils_1.describe('batchGetLimitOrderRelevantStates()', () => {
        it('works with multiple orders', () => __awaiter(this, void 0, void 0, function* () {
            const orders = new Array(3).fill(0).map(() => getTestLimitOrder());
            yield batchFundOrderMakerAsync(orders);
            const [orderInfos, fillableTakerAmounts, isSignatureValids] = yield zeroEx
                .batchGetLimitOrderRelevantStates(orders, yield Promise.all(orders.map((o) => __awaiter(this, void 0, void 0, function* () { return o.getSignatureWithProviderAsync(env.provider); }))))
                .callAsync();
            contracts_test_utils_1.expect(orderInfos).to.be.length(orders.length);
            contracts_test_utils_1.expect(fillableTakerAmounts).to.be.length(orders.length);
            contracts_test_utils_1.expect(isSignatureValids).to.be.length(orders.length);
            for (let i = 0; i < orders.length; ++i) {
                contracts_test_utils_1.expect(orderInfos[i]).to.deep.eq({
                    orderHash: orders[i].getHash(),
                    status: protocol_utils_1.OrderStatus.Fillable,
                    takerTokenFilledAmount: ZERO_AMOUNT,
                });
                contracts_test_utils_1.expect(fillableTakerAmounts[i]).to.bignumber.eq(orders[i].takerAmount);
                contracts_test_utils_1.expect(isSignatureValids[i]).to.eq(true);
            }
        }));
        it('swallows reverts', () => __awaiter(this, void 0, void 0, function* () {
            const orders = new Array(3).fill(0).map(() => getTestLimitOrder());
            // The second order will revert because its maker token is not valid.
            orders[1].makerToken = contracts_test_utils_1.randomAddress();
            yield batchFundOrderMakerAsync(orders);
            const [orderInfos, fillableTakerAmounts, isSignatureValids] = yield zeroEx
                .batchGetLimitOrderRelevantStates(orders, yield Promise.all(orders.map((o) => __awaiter(this, void 0, void 0, function* () { return o.getSignatureWithProviderAsync(env.provider); }))))
                .callAsync();
            contracts_test_utils_1.expect(orderInfos).to.be.length(orders.length);
            contracts_test_utils_1.expect(fillableTakerAmounts).to.be.length(orders.length);
            contracts_test_utils_1.expect(isSignatureValids).to.be.length(orders.length);
            for (let i = 0; i < orders.length; ++i) {
                contracts_test_utils_1.expect(orderInfos[i]).to.deep.eq({
                    orderHash: i === 1 ? NULL_BYTES32 : orders[i].getHash(),
                    status: i === 1 ? protocol_utils_1.OrderStatus.Invalid : protocol_utils_1.OrderStatus.Fillable,
                    takerTokenFilledAmount: ZERO_AMOUNT,
                });
                contracts_test_utils_1.expect(fillableTakerAmounts[i]).to.bignumber.eq(i === 1 ? ZERO_AMOUNT : orders[i].takerAmount);
                contracts_test_utils_1.expect(isSignatureValids[i]).to.eq(i !== 1);
            }
        }));
    });
    contracts_test_utils_1.describe('batchGetRfqOrderRelevantStates()', () => {
        it('works with multiple orders', () => __awaiter(this, void 0, void 0, function* () {
            const orders = new Array(3).fill(0).map(() => getTestRfqOrder());
            yield batchFundOrderMakerAsync(orders);
            const [orderInfos, fillableTakerAmounts, isSignatureValids] = yield zeroEx
                .batchGetRfqOrderRelevantStates(orders, yield Promise.all(orders.map((o) => __awaiter(this, void 0, void 0, function* () { return o.getSignatureWithProviderAsync(env.provider); }))))
                .callAsync();
            contracts_test_utils_1.expect(orderInfos).to.be.length(orders.length);
            contracts_test_utils_1.expect(fillableTakerAmounts).to.be.length(orders.length);
            contracts_test_utils_1.expect(isSignatureValids).to.be.length(orders.length);
            for (let i = 0; i < orders.length; ++i) {
                contracts_test_utils_1.expect(orderInfos[i]).to.deep.eq({
                    orderHash: orders[i].getHash(),
                    status: protocol_utils_1.OrderStatus.Fillable,
                    takerTokenFilledAmount: ZERO_AMOUNT,
                });
                contracts_test_utils_1.expect(fillableTakerAmounts[i]).to.bignumber.eq(orders[i].takerAmount);
                contracts_test_utils_1.expect(isSignatureValids[i]).to.eq(true);
            }
        }));
    });
});
//# sourceMappingURL=native_orders_feature_test.js.map