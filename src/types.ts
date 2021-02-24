import {
    AffiliateFeeType,
    ContractAddresses,
    ERC20BridgeSource,
    QuoteReport,
    RfqtRequestOpts,
    SupportedProvider,
} from '@0x/asset-swapper';
import { OrderEventEndState, OrderWithMetadata, RejectedOrderCode } from '@0x/mesh-graphql-client';
import {
    APIOrder,
    ExchangeProxyMetaTransaction,
    OrdersChannelSubscriptionOpts,
    SignedOrder,
    UpdateOrdersChannelMessage,
    ZeroExTransaction,
} from '@0x/types';
import { BigNumber } from '@0x/utils';

import { MetaTransactionRateLimiter } from './utils/rate-limiters';
import { MetaTransactionRateLimitConfig } from './utils/rate-limiters/types';

export {
    AvailableRateLimiter,
    DatabaseKeysUsedForRateLimiter,
    MetaTransactionDailyLimiterConfig,
    MetaTransactionRateLimitConfig,
    MetaTransactionRateLimiterAllowedResponse,
    MetaTransactionRateLimiterContext,
    MetaTransactionRateLimiterRejectedResponse,
    MetaTransactionRateLimiterResponse,
    MetaTransactionRollingLimiterConfig,
    MetaTransactionRollingValueLimiterConfig,
    RollingLimiterIntervalUnit,
} from './utils/rate-limiters/types';

export enum OrderWatcherLifeCycleEvents {
    Added,
    Removed,
    Updated,
    PersistentUpdated,
}

// TODO(kimpers): export from Mesh client
export interface AcceptedOrderResult {
    // The order that was accepted, including metadata.
    order: OrderWithMetadata;
    // Whether or not the order is new. Set to true if this is the first time this Mesh node has accepted the order
    // and false otherwise.
    isNew: boolean;
}

export interface RejectedOrderResult {
    // The hash of the order. May be null if the hash could not be computed.
    hash?: string;
    // The order that was rejected.
    order: SignedOrder;
    // A machine-readable code indicating why the order was rejected. This code is designed to
    // be used by programs and applications and will never change without breaking backwards-compatibility.
    code: RejectedOrderCode;
    // A human-readable message indicating why the order was rejected. This message may change
    // in future releases and is not covered by backwards-compatibility guarantees.
    message: string;
}

export interface OrdersByLifecycleEvents {
    added: APIOrderWithMetaData[];
    removed: APIOrderWithMetaData[];
    updated: APIOrderWithMetaData[];
}

export type onOrdersUpdateCallback = (orders: APIOrderWithMetaData[]) => void;

export interface APIOrderMetaData {
    orderHash: string;
    remainingFillableTakerAssetAmount: BigNumber;
    state?: OrderEventEndState;
    createdAt?: string;
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
    zrx_deposited?: string;
    zrx_staked?: string;
}

// Separating out the response with fees
// As this is a significantly heavier query (it has to sum over fills)
export interface RawEpochWithFees extends RawEpoch {
    protocol_fees_generated_in_eth: string;
}

export interface TransactionDate {
    blockNumber: number;
    txHash: string;
    timestamp?: string;
}

export interface Epoch {
    epochId: number;
    epochStart: TransactionDate;
    epochEnd?: TransactionDate;
    zrxStaked: number;
    zrxDeposited: number;
}

export interface EpochWithFees extends Epoch {
    protocolFeesGeneratedInEth: number;
}

export interface RawPool {
    pool_id: string;
    operator: string;
    created_at_block_number: string;
    created_at_transaction_hash: string;
    created_at_transaction_index: string;
    maker_addresses: string[];
    isVerified?: boolean;
    logo_url?: string;
    location?: string;
    bio?: string;
    website?: string;
    name?: string;
}

export interface RawPoolEpochRewards {
    epoch_id: string;
    pool_id: string;
    operator_reward: string;
    members_reward: string;
    total_reward: string;
    // Fields below are available but not used in response
    starting_block_timestamp: string;
    starting_block_number: string;
    starting_transaction_index: string;
    ending_block_number: string;
    ending_timestamp: string;
    ending_transaction_hash: string;
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
    sevenDayProtocolFeesGeneratedInEth: number;
    avgMemberRewardInEth: number;
    avgTotalRewardInEth: number;
    avgMemberRewardEthPerZrx: number;
}

