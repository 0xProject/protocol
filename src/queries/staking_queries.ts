export const currentEpochQuery = `
    WITH zrx_staked AS (
        SELECT
            SUM(esps.zrx_delegated) AS zrx_staked
        FROM staking.epoch_start_pool_status esps
        JOIN staking.current_epoch ce ON ce.epoch_id = esps.epoch_id
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
    FROM staking.current_epoch ce
    CROSS JOIN zrx_deposited zd
    CROSS JOIN zrx_staked zs`;

export const currentEpochWithFeesQuery = `
    WITH zrx_staked AS (
        SELECT
            SUM(esps.zrx_delegated) AS zrx_staked
        FROM staking.epoch_start_pool_status esps
        JOIN staking.current_epoch ce ON ce.epoch_id = esps.epoch_id
    )
    , zrx_deposited AS (
        SELECT
            SUM(scc.amount) AS zrx_deposited
        FROM staking.zrx_staking_contract_changes scc
        JOIN staking.current_epoch ce
            ON scc.block_number < ce.starting_block_number
            OR (scc.block_number = ce.starting_block_number AND scc.transaction_index < ce.starting_transaction_index)
    )
    , protocol_fees AS (
        SELECT
            SUM(protocol_fee_paid) / 1e18::NUMERIC AS protocol_fees_generated_in_eth
        FROM events.fill_events fe
        JOIN staking.current_epoch ce
            ON fe.block_number > ce.starting_block_number
            OR (fe.block_number = ce.starting_block_number AND fe.transaction_index > ce.starting_transaction_index)
    )
    SELECT
        ce.*
        , zd.zrx_deposited
        , zs.zrx_staked
        , pf.protocol_fees_generated_in_eth
    FROM staking.current_epoch ce
    CROSS JOIN zrx_deposited zd
    CROSS JOIN zrx_staked zs
    CROSS JOIN protocol_fees pf;
`;

export const nextEpochQuery = `
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
        -- approximate starting block number based on a 13-second block time
        , (ce.starting_block_number + (cp.epoch_duration_in_seconds::NUMERIC / 13::NUMERIC))::BIGINT AS starting_block_number
        , ce.starting_block_timestamp + ((cp.epoch_duration_in_seconds)::VARCHAR || ' seconds')::INTERVAL AS starting_block_timestamp
        , zd.zrx_deposited
        , zs.zrx_staked
    FROM staking.current_epoch ce
    CROSS JOIN staking.current_params cp
    CROSS JOIN zrx_staked zs
    CROSS JOIN zrx_deposited zd;`;

export const epochNQuery = `
    WITH
        epoch AS (
            SELECT
                epoch_id
                , starting_transaction_hash
                , starting_transaction_index
                , starting_block_number
                , starting_block_timestamp
                , ending_transaction_hash
                , ending_transaction_index
                , ending_block_number
                , ending_timestamp AS ending_block_timestamp
            FROM staking.epochs
            WHERE
                epoch_id = $1
        )
        , zrx_staked AS (
            SELECT
                SUM(esps.zrx_delegated) AS zrx_staked
            FROM staking.epoch_start_pool_status esps
            JOIN epoch e ON e.epoch_id = esps.epoch_id
        )
        , zrx_deposited AS (
            SELECT
                SUM(scc.amount) AS zrx_deposited
            FROM staking.zrx_staking_contract_changes scc
            JOIN epoch e
                ON scc.block_number < e.starting_block_number
                OR (scc.block_number = e.starting_block_number AND scc.transaction_index < e.starting_transaction_index)
        )
        SELECT
            e.*
            , zd.zrx_deposited
            , zs.zrx_staked
        FROM epoch e
        CROSS JOIN zrx_deposited zd
        CROSS JOIN zrx_staked zs
;`;

