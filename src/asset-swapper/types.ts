import { ChainId } from '@0x/contract-addresses';
import { BlockParam, ContractAddresses, GethCallOverrides } from '@0x/contract-wrappers';
import {
    FillQuoteTransformerOrderType,
    LimitOrderFields,
    OtcOrder,
    OtcOrderFields,
    RfqOrder,
    RfqOrderFields,
    Signature,
} from '@0x/protocol-utils';
import { TakerRequestQueryParamsUnnested, V4SignedRfqOrder } from '@0x/quote-server';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';

import {
    ERC20BridgeSource,
    GetMarketOrdersOpts,
    LiquidityProviderRegistry,
    OptimizedMarketOrder,
} from './utils/market_operation_utils/types';
import { ExtendedQuoteReportSources, PriceComparisonsReport, QuoteReport } from './utils/quote_report_generator';
import { TokenAdjacencyGraph } from './utils/token_adjacency_graph';

export type Address = string;

/**
 * expiryBufferMs: The number of seconds to add when calculating whether an order is expired or not. Defaults to 300s (5m).
 * permittedOrderFeeTypes: A set of all the takerFee types that OrderPruner will filter for
 */
export interface OrderPrunerOpts {
    expiryBufferMs: number;
    permittedOrderFeeTypes: Set<OrderPrunerPermittedFeeTypes>;
}

export interface SignedLimitOrder {
    order: LimitOrderFields;
    type: FillQuoteTransformerOrderType.Limit;
    signature: Signature;
}

export interface SignedRfqOrder {
    order: RfqOrderFields;
    type: FillQuoteTransformerOrderType.Rfq;
    signature: Signature;
}

export interface SignedOtcOrder {
    order: OtcOrderFields;
    type: FillQuoteTransformerOrderType.Otc;
    signature: Signature;
}

export type SignedNativeOrder = SignedLimitOrder | SignedRfqOrder | SignedOtcOrder;
export type NativeOrderWithFillableAmounts = SignedNativeOrder & NativeOrderFillableAmountFields;

/**
 * fillableMakerAmount: Amount of makerAsset that is fillable
 * fillableTakerAmount: Amount of takerAsset that is fillable
 * fillableTakerFeeAmount: Amount of takerFee paid to fill fillableTakerAmount
 */
export interface NativeOrderFillableAmountFields {
    fillableMakerAmount: BigNumber;
    fillableTakerAmount: BigNumber;
    fillableTakerFeeAmount: BigNumber;
}

/**
 * Represents the metadata to call a smart contract with calldata.
 * calldataHexString: The hexstring of the calldata.
 * toAddress: The contract address to call.
 * ethAmount: The eth amount in wei to send with the smart contract call.
 * allowanceTarget: The address the taker should grant an allowance to.
 * gasOverhead: The gas overhead needed to be added to the gas limit to allow for optional
 * operations which may not visible at eth_estimateGas time
 */
export interface CalldataInfo {
    calldataHexString: string;
    toAddress: string;
    ethAmount: BigNumber;
    allowanceTarget: string;
    gasOverhead: BigNumber;
}

/**
 * Interface that varying SwapQuoteConsumers adhere to (exchange consumer, router consumer, forwarder consumer, coordinator consumer)
 * getCalldataOrThrow: Get CalldataInfo to swap for tokens with provided SwapQuote. Throws if invalid SwapQuote is provided.
 * executeSwapQuoteOrThrowAsync: Executes a web3 transaction to swap for tokens with provided SwapQuote. Throws if invalid SwapQuote is provided.
 */
export interface SwapQuoteConsumerBase {
    getCalldataOrThrowAsync(quote: SwapQuote, opts: Partial<SwapQuoteGetOutputOpts>): Promise<CalldataInfo>;
    executeSwapQuoteOrThrowAsync(quote: SwapQuote, opts: Partial<SwapQuoteExecutionOpts>): Promise<string>;
}

/**
 * chainId: The chainId that the desired orders should be for.
 */
export interface SwapQuoteConsumerOpts {
    chainId: number;
    contractAddresses?: ContractAddresses;
}

/**
 * Represents the options provided to a generic SwapQuoteConsumer
 */
export interface SwapQuoteGetOutputOpts {
    extensionContractOpts?: ExchangeProxyContractOpts | any;
}

/**
 * ethAmount: The amount of eth sent with the execution of a swap.
 * takerAddress: The address to perform the buy. Defaults to the first available address from the provider.
 * gasLimit: The amount of gas to send with a transaction (in Gwei). Defaults to an eth_estimateGas rpc call.
 */