export interface PoolWithHistoricalStats extends PoolWithStats {
    allTimeStats: AllTimePoolStats;
    epochRewards: PoolEpochRewards[];
}

export interface RawEpochPoolStats {
    pool_id: string;
    maker_addresses: string[];
    operator_share?: string;
    zrx_staked?: string;
    operator_zrx_staked?: string;
    member_zrx_staked?: string;
    total_staked?: string;
    share_of_stake?: string;
    total_protocol_fees_generated_in_eth?: string;
    number_of_fills?: string;
    share_of_fees?: string;
    share_of_fills?: string;
    approximate_stake_ratio?: string;
}

export interface EpochPoolStats {
    poolId: string;
    zrxStaked: number;
    operatorZrxStaked: number;
    memberZrxStaked: number;
    shareOfStake: number;
    operatorShare?: number;
    makerAddresses: string[];
    totalProtocolFeesGeneratedInEth: number;
    shareOfFees: number;
    numberOfFills: number;
    shareOfFills: number;
    approximateStakeRatio: number;
}

export interface RewardsStats {
    operatorRewardsPaidInEth: number;
    membersRewardsPaidInEth: number;
    totalRewardsPaidInEth: number;
}

export interface PoolEpochRewards extends RewardsStats {
    epochId: number;
    epochStartTimestamp: string;
    epochEndTimestamp: string;
}

export interface RawPoolProtocolFeesGenerated {
    pool_id: string;
    seven_day_protocol_fees_generated_in_eth: string;
    seven_day_number_of_fills: string;
}

export interface RawPoolAvgRewards {
    pool_id: string;
    avg_member_reward_in_eth: string;
    avg_total_reward_in_eth: string;
    avg_member_stake: string;
    avg_member_reward_eth_per_zrx: string;
}

export interface PoolAvgRewards {
    poolId: string;
    avgMemberRewardInEth: number;
    avgTotalRewardInEth: number;
    avgMemberRewardEthPerZrx: number;
}

export interface RawPoolTotalProtocolFeesGenerated {
    pool_id: string;
    total_protocol_fees: string;
    number_of_fills: string;
}

export interface PoolProtocolFeesGenerated {
    poolId: string;
    sevenDayProtocolFeesGeneratedInEth: number;
    sevenDayNumberOfFills: number;
}

export interface RawAllTimeStakingStats {
    total_rewards_paid: string;
}
export interface AllTimeStakingStats {
    totalRewardsPaidInEth: number;
}

export interface StakingPoolResponse {
    poolId: string;
    stakingPool: PoolWithHistoricalStats;
}
export interface StakingPoolsResponse {
    stakingPools: PoolWithStats[];
}

export interface RawDelegatorDeposited {
    delegator: string;
    zrx_deposited: string;
}

export interface RawDelegatorStaked {
    delegator: string;
    zrx_staked_overall: string;
    pool_id: string;
    zrx_staked_in_pool: string;
}

export interface RawAllTimeDelegatorPoolsStats {
    pool_id: string;
    reward: string;
}

export interface RawAllTimePoolRewards {
    pool_id: string;
    operator_reward: string;
    members_reward: string;
    total_rewards: string;
}

export interface PoolEpochDelegatorStats {
    poolId: string;
    zrxStaked: number;
}

export interface EpochDelegatorStats {
    zrxDeposited: number;
    zrxStaked: number;
    poolData: PoolEpochDelegatorStats[];
}

export interface AllTimePoolStats extends RewardsStats {
    protocolFeesGeneratedInEth: number;
    numberOfFills: number;
}

export interface AllTimeDelegatorPoolStats {
    poolId: string;
    rewardsInEth: number;
}

export interface AllTimeDelegatorStats {
    poolData: AllTimeDelegatorPoolStats[];
}

export interface StakingDelegatorResponse {
    delegatorAddress: string;
    forCurrentEpoch: EpochDelegatorStats;
    forNextEpoch: EpochDelegatorStats;
    allTime: AllTimeDelegatorStats;
}
export interface StakingEpochsResponse {
    currentEpoch: Epoch;
    nextEpoch: Epoch;
}
export interface StakingEpochsWithFeesResponse {
    currentEpoch: EpochWithFees;
    nextEpoch: EpochWithFees;
}
export interface StakingStatsResponse {
    allTime: AllTimeStakingStats;
}

