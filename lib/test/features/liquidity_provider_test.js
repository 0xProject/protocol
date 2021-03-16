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
const contracts_erc20_1 = require("@0x/contracts-erc20");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const utils_1 = require("@0x/utils");
const constants_1 = require("../../src/constants");
const wrappers_1 = require("../../src/wrappers");
const artifacts_1 = require("../artifacts");
const abis_1 = require("../utils/abis");
const migration_1 = require("../utils/migration");
const wrappers_2 = require("../wrappers");
contracts_test_utils_1.blockchainTests('LiquidityProvider feature', env => {
    let zeroEx;
    let feature;
    let sandbox;
    let liquidityProvider;
    let token;
    let weth;
    let owner;
    let taker;
    before(() => __awaiter(this, void 0, void 0, function* () {
        [owner, taker] = yield env.getAccountAddressesAsync();
        zeroEx = yield migration_1.fullMigrateAsync(owner, env.provider, env.txDefaults, {});
        token = yield contracts_erc20_1.DummyERC20TokenContract.deployFrom0xArtifactAsync(contracts_erc20_1.artifacts.DummyERC20Token, env.provider, env.txDefaults, contracts_erc20_1.artifacts, contracts_test_utils_1.constants.DUMMY_TOKEN_NAME, contracts_test_utils_1.constants.DUMMY_TOKEN_SYMBOL, contracts_test_utils_1.constants.DUMMY_TOKEN_DECIMALS, contracts_test_utils_1.constants.DUMMY_TOKEN_TOTAL_SUPPLY);
        yield token.setBalance(taker, contracts_test_utils_1.constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync();
        weth = yield wrappers_2.TestWethContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestWeth, env.provider, env.txDefaults, artifacts_1.artifacts);
        yield token
            .approve(zeroEx.address, contracts_test_utils_1.constants.INITIAL_ERC20_ALLOWANCE)
            .awaitTransactionSuccessAsync({ from: taker });
        feature = new wrappers_1.LiquidityProviderFeatureContract(zeroEx.address, env.provider, env.txDefaults, abis_1.abis);
        sandbox = yield wrappers_2.LiquidityProviderSandboxContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.LiquidityProviderSandbox, env.provider, env.txDefaults, artifacts_1.artifacts, zeroEx.address);
        const featureImpl = yield wrappers_1.LiquidityProviderFeatureContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.LiquidityProviderFeature, env.provider, env.txDefaults, artifacts_1.artifacts, sandbox.address, constants_1.ZERO_BYTES32);
        yield new wrappers_1.IOwnableFeatureContract(zeroEx.address, env.provider, env.txDefaults, abis_1.abis)
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();
        liquidityProvider = yield wrappers_2.TestLiquidityProviderContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestLiquidityProvider, env.provider, env.txDefaults, artifacts_1.artifacts, token.address, weth.address);
    }));
    contracts_test_utils_1.blockchainTests.resets('Sandbox', () => {
        it('Cannot call sandbox `executeSellTokenForToken` function directly', () => __awaiter(this, void 0, void 0, function* () {
            const tx = sandbox
                .executeSellTokenForToken(liquidityProvider.address, token.address, weth.address, taker, contracts_test_utils_1.constants.ZERO_AMOUNT, contracts_test_utils_1.constants.NULL_BYTES)
                .awaitTransactionSuccessAsync({ from: taker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.OwnableRevertErrors.OnlyOwnerError(taker));
        }));
        it('Cannot call sandbox `executeSellEthForToken` function directly', () => __awaiter(this, void 0, void 0, function* () {
            const tx = sandbox
                .executeSellEthForToken(liquidityProvider.address, token.address, taker, contracts_test_utils_1.constants.ZERO_AMOUNT, contracts_test_utils_1.constants.NULL_BYTES)
                .awaitTransactionSuccessAsync({ from: taker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.OwnableRevertErrors.OnlyOwnerError(taker));
        }));
        it('Cannot call sandbox `executeSellTokenForEth` function directly', () => __awaiter(this, void 0, void 0, function* () {
            const tx = sandbox
                .executeSellTokenForEth(liquidityProvider.address, token.address, taker, contracts_test_utils_1.constants.ZERO_AMOUNT, contracts_test_utils_1.constants.NULL_BYTES)
                .awaitTransactionSuccessAsync({ from: taker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.OwnableRevertErrors.OnlyOwnerError(taker));
        }));
    });
    contracts_test_utils_1.blockchainTests.resets('Swap', () => {
        const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        it('Successfully executes an ERC20-ERC20 swap', () => __awaiter(this, void 0, void 0, function* () {
            const tx = yield feature
                .sellToLiquidityProvider(token.address, weth.address, liquidityProvider.address, contracts_test_utils_1.constants.NULL_ADDRESS, contracts_test_utils_1.constants.ONE_ETHER, contracts_test_utils_1.constants.ZERO_AMOUNT, contracts_test_utils_1.constants.NULL_BYTES)
                .awaitTransactionSuccessAsync({ from: taker });
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, [
                {
                    inputToken: token.address,
                    outputToken: weth.address,
                    recipient: taker,
                    minBuyAmount: contracts_test_utils_1.constants.ZERO_AMOUNT,
                    inputTokenBalance: contracts_test_utils_1.constants.ONE_ETHER,
                },
            ], wrappers_2.TestLiquidityProviderEvents.SellTokenForToken);
        }));
        it('Reverts if cannot fulfill the minimum buy amount', () => __awaiter(this, void 0, void 0, function* () {
            const minBuyAmount = new utils_1.BigNumber(1);
            const tx = feature
                .sellToLiquidityProvider(token.address, weth.address, liquidityProvider.address, contracts_test_utils_1.constants.NULL_ADDRESS, contracts_test_utils_1.constants.ONE_ETHER, minBuyAmount, contracts_test_utils_1.constants.NULL_BYTES)
                .awaitTransactionSuccessAsync({ from: taker });
            return contracts_test_utils_1.expect(tx).to.revertWith(new utils_1.ZeroExRevertErrors.LiquidityProvider.LiquidityProviderIncompleteSellError(liquidityProvider.address, weth.address, token.address, contracts_test_utils_1.constants.ONE_ETHER, contracts_test_utils_1.constants.ZERO_AMOUNT, minBuyAmount));
        }));
        it('Successfully executes an ETH-ERC20 swap', () => __awaiter(this, void 0, void 0, function* () {
            const tx = yield feature
                .sellToLiquidityProvider(ETH_TOKEN_ADDRESS, token.address, liquidityProvider.address, contracts_test_utils_1.constants.NULL_ADDRESS, contracts_test_utils_1.constants.ONE_ETHER, contracts_test_utils_1.constants.ZERO_AMOUNT, contracts_test_utils_1.constants.NULL_BYTES)
                .awaitTransactionSuccessAsync({ from: taker, value: contracts_test_utils_1.constants.ONE_ETHER });
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, [
                {
                    outputToken: token.address,
                    recipient: taker,
                    minBuyAmount: contracts_test_utils_1.constants.ZERO_AMOUNT,
                    ethBalance: contracts_test_utils_1.constants.ONE_ETHER,
                },
            ], wrappers_2.TestLiquidityProviderEvents.SellEthForToken);
        }));
        it('Successfully executes an ERC20-ETH swap', () => __awaiter(this, void 0, void 0, function* () {
            const tx = yield feature
                .sellToLiquidityProvider(token.address, ETH_TOKEN_ADDRESS, liquidityProvider.address, contracts_test_utils_1.constants.NULL_ADDRESS, contracts_test_utils_1.constants.ONE_ETHER, contracts_test_utils_1.constants.ZERO_AMOUNT, contracts_test_utils_1.constants.NULL_BYTES)
                .awaitTransactionSuccessAsync({ from: taker });
            contracts_test_utils_1.verifyEventsFromLogs(tx.logs, [
                {
                    inputToken: token.address,
                    recipient: taker,
                    minBuyAmount: contracts_test_utils_1.constants.ZERO_AMOUNT,
                    inputTokenBalance: contracts_test_utils_1.constants.ONE_ETHER,
                },
            ], wrappers_2.TestLiquidityProviderEvents.SellTokenForEth);
        }));
    });
});
//# sourceMappingURL=liquidity_provider_test.js.map