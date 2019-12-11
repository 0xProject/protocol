import * as _ from 'lodash';

import {
    AllTimeDelegatorPoolStats,
    Epoch,
    EpochPoolStats,
    Pool,
    PoolEpochDelegatorStats,
    PoolProtocolFeesGenerated,
    RawAllTimeDelegatorPoolsStats,
    RawDelegatorDeposited,
    RawDelegatorStaked,
    RawEpoch,
    RawEpochPoolStats,
    RawPool,
    RawPoolProtocolFeesGenerated,
} from '../types';

export const stakingUtils = {
    getEpochFromRaw: (rawEpoch: RawEpoch): Epoch => {
        const { epoch_id, starting_transaction_hash, starting_block_number, starting_block_timestamp } = rawEpoch;
        return {
            epochId: parseInt(epoch_id, 10),
            epochStart: {
                blockNumber: parseInt(starting_block_number, 10),
                txHash: starting_transaction_hash,
                timestamp: starting_block_timestamp || undefined,
            },
        };
    },
    getPoolFromRaw: (rawPool: RawPool): Pool => {
        const {
            pool_id,
            operator,
            created_at_block_number,
            created_at_transaction_hash,
            verified,
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
                isVerified: verified === 'true',
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
            total_protocol_fees_generated_in_eth,
            approximate_stake_ratio,
        } = rawEpochPoolStats;
        return {
            poolId: pool_id,
            zrxStaked: Number(zrx_staked || 0),
            operatorShare: Number(operator_share),
            approximateStakeRatio: approximate_stake_ratio ? Number(approximate_stake_ratio) : 0,
            makerAddresses: maker_addresses || [],
            totalProtocolFeesGeneratedInEth: Number(total_protocol_fees_generated_in_eth || 0),
        };
    },
    getEpochPoolsStatsFromRaw: (rawEpochPoolsStats: RawEpochPoolStats[]): EpochPoolStats[] => {
        return rawEpochPoolsStats.map(stakingUtils.getEpochPoolStatsFromRaw);
    },
    getPoolProtocolFeesGeneratedFromRaw: (
        rawPoolProtocolFeesGenerated: RawPoolProtocolFeesGenerated,
    ): PoolProtocolFeesGenerated => {
        const { pool_id, seven_day_protocol_fees_generated_in_eth } = rawPoolProtocolFeesGenerated;
        return {
            poolId: pool_id,
            sevenDayProtocolFeesGeneratedInEth: Number(seven_day_protocol_fees_generated_in_eth || 0),
        };
    },
    getPoolsProtocolFeesGeneratedFromRaw: (
        rawPoolsProtocolFeesGenerated: RawPoolProtocolFeesGenerated[],
    ): PoolProtocolFeesGenerated[] => {
        return rawPoolsProtocolFeesGenerated.map(stakingUtils.getPoolProtocolFeesGeneratedFromRaw);
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
            rewards: parseFloat(rawStats.reward) || 0,
        }));

        return poolData;
    },
};