export interface SwapQuoteExecutionOpts extends SwapQuoteGetOutputOpts {
    ethAmount?: BigNumber;
    takerAddress?: string;
    gasLimit?: number;
}

export enum AffiliateFeeType {
    None,
    PercentageFee,
    PositiveSlippageFee,
    GaslessFee,
}

export interface AffiliateFeeAmount {
    feeType: AffiliateFeeType;
    recipient: string;
    buyTokenFeeAmount: BigNumber;
    sellTokenFeeAmount: BigNumber;
}

/**
 * Automatically resolved protocol fee refund receiver addresses.
 */
export enum ExchangeProxyRefundReceiver {
    // Refund to the taker address.
    Taker = '0x0000000000000000000000000000000000000001',
    // Refund to the sender address.
    Sender = '0x0000000000000000000000000000000000000002',
}

/**
 * @param isFromETH Whether the input token is ETH.
 * @param isToETH Whether the output token is ETH.
 * @param affiliateFee Fee denominated in taker or maker asset to send to specified recipient.
 * @param refundReceiver The receiver of unspent protocol fees.
 *        May be a valid address or one of:
 *        `address(0)`: Stay in flash wallet.
 *        `address(1)`: Send to the taker.
 *        `address(2)`: Send to the sender (caller of `transformERC20()`).
 * @param shouldSellEntireBalance Whether the entire balance of the caller should be sold. Used
 *        for contracts where the balance at transaction time is different to the quote amount.
 *        This foregos certain VIP routes which do not support this feature.
 */
export interface ExchangeProxyContractOpts {
    isFromETH: boolean;
    isToETH: boolean;
    affiliateFee: AffiliateFeeAmount;
    refundReceiver: string | ExchangeProxyRefundReceiver;
    isMetaTransaction: boolean;
    shouldSellEntireBalance: boolean;
}

export interface GetExtensionContractTypeOpts {
    takerAddress?: string;
    ethAmount?: BigNumber;
}

/**
 * takerToken: Address of the taker asset.
 * makerToken: Address of the maker asset.
 * gasPrice: gas price used to determine protocolFee amount, default to ethGasStation fast amount.
 * orders: An array of objects conforming to OptimizedMarketOrder. These orders can be used to cover the requested assetBuyAmount plus slippage.
 * bestCaseQuoteInfo: Info about the best case price for the asset.
 * worstCaseQuoteInfo: Info about the worst case price for the asset.
 */
export interface SwapQuoteBase {
    takerToken: string;
    makerToken: string;
    gasPrice: BigNumber;
    orders: OptimizedMarketOrder[];
    bestCaseQuoteInfo: SwapQuoteInfo;
    worstCaseQuoteInfo: SwapQuoteInfo;
    sourceBreakdown: SwapQuoteOrdersBreakdown;
    quoteReport?: QuoteReport;
    extendedQuoteReportSources?: ExtendedQuoteReportSources;
    priceComparisonsReport?: PriceComparisonsReport;
    isTwoHop: boolean;
    makerTokenDecimals: number;
    takerTokenDecimals: number;
    takerAmountPerEth: BigNumber;
    makerAmountPerEth: BigNumber;
    blockNumber: number;
}

/**
 * takerAssetFillAmount: The amount of takerAsset sold for makerAsset.
 * type: Specified MarketOperation the SwapQuote is provided for
 */
export interface MarketSellSwapQuote extends SwapQuoteBase {
    takerTokenFillAmount: BigNumber;
    type: MarketOperation.Sell;
}

/**
 * makerAssetFillAmount: The amount of makerAsset bought with takerAsset.
 * type: Specified MarketOperation the SwapQuote is provided for
 */
export interface MarketBuySwapQuote extends SwapQuoteBase {
    makerTokenFillAmount: BigNumber;
    type: MarketOperation.Buy;
}

export type SwapQuote = MarketBuySwapQuote | MarketSellSwapQuote;

/**
 * feeTakerTokenAmount: The amount of takerAsset reserved for paying takerFees when swapping for desired assets.
 * takerTokenAmount: The amount of takerAsset swapped for desired makerAsset.
 * totalTakerTokenAmount: The total amount of takerAsset required to complete the swap (filling orders, and paying takerFees).
 * makerTokenAmount: The amount of makerAsset that will be acquired through the swap.
 * protocolFeeInWeiAmount: The amount of ETH to pay (in WEI) as protocol fee to perform the swap for desired asset.
 * gas: Amount of estimated gas needed to fill the quote.
 * slippage: Amount of slippage to allow for.
 */
