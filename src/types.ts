import { HttpServiceConfig as BaseHttpConfig } from '@0x/api-utils';
import { ExchangeProxyMetaTransaction } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { ContractAddresses, ChainId } from '@0x/contract-addresses';
import { OtcOrder } from '@0x/protocol-utils';
import { Connection } from 'typeorm';
import { Kafka } from 'kafkajs';

import { SignedOrderV4Entity } from './entities';
import {
    AffiliateFeeType,
    ERC20BridgeSource,
    ExtendedQuoteReportSources,
    LimitOrderFields,
    PriceComparisonsReport,
    QuoteReport,
    RfqRequestOpts,
    Signature,
    SupportedProvider,
} from './asset-swapper';

export type Address = string;

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

export enum OrdersChannelMessageTypes {
    Update = 'update',
    Unknown = 'unknown',
}
interface UpdateOrdersChannelMessage {
    type: OrdersChannelMessageTypes.Update;
    requestId: string;
    payload: SRAOrder[];
}

export enum WebsocketConnectionEventType {
    Close = 'close',
    Error = 'error',
    Message = 'message',
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

/** END SRA TYPES */

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

interface QuoteBase {
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

interface BasePriceResponse extends QuoteBase {
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
    priceImpactProtectionPercentage: number;
}

// GET /swap/quote
export interface GetSwapQuoteResponse extends SwapQuoteResponsePartialTransaction, BasePriceResponse {
    guaranteedPrice: BigNumber;
    // TODO(kyu-c): It seems `orders` must not be optional. Investigate and change its type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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

export interface Integrator {
    apiKeys: string[];
    integratorId: string;
    whitelistIntegratorUrls?: string[];
    label: string;
    rfqm: boolean;
    rfqt: boolean;
    slippageModel?: boolean;
}

export interface MetaTransactionQuoteResult extends QuoteBase {
    buyTokenAddress: string;
    callData: string;
    sellTokenAddress: string;
    taker: string;
}

export interface IMetaTransactionService {
    getMetaTransactionPriceAsync(params: MetaTransactionQuoteParams): Promise<MetaTransactionQuoteResult>;
    getMetaTransactionQuoteAsync(params: MetaTransactionQuoteParams): Promise<MetaTransactionQuoteResponse>;
}

export interface IOrderBookService {
    isAllowedPersistentOrders(apiKey: string): boolean;
    getOrderByHashIfExistsAsync(orderHash: string): Promise<SRAOrder | undefined>;
    getOrderBookAsync(page: number, perPage: number, baseToken: string, quoteToken: string): Promise<OrderbookResponse>;

    getOrdersAsync(
        page: number,
        perPage: number,
        orderFieldFilters: Partial<SignedOrderV4Entity>,
        additionalFilters: { isUnfillable?: boolean; trader?: string },
    ): Promise<PaginatedCollection<SRAOrder>>;

    getBatchOrdersAsync(
        page: number,
        perPage: number,
        makerTokens: string[],
        takerTokens: string[],
    ): Promise<PaginatedCollection<SRAOrder>>;

    addOrderAsync(signedOrder: SignedLimitOrder): Promise<void>;
    addOrdersAsync(signedOrders: SignedLimitOrder[]): Promise<void>;
    addPersistentOrdersAsync(signedOrders: SignedLimitOrder[]): Promise<void>;
}

export interface ISlippageModelManager {
    initializeAsync(): Promise<void>;
    calculateExpectedSlippage(
        buyToken: string,
        sellToken: string,
        buyAmount: BigNumber,
        sellAmount: BigNumber,
        sources: GetSwapQuoteResponseLiquiditySource[],
        maxSlippageRate: number,
    ): BigNumber | null;
}

export interface ISwapService {
    readonly slippageModelManager?: ISlippageModelManager;
    calculateSwapQuoteAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse>;
    getSwapQuoteForWrapAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse>;
    getSwapQuoteForUnwrapAsync(params: GetSwapQuoteParams): Promise<GetSwapQuoteResponse>;
}

export interface AppDependencies {
    contractAddresses: ContractAddresses;
    connection?: Connection;
    kafkaClient?: Kafka;
    orderBookService?: IOrderBookService;
    swapService?: ISwapService;
    metaTransactionService?: IMetaTransactionService;
    provider: SupportedProvider;
    websocketOpts: Partial<WebsocketSRAOpts>;
    hasSentry?: boolean;
}

export type RfqtV2Price = {
    expiry: BigNumber;
    makerAddress: string;
    makerAmount: BigNumber;
    makerId: string;
    makerToken: string;
    makerUri: string;
    takerAmount: BigNumber;
    takerToken: string;
};

export type RfqtV2Quote = {
    fillableMakerAmount: BigNumber;
    fillableTakerAmount: BigNumber;
    fillableTakerFeeAmount: BigNumber;
    makerId: string;
    makerUri: string;
    order: OtcOrder;
    signature: Signature;
};

export interface RfqtV2Request {
    assetFillAmount: BigNumber;
    chainId: number;
    integratorId: string;
    intentOnFilling: boolean;
    makerToken: string;
    marketOperation: 'Sell' | 'Buy';
    takerAddress: string;
    takerToken: string;
    txOrigin: string;
}
