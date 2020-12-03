import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { blockchainTests, constants, expect, web3Wrapper } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { artifacts } from '../artifacts';
import { BalanceCheckerContract } from '../wrappers';

// tslint:disable: custom-no-magic-numbers

const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

blockchainTests.resets('BalanceChecker contract', env => {
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

            expect(testResults).to.eql([new BigNumber(100), new BigNumber(100000000000000000000)]);
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
});
