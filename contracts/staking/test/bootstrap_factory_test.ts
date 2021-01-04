import { ERC20Wrapper } from '@0x/contracts-asset-proxy';
import { blockchainTests, describe, expect } from '@0x/contracts-test-utils';
import { assetDataUtils } from '@0x/order-utils';
import { AuthorizableRevertErrors, BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { artifacts } from './artifacts';
import { deployAndConfigureContractsAsync, StakingApiWrapper } from './utils/api_wrapper';
import { BootstrapFactoryContract, StakerContract } from './wrappers';

// tslint:disable:no-unnecessary-type-assertion
blockchainTests.resets('Bootstrap Delegate Tests', env => {
    // tokens & addresses
    let accounts: string[];
    let owner: string;
    // wrappers
    let stakingApiWrapper: StakingApiWrapper;
    let erc20Wrapper: ERC20Wrapper;
    // A working contract
    // The delegation factory
    let delegation: BootstrapFactoryContract;
    // The asset data
    let zrxAssetData: string;
    // tests
    before(async () => {
        // create accounts
        accounts = await env.getAccountAddressesAsync();
        owner = accounts[0];
        // set up ERC20Wrapper
        erc20Wrapper = new ERC20Wrapper(env.provider, accounts, owner);
        // deploy staking contracts
        stakingApiWrapper = await deployAndConfigureContractsAsync(env, owner, erc20Wrapper);
        zrxAssetData = assetDataUtils.encodeERC20AssetData(stakingApiWrapper.zrxTokenContract.address);
        const zrxAssetProxy = await stakingApiWrapper.utils.getZrxAssetProxyAsync();

        // Setup the Bootstrap Factory
        delegation = await BootstrapFactoryContract.deployFrom0xArtifactAsync(
            artifacts.BootstrapFactory,
            env.provider,
            env.txDefaults,
            artifacts,
            stakingApiWrapper.zrxTokenContract.address,
            stakingApiWrapper.stakingContract.address,
            stakingApiWrapper.onchainGovContract.address,
            zrxAssetProxy,
        );

        // Give the contract some balance
        await erc20Wrapper.setBalanceAsync(delegation.address, zrxAssetData, new BigNumber(10000));
    });

    describe('Bootstrap Factory Delegation', async () => {
        it('Allows the multisig to delegate an amount to someone', async () => {
            // Delegates to accounts[1] 1000 zrx voting power
            await delegation.delegate(accounts[1], new BigNumber(1000)).awaitTransactionSuccessAsync();
            // Load the voting power for the address we delegate too
            const govPower = await stakingApiWrapper.onchainGovContract.getCurrentVotes(accounts[1]).callAsync();
            // Load the balance of the user
            const votingBalance = await stakingApiWrapper.onchainGovContract.balanceOf(accounts[1]).callAsync();
            // Should have 1000 votes
            expect(govPower.toNumber()).to.be.eq(1000);
            // But no actual balance
            expect(votingBalance.toNumber()).to.be.eq(0);
        });

        it('Allows the multisig to delegate to multiple people at once', async () => {
            for (let index = 0; index < 10; index++) {
                // Delegates to accounts[1] 1000 zrx voting power
                await delegation.delegate(accounts[index], new BigNumber(1000)).awaitTransactionSuccessAsync();
                // Load the voting power for the address we delegate too
                const govPower = await stakingApiWrapper.onchainGovContract
                    .getCurrentVotes(accounts[index])
                    .callAsync();
                // Load the balance of the user
                const votingBalance = await stakingApiWrapper.onchainGovContract.balanceOf(accounts[index]).callAsync();
                // Should have 1000 votes
                expect(govPower.toNumber()).to.be.eq(1000);
                // But no actual balance
                expect(votingBalance.toNumber()).to.be.eq(0);
            }
        });

        it('Blocks non owner delegation', async () => {
            const tx = delegation
                .delegate(accounts[1], new BigNumber(1000))
                .awaitTransactionSuccessAsync({ from: accounts[1] });
            expect(tx).to.revertWith(new AuthorizableRevertErrors.SenderNotAuthorizedError(accounts[1]));
        });

        it('Allows the multisig to delegate to multiple people in one tx', async () => {
            const addresses = [];
            const amounts = [];
            for (let index = 0; index < 8; index++) {
                addresses.push(accounts[index]);
                // May be better to make this random
                amounts.push(new BigNumber(index * 10 + 500));
            }
            await delegation.delegateMany(addresses, amounts).awaitTransactionSuccessAsync();
            for (let index = 0; index < addresses.length; index++) {
                // Load the voting power for the address we delegate too
                const govPower = await stakingApiWrapper.onchainGovContract
                    .getCurrentVotes(addresses[index])
                    .callAsync();
                // Load the balance of the user
                const votingBalance = await stakingApiWrapper.onchainGovContract
                    .balanceOf(addresses[index])
                    .callAsync();
                // Should have 1000 votes
                expect(govPower.toNumber()).to.be.eq(amounts[index].toNumber());
                // But no actual balance
                expect(votingBalance.toNumber()).to.be.eq(0);
            }
        });

        it('Blocks non owner multi delegation', async () => {
            const tx = delegation
                .delegateMany([accounts[1]], [new BigNumber(1000)])
                .awaitTransactionSuccessAsync({ from: accounts[1] });
            expect(tx).to.revertWith(new AuthorizableRevertErrors.SenderNotAuthorizedError(accounts[1]));
        });

        it('Allows the owner to add more delegation', async () => {
            // Note this test will fail if the first delegation also fails
            // First tx inits and deploys a contract
            await delegation.delegate(accounts[1], new BigNumber(1000)).awaitTransactionSuccessAsync();
            await delegation.delegate(accounts[1], new BigNumber(500)).awaitTransactionSuccessAsync();
            // Load the voting power for the address we delegate too
            const govPower = await stakingApiWrapper.onchainGovContract.getCurrentVotes(accounts[1]).callAsync();
            // Load the balance of the user
            const votingBalance = await stakingApiWrapper.onchainGovContract.balanceOf(accounts[1]).callAsync();
            // Should have 1000 votes
            expect(govPower.toNumber()).to.be.eq(1500);
            // But no actual balance
            expect(votingBalance.toNumber()).to.be.eq(0);
        });
    });

    // May fail if delegation is broken
    describe('Bootstrap Factory Undelegation', async () => {
        // We delegate to each address
        before(async () => {
            const addresses = [];
            const amounts = [];
            for (let index = 0; index < 8; index++) {
                addresses.push(accounts[index]);
                // May be better to make this random
                amounts.push(new BigNumber(1000));
            }
            await delegation.delegateMany(addresses, amounts).awaitTransactionSuccessAsync();
        });

        it('Allows full undelegation', async () => {
            // Undelegates to accounts[1] 1000 zrx voting power
            await delegation.undelegate(accounts[1], new BigNumber(1000)).awaitTransactionSuccessAsync();
            // Load the voting power for the address we delegate too
            const govPower = await stakingApiWrapper.onchainGovContract.getCurrentVotes(accounts[1]).callAsync();
            // Should have no votes
            expect(govPower.toNumber()).to.be.eq(0);
        });

        it('Allows partial undelegation', async () => {
            // Undelegates to accounts[1] 1000 zrx voting power
            await delegation.undelegate(accounts[1], new BigNumber(500)).awaitTransactionSuccessAsync();
            // Load the voting power for the address we delegate too
            const govPower = await stakingApiWrapper.onchainGovContract.getCurrentVotes(accounts[1]).callAsync();
            // Should have no votes
            expect(govPower.toNumber()).to.be.eq(500);
        });

        it('Blocks non owner undelegation', async () => {
            const tx = delegation
                .undelegate(accounts[1], new BigNumber(1000))
                .awaitTransactionSuccessAsync({ from: accounts[1] });
            expect(tx).to.revertWith(new AuthorizableRevertErrors.SenderNotAuthorizedError(accounts[1]));
        });

        it('Allows many undelegation in one tx', async () => {
            const addresses = [];
            const amounts = [];
            for (let index = 0; index < 8; index++) {
                addresses.push(accounts[index]);
                // May be better to make this random
                amounts.push(new BigNumber(index * 10 + 500));
            }
            await delegation.undelegateMany(addresses, amounts).awaitTransactionSuccessAsync();
            for (let index = 0; index < addresses.length; index++) {
                // Load the voting power for the address we delegate too
                const govPower = await stakingApiWrapper.onchainGovContract
                    .getCurrentVotes(addresses[index])
                    .callAsync();
                // Should have 1000 votes
                expect(govPower.toNumber()).to.be.eq(1000 - amounts[index].toNumber());
            }
        });

        it('Blocks non owner multi-undelegation', async () => {
            const tx = delegation
                .undelegateMany([accounts[1]], [new BigNumber(1000)])
                .awaitTransactionSuccessAsync({ from: accounts[1] });
            expect(tx).to.revertWith(new AuthorizableRevertErrors.SenderNotAuthorizedError(accounts[1]));
        });

        it('Allows owner to withdraw', async () => {
            const testAddress = '0x04668ec2f57cc15c381b461b9fedab5d451c8f7f';
            await delegation.removeZRX(testAddress, new BigNumber(1000)).awaitTransactionSuccessAsync();
            const newBalance = await erc20Wrapper.getBalanceAsync(testAddress, zrxAssetData);
            expect(newBalance.toNumber()).to.be.eq(1000);
        });

        it('Blocks a non owner from withdrawing', async () => {
            const tx = delegation
                .removeZRX(accounts[1], new BigNumber(1000))
                .awaitTransactionSuccessAsync({ from: accounts[1] });
            expect(tx).to.revertWith(new AuthorizableRevertErrors.SenderNotAuthorizedError(accounts[1]));
        });
    });

    describe('Staker Subcontract', async () => {
        let testStaker: StakerContract;
        // We use a fake address for simplicity
        // the labeled revert error will be the access error
        // so this has no affect on validity
        const mockAddress = '0x04668ec2f57cc15c381b461b9fedab5d451c8f7f';
        before(async () => {
            testStaker = await StakerContract.deployFrom0xArtifactAsync(
                artifacts.Staker,
                env.provider,
                env.txDefaults,
                artifacts,
            );
        });
        it('Blocks a non bootstrap factory from calling firstStake', async () => {
            const tx = testStaker
                .firstStake(mockAddress, mockAddress, mockAddress, mockAddress, mockAddress, new BigNumber(10))
                .awaitTransactionSuccessAsync({ from: accounts[1] });
            expect(tx).to.revertWith('Caller lacks permissions');
        });
        it('Blocks a non bootstrap factory from calling ', async () => {
            const tx = testStaker
                .reclaim(mockAddress, mockAddress, new BigNumber(10))
                .awaitTransactionSuccessAsync({ from: accounts[1] });
            expect(tx).to.revertWith('Caller lacks permissions');
        });
        it('Blocks a non bootstrap factory from calling ', async () => {
            const tx = testStaker
                .addVotes(mockAddress, new BigNumber(10))
                .awaitTransactionSuccessAsync({ from: accounts[1] });
            expect(tx).to.revertWith('Caller lacks permissions');
        });
    });
});
