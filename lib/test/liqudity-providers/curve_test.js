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
const utils_1 = require("@0x/utils");
const artifacts_1 = require("../artifacts");
const wrappers_1 = require("../wrappers");
contracts_test_utils_1.blockchainTests.resets('CurveLiquidityProvider feature', env => {
    let lp;
    let sellToken;
    let buyToken;
    let testCurve;
    let owner;
    let taker;
    const RECIPIENT = utils_1.hexUtils.random(20);
    const SELL_AMOUNT = contracts_test_utils_1.getRandomInteger('1e6', '1e18');
    const BUY_AMOUNT = contracts_test_utils_1.getRandomInteger('1e6', '10e18');
    const REVERTING_SELECTOR = '0xdeaddead';
    const SWAP_SELECTOR = '0x12340000';
    const SWAP_WITH_RETURN_SELECTOR = '0x12340001';
    const ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const SELL_TOKEN_COIN_IDX = 0;
    const BUY_TOKEN_COIN_IDX = 1;
    const ETH_COIN_IDX = 2;
    const { ZERO_AMOUNT } = contracts_test_utils_1.constants;
    before(() => __awaiter(this, void 0, void 0, function* () {
        [owner, taker] = yield env.getAccountAddressesAsync();
        [sellToken, buyToken] = yield Promise.all(new Array(2)
            .fill(0)
            .map(() => __awaiter(this, void 0, void 0, function* () {
            return wrappers_1.TestMintableERC20TokenContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestMintableERC20Token, env.provider, env.txDefaults, artifacts_1.artifacts);
        })));
        testCurve = yield wrappers_1.TestCurveContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestCurve, env.provider, Object.assign({}, env.txDefaults, { value: BUY_AMOUNT }), artifacts_1.artifacts, sellToken.address, buyToken.address, BUY_AMOUNT);
        lp = yield wrappers_1.CurveLiquidityProviderContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.CurveLiquidityProvider, env.provider, Object.assign({}, env.txDefaults, { from: taker }), artifacts_1.artifacts);
    }));
    function fundProviderContractAsync(fromCoinIdx, amount = SELL_AMOUNT) {
        return __awaiter(this, void 0, void 0, function* () {
            if (fromCoinIdx === SELL_TOKEN_COIN_IDX) {
                yield sellToken.mint(lp.address, SELL_AMOUNT).awaitTransactionSuccessAsync();
            }
            else {
                yield env.web3Wrapper.awaitTransactionSuccessAsync(yield env.web3Wrapper.sendTransactionAsync({
                    from: taker,
                    to: lp.address,
                    value: SELL_AMOUNT,
                }));
            }
        });
    }
    function encodeCurveData(fields = {}) {
        const _fields = Object.assign({ curveAddress: testCurve.address, exchangeFunctionSelector: SWAP_SELECTOR, fromCoinIdx: SELL_TOKEN_COIN_IDX, toCoinIdx: BUY_TOKEN_COIN_IDX }, fields);
        return utils_1.hexUtils.concat(utils_1.hexUtils.leftPad(_fields.curveAddress), utils_1.hexUtils.rightPad(_fields.exchangeFunctionSelector), utils_1.hexUtils.leftPad(_fields.fromCoinIdx), utils_1.hexUtils.leftPad(_fields.toCoinIdx));
    }
    it('can swap ERC20->ERC20', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, encodeCurveData());
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: ZERO_AMOUNT,
                selector: SWAP_SELECTOR,
                fromCoinIdx: new utils_1.BigNumber(SELL_TOKEN_COIN_IDX),
                toCoinIdx: new utils_1.BigNumber(BUY_TOKEN_COIN_IDX),
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
            },
        ], 'CurveCalled');
    }));
    it('can swap ERC20->ETH', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForEth(sellToken.address, RECIPIENT, BUY_AMOUNT, encodeCurveData({ toCoinIdx: ETH_COIN_IDX }));
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield env.web3Wrapper.getBalanceInWeiAsync(RECIPIENT)).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: ZERO_AMOUNT,
                selector: SWAP_SELECTOR,
                fromCoinIdx: new utils_1.BigNumber(SELL_TOKEN_COIN_IDX),
                toCoinIdx: new utils_1.BigNumber(ETH_COIN_IDX),
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
            },
        ], 'CurveCalled');
    }));
    it('can swap ETH->ERC20', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(ETH_COIN_IDX);
        const call = lp.sellEthForToken(buyToken.address, RECIPIENT, BUY_AMOUNT, encodeCurveData({ fromCoinIdx: ETH_COIN_IDX }));
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: SELL_AMOUNT,
                selector: SWAP_SELECTOR,
                fromCoinIdx: new utils_1.BigNumber(ETH_COIN_IDX),
                toCoinIdx: new utils_1.BigNumber(BUY_TOKEN_COIN_IDX),
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
            },
        ], 'CurveCalled');
    }));
    it('can swap ETH->ERC20 with attached ETH', () => __awaiter(this, void 0, void 0, function* () {
        const call = lp.sellEthForToken(buyToken.address, RECIPIENT, BUY_AMOUNT, encodeCurveData({ fromCoinIdx: ETH_COIN_IDX }));
        const boughtAmount = yield call.callAsync({ value: SELL_AMOUNT });
        const { logs } = yield call.awaitTransactionSuccessAsync({ value: SELL_AMOUNT });
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: SELL_AMOUNT,
                selector: SWAP_SELECTOR,
                fromCoinIdx: new utils_1.BigNumber(ETH_COIN_IDX),
                toCoinIdx: new utils_1.BigNumber(BUY_TOKEN_COIN_IDX),
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
            },
        ], 'CurveCalled');
    }));
    it('can swap with a pool that returns bought amount', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, encodeCurveData({ exchangeFunctionSelector: SWAP_WITH_RETURN_SELECTOR }));
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: ZERO_AMOUNT,
                selector: SWAP_WITH_RETURN_SELECTOR,
                fromCoinIdx: new utils_1.BigNumber(SELL_TOKEN_COIN_IDX),
                toCoinIdx: new utils_1.BigNumber(BUY_TOKEN_COIN_IDX),
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
            },
        ], 'CurveCalled');
    }));
    it('reverts if pool reverts', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, encodeCurveData({ exchangeFunctionSelector: REVERTING_SELECTOR }));
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('TestCurve/REVERT');
    }));
    it('reverts if underbought', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT.plus(1), encodeCurveData());
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/UNDERBOUGHT');
    }));
    it('reverts if ERC20->ERC20 receives an ETH input token', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(ETH_COIN_IDX);
        const call = lp.sellTokenForToken(ETH_TOKEN_ADDRESS, buyToken.address, RECIPIENT, BUY_AMOUNT, encodeCurveData());
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/INVALID_ARGS');
    }));
    it('reverts if ERC20->ERC20 receives an ETH output token', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(sellToken.address, ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, encodeCurveData());
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/INVALID_ARGS');
    }));
    it('reverts if ERC20->ETH receives an ETH input token', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForEth(ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, encodeCurveData());
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/INVALID_ARGS');
    }));
    it('reverts if ETH->ERC20 receives an ETH output token', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(ETH_COIN_IDX);
        const call = lp.sellEthForToken(ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, encodeCurveData());
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('CurveLiquidityProvider/INVALID_ARGS');
    }));
    it('emits a LiquidityProviderFill event', () => __awaiter(this, void 0, void 0, function* () {
        yield fundProviderContractAsync(SELL_TOKEN_COIN_IDX);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, encodeCurveData());
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                inputToken: sellToken.address,
                outputToken: buyToken.address,
                inputTokenAmount: SELL_AMOUNT,
                outputTokenAmount: BUY_AMOUNT,
                sourceId: utils_1.hexUtils.rightPad(utils_1.hexUtils.toHex(Buffer.from('Curve'))),
                sourceAddress: testCurve.address,
                sender: taker,
                recipient: RECIPIENT,
            },
        ], 'LiquidityProviderFill');
    }));
});
//# sourceMappingURL=curve_test.js.map