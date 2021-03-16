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
const artifacts_1 = require("../artifacts");
const migration_1 = require("../utils/migration");
const wrappers_1 = require("../wrappers");
const { ZERO_AMOUNT: ZERO, NULL_ADDRESS } = contracts_test_utils_1.constants;
class NativeOrdersTestEnvironment {
    constructor(maker, taker, makerToken, takerToken, zeroEx, gasPrice, protocolFee, _env) {
        this.maker = maker;
        this.taker = taker;
        this.makerToken = makerToken;
        this.takerToken = takerToken;
        this.zeroEx = zeroEx;
        this.gasPrice = gasPrice;
        this.protocolFee = protocolFee;
        this._env = _env;
    }
    static createAsync(env, gasPrice = new utils_1.BigNumber('123e9'), protocolFeeMultiplier = 70e3) {
        return __awaiter(this, void 0, void 0, function* () {
            const [owner, maker, taker] = yield env.getAccountAddressesAsync();
            const [makerToken, takerToken] = yield Promise.all([...new Array(2)].map(() => __awaiter(this, void 0, void 0, function* () {
                return wrappers_1.TestMintableERC20TokenContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestMintableERC20Token, env.provider, Object.assign({}, env.txDefaults, { gasPrice }), artifacts_1.artifacts);
            })));
            const zeroEx = yield migration_1.fullMigrateAsync(owner, env.provider, env.txDefaults, {}, { protocolFeeMultiplier });
            yield makerToken.approve(zeroEx.address, contracts_test_utils_1.constants.MAX_UINT256).awaitTransactionSuccessAsync({ from: maker });
            yield takerToken.approve(zeroEx.address, contracts_test_utils_1.constants.MAX_UINT256).awaitTransactionSuccessAsync({ from: taker });
            return new NativeOrdersTestEnvironment(maker, taker, makerToken, takerToken, zeroEx, gasPrice, gasPrice.times(protocolFeeMultiplier), env);
        });
    }
    prepareBalancesForOrdersAsync(orders, taker = this.taker) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.makerToken
                .mint(this.maker, utils_1.BigNumber.sum(...orders.map(order => order.makerAmount)))
                .awaitTransactionSuccessAsync();
            yield this.takerToken
                .mint(taker, utils_1.BigNumber.sum(...orders.map(order => order.takerAmount.plus(order instanceof protocol_utils_1.LimitOrder ? order.takerTokenFeeAmount : 0))))
                .awaitTransactionSuccessAsync();
        });
    }
    fillLimitOrderAsync(order, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { fillAmount, taker, protocolFee } = Object.assign({ taker: this.taker, fillAmount: order.takerAmount }, opts);
            yield this.prepareBalancesForOrdersAsync([order], taker);
            const value = protocolFee === undefined ? this.protocolFee : protocolFee;
            return this.zeroEx
                .fillLimitOrder(order, yield order.getSignatureWithProviderAsync(this._env.provider), new utils_1.BigNumber(fillAmount))
                .awaitTransactionSuccessAsync({ from: taker, value });
        });
    }
    fillRfqOrderAsync(order, fillAmount = order.takerAmount, taker = this.taker) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.prepareBalancesForOrdersAsync([order], taker);
            return this.zeroEx
                .fillRfqOrder(order, yield order.getSignatureWithProviderAsync(this._env.provider), new utils_1.BigNumber(fillAmount))
                .awaitTransactionSuccessAsync({ from: taker });
        });
    }
    createLimitOrderFilledEventArgs(order, takerTokenFillAmount = order.takerAmount, takerTokenAlreadyFilledAmount = ZERO) {
        const { makerTokenFilledAmount, takerTokenFilledAmount, takerTokenFeeFilledAmount, } = computeLimitOrderFilledAmounts(order, takerTokenFillAmount, takerTokenAlreadyFilledAmount);
        const protocolFee = order.taker !== NULL_ADDRESS ? ZERO : this.protocolFee;
        return {
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            takerTokenFeeFilledAmount,
            orderHash: order.getHash(),
            maker: order.maker,
            taker: this.taker,
            feeRecipient: order.feeRecipient,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            protocolFeePaid: protocolFee,
            pool: order.pool,
        };
    }
    createRfqOrderFilledEventArgs(order, takerTokenFillAmount = order.takerAmount, takerTokenAlreadyFilledAmount = ZERO) {
        const { makerTokenFilledAmount, takerTokenFilledAmount } = computeRfqOrderFilledAmounts(order, takerTokenFillAmount, takerTokenAlreadyFilledAmount);
        return {
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            orderHash: order.getHash(),
            maker: order.maker,
            taker: this.taker,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            pool: order.pool,
        };
    }
}
exports.NativeOrdersTestEnvironment = NativeOrdersTestEnvironment;
/**
 * Generate a random limit order.
 */