export interface RawDelegatorEvent {
    event_type: string;
    address: string;
    block_number: string | null;
    event_timestamp: string;
    transaction_hash: string | null;
    event_args: object;
}
export interface DelegatorEvent {
    eventType: string;
    address: string;
    blockNumber: number | null;
    eventTimestamp: string;
    transactionHash: string | null;
    eventArgs: object;
}

export interface ObjectMap<T> {
    [key: string]: T;
}

export enum ChainId {
    Mainnet = 1,
    Kovan = 42,
    Ganache = 1337,
}

export interface TokenMetadata {
    symbol: string;
    decimals: number;
    tokenAddress: string;
}

// tslint:disable:enum-naming
export enum FeeParamTypes {
    POSITIVE_SLIPPAGE = 'POSITIVE_SLIPPAGE',
    FIXED = 'FIXED',
}
// tslint:enable:enum-naming

export interface AffiliateFeeAmounts {
    gasCost: BigNumber;
    sellTokenFeeAmount: BigNumber;
    buyTokenFeeAmount: BigNumber;
}

/**
 * Begin request and response types related to quotes
 */

// Shared common types
interface QuoteBase {
    price: BigNumber;
    buyAmount: BigNumber;
    sellAmount: BigNumber;
    sources: GetSwapQuoteResponseLiquiditySource[];
    gasPrice: BigNumber;
    estimatedGas: BigNumber;
    sellTokenToEthRate: BigNumber;
    buyTokenToEthRate: BigNumber;
    protocolFee: BigNumber;
    minimumProtocolFee: BigNumber;
    allowanceTarget?: string;
}

export interface GetSwapQuoteResponseLiquiditySource {
    name: string;
    proportion: BigNumber;
    intermediateToken?: string;
    hops?: string[];
}

export interface BasePriceResponse extends QuoteBase {
    sellTokenAddress: string;
    buyTokenAddress: string;
    value: BigNumber;
    gas: BigNumber;
    priceComparisons?: SourceComparison[];
}

export interface SourceComparison {
    name: ERC20BridgeSource | '0x';
    price: BigNumber | null;
    gas: BigNumber | null;
    savingsInEth?: BigNumber;
}

export interface AffiliateFee {
    feeType: AffiliateFeeType;
    recipient: string;
    sellTokenPercentageFee: number;
    buyTokenPercentageFee: number;
}

interface SwapQuoteParamsBase {
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    slippagePercentage?: number;
    excludedSources: ERC20BridgeSource[];
    includedSources?: ERC20BridgeSource[];
    affiliateAddress?: string;
    affiliateFee: AffiliateFee;
    includePriceComparisons?: boolean;
}

// GET /swap/quote
export interface GetSwapQuoteResponse extends SwapQuoteResponsePartialTransaction, BasePriceResponse {
    guaranteedPrice: BigNumber;
    // orders: SignedOrder[];
    orders?: any;
    from?: string;
    quoteReport?: QuoteReport;
}

export interface SwapQuoteResponsePartialTransaction {
    to: string;
    data: string;
    decodedUniqueId: string;
    value: BigNumber;
}

// Request params
export interface GetSwapQuoteParams extends SwapQuoteParamsBase {
    sellToken: string;
    buyToken: string;
    takerAddress?: string;
    apiKey?: string;
    gasPrice?: BigNumber;
    rfqt?: Pick<RfqtRequestOpts, 'intentOnFilling' | 'isIndicative' | 'nativeExclusivelyRFQT'>;
    skipValidation: boolean;
    shouldSellEntireBalance: boolean;
    isWrap: boolean;
    isUnwrap: boolean;
    isETHSell: boolean;
    isETHBuy: boolean;
    isMetaTransaction: boolean;
}

// GET /swap/price
export interface GetSwapPriceResponse extends BasePriceResponse {}

// GET /swap/prices
export interface Price {
    symbol: string;
    price: BigNumber;
}

// GET /meta_transaction/quote
export interface GetMetaTransactionQuoteResponse extends BasePriceResponse {
    mtxHash: string;
    mtx: ExchangeProxyMetaTransaction;
    // orders: SignedOrder[]
    orders?: any;
}

// GET /meta_transaction/price
export interface GetMetaTransactionPriceResponse extends BasePriceResponse {}

// GET /meta_transaction/status/:txhash
export interface GetMetaTransactionStatusResponse {
    refHash: string;
    hash?: string;
    status: string;
    gasPrice?: BigNumber;
    updatedAt?: Date;
    blockNumber?: number;
    expectedMinedInSec?: number;
    ethereumTxStatus?: number;
}

