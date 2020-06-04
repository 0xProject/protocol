import * as _ from 'lodash';

import {
    AllTimeDelegatorPoolStats,
    AllTimePoolStats,
    AllTimeStakingStats,
    DelegatorEvent,
    Epoch,
    EpochPoolStats,
    EpochWithFees,
    Pool,
    PoolAvgRewards,
    PoolEpochDelegatorStats,
    PoolEpochRewards,
    PoolProtocolFeesGenerated,
    RawAllTimeDelegatorPoolsStats,
    RawAllTimePoolRewards,
    RawAllTimeStakingStats,
    RawDelegatorDeposited,
    RawDelegatorEvent,
    RawDelegatorStaked,
    RawEpoch,
    RawEpochPoolStats,
    RawEpochWithFees,
    RawPool,
    RawPoolAvgRewards,
    RawPoolEpochRewards,
    RawPoolProtocolFeesGenerated,
    RawPoolTotalProtocolFeesGenerated,
    TransactionDate,
} from '../types';

export const stakingUtils = {
    getEpochFromRaw: (rawEpoch: RawEpoch): Epoch => {
        const {
            epoch_id,
            starting_transaction_hash,
            starting_block_number,
            starting_block_timestamp,
            ending_transaction_hash,
            ending_block_number,
            ending_block_timestamp,
            zrx_deposited,
            zrx_staked,
        } = rawEpoch;
        let epochEnd: TransactionDate | undefined;
        if (ending_transaction_hash && ending_block_number) {
            epochEnd = {
                blockNumber: parseInt(ending_block_number, 10),
                txHash: ending_transaction_hash,
                timestamp: ending_block_timestamp || undefined,
            };
        }
        return {
            epochId: parseInt(epoch_id, 10),
            epochStart: {
                blockNumber: parseInt(starting_block_number, 10),
                txHash: starting_transaction_hash,
                timestamp: starting_block_timestamp || undefined,
            },
            epochEnd,
            zrxDeposited: Number(zrx_deposited || 0),
            zrxStaked: Number(zrx_staked || 0),
        };
    },
    getEpochWithFeesFromRaw: (rawEpochWithFees: RawEpochWithFees): EpochWithFees => {
        const {
            epoch_id,
            starting_transaction_hash,
            starting_block_number,
            starting_block_timestamp,
            ending_transaction_hash,
            ending_block_number,
            ending_block_timestamp,
            zrx_deposited,
            zrx_staked,
            protocol_fees_generated_in_eth,
        } = rawEpochWithFees;
        let epochEnd: TransactionDate | undefined;
        if (ending_transaction_hash && ending_block_number) {
            epochEnd = {
                blockNumber: parseInt(ending_block_number, 10),
                txHash: ending_transaction_hash,
                timestamp: ending_block_timestamp || undefined,
            };
        }
        return {
            epochId: parseInt(epoch_id, 10),
            epochStart: {
                blockNumber: parseInt(starting_block_number, 10),
                txHash: starting_transaction_hash,
                timestamp: starting_block_timestamp || undefined,
            },
            epochEnd,
            zrxDeposited: Number(zrx_deposited || 0),
            zrxStaked: Number(zrx_staked || 0),
            protocolFeesGeneratedInEth: Number(protocol_fees_generated_in_eth || 0),
        };
    },
    getPoolFromRaw: (rawPool: RawPool): Pool => {
        const {
            pool_id,
            operator,
            created_at_block_number,
            created_at_transaction_hash,
            isVerified,
            logo_url,
            location,
            bio,
            website,
            name,
        } = rawPool;
        return {
            poolId: pool_id,
            operatorAddress: operator,
            createdAt: {
                blockNumber: parseInt(created_at_block_number, 10),
                txHash: created_at_transaction_hash,
            },
            metaData: {
                name: name || undefined,
                bio: bio || undefined,
                location: location || undefined,
                isVerified: !!isVerified,
                logoUrl: logo_url || undefined,
                websiteUrl: website || undefined,
            },
        };
    },
    getPoolsFromRaw: (rawPools: RawPool[]): Pool[] => {
        return rawPools.map(stakingUtils.getPoolFromRaw);
    },
    getEpochPoolStatsFromRaw: (rawEpochPoolStats: RawEpochPoolStats): EpochPoolStats => {
        const {
            pool_id,
            maker_addresses,
            operator_share,
            zrx_staked,
            operator_zrx_staked,
            member_zrx_staked,
            share_of_stake,
            total_protocol_fees_generated_in_eth,
            share_of_fees,
            number_of_fills,
            share_of_fills,
            approximate_stake_ratio,
        } = rawEpochPoolStats;
        return {
            poolId: pool_id,
            zrxStaked: Number(zrx_staked || 0),
            operatorZrxStaked: Number(operator_zrx_staked || 0),
            memberZrxStaked: Number(member_zrx_staked || 0),
            shareOfStake: Number(share_of_stake),
            operatorShare: _.isNil(operator_share) ? undefined : Number(operator_share),
            approximateStakeRatio: approximate_stake_ratio ? Number(approximate_stake_ratio) : 0,
            makerAddresses: maker_addresses || [],
            totalProtocolFeesGeneratedInEth: Number(total_protocol_fees_generated_in_eth || 0),
            shareOfFees: Number(share_of_fees || 0),
            numberOfFills: Number(number_of_fills || 0),
            shareOfFills: Number(share_of_fills || 0),
        };
    },
    getEpochPoolsStatsFromRaw: (rawEpochPoolsStats: RawEpochPoolStats[]): EpochPoolStats[] => {
        return rawEpochPoolsStats.map(stakingUtils.getEpochPoolStatsFromRaw);
    },
    getPoolEpochRewardsFromRaw: (rawPoolEpochRewards: RawPoolEpochRewards[]): PoolEpochRewards[] => {
        return rawPoolEpochRewards.map(epochReward => ({
            epochId: Number(epochReward.epoch_id),
            epochStartTimestamp: epochReward.starting_block_timestamp,
            epochEndTimestamp: epochReward.ending_timestamp,
            operatorRewardsPaidInEth: Number(epochReward.operator_reward || 0),
            membersRewardsPaidInEth: Number(epochReward.members_reward || 0),
            totalRewardsPaidInEth: Number(epochReward.total_reward || 0),
        }));
    },
    getPoolProtocolFeesGeneratedFromRaw: (
        rawPoolProtocolFeesGenerated: RawPoolProtocolFeesGenerated,
    ): PoolProtocolFeesGenerated => {
        const {
            pool_id,
            seven_day_protocol_fees_generated_in_eth,
            seven_day_number_of_fills,
        } = rawPoolProtocolFeesGenerated;
        return {
            poolId: pool_id,
            sevenDayProtocolFeesGeneratedInEth: Number(seven_day_protocol_fees_generated_in_eth || 0),
            sevenDayNumberOfFills: Number(seven_day_number_of_fills || 0),
        };
    },
    getPoolsProtocolFeesGeneratedFromRaw: (
        rawPoolsProtocolFeesGenerated: RawPoolProtocolFeesGenerated[],
    ): PoolProtocolFeesGenerated[] => {
        return rawPoolsProtocolFeesGenerated.map(stakingUtils.getPoolProtocolFeesGeneratedFromRaw);
    },
    getPoolAvgRewardsFromRaw: (rawPoolAvgRewards: RawPoolAvgRewards): PoolAvgRewards => {
        const {
            pool_id,
            avg_member_reward_in_eth,
            avg_total_reward_in_eth,
            avg_member_reward_eth_per_zrx,
        } = rawPoolAvgRewards;
        return {
            poolId: pool_id,
            avgMemberRewardInEth: Number(avg_member_reward_in_eth || 0),
            avgTotalRewardInEth: Number(avg_total_reward_in_eth || 0),
            avgMemberRewardEthPerZrx: Number(avg_member_reward_eth_per_zrx || 0),
        };
    },
    getPoolsAvgRewardsFromRaw: (rawPoolsAvgRewards: RawPoolAvgRewards[]): PoolAvgRewards[] => {
        return rawPoolsAvgRewards.map(stakingUtils.getPoolAvgRewardsFromRaw);
    },
    getZrxStakedFromRawDelegatorDeposited: (rawDelegatorDeposited: RawDelegatorDeposited[]): number => {
        const resultRow: RawDelegatorDeposited | undefined = _.head(rawDelegatorDeposited);
        return resultRow ? parseFloat(resultRow.zrx_deposited) : 0;
    },
    getDelegatorStakedFromRaw: (rawDelegatorStaked: RawDelegatorStaked[]) => {
        const firstRow = _.head(rawDelegatorStaked);
        const zrxStaked = (firstRow && parseFloat(firstRow.zrx_staked_overall)) || 0;

        const poolData: PoolEpochDelegatorStats[] = rawDelegatorStaked.map(row => ({
            poolId: row.pool_id,
            zrxStaked: parseFloat(row.zrx_staked_in_pool) || 0,
        }));

        return {
            zrxStaked,
            poolData,
        };
    },
    getDelegatorAllTimeStatsFromRaw: (
        rawDelegatorAllTimeStats: RawAllTimeDelegatorPoolsStats[],
    ): AllTimeDelegatorPoolStats[] => {
        const poolData: AllTimeDelegatorPoolStats[] = rawDelegatorAllTimeStats.map(rawStats => ({
            poolId: rawStats.pool_id,
            rewardsInEth: parseFloat(rawStats.reward) || 0,
        }));

        return poolData;
    },
    getDelegatorEventsFromRaw: (rawDelegatorEvents: RawDelegatorEvent[]): DelegatorEvent[] => {
        const delegatorEvents: DelegatorEvent[] = rawDelegatorEvents.map(rawEvent => ({
            eventType: rawEvent.event_type,
            address: rawEvent.address,
            blockNumber: rawEvent.block_number === null ? null : Number(rawEvent.block_number),
            eventTimestamp: rawEvent.event_timestamp,
            transactionHash: rawEvent.transaction_hash,
            eventArgs: rawEvent.event_args,
        }));

        return delegatorEvents;
    },
    getAlltimePoolRewards: (
        rawAllTimePoolRewards?: RawAllTimePoolRewards,
        rawPoolsProtocolFeesGenerated?: RawPoolTotalProtocolFeesGenerated,
    ): AllTimePoolStats => {
        return {
            operatorRewardsPaidInEth: Number(_.get(rawAllTimePoolRewards, 'operator_reward', 0)),
            membersRewardsPaidInEth: Number(_.get(rawAllTimePoolRewards, 'members_reward', 0)),
            totalRewardsPaidInEth: Number(_.get(rawAllTimePoolRewards, 'total_rewards', 0)),
            protocolFeesGeneratedInEth: Number(_.get(rawPoolsProtocolFeesGenerated, 'total_protocol_fees', 0)),
            numberOfFills: Number(_.get(rawPoolsProtocolFeesGenerated, 'number_of_fills', 0)),
        };
    },
    getAllTimeStakingStatsFromRaw: (rawAllTimeAllTimeStats: RawAllTimeStakingStats): AllTimeStakingStats => {
        const { total_rewards_paid } = rawAllTimeAllTimeStats;
        return {
            totalRewardsPaidInEth: Number(total_rewards_paid || 0),
        };
    },
};
