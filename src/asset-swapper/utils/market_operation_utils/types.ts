import { ChainId } from '@0x/contract-addresses';
import {
    FillQuoteTransformerLimitOrderInfo,
    FillQuoteTransformerOrderType,
    FillQuoteTransformerRfqOrderInfo,
    FillQuoteTransformerOtcOrderInfo,
} from '@0x/protocol-utils';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { RfqClient } from '../../../utils/rfq_client';

import { NativeOrderWithFillableAmounts, RfqFirmQuoteValidator, RfqRequestOpts } from '../../types';
import { QuoteRequestor, V4RFQIndicativeQuoteMM } from '../../utils/quote_requestor';
import { ExtendedQuoteReportSources, PriceComparisonsReport, QuoteReport } from '../quote_report_generator';
import { TokenAdjacencyGraph } from '../token_adjacency_graph';

import { SourceFilters } from './source_filters';

/**
 * Common exception messages thrown by aggregation logic.
 */
export enum AggregationError {
    NoOptimalPath = 'NO_OPTIMAL_PATH',
    EmptyOrders = 'EMPTY_ORDERS',
    NotERC20AssetData = 'NOT_ERC20ASSET_DATA',
    NoBridgeForSource = 'NO_BRIDGE_FOR_SOURCE',
}

/**
 * DEX sources to aggregate.
 */