function getRandomLimitOrder(fields = {}) {
    return new protocol_utils_1.LimitOrder(Object.assign({ makerToken: contracts_test_utils_1.randomAddress(), takerToken: contracts_test_utils_1.randomAddress(), makerAmount: contracts_test_utils_1.getRandomInteger('1e18', '100e18'), takerAmount: contracts_test_utils_1.getRandomInteger('1e6', '100e6'), takerTokenFeeAmount: contracts_test_utils_1.getRandomInteger('0.01e18', '1e18'), maker: contracts_test_utils_1.randomAddress(), taker: contracts_test_utils_1.randomAddress(), sender: contracts_test_utils_1.randomAddress(), feeRecipient: contracts_test_utils_1.randomAddress(), pool: utils_1.hexUtils.random(), expiry: new utils_1.BigNumber(Math.floor(Date.now() / 1000 + 60)), salt: new utils_1.BigNumber(utils_1.hexUtils.random()) }, fields));
}
exports.getRandomLimitOrder = getRandomLimitOrder;
/**
 * Generate a random RFQ order.
 */
function getRandomRfqOrder(fields = {}) {
    return new protocol_utils_1.RfqOrder(Object.assign({ makerToken: contracts_test_utils_1.randomAddress(), takerToken: contracts_test_utils_1.randomAddress(), makerAmount: contracts_test_utils_1.getRandomInteger('1e18', '100e18'), takerAmount: contracts_test_utils_1.getRandomInteger('1e6', '100e6'), maker: contracts_test_utils_1.randomAddress(), txOrigin: contracts_test_utils_1.randomAddress(), pool: utils_1.hexUtils.random(), expiry: new utils_1.BigNumber(Math.floor(Date.now() / 1000 + 60)), salt: new utils_1.BigNumber(utils_1.hexUtils.random()) }, fields));
}
exports.getRandomRfqOrder = getRandomRfqOrder;
/**
 * Asserts the fields of an OrderInfo object.
 */
function assertOrderInfoEquals(actual, expected) {
    contracts_test_utils_1.expect(actual.status, 'Order status').to.eq(expected.status);
    contracts_test_utils_1.expect(actual.orderHash, 'Order hash').to.eq(expected.orderHash);
    contracts_test_utils_1.expect(actual.takerTokenFilledAmount, 'Order takerTokenFilledAmount').to.bignumber.eq(expected.takerTokenFilledAmount);
}
exports.assertOrderInfoEquals = assertOrderInfoEquals;
/**
 * Creates an order expiry field.
 */
function createExpiry(deltaSeconds = 60) {
    return new utils_1.BigNumber(Math.floor(Date.now() / 1000) + deltaSeconds);
}
exports.createExpiry = createExpiry;
/**
 * Computes the maker, taker, and taker token fee amounts filled for
 * the given limit order.
 */
function computeLimitOrderFilledAmounts(order, takerTokenFillAmount = order.takerAmount, takerTokenAlreadyFilledAmount = ZERO) {
    const fillAmount = utils_1.BigNumber.min(order.takerAmount, takerTokenFillAmount, order.takerAmount.minus(takerTokenAlreadyFilledAmount));
    const makerTokenFilledAmount = fillAmount
        .times(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(utils_1.BigNumber.ROUND_DOWN);
    const takerTokenFeeFilledAmount = fillAmount
        .times(order.takerTokenFeeAmount)
        .div(order.takerAmount)
        .integerValue(utils_1.BigNumber.ROUND_DOWN);
    return {
        makerTokenFilledAmount,
        takerTokenFilledAmount: fillAmount,
        takerTokenFeeFilledAmount,
    };
}
exports.computeLimitOrderFilledAmounts = computeLimitOrderFilledAmounts;
/**
 * Computes the maker and taker amounts filled for the given RFQ order.
 */
function computeRfqOrderFilledAmounts(order, takerTokenFillAmount = order.takerAmount, takerTokenAlreadyFilledAmount = ZERO) {
    const fillAmount = utils_1.BigNumber.min(order.takerAmount, takerTokenFillAmount, order.takerAmount.minus(takerTokenAlreadyFilledAmount));
    const makerTokenFilledAmount = fillAmount
        .times(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(utils_1.BigNumber.ROUND_DOWN);
    return {
        makerTokenFilledAmount,
        takerTokenFilledAmount: fillAmount,
    };
}
exports.computeRfqOrderFilledAmounts = computeRfqOrderFilledAmounts;
/**
 * Computes the remaining fillable amount in maker token for
 * the given order.
 */
function getFillableMakerTokenAmount(order, takerTokenFilledAmount = ZERO) {
    return order.takerAmount
        .minus(takerTokenFilledAmount)
        .times(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(utils_1.BigNumber.ROUND_DOWN);
}
exports.getFillableMakerTokenAmount = getFillableMakerTokenAmount;
/**
 * Computes the remaining fillable amnount in taker token, based on
 * the amount already filled and the maker's balance/allowance.
 */
function getActualFillableTakerTokenAmount(order, makerBalance = order.makerAmount, makerAllowance = order.makerAmount, takerTokenFilledAmount = ZERO) {
    const fillableMakerTokenAmount = getFillableMakerTokenAmount(order, takerTokenFilledAmount);
    return utils_1.BigNumber.min(fillableMakerTokenAmount, makerBalance, makerAllowance)
        .times(order.takerAmount)
        .div(order.makerAmount)
        .integerValue(utils_1.BigNumber.ROUND_UP);
}
exports.getActualFillableTakerTokenAmount = getActualFillableTakerTokenAmount;
//# sourceMappingURL=orders.js.map