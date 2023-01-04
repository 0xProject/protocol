import { ChainId } from '@0x/contract-addresses';
import { BlockParam, ContractAddresses, GethCallOverrides } from '@0x/contract-wrappers';
import {
    FillQuoteTransformerOrderType,
    LimitOrderFields,
    OtcOrderFields,
    RfqOrder,
    RfqOrderFields,
    Signature,
} from '@0x/protocol-utils';
import { TakerRequestQueryParamsUnnested } from '@0x/quote-server';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import {
    FillQuoteTransformerRfqOrderInfo,
    FillQuoteTransformerLimitOrderInfo,
    FillQuoteTransformerOtcOrderInfo,
} from '@0x/protocol-utils';
import { RfqClient } from '../utils/rfq_client';
import { QuoteRequestor } from './utils/quote_requestor';
import { TokenAdjacencyGraph } from './utils/token_adjacency_graph';

export interface QuoteReport {
    sourcesConsidered: QuoteReportEntry[];
    sourcesDelivered: QuoteReportEntry[];
}

export interface PriceComparisonsReport {
    dexSources: BridgeQuoteReportEntry[];
    multiHopSources: MultiHopQuoteReportEntry[];
    nativeSources: (NativeLimitOrderQuoteReportEntry | NativeRfqOrderQuoteReportEntry)[];
}

export interface IndicativeRfqOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillableTakerAmount: BigNumber;
    isRFQ: true;
    makerUri?: string;
    comparisonPrice?: number;
}

export interface NativeRfqOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillData: NativeFillData;
    fillableTakerAmount: BigNumber;
    isRFQ: true;
    nativeOrder: RfqOrderFields;
    makerUri: string;
    comparisonPrice?: number;
}

export interface NativeLimitOrderQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.Native;
    fillData: NativeFillData;
    fillableTakerAmount: BigNumber;
    isRFQ: false;
}

export interface MultiHopQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource.MultiHop;
    hopSources: ERC20BridgeSource[];
}

interface QuoteReportEntryBase {
    liquiditySource: ERC20BridgeSource;
    makerAmount: BigNumber;
    takerAmount: BigNumber;
    fillData: FillData;
}

export interface BridgeQuoteReportEntry extends QuoteReportEntryBase {
    liquiditySource: Exclude<ERC20BridgeSource, ERC20BridgeSource.Native>;
}

export type QuoteReportEntry =
    | BridgeQuoteReportEntry
    | MultiHopQuoteReportEntry
    | NativeLimitOrderQuoteReportEntry
    | NativeRfqOrderQuoteReportEntry;

export type ExtendedQuoteReportEntry =
    | BridgeQuoteReportEntry
    | MultiHopQuoteReportEntry
    | NativeLimitOrderQuoteReportEntry
    | NativeRfqOrderQuoteReportEntry
    | IndicativeRfqOrderQuoteReportEntry;

export type ExtendedQuoteReportIndexedEntry = ExtendedQuoteReportEntry & {
    quoteEntryIndex: number;
    isDelivered: boolean;
};

export interface ExtendedQuoteReportSources {
    sourcesConsidered: ExtendedQuoteReportIndexedEntry[];
    sourcesDelivered: ExtendedQuoteReportIndexedEntry[] | undefined;
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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
enum ExchangeProxyRefundReceiver {
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

export interface IPath {
    hasTwoHop(): boolean;
    createOrders(): OptimizedOrder[];
    createSlippedOrders(maxSlippage: number): OptimizedOrder[];
}

/**
 * takerToken: Address of the taker asset.
 * makerToken: Address of the maker asset.
 * gasPrice: gas price used to determine protocolFee amount, default to ethGasStation fast amount.
 * orders: An array of objects conforming to OptimizedMarketOrder. These orders can be used to cover the requested assetBuyAmount plus slippage.
 * bestCaseQuoteInfo: Info about the best case price for the asset.
 * worstCaseQuoteInfo: Info about the worst case price for the asset.
 */
interface SwapQuoteBase {
    takerToken: string;
    makerToken: string;
    gasPrice: BigNumber;
    // TODO(kyu-c): replace its usage with `path.createOrders`.
    orders: OptimizedOrder[];
    path: IPath;
    bestCaseQuoteInfo: SwapQuoteInfo;
    worstCaseQuoteInfo: SwapQuoteInfo;
    sourceBreakdown: SwapQuoteOrdersBreakdown;
    quoteReport?: QuoteReport;
    extendedQuoteReportSources?: ExtendedQuoteReportSources;
    priceComparisonsReport?: PriceComparisonsReport;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
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

// `FillData` for native fills. Represents a single native order
export type NativeRfqOrderFillData = FillQuoteTransformerRfqOrderInfo;
export type NativeLimitOrderFillData = FillQuoteTransformerLimitOrderInfo;
export type NativeOtcOrderFillData = FillQuoteTransformerOtcOrderInfo;
export type NativeFillData = NativeRfqOrderFillData | NativeLimitOrderFillData | NativeOtcOrderFillData;

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
    zeroExGasApiUrl?: string;
    rfqt?: SwapQuoterRfqOpts;
    samplerOverrides?: SamplerOverrides;
    tokenAdjacencyGraph?: TokenAdjacencyGraph;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
    responseData: any;
    responseCode: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
    callback?: (config: any) => Promise<any>;
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

/**
 * DEX sources to aggregate.
 */
export enum ERC20BridgeSource {
    Native = 'Native',
    Uniswap = 'Uniswap',
    UniswapV2 = 'Uniswap_V2',
    Curve = 'Curve',
    Balancer = 'Balancer',
    BalancerV2 = 'Balancer_V2',
    Bancor = 'Bancor',
    MakerPsm = 'MakerPsm',
    MStable = 'mStable',
    Mooniswap = 'Mooniswap',
    MultiHop = 'MultiHop',
    Shell = 'Shell',
    SushiSwap = 'SushiSwap',
    Dodo = 'DODO',
    DodoV2 = 'DODO_V2',
    CryptoCom = 'CryptoCom',
    KyberDmm = 'KyberDMM',
    Component = 'Component',
    Saddle = 'Saddle',
    UniswapV3 = 'Uniswap_V3',
    CurveV2 = 'Curve_V2',
    Lido = 'Lido',
    ShibaSwap = 'ShibaSwap',
    AaveV2 = 'Aave_V2',
    AaveV3 = 'Aave_V3',
    Compound = 'Compound',
    Synapse = 'Synapse',
    BancorV3 = 'BancorV3',
    Synthetix = 'Synthetix',
    WOOFi = 'WOOFi',
    // BSC only
    PancakeSwap = 'PancakeSwap',
    PancakeSwapV2 = 'PancakeSwap_V2',
    BiSwap = 'BiSwap',
    MDex = 'MDex',
    KnightSwap = 'KnightSwap',
    BakerySwap = 'BakerySwap',
    Nerve = 'Nerve',
    Belt = 'Belt',
    Ellipsis = 'Ellipsis',
    ApeSwap = 'ApeSwap',
    ACryptos = 'ACryptoS',
    // Polygon only
    QuickSwap = 'QuickSwap',
    Dfyn = 'Dfyn',
    WaultSwap = 'WaultSwap',
    FirebirdOneSwap = 'FirebirdOneSwap',
    IronSwap = 'IronSwap',
    MeshSwap = 'MeshSwap',
    Dystopia = 'Dystopia',
    // Avalanche
    Pangolin = 'Pangolin',
    TraderJoe = 'TraderJoe',
    Platypus = 'Platypus',
    GMX = 'GMX',
    // Celo only
    UbeSwap = 'UbeSwap',
    MobiusMoney = 'MobiusMoney',
    // Fantom
    SpiritSwap = 'SpiritSwap',
    SpookySwap = 'SpookySwap',
    Beethovenx = 'Beethovenx',
    MorpheusSwap = 'MorpheusSwap',
    Yoshi = 'Yoshi',
    // Optimism
    Velodrome = 'Velodrome',
}

// Internal `fillData` field for `Fill` objects.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FillData {}

export type FeeEstimate = (fillData: FillData) => { gas: number; fee: BigNumber };
export type FeeSchedule = Record<ERC20BridgeSource, FeeEstimate>;

type GasEstimate = (fillData: FillData) => number;
export type GasSchedule = Record<ERC20BridgeSource, GasEstimate>;

export interface FillBase {
    // Input fill amount (taker asset amount in a sell, maker asset amount in a buy).
    input: BigNumber;
    // Output fill amount (maker asset amount in a sell, taker asset amount in a buy).
    output: BigNumber;
    // The output fill amount, adjusted by fees.
    adjustedOutput: BigNumber;
    // The expected gas cost of this fill
    gas: number;
}

/**
 * Represents a node on a fill path.
 */
export interface Fill<TFillData extends FillData = FillData> extends FillBase {
    // basic data for every fill
    source: ERC20BridgeSource;
    // TODO jacob people seem to agree  that orderType here is more readable
    type: FillQuoteTransformerOrderType; // should correspond with TFillData
    fillData: TFillData;
    // Unique ID of the original source path this fill belongs to.
    // This is generated when the path is generated and is useful to distinguish
    // paths that have the same `source` IDs but are distinct (e.g., Curves).
    sourcePathId: string;
    // See `SOURCE_FLAGS`.
    flags: bigint;
}

export type ExchangeProxyOverhead = (sourceFlags: bigint) => BigNumber;

export interface FillAdjustor {
    adjustFills: (side: MarketOperation, fills: Fill[]) => Fill[];
}

export interface GetMarketOrdersRfqOpts extends RfqRequestOpts {
    rfqClient?: RfqClient;
    quoteRequestor?: QuoteRequestor;
    firmQuoteValidator?: RfqFirmQuoteValidator;
}

/**
 * Options for `getMarketSellOrdersAsync()` and `getMarketBuyOrdersAsync()`.
 */
export interface GetMarketOrdersOpts {
    /**
     * Liquidity sources to exclude. Default is none.
     */
    excludedSources: ERC20BridgeSource[];
    /**
     * Liquidity sources to include. Default is none, which allows all supported
     * sources that aren't excluded by `excludedSources`.
     */
    includedSources: ERC20BridgeSource[];
    /**
     * When generating bridge orders, we use
     * sampled rate * (1 - bridgeSlippage)
     * as the rate for calculating maker/taker asset amounts.
     * This should be a small positive number (e.g., 0.0005) to make up for
     * small discrepancies between samples and truth.
     * Default is 0.0005 (5 basis points).
     */
    bridgeSlippage: number;
    /**
     * The maximum price slippage allowed in the fallback quote. If the slippage
     * between the optimal quote and the fallback quote is greater than this
     * percentage, no fallback quote will be provided.
     */
    maxFallbackSlippage: number;
    /**
     * Number of samples to take for each DEX quote.
     */
    numSamples: number;
    /**
     * The exponential sampling distribution base.
     * A value of 1 will result in evenly spaced samples.
     * > 1 will result in more samples at lower sizes.
     * < 1 will result in more samples at higher sizes.
     * Default: 1
     */
    sampleDistributionBase: number;
    /**
     * Number of samples to use when creating fill curves with neon-router
     */
    neonRouterNumSamples: number;
    /**
     * Fees for each liquidity source, expressed in gas.
     */
    feeSchedule: FeeSchedule;
    /**
     * Exchange proxy gas overhead based on source flag.
     */
    exchangeProxyOverhead: ExchangeProxyOverhead;
    /**
     * Whether to pad the quote with a redundant fallback quote using different
     * sources. Defaults to `true`.
     */
    allowFallback: boolean;
    /**
     * Options for RFQT such as takerAddress, intent on filling
     */
    rfqt?: GetMarketOrdersRfqOpts;
    /**
     * Whether to generate a quote report
     */
    shouldGenerateQuoteReport: boolean;

