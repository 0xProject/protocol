import { HttpServiceConfig as BaseHttpConfig } from '@0x/api-utils';
import {
    AffiliateFeeType,
    ContractAddresses,
    ERC20BridgeSource,
    LimitOrderFields,
    QuoteReport,
    RfqRequestOpts,
    Signature,
    SupportedProvider,
} from '@0x/asset-swapper';
import { OrderEventEndState } from '@0x/mesh-graphql-client';
import { ExchangeProxyMetaTransaction, ZeroExTransaction } from '@0x/types';
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

export interface OrdersByLifecycleEvents {
    added: SRAOrder[];
    removed: SRAOrder[];
    updated: SRAOrder[];
}

export interface PaginatedCollection<T> {
    total: number;
    page: number;
    perPage: number;
    records: T[];
}

export interface SignedLimitOrder extends LimitOrderFields {
    signature: Signature;
}

/** BEGIN SRA TYPES */

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

export type OrdersChannelMessage = UpdateOrdersChannelMessage | UnknownOrdersChannelMessage;
export enum OrdersChannelMessageTypes {
    Update = 'update',
    Unknown = 'unknown',
}
export interface UpdateOrdersChannelMessage {
    type: OrdersChannelMessageTypes.Update;
    requestId: string;
    payload: SRAOrder[];
}
export interface UnknownOrdersChannelMessage {
    type: OrdersChannelMessageTypes.Unknown;
    requestId: string;
    payload: undefined;
}

export enum WebsocketConnectionEventType {
    Close = 'close',
    Error = 'error',
    Message = 'message',
}

export enum WebsocketClientEventType {
    Connect = 'connect',
    ConnectFailed = 'connectFailed',
}

/**
 * makerToken: subscribes to new orders where the contract address for the maker token matches the value specified
 * takerToken: subscribes to new orders where the contract address for the taker token matches the value specified
 */
export interface OrdersChannelSubscriptionOpts {
    makerToken?: string;
    takerToken?: string;
}

export interface SRAOrderMetaData {
    orderHash: string;
    remainingFillableTakerAmount: BigNumber;
    state?: OrderEventEndState;
    createdAt?: string;
}

export interface SRAOrder {
    order: SignedLimitOrder;
    metaData: SRAOrderMetaData;
}

export type OrdersResponse = PaginatedCollection<SRAOrder>;

export interface OrderbookRequest {
    baseToken: string;
    quoteToken: string;
}

export interface OrderbookResponse {
    bids: PaginatedCollection<SRAOrder>;
    asks: PaginatedCollection<SRAOrder>;
}

export interface OrderConfigRequestPayload {
    maker: string;
    taker: string;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    makerToken: string;
    takerToken: string;
    verifyingContract: string;
    expiry: BigNumber;
}

export interface OrderConfigResponse {
    feeRecipient: string;
    sender: string;
    takerTokenFeeAmount: BigNumber;
}

export type FeeRecipientsResponse = PaginatedCollection<string>;

export interface PagedRequestOpts {
    page?: number;
    perPage?: number;
}

/** END SRA TYPES */

export interface ObjectMap<T> {
    [key: string]: T;
}

// tslint:disable:enum-naming
export enum ChainId {
    Mainnet = 1,
    Ropsten = 3,
    Rinkeby = 4,
    Kovan = 42,
    Ganache = 1337,
    BSC = 56,
}
// tslint:enable:enum-naming

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

/** Begin /swap and /meta_transaction types */

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
    rfqt?: Pick<RfqRequestOpts, 'intentOnFilling' | 'isIndicative' | 'nativeExclusivelyRFQ'>;
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

/** End /swap types */

export interface PinResult {
    pin: SignedLimitOrder[];
    doNotPin: SignedLimitOrder[];
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

export interface HttpServiceConfig extends BaseHttpConfig {
    ethereumRpcUrl: string;
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
// tslint:disable-line:max-file-line-count