export enum ERC20BridgeSource {
    Native = 'Native',
    Uniswap = 'Uniswap',
    UniswapV2 = 'Uniswap_V2',
    Curve = 'Curve',
    LiquidityProvider = 'LiquidityProvider',
    MultiBridge = 'MultiBridge',
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

/**
 * Curve contract function selectors.
 */
export enum CurveFunctionSelectors {
    None = '0x00000000',
    exchange = '0x3df02124',
    exchange_underlying = '0xa6417ed6', // exchange_underlying(int128 i, int128 j, uint256 dx, uint256 min_dy)
    get_dy_underlying = '0x07211ef7',
    get_dx_underlying = '0x0e71d1b9',
    get_dy = '0x5e0d443f', // get_dy(int128,int128,uint256)
    get_dx = '0x67df02ca',
    get_dy_uint256 = '0x556d6e9f', // get_dy(uint256,uint256,uint256)
    exchange_underlying_uint256 = '0x65b2489b', // exchange_underlying(uint256,uint256,uint256,uint256)
    // Curve V2
    exchange_v2 = '0x5b41b908',
    exchange_underlying_v2 = '0x65b2489b',
    get_dy_v2 = '0x556d6e9f',
    get_dy_underlying_v2 = '0x85f11d1e',
    // Smoothy(deprecated)
    swap_uint256 = '0x5673b02d', // swap(uint256,uint256,uint256,uint256)
    get_swap_amount = '0x45cf2ef6', // getSwapAmount(uint256,uint256,uint256)
    // Nerve BSC, Saddle Mainnet, Synapse
    swap = '0x91695586', // swap(uint8,uint8,uint256,uint256,uint256)
    calculateSwap = '0xa95b089f', // calculateSwap(uint8,uint8,uint256)
    calculateSwapUnderlying = '0x75d8e3e4', // calculateSwapUnderlying(uint8,uint8,uint256)
    swapUnderlying = '0x78e0fae8', // swapUnderlying(uint8,uint8,uint256,uint256,uint256)
}

/**
 * Configuration info on a Curve pool.
 */
export interface CurveInfo {
    exchangeFunctionSelector: CurveFunctionSelectors;
    sellQuoteFunctionSelector: CurveFunctionSelectors;
    buyQuoteFunctionSelector: CurveFunctionSelectors;
    poolAddress: string;
    tokens: string[];
    metaTokens: string[] | undefined;
    gasSchedule: number;
}

/**
 * Configuration for a specific PSM vault
 */
export interface PsmInfo {
    psmAddress: string;
    ilkIdentifier: string;
    gemTokenAddress: string;
}

/**
 * Configuration for a Lido deployment
 */
export interface LidoInfo {
    stEthToken: string;
    wethToken: string;
    wstEthToken: string;
}

/**
 * Configuration info for a Balancer V2 pool.
 */
export interface BalancerV2PoolInfo {
    poolId: string;
    vault: string;
}

export interface AaveV2Info {
    lendingPool: string;
    aToken: string;
    underlyingToken: string;
}

// Internal `fillData` field for `Fill` objects.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FillData {}

// `FillData` for native fills. Represents a single native order
export type NativeRfqOrderFillData = FillQuoteTransformerRfqOrderInfo;
export type NativeLimitOrderFillData = FillQuoteTransformerLimitOrderInfo;
export type NativeOtcOrderFillData = FillQuoteTransformerOtcOrderInfo;
export type NativeFillData = NativeRfqOrderFillData | NativeLimitOrderFillData | NativeOtcOrderFillData;

// Represents an individual DEX sample from the sampler contract
export interface DexSample<TFillData extends FillData = FillData> {
    source: ERC20BridgeSource;
    fillData: TFillData;
    input: BigNumber;
    output: BigNumber;
}
export interface CurveFillData extends FillData {
    fromTokenIdx: number;
    toTokenIdx: number;
    pool: CurveInfo;
}

export interface BalancerBatchSwapStep {
    poolId: string;
    assetInIndex: number;
    assetOutIndex: number;
    amount: BigNumber;
    userData: string;
}

export interface BalancerSwaps {
    swapInfoExactIn: BalancerSwapInfo[];
    swapInfoExactOut: BalancerSwapInfo[];
}
export interface BalancerSwapInfo {
    assets: string[];
    swapSteps: BalancerBatchSwapStep[];
}

export interface BalancerFillData extends FillData {
    poolAddress: string;
}

export interface BalancerV2FillData extends FillData {
    vault: string;
    poolId: string;
}

export interface BalancerV2BatchSwapFillData extends FillData {
    vault: string;
    swapSteps: BalancerBatchSwapStep[];
    assets: string[];
}

export interface UniswapV2FillData extends FillData {
    tokenAddressPath: string[];
    router: string;
}

export interface ShellFillData extends FillData {
    poolAddress: string;
}

export interface LiquidityProviderFillData extends FillData {
    poolAddress: string;
    gasCost: number;
}

export interface BancorFillData extends FillData {
    path: string[];
    networkAddress: string;
}

export interface MooniswapFillData extends FillData {
    poolAddress: string;
}

export interface DODOFillData extends FillData {
    poolAddress: string;
    isSellBase: boolean;
    helperAddress: string;
}

export interface GenericRouterFillData extends FillData {
    router: string;
}

export interface MultiHopFillData extends FillData {
    firstHopSource: SourceQuoteOperation;
    secondHopSource: SourceQuoteOperation;
    intermediateToken: string;
}

export interface MakerPsmExtendedData {
    isSellOperation: boolean;
    takerToken: string;
}

export type MakerPsmFillData = FillData & MakerPsmExtendedData & PsmInfo;

export interface HopInfo {
    sourceIndex: BigNumber;
    returnData: string;
}

export interface UniswapV3PathAmount {
    uniswapPath: string;
    inputAmount: BigNumber;
    gasUsed: number;
}
export interface UniswapV3FillData extends FillData {
    tokenAddressPath: string[];
    router: string;
    pathAmounts: UniswapV3PathAmount[];
    // Only needed for gas estimation.
}

export interface KyberDmmFillData extends UniswapV2FillData {
    poolsPath: string[];
}

/**
 * Determines whether FillData is UniswapV3FillData or FinalUniswapV3FillData
 */
export function isFinalUniswapV3FillData(
    data: UniswapV3FillData | FinalUniswapV3FillData,
): data is FinalUniswapV3FillData {
    return !!(data as FinalUniswapV3FillData).uniswapPath;
}

export interface FinalUniswapV3FillData extends Omit<UniswapV3FillData, 'pathAmounts'> {
    // The uniswap-encoded path that can fll the maximum input amount.
    uniswapPath: string;
    gasUsed: number;
}

export interface LidoFillData extends FillData {
    stEthTokenAddress: string;
    wstEthTokenAddress: string;
    takerToken: string;
    makerToken: string;
}

export interface AaveV2FillData extends FillData {
    lendingPool: string;
    aToken: string;
    underlyingToken: string;
    takerToken: string;
}

export interface CompoundFillData extends FillData {
    cToken: string;
    takerToken: string;
    makerToken: string;
}

export interface PlatypusInfo {
    poolAddress: string;
    tokens: string[];
    gasSchedule: number;
}

export interface GMXFillData extends FillData {
    router: string;
    reader: string;
    vault: string;
    tokenAddressPath: string[];
}

export interface PlatypusFillData extends FillData {
    router: string;
    pool: string[];
    tokenAddressPath: string[];
}

export interface WOOFiFillData extends FillData {
    poolAddress: string;
    takerToken: string;
    makerToken: string;
    // Only needed for gas estimation
    chainId: ChainId;
}

export interface VelodromeFillData extends FillData {
    router: string;
    stable: boolean;
}

export interface SynthetixFillData extends FillData {
    synthetix: string;
    takerTokenSymbolBytes32: string;
    makerTokenSymbolBytes32: string;
    // Only needed for gas estimation.
    chainId: ChainId;
}

/**
 * Represents a node on a fill path.
 */
export interface Fill<TFillData extends FillData = FillData> {
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
    // Input fill amount (taker asset amount in a sell, maker asset amount in a buy).
    input: BigNumber;
    // Output fill amount (maker asset amount in a sell, taker asset amount in a buy).
    output: BigNumber;
    // The output fill amount, adjusted by fees.
    adjustedOutput: BigNumber;
    // The expected gas cost of this fill
    gas: number;
}

export interface OptimizedMarketOrderBase<TFillData extends FillData = FillData> {
    source: ERC20BridgeSource;
    fillData: TFillData;
    type: FillQuoteTransformerOrderType; // should correspond with TFillData
    makerToken: string;
    takerToken: string;
    makerAmount: BigNumber; // The amount we wish to buy from this order, e.g inclusive of any previous partial fill
    takerAmount: BigNumber; // The amount we wish to fill this for, e.g inclusive of any previous partial fill
    fill: Omit<Fill, 'flags' | 'fillData' | 'sourcePathId' | 'source' | 'type'>; // Remove duplicates which have been brought into the OrderBase interface
}

export interface OptimizedMarketBridgeOrder<TFillData extends FillData = FillData>
    extends OptimizedMarketOrderBase<TFillData> {
    type: FillQuoteTransformerOrderType.Bridge;
    sourcePathId: string;
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

/**
 * Optimized orders to fill.
 */
export type OptimizedMarketOrder =
    | OptimizedMarketBridgeOrder<FillData>
    | OptimizedMarketOrderBase<NativeLimitOrderFillData>
    | OptimizedMarketOrderBase<NativeRfqOrderFillData>
    | OptimizedMarketOrderBase<NativeOtcOrderFillData>;

export interface GetMarketOrdersRfqOpts extends RfqRequestOpts {
    rfqClient?: RfqClient;
    quoteRequestor?: QuoteRequestor;
    firmQuoteValidator?: RfqFirmQuoteValidator;
}

export type FeeEstimate = (fillData: FillData) => { gas: number; fee: BigNumber };
// TODO:  Remove `Partial` from `FeeSchedule`
export type FeeSchedule = Partial<{ [key in ERC20BridgeSource]: FeeEstimate }>;

export type GasEstimate = (fillData: FillData) => number;
export type GasSchedule = Partial<{ [key in ERC20BridgeSource]: GasEstimate }>;

export type ExchangeProxyOverhead = (sourceFlags: bigint) => BigNumber;

/**
 * Options for `getMarketSellOrdersAsync()` and `getMarketBuyOrdersAsync()`.
 */
export interface GetMarketOrdersOpts {
    /**
     * Liquidity sources to exclude. Default is none.
     */
    excludedSources: ERC20BridgeSource[];
    /**
     * Liquidity sources to exclude when used to calculate the cost of the route.
     * Default is none.
     */
    excludedFeeSources: ERC20BridgeSource[];
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
     * Estimated gas consumed by each liquidity source.
     */
    gasSchedule: GasSchedule;
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
}

/**
 * A composable operation the be run in `DexOrderSampler.executeAsync()`.
 */
export interface BatchedOperation<TResult> {
    encodeCall(): string;
    handleCallResults(callResults: string): TResult;
    handleRevert(callResults: string): TResult;
}

export interface SourceQuoteOperation<TFillData extends FillData = FillData> extends BatchedOperation<BigNumber[]> {
    readonly source: ERC20BridgeSource;
    fillData: TFillData;
}

export interface OptimizerResult {
    optimizedOrders: OptimizedMarketOrder[];
    sourceFlags: bigint;
    liquidityDelivered: Readonly<Fill[] | DexSample<MultiHopFillData>>;
    marketSideLiquidity: MarketSideLiquidity;
    adjustedRate: BigNumber;
    takerAmountPerEth: BigNumber;
    makerAmountPerEth: BigNumber;
}

export interface OptimizerResultWithReport extends OptimizerResult {
    quoteReport?: QuoteReport;
    extendedQuoteReportSources?: ExtendedQuoteReportSources;
    priceComparisonsReport?: PriceComparisonsReport;
}

export interface MarketSideLiquidity {
    side: MarketOperation;
    inputAmount: BigNumber;
    inputToken: string;
    outputToken: string;
    outputAmountPerEth: BigNumber;
    inputAmountPerEth: BigNumber;
    quoteSourceFilters: SourceFilters;
    makerTokenDecimals: number;
    takerTokenDecimals: number;
    quotes: RawQuotes;
    isRfqSupported: boolean;
    blockNumber: number;
}

export interface RawQuotes {
    nativeOrders: NativeOrderWithFillableAmounts[];
    rfqtIndicativeQuotes: V4RFQIndicativeQuoteMM[];
    twoHopQuotes: DexSample<MultiHopFillData>[];
    dexQuotes: DexSample<FillData>[][];
}

export interface LiquidityProviderRegistry {
    [address: string]: {
        tokens: string[];
        gasCost: number | ((takerToken: string, makerToken: string) => number);
    };
}

export interface GenerateOptimizedOrdersOpts {
    feeSchedule: FeeSchedule;
    exchangeProxyOverhead: ExchangeProxyOverhead;
    gasPrice: BigNumber;
    neonRouterNumSamples: number;
    fillAdjustor: FillAdjustor;
}

export interface ComparisonPrice {
    wholeOrder: BigNumber | undefined;
}

export interface FillAdjustor {
    adjustFills: (side: MarketOperation, fills: Fill[], amount: BigNumber) => Fill[];
}
