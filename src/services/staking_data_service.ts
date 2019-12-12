import * as _ from 'lodash';
import { Connection } from 'typeorm';

import {
    AllTimeDelegatorStats,
    AllTimeStakingStats,
    Epoch,
    EpochDelegatorStats,
    Pool,
    PoolWithStats,
    RawAllTimeStakingStats,
    RawDelegatorDeposited,
    RawDelegatorStaked,
    RawEpoch,
    RawPool,
} from '../types';
import { stakingUtils } from '../utils/staking_utils';
import { utils } from '../utils/utils';

export class StakingDataService {
    private readonly _connection: Connection;
    constructor(connection: Connection) {
        this._connection = connection;
    }
    public async getCurrentEpochAsync(): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(currentEpochQuery));
        if (!rawEpoch) {
            throw new Error('Could not find the current epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }
    public async getNextEpochAsync(): Promise<Epoch> {
        const rawEpoch: RawEpoch | undefined = _.head(await this._connection.query(nextEpochQuery));
        if (!rawEpoch) {
            throw new Error('Could not find the next current epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }
    public async getStakingPoolsAsync(): Promise<Pool[]> {
        const rawPools: RawPool[] = await this._connection.query(stakingPoolsQuery);
        const pools = stakingUtils.getPoolsFromRaw(rawPools);
        return pools;
    }
    public async getAllTimeStakingStatsAsync(): Promise<AllTimeStakingStats> {
        const rawAllTimeStats: RawAllTimeStakingStats | undefined = _.head(
            await this._connection.query(allTimeStatsQuery),
        );
        if (!rawAllTimeStats) {
            throw new Error('Could not find allTime staking statistics.');
        }
        const allTimeAllTimeStats: AllTimeStakingStats = stakingUtils.getAllTimeStakingStatsFromRaw(rawAllTimeStats);
        return allTimeAllTimeStats;
    }
    public async getStakingPoolsWithStatsAsync(): Promise<PoolWithStats[]> {
        const [
            pools,
            rawCurrentEpochPoolStats,
            rawNextEpochPoolStats,
            rawPoolProtocolFeesGenerated,
        ] = await Promise.all([
            this.getStakingPoolsAsync(),
            this._connection.query(currentEpochPoolStatsQuery),
            this._connection.query(nextEpochPoolStatsQuery),
            this._connection.query(sevenDayProtocolFeesGeneratedQuery),
        ]);
        const currentEpochPoolStats = stakingUtils.getEpochPoolsStatsFromRaw(rawCurrentEpochPoolStats);
        const nextEpochPoolStats = stakingUtils.getEpochPoolsStatsFromRaw(rawNextEpochPoolStats);
        const poolProtocolFeesGenerated = stakingUtils.getPoolsProtocolFeesGeneratedFromRaw(
            rawPoolProtocolFeesGenerated,
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
            this._connection.query(currentEpochDelegatorDepositedQuery, [delegatorAddress]),
            this._connection.query(currentEpochDelegatorStakedQuery, [delegatorAddress]),
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
            this._connection.query(nextEpochDelegatorDepositedQuery, [delegatorAddress]),
            this._connection.query(nextEpochDelegatorStakedQuery, [delegatorAddress]),
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
        const rawDelegatorAllTimeStats = await this._connection.query(allTimeDelegatorStatsQuery, [delegatorAddress]);
        const poolData = stakingUtils.getDelegatorAllTimeStatsFromRaw(rawDelegatorAllTimeStats);

        return {
            poolData,
        };
    }
}

const currentEpochQuery = `
    WITH zrx_staked AS (
        SELECT
            SUM(esps.zrx_delegated) AS zrx_staked
        FROM staking.epoch_start_pool_status esps
        JOIN staking.current_epoch ce ON ce.epoch_id = esps.epoch_id
    )
    , protocol_fees AS (
        SELECT
            SUM(protocol_fee_paid) / 1e18::NUMERIC AS protocol_fees_generated_in_eth
        FROM events.fill_events fe
        JOIN staking.current_epoch ce
            ON fe.block_number > ce.starting_block_number
            OR (fe.block_number = ce.starting_block_number AND fe.transaction_index > ce.starting_transaction_index)
    )
    , zrx_deposited AS (
        SELECT
            SUM(scc.amount) AS zrx_deposited
        FROM staking.zrx_staking_contract_changes scc
        JOIN staking.current_epoch ce
            ON scc.block_number < ce.starting_block_number
            OR (scc.block_number = ce.starting_block_number AND scc.transaction_index < ce.starting_transaction_index)
    )
    SELECT
        ce.*
        , zd.zrx_deposited
        , zs.zrx_staked
        , pf.protocol_fees_generated_in_eth
    FROM staking.current_epoch ce
    CROSS JOIN zrx_deposited zd
    CROSS JOIN zrx_staked zs
    CROSS JOIN protocol_fees pf;`;

const nextEpochQuery = `
    WITH
    zrx_staked AS (
        SELECT
            SUM(amount) AS zrx_staked
        FROM staking.zrx_staking_changes
    )
    , zrx_deposited AS (
        SELECT
            SUM(scc.amount) AS zrx_deposited
        FROM staking.zrx_staking_contract_changes scc
    )
    SELECT
        ce.epoch_id + 1 AS epoch_id
        , ce.starting_block_number + cp.epoch_duration_in_seconds::NUMERIC / 15::NUMERIC AS starting_block_number
        , ce.starting_block_timestamp + ((cp.epoch_duration_in_seconds)::VARCHAR || ' seconds')::INTERVAL AS starting_block_timestamp
        , zd.zrx_deposited
        , zs.zrx_staked
    FROM staking.current_epoch ce
    CROSS JOIN staking.current_params cp
    CROSS JOIN zrx_staked zs
    CROSS JOIN zrx_deposited zd;`;

const stakingPoolsQuery = `SELECT * FROM staking.pool_info;`;

const sevenDayProtocolFeesGeneratedQuery = `
    WITH pool_7d_fills AS (
        SELECT
            pi.pool_id
            , SUM(fe.protocol_fee_paid) / 1e18 AS protocol_fees
        FROM events.fill_events fe
        LEFT JOIN events.blocks b ON b.block_number = fe.block_number
        LEFT JOIN staking.pool_info pi ON fe.maker_address = ANY(pi.maker_addresses)
        WHERE
            -- fees not accruing to a pool do not count
            pool_id IS NOT NULL
            AND TO_TIMESTAMP(b.block_timestamp) > (CURRENT_TIMESTAMP - '7 days'::INTERVAL)
        GROUP BY 1
    )
    SELECT
        p.pool_id
        , COALESCE(f.protocol_fees, 0) AS seven_day_protocol_fees_generated_in_eth
    FROM events.staking_pool_created_events p
    LEFT JOIN pool_7d_fills f ON f.pool_id = p.pool_id;
`;

const currentEpochPoolStatsQuery = `
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
    , total_staked AS (
        SELECT
            SUM(zrx_delegated) AS total_staked
        FROM current_epoch_beginning_status
    )
    , total_fees AS (
        SELECT
            SUM(protocol_fees) AS total_protocol_fees
        FROM current_epoch_fills_by_pool
    )
    SELECT
        pce.pool_id
        , cebs.maker_addresses AS maker_addresses
        , cebs.operator_share AS operator_share
        , cebs.zrx_delegated AS zrx_staked
        , ts.total_staked
        , cebs.zrx_delegated / ts.total_staked AS share_of_stake
        , fbp.protocol_fees AS total_protocol_fees_generated_in_eth
        , fbp.protocol_fees / tf.total_protocol_fees AS share_of_fees
        , (cebs.zrx_delegated / ts.total_staked)
            / (fbp.protocol_fees / tf.total_protocol_fees)
            AS approximate_stake_ratio
    FROM events.staking_pool_created_events pce
    LEFT JOIN current_epoch_beginning_status cebs ON cebs.pool_id = pce.pool_id
    LEFT JOIN current_epoch_fills_by_pool fbp ON fbp.epoch_id = cebs.epoch_id AND fbp.pool_id = cebs.pool_id
    CROSS JOIN total_staked ts
    CROSS JOIN total_fees tf;
`;
const nextEpochPoolStatsQuery = `
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

const currentEpochDelegatorDepositedQuery = `
    WITH
        delegator AS (
            SELECT $1::text AS delegator
        )
        , zrx_deposited AS (
            SELECT
                staker
                , SUM(amount) AS zrx_deposited
            FROM staking.zrx_staking_contract_changes scc
            JOIN delegator d ON d.delegator = scc.staker
            JOIN staking.current_epoch ce ON
                scc.block_number < ce.starting_block_number
                OR (scc.block_number = ce.starting_block_number AND scc.transaction_index < ce.starting_transaction_index)
            GROUP BY 1
        )
    SELECT
        d.delegator
        , COALESCE(zd.zrx_deposited,0) AS zrx_deposited
    FROM delegator d
    LEFT JOIN zrx_deposited zd ON zd.staker = d.delegator;
`;

const currentEpochDelegatorStakedQuery = `
    WITH
        delegator AS (
            SELECT $1::text AS delegator
        )
        , zrx_staked_by_pool AS (
            SELECT
                staker
                , pool_id
                , SUM(amount) AS zrx_staked
            FROM staking.zrx_staking_changes sc
            JOIN delegator d ON d.delegator = sc.staker
            JOIN staking.current_epoch ce ON
                sc.block_number < ce.starting_block_number
                OR (sc.block_number = ce.starting_block_number AND sc.transaction_index < ce.starting_transaction_index)
            GROUP BY 1,2
        )
        , zrx_staked AS (
            SELECT
                staker
                , SUM(zrx_staked) AS zrx_staked
            FROM zrx_staked_by_pool
            GROUP BY 1
        )
    SELECT
        d.delegator
        , COALESCE(zs.zrx_staked,0) AS zrx_staked_overall
        , zsbp.pool_id
        , COALESCE(zsbp.zrx_staked,0) AS zrx_staked_in_pool
    FROM delegator d
    LEFT JOIN zrx_staked_by_pool zsbp ON zsbp.staker = d.delegator
    LEFT JOIN zrx_staked zs ON zs.staker = d.delegator;
`;

const nextEpochDelegatorDepositedQuery = `
    WITH
        delegator AS (
            SELECT $1::text AS delegator
        )
        , zrx_deposited AS (
            SELECT
                staker
                , SUM(amount) AS zrx_deposited
            FROM staking.zrx_staking_contract_changes scc
            JOIN delegator d ON d.delegator = scc.staker
            GROUP BY 1
        )
    SELECT
        d.delegator
        , COALESCE(zd.zrx_deposited,0) AS zrx_deposited
    FROM delegator d
    LEFT JOIN zrx_deposited zd ON zd.staker = d.delegator;
`;

const nextEpochDelegatorStakedQuery = `
    WITH
        delegator AS (
            SELECT $1::text AS delegator
        )
        , zrx_staked_by_pool AS (
            SELECT
                staker
                , pool_id
                , SUM(amount) AS zrx_staked
            FROM staking.zrx_staking_changes sc
            JOIN delegator d ON d.delegator = sc.staker
            GROUP BY 1,2
        )
        , zrx_staked AS (
            SELECT
                staker
                , SUM(zrx_staked) AS zrx_staked
            FROM zrx_staked_by_pool
            GROUP BY 1
        )
    SELECT
        d.delegator
        , COALESCE(zs.zrx_staked,0) AS zrx_staked_overall
        , zsbp.pool_id
        , COALESCE(zsbp.zrx_staked,0) AS zrx_staked_in_pool
    FROM delegator d
    LEFT JOIN zrx_staked_by_pool zsbp ON zsbp.staker = d.delegator
    LEFT JOIN zrx_staked zs ON zs.staker = d.delegator;
`;

const allTimeDelegatorStatsQuery = `
    SELECT
        pool_id
        , SUM(total_reward) AS reward
    FROM staking.address_pool_epoch_rewards
    WHERE
        address = $1::text
    GROUP BY 1;
`;

const allTimeStatsQuery = `;
    SELECT; SUM(
        COALESCE(operator_reward, 0)
        + COALESCE(members_reward, 0),
    ) / 1e18; AS; total_rewards_paid;
    FROM; events.rewards_paid_events;
`;
