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
const wrappers_1 = require("../wrappers");
const { ZERO_AMOUNT } = contracts_test_utils_1.constants;
contracts_test_utils_1.blockchainTests.resets('PositiveSlippageFeeTransformer', env => {
    const recipient = contracts_test_utils_1.randomAddress();
    let caller;
    let token;
    let transformer;
    let host;
    before(() => __awaiter(this, void 0, void 0, function* () {
        [caller] = yield env.getAccountAddressesAsync();
        token = yield wrappers_1.TestMintableERC20TokenContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestMintableERC20Token, env.provider, env.txDefaults, artifacts_1.artifacts);
        transformer = yield wrappers_1.PositiveSlippageFeeTransformerContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.PositiveSlippageFeeTransformer, env.provider, env.txDefaults, artifacts_1.artifacts);
        host = yield wrappers_1.TestTransformerHostContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestTransformerHost, env.provider, Object.assign({}, env.txDefaults, { from: caller }), artifacts_1.artifacts);
    }));
    function getBalancesAsync(owner) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                ethBalance: yield env.web3Wrapper.getBalanceInWeiAsync(owner),
                tokenBalance: yield token.balanceOf(owner).callAsync(),
            };
        });
    }
    function mintHostTokensAsync(amount) {
        return __awaiter(this, void 0, void 0, function* () {
            yield token.mint(host.address, amount).awaitTransactionSuccessAsync();
        });
    }
    it('does not transfer positive slippage fees when bestCaseAmount is equal to amount', () => __awaiter(this, void 0, void 0, function* () {
        const amount = contracts_test_utils_1.getRandomInteger(1, '1e18');
        const data = protocol_utils_1.encodePositiveSlippageFeeTransformerData({
            token: token.address,
            bestCaseAmount: amount,
            recipient,
        });
        yield mintHostTokensAsync(amount);
        const beforeBalanceHost = yield getBalancesAsync(host.address);
        const beforeBalanceRecipient = yield getBalancesAsync(recipient);
        yield host
            .rawExecuteTransform(transformer.address, {
            data,
            sender: contracts_test_utils_1.randomAddress(),
            taker: contracts_test_utils_1.randomAddress(),
        })
            .awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(yield getBalancesAsync(host.address)).to.deep.eq(beforeBalanceHost);
        contracts_test_utils_1.expect(yield getBalancesAsync(recipient)).to.deep.eq(beforeBalanceRecipient);
    }));
    it('does not transfer positive slippage fees when bestCaseAmount is higher than amount', () => __awaiter(this, void 0, void 0, function* () {
        const amount = contracts_test_utils_1.getRandomInteger(1, '1e18');
        const bestCaseAmount = amount.times(1.1).decimalPlaces(0, utils_1.BigNumber.ROUND_FLOOR);
        const data = protocol_utils_1.encodePositiveSlippageFeeTransformerData({
            token: token.address,
            bestCaseAmount,
            recipient,
        });
        yield mintHostTokensAsync(amount);
        const beforeBalanceHost = yield getBalancesAsync(host.address);
        const beforeBalanceRecipient = yield getBalancesAsync(recipient);
        yield host
            .rawExecuteTransform(transformer.address, {
            data,
            sender: contracts_test_utils_1.randomAddress(),
            taker: contracts_test_utils_1.randomAddress(),
        })
            .awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(yield getBalancesAsync(host.address)).to.deep.eq(beforeBalanceHost);
        contracts_test_utils_1.expect(yield getBalancesAsync(recipient)).to.deep.eq(beforeBalanceRecipient);
    }));
    it('send positive slippage fee to recipient when bestCaseAmount is lower than amount', () => __awaiter(this, void 0, void 0, function* () {
        const amount = contracts_test_utils_1.getRandomInteger(1, '1e18');
        const bestCaseAmount = amount.times(0.95).decimalPlaces(0, utils_1.BigNumber.ROUND_FLOOR);
        const data = protocol_utils_1.encodePositiveSlippageFeeTransformerData({
            token: token.address,
            bestCaseAmount,
            recipient,
        });
        yield mintHostTokensAsync(amount);
        yield host
            .rawExecuteTransform(transformer.address, {
            data,
            sender: contracts_test_utils_1.randomAddress(),
            taker: contracts_test_utils_1.randomAddress(),
        })
            .awaitTransactionSuccessAsync();
        contracts_test_utils_1.expect(yield getBalancesAsync(host.address)).to.deep.eq({
            tokenBalance: bestCaseAmount,
            ethBalance: ZERO_AMOUNT,
        });
        contracts_test_utils_1.expect(yield getBalancesAsync(recipient)).to.deep.eq({
            tokenBalance: amount.minus(bestCaseAmount),
            ethBalance: ZERO_AMOUNT,
        });
    }));
});
//# sourceMappingURL=positive_slippage_fee_transformer_test.js.map