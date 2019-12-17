import * as _ from 'lodash';
import { Connection } from 'typeorm';

import * as queries from '../queries/staking_queries';
import {
    AllTimeDelegatorStats,
    AllTimePoolStats,
    AllTimeStakingStats,
    Epoch,
    EpochDelegatorStats,
    Pool,
    PoolEpochRewards,
    PoolWithStats,
    RawAllTimePoolRewards,
    RawAllTimeStakingStats,
    RawDelegatorDeposited,
    RawDelegatorStaked,
    RawEpoch,
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

    public async getCurrentEpochAsync(): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(queries.currentEpochQuery));
        if (!rawEpoch) {
            throw new Error('Could not find the current epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }

    public async getNextEpochAsync(): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(queries.nextEpochQuery));
        if (!rawEpoch) {
            throw new Error('Could not find the next current epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
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
            throw new Error(`Could not find pool with pool_id ${poolId}`);
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
        const [rawAllTimePoolRewards, rawTotalPoolProtocolFeesGenerated] = await Promise.all<
            RawAllTimePoolRewards[],
            RawPoolTotalProtocolFeesGenerated[]
        >([
            this._connection.query(queries.allTimePoolRewardsQuery, [poolId]),
            this._connection.query(queries.poolTotalProtocolFeesGeneratedQuery, [poolId]),
        ]);

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
        const [
            pool,
            rawCurrentEpochPoolStats,
            rawNextEpochPoolStats,
            rawPoolSevenDayProtocolFeesGenerated,
        ] = await Promise.all([
            this.getStakingPoolAsync(poolId),
            this._connection.query(queries.currentEpochPoolStatsQuery, [poolId]),
            this._connection.query(queries.nextEpochPoolStatsQuery, [poolId]),
            this._connection.query(queries.poolSevenDayProtocolFeesGeneratedQuery, [poolId]),
        ]);

        const currentEpochPoolStats = stakingUtils.getEpochPoolStatsFromRaw(rawCurrentEpochPoolStats);
        const nextEpochPoolStats = stakingUtils.getEpochPoolStatsFromRaw(rawNextEpochPoolStats);
        const pool7dProtocolFeesGenerated = stakingUtils.getPoolProtocolFeesGeneratedFromRaw(rawPoolSevenDayProtocolFeesGenerated);

        return {
            ...pool,
            currentEpochStats: currentEpochPoolStats,
            nextEpochStats: nextEpochPoolStats,
            sevenDayProtocolFeesGeneratedInEth: pool7dProtocolFeesGenerated.sevenDayProtocolFeesGeneratedInEth,
        };
    }

    public async getStakingPoolsWithStatsAsync(): Promise<PoolWithStats[]> {
        const [
            pools,
            rawCurrentEpochPoolStats,
            rawNextEpochPoolStats,
            rawPoolSevenDayProtocolFeesGenerated,
        ] = await Promise.all([
            this.getStakingPoolsAsync(),
            this._connection.query(queries.currentEpochPoolsStatsQuery),
            this._connection.query(queries.nextEpochPoolsStatsQuery),
            this._connection.query(queries.sevenDayProtocolFeesGeneratedQuery),
        ]);
        const currentEpochPoolStats = stakingUtils.getEpochPoolsStatsFromRaw(rawCurrentEpochPoolStats);
        const nextEpochPoolStats = stakingUtils.getEpochPoolsStatsFromRaw(rawNextEpochPoolStats);
        const poolProtocolFeesGenerated = stakingUtils.getPoolsProtocolFeesGeneratedFromRaw(
            rawPoolSevenDayProtocolFeesGenerated,
        );
        const currentEpochPoolStatsMap = utils.arrayToMapWithId(currentEpochPoolStats, 'poolId');
        const nextEpochPoolStatsMap = utils.arrayToMapWithId(nextEpochPoolStats, 'poolId');
        const poolProtocolFeesGeneratedMap = utils.arrayToMapWithId(poolProtocolFeesGenerated, 'poolId');
        return pools.map(pool => ({
            ...pool,
            sevenDayProtocolFeesGeneratedInEth:
                poolProtocolFeesGeneratedMap[pool.poolId].sevenDayProtocolFeesGeneratedInEth,
            currentEpochStats: currentEpochPoolStatsMap[pool.poolId],
            nextEpochStats: nextEpochPoolStatsMap[pool.poolId],
        }));
    }

    public async getDelegatorCurrentEpochAsync(delegatorAddress: string): Promise<EpochDelegatorStats> {
        const [rawDelegatorDeposited, rawDelegatorStaked] = await Promise.all<
            RawDelegatorDeposited[],
            RawDelegatorStaked[]
        >([
            this._connection.query(queries.currentEpochDelegatorDepositedQuery, [delegatorAddress]),
            this._connection.query(queries.currentEpochDelegatorStakedQuery, [delegatorAddress]),
        ]);

        const zrxDeposited = stakingUtils.getZrxStakedFromRawDelegatorDeposited(rawDelegatorDeposited);
        const { zrxStaked, poolData } = stakingUtils.getDelegatorStakedFromRaw(rawDelegatorStaked);

        return {
            zrxDeposited,
            zrxStaked,
            poolData,
        };
    }

    public async getDelegatorNextEpochAsync(delegatorAddress: string): Promise<EpochDelegatorStats> {
        const [rawDelegatorDeposited, rawDelegatorStaked] = await Promise.all<
            RawDelegatorDeposited[],
            RawDelegatorStaked[]
        >([
            this._connection.query(queries.nextEpochDelegatorDepositedQuery, [delegatorAddress]),
            this._connection.query(queries.nextEpochDelegatorStakedQuery, [delegatorAddress]),
        ]);

        const zrxDeposited = stakingUtils.getZrxStakedFromRawDelegatorDeposited(rawDelegatorDeposited);
        const { zrxStaked, poolData } = stakingUtils.getDelegatorStakedFromRaw(rawDelegatorStaked);

        return {
            zrxDeposited,
            zrxStaked,
            poolData,
        };
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