// Request params
export interface GetTransactionRequestParams extends SwapQuoteParamsBase {
    takerAddress: string;
    sellTokenAddress: string;
    buyTokenAddress: string;
}

// POST /meta_transaction/submit
export interface PostTransactionResponse {
    txHash: string;
    mtxHash: string;
}

// Interim types
export type ZeroExTransactionWithoutDomain = Omit<ZeroExTransaction, 'domain'>;

export type ExchangeProxyMetaTransactionWithoutDomain = Omit<ExchangeProxyMetaTransaction, 'domain'>;

export interface CalculateMetaTransactionQuoteResponse extends QuoteBase {
    sellTokenAddress: string;
    buyTokenAddress: string;
    taker: string;
    quoteReport?: QuoteReport;
    // orders: SignedOrder[];
    callData: string;
}

export interface CalculateMetaTransactionQuoteParams extends SwapQuoteParamsBase {
    sellTokenAddress: string;
    buyTokenAddress: string;
    takerAddress: string;
    from: string;
    apiKey?: string;
    isETHBuy: boolean;
    isETHSell: boolean;
}

/**
 * End quote-related types
 */

export interface PinResult {
    pin: SignedOrder[];
    doNotPin: SignedOrder[];
}

export enum TransactionStates {
    // transaction has been constructed, but not yet submitted to the network.
    Unsubmitted = 'unsubmitted',
    // transaction has been submitted to the network.
    Submitted = 'submitted',
    // transaction has been spotted in the mempool.
    Mempool = 'mempool',
    // transaction has not been mined in the expected time.
    Stuck = 'stuck',
    // transaction has been mined.
    Included = 'included',
    // transaction is confirmed.
    Confirmed = 'confirmed',
    // transaction is no longer in the mempool.
    Dropped = 'dropped',
    // transaction has been aborted because a new transaction with the same
    // nonce has been mined.
    Aborted = 'aborted',
    // transaction was in an unsubmitted state for too long.
    Cancelled = 'cancelled',
}

export interface TransactionWatcherSignerStatus {
    live: boolean;
    timeSinceEpoch: number;
    gasPrice: number;
    maxGasPrice: number;
    balances: {
        [address: string]: number;
    };
}

export interface TransactionWatcherSignerServiceConfig {
    provider: SupportedProvider;
    chainId: number;
    contractAddresses: ContractAddresses;
    signerPrivateKeys: string[];
    expectedMinedInSec: number;
    isSigningEnabled: boolean;
    maxGasPriceGwei: BigNumber;
    minSignerEthBalance: number;
    transactionPollingIntervalMs: number;
    heartbeatIntervalMs: number;
    unstickGasMultiplier: number;
    numBlocksUntilConfirmed: number;
    rateLimiter?: MetaTransactionRateLimiter;
}

export interface HttpServiceConfig {
    httpPort: number;
    healthcheckHttpPort: number;
    ethereumRpcUrl: string;
    httpKeepAliveTimeout: number;
    httpHeadersTimeout: number;
    enablePrometheusMetrics: boolean;
    prometheusPort: number;
    meshWebsocketUri?: string;
    meshHttpUri?: string;
    metaTxnRateLimiters?: MetaTransactionRateLimitConfig;
}

export interface TokenMetadataOptionalSymbol {
    symbol?: string;
    decimals: number;
    tokenAddress: string;
}
export interface CalaculateMarketDepthParams {
    buyToken: string;
    sellToken: string;
    sellAmount: BigNumber;
    numSamples: number;
    sampleDistributionBase: number;
    excludedSources?: ERC20BridgeSource[];
    includedSources?: ERC20BridgeSource[];
}

export interface BucketedPriceDepth {
    cumulative: BigNumber;
    price: BigNumber;
    bucket: number;
    bucketTotal: BigNumber;
}
export interface SRAGetOrdersRequestOpts {
    makerAssetProxyId?: string;
    takerAssetProxyId?: string;
    makerAssetAddress?: string;
    takerAssetAddress?: string;
    exchangeAddress?: string;
    senderAddress?: string;
    makerAssetData?: string | string[];
    takerAssetData?: string | string[];
    makerFeeAssetData?: string;
    takerFeeAssetData?: string;
    makerAddress?: string;
    takerAddress?: string;
    traderAddress?: string;
    feeRecipientAddress?: string;
    isUnfillable?: boolean; // default false
}
// tslint:disable-line:max-file-line-count