export interface SwapQuoteInfo {
    feeTakerTokenAmount: BigNumber;
    takerAmount: BigNumber;
    totalTakerAmount: BigNumber;
    makerAmount: BigNumber;
    protocolFeeInWeiAmount: BigNumber;
    gas: number;
    slippage: number;
}

/**
 * percentage breakdown of each liquidity source used in quote
 */
export type SwapQuoteOrdersBreakdown = Partial<
    { [key in Exclude<ERC20BridgeSource, typeof ERC20BridgeSource.MultiHop>]: BigNumber } & {
        [ERC20BridgeSource.MultiHop]: {
            proportion: BigNumber;
            intermediateToken: string;
            hops: ERC20BridgeSource[];
        };
    }
>;

/**
 * nativeExclusivelyRFQ: if set to `true`, Swap quote will exclude Open Orderbook liquidity.
 *                       If set to `true` and `ERC20BridgeSource.Native` is part of the `excludedSources`
 *                       array in `SwapQuoteRequestOpts`, an Error will be raised.
 */

export interface RfqmRequestOptions extends RfqRequestOpts {
    isLastLook: true;
    fee: Fee;
}

export interface RfqRequestOpts {
    takerAddress: string;
    txOrigin: string;
    integrator: Integrator;
    intentOnFilling: boolean;
    isIndicative?: boolean;
    makerEndpointMaxResponseTimeMs?: number;
    nativeExclusivelyRFQ?: boolean;
    altRfqAssetOfferings?: AltRfqMakerAssetOfferings;
    isLastLook?: boolean;
    fee?: Fee;
}

/**
 * gasPrice: gas price to determine protocolFee amount, default to ethGasStation fast amount
 */
export interface SwapQuoteRequestOpts extends Omit<GetMarketOrdersOpts, 'gasPrice'> {
    gasPrice?: BigNumber;
    rfqt?: RfqRequestOpts;
}

/**
 * A mapping from RFQ-T/M quote provider URLs to the trading pairs they support.
 * The value type represents an array of supported asset pairs, with each array element encoded as a 2-element array of token addresses.
 */
export interface RfqMakerAssetOfferings {
    [endpoint: string]: [string, string][];
}
export interface AltOffering {
    id: string;
    baseAsset: string;
    quoteAsset: string;
    baseAssetDecimals: number;
    quoteAssetDecimals: number;
}
export interface AltRfqMakerAssetOfferings {
    [endpoint: string]: AltOffering[];
}
export enum RfqPairType {
    Standard = 'standard',
    Alt = 'alt',
}
export interface TypedMakerUrl {
    url: string;
    pairType: RfqPairType;
}

export type LogFunction = (obj: object, msg?: string, ...args: any[]) => void;

export interface RfqFirmQuoteValidator {
    getRfqtTakerFillableAmountsAsync(quotes: RfqOrder[]): Promise<BigNumber[]>;
}

export interface Integrator {
    integratorId: string;
    label: string;
    whitelistIntegratorUrls?: string[];
}

export interface SwapQuoterRfqOpts {
    integratorsWhitelist: Integrator[];
    txOriginBlacklist: Set<string>;
    altRfqCreds?: {
        altRfqApiKey: string;
        altRfqProfile: string;
    };
    warningLogger?: LogFunction;
}

export type AssetSwapperContractAddresses = ContractAddresses;

/**
 * chainId: The ethereum chain id. Defaults to 1 (mainnet).
 * orderRefreshIntervalMs: The interval in ms that getBuyQuoteAsync should trigger an refresh of orders and order states. Defaults to 10000ms (10s).
 * expiryBufferMs: The number of seconds to add when calculating whether an order is expired or not. Defaults to 300s (5m).
 * contractAddresses: Optionally override the contract addresses used for the chain
 * samplerGasLimit: The gas limit used when querying the sampler contract. Defaults to 36e6
 */
export interface SwapQuoterOpts extends OrderPrunerOpts {
    chainId: ChainId;
    orderRefreshIntervalMs: number;
    expiryBufferMs: number;
    ethereumRpcUrl?: string;
    contractAddresses?: AssetSwapperContractAddresses;
    samplerGasLimit?: number;
    multiBridgeAddress?: string;
    zeroExGasApiUrl?: string;
    rfqt?: SwapQuoterRfqOpts;
    samplerOverrides?: SamplerOverrides;
    tokenAdjacencyGraph?: TokenAdjacencyGraph;
    liquidityProviderRegistry?: LiquidityProviderRegistry;
}

/**
 * Possible error messages thrown by an SwapQuoterConsumer instance or associated static methods.
 */
