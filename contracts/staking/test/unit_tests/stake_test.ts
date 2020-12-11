import {
    blockchainTests,
    expect,
    filterLogs,
    filterLogsToArguments,
    getRandomInteger,
    Numberish,
    shortZip,
} from '@0x/contracts-test-utils';
import { BigNumber, hexUtils, StakingRevertErrors } from '@0x/utils';
import * as _ from 'lodash';

import { StakeStatus } from '../../src/types';

import { artifacts } from '../artifacts';
import {
    GoverancePowerContract,
    TestMixinStakeContract,
    TestMixinStakeDecreaseCurrentAndNextBalanceEventArgs as DecreaseCurrentAndNextBalanceEventArgs,
    TestMixinStakeDecreaseNextBalanceEventArgs as DecreaseNextBalanceEventArgs,
    TestMixinStakeEvents as StakeEvents,
    TestMixinStakeIncreaseCurrentAndNextBalanceEventArgs as IncreaseCurrentAndNextBalanceEventArgs,
    TestMixinStakeIncreaseNextBalanceEventArgs as IncreaseNextBalanceEventArgs,
    TestMixinStakeMoveStakeEventArgs as MoveStakeEventArgs,
    TestMixinStakeMoveStakeStorageEventArgs as MoveStakeStorageEventArgs,
    TestMixinStakeStakeEventArgs as StakeEventArgs,
    TestMixinStakeUnstakeEventArgs as UnstakeEventArgs,
    TestMixinStakeWithdrawAndSyncDelegatorRewardsEventArgs as WithdrawAndSyncDelegatorRewardsEventArgs,
    TestMixinStakeZrxVaultDepositFromEventArgs as ZrxVaultDepositFromEventArgs,
    TestMixinStakeZrxVaultWithdrawFromEventArgs as ZrxVaultWithdrawFromEventArgs,
} from '../wrappers';

