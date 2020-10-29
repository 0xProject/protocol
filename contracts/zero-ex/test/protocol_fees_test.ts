import { blockchainTests, constants, expect } from '@0x/contracts-test-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { artifacts } from './artifacts';
import { TestProtocolFeesContract, TestStakingContract, TestWethContract } from './wrappers';

blockchainTests.resets('ProtocolFees', env => {
    let payer: string;
    let protocolFees: TestProtocolFeesContract;
    let staking: TestStakingContract;
    let weth: TestWethContract;

    before(async () => {
        [payer] = await env.getAccountAddressesAsync();
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

    describe('_collectProtocolFee()', () => {
        it('can collect a protocol fee multiple times', async () => {
            const poolId = hexUtils.random();
            const amount1 = new BigNumber(123456);
            const amount2 = new BigNumber(456789);

            // Transfer amount1 via WETH.
            await protocolFees
                .collectProtocolFee(poolId, amount1, weth.address)
                .awaitTransactionSuccessAsync({ from: payer });

            // Send to staking contract.
            await protocolFees
                .transferFeesForPool(poolId, staking.address, weth.address)
                .awaitTransactionSuccessAsync();

            // Transfer amount2 via ETH.
            await protocolFees
                .collectProtocolFee(poolId, amount2, weth.address)
                .awaitTransactionSuccessAsync({ from: payer, value: amount2 });

            // Send to staking contract again.
            await protocolFees
                .transferFeesForPool(poolId, staking.address, weth.address)
                .awaitTransactionSuccessAsync();

            const balance = await staking.balanceForPool(poolId).callAsync();
            const wethBalance = await weth.balanceOf(staking.address).callAsync();

            // Check that staking accounted for the collected ether properly.
            expect(balance).to.bignumber.eq(wethBalance);

            // We leave 1 wei behind, of both ETH and WETH, for gas reasons.
            const total = amount1.plus(amount2).minus(2);
            return expect(balance).to.bignumber.eq(total);
        });
    });
});
