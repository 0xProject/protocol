import { blockchainTests, expect, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as ethjs from 'ethereumjs-util';

import { artifacts } from './artifacts';
import {
    TestTransformerDeployerTransformerContract,
    TransformerDeployerContract,
    TransformerDeployerEvents,
} from './wrappers';

blockchainTests.resets('TransformerDeployer', env => {
    let owner: string;
    let sender: string;
    let deployer: TransformerDeployerContract;
    const deployBytes = artifacts.TestTransformerDeployerTransformer.compilerOutput.evm.bytecode.object;

    before(async () => {
        [owner, sender] = await env.getAccountAddressesAsync();
        deployer = await TransformerDeployerContract.deployFrom0xArtifactAsync(
            artifacts.TransformerDeployer,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    });

    describe('deploy()', () => {
        it('can deploy safe contract', async () => {
            const salt = hexUtils.random();
            const targetAddress = await deployer.deploy(deployBytes, salt).callAsync();
            const target = new TestTransformerDeployerTransformerContract(targetAddress, env.provider);
            const receipt = await deployer.deploy(deployBytes, salt).awaitTransactionSuccessAsync({ from: sender });
            expect(await target.deployer().callAsync()).to.eq(deployer.address);
            verifyEventsFromLogs(
                receipt.logs,
                [{ deployedAddress: targetAddress, salt, sender }],
                TransformerDeployerEvents.Deployed,
            );
        });

        it('can deploy safe contract with value', async () => {
            const salt = hexUtils.random();
            const targetAddress = await deployer.deploy(deployBytes, salt).callAsync({ from: sender, value: 1 });
            const target = new TestTransformerDeployerTransformerContract(targetAddress, env.provider);
            const receipt = await deployer
                .deploy(deployBytes, salt)
                .awaitTransactionSuccessAsync({ from: sender, value: 1 });
            expect(await target.deployer().callAsync()).to.eq(deployer.address);
            verifyEventsFromLogs(
                receipt.logs,
                [{ deployedAddress: targetAddress, salt, sender }],
                TransformerDeployerEvents.Deployed,
            );
            expect(await env.web3Wrapper.getBalanceInWeiAsync(targetAddress)).to.bignumber.eq(1);
        });

        it('reverts if constructor throws', async () => {
            const CONSTRUCTOR_FAIL_VALUE = new BigNumber(3333);
            const tx = deployer
                .deploy(deployBytes, hexUtils.random())
                .callAsync({ value: CONSTRUCTOR_FAIL_VALUE, from: sender });
            return expect(tx).to.revertWith('TransformerDeployer/DEPLOY_FAILED');
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
                hexUtils.toHex(ethjs.sha3(deployBytes)),
            );
        });
    });
});
