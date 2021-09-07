import { blockchainTests, constants, expect, randomAddress } from '@0x/contracts-test-utils';
import { BigNumber, OwnableRevertErrors } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { IOwnableFeatureContract, IZeroExContract } from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { FundRecoveryFeatureContract } from '../generated-wrappers/fund_recovery_feature';
import { abis } from '../utils/abis';
import { fullMigrateAsync } from '../utils/migration';
import { TestMintableERC20TokenContract } from '../wrappers';

blockchainTests('FundRecovery', async env => {
    let owner: string;
    let zeroEx: IZeroExContract;
    let token: TestMintableERC20TokenContract;
    before(async () => {
        const INITIAL_ERC20_BALANCE = Web3Wrapper.toBaseUnitAmount(new BigNumber(10000), 18);
        [owner] = await env.getAccountAddressesAsync();
        zeroEx = await fullMigrateAsync(owner, env.provider, env.txDefaults, {});
        token = await TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
            artifacts.TestMintableERC20Token,
            env.provider,
            env.txDefaults,
            {},
        );
        await token.mint(zeroEx.address, INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync();
        const featureImpl = await FundRecoveryFeatureContract.deployFrom0xArtifactAsync(
            artifacts.FundRecoveryFeature,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        await new IOwnableFeatureContract(zeroEx.address, env.provider, env.txDefaults, abis)
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync({ from: owner });
    });
    blockchainTests.resets('Should delegatecall `transferTrappedTokensTo` from the exchange proxy', () => {
        const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        const recipientAddress = randomAddress();
        it('Tranfers an arbitrary ERC-20 Token', async () => {
            const amountOut = Web3Wrapper.toBaseUnitAmount(new BigNumber(100), 18);
            await zeroEx
                .transferTrappedTokensTo(token.address, amountOut, recipientAddress)
                .awaitTransactionSuccessAsync({ from: owner });
            const recipientAddressBalanceAferTransfer = await token.balanceOf(recipientAddress).callAsync();
            return expect(recipientAddressBalanceAferTransfer).to.bignumber.equal(amountOut);
        });
        it('Amount -1 transfers entire balance of ERC-20', async () => {
            const balanceOwner = await token.balanceOf(zeroEx.address).callAsync();
            await zeroEx
                .transferTrappedTokensTo(token.address, constants.MAX_UINT256, recipientAddress)
                .awaitTransactionSuccessAsync({ from: owner });
            const recipientAddressBalanceAferTransfer = await token.balanceOf(recipientAddress).callAsync();
            return expect(recipientAddressBalanceAferTransfer).to.bignumber.equal(balanceOwner);
        });
        it('Amount -1 transfers entire balance of ETH', async () => {
            const amountOut = new BigNumber(20);
            await env.web3Wrapper.awaitTransactionMinedAsync(
                await env.web3Wrapper.sendTransactionAsync({
                    from: owner,
                    to: zeroEx.address,
                    value: amountOut,
                }),
            );
            const balanceOwner = await env.web3Wrapper.getBalanceInWeiAsync(zeroEx.address);
            await zeroEx
                .transferTrappedTokensTo(ETH_TOKEN_ADDRESS, constants.MAX_UINT256, recipientAddress)
                .awaitTransactionSuccessAsync({ from: owner });
            const recipientAddressBalanceAferTransfer = await env.web3Wrapper.getBalanceInWeiAsync(recipientAddress);
            return expect(recipientAddressBalanceAferTransfer).to.bignumber.equal(balanceOwner);
        });
        it('Transfers ETH ', async () => {
            const amountOut = new BigNumber(20);
            await env.web3Wrapper.awaitTransactionMinedAsync(
                await env.web3Wrapper.sendTransactionAsync({
                    from: owner,
                    to: zeroEx.address,
                    value: amountOut,
                }),
            );
            await zeroEx
                .transferTrappedTokensTo(ETH_TOKEN_ADDRESS, amountOut.minus(1), recipientAddress)
                .awaitTransactionSuccessAsync({ from: owner });
            const recipientAddressBalance = await env.web3Wrapper.getBalanceInWeiAsync(recipientAddress);
            return expect(recipientAddressBalance).to.bignumber.be.equal(amountOut.minus(1));
        });
        it('Feature `transferTrappedTokensTo` can only be called by owner', async () => {
            const notOwner = randomAddress();
            return expect(
                zeroEx
                    .transferTrappedTokensTo(ETH_TOKEN_ADDRESS, constants.MAX_UINT256, recipientAddress)
                    .awaitTransactionSuccessAsync({ from: notOwner }),
            ).to.revertWith(new OwnableRevertErrors.OnlyOwnerError(notOwner, owner));
        });
    });
});
