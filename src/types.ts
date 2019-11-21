import { BigNumber } from '0x.js';
import { AcceptedOrderInfo, RejectedOrderInfo } from '@0x/mesh-rpc-client';
import { APIOrder, OrdersChannelSubscriptionOpts, UpdateOrdersChannelMessage } from '@0x/types';

export enum OrderWatcherLifeCycleEvents {
    Added,
    Removed,
    Updated,
}

export type onOrdersUpdateCallback = (orders: APIOrderWithMetaData[]) => void;

export interface AcceptedRejectedResults {
    accepted: AcceptedOrderInfo[];
    rejected: RejectedOrderInfo[];
}

export interface APIOrderMetaData {
    orderHash: string;
    remainingFillableTakerAssetAmount: BigNumber;
}

export interface APIOrderWithMetaData extends APIOrder {
    metaData: APIOrderMetaData;
}

export interface WebsocketSRAOpts {
    pongInterval: number;
    path: string;
}

export interface OrderChannelRequest {
    type: string;
    channel: MessageChannels;
    requestId: string;
    payload?: OrdersChannelSubscriptionOpts;
}

export enum MessageTypes {
    Subscribe = 'subscribe',
}

export enum MessageChannels {
    Orders = 'orders',
}
export interface UpdateOrdersChannelMessageWithChannel extends UpdateOrdersChannelMessage {
    channel: MessageChannels;
}

export interface AddedRemovedUpdate {
    added: APIOrderWithMetaData[];
    removed: APIOrderWithMetaData[];
    updated: APIOrderWithMetaData[];
}

// Staking types
export interface RawEpoch {
    epoch_id: string;
    starting_transaction_hash: string;
    starting_block_number: string;
    starting_transaction_index?: string;
    starting_block_timestamp?: string;
    ending_transaction_hash?: null;
    ending_transaction_index?: null;
    ending_block_number?: null;
    ending_block_timestamp?: null;
}

export interface TransactionDate {
    blockNumber: number;
    txHash: string;
    timestamp?: string;
}

export interface Epoch {
    epochId: number;
    epochStart: TransactionDate;
}

export interface RawPool {
    pool_id: string;
    operator: string;
    created_at_block_number: string;
    created_at_transaction_hash: string;
    created_at_transaction_index: string;
    maker_addresses: string[];
    verified?: string;
    logo_url?: string;
    location?: string;
    bio?: string;
    website?: string;
    name?: string;
}

export interface PoolMetadata {
    isVerified: boolean;
    logoUrl?: string;
    location?: string;
    bio?: string;
    websiteUrl?: string;
    name?: string;
}

export interface Pool {
    poolId: string;
    operatorAddress: string;
    createdAt: TransactionDate;
    metaData: PoolMetadata;
}

export interface PoolWithStats extends Pool {
    currentEpochStats: EpochPoolStats;
    nextEpochStats: EpochPoolStats;
}

export interface RawEpochPoolStats {
    pool_id: string;
    maker_addresses: string[];
    operator_share: string;
    zrx_staked?: string;
    total_staked?: string;
    share_of_stake?: string;
    protocol_fees?: string;
    total_protocol_fees?: string;
    share_of_fees?: string;
    approximate_stake_ratio?: string;
}

export interface EpochPoolStats {
    poolId: string;
    zrxStaked: number;
    operatorShare: number;
    makerAddresses: string[];
    protocolFeesGeneratedInEth: number;
    stakeRatio: number;
}

export interface StakingPoolsResponse {
    currentEpoch: Epoch;
    nextEpoch: Epoch;
    stakingPools: PoolWithStats[];
}

export interface ObjectMap<T> {
    [key: string]: T;
}