blockchainTests.resets('MixinStake unit tests', env => {
    let testContract: TestMixinStakeContract;
    let staker: string;
    let govContract: GoverancePowerContract;
    let stakerUndelegatedStakeSlot: string;
    let currentEpoch: BigNumber;

    before(async () => {
        [staker] = await env.getAccountAddressesAsync();
        testContract = await TestMixinStakeContract.deployFrom0xArtifactAsync(
            artifacts.TestMixinStake,
            env.provider,
            env.txDefaults,
            artifacts,
        );
        govContract = await GoverancePowerContract.deployFrom0xArtifactAsync(
            artifacts.GoverancePower,
            env.provider,
            env.txDefaults,
            artifacts,
            testContract.address,
        );
        // Set the onchain gov contract to the right one
        await testContract.setOnchainGov(govContract.address).awaitTransactionSuccessAsync();

        currentEpoch = await testContract.currentEpoch().callAsync();
        stakerUndelegatedStakeSlot = await testContract
            .getOwnerStakeByStatusSlot(staker, StakeStatus.Undelegated)
            .callAsync();
    });

    describe('stake()', () => {
        it('deposits funds into the ZRX vault', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract.stake(amount).awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<ZrxVaultDepositFromEventArgs>(logs, StakeEvents.ZrxVaultDepositFrom);
            expect(events).to.be.length(1);
            expect(events[0].staker).to.eq(staker);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('increases current and next undelegated stake balance', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract.stake(amount).awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<IncreaseCurrentAndNextBalanceEventArgs>(
                logs,
                StakeEvents.IncreaseCurrentAndNextBalance,
            );
            expect(events).to.be.length(1);
            expect(events[0].balanceSlot).to.eq(stakerUndelegatedStakeSlot);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('raises a `Stake` event', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract.stake(amount).awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<StakeEventArgs>(logs, StakeEvents.Stake);
            expect(events).to.be.length(1);
            expect(events[0].staker).to.eq(staker);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('Increases onchain gov power', async () => {
            const amount = getRandomInteger(0, 100e18);
            await testContract.stake(amount).awaitTransactionSuccessAsync();
            const power_amount = await govContract.balanceOf(staker).callAsync();
            expect(power_amount).to.be.bignumber.eq(amount);
        });
    });

    describe('unstake()', () => {
        async function setUndelegatedStakeAsync(
            currentEpochBalance: Numberish,
            nextEpochBalance: Numberish,
        ): Promise<void> {
            await testContract
                .setOwnerStakeByStatus(staker, StakeStatus.Undelegated, {
                    currentEpoch,
                    currentEpochBalance: new BigNumber(currentEpochBalance),
                    nextEpochBalance: new BigNumber(nextEpochBalance),
                })
                .awaitTransactionSuccessAsync();
        }

        it('throws if not enough undelegated stake in the current epoch', async () => {
            const amount = getRandomInteger(0, 100e18);
            await setUndelegatedStakeAsync(amount.minus(1), amount);
            const tx = testContract.unstake(amount).awaitTransactionSuccessAsync();
            const expectedError = new StakingRevertErrors.InsufficientBalanceError(amount, amount.minus(1));
            return expect(tx).to.revertWith(expectedError);
        });

        it('throws if not enough undelegated stake in the next epoch', async () => {
            const amount = getRandomInteger(0, 100e18);
            await setUndelegatedStakeAsync(amount, amount.minus(1));
            const tx = testContract.unstake(amount).awaitTransactionSuccessAsync();
            const expectedError = new StakingRevertErrors.InsufficientBalanceError(amount, amount.minus(1));
            return expect(tx).to.revertWith(expectedError);
        });

        it('throws if not enough undelegated stake in both epochs', async () => {
            const amount = getRandomInteger(0, 100e18);
            await setUndelegatedStakeAsync(amount.minus(1), amount.minus(1));
            const tx = testContract.unstake(amount).awaitTransactionSuccessAsync();
            const expectedError = new StakingRevertErrors.InsufficientBalanceError(amount, amount.minus(1));
            return expect(tx).to.revertWith(expectedError);
        });

        it('decreases current and next undelegated stake balance', async () => {
            const amount = getRandomInteger(0, 100e18);
            await setUndelegatedStakeAsync(amount, amount);
            const { logs } = await testContract.unstake(amount).awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<DecreaseCurrentAndNextBalanceEventArgs>(
                logs,
                StakeEvents.DecreaseCurrentAndNextBalance,
            );
            expect(events).to.be.length(1);
            expect(events[0].balanceSlot).to.eq(stakerUndelegatedStakeSlot);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('withdraws funds from the ZRX vault', async () => {
            const amount = getRandomInteger(0, 100e18);
            await setUndelegatedStakeAsync(amount, amount);
            const { logs } = await testContract.unstake(amount).awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<ZrxVaultWithdrawFromEventArgs>(logs, StakeEvents.ZrxVaultWithdrawFrom);
            expect(events).to.be.length(1);
            expect(events[0].staker).to.eq(staker);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('emits an `Unstake` event', async () => {
            const amount = getRandomInteger(0, 100e18);
            await setUndelegatedStakeAsync(amount, amount);
            const { logs } = await testContract.unstake(amount).awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<UnstakeEventArgs>(logs, StakeEvents.Unstake);
            expect(events).to.be.length(1);
            expect(events[0].staker).to.eq(staker);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('decreases goverence power for user', async () => {
            const amount = getRandomInteger(0, 100e18);
            // Stake to create balance, and check it was created
            await testContract.stake(amount).awaitTransactionSuccessAsync();
            let power_amount = await govContract.balanceOf(staker).callAsync();
            expect(power_amount).to.be.bignumber.eq(amount);
            await setUndelegatedStakeAsync(amount, amount);
            // Unstake to remove balance
            await testContract.unstake(amount).awaitTransactionSuccessAsync();
            power_amount = await govContract.balanceOf(staker).callAsync();
            expect(power_amount).to.be.bignumber.eq(0);
        });
    });

    describe('moveStake()', () => {
        const INVALID_POOL_ERROR = 'INVALID_POOL';
        const INVALID_POOL_ID = hexUtils.leftPad(0);
        const VALID_POOL_IDS = [hexUtils.random(), hexUtils.random()];
        let delegatedStakeToPoolByOwnerSlots: string[];
        let delegatedStakeByPoolIdSlots: string[];
        let globalDelegatedStakeSlot: string;
        let stakerDelegatedStakeSlot: string;

        before(async () => {
            delegatedStakeToPoolByOwnerSlots = await Promise.all(
                VALID_POOL_IDS.map(async poolId =>
                    testContract.getDelegatedStakeToPoolByOwnerSlot(poolId, staker).callAsync(),
                ),
            );
            delegatedStakeByPoolIdSlots = await Promise.all(
                VALID_POOL_IDS.map(async poolId => testContract.getDelegatedStakeByPoolIdSlot(poolId).callAsync()),
            );
            globalDelegatedStakeSlot = await testContract.getGlobalStakeByStatusSlot(StakeStatus.Delegated).callAsync();
            stakerDelegatedStakeSlot = await testContract
                .getOwnerStakeByStatusSlot(staker, StakeStatus.Delegated)
                .callAsync();
        });

        it('throws if the "from" pool is invalid', async () => {
            const tx = testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: INVALID_POOL_ID },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    getRandomInteger(0, 100e18),
                )
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith(INVALID_POOL_ERROR);
        });

        it('throws if the "to" pool is invalid', async () => {
            const tx = testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: INVALID_POOL_ID },
                    getRandomInteger(0, 100e18),
                )
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith(INVALID_POOL_ERROR);
        });

        it('throws if the "from" and "to" pools are invalid', async () => {
            const tx = testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: INVALID_POOL_ID },
                    { status: StakeStatus.Delegated, poolId: INVALID_POOL_ID },
                    getRandomInteger(0, 100e18),
                )
                .awaitTransactionSuccessAsync();
            return expect(tx).to.revertWith(INVALID_POOL_ERROR);
        });

        it('withdraws delegator rewards when "from" stake is delegated', async () => {
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[1] },
                    getRandomInteger(0, 100e18),
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<WithdrawAndSyncDelegatorRewardsEventArgs>(
                logs,
                StakeEvents.WithdrawAndSyncDelegatorRewards,
            );
            expect(events).to.be.length(1);
            expect(events[0].poolId).to.eq(VALID_POOL_IDS[0]);
            expect(events[0].delegator).to.eq(staker);
        });

        it('withdraws delegator rewards when "to" stake is delegated', async () => {
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    getRandomInteger(0, 100e18),
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<WithdrawAndSyncDelegatorRewardsEventArgs>(
                logs,
                StakeEvents.WithdrawAndSyncDelegatorRewards,
            );
            expect(events).to.be.length(1);
            expect(events[0].poolId).to.eq(VALID_POOL_IDS[1]);
            expect(events[0].delegator).to.eq(staker);
        });

        it('withdraws delegator rewards when both stakes are both delegated', async () => {
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    getRandomInteger(0, 100e18),
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<WithdrawAndSyncDelegatorRewardsEventArgs>(
                logs,
                StakeEvents.WithdrawAndSyncDelegatorRewards,
            );
            expect(events).to.be.length(2);
            for (const [event, poolId] of shortZip(events, VALID_POOL_IDS)) {
                expect(event.poolId).to.eq(poolId);
                expect(event.delegator).to.eq(staker);
            }
        });

        it('does not withdraw delegator rewards when both stakes are both undelegated', async () => {
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[1] },
                    getRandomInteger(0, 100e18),
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<WithdrawAndSyncDelegatorRewardsEventArgs>(
                logs,
                StakeEvents.WithdrawAndSyncDelegatorRewards,
            );
            expect(events).to.be.length(0);
        });

        it('decreases pool and global delegated stake counters when "from" stake is delegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const decreaseNextBalanceEvents = filterLogsToArguments<DecreaseNextBalanceEventArgs>(
                logs,
                StakeEvents.DecreaseNextBalance,
            );
            const counters = [
                delegatedStakeToPoolByOwnerSlots[0],
                delegatedStakeByPoolIdSlots[0],
                globalDelegatedStakeSlot,
            ];
            expect(decreaseNextBalanceEvents).to.be.length(3);
            for (const [event, slot] of shortZip(decreaseNextBalanceEvents, counters)) {
                expect(event.balanceSlot).to.eq(slot);
                expect(event.amount).to.bignumber.eq(amount);
            }
        });

        it('increases pool and global delegated stake counters when "to" stake is delegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const increaseNextBalanceEvents = filterLogsToArguments<IncreaseNextBalanceEventArgs>(
                logs,
                StakeEvents.IncreaseNextBalance,
            );
            const counters = [
                delegatedStakeToPoolByOwnerSlots[1],
                delegatedStakeByPoolIdSlots[1],
                globalDelegatedStakeSlot,
            ];
            expect(increaseNextBalanceEvents).to.be.length(3);
            for (const [event, slot] of shortZip(increaseNextBalanceEvents, counters)) {
                expect(event.balanceSlot).to.eq(slot);
                expect(event.amount).to.bignumber.eq(amount);
            }
        });

        it('decreases then increases pool and global delegated stake counters when both stakes are delegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const decreaseNextBalanceEvents = filterLogs<DecreaseNextBalanceEventArgs>(
                logs,
                StakeEvents.DecreaseNextBalance,
            );
            const increaseNextBalanceEvents = filterLogs<IncreaseNextBalanceEventArgs>(
                logs,
                StakeEvents.IncreaseNextBalance,
            );
            const decreaseCounters = [
                delegatedStakeToPoolByOwnerSlots[0],
                delegatedStakeByPoolIdSlots[0],
                globalDelegatedStakeSlot,
            ];
            expect(decreaseNextBalanceEvents).to.be.length(3);
            for (const [event, slot] of shortZip(decreaseNextBalanceEvents, decreaseCounters)) {
                expect(event.args.balanceSlot).to.eq(slot);
                expect(event.args.amount).to.bignumber.eq(amount);
            }
            const increaseCounters = [
                delegatedStakeToPoolByOwnerSlots[1],
                delegatedStakeByPoolIdSlots[1],
                globalDelegatedStakeSlot,
            ];
            expect(increaseNextBalanceEvents).to.be.length(3);
            for (const [event, slot] of shortZip(increaseNextBalanceEvents, increaseCounters)) {
                expect(event.args.balanceSlot).to.eq(slot);
                expect(event.args.amount).to.bignumber.eq(amount);
            }
            // Check that all decreases occur before the increases.
            const maxDecreaseIndex = _.max(decreaseNextBalanceEvents.map(e => e.logIndex)) as number;
            const maxIncreaseIndex = _.max(increaseNextBalanceEvents.map(e => e.logIndex)) as number;
            expect(maxDecreaseIndex).to.be.lt(maxIncreaseIndex);
        });

        it('does not change pool and global delegated stake counters when both stakes are undelegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const decreaseNextBalanceEvents = filterLogsToArguments<DecreaseNextBalanceEventArgs>(
                logs,
                StakeEvents.DecreaseNextBalance,
            );
            const increaseNextBalanceEvents = filterLogsToArguments<IncreaseNextBalanceEventArgs>(
                logs,
                StakeEvents.IncreaseNextBalance,
            );
            expect(decreaseNextBalanceEvents).to.be.length(0);
            expect(increaseNextBalanceEvents).to.be.length(0);
        });

        it('does nothing when moving the owner stake from undelegated to undelegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<MoveStakeStorageEventArgs>(logs, StakeEvents.MoveStakeStorage);
            expect(events).to.be.length(0);
        });

        it('does nothing when moving zero stake', async () => {
            const amount = new BigNumber(0);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<MoveStakeStorageEventArgs>(logs, StakeEvents.MoveStakeStorage);
            expect(events).to.be.length(0);
        });

        it('moves the owner stake between the same pointer when both are delegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<MoveStakeStorageEventArgs>(logs, StakeEvents.MoveStakeStorage);
            expect(events).to.be.length(1);
            expect(events[0].fromBalanceSlot).to.eq(stakerDelegatedStakeSlot);
            expect(events[0].toBalanceSlot).to.eq(stakerDelegatedStakeSlot);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('moves the owner stake between different pointers when "from" is undelegated and "to" is delegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<MoveStakeStorageEventArgs>(logs, StakeEvents.MoveStakeStorage);
            expect(events).to.be.length(1);
            expect(events[0].fromBalanceSlot).to.eq(stakerUndelegatedStakeSlot);
            expect(events[0].toBalanceSlot).to.eq(stakerDelegatedStakeSlot);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('moves the owner stake between different pointers when "from" is delegated and "to" is undelegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<MoveStakeStorageEventArgs>(logs, StakeEvents.MoveStakeStorage);
            expect(events).to.be.length(1);
            expect(events[0].fromBalanceSlot).to.eq(stakerDelegatedStakeSlot);
            expect(events[0].toBalanceSlot).to.eq(stakerUndelegatedStakeSlot);
            expect(events[0].amount).to.bignumber.eq(amount);
        });

        it('emits a `MoveStake` event', async () => {
            const amount = getRandomInteger(0, 100e18);
            const { logs } = await testContract
                .moveStake(
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            const events = filterLogsToArguments<MoveStakeEventArgs>(logs, StakeEvents.MoveStake);
            expect(events).to.be.length(1);
            expect(events[0].staker).to.eq(staker);
            expect(events[0].amount).to.bignumber.eq(amount);
            expect(events[0].fromStatus).to.eq(StakeStatus.Undelegated);
            expect(events[0].toStatus).to.eq(StakeStatus.Delegated);
            expect(events[0].fromPool).to.eq(VALID_POOL_IDS[0]);
            expect(events[0].toPool).to.eq(VALID_POOL_IDS[1]);
        });

        // A BigNumber floored half function
        function half(amount: BigNumber): BigNumber {
            if (amount.mod(2).eq(1)) {
                return amount.minus(1).div(2);
            } else {
                return amount.div(2);
            }
        }

        it('it sets gov power correctly when from is undelegated and too is delegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            // We need to put the amount into the contract to create gov power
            await testContract.addOnchainGovPower(staker, amount).awaitTransactionSuccessAsync();
            // then we move it
            await testContract
                .moveStake(
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            // Assigns half to the user
            let power_amount = await govContract.balanceOf(staker).callAsync();
            expect(power_amount).to.be.bignumber.eq(amount.minus(half(amount)));
            // Assigns half to the pool operator
            const pool = await testContract.getStakingPool(VALID_POOL_IDS[1]).callAsync();
            power_amount = await govContract.balanceOf(pool.operator).callAsync();
            expect(power_amount).to.be.bignumber.eq(half(amount));
        });

        it('it sets gov power correctly when from is delegated and too is undelegated', async () => {
            const amount = getRandomInteger(0, 100e18);
            // We need to put the amount into the contract to create gov power
            const pool = await testContract.getStakingPool(VALID_POOL_IDS[0]).callAsync();
            await testContract.addOnchainGovPower(staker, amount.minus(half(amount))).awaitTransactionSuccessAsync();
            await testContract.addOnchainGovPower(pool.operator, half(amount)).awaitTransactionSuccessAsync();
            // then we move it
            await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Undelegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            // Assigns half to the user
            let power_amount = await govContract.balanceOf(staker).callAsync();
            expect(power_amount).to.be.bignumber.eq(amount);
            // Assigns half to the pool operator
            power_amount = await govContract.balanceOf(pool.operator).callAsync();
            expect(power_amount).to.be.bignumber.eq(0);
        });

        it('It sets gov power correctly when moving between pools', async () => {
            const amount = getRandomInteger(0, 100e18);
            const pool0 = await testContract.getStakingPool(VALID_POOL_IDS[0]).callAsync();
            const pool1 = await testContract.getStakingPool(VALID_POOL_IDS[1]).callAsync();
            // We need to put the amount into the contract to create gov power
            await testContract.addOnchainGovPower(staker, amount.minus(half(amount))).awaitTransactionSuccessAsync();
            await testContract.addOnchainGovPower(pool0.operator, half(amount)).awaitTransactionSuccessAsync();
            // then we move it
            await testContract
                .moveStake(
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[0] },
                    { status: StakeStatus.Delegated, poolId: VALID_POOL_IDS[1] },
                    amount,
                )
                .awaitTransactionSuccessAsync();
            // Assigns half to the user
            let power_amount = await govContract.balanceOf(staker).callAsync();
            expect(power_amount).to.be.bignumber.eq(amount.minus(half(amount)));
            // Assigns half to the pool operator
            power_amount = await govContract.balanceOf(pool1.operator).callAsync();
            expect(power_amount).to.be.bignumber.eq(half(amount));
        });
    });
});

// tslint:disable: max-file-line-count
