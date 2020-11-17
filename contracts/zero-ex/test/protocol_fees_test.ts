import { blockchainTests, constants, expect } from '@0x/contracts-test-utils';
import { AuthorizableRevertErrors, BigNumber, hexUtils, ZeroExRevertErrors } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs } from 'ethereum-types';

import { artifacts } from './artifacts';
import { FeeCollectorContract, TestProtocolFeesContract, TestStakingContract, TestWethContract } from './wrappers';

blockchainTests.resets('ProtocolFees', env => {
    let payer: string;
    let unauthorized: string;
    let protocolFees: TestProtocolFeesContract;
    let staking: TestStakingContract;
    let weth: TestWethContract;

    before(async () => {
        [payer, unauthorized] = await env.getAccountAddressesAsync();
        protocolFees = await TestProtocolFeesContract.deployFrom0xArtifactAsync(
            artifacts.TestProtocolFees,
            env.provider,
            env.txDefaults,
            artifacts,
        );
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
        await weth.mint(payer, constants.ONE_ETHER).awaitTransactionSuccessAsync();
        await weth.approve(protocolFees.address, constants.ONE_ETHER).awaitTransactionSuccessAsync({ from: payer });
    });

    async function collectAsync(
        poolId: string,
        amount: BigNumber,
        etherValue: BigNumber,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        return protocolFees
            .collectProtocolFee(poolId, amount, weth.address)
            .awaitTransactionSuccessAsync({ from: payer, value: etherValue });
    }

    async function transferFeesAsync(poolId: string): Promise<TransactionReceiptWithDecodedLogs> {
        return protocolFees.transferFeesForPool(poolId, staking.address, weth.address).awaitTransactionSuccessAsync();
    }

    describe('FeeCollector', () => {
        it('should disallow unauthorized initialization', async () => {
            const pool = hexUtils.random();

            await collectAsync(pool, constants.ONE_ETHER, constants.ZERO_AMOUNT);
            await transferFeesAsync(pool);

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
            const tooMuch = constants.ONE_ETHER.plus(1);
            const tx = collectAsync(pool1, constants.ONE_ETHER.plus(1), constants.ZERO_AMOUNT);
            return expect(tx).to.revertWith(
                new ZeroExRevertErrors.Spender.SpenderERC20TransferFromFailedError(
                    weth.address,
                    payer,
                    undefined,
                    tooMuch,
                    undefined,
                ),
            );
        });

        it('should revert if insufficient ETH transferred', async () => {
            const tooLittle = constants.ONE_ETHER.minus(1);
            const tx = collectAsync(pool1, constants.ONE_ETHER, tooLittle);
            return expect(tx).to.revertWith('FixinProtocolFees/ETHER_TRANSFER_FALIED');
        });

        it('should accept WETH fee', async () => {
            const beforeWETH = await weth.balanceOf(payer).callAsync();
            await collectAsync(pool1, constants.ONE_ETHER, constants.ZERO_AMOUNT);
            const afterWETH = await weth.balanceOf(payer).callAsync();

            return expect(beforeWETH.minus(afterWETH)).to.bignumber.eq(constants.ONE_ETHER);
        });

        it('should accept ETH fee', async () => {
            const beforeWETH = await weth.balanceOf(payer).callAsync();
            const beforeETH = await env.web3Wrapper.getBalanceInWeiAsync(payer);
            await collectAsync(pool1, constants.ONE_ETHER, constants.ONE_ETHER);
            const afterWETH = await weth.balanceOf(payer).callAsync();
            const afterETH = await env.web3Wrapper.getBalanceInWeiAsync(payer);

            // We check for greater than 1 ether spent to allow for spending on gas.
            await expect(beforeETH.minus(afterETH)).to.bignumber.gt(constants.ONE_ETHER);
            return expect(beforeWETH).to.bignumber.eq(afterWETH);
        });

        it('should transfer both ETH and WETH', async () => {
            await collectAsync(pool1, constants.ONE_ETHER, constants.ZERO_AMOUNT);
            await collectAsync(pool1, constants.ONE_ETHER, constants.ONE_ETHER);
            await transferFeesAsync(pool1);

            const balanceWETH = await weth.balanceOf(staking.address).callAsync();

            // We leave 1 wei behind of both ETH and WETH.
            return expect(balanceWETH).to.bignumber.eq(constants.ONE_ETHER.times(2).minus(2));
        });

        it('should accept ETH after first transfer', async () => {
            await collectAsync(pool1, constants.ONE_ETHER, constants.ONE_ETHER);
            await transferFeesAsync(pool1);
            await collectAsync(pool1, constants.ONE_ETHER, constants.ONE_ETHER);
            await transferFeesAsync(pool1);

            const balanceWETH = await weth.balanceOf(staking.address).callAsync();

            // We leave 1 wei behind of both ETH and WETH
            return expect(balanceWETH).to.bignumber.eq(constants.ONE_ETHER.times(2).minus(2));
        });

        it('should attribute fees correctly', async () => {
            const pool1Amount = new BigNumber(12345);
            const pool2Amount = new BigNumber(45678);

            await collectAsync(pool1, pool1Amount, pool1Amount); // ETH
            await transferFeesAsync(pool1);
            await collectAsync(pool2, pool2Amount, constants.ZERO_AMOUNT); // WETH
            await transferFeesAsync(pool2);

            const pool1Balance = await staking.balanceForPool(pool1).callAsync();
            const pool2Balance = await staking.balanceForPool(pool2).callAsync();

            const balanceWETH = await weth.balanceOf(staking.address).callAsync();

            await expect(balanceWETH).to.bignumber.equal(pool1Balance.plus(pool2Balance));

            // We leave 1 wei behind of both ETH and WETH.
            await expect(pool1Balance).to.bignumber.equal(pool1Amount.minus(2));

            // Here we paid in WETH, so there's just 1 wei of WETH held back.
            return expect(pool2Balance).to.bignumber.equal(pool2Amount.minus(1));
        });
    });
});
