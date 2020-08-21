import * as _ from 'lodash';
import { Connection } from 'typeorm';

import { NotFoundError } from '../errors';
import * as queries from '../queries/staking_queries';
import {
    AllTimeDelegatorStats,
    AllTimePoolStats,
    AllTimeStakingStats,
    DelegatorEvent,
    Epoch,
    EpochDelegatorStats,
    EpochWithFees,
    Pool,
    PoolEpochRewards,
    PoolWithStats,
    RawAllTimePoolRewards,
    RawAllTimeStakingStats,
    RawDelegatorDeposited,
    RawDelegatorEvent,
    RawDelegatorStaked,
    RawEpoch,
    RawEpochWithFees,
    RawPool,
    RawPoolEpochRewards,
    RawPoolTotalProtocolFeesGenerated,
} from '../types';
import { stakingUtils } from '../utils/staking_utils';
import { utils } from '../utils/utils';

export class StakingDataService {
    private readonly _connection: Connection;
    constructor(connection: Connection) {
        this._connection = connection;
    }

    public async getEpochNAsync(epochId: number): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(queries.epochNQuery, [epochId]));
        if (!rawEpoch) {
            throw new Error(`Could not find epoch ${epochId}`);
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }

    public async getEpochNWithFeesAsync(epochId: number): Promise<Epoch> {
        const rawEpochWithFees: RawEpochWithFees | undefined = _.head(
            await this._connection.query(queries.epochNWithFeesQuery, [epochId]),
        );
        if (!rawEpochWithFees) {
            throw new Error(`Could not find epoch ${epochId}`);
        }
        const epoch = stakingUtils.getEpochWithFeesFromRaw(rawEpochWithFees);
        return epoch;
    }

    public async getCurrentEpochAsync(): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(queries.currentEpochQuery));
        if (!rawEpoch) {
            throw new Error('Could not find the current epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }

    public async getCurrentEpochWithFeesAsync(): Promise<EpochWithFees> {
        const rawEpochWithFees: RawEpochWithFees | undefined = _.head(
            await this._connection.query(queries.currentEpochWithFeesQuery),
        );
        if (!rawEpochWithFees) {
            throw new Error('Could not find the current epoch.');
        }
        const epoch = stakingUtils.getEpochWithFeesFromRaw(rawEpochWithFees);
        return epoch;
    }

    public async getNextEpochAsync(): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(queries.nextEpochQuery));
        if (!rawEpoch) {
            throw new Error('Could not find the next epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }

    public async getNextEpochWithFeesAsync(): Promise<EpochWithFees> {
        const rawEpoch: RawEpochWithFees | undefined = _.head(await this._connection.query(queries.nextEpochQuery));
        if (!rawEpoch) {
            throw new Error('Could not find the next epoch.');
        }
        const epoch = stakingUtils.getEpochWithFeesFromRaw(rawEpoch);
        return epoch;
    }

    public async getStakingPoolsAsync(): Promise<Pool[]> {
        const rawPools: RawPool[] = await this._connection.query(queries.stakingPoolsQuery);
        const pools = stakingUtils.getPoolsFromRaw(rawPools);
        return pools;
    }

    public async getStakingPoolAsync(poolId: string): Promise<Pool> {
        const rawPool: RawPool | undefined = _.head(
            await this._connection.query(queries.stakingPoolByIdQuery, [poolId]),
        );

        if (!rawPool) {
            throw new NotFoundError(`Could not find pool with pool_id ${poolId}`);
        }

        const pool = stakingUtils.getPoolFromRaw(rawPool);
        return pool;
    }

    public async getStakingPoolEpochRewardsAsync(poolId: string): Promise<PoolEpochRewards[]> {
        const rawPoolEpochRewards: RawPoolEpochRewards[] = await this._connection.query(queries.poolEpochRewardsQuery, [
            poolId,
        ]);
        const poolEpochRewards = stakingUtils.getPoolEpochRewardsFromRaw(rawPoolEpochRewards);
        return poolEpochRewards;
    }

    public async getStakingPoolAllTimeRewardsAsync(poolId: string): Promise<AllTimePoolStats> {
        const rawAllTimePoolRewards = (await this._connection.query(queries.allTimePoolRewardsQuery, [
            poolId,
        ])) as RawAllTimePoolRewards[];
        const rawTotalPoolProtocolFeesGenerated = (await this._connection.query(
            queries.poolTotalProtocolFeesGeneratedQuery,
            [poolId],
        )) as RawPoolTotalProtocolFeesGenerated[];

        const rawAllTimePoolRewardsHead = _.head(rawAllTimePoolRewards);
        const rawTotalPoolProtocolFeesGeneratedHead = _.head(rawTotalPoolProtocolFeesGenerated);

        const allTimePoolRewards = stakingUtils.getAlltimePoolRewards(
            rawAllTimePoolRewardsHead,
            rawTotalPoolProtocolFeesGeneratedHead,
        );
        return allTimePoolRewards;
    }

    public async getAllTimeStakingStatsAsync(): Promise<AllTimeStakingStats> {
        const rawAllTimeStats: RawAllTimeStakingStats | undefined = _.head(
            await this._connection.query(queries.allTimeStatsQuery),
        );
        if (!rawAllTimeStats) {
            throw new Error('Could not find allTime staking statistics.');
        }
        const allTimeAllTimeStats: AllTimeStakingStats = stakingUtils.getAllTimeStakingStatsFromRaw(rawAllTimeStats);
        return allTimeAllTimeStats;
    }

    public async getStakingPoolWithStatsAsync(poolId: string): Promise<PoolWithStats> {
        const pool = await this.getStakingPoolAsync(poolId);
        const rawCurrentEpochPoolStats = await this._connection.query(queries.currentEpochPoolStatsQuery, [poolId]);
        const rawNextEpochPoolStats = await this._connection.query(queries.nextEpochPoolStatsQuery, [poolId]);
        const rawPoolSevenDayProtocolFeesGenerated = await this._connection.query(
            queries.poolSevenDayProtocolFeesGeneratedQuery,
            [poolId],
        );
        const rawAvgReward = await this._connection.query(queries.poolAvgRewardsQuery, [poolId]);

        const currentEpochPoolStats = stakingUtils.getEpochPoolStatsFromRaw(rawCurrentEpochPoolStats[0]);
        const nextEpochPoolStats = stakingUtils.getEpochPoolStatsFromRaw(rawNextEpochPoolStats[0]);
        const pool7dProtocolFeesGenerated = stakingUtils.getPoolProtocolFeesGeneratedFromRaw(
            rawPoolSevenDayProtocolFeesGenerated[0],
        );
        const poolAvgReward = stakingUtils.getPoolAvgRewardsFromRaw(rawAvgReward[0]);

        return {
            ...pool,
            sevenDayProtocolFeesGeneratedInEth: pool7dProtocolFeesGenerated.sevenDayProtocolFeesGeneratedInEth,
            avgMemberRewardInEth: poolAvgReward.avgMemberRewardInEth,
            avgTotalRewardInEth: poolAvgReward.avgTotalRewardInEth,
            avgMemberRewardEthPerZrx: poolAvgReward.avgMemberRewardEthPerZrx,
            currentEpochStats: currentEpochPoolStats,
            nextEpochStats: nextEpochPoolStats,
        };
    }

    public async getStakingPoolsWithStatsAsync(): Promise<PoolWithStats[]> {
        const pools = await this.getStakingPoolsAsync();
        const rawCurrentEpochPoolStats = await this._connection.query(queries.currentEpochPoolsStatsQuery);
        const rawNextEpochPoolStats = await this._connection.query(queries.nextEpochPoolsStatsQuery);
        const rawPoolSevenDayProtocolFeesGenerated = await this._connection.query(
            queries.sevenDayProtocolFeesGeneratedQuery,
        );
        const rawPoolsAvgRewards = await this._connection.query(queries.poolsAvgRewardsQuery);
        const currentEpochPoolStats = stakingUtils.getEpochPoolsStatsFromRaw(rawCurrentEpochPoolStats);
        const nextEpochPoolStats = stakingUtils.getEpochPoolsStatsFromRaw(rawNextEpochPoolStats);
        const poolProtocolFeesGenerated = stakingUtils.getPoolsProtocolFeesGeneratedFromRaw(
            rawPoolSevenDayProtocolFeesGenerated,
        );
        const poolAvgRewards = stakingUtils.getPoolsAvgRewardsFromRaw(rawPoolsAvgRewards);
        const currentEpochPoolStatsMap = utils.arrayToMapWithId(currentEpochPoolStats, 'poolId');
        const nextEpochPoolStatsMap = utils.arrayToMapWithId(nextEpochPoolStats, 'poolId');
        const poolProtocolFeesGeneratedMap = utils.arrayToMapWithId(poolProtocolFeesGenerated, 'poolId');
        const poolAvgRewardsMap = utils.arrayToMapWithId(poolAvgRewards, 'poolId');
        return pools.map(pool => ({
            ...pool,
            sevenDayProtocolFeesGeneratedInEth:
                poolProtocolFeesGeneratedMap[pool.poolId].sevenDayProtocolFeesGeneratedInEth,
            avgMemberRewardInEth: poolAvgRewardsMap[pool.poolId].avgMemberRewardInEth,
            avgTotalRewardInEth: poolAvgRewardsMap[pool.poolId].avgTotalRewardInEth,
            avgMemberRewardEthPerZrx: poolAvgRewardsMap[pool.poolId].avgMemberRewardEthPerZrx,
            currentEpochStats: currentEpochPoolStatsMap[pool.poolId],
            nextEpochStats: nextEpochPoolStatsMap[pool.poolId],
        }));
    }

    public async getDelegatorCurrentEpochAsync(delegatorAddress: string): Promise<EpochDelegatorStats> {
        const rawDelegatorDeposited = (await this._connection.query(queries.currentEpochDelegatorDepositedQuery, [
            delegatorAddress,
        ])) as RawDelegatorDeposited[];
        const rawDelegatorStaked = (await this._connection.query(queries.currentEpochDelegatorStakedQuery, [
            delegatorAddress,
        ])) as RawDelegatorStaked[];

        const zrxDeposited = stakingUtils.getZrxStakedFromRawDelegatorDeposited(rawDelegatorDeposited);
        const { zrxStaked, poolData } = stakingUtils.getDelegatorStakedFromRaw(rawDelegatorStaked);

        return {
            zrxDeposited,
            zrxStaked,
            poolData,
        };
    }

    public async getDelegatorNextEpochAsync(delegatorAddress: string): Promise<EpochDelegatorStats> {
        const rawDelegatorDeposited = (await this._connection.query(queries.nextEpochDelegatorDepositedQuery, [
            delegatorAddress,
        ])) as RawDelegatorDeposited[];
        const rawDelegatorStaked = (await this._connection.query(queries.nextEpochDelegatorStakedQuery, [
            delegatorAddress,
        ])) as RawDelegatorStaked[];

        const zrxDeposited = stakingUtils.getZrxStakedFromRawDelegatorDeposited(rawDelegatorDeposited);
        const { zrxStaked, poolData } = stakingUtils.getDelegatorStakedFromRaw(rawDelegatorStaked);

        return {
            zrxDeposited,
            zrxStaked,
            poolData,
        };
    }

    public async getDelegatorEventsAsync(delegatorAddress: string): Promise<DelegatorEvent[]> {
        const rawDelegatorEvents: RawDelegatorEvent[] = await this._connection.query(queries.delegatorEventsQuery, [
            delegatorAddress,
        ]);

        const delegatorEvents = stakingUtils.getDelegatorEventsFromRaw(rawDelegatorEvents);

        return delegatorEvents;
    }

    public async getDelegatorAllTimeStatsAsync(delegatorAddress: string): Promise<AllTimeDelegatorStats> {
        const rawDelegatorAllTimeStats = await this._connection.query(queries.allTimeDelegatorStatsQuery, [
            delegatorAddress,
        ]);
        const poolData = stakingUtils.getDelegatorAllTimeStatsFromRaw(rawDelegatorAllTimeStats);

        return {
            poolData,
        };
    }
}
