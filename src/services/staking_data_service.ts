import * as _ from 'lodash';
import { Connection } from 'typeorm';

import { Epoch, Pool, PoolWithStats, RawEpoch, RawPool } from '../types';
import { stakingUtils } from '../utils/staking_utils';
import { utils } from '../utils/utils';

export class StakingDataService {
    private readonly _connection: Connection;
    constructor(connection: Connection) {
        this._connection = connection;
    }
    public async getCurrentEpochAsync(): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(`SELECT * FROM staking.current_epoch;`));
        if (!rawEpoch) {
            throw new Error('Could not find the current epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }
    public async getNextEpochAsync(): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(`SELECT
            ce.epoch_id + 1 AS epoch_id
            , ce.starting_block_number + cp.epoch_duration_in_seconds::NUMERIC / 15::NUMERIC AS starting_block_number
            , ce.starting_block_timestamp + ((cp.epoch_duration_in_seconds)::VARCHAR || ' seconds')::INTERVAL AS starting_block_timestamp
        FROM staking.current_epoch ce
        CROSS JOIN staking.current_params cp;`));
        if (!rawEpoch) {
            throw new Error('Could not find the next current epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }
    public async getStakingPoolsAsync(): Promise<Pool[]> {
        const rawPools: RawPool[] = await this._connection.query(`SELECT * FROM staking.pool_info;`);
        const pools = stakingUtils.getPoolsFromRaw(rawPools);
        return pools;
    }
    public async getStakingPoolsWithStatsAsync(): Promise<PoolWithStats[]> {
        const [
            pools,
            rawCurrentEpochPoolStats,
            rawNextEpochPoolStats,
        ] = await Promise.all([
            this.getStakingPoolsAsync(),
            this._connection.query(currentEpocStatsQuery),
            this._connection.query(nextEpochStatsQuery),
        ]);
        const currentEpochPoolStats = stakingUtils.getEpochPoolsStatsFromRaw(rawCurrentEpochPoolStats);
        const nextEpochPoolStats = stakingUtils.getEpochPoolsStatsFromRaw(rawNextEpochPoolStats);
        const currentEpochPoolStatsMap = utils.arrayToMapWithId(currentEpochPoolStats, 'poolId');
        const nextEpochPoolStatsMap = utils.arrayToMapWithId(nextEpochPoolStats, 'poolId');
        return pools.map(pool => ({
            ...pool,
            currentEpochStats: currentEpochPoolStatsMap[pool.poolId],
            nextEpochStats: nextEpochPoolStatsMap[pool.poolId],
        }));
    }
}

const currentEpocStatsQuery = `
    WITH
    current_epoch_beginning_status AS (
        SELECT
            esps.*
        FROM staking.epoch_start_pool_status esps
        JOIN staking.current_epoch ce ON ce.epoch_id = esps.epoch_id
    )
    , current_epoch_fills_by_pool AS (
        SELECT
            ce.epoch_id
            , cebs.pool_id
            , SUM(fe.protocol_fee_paid) / 1e18 AS protocol_fees
        FROM events.fill_events fe
        LEFT JOIN current_epoch_beginning_status cebs ON fe.maker_address = ANY(cebs.maker_addresses)
        JOIN staking.current_epoch ce
            ON fe.block_number > ce.starting_block_number
            OR (fe.block_number = ce.starting_block_number AND fe.transaction_index >= ce.starting_transaction_index)
        WHERE
            -- fees not accruing to a pool do not count
            pool_id IS NOT NULL
        GROUP BY 1,2
    )
    SELECT
        pce.pool_id
        , cebs.zrx_delegated AS zrx_staked
        , cebs.operator_share AS operator_share
        , cebs.maker_addresses AS maker_addresses
        , fbp.protocol_fees AS protocol_fees_generated_in_eth
    FROM events.staking_pool_created_events pce
    LEFT JOIN current_epoch_beginning_status cebs ON cebs.pool_id = pce.pool_id
    LEFT JOIN current_epoch_fills_by_pool fbp ON fbp.epoch_id = cebs.epoch_id AND fbp.pool_id = cebs.pool_id;
`;
const nextEpochStatsQuery = `
    WITH
        current_stake AS (
            SELECT
                pi.pool_id
                , SUM(zsc.amount) AS zrx_staked
            FROM staking.pool_info pi
            LEFT JOIN staking.zrx_staking_changes zsc ON zsc.pool_id = pi.pool_id
            GROUP BY 1
        )
        , current_epoch_fills_by_pool AS (
            SELECT
                pi.pool_id
                , SUM(fe.protocol_fee_paid) / 1e18 AS protocol_fees
            FROM events.fill_events fe
            LEFT JOIN staking.pool_info pi ON fe.maker_address = ANY(pi.maker_addresses)
            JOIN staking.current_epoch ce
                ON fe.block_number > ce.starting_block_number
                OR (fe.block_number = ce.starting_block_number AND fe.transaction_index >= ce.starting_transaction_index)
            WHERE
                -- fees not accruing to a pool do not count
                pool_id IS NOT NULL
            GROUP BY 1
        )
        , total_staked AS (
            SELECT
                SUM(zrx_staked) AS total_staked
            FROM current_stake
        )
        , total_rewards AS (
            SELECT
                SUM(protocol_fees) AS total_protocol_fees
            FROM current_epoch_fills_by_pool
        )
        , operator_share AS (
            SELECT DISTINCT
                pool_id
                , LAST_VALUE(operator_share) OVER (
                        PARTITION BY pool_id
                        ORDER BY block_number, transaction_index
                        RANGE BETWEEN
                        UNBOUNDED PRECEDING AND
                        UNBOUNDED FOLLOWING
                    )
                    AS operator_share
            FROM staking.operator_share_changes
        )
        SELECT
            pi.pool_id
            , pi.maker_addresses
            , os.operator_share
            , cs.zrx_staked
            , ts.total_staked
            , cs.zrx_staked / ts.total_staked AS share_of_stake
            , fbp.protocol_fees AS protocol_fees_generated_in_eth
            , tr.total_protocol_fees
            , fbp.protocol_fees / tr.total_protocol_fees AS share_of_fees
            , (cs.zrx_staked / ts.total_staked)
                    / (fbp.protocol_fees / tr.total_protocol_fees)
                AS approximate_stake_ratio
        FROM staking.pool_info pi
        LEFT JOIN operator_share os ON os.pool_id = pi.pool_id
        LEFT JOIN current_stake cs ON cs.pool_id = pi.pool_id
        LEFT JOIN current_epoch_fills_by_pool fbp ON fbp.pool_id = pi.pool_id
        CROSS JOIN total_staked ts
        CROSS JOIN total_rewards tr;
`;