export const epochNWithFeesQuery = `
WITH
    epoch AS (
        SELECT
            epoch_id
            , starting_transaction_hash
            , starting_transaction_index
            , starting_block_number
            , starting_block_timestamp
            , ending_transaction_hash
            , ending_transaction_index
            , ending_block_number
            , ending_timestamp AS ending_block_timestamp
        FROM staking.epochs
        WHERE
            epoch_id = $1
    )
    , zrx_staked AS (
        SELECT
            SUM(esps.zrx_delegated) AS zrx_staked
        FROM staking.epoch_start_pool_status esps
        JOIN epoch e ON e.epoch_id = esps.epoch_id
    )
    , zrx_deposited AS (
        SELECT
            SUM(scc.amount) AS zrx_deposited
        FROM staking.zrx_staking_contract_changes scc
        JOIN epoch e
            ON scc.block_number < e.starting_block_number
            OR (scc.block_number = e.starting_block_number AND scc.transaction_index < e.starting_transaction_index)
    )
    , protocol_fees AS (
        SELECT
            SUM(protocol_fee_paid) / 1e18::NUMERIC AS protocol_fees_generated_in_eth
        FROM events.fill_events fe
        JOIN epoch e
            ON
            -- Start of epoch
            (fe.block_number > e.starting_block_number
            OR (fe.block_number = e.starting_block_number AND fe.transaction_index > e.starting_transaction_index))
            -- End of epoch, impute high block number for current epoch
            AND (fe.block_number < COALESCE(e.ending_block_number,99999999999)
            OR (fe.block_number = e.ending_block_number AND fe.transaction_index < e.ending_transaction_index))
    )
    SELECT
        e.*
        , zd.zrx_deposited
        , zs.zrx_staked
        , pf.protocol_fees_generated_in_eth
    FROM epoch e
    CROSS JOIN zrx_deposited zd
    CROSS JOIN zrx_staked zs
    CROSS JOIN protocol_fees pf
;`;

export const stakingPoolsQuery = `SELECT * FROM staking.pool_info;`;

export const stakingPoolByIdQuery = `SELECT * FROM staking.pool_info WHERE pool_id = $1;`;

export const poolSevenDayProtocolFeesGeneratedQuery = `
    WITH pool_7d_fills AS (
        SELECT
            pi.pool_id
            , SUM(fe.protocol_fee_paid) / 1e18 AS protocol_fees
            , COUNT(*) AS number_of_fills
        FROM events.fill_events fe
        LEFT JOIN events.blocks b ON b.block_number = fe.block_number
        LEFT JOIN staking.pool_info pi ON fe.maker_address = ANY(pi.maker_addresses)
        WHERE
            -- fees not accruing to a pool do not count
            pool_id IS NOT NULL
            AND TO_TIMESTAMP(b.block_timestamp) > (CURRENT_TIMESTAMP - '7 days'::INTERVAL)
            AND pool_id = $1
        GROUP BY 1
    )
    SELECT
        p.pool_id
        , COALESCE(f.protocol_fees, 0) AS seven_day_protocol_fees_generated_in_eth
        , COALESCE(f.number_of_fills,0) AS seven_day_number_of_fills
    FROM events.staking_pool_created_events p
    LEFT JOIN pool_7d_fills f ON f.pool_id = p.pool_id
    WHERE
        p.pool_id = $1;
`;

export const sevenDayProtocolFeesGeneratedQuery = `
    WITH pool_7d_fills AS (
        SELECT
            pi.pool_id
            , SUM(fe.protocol_fee_paid) / 1e18 AS protocol_fees
            , COUNT(*) AS number_of_fills
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
        , COALESCE(f.number_of_fills,0) AS seven_day_number_of_fills
    FROM events.staking_pool_created_events p
    LEFT JOIN pool_7d_fills f ON f.pool_id = p.pool_id;
`;

