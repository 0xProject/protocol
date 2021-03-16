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
const bloom_filter_utils_1 = require("../src/bloom_filter_utils");
const artifacts_1 = require("./artifacts");
const wrappers_1 = require("./wrappers");
contracts_test_utils_1.blockchainTests.resets('FixinTokenSpender', env => {
    let tokenSpender;
    let token;
    let greedyToken;
    let greedyTokensBloomFilter;
    before(() => __awaiter(this, void 0, void 0, function* () {
        token = yield wrappers_1.TestTokenSpenderERC20TokenContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestTokenSpenderERC20Token, env.provider, env.txDefaults, artifacts_1.artifacts);
        greedyToken = yield wrappers_1.TestTokenSpenderERC20TokenContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestTokenSpenderERC20Token, env.provider, env.txDefaults, artifacts_1.artifacts);
        yield greedyToken.setGreedyRevert(true).awaitTransactionSuccessAsync();
        greedyTokensBloomFilter = bloom_filter_utils_1.getTokenListBloomFilter([greedyToken.address]);
        tokenSpender = yield wrappers_1.TestFixinTokenSpenderContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestFixinTokenSpender, env.provider, env.txDefaults, artifacts_1.artifacts, greedyTokensBloomFilter);
    }));
    describe('transferERC20Tokens()', () => {
        const EMPTY_RETURN_AMOUNT = 1337;
        const FALSE_RETURN_AMOUNT = 1338;
        const REVERT_RETURN_AMOUNT = 1339;
        const TRIGGER_FALLBACK_SUCCESS_AMOUNT = 1340;
        const EXTRA_RETURN_TRUE_AMOUNT = 1341;
        const EXTRA_RETURN_FALSE_AMOUNT = 1342;
        it('transferERC20Tokens() successfully calls compliant ERC20 token', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(123456);
            const receipt = yield tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    sender: tokenSpender.address,
                    from: tokenFrom,
                    to: tokenTo,
                    amount: tokenAmount,
                },
            ], wrappers_1.TestTokenSpenderERC20TokenEvents.TransferFromCalled);
        }));
        it('transferERC20Tokens() successfully calls non-compliant ERC20 token', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(EMPTY_RETURN_AMOUNT);
            const receipt = yield tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    sender: tokenSpender.address,
                    from: tokenFrom,
                    to: tokenTo,
                    amount: tokenAmount,
                },
            ], wrappers_1.TestTokenSpenderERC20TokenEvents.TransferFromCalled);
        }));
        it('transferERC20Tokens() reverts if ERC20 token reverts', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(REVERT_RETURN_AMOUNT);
            const tx = tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            const expectedError = new utils_1.ZeroExRevertErrors.Spender.SpenderERC20TransferFromFailedError(token.address, tokenFrom, tokenTo, tokenAmount, new utils_1.StringRevertError('TestTokenSpenderERC20Token/Revert').encode());
            return contracts_test_utils_1.expect(tx).to.revertWith(expectedError);
        }));
        it('transferERC20Tokens() reverts if ERC20 token returns false', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(FALSE_RETURN_AMOUNT);
            const tx = tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.ZeroExRevertErrors.Spender.SpenderERC20TransferFromFailedError(token.address, tokenFrom, tokenTo, tokenAmount, utils_1.hexUtils.leftPad(0)));
        }));
        it('transferERC20Tokens() falls back successfully to TokenSpender._spendERC20Tokens()', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(TRIGGER_FALLBACK_SUCCESS_AMOUNT);
            const receipt = yield tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    token: token.address,
                    owner: tokenFrom,
                    to: tokenTo,
                    amount: tokenAmount,
                },
            ], wrappers_1.TestFixinTokenSpenderEvents.FallbackCalled);
        }));
        it('transferERC20Tokens() allows extra data after true', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(EXTRA_RETURN_TRUE_AMOUNT);
            const receipt = yield tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    sender: tokenSpender.address,
                    from: tokenFrom,
                    to: tokenTo,
                    amount: tokenAmount,
                },
            ], wrappers_1.TestTokenSpenderERC20TokenEvents.TransferFromCalled);
        }));
        it("transferERC20Tokens() reverts when there's extra data after false", () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(EXTRA_RETURN_FALSE_AMOUNT);
            const tx = tokenSpender
                .transferERC20Tokens(token.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.ZeroExRevertErrors.Spender.SpenderERC20TransferFromFailedError(token.address, tokenFrom, tokenTo, tokenAmount, utils_1.hexUtils.leftPad(EXTRA_RETURN_FALSE_AMOUNT, 64)));
        }));
        it('transferERC20Tokens() cannot call self', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(123456);
            const tx = tokenSpender
                .transferERC20Tokens(tokenSpender.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            return contracts_test_utils_1.expect(tx).to.revertWith('FixinTokenSpender/CANNOT_INVOKE_SELF');
        }));
        it('calls transferFrom() directly for a greedy token with allowance', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(123456);
            yield greedyToken.approveAs(tokenFrom, tokenSpender.address, tokenAmount).awaitTransactionSuccessAsync();
            const receipt = yield tokenSpender
                .transferERC20Tokens(greedyToken.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            // Because there is an allowance set, we will call transferFrom()
            // directly, which succeds and emits an event.
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    sender: tokenSpender.address,
                    from: tokenFrom,
                    to: tokenTo,
                    amount: tokenAmount,
                },
            ], // No events.
            wrappers_1.TestTokenSpenderERC20TokenEvents.TransferFromCalled);
        }));
        it('calls only the fallback for a greedy token with no allowance', () => __awaiter(this, void 0, void 0, function* () {
            const tokenFrom = contracts_test_utils_1.randomAddress();
            const tokenTo = contracts_test_utils_1.randomAddress();
            const tokenAmount = new utils_1.BigNumber(TRIGGER_FALLBACK_SUCCESS_AMOUNT);
            const receipt = yield tokenSpender
                .transferERC20Tokens(greedyToken.address, tokenFrom, tokenTo, tokenAmount)
                .awaitTransactionSuccessAsync();
            // Because this is a greedy token and there is no allowance set, transferFrom()
            // will not be called before hitting the fallback, which only emits an event
            // in the test contract.
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [], // No events.
            wrappers_1.TestTokenSpenderERC20TokenEvents.TransferFromCalled);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [
                {
                    token: greedyToken.address,
                    owner: tokenFrom,
                    to: tokenTo,
                    amount: tokenAmount,
                },
            ], wrappers_1.TestFixinTokenSpenderEvents.FallbackCalled);
        }));
    });
    describe('isTokenPossiblyGreedy()', () => {
        it('returns true for greedy token', () => __awaiter(this, void 0, void 0, function* () {
            const isGreedy = yield tokenSpender.isTokenPossiblyGreedy(greedyToken.address).callAsync();
            contracts_test_utils_1.expect(isGreedy).to.eq(true);
        }));
        it('returns false for non-greedy token', () => __awaiter(this, void 0, void 0, function* () {
            const isGreedy = yield tokenSpender.isTokenPossiblyGreedy(token.address).callAsync();
            contracts_test_utils_1.expect(isGreedy).to.eq(false);
        }));
    });
    describe('getSpendableERC20BalanceOf()', () => {
        it("returns the minimum of the owner's balance and allowance", () => __awaiter(this, void 0, void 0, function* () {
            const balance = contracts_test_utils_1.getRandomInteger(1, '1e18');
            const allowance = contracts_test_utils_1.getRandomInteger(1, '1e18');
            const tokenOwner = contracts_test_utils_1.randomAddress();
            yield token
                .setBalanceAndAllowanceOf(tokenOwner, balance, tokenSpender.address, allowance)
                .awaitTransactionSuccessAsync();
            const spendableBalance = yield tokenSpender
                .getSpendableERC20BalanceOf(token.address, tokenOwner)
                .callAsync();
            contracts_test_utils_1.expect(spendableBalance).to.bignumber.eq(utils_1.BigNumber.min(balance, allowance));
        }));
    });
});
//# sourceMappingURL=fixin_token_spender_test.js.map