import {
    blockchainTests,
    constants,
    describe,
    expect,
    getRandomPortion,
    provider,
    randomAddress,
} from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { LogWithDecodedArgs } from 'ethereum-types';
import { IOwnableFeatureContract, IZeroExContract, LiquidityProviderFeatureContract } from '../../src/wrappers';
import {TestWethContract} from '../wrappers';
import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import { fullMigrateAsync } from '../utils/migration';
import { TestInitialMigrationContract } from '../generated-wrappers/test_initial_migration';
import { FundRecoveryFeatureContract } from '../generated-wrappers/fund_recovery_feature';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Address } from '@0x/utils/lib/src/abi_encoder';

    blockchainTests('FundRecovery', async env => {
        
        let owner: string;
        let designatedAddress: string;
        let testAddress: string;
        let zeroEx: IZeroExContract;
        let token: DummyERC20TokenContract;
        let weth: TestWethContract;
        let feature: FundRecoveryFeatureContract;

        before(async () => {
            env.blockchainLifecycle.startAsync();
            const ZERO_EX_EXCHANGE_PROXY = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';
            [owner, designatedAddress, testAddress] = await env.getAccountAddressesAsync();
            
            console.log(owner);
            //EP Migration
            zeroEx = await fullMigrateAsync(owner, env.provider, env.txDefaults, {});

            //deploy dummy erc20 token
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
            const bal = await token.balanceOf(ZERO_EX_EXCHANGE_PROXY).callAsync();
            
            weth = await TestWethContract.deployFrom0xArtifactAsync(
                artifacts.TestWeth,
                env.provider,
                env.txDefaults,
                artifacts,
            );
            await weth.mint(zeroEx.address, constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync();
            await weth.mint(ZERO_EX_EXCHANGE_PROXY, constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync();
            const balweth = await weth.balanceOf(zeroEx.address).callAsync();
            
            //CREATE CONTRACT AND DEPLOY FEATURE
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
            const ZERO_EX_EXCHANGE_PROXY = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';
            it('Tranfers an arbitrary ERC-20 Token', async () => {
                const amountOut = Web3Wrapper.toBaseUnitAmount(new BigNumber(100), 18);
                const designatedAddressBalance = await token.balanceOf(designatedAddress).callAsync();
                const epBalance = await token.balanceOf(zeroEx.address).callAsync();
                await zeroEx.transferTrappedTokensTo(token.address, amountOut, designatedAddress).awaitTransactionSuccessAsync({ from: owner });
                const epBalanceNew = await token.balanceOf(zeroEx.address).callAsync();
                const designatedAddressBalanceAferTransfer = await token.balanceOf(designatedAddress).callAsync();
                expect(designatedAddressBalanceAferTransfer.c![0]).to.equal(amountOut.c![0]);
            });
            it('Amount -1 transfers entire balance', async () => {                
                const designatedAddressBalance = await token.balanceOf(designatedAddress).callAsync();
                const balanceOwner = await token.balanceOf(zeroEx.address).callAsync();
                const tx = await zeroEx.transferTrappedTokensTo(token.address, constants.MAX_UINT256 , designatedAddress).awaitTransactionSuccessAsync({ from: owner });
                const balanceNew = await token.balanceOf(zeroEx.address).callAsync();
                const designatedAddressBalanceAferTransfer = await token.balanceOf(designatedAddress).callAsync();
                expect(balanceNew.c![0]).to.equal(0);
                expect(designatedAddressBalanceAferTransfer.c![0]).to.equal(balanceOwner.c![0]);                
            });
            it('Transfers ETH ', async () => {
                //connect to mainnet contract address
                const zrxContractMainnet = new IZeroExContract(ZERO_EX_EXCHANGE_PROXY, env.provider, env.txDefaults);
                //await weth.withdraw(wethBal);
                const bal = await env.web3Wrapper.getBalanceInWeiAsync(zrxContractMainnet.address);
                //const designatedAddressBalance = await token.balanceOf(designatedAddress).callAsync(); 
                const tx = await zrxContractMainnet.transferTrappedTokensTo(ETH_TOKEN_ADDRESS, constants.MAX_UINT256 , designatedAddress).awaitTransactionSuccessAsync({ from: owner });
                //const bal2 = await env.web3Wrapper.getBalanceInWeiAsync(zrxContractMainnet.address);
                const designatedAddressBalance = await env.web3Wrapper.getBalanceInWeiAsync(zrxContractMainnet.address);
               
                
            });
            it('Feature `transferTrappedTokensTo` can only be called by owner', async () => {
               //need to be able to change caller context.
               const zrxContractMainnet = new IZeroExContract(ZERO_EX_EXCHANGE_PROXY, env.provider, env.txDefaults);
               const tx = await zrxContractMainnet.transferTrappedTokensTo(ETH_TOKEN_ADDRESS, constants.MAX_UINT256 , designatedAddress).awaitTransactionSuccessAsync({ from: owner });
                
            });
            
        });
            
            

    });
