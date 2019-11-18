import { Epoch, Pool, RawEpoch, RawPool } from '../types';

export const stakingUtils = {
    getEpochFromRaw: (rawEpoch: RawEpoch): Epoch => {
        const {
            epoch_id,
            starting_transaction_hash,
            starting_block_number,
            starting_block_timestamp,
        } = rawEpoch;
        return {
            epochId: parseInt(epoch_id, 10),
            epochStart: {
                blockNumber: parseInt(starting_block_number, 10),
                txHash: starting_transaction_hash,
                timestamp: starting_block_timestamp ? parseInt(starting_block_timestamp, 10) : undefined,
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
            poolId: parseInt(pool_id, 10),
            operatorAddress: operator,
            createdAt: {
                blockNumber: parseInt(created_at_block_number, 10),
                txHash: created_at_transaction_hash,
            },
            metaData: {
                name,
                bio,
                location,
                isVerified: verified === 'true',
                logoUrl: logo_url,
                websiteUrl: website,
            },
        };
    },
    getPoolsFromRaw: (rawPools: RawPool[]): Pool[] => {
        return rawPools.map(stakingUtils.getPoolFromRaw);
    },
};
