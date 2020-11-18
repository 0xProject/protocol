import { blockchainTests, constants, expect } from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { artifacts } from '../artifacts';
import { TestFixinProtocolFeesIntegrationContract, TestStakingContract, TestWethIntegrationContract } from '../wrappers';

blockchainTests.resets('ProtocolFeeIntegration', env => {
    const FEE_MULTIPLIER = 70e3;
    let owner: string;
    let taker: string;
    let protocolFees: TestFixinProtocolFeesIntegrationContract;
    let staking: TestStakingContract;
    let weth: TestWethIntegrationContract;
    let singleFeeAmount: BigNumber;

    before(async () => {
        [owner, taker] = await env.getAccountAddressesAsync();
        weth = await TestWethIntegrationContract.deployFrom0xArtifactAsync(
            artifacts.TestWethIntegration,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        staking = await TestStakingContract.deployFrom0xArtifactAsync(
            artifacts.TestStaking,
            env.provider,
            env.txDefaults,
            artifacts,
            constants.NULL_ADDRESS, // exchange address, which we don't know yet
            weth.address,
        );
        protocolFees = await TestFixinProtocolFeesIntegrationContract.deployFrom0xArtifactAsync(
            artifacts.TestFixinProtocolFeesIntegration,
            env.provider,
            { ...env.txDefaults, from: taker },
            artifacts,
            weth.address,
            staking.address,
            FEE_MULTIPLIER,
        );
        await staking.addAuthorizedAddress(owner).awaitTransactionSuccessAsync();
        await staking.addExchangeAddress(protocolFees.address).awaitTransactionSuccessAsync({ from: owner });
        await weth.mint(taker, constants.ONE_ETHER).awaitTransactionSuccessAsync();
        await weth.approve(protocolFees.address, constants.ONE_ETHER).awaitTransactionSuccessAsync({ from: taker });

        singleFeeAmount = await protocolFees.getSingleProtocolFee().callAsync();
    });

    describe('fee collection integration', () => {
        const pool0 = constants.NULL_BYTES32;
        const poolId = hexUtils.random();

        it('should collect fees for pool 0', async () => {
            await protocolFees.collectProtocolFee(pool0).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(pool0).awaitTransactionSuccessAsync();

            // Fees in the pool bytes32(0) don't get attributed to a pool.
            await expect((await staking.getStakingPoolStatsThisEpoch(pool0).callAsync()).feesCollected).to.bignumber.equal(constants.ZERO_AMOUNT);

            // Expected amount is singleFeeAmount - 1 because we leave 1 wei of WETH behind for future gas savings.
            return expect(await weth.balanceOf(staking.address).callAsync()).to.bignumber.equal(singleFeeAmount.minus(1));
        });

        it('should collect fees for non-zero pool', async () => {
            const eth100 = constants.ONE_ETHER.multipliedBy(100);
            await staking.createTestPool(poolId, eth100, eth100).awaitTransactionSuccessAsync();

            await protocolFees.collectProtocolFee(poolId).awaitTransactionSuccessAsync({ value: singleFeeAmount });
            await protocolFees.transferFeesForPool(poolId).awaitTransactionSuccessAsync();

            // Expected amount is singleFeeAmount - 1 because we leave 1 wei of WETH behind for future gas savings.
            return expect((await staking.getStakingPoolStatsThisEpoch(poolId).callAsync()).feesCollected).to.bignumber.equal(singleFeeAmount.minus(1));
        });
    });
});