    /**
     * Whether to include price comparison data in the quote
     */
    shouldIncludePriceComparisonsReport: boolean;
    /**
     * Token addresses with a list of adjacent intermediary tokens to consider
     * hopping to. E.g DAI->USDC via an adjacent token WETH
     */
    tokenAdjacencyGraph: TokenAdjacencyGraph;

    /**
     * Gas price to use for quote
     */
    gasPrice: BigNumber;

    /**
     * Adjusts fills individual fills based on caller supplied criteria
     */
    fillAdjustor: FillAdjustor;

    /**
     * Which endpoint was called
     */
    endpoint: 'price' | 'quote';
}

interface OptimizedMarketOrderBase<TFillData extends FillData = FillData> {
    source: ERC20BridgeSource;
    fillData: TFillData;
    type: FillQuoteTransformerOrderType; // should correspond with TFillData
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber; // The amount we wish to buy from this order, e.g inclusive of any previous partial fill
    takerAmount: BigNumber; // The amount we wish to fill this for, e.g inclusive of any previous partial fill
    fill: FillBase;
}

export interface OptimizedMarketBridgeOrder<TFillData extends FillData = FillData>
    extends OptimizedMarketOrderBase<TFillData> {
    type: FillQuoteTransformerOrderType.Bridge;
}

export interface OptimizedLimitOrder extends OptimizedMarketOrderBase<NativeLimitOrderFillData> {
    type: FillQuoteTransformerOrderType.Limit;
}

export interface OptimizedRfqOrder extends OptimizedMarketOrderBase<NativeRfqOrderFillData> {
    type: FillQuoteTransformerOrderType.Rfq;
}

export interface OptimizedOtcOrder extends OptimizedMarketOrderBase<NativeOtcOrderFillData> {
    type: FillQuoteTransformerOrderType.Otc;
}

export type OptimizedNativeOrder = OptimizedLimitOrder | OptimizedRfqOrder | OptimizedOtcOrder;

export type OptimizedOrder = OptimizedMarketBridgeOrder<FillData> | OptimizedNativeOrder;

// TODO: `SignedNativeOrder` should be `SignedLimitOrder`.
export abstract class Orderbook {
    public abstract getOrdersAsync(
        makerToken: string,
        takerToken: string,
        pruneFn?: (o: SignedNativeOrder) => boolean,
    ): Promise<SignedNativeOrder[]>;
    public abstract getBatchOrdersAsync(
        makerTokens: string[],
        takerToken: string,
        pruneFn?: (o: SignedNativeOrder) => boolean,
    ): Promise<SignedNativeOrder[][]>;
    public async destroyAsync(): Promise<void> {
        return;
    }
}
