import { blockchainTests, expect } from '@0x/contracts-test-utils';
import { AuthorizableRevertErrors, BigNumber, hexUtils } from '@0x/utils';

import { artifacts } from './artifacts';
import {
    FeeCollectorContract,
    FeeCollectorControllerContract,
    TestFixinProtocolFeesContract,
    TestStakingContract,
    TestWethContract,
} from './wrappers';

// TODO: dekz Ganache gasPrice opcode is returning 0, cannot influence it up to test this case
blockchainTests.resets.skip('ProtocolFees', env => {
    const FEE_MULTIPLIER = 70e3;
    let taker: string;
    let unauthorized: string;
    let protocolFees: TestFixinProtocolFeesContract;
    let staking: TestStakingContract;
    let weth: TestWethContract;
    let feeCollectorController: FeeCollectorControllerContract;
    let singleFeeAmount: BigNumber;

    before(async () => {
        [taker, unauthorized] = await env.getAccountAddressesAsync();
        weth = await TestWethContract.deployFrom0xArtifactAsync(
            artifacts.TestWeth,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        staking = await TestStakingContract.deployFrom0xArtifactAsync(
            artifacts.TestStaking,
            env.provider,
            env.txDefaults,
            artifacts,
            weth.address,
        );
        feeCollectorController = await FeeCollectorControllerContract.deployFrom0xArtifactAsync(
            artifacts.FeeCollectorController,
            env.provider,
            env.txDefaults,
            artifacts,
            weth.address,
            staking.address,
        );
        protocolFees = await TestFixinProtocolFeesContract.deployFrom0xArtifactAsync(
            artifacts.TestFixinProtocolFees,
            env.provider,
            { ...env.txDefaults, from: taker },
            artifacts,
            weth.address,
            staking.address,
            feeCollectorController.address,
            FEE_MULTIPLIER,
        );
        singleFeeAmount = await protocolFees.getSingleProtocolFee().callAsync();
        await weth.mint(taker, singleFeeAmount).awaitTransactionSuccessAsync();
        await weth.approve(protocolFees.address, singleFeeAmount).awaitTransactionSuccessAsync({ from: taker });
    });

    describe('FeeCollector', () => {
        it('should disallow unauthorized initialization', async () => {
            const pool = hexUtils.random();

            await protocolFees.collectProtocolFee(pool).awaitTransactionSuccessAsync({ value: 1e9 });
            await protocolFees.transferFeesForPool(pool).awaitTransactionSuccessAsync();

            const feeCollector = new FeeCollectorContract(
                await protocolFees.getFeeCollector(pool).callAsync(),
                env.provider,
                env.txDefaults,
            );

            const tx = feeCollector
                .initialize(weth.address, staking.address, pool)
                .sendTransactionAsync({ from: unauthorized });
            return expect(tx).to.revertWith(new AuthorizableRevertErrors.SenderNotAuthorizedError(unauthorized));
        });
    });

    describe('_collectProtocolFee()', () => {
        const pool1 = hexUtils.random();
        const pool2 = hexUtils.random();
        let feeCollector1Address: string;
        let feeCollector2Address: string;

        before(async () => {
            feeCollector1Address = await protocolFees.getFeeCollector(pool1).callAsync();
            feeCollector2Address = await protocolFees.getFeeCollector(pool2).callAsync();
        });

        // Ganache gasPrice opcode is returning 0, cannot influence it up to test this case
        it('should revert if insufficient ETH transferred', async () => {
            const tooLittle = singleFeeAmount.minus(1);
            const tx = protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: tooLittle });
            return expect(tx).to.revertWith('FixinProtocolFees/ETHER_TRANSFER_FALIED');
        });

        it('should accept ETH fee', async () => {
            const beforeETH = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            await protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            const afterETH = await env.web3Wrapper.getBalanceInWeiAsync(taker);

            // We check for greater than fee spent to allow for spending on gas.
            await expect(beforeETH.minus(afterETH)).to.bignumber.gt(singleFeeAmount);

            await expect(await env.web3Wrapper.getBalanceInWeiAsync(feeCollector1Address)).to.bignumber.eq(
                singleFeeAmount,
            );
        });

        it('should accept ETH after first transfer', async () => {
            await protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool1).awaitTransactionSuccessAsync();
            await protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool1).awaitTransactionSuccessAsync();

            const balanceWETH = await weth.balanceOf(staking.address).callAsync();

            // We leave 1 wei of WETH behind.
            await expect(balanceWETH).to.bignumber.eq(singleFeeAmount.times(2).minus(1));
            await expect(await weth.balanceOf(feeCollector1Address).callAsync()).to.bignumber.equal(1);
            // And no ETH.
            await expect(await env.web3Wrapper.getBalanceInWeiAsync(feeCollector1Address)).to.bignumber.eq(0);
        });

        it('should attribute fees correctly', async () => {
            await protocolFees.collectProtocolFee(pool1).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool1).awaitTransactionSuccessAsync();
            await protocolFees.collectProtocolFee(pool2).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool2).awaitTransactionSuccessAsync();

            const pool1Balance = await staking.balanceForPool(pool1).callAsync();
            const pool2Balance = await staking.balanceForPool(pool2).callAsync();

            const balanceWETH = await weth.balanceOf(staking.address).callAsync();

            await expect(balanceWETH).to.bignumber.equal(singleFeeAmount.times(2).minus(2));

            // We leave 1 wei of WETH behind.
            await expect(pool1Balance).to.bignumber.equal(singleFeeAmount.minus(1));
            await expect(pool2Balance).to.bignumber.equal(singleFeeAmount.minus(1));
            await expect(await weth.balanceOf(feeCollector1Address).callAsync()).to.bignumber.equal(1);
            await expect(await weth.balanceOf(feeCollector2Address).callAsync()).to.bignumber.equal(1);
            await expect(pool2Balance).to.bignumber.equal(singleFeeAmount.minus(1));
            // And no ETH.
            await expect(await env.web3Wrapper.getBalanceInWeiAsync(feeCollector1Address)).to.bignumber.eq(0);
            await expect(await env.web3Wrapper.getBalanceInWeiAsync(feeCollector2Address)).to.bignumber.eq(0);
        });
    });
});
