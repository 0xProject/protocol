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
contracts_test_utils_1.blockchainTests.resets('MooniswapLiquidityProvider feature', env => {
    let lp;
    let sellToken;
    let buyToken;
    let weth;
    let testMooniswap;
    let owner;
    let taker;
    let mooniswapData;
    const RECIPIENT = utils_1.hexUtils.random(20);
    const ETH_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const { NULL_ADDRESS, ZERO_AMOUNT } = contracts_test_utils_1.constants;
    const SELL_AMOUNT = contracts_test_utils_1.getRandomInteger('1e18', '10e18');
    const BUY_AMOUNT = contracts_test_utils_1.getRandomInteger('1e18', '10e18');
    before(() => __awaiter(this, void 0, void 0, function* () {
        [owner, taker] = yield env.getAccountAddressesAsync();
        [sellToken, buyToken] = yield Promise.all(new Array(2)
            .fill(0)
            .map(() => __awaiter(this, void 0, void 0, function* () {
            return wrappers_1.TestMintableERC20TokenContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestMintableERC20Token, env.provider, env.txDefaults, artifacts_1.artifacts);
        })));
        weth = yield wrappers_1.TestWethContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestWeth, env.provider, env.txDefaults, artifacts_1.artifacts);
        testMooniswap = yield wrappers_1.TestMooniswapContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestMooniswap, env.provider, Object.assign({}, env.txDefaults), artifacts_1.artifacts);
        lp = yield wrappers_1.MooniswapLiquidityProviderContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.MooniswapLiquidityProvider, env.provider, Object.assign({}, env.txDefaults, { from: taker }), artifacts_1.artifacts, weth.address);
        mooniswapData = utils_1.hexUtils.leftPad(testMooniswap.address);
    }));
    function prepareNextSwapFundsAsync(sellTokenAddress, sellAmount, buyTokenAddress, buyAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            if (sellTokenAddress.toLowerCase() === weth.address.toLowerCase()) {
                yield weth.deposit().awaitTransactionSuccessAsync({
                    from: taker,
                    value: sellAmount,
                });
                yield weth.transfer(lp.address, sellAmount).awaitTransactionSuccessAsync({ from: taker });
            }
            else if (sellTokenAddress.toLowerCase() === sellToken.address.toLowerCase()) {
                yield sellToken.mint(lp.address, sellAmount).awaitTransactionSuccessAsync();
            }
            else {
                yield yield env.web3Wrapper.awaitTransactionSuccessAsync(yield env.web3Wrapper.sendTransactionAsync({
                    to: lp.address,
                    from: taker,
                    value: sellAmount,
                }));
            }
            yield testMooniswap.setNextBoughtAmount(buyAmount).awaitTransactionSuccessAsync({
                value: buyTokenAddress.toLowerCase() === ETH_TOKEN_ADDRESS.toLowerCase() ? buyAmount : ZERO_AMOUNT,
            });
        });
    }
    it('can swap ERC20->ERC20', () => __awaiter(this, void 0, void 0, function* () {
        yield prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: ZERO_AMOUNT,
                sellToken: sellToken.address,
                buyToken: buyToken.address,
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
                referral: NULL_ADDRESS,
            },
        ], 'MooniswapCalled');
    }));
    it('can swap ERC20->ETH', () => __awaiter(this, void 0, void 0, function* () {
        yield prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, ETH_TOKEN_ADDRESS, BUY_AMOUNT);
        const call = lp.sellTokenForEth(sellToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield env.web3Wrapper.getBalanceInWeiAsync(RECIPIENT)).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: ZERO_AMOUNT,
                sellToken: sellToken.address,
                buyToken: NULL_ADDRESS,
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
                referral: NULL_ADDRESS,
            },
        ], 'MooniswapCalled');
    }));
    it('can swap ETH->ERC20', () => __awaiter(this, void 0, void 0, function* () {
        yield prepareNextSwapFundsAsync(ETH_TOKEN_ADDRESS, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        const call = lp.sellEthForToken(buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: SELL_AMOUNT,
                sellToken: NULL_ADDRESS,
                buyToken: buyToken.address,
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
                referral: NULL_ADDRESS,
            },
        ], 'MooniswapCalled');
    }));
    it('can swap ETH->ERC20 with attached ETH', () => __awaiter(this, void 0, void 0, function* () {
        yield testMooniswap.setNextBoughtAmount(BUY_AMOUNT).awaitTransactionSuccessAsync();
        const call = lp.sellEthForToken(buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = yield call.callAsync({ value: SELL_AMOUNT });
        const { logs } = yield call.awaitTransactionSuccessAsync({ value: SELL_AMOUNT });
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: SELL_AMOUNT,
                sellToken: NULL_ADDRESS,
                buyToken: buyToken.address,
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
                referral: NULL_ADDRESS,
            },
        ], 'MooniswapCalled');
    }));
    it('can swap ERC20->WETH', () => __awaiter(this, void 0, void 0, function* () {
        yield prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, ETH_TOKEN_ADDRESS, // Mooni contract holds ETH.
        BUY_AMOUNT);
        const call = lp.sellTokenForToken(sellToken.address, weth.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield sellToken.balanceOf(testMooniswap.address).callAsync()).to.bignumber.eq(SELL_AMOUNT);
        contracts_test_utils_1.expect(yield weth.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: ZERO_AMOUNT,
                sellToken: sellToken.address,
                buyToken: NULL_ADDRESS,
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
                referral: NULL_ADDRESS,
            },
        ], 'MooniswapCalled');
    }));
    it('can swap WETH->ERC20', () => __awaiter(this, void 0, void 0, function* () {
        yield prepareNextSwapFundsAsync(weth.address, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        const call = lp.sellTokenForToken(weth.address, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const boughtAmount = yield call.callAsync();
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(boughtAmount).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.expect(yield env.web3Wrapper.getBalanceInWeiAsync(testMooniswap.address)).to.bignumber.eq(SELL_AMOUNT);
        contracts_test_utils_1.expect(yield buyToken.balanceOf(RECIPIENT).callAsync()).to.bignumber.eq(BUY_AMOUNT);
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                value: SELL_AMOUNT,
                sellToken: NULL_ADDRESS,
                buyToken: buyToken.address,
                sellAmount: SELL_AMOUNT,
                minBuyAmount: BUY_AMOUNT,
                referral: NULL_ADDRESS,
            },
        ], 'MooniswapCalled');
    }));
    it('reverts if pool reverts', () => __awaiter(this, void 0, void 0, function* () {
        yield prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        yield testMooniswap.setNextBoughtAmount(BUY_AMOUNT.minus(1)).awaitTransactionSuccessAsync();
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('UNDERBOUGHT');
    }));
    it('reverts if ERC20->ERC20 is the same token', () => __awaiter(this, void 0, void 0, function* () {
        const call = lp.sellTokenForToken(sellToken.address, sellToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    }));
    it('reverts if ERC20->ERC20 receives an ETH input token', () => __awaiter(this, void 0, void 0, function* () {
        const call = lp.sellTokenForToken(ETH_TOKEN_ADDRESS, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    }));
    it('reverts if ERC20->ERC20 receives an ETH output token', () => __awaiter(this, void 0, void 0, function* () {
        const call = lp.sellTokenForToken(sellToken.address, ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    }));
    it('reverts if ERC20->ETH receives an ETH input token', () => __awaiter(this, void 0, void 0, function* () {
        const call = lp.sellTokenForEth(ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    }));
    it('reverts if ETH->ERC20 receives an ETH output token', () => __awaiter(this, void 0, void 0, function* () {
        const call = lp.sellEthForToken(ETH_TOKEN_ADDRESS, RECIPIENT, BUY_AMOUNT, mooniswapData);
        return contracts_test_utils_1.expect(call.callAsync()).to.revertWith('MooniswapLiquidityProvider/INVALID_ARGS');
    }));
    it('emits a LiquidityProviderFill event', () => __awaiter(this, void 0, void 0, function* () {
        yield prepareNextSwapFundsAsync(sellToken.address, SELL_AMOUNT, buyToken.address, BUY_AMOUNT);
        const call = lp.sellTokenForToken(sellToken.address, buyToken.address, RECIPIENT, BUY_AMOUNT, mooniswapData);
        const { logs } = yield call.awaitTransactionSuccessAsync();
        contracts_test_utils_1.verifyEventsFromLogs(logs, [
            {
                inputToken: sellToken.address,
                outputToken: buyToken.address,
                inputTokenAmount: SELL_AMOUNT,
                outputTokenAmount: BUY_AMOUNT,
                sourceId: utils_1.hexUtils.rightPad(utils_1.hexUtils.toHex(Buffer.from('Mooniswap'))),
                sourceAddress: testMooniswap.address,
                sender: taker,
                recipient: RECIPIENT,
            },
        ], 'LiquidityProviderFill');
    }));
});
//# sourceMappingURL=mooniswap_test.js.map