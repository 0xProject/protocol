import * as _ from 'lodash';
import { Connection } from 'typeorm';

import { Epoch, RawEpoch, RawPool } from '../types';
import { stakingUtils } from '../utils/staking_utils';
// {
//     currentEpoch: {
//         epoch_id: number,
//         epochStart: {
//             startingTimestamp: timestamp,
//             startingBlockNumber: number,
//             startingTxHash: string,
//         },
//     },
//     nextEpoch: {
//         epoch_id: number,
//         approximateStart: {
//             startingTimestamp: timestamp,
//             startingBlockNumber: number,
//         },
//     },
//     poolInfo: [
//         {
//             poolId: string,
//             operatorAddress: string,
//             created: {
//                 createdTimestamp: timestamp,
//                 createdBlockNumber: number,
//                 createdTxHash: string,
//             },
//             metadata: {
//                 verified: boolean,
//                 logoUrl?: string,
//                 location?: string,
//                 bio?: string,
//                 websiteUrl?: string,
//                 name?: string
//             },
//             forNextEpoch: {
//                 epochId: number,
//                 zrxStaked: number,
//                 operatorShare: number,
//                 approximateStakeRatio: number,
//                 makerAddressesSet: string[],
//                 delegators: [
//                     {
//                         delegatorAddress: string,
//                         isOperator: boolean,
//                         stakingPoolOwnershipShare: number,
//                     }
//                     ...
//                 ]
//             },
//             forCurrentEpoch: {
//                 epochId: number,
//                 zrxStaked: number,
//                 operatorShare: number,
//                 makerAddressesSet: string[],
//                 protocolFeesGeneratedInEth: number
//             },
//             historical: [
//                 {
//                     epochId: number,
//                     operatorRewardInEth: number,
//                     membersRewardInEth: number,
//                     totalRewardInEth: number,
//                 }
//                 ...
//             ],
//         }
//         ...
//     ]
// }
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
            , ce.starting_block_timestamp + ((cp.epoch_duration_in_seconds)::VARCHAR || ' seconds')::INTERVAL AS starting_timestamp
        FROM staking.current_epoch ce
        CROSS JOIN staking.current_params cp;`));
        if (!rawEpoch) {
            throw new Error('Could not find the next current epoch.');
        }
        const epoch = stakingUtils.getEpochFromRaw(rawEpoch);
        return epoch;
    }
    public async getStakingPoolsAsync(): Promise<any> {
        const rawPools: RawPool[] = await this._connection.query(`SELECT * FROM staking.pool_info;`);
        const pools = stakingUtils.getPoolsFromRaw(rawPools);
        return pools;
    }
}