export enum SwapQuoteConsumerError {
    InvalidMarketSellOrMarketBuySwapQuote = 'INVALID_MARKET_BUY_SELL_SWAP_QUOTE',
    InvalidForwarderSwapQuote = 'INVALID_FORWARDER_SWAP_QUOTE_PROVIDED',
    NoAddressAvailable = 'NO_ADDRESS_AVAILABLE',
    SignatureRequestDenied = 'SIGNATURE_REQUEST_DENIED',
    TransactionValueTooLow = 'TRANSACTION_VALUE_TOO_LOW',
}

/**
 * Possible error messages thrown by an SwapQuoter instance or associated static methods.
 */
export enum SwapQuoterError {
    NoEtherTokenContractFound = 'NO_ETHER_TOKEN_CONTRACT_FOUND',
    StandardRelayerApiError = 'STANDARD_RELAYER_API_ERROR',
    InsufficientAssetLiquidity = 'INSUFFICIENT_ASSET_LIQUIDITY',
    AssetUnavailable = 'ASSET_UNAVAILABLE',
    NoGasPriceProvidedOrEstimated = 'NO_GAS_PRICE_PROVIDED_OR_ESTIMATED',
    AssetDataUnsupported = 'ASSET_DATA_UNSUPPORTED',
}

/**
 * Represents two main market operations supported by asset-swapper.
 */
export enum MarketOperation {
    Sell = 'Sell',
    Buy = 'Buy',
}

/**
 * Represents varying order takerFee types that can be pruned for by OrderPruner.
 */
export enum OrderPrunerPermittedFeeTypes {
    NoFees = 'NO_FEES',
    TakerDenominatedTakerFee = 'TAKER_DENOMINATED_TAKER_FEE',
}

/**
 * Represents a mocked RFQ-T/M maker responses.
 */
export interface MockedRfqQuoteResponse {
    endpoint: string;
    requestApiKey: string;
    requestParams: TakerRequestQueryParamsUnnested;
    responseData: any;
    responseCode: number;
    callback?: (config: any) => Promise<any>;
}

/**
 * Represents a mocked RFQ-T/M alternative maker responses.
 */
export interface AltMockedRfqQuoteResponse {
    endpoint: string;
    mmApiKey: string;
    requestData: AltQuoteRequestData;
    responseData: any;
    responseCode: number;
}

export interface SamplerOverrides {
    overrides: GethCallOverrides;
    block: BlockParam;
    to?: string;
}

export interface SamplerCallResult {
    success: boolean;
    data: string;
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export enum AltQuoteModel {
    Firm = 'firm',
    Indicative = 'indicative',
}

export enum AltQuoteSide {
    Buy = 'buy',
    Sell = 'sell',
}

export interface AltQuoteRequestData {
    market: string;
    model: AltQuoteModel;
    profile: string;
    side: AltQuoteSide;
    value?: string;
    amount?: string;
    meta: {
        txOrigin: string;
        taker: string;
        client: string;
        existingOrder?: {
            price: string;
            value?: string;
            amount?: string;
        };
    };
}

export interface AltBaseRfqResponse extends AltQuoteRequestData {
    id: string;
    price?: string;
}

export interface AltIndicativeQuoteResponse extends AltBaseRfqResponse {
    model: AltQuoteModel.Indicative;
    status: 'live' | 'rejected';
}

export interface AltFirmQuoteResponse extends AltBaseRfqResponse {
    model: AltQuoteModel.Firm;
    data: {
        '0xv4order': V4SignedRfqOrder;
    };
    status: 'active' | 'rejected';
}

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

export interface RfqClientV1PriceRequest {
    altRfqAssetOfferings: AltRfqMakerAssetOfferings | undefined;
    assetFillAmount: BigNumber;
    chainId: number;
    comparisonPrice: BigNumber | undefined;
    integratorId: string;
    intentOnFilling: boolean;
    makerToken: string;
    marketOperation: 'Sell' | 'Buy';
    takerAddress: string;
    takerToken: string;
    txOrigin: string;
}

export type RfqClientV1QuoteRequest = RfqClientV1PriceRequest;

export interface RfqClientV1Price {
    expiry: BigNumber;
    kind: 'rfq' | 'otc';
    makerAmount: BigNumber;
    makerToken: string;
    makerUri: string;
    takerAmount: BigNumber;
    takerToken: string;
}

export interface RfqClientV1PriceResponse {
    prices: RfqClientV1Price[];
}

export interface RfqClientV1Quote {
    makerUri: string;
    order: RfqOrder;
    signature: Signature;
}

export interface RfqClientV1QuoteResponse {
    quotes: RfqClientV1Quote[];
}