export const poolsAvgRewardsQuery = `
    WITH
        avg_rewards AS (
            SELECT
                rpe.pool_id
                , AVG(members_reward) / 1e18 AS avg_member_reward_in_eth
                , AVG(operator_reward + members_reward) / 1e18 AS avg_total_reward_in_eth
                , AVG(esps.member_zrx_delegated) AS avg_member_stake
                , AVG((members_reward / 1e18) / esps.member_zrx_delegated) AS avg_member_reward_eth_per_zrx
            FROM events.rewards_paid_events rpe
            JOIN staking.current_epoch ce ON rpe.epoch_id > (ce.epoch_id - 4)
            -- subtract one from the reward epoch ID, since reward events are stamped with the epoch
            -- after the epoch for which they are paid out
            JOIN staking.epoch_start_pool_status esps ON esps.epoch_id = (rpe.epoch_id - 1) AND esps.pool_id = rpe.pool_id
            GROUP BY 1
        )
        SELECT
            p.pool_id
            , COALESCE(r.avg_member_reward_in_eth, 0) AS avg_member_reward_in_eth
            , COALESCE(r.avg_total_reward_in_eth, 0) AS avg_total_reward_in_eth
            , COALESCE(r.avg_member_stake, 0) AS avg_member_stake
            , COALESCE(r.avg_member_reward_eth_per_zrx, 0) AS avg_member_reward_eth_per_zrx
        FROM events.staking_pool_created_events p
        LEFT JOIN avg_rewards r ON r.pool_id = p.pool_id;
`;

export const poolAvgRewardsQuery = `
    WITH
        avg_rewards AS (
            SELECT
                rpe.pool_id
                , AVG(members_reward) / 1e18 AS avg_member_reward_in_eth
                , AVG(operator_reward + members_reward) / 1e18 AS avg_total_reward_in_eth
                , AVG(esps.member_zrx_delegated) AS avg_member_stake
                , AVG((members_reward / 1e18) / esps.member_zrx_delegated) AS avg_member_reward_eth_per_zrx
            FROM events.rewards_paid_events rpe
            JOIN staking.current_epoch ce ON rpe.epoch_id > (ce.epoch_id - 4)
            -- subtract one from the reward epoch ID, since reward events are stamped with the epoch
            -- after the epoch for which they are paid out
            JOIN staking.epoch_start_pool_status esps ON esps.epoch_id = (rpe.epoch_id - 1) AND esps.pool_id = rpe.pool_id
            WHERE
                rpe.pool_id = $1
            GROUP BY 1
        )
        SELECT
            p.pool_id
            , COALESCE(r.avg_member_reward_in_eth, 0) AS avg_member_reward_in_eth
            , COALESCE(r.avg_total_reward_in_eth, 0) AS avg_total_reward_in_eth
            , COALESCE(r.avg_member_stake, 0) AS avg_member_stake
            , COALESCE(r.avg_member_reward_eth_per_zrx, 0) AS avg_member_reward_eth_per_zrx
        FROM events.staking_pool_created_events p
        LEFT JOIN avg_rewards r ON r.pool_id = p.pool_id
        WHERE
            p.pool_id = $1;
`;

export const poolTotalProtocolFeesGeneratedQuery = `
    WITH
            fills_with_epochs AS (
                SELECT
                    fe.*
                    , COALESCE(e.epoch_id, ce.epoch_id) AS epoch_id
                FROM events.fill_events fe
                LEFT JOIN staking.epochs e ON
                    (
                        e.starting_block_number < fe.block_number
                        OR (fe.block_number = e.starting_block_number AND fe.transaction_index > e.starting_transaction_index)
                    )
                    AND (
                        e.ending_block_number > fe.block_number
                        OR (fe.block_number = e.ending_block_number AND fe.transaction_index < e.ending_transaction_index)
                    )
                LEFT JOIN staking.current_epoch ce ON
                    (
                        ce.starting_block_number < fe.block_number
                        OR (fe.block_number = ce.starting_block_number AND fe.transaction_index > ce.starting_transaction_index)
                    )
            )
            SELECT
                esps.pool_id
                , SUM(fwe.protocol_fee_paid) / 1e18 AS total_protocol_fees
                , COUNT(*) AS number_of_fills
            FROM fills_with_epochs fwe
            LEFT JOIN staking.epoch_start_pool_status esps ON
                fwe.maker_address = ANY(esps.maker_addresses)
                AND fwe.epoch_id = esps.epoch_id
            WHERE
                esps.pool_id = $1
            GROUP BY 1;
`;

