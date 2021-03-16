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
const ethjs = require("ethereumjs-util");
const artifacts_1 = require("./artifacts");
const wrappers_1 = require("./wrappers");
contracts_test_utils_1.blockchainTests.resets('PermissionlessTransformerDeployer', env => {
    let owner;
    let sender;
    let deployer;
    const deployBytes = artifacts_1.artifacts.TestPermissionlessTransformerDeployerTransformer.compilerOutput.evm.bytecode.object;
    before(() => __awaiter(this, void 0, void 0, function* () {
        [owner, sender] = yield env.getAccountAddressesAsync();
        deployer = yield wrappers_1.PermissionlessTransformerDeployerContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.PermissionlessTransformerDeployer, env.provider, env.txDefaults, artifacts_1.artifacts);
    }));
    describe('deploy()', () => {
        it('can deploy safe contract', () => __awaiter(this, void 0, void 0, function* () {
            const salt = utils_1.hexUtils.random();
            const targetAddress = yield deployer.deploy(deployBytes, salt).callAsync();
            const target = new wrappers_1.TestPermissionlessTransformerDeployerTransformerContract(targetAddress, env.provider);
            const receipt = yield deployer.deploy(deployBytes, salt).awaitTransactionSuccessAsync({ from: sender });
            contracts_test_utils_1.expect(yield target.deployer().callAsync()).to.eq(deployer.address);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ deployedAddress: targetAddress, salt, sender }], wrappers_1.PermissionlessTransformerDeployerEvents.Deployed);
        }));
        it('deploys at predictable address', () => __awaiter(this, void 0, void 0, function* () {
            const salt = utils_1.hexUtils.random();
            const targetAddress = yield deployer.deploy(deployBytes, salt).callAsync();
            const initCodeHash = utils_1.hexUtils.toHex(ethjs.sha3(deployBytes));
            const expectedAddress = utils_1.hexUtils.slice(utils_1.hexUtils.toHex(ethjs.sha3(utils_1.hexUtils.concat('0xFF', deployer.address, salt, initCodeHash))), 12);
            contracts_test_utils_1.expect(targetAddress).to.eq(expectedAddress);
        }));
        it('cannot deploy suicidal contract', () => __awaiter(this, void 0, void 0, function* () {
            const suicidalDeployBytes = artifacts_1.artifacts.TestPermissionlessTransformerDeployerSuicidal.compilerOutput.evm.bytecode.object;
            const tx = deployer.deploy(suicidalDeployBytes, utils_1.hexUtils.random()).awaitTransactionSuccessAsync();
            contracts_test_utils_1.expect(tx).to.revertWith('PermissionlessTransformerDeployer/UNSAFE_CODE');
        }));
        it('can deploy safe contract with value', () => __awaiter(this, void 0, void 0, function* () {
            const salt = utils_1.hexUtils.random();
            const targetAddress = yield deployer.deploy(deployBytes, salt).callAsync({ from: sender, value: 1 });
            const target = new wrappers_1.TestPermissionlessTransformerDeployerTransformerContract(targetAddress, env.provider);
            const receipt = yield deployer
                .deploy(deployBytes, salt)
                .awaitTransactionSuccessAsync({ from: sender, value: 1 });
            contracts_test_utils_1.expect(yield target.deployer().callAsync()).to.eq(deployer.address);
            contracts_test_utils_1.verifyEventsFromLogs(receipt.logs, [{ deployedAddress: targetAddress, salt, sender }], wrappers_1.PermissionlessTransformerDeployerEvents.Deployed);
            contracts_test_utils_1.expect(yield env.web3Wrapper.getBalanceInWeiAsync(targetAddress)).to.bignumber.eq(1);
        }));
        it('reverts if constructor throws', () => __awaiter(this, void 0, void 0, function* () {
            const CONSTRUCTOR_FAIL_VALUE = new utils_1.BigNumber(3333);
            const tx = deployer
                .deploy(deployBytes, utils_1.hexUtils.random())
                .callAsync({ value: CONSTRUCTOR_FAIL_VALUE, from: sender });
            return contracts_test_utils_1.expect(tx).to.revertWith('PermissionlessTransformerDeployer/DEPLOY_FAILED');
        }));
        it('can retrieve deployment salt from contract address', () => __awaiter(this, void 0, void 0, function* () {
            const salt = utils_1.hexUtils.random();
            const targetAddress = yield deployer.deploy(deployBytes, salt).callAsync({ from: sender });
            yield deployer.deploy(deployBytes, salt).awaitTransactionSuccessAsync({ from: sender });
            contracts_test_utils_1.expect(yield deployer.toDeploymentSalt(targetAddress).callAsync()).to.eq(salt);
        }));
        it('can retrieve deployment init code hash from contract address', () => __awaiter(this, void 0, void 0, function* () {
            const salt = utils_1.hexUtils.random();
            const targetAddress = yield deployer.deploy(deployBytes, salt).callAsync({ from: sender });
            yield deployer.deploy(deployBytes, salt).awaitTransactionSuccessAsync({ from: sender });
            contracts_test_utils_1.expect(utils_1.hexUtils.toHex(yield deployer.toInitCodeHash(targetAddress).callAsync())).to.eq(utils_1.hexUtils.toHex(ethjs.sha3(deployBytes)));
        }));
    });
});
//# sourceMappingURL=permissionless_transformer_deployer_test.js.map