import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import { blockchainTests, constants, expect, verifyEventsFromLogs } from '@0x/contracts-test-utils';
import { BigNumber, OwnableRevertErrors, ZeroExRevertErrors } from '@0x/utils';

import { IOwnableFeatureContract, IZeroExContract, LiquidityProviderFeatureContract } from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { abis } from '../utils/abis';
import { fullMigrateAsync } from '../utils/migration';
import {
    LiquidityProviderSandboxContract,
    TestLiquidityProviderContract,
    TestLiquidityProviderEvents,
    TestWethContract,
} from '../wrappers';

blockchainTests('LiquidityProvider feature', env => {
    let zeroEx: IZeroExContract;
    let feature: LiquidityProviderFeatureContract;
    let sandbox: LiquidityProviderSandboxContract;
    let liquidityProvider: TestLiquidityProviderContract;
    let token: DummyERC20TokenContract;
    let weth: TestWethContract;
    let owner: string;
    let taker: string;

    before(async () => {
        [owner, taker] = await env.getAccountAddressesAsync();
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
        await token.setBalance(taker, constants.INITIAL_ERC20_BALANCE).awaitTransactionSuccessAsync();
        weth = await TestWethContract.deployFrom0xArtifactAsync(
            artifacts.TestWeth,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        await token
            .approve(zeroEx.address, constants.INITIAL_ERC20_ALLOWANCE)
            .awaitTransactionSuccessAsync({ from: taker });

        feature = new LiquidityProviderFeatureContract(zeroEx.address, env.provider, env.txDefaults, abis);
        sandbox = await LiquidityProviderSandboxContract.deployFrom0xArtifactAsync(
            artifacts.LiquidityProviderSandbox,
            env.provider,
            env.txDefaults,
            artifacts,
            zeroEx.address,
        );
        const featureImpl = await LiquidityProviderFeatureContract.deployFrom0xArtifactAsync(
            artifacts.LiquidityProviderFeature,
            env.provider,
            env.txDefaults,
            artifacts,
            sandbox.address,
        );
        await new IOwnableFeatureContract(zeroEx.address, env.provider, env.txDefaults, abis)
            .migrate(featureImpl.address, featureImpl.migrate().getABIEncodedTransactionData(), owner)
            .awaitTransactionSuccessAsync();

        liquidityProvider = await TestLiquidityProviderContract.deployFrom0xArtifactAsync(
            artifacts.TestLiquidityProvider,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    });
    blockchainTests.resets('Sandbox', () => {
        it('Cannot call sandbox `executeSellTokenForToken` function directly', async () => {
            const tx = sandbox
                .executeSellTokenForToken(
                    liquidityProvider.address,
                    token.address,
                    weth.address,
                    taker,
                    constants.ZERO_AMOUNT,
                    constants.NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(new OwnableRevertErrors.OnlyOwnerError(taker));
        });
        it('Cannot call sandbox `executeSellEthForToken` function directly', async () => {
            const tx = sandbox
                .executeSellEthForToken(
                    liquidityProvider.address,
                    token.address,
                    taker,
                    constants.ZERO_AMOUNT,
                    constants.NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(new OwnableRevertErrors.OnlyOwnerError(taker));
        });
        it('Cannot call sandbox `executeSellTokenForEth` function directly', async () => {
            const tx = sandbox
                .executeSellTokenForEth(
                    liquidityProvider.address,
                    token.address,
                    taker,
                    constants.ZERO_AMOUNT,
                    constants.NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(new OwnableRevertErrors.OnlyOwnerError(taker));
        });
    });
    blockchainTests.resets('Swap', () => {
        const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

        it('Successfully executes an ERC20-ERC20 swap', async () => {
            const tx = await feature
                .sellToLiquidityProvider(
                    token.address,
                    weth.address,
                    liquidityProvider.address,
                    constants.NULL_ADDRESS,
                    constants.ONE_ETHER,
                    constants.ZERO_AMOUNT,
                    constants.NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            verifyEventsFromLogs(
                tx.logs,
                [
                    {
                        inputToken: token.address,
                        outputToken: weth.address,
                        recipient: taker,
                        minBuyAmount: constants.ZERO_AMOUNT,
                        inputTokenBalance: constants.ONE_ETHER,
                    },
                ],
                TestLiquidityProviderEvents.SellTokenForToken,
            );
        });
        it('Reverts if cannot fulfill the minimum buy amount', async () => {
            const minBuyAmount = new BigNumber(1);
            const tx = feature
                .sellToLiquidityProvider(
                    token.address,
                    weth.address,
                    liquidityProvider.address,
                    constants.NULL_ADDRESS,
                    constants.ONE_ETHER,
                    minBuyAmount,
                    constants.NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            return expect(tx).to.revertWith(
                new ZeroExRevertErrors.LiquidityProvider.LiquidityProviderIncompleteSellError(
                    liquidityProvider.address,
                    weth.address,
                    token.address,
                    constants.ONE_ETHER,
                    constants.ZERO_AMOUNT,
                    minBuyAmount,
                ),
            );
        });
        it('Successfully executes an ETH-ERC20 swap', async () => {
            const tx = await feature
                .sellToLiquidityProvider(
                    ETH_TOKEN_ADDRESS,
                    token.address,
                    liquidityProvider.address,
                    constants.NULL_ADDRESS,
                    constants.ONE_ETHER,
                    constants.ZERO_AMOUNT,
                    constants.NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({ from: taker, value: constants.ONE_ETHER });
            verifyEventsFromLogs(
                tx.logs,
                [
                    {
                        outputToken: token.address,
                        recipient: taker,
                        minBuyAmount: constants.ZERO_AMOUNT,
                        ethBalance: constants.ONE_ETHER,
                    },
                ],
                TestLiquidityProviderEvents.SellEthForToken,
            );
        });
        it('Successfully executes an ERC20-ETH swap', async () => {
            const tx = await feature
                .sellToLiquidityProvider(
                    token.address,
                    ETH_TOKEN_ADDRESS,
                    liquidityProvider.address,
                    constants.NULL_ADDRESS,
                    constants.ONE_ETHER,
                    constants.ZERO_AMOUNT,
                    constants.NULL_BYTES,
                )
                .awaitTransactionSuccessAsync({ from: taker });
            verifyEventsFromLogs(
                tx.logs,
                [
                    {
                        inputToken: token.address,
                        recipient: taker,
                        minBuyAmount: constants.ZERO_AMOUNT,
                        inputTokenBalance: constants.ONE_ETHER,
                    },
                ],
                TestLiquidityProviderEvents.SellTokenForEth,
            );
        });
    });
});
