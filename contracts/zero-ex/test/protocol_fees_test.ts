import { blockchainTests, constants, expect } from '@0x/contracts-test-utils';
import { AuthorizableRevertErrors, BigNumber, hexUtils, ZeroExRevertErrors } from '@0x/utils';

import { artifacts } from './artifacts';
import { FeeCollectorContract, TestFixinProtocolFeesContract, TestStakingContract, TestWethContract } from './wrappers';

blockchainTests.resets('ProtocolFees', env => {
    const FEE_MULTIPLIER = 70e3;
    let taker: string;
    let unauthorized: string;
    let protocolFees: TestFixinProtocolFeesContract;
    let staking: TestStakingContract;
    let weth: TestWethContract;
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
        protocolFees = await TestFixinProtocolFeesContract.deployFrom0xArtifactAsync(
            artifacts.TestFixinProtocolFees,
            env.provider,
            env.txDefaults,
            artifacts,
            weth.address,
            staking.address,
            FEE_MULTIPLIER,
        );
        singleFeeAmount = await protocolFees.getSingleProtocolFee().callAsync();
        await weth.mint(taker, singleFeeAmount).awaitTransactionSuccessAsync();
        await weth.approve(protocolFees.address, singleFeeAmount).awaitTransactionSuccessAsync({ from: taker });
    });

    describe('FeeCollector', () => {
        it('should disallow unauthorized initialization', async () => {
            const pool = hexUtils.random();

            await protocolFees.collectProtocolFee(pool, taker)
                .awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool)
                .awaitTransactionSuccessAsync();

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

        it('should revert if WETH transfer fails', async () => {
            await weth.approve(protocolFees.address, singleFeeAmount.minus(1))
                .awaitTransactionSuccessAsync({ from: taker });
            const tx = protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync({ value: singleFeeAmount });
            return expect(tx).to.revertWith(
                new ZeroExRevertErrors.Spender.SpenderERC20TransferFromFailedError(
                    weth.address,
                    taker,
                    undefined,
                    singleFeeAmount,
                    undefined,
                ),
            );
        });

        it('should revert if insufficient ETH transferred', async () => {
            const tooLittle = singleFeeAmount.minus(1);
            const tx = protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync({ value: tooLittle });
            return expect(tx).to.revertWith('FixinProtocolFees/ETHER_TRANSFER_FALIED');
        });

        it('should accept WETH fee', async () => {
            const beforeWETH = await weth.balanceOf(taker).callAsync();
            await protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync();
            const afterWETH = await weth.balanceOf(taker).callAsync();

            return expect(beforeWETH.minus(afterWETH)).to.bignumber.eq(constants.ONE_ETHER);
        });

        it('should accept ETH fee', async () => {
            const beforeWETH = await weth.balanceOf(taker).callAsync();
            const beforeETH = await env.web3Wrapper.getBalanceInWeiAsync(taker);
            await protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync({ value: singleFeeAmount });
            const afterWETH = await weth.balanceOf(taker).callAsync();
            const afterETH = await env.web3Wrapper.getBalanceInWeiAsync(taker);

            // We check for greater than 1 ether spent to allow for spending on gas.
            await expect(beforeETH.minus(afterETH)).to.bignumber.gt(constants.ONE_ETHER);
            return expect(beforeWETH).to.bignumber.eq(afterWETH);
        });

        it('should transfer both ETH and WETH', async () => {
            await protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync();
            await protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool1)
                .awaitTransactionSuccessAsync();

            const balanceWETH = await weth.balanceOf(staking.address).callAsync();

            // We leave 1 wei behind of both ETH and WETH.
            return expect(balanceWETH).to.bignumber.eq(constants.ONE_ETHER.times(2).minus(2));
        });

        it('should accept ETH after first transfer', async () => {
            await protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool1)
                .awaitTransactionSuccessAsync();
            await protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool1)
                .awaitTransactionSuccessAsync();

            const balanceWETH = await weth.balanceOf(staking.address).callAsync();

            // We leave 1 wei behind of both ETH and WETH
            return expect(balanceWETH).to.bignumber.eq(constants.ONE_ETHER.times(2).minus(2));
        });

        it('should attribute fees correctly', async () => {
            const pool1Amount = new BigNumber(12345);
            const pool2Amount = new BigNumber(45678);

            await protocolFees.collectProtocolFee(pool1, taker)
                .awaitTransactionSuccessAsync({ value: singleFeeAmount }); // ETH
            await protocolFees.transferFeesForPool(pool1)
                .awaitTransactionSuccessAsync();
            await protocolFees.collectProtocolFee(pool2, taker)
                .awaitTransactionSuccessAsync(); // WETH
            await protocolFees.transferFeesForPool(pool2)
                .awaitTransactionSuccessAsync();

            const pool1Balance = await staking.balanceForPool(pool1).callAsync();
            const pool2Balance = await staking.balanceForPool(pool2).callAsync();

            const balanceWETH = await weth.balanceOf(staking.address).callAsync();

            await expect(balanceWETH).to.bignumber.equal(pool1Balance.plus(pool2Balance));

            // We leave 1 wei behind of both ETH and WETH.
            await expect(pool1Balance).to.bignumber.equal(pool1Amount.minus(2));

            // Here we paid in WETH, so there's just 1 wei of WETH held back.
            return expect(pool2Balance).to.bignumber.equal(pool2Amount.minus(1));
        });

        it('can collect a protocol fee multiple times', async () => {
            const poolId = hexUtils.random();

            // Transfer one fee via WETH.
            await protocolFees.collectProtocolFee(poolId, taker).awaitTransactionSuccessAsync();

            // Send to staking contract.
            await protocolFees.transferFeesForPool(poolId).awaitTransactionSuccessAsync();

            // Transfer the other fee via ETH.
            await protocolFees
                .collectProtocolFee(poolId, taker)
                .awaitTransactionSuccessAsync({ from: taker, value: singleFeeAmount });

            // Send to staking contract again.
            await protocolFees.transferFeesForPool(poolId).awaitTransactionSuccessAsync();

            const balance = await staking.balanceForPool(poolId).callAsync();
            const wethBalance = await weth.balanceOf(staking.address).callAsync();

            // Check that staking accounted for the collected ether properly.
            expect(balance).to.bignumber.eq(wethBalance);

            // We leave 1 wei behind, of both ETH and WETH, for gas reasons.
            const total = singleFeeAmount.times(2).minus(2);
            return expect(balance).to.bignumber.eq(total);
        });
    });
});
