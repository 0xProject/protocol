import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

export const stakingHandlers = {
    /** 
    {
        currentEpoch: {
            epoch_id: number,
            epochStart: {
                startingTimestamp: timestamp,
                startingBlockNumber: number,
                startingTxHash: string,
            },
        },
        nextEpoch: {
            epoch_id: number,
            approximateStart: {
                startingTimestamp: timestamp,
                startingBlockNumber: number,
            },
        },
        poolInfo: [
            {
                poolId: string,
                operatorAddress: string,
                created: {
                    createdTimestamp: timestamp,
                    createdBlockNumber: number,
                    createdTxHash: string,
                },
                metadata: {
                    verified: boolean,
                    logoUrl?: string,
                    location?: string,
                    bio?: string,
                    websiteUrl?: string,
                    name?: string
                },
                forNextEpoch: {
                    epochId: number,
                    zrxStaked: number,
                    operatorShare: number,
                    approximateStakeRatio: number,
                    makerAddressesSet: string[],
                    delegators: [
                        {
                            delegatorAddress: string,
                            isOperator: boolean,
                            stakingPoolOwnershipShare: number,
                        }
                        ...
                    ]
                },
                forCurrentEpoch: {
                    epochId: number,
                    zrxStaked: number,
                    operatorShare: number,
                    makerAddressesSet: string[],
                    protocolFeesGeneratedInEth: number
                },
                historical: [
                    {
                        epochId: number,
                        operatorRewardInEth: number,
                        membersRewardInEth: number,
                        totalRewardInEth: number,
                    }
                    ...
                ],
            }
            ...
        ]
    }
    */
    getStakingPools: async (req: express.Request, res: express.Response): Promise<void> => {
        res.status(HttpStatus.OK).send('OK');
    },
};
