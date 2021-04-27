import { blockchainTests, expect, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { artifacts } from './artifacts';
import {
    PermissionlessTransformerDeployerContract,
    PermissionlessTransformerDeployerEvents,
    TestPermissionlessTransformerDeployerTransformerContract,
} from './wrappers';

blockchainTests.resets('PermissionlessTransformerDeployer', env => {
    let sender: string;
    let deployer: PermissionlessTransformerDeployerContract;
    const deployBytes = artifacts.TestPermissionlessTransformerDeployerTransformer.compilerOutput.evm.bytecode.object;

    before(async () => {
        [, sender] = await env.getAccountAddressesAsync();
        deployer = await PermissionlessTransformerDeployerContract.deployFrom0xArtifactAsync(
            artifacts.PermissionlessTransformerDeployer,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    });

    describe('deploy()', () => {
        it('can deploy safe contract', async () => {
            const salt = hexUtils.random();
            const targetAddress = await deployer.deploy(deployBytes, salt).callAsync();
            const target = new TestPermissionlessTransformerDeployerTransformerContract(targetAddress, env.provider);
            const receipt = await deployer.deploy(deployBytes, salt).awaitTransactionSuccessAsync({ from: sender });
            expect(await target.deployer().callAsync()).to.eq(deployer.address);
            verifyEventsFromLogs(
                receipt.logs,
                [{ deployedAddress: targetAddress, salt, sender }],
                PermissionlessTransformerDeployerEvents.Deployed,
            );
        });

        it('deploys at predictable address', async () => {
            const salt = hexUtils.random();
            const targetAddress = await deployer.deploy(deployBytes, salt).callAsync();
            const initCodeHash = hexUtils.hash(deployBytes);
            const expectedAddress = hexUtils.slice(
                hexUtils.hash(hexUtils.concat('0xFF', deployer.address, salt, initCodeHash)),
                12,
            );

            expect(targetAddress).to.eq(expectedAddress);
        });

        it('cannot deploy suicidal contract', async () => {
            const suicidalDeployBytes =
                artifacts.TestPermissionlessTransformerDeployerSuicidal.compilerOutput.evm.bytecode.object;

            const tx = deployer.deploy(suicidalDeployBytes, hexUtils.random()).awaitTransactionSuccessAsync();
            expect(tx).to.revertWith('PermissionlessTransformerDeployer/UNSAFE_CODE');
        });

        it('can deploy safe contract with value', async () => {
            const salt = hexUtils.random();
            const targetAddress = await deployer.deploy(deployBytes, salt).callAsync({ from: sender, value: 1 });
            const target = new TestPermissionlessTransformerDeployerTransformerContract(targetAddress, env.provider);
            const receipt = await deployer
                .deploy(deployBytes, salt)
                .awaitTransactionSuccessAsync({ from: sender, value: 1 });
            expect(await target.deployer().callAsync()).to.eq(deployer.address);
            verifyEventsFromLogs(
                receipt.logs,
                [{ deployedAddress: targetAddress, salt, sender }],
                PermissionlessTransformerDeployerEvents.Deployed,
            );
            expect(await env.web3Wrapper.getBalanceInWeiAsync(targetAddress)).to.bignumber.eq(1);
        });

        it('reverts if constructor throws', async () => {
            const CONSTRUCTOR_FAIL_VALUE = new BigNumber(3333);
            const tx = deployer
                .deploy(deployBytes, hexUtils.random())
                .callAsync({ value: CONSTRUCTOR_FAIL_VALUE, from: sender });
            return expect(tx).to.revertWith('PermissionlessTransformerDeployer/DEPLOY_FAILED');
        });

        it('can retrieve deployment salt from contract address', async () => {
            const salt = hexUtils.random();
            const targetAddress = await deployer.deploy(deployBytes, salt).callAsync({ from: sender });
            await deployer.deploy(deployBytes, salt).awaitTransactionSuccessAsync({ from: sender });
            expect(await deployer.toDeploymentSalt(targetAddress).callAsync()).to.eq(salt);
        });

        it('can retrieve deployment init code hash from contract address', async () => {
            const salt = hexUtils.random();
            const targetAddress = await deployer.deploy(deployBytes, salt).callAsync({ from: sender });
            await deployer.deploy(deployBytes, salt).awaitTransactionSuccessAsync({ from: sender });
            expect(hexUtils.toHex(await deployer.toInitCodeHash(targetAddress).callAsync())).to.eq(
                hexUtils.hash(deployBytes),
            );
        });
    });
});