export const poolEpochRewardsQuery = `
    SELECT
        $1::text AS pool_id
        , e.epoch_id AS epoch_id
        , e.starting_block_timestamp
        , e.starting_block_number
        , e.starting_transaction_index
        , e.ending_timestamp
        , e.ending_block_number
        , e.ending_transaction_hash
        , COALESCE(rpe.operator_reward / 1e18,0) AS operator_reward
        , COALESCE(rpe.members_reward / 1e18,0) AS members_reward
        , COALESCE((rpe.operator_reward + rpe.members_reward) / 1e18,0) AS total_reward
    FROM events.rewards_paid_events rpe
    FULL JOIN staking.epochs e ON e.epoch_id = (rpe.epoch_id - 1)
    LEFT JOIN staking.current_epoch ce ON ce.epoch_id = e.epoch_id
    WHERE
        (
            pool_id = $1
            OR pool_id IS NULL
        )
        AND ce.epoch_id IS NULL;
`;

export const currentEpochPoolsStatsQuery = `
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
            , COUNT(*) AS num_fills
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
            , SUM(num_fills) AS total_fills
        FROM current_epoch_fills_by_pool
    )
    SELECT
        pce.pool_id
        , cebs.maker_addresses AS maker_addresses
        , cebs.operator_share AS operator_share
        , cebs.zrx_delegated AS zrx_staked
        , ts.total_staked
        , cebs.operator_zrx_delegated AS operator_zrx_staked
        , cebs.member_zrx_delegated AS member_zrx_staked
        , cebs.zrx_delegated / ts.total_staked AS share_of_stake
        , fbp.protocol_fees AS total_protocol_fees_generated_in_eth
        , fbp.num_fills AS number_of_fills
        , fbp.protocol_fees / tf.total_protocol_fees AS share_of_fees
        , fbp.num_fills::FLOAT / tf.total_fills::FLOAT AS share_of_fills
        , (cebs.zrx_delegated / ts.total_staked)
            / (fbp.protocol_fees / tf.total_protocol_fees)
            AS approximate_stake_ratio
    FROM events.staking_pool_created_events pce
    LEFT JOIN current_epoch_beginning_status cebs ON cebs.pool_id = pce.pool_id
    LEFT JOIN current_epoch_fills_by_pool fbp ON fbp.epoch_id = cebs.epoch_id AND fbp.pool_id = cebs.pool_id
    CROSS JOIN total_staked ts
    CROSS JOIN total_fees tf;
`;

export const currentEpochPoolStatsQuery = `
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
                , COUNT(*) AS num_fills
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
                , SUM(num_fills) AS total_fills
            FROM current_epoch_fills_by_pool
        )
        SELECT
            pce.pool_id
            , cebs.maker_addresses AS maker_addresses
            , cebs.operator_share AS operator_share
            , cebs.zrx_delegated AS zrx_staked
            , cebs.operator_zrx_delegated AS operator_zrx_staked
            , cebs.member_zrx_delegated AS member_zrx_staked
            , ts.total_staked
            , cebs.zrx_delegated / ts.total_staked AS share_of_stake
            , fbp.protocol_fees AS total_protocol_fees_generated_in_eth
            , fbp.num_fills AS number_of_fills
            , fbp.protocol_fees / tf.total_protocol_fees AS share_of_fees
            , fbp.num_fills::FLOAT / tf.total_fills::FLOAT AS share_of_fills
            , (cebs.zrx_delegated / ts.total_staked)
                / (fbp.protocol_fees / tf.total_protocol_fees)
                AS approximate_stake_ratio
        FROM events.staking_pool_created_events pce
        LEFT JOIN current_epoch_beginning_status cebs ON cebs.pool_id = pce.pool_id
        LEFT JOIN current_epoch_fills_by_pool fbp ON fbp.epoch_id = cebs.epoch_id AND fbp.pool_id = cebs.pool_id
        CROSS JOIN total_staked ts
        CROSS JOIN total_fees tf
        WHERE
            pce.pool_id = $1;
`;

