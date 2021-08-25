import {
    blockchainTests,
    constants,
    expect,
    randomAddress,
} from '@0x/contracts-test-utils';
import { BigNumber, OwnableRevertErrors } from '@0x/utils';
import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { IOwnableFeatureContract, IZeroExContract } from '../../src/wrappers';
import {TestWethContract} from '../wrappers';
import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import { fullMigrateAsync } from '../utils/migration';
import { FundRecoveryFeatureContract } from '../generated-wrappers/fund_recovery_feature';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { OnlyOwnerError } from '@0x/utils/lib/src/revert_errors/utils/ownable_revert_errors';

    blockchainTests.only('FundRecovery', async env => {
        
        let owner: string;
        let designatedAddress: string;
        let testAddress: string;
        let zeroEx: IZeroExContract;
        let token: DummyERC20TokenContract;
        let weth: TestWethContract;
        let feature: FundRecoveryFeatureContract;

        before(async () => {
            
            [owner, designatedAddress, testAddress] = await env.getAccountAddressesAsync();
            zeroEx = await fullMigrateAsync(owner, env.provider, env.txDefaults, {});
            token = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
                erc20Artifacts.DummyERC20Token,
                env.provider,
                env.txDefaults,
                erc20Artifacts,
                constants.DUMMY_TOKEN_NAME,
                constants.DUMMY_TOKEN_SYMBOL,
                constants.DUMMY_TOKEN_DECIMALS,
                constants.DUMMY_TOKEN_TOTAL_SUPPLY,
            );
            await token.setBalance(zeroEx.address, constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync();
            const bal = await token.balanceOf(zeroEx.address).callAsync();
            weth = await TestWethContract.deployFrom0xArtifactAsync(
                artifacts.TestWeth,
                env.provider,
                env.txDefaults,
                artifacts,
            );
            await weth.mint(zeroEx.address, constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync();
            const balweth = await weth.balanceOf(zeroEx.address).callAsync();
            feature = new FundRecoveryFeatureContract(zeroEx.address, env.provider, env.txDefaults, abis);
            const featureImpl = await FundRecoveryFeatureContract.deployFrom0xArtifactAsync(
                artifacts.FundRecoveryFeature,
                env.provider,
                env.txDefaults,
                artifacts
            );
            await new IOwnableFeatureContract(zeroEx.address, env.provider, env.txDefaults, abis)
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();
        });
        blockchainTests.resets('Should delegatecall `transferTrappedTokensTo` from the exchange proxy', () => {
            const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
            it('Tranfers an arbitrary ERC-20 Token', async () => {
                const amountOut = Web3Wrapper.toBaseUnitAmount(new BigNumber(100), 18);
                const designatedAddressBalance = await token.balanceOf(designatedAddress).callAsync();
                const epBalance = await token.balanceOf(zeroEx.address).callAsync();
                await zeroEx.transferTrappedTokensTo(token.address, amountOut, designatedAddress).awaitTransactionSuccessAsync({ from: owner });
                const epBalanceNew = await token.balanceOf(zeroEx.address).callAsync();
                const designatedAddressBalanceAferTransfer = await token.balanceOf(designatedAddress).callAsync();
                expect(designatedAddressBalanceAferTransfer).to.bignumber.equal(amountOut);   
            });
            it('Amount -1 transfers entire balance', async () => {                
                const designatedAddressBalance = await token.balanceOf(designatedAddress).callAsync();
                const balanceOwner = await token.balanceOf(zeroEx.address).callAsync();
                const tx = await zeroEx.transferTrappedTokensTo(token.address, constants.MAX_UINT256 , designatedAddress).awaitTransactionSuccessAsync({ from: owner });
                const balanceNew = await token.balanceOf(zeroEx.address).callAsync();
                const designatedAddressBalanceAferTransfer = await token.balanceOf(designatedAddress).callAsync();
                expect(balanceNew).to.bignumber.equal(0);
                expect(designatedAddressBalanceAferTransfer).to.bignumber.equal(balanceOwner);                
            });
            it('Transfers ETH ', async () => {
                const amountOut = new BigNumber(20);
                await env.web3Wrapper.awaitTransactionMinedAsync(
                    await env.web3Wrapper.sendTransactionAsync(
                        {
                            from: owner,
                            to: zeroEx.address,
                            value: amountOut
                        }));
                const bal = await env.web3Wrapper.getBalanceInWeiAsync(designatedAddress);
                const tx = await zeroEx.transferTrappedTokensTo(ETH_TOKEN_ADDRESS, amountOut , designatedAddress).awaitTransactionSuccessAsync({ from: owner });
                const designatedAddressBalance = await env.web3Wrapper.getBalanceInWeiAsync(designatedAddress);
                return expect(designatedAddressBalance).to.bignumber.be.greaterThan(bal);
            });
            it('Feature `transferTrappedTokensTo` can only be called by owner', async () => {
               const notOwner = randomAddress();
               
               return expect(zeroEx.transferTrappedTokensTo(ETH_TOKEN_ADDRESS, constants.MAX_UINT256 , designatedAddress).awaitTransactionSuccessAsync({ from: notOwner })).to.revertWith(new OnlyOwnerError(notOwner,owner));  
            });
        });
    });
