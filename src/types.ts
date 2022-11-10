import { HttpServiceConfig as BaseHttpConfig } from '@0x/api-utils';
import { ExchangeProxyMetaTransaction, ZeroExTransaction } from '@0x/types';
import { BigNumber } from '@0x/utils';

import {
    AffiliateFeeType,
    ChainId,
    ERC20BridgeSource,
    ExtendedQuoteReportSources,
    LimitOrderFields,
    PriceComparisonsReport,
    QuoteReport,
    RfqRequestOpts,
    Signature,
} from './asset-swapper';
import { Integrator } from './config';

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
    kafkaTopic: string;
    kafkaConsumerGroupId: string;
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

export interface TokenMetadata {
    symbol: string;
    decimals: number;
    tokenAddress: string;
}

export enum FeeParamTypes {
    POSITIVE_SLIPPAGE = 'POSITIVE_SLIPPAGE',
    FIXED = 'FIXED',
    GASLESS_FEE = 'GASLESS_FEE',
}

export interface AffiliateFeeAmounts {
    gasCost: BigNumber;
    sellTokenFeeAmount: BigNumber;
    buyTokenFeeAmount: BigNumber;
}

/** Begin /swap and /meta_transaction types */

export interface QuoteBase {
    chainId: ChainId;
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
    // Our calculated price impact or null if we were unable to
    // to calculate any price impact
    estimatedPriceImpact: BigNumber | null;
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
    savingsInEth: BigNumber | null;
    buyAmount: BigNumber | null;
    sellAmount: BigNumber | null;
    expectedSlippage: BigNumber | null;
}

export type AffiliateFee =
    | { feeType: AffiliateFeeType.GaslessFee | AffiliateFeeType.PositiveSlippageFee; recipient: string }
    | {
          feeType: AffiliateFeeType.None | AffiliateFeeType.PercentageFee;
          recipient: string;
          sellTokenPercentageFee: number;
          buyTokenPercentageFee: number;
      };

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
    extendedQuoteReportSources?: ExtendedQuoteReportSources;
    priceComparisonsReport?: PriceComparisonsReport;
    expectedSlippage?: BigNumber | null;
    blockNumber: number | undefined;
}

export interface SwapQuoteResponsePartialTransaction {
    to: string;
    data: string;
    decodedUniqueId: string;
    value: BigNumber;
}

// Request params
export interface GetSwapQuoteParams extends SwapQuoteParamsBase {
    endpoint: 'price' | 'quote';
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
    // The ID of the integrator associated with the provided API key, if there is one.
    integrator?: Integrator;
    // The HTTP request origin
    origin?: string;
    // Whether the optimal route accounts for expected slippage for each liquidity source
    enableSlippageProtection?: boolean;
}

// GET /swap/price
export type GetSwapPriceResponse = BasePriceResponse;

/**
 * Response type for /meta_transaction/v1/quote endpoint
 */
export interface MetaTransactionQuoteResponse extends BasePriceResponse {
    metaTransactionHash: string;
    metaTransaction: ExchangeProxyMetaTransaction;
    orders?: any;
}

/**
 * Response type for the /meta_transaction/v1/price endpoint
 */
export type MetaTransactionPriceResponse = BasePriceResponse;

// Request params

/**
 * Request type for /meta_transaction/v1/price and /meta_transaction/v1/quote.
 * Reflected in `meta_transaction_quote_request_schema.json`.
 */
export interface MetaTransactionQuoteRequestParams extends SwapQuoteParamsBase {
    buyTokenAddress: string;
    integratorId: string;
    quoteUniqueId?: string; // ID to use for the quote report `decodedUniqueId`
    sellTokenAddress: string;
    takerAddress: string;
}

// Interim types
export type ZeroExTransactionWithoutDomain = Omit<ZeroExTransaction, 'domain'>;

/**
 * Parameters for the Meta Transaction Service price and quote functions.
 */
export interface MetaTransactionQuoteParams extends SwapQuoteParamsBase {
    buyTokenAddress: string;
    from: string;
    integratorId: string;
    isETHBuy: boolean;
    isETHSell: boolean;
    quoteUniqueId?: string; // ID to use for the quote report `decodedUniqueId`
    sellTokenAddress: string;
    takerAddress: string;
}

/** End /swap types */

export interface HttpServiceConfig extends BaseHttpConfig {
    ethereumRpcUrl: string;
    kafkaBrokers?: string[];
    kafkaConsumerGroupId?: string;
    rpcRequestTimeout: number;
    shouldCompressRequest: boolean;
}

export interface TokenMetadataOptionalSymbol {
    symbol?: string;
    decimals: number;
    tokenAddress: string;
}

export enum OrderEventEndState {
    // The order was successfully validated and added to the Mesh node. The order is now being watched and any changes to
    // the fillability will result in subsequent order events.
    Added = 'ADDED',
    // The order was filled for a partial amount. The order is still fillable up to the fillableTakerAssetAmount.
    Filled = 'FILLED',
    // The order was fully filled and its remaining fillableTakerAssetAmount is 0. The order is no longer fillable.
    FullyFilled = 'FULLY_FILLED',
    // The order was cancelled and is no longer fillable.
    Cancelled = 'CANCELLED',
    // The order expired and is no longer fillable.
    Expired = 'EXPIRED',
    // Catch all 'Invalid' state when invalid orders are submitted.
    Invalid = 'INVALID',
    // The order was previously expired, but due to a block re-org it is no longer considered expired (should be rare).
    Unexpired = 'UNEXPIRED',
    // The order has become unfunded and is no longer fillable. This can happen if the maker makes a transfer or changes their allowance.
    Unfunded = 'UNFUNDED',
    // The fillability of the order has increased. This can happen if a previously processed fill event gets reverted due to a block re-org,
    // or if a maker makes a transfer or changes their allowance.
    FillabilityIncreased = 'FILLABILITY_INCREASED',
    // The order is potentially still valid but was removed for a different reason (e.g.
    // the database is full or the peer that sent the order was misbehaving). The order will no longer be watched
    // and no further events for this order will be emitted. In some cases, the order may be re-added in the
    // future.
    StoppedWatching = 'STOPPED_WATCHING',
}