export const nextEpochPoolsStatsQuery = `
    WITH
        current_stake AS (
            SELECT
                pi.pool_id
                , SUM(zsc.amount) AS zrx_staked
                , SUM(CASE
                            WHEN pi.operator = zsc.staker THEN zsc.amount
                            ELSE 0.00
                        END) AS operator_zrx_staked
                , SUM(CASE
                            WHEN pi.operator <> zsc.staker THEN zsc.amount
                            ELSE 0.00
                        END) AS member_zrx_staked
            FROM staking.pool_info pi
            LEFT JOIN staking.zrx_staking_changes zsc ON zsc.pool_id = pi.pool_id
            GROUP BY 1
        )
        , current_epoch_fills_by_pool AS (
            SELECT
                pi.pool_id
                , COUNT(*) AS num_fills
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
                , SUM(num_fills) AS total_fills
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
            , cs.operator_zrx_staked
            , cs.member_zrx_staked
            , ts.total_staked
            , cs.zrx_staked / ts.total_staked AS share_of_stake
            , 0.00 AS total_protocol_fees_generated_in_eth
            , 0 AS number_of_fills
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

export const nextEpochPoolStatsQuery = `
    WITH
        current_stake AS (
            SELECT
                pi.pool_id
                , SUM(zsc.amount) AS zrx_staked
                , SUM(CASE
                        WHEN pi.operator = zsc.staker THEN zsc.amount
                        ELSE 0.00
                    END) AS operator_zrx_staked
                , SUM(CASE
                        WHEN pi.operator <> zsc.staker THEN zsc.amount
                        ELSE 0.00
                    END) AS member_zrx_staked
            FROM staking.pool_info pi
            LEFT JOIN staking.zrx_staking_changes zsc ON zsc.pool_id = pi.pool_id
            GROUP BY 1
        )
        , current_epoch_fills_by_pool AS (
            SELECT
                pi.pool_id
                , COUNT(*) AS num_fills
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
                , SUM(num_fills) AS total_fills
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
            , cs.operator_zrx_staked
            , cs.member_zrx_staked
            , ts.total_staked
            , cs.zrx_staked / ts.total_staked AS share_of_stake
            , 0.00 AS total_protocol_fees_generated_in_eth
            , 0 AS number_of_fills
            , (cs.zrx_staked / ts.total_staked)
                    / (fbp.protocol_fees / tr.total_protocol_fees)
                AS approximate_stake_ratio
        FROM staking.pool_info pi
        LEFT JOIN operator_share os ON os.pool_id = pi.pool_id
        LEFT JOIN current_stake cs ON cs.pool_id = pi.pool_id
        LEFT JOIN current_epoch_fills_by_pool fbp ON fbp.pool_id = pi.pool_id
        CROSS JOIN total_staked ts
        CROSS JOIN total_rewards tr
        WHERE pi.pool_id = $1;
`;

export const currentEpochDelegatorDepositedQuery = `
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

export const currentEpochDelegatorStakedQuery = `
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

export const nextEpochDelegatorDepositedQuery = `
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

export const nextEpochDelegatorStakedQuery = `
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

export const allTimeDelegatorStatsQuery = `
    SELECT
        pool_id
        , SUM(total_reward) AS reward
    FROM staking.address_pool_epoch_rewards
    WHERE
        address = $1::text
    GROUP BY 1;
`;

export const allTimePoolRewardsQuery = `
    SELECT
        pool_id
        , SUM(COALESCE(rpe.operator_reward / 1e18,0)) AS operator_reward
        , SUM(COALESCE(rpe.members_reward/ 1e18,0)) AS members_reward
        , SUM(COALESCE((rpe.operator_reward + rpe.members_reward) / 1e18,0)) AS total_rewards
    FROM events.rewards_paid_events rpe
    WHERE
        pool_id = $1
    GROUP BY 1;
`;

export const allTimeStatsQuery = `
    SELECT
        SUM(
            COALESCE(operator_reward, 0)
            + COALESCE(members_reward, 0)
        ) / 1e18 AS total_rewards_paid
    FROM events.rewards_paid_events;
`;

export const delegatorEventsQuery = `
    WITH
        earned_rewards_events AS (
            SELECT
                'earned_rewards' AS event_type
                , aper.address
                , e.ending_block_number AS block_number
                , e.ending_timestamp AS event_timestamp
                , NULL AS transaction_hash
                , JSON_BUILD_OBJECT('reward', aper.total_reward, 'epochId', aper.epoch_id, 'poolId', aper.pool_id) AS event_args
            FROM staking.address_pool_epoch_rewards aper
            LEFT JOIN staking.epochs e ON e.epoch_id = aper.epoch_id
            WHERE
                address = $1
                AND aper.total_reward > 0
        )
        , deposited_zrx_events AS (
            SELECT
                'deposited_zrx' AS event_type
                , se.staker AS address
                , se.block_number
                , TO_TIMESTAMP(b.block_timestamp) AS event_timestamp
                , se.transaction_hash
                , JSON_BUILD_OBJECT('zrxAmount', se.amount / 1e18) AS event_args
            FROM events.stake_events se
            LEFT JOIN events.blocks b ON b.block_number = se.block_number
            WHERE
                se.staker = $1
        )
        , withdrew_zrx_events AS (
            SELECT
                'withdrew_zrx' AS event_type
                , ue.staker AS address
                , ue.block_number
                , TO_TIMESTAMP(b.block_timestamp) AS event_timestamp
                , ue.transaction_hash
                , JSON_BUILD_OBJECT('zrxAmount', ue.amount / 1e18) AS event_args
            FROM events.unstake_events ue
            LEFT JOIN events.blocks b ON b.block_number = ue.block_number
            WHERE
                ue.staker = $1
        )
        , staked_events AS (
            SELECT
                'staked' AS event_type
                , mse.staker AS address
                , mse.block_number
                , TO_TIMESTAMP(b.block_timestamp) AS event_timestamp
                , mse.transaction_hash
                , JSON_BUILD_OBJECT('zrxAmount', mse.amount / 1e18, 'poolId', mse.to_pool) AS event_args
            FROM events.move_stake_events mse
            LEFT JOIN events.blocks b ON b.block_number = mse.block_number
            WHERE
                mse.staker = $1
                AND to_status = 1
                AND to_pool <> '0'
                AND from_status = 0
        )
        , removed_stake_events AS (
            SELECT
                'removed_stake' AS event_type
                , mse.staker AS address
                , mse.block_number
                , TO_TIMESTAMP(b.block_timestamp) AS event_timestamp
                , mse.transaction_hash
                , JSON_BUILD_OBJECT('zrxAmount', mse.amount / 1e18, 'poolId', mse.from_pool) AS event_args
            FROM events.move_stake_events mse
            LEFT JOIN events.blocks b ON b.block_number = mse.block_number
            WHERE
                mse.staker = $1
                AND from_status = 1
                AND from_pool <> '0'
                AND to_status = 0
        )
        , moved_stake_events AS (
            SELECT
                'moved_stake' AS event_type
                , mse.staker AS address
                , mse.block_number
                , TO_TIMESTAMP(b.block_timestamp) AS event_timestamp
                , mse.transaction_hash
                , JSON_BUILD_OBJECT('zrxAmount', mse.amount / 1e18, 'fromPoolId', mse.from_pool, 'toPoolId', mse.to_pool) AS event_args
            FROM events.move_stake_events mse
            LEFT JOIN events.blocks b ON b.block_number = mse.block_number
            WHERE
                mse.staker = $1
                AND from_status = 1
                AND to_status = 1
        )
        , combined AS (
            SELECT * FROM deposited_zrx_events

            UNION ALL

            SELECT * FROM earned_rewards_events

            UNION ALL

            SELECT * FROM staked_events

            UNION ALL

            SELECT * FROM removed_stake_events

            UNION ALL

            SELECT * FROM moved_stake_events

            UNION ALL

            SELECT * FROM withdrew_zrx_events
        )
        SELECT
            *
        FROM combined
        ORDER BY event_timestamp DESC;
`;
// tslint:disable-next-line: max-file-line-count
