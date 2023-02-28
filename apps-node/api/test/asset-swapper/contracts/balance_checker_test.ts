import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { blockchainTests, constants, expect, web3Wrapper } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';

import { artifacts } from '../../artifacts';
import { BalanceCheckerContract } from '../../wrappers';

const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

blockchainTests.resets('BalanceChecker contract', (env) => {
    let contract: BalanceCheckerContract;

    before(async () => {
        contract = await BalanceCheckerContract.deployFrom0xArtifactAsync(
            artifacts.BalanceChecker,
            env.provider,
            env.txDefaults,
            {},
        );
    });

    describe('getBalances', () => {
        it('returns the correct array for a successful call', async () => {
            const makerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
                erc20Artifacts.DummyERC20Token,
                env.provider,
                env.txDefaults,
                artifacts,
                constants.DUMMY_TOKEN_NAME,
                constants.DUMMY_TOKEN_SYMBOL,
                new BigNumber(18),
                constants.DUMMY_TOKEN_TOTAL_SUPPLY,
            );

            const accounts = await web3Wrapper.getAvailableAddressesAsync();
            const owner = accounts[0];
            const owner2 = accounts[1];

            await makerToken.mint(new BigNumber(100)).awaitTransactionSuccessAsync({ from: owner });

            const testResults = await contract.balances([owner, owner2], [makerToken.address, ETH_ADDRESS]).callAsync();

            expect(testResults).to.eql([new BigNumber(100), new BigNumber(1000000000000000000000)]);
        });
        it('it throws an error if the input arrays of different lengths', async () => {
            const accounts = await web3Wrapper.getAvailableAddressesAsync();
            const owner = accounts[0];

            try {
                await contract.balances([owner], [ETH_ADDRESS, ETH_ADDRESS]).callAsync();
                expect.fail();
            } catch (error) {
                expect(error.message).to.eql('users array is a different length than the tokens array');
            }
        });
    });
    describe('getMinOfBalancesOrAllowances', () => {
        it('returns the balance if the allowance can cover it', async () => {
            const makerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
                erc20Artifacts.DummyERC20Token,
                env.provider,
                env.txDefaults,
                artifacts,
                constants.DUMMY_TOKEN_NAME,
                constants.DUMMY_TOKEN_SYMBOL,
                new BigNumber(18),
                constants.DUMMY_TOKEN_TOTAL_SUPPLY,
            );

            const accounts = await web3Wrapper.getAvailableAddressesAsync();
            const owner = accounts[0];
            const owner2 = accounts[1];

            const allowanceTarget = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';

            await makerToken.mint(new BigNumber(100)).awaitTransactionSuccessAsync({ from: owner });
            await makerToken.approve(allowanceTarget, new BigNumber(150)).awaitTransactionSuccessAsync({ from: owner });

            await makerToken.mint(new BigNumber(150)).awaitTransactionSuccessAsync({ from: owner2 });
            await makerToken
                .approve(allowanceTarget, new BigNumber(200))
                .awaitTransactionSuccessAsync({ from: owner2 });

            const testResults = await contract
                .getMinOfBalancesOrAllowances(
                    [owner, owner2],
                    [makerToken.address, makerToken.address],
                    allowanceTarget,
                )
                .callAsync();

            expect(testResults).to.eql([new BigNumber(100), new BigNumber(150)]);
        });
        it('returns the allowance if the allowance < balance', async () => {
            const makerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
                erc20Artifacts.DummyERC20Token,
                env.provider,
                env.txDefaults,
                artifacts,
                constants.DUMMY_TOKEN_NAME,
                constants.DUMMY_TOKEN_SYMBOL,
                new BigNumber(18),
                constants.DUMMY_TOKEN_TOTAL_SUPPLY,
            );

            const accounts = await web3Wrapper.getAvailableAddressesAsync();
            const owner = accounts[0];
            const owner2 = accounts[1];

            const allowanceTarget = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';

            await makerToken.mint(new BigNumber(100)).awaitTransactionSuccessAsync({ from: owner });
            await makerToken.approve(allowanceTarget, new BigNumber(50)).awaitTransactionSuccessAsync({ from: owner });

            await makerToken.mint(new BigNumber(100)).awaitTransactionSuccessAsync({ from: owner2 });
            await makerToken.approve(allowanceTarget, new BigNumber(75)).awaitTransactionSuccessAsync({ from: owner2 });

            const testResults = await contract
                .getMinOfBalancesOrAllowances(
                    [owner, owner2],
                    [makerToken.address, makerToken.address],
                    allowanceTarget,
                )
                .callAsync();

            expect(testResults).to.eql([new BigNumber(50), new BigNumber(75)]);
        });
    });
});
