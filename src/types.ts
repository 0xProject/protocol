import {
    ContractAddresses,
    ERC20BridgeSource,
    QuoteReport,
    RfqtRequestOpts,
    SupportedProvider,
} from '@0x/asset-swapper';
import { AcceptedOrderInfo, RejectedOrderInfo } from '@0x/mesh-rpc-client';
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

export interface AffiliateFeeAmounts {
    gasCost: BigNumber;
    sellTokenFeeAmount: BigNumber;
    buyTokenFeeAmount: BigNumber;
}

export interface SwapQuoteResponsePartialTransaction {
    to: string;
    data: string;
    value: BigNumber;
    decodedUniqueId: string;
}

export interface SwapQuoteResponsePrice {
    price: BigNumber;
    guaranteedPrice: BigNumber;
}

export interface GetSwapQuoteResponse extends SwapQuoteResponsePartialTransaction, SwapQuoteResponsePrice {
    gasPrice: BigNumber;
    protocolFee: BigNumber;
    minimumProtocolFee: BigNumber;
    orders: SignedOrder[];
    buyAmount: BigNumber;
    sellAmount: BigNumber;
    buyTokenAddress: string;
    sellTokenAddress: string;
    sources: GetSwapQuoteResponseLiquiditySource[];
    from?: string;
    gas: BigNumber;
    estimatedGas: BigNumber;
    allowanceTarget?: string;
    quoteReport?: QuoteReport;
    priceComparisons?: Array<SourceComparison | RenamedNativeSourceComparison>;
}

interface RenamedNativeSourceComparison {
    name: '0x';
    price: BigNumber | null;
    gas: BigNumber | null;
}

export interface SourceComparison {
    name: ERC20BridgeSource;
    price: BigNumber | null;
    gas: BigNumber | null;
}

export interface Price {
    symbol: string;
    price: BigNumber;
}

interface BasePriceResponse {
    price: BigNumber;
    buyAmount: BigNumber;
    sellAmount: BigNumber;
    sellTokenAddress: string;
    buyTokenAddress: string;
    sources: GetSwapQuoteResponseLiquiditySource[];
    value: BigNumber;
    gasPrice: BigNumber;
    gas: BigNumber;
    estimatedGas: BigNumber;
    protocolFee: BigNumber;
    minimumProtocolFee: BigNumber;
    allowanceTarget?: string;
    priceComparisons?: Array<SourceComparison | RenamedNativeSourceComparison>;
}

export interface GetSwapPriceResponse extends BasePriceResponse {}

export type GetTokenPricesResponse = Price[];

export interface GetMetaTransactionQuoteResponse extends BasePriceResponse {
    mtxHash: string;
    mtx: ExchangeProxyMetaTransaction;
    orders: SignedOrder[];
}

export interface GetMetaTransactionPriceResponse extends BasePriceResponse {}

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

// takerAddress, sellAmount, buyAmount, swapQuote, price
export interface CalculateMetaTransactionQuoteResponse {
    price: BigNumber;
    buyAmount: BigNumber | undefined;
    sellAmount: BigNumber | undefined;
    takerAddress: string;
    sources: GetSwapQuoteResponseLiquiditySource[];
    gasPrice: BigNumber;
    protocolFee: BigNumber;
    minimumProtocolFee: BigNumber;
    estimatedGas: BigNumber;
    quoteReport?: QuoteReport;
    orders: SignedOrder[];
    callData: string;
    allowanceTarget?: string;
}

export interface PostTransactionResponse {
    txHash: string;
    mtxHash: string;
}

export interface PercentageFee {
    recipient: string;
    sellTokenPercentageFee: number;
    buyTokenPercentageFee: number;
}
export type ZeroExTransactionWithoutDomain = Omit<ZeroExTransaction, 'domain'>;

export type ExchangeProxyMetaTransactionWithoutDomain = Omit<ExchangeProxyMetaTransaction, 'domain'>;

export interface GetSwapQuoteRequestParams {
    sellToken: string;
    buyToken: string;
    takerAddress?: string;
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    slippagePercentage?: number;
    gasPrice?: BigNumber;
    excludedSources?: ERC20BridgeSource[];
    includedSources?: ERC20BridgeSource[];
    affiliateAddress?: string;
    rfqt?: Pick<RfqtRequestOpts, 'intentOnFilling' | 'isIndicative' | 'nativeExclusivelyRFQT'>;
    skipValidation: boolean;
    apiKey?: string;
    affiliateFee: PercentageFee;
    includePriceComparisons: boolean;
}

export interface GetTransactionRequestParams {
    takerAddress: string;
    sellTokenAddress: string;
    buyTokenAddress: string;
    sellAmount?: BigNumber;
    buyAmount?: BigNumber;
    slippagePercentage?: number;
    excludedSources?: ERC20BridgeSource[];
    includedSources?: ERC20BridgeSource[];
    includePriceComparisons: boolean;
    affiliateFee: PercentageFee;
}

export interface CalculateSwapQuoteParams {
    buyTokenAddress: string;
    sellTokenAddress: string;
    buyAmount: BigNumber | undefined;
    sellAmount: BigNumber | undefined;
    from: string | undefined;
    isETHSell: boolean;
    isETHBuy: boolean;
    isMetaTransaction: boolean;
    slippagePercentage?: number;
    gasPrice?: BigNumber;
    excludedSources?: ERC20BridgeSource[];
    includedSources?: ERC20BridgeSource[];
    affiliateAddress?: string;
    apiKey?: string;
    rfqt?: Partial<RfqtRequestOpts>;
    skipValidation: boolean;
    affiliateFee: PercentageFee;
    includePriceComparisons: boolean;
}

export interface GetSwapQuoteResponseLiquiditySource {
    name: string;
    proportion: BigNumber;
    intermediateToken?: string;
    hops?: string[];
}

export interface PinResult {
    pin: SignedOrder[];
    doNotPin: SignedOrder[];
}

export interface CalculateMetaTransactionQuoteParams {
    takerAddress: string;
    buyTokenAddress: string;
    sellTokenAddress: string;
    buyAmount: BigNumber | undefined;
    sellAmount: BigNumber | undefined;
    isETHSell: boolean;
    isETHBuy: boolean;
    from: string | undefined;
    slippagePercentage?: number;
    excludedSources?: ERC20BridgeSource[];
    includedSources?: ERC20BridgeSource[];
    apiKey: string | undefined;
    includePriceComparisons: boolean;
    affiliateFee: PercentageFee;
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

export interface CalaculateMarketDepthParams {
    buyToken: TokenMetadata;
    sellToken: TokenMetadata;
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
// tslint:disable-line:max-file-line-count
