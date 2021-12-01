import {
    FillQuoteTransformerLimitOrderInfo,
    FillQuoteTransformerOrderType,
    FillQuoteTransformerRfqOrderInfo,
    LimitOrderFields,
    RfqOrderFields,
    Signature,
} from '@0x/protocol-utils';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';

import { Address, Bytes, RfqFirmQuoteValidator, RfqRequestOpts } from '../../types';
import { NativeOrderWithFillableAmounts } from '../native_orders';
import { QuoteRequestor } from '../../utils/quote_requestor';
import { PriceComparisonsReport, QuoteReport } from '../quote_report_generator';

import { CollapsedPath } from './path';
import { SourceFilters } from './source_filters';

/**
 * Order domain keys: chainId and exchange
 */
export interface OrderDomain {
    chainId: number;
    exchangeAddress: string;
}

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
    Eth2Dai = 'Eth2Dai',
    Kyber = 'Kyber',
    Curve = 'Curve',
    LiquidityProvider = 'LiquidityProvider',
    MultiBridge = 'MultiBridge',
    Balancer = 'Balancer',
    BalancerV2 = 'Balancer_V2',
    Cream = 'CREAM',
    Bancor = 'Bancor',
    MakerPsm = 'MakerPsm',
    MStable = 'mStable',
    Mooniswap = 'Mooniswap',
    MultiHop = 'MultiHop',
    Shell = 'Shell',
    Swerve = 'Swerve',
    SnowSwap = 'SnowSwap',
    SushiSwap = 'SushiSwap',
    Dodo = 'DODO',
    DodoV2 = 'DODO_V2',
    CryptoCom = 'CryptoCom',
    Linkswap = 'Linkswap',
    KyberDmm = 'KyberDMM',
    Smoothy = 'Smoothy',
    Component = 'Component',
    Saddle = 'Saddle',
    XSigma = 'xSigma',
    UniswapV3 = 'Uniswap_V3',
    CurveV2 = 'Curve_V2',
    Lido = 'Lido',
    ShibaSwap = 'ShibaSwap',
    // BSC only
    PancakeSwap = 'PancakeSwap',
    PancakeSwapV2 = 'PancakeSwap_V2',
    BakerySwap = 'BakerySwap',
    Nerve = 'Nerve',
    Belt = 'Belt',
    Ellipsis = 'Ellipsis',
    ApeSwap = 'ApeSwap',
    CafeSwap = 'CafeSwap',
    CheeseSwap = 'CheeseSwap',
    JulSwap = 'JulSwap',
    ACryptos = 'ACryptoS',
    // Polygon only
    QuickSwap = 'QuickSwap',
    ComethSwap = 'ComethSwap',
    Dfyn = 'Dfyn',
    WaultSwap = 'WaultSwap',
    Polydex = 'Polydex',
    FirebirdOneSwap = 'FirebirdOneSwap',
    JetSwap = 'JetSwap',
    IronSwap = 'IronSwap',
    // Avalanche
    Pangolin = 'Pangolin',
    TraderJoe = 'TraderJoe',
    // Fantom
    SpiritSwap = 'SpiritSwap',
    SpookySwap = 'SpookySwap',
}
export type SourcesWithPoolsCache = ERC20BridgeSource.Balancer | ERC20BridgeSource.BalancerV2 | ERC20BridgeSource.Cream;

// tslint:disable: enum-naming
/**
 * Curve contract function selectors.
 */
export enum CurveFunctionSelectors {
    None = '0x00000000',
    exchange = '0x3df02124',
    exchange_underlying = '0xa6417ed6',
    get_dy_underlying = '0x07211ef7',
    get_dx_underlying = '0x0e71d1b9',
    get_dy = '0x5e0d443f',
    get_dx = '0x67df02ca',
    // Curve V2
    exchange_v2 = '0x5b41b908',
    exchange_underlying_v2 = '0x65b2489b',
    get_dy_v2 = '0x556d6e9f',
    get_dy_underlying_v2 = '0x85f11d1e',
    // Smoothy
    swap_uint256 = '0x5673b02d', // swap(uint256,uint256,uint256,uint256)
    get_swap_amount = '0x45cf2ef6', // getSwapAmount(uint256,uint256,uint256)
    // Nerve BSC, Saddle Mainnet
    swap = '0x91695586', // swap(uint8,uint8,uint256,uint256,uint256)
    calculateSwap = '0xa95b089f', // calculateSwap(uint8,uint8,uint256)
}
// tslint:enable: enum-naming

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
}

/**
 * Configuration info for a Balancer V2 pool.
 */
export interface BalancerV2PoolInfo {
    poolId: string;
    vault: string;
}

// Represents an individual DEX sample from the sampler contract
export interface DexSample {
    source: ERC20BridgeSource;
    encodedFillData: Bytes;
    metadata?: any;
    input: BigNumber;
    output: BigNumber;
    gasCost: number;
}

export interface BridgeFillData {
    encodedFillData: Bytes;
}

export interface UniswapV2FillData extends BridgeFillData {
    tokenAddressPath: Address[];
}

export interface UniswapV3FillData extends BridgeFillData {
    encodedPath: Bytes;
}

export interface LiquidityProviderFillData extends BridgeFillData {
    poolAddress: Address;
}

export interface CurveFillData extends BridgeFillData {
    poolAddress: Address;
    exchangeFunctionSelector: Bytes;
    fromTokenIdx: number;
    toTokenIdx: number;
}

export interface MooniswapFillData extends BridgeFillData {
    poolAddress: Address;
}

export interface NativeOrderFillData {
    order: LimitOrderFields | RfqOrderFields;
    signature: Signature;
}

/**
 * Represents a node on a fill path.
 */
export interface Fill {
    // basic data for every fill
    source: ERC20BridgeSource;
    // TODO jacob people seem to agree  that orderType here is more readable
    type: FillQuoteTransformerOrderType; // should correspond with TFillData
    data?: any;
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
    // The output fill amount, ajdusted by fees.
    adjustedOutput: BigNumber;
    // Fill that must precede this one. This enforces certain fills to be contiguous.
    parent?: Fill;
    // The index of the fill in the original path.
    index: number;
    // Cumulative gas cost associated with swapping against this source/pool.
    gasCost: number;
}

export interface BridgeFill<TData extends BridgeFillData> extends Fill {
    data: TData;
}

export interface GenericBridgeFill extends BridgeFill<BridgeFillData> {}

export interface  UniswapV2BridgeFill extends BridgeFill<UniswapV2FillData> {}

export interface  UniswapV3BridgeFill extends BridgeFill<UniswapV3FillData> {}

export interface  LiquidityProviderBridgeFill extends BridgeFill<LiquidityProviderFillData> {}

export interface  CurveBridgeFill extends BridgeFill<CurveFillData> {}

export interface  MooniswapBridgeFill extends BridgeFill<MooniswapFillData> {}

export interface NativeOrderFill extends Fill {
    data: NativeOrderFillData;
}

/**
 * Represents continguous fills on a path that have been merged together.
 */
export interface CollapsedFill {
    source: ERC20BridgeSource;
    type: FillQuoteTransformerOrderType; // should correspond with TFillData
    data?: any;
    // Unique ID of the original source path this fill belongs to.
    // This is generated when the path is generated and is useful to distinguish
    // paths that have the same `source` IDs but are distinct (e.g., Curves).
    sourcePathId: string;
    /**
     * Total input amount (sum of `subFill`s)
     */
    input: BigNumber;
    /**
     * Total output amount (sum of `subFill`s)
     */
    output: BigNumber;
    /**
     * Quantities of all the fills that were collapsed.
     */
    subFills: Array<{
        input: BigNumber;
        output: BigNumber;
    }>;
    gasCost: number;
    isFallback: boolean;
}

export interface CollapsedBridgeFill<TData extends BridgeFillData> extends CollapsedFill {
    data: TData;
}

export interface CollapsedGenericBridgeFill extends CollapsedBridgeFill<BridgeFillData> {}

export interface CollapsedUniswapV2BridgeFill extends CollapsedBridgeFill<UniswapV2FillData> {}

export interface CollapsedUniswapV3BridgeFill extends CollapsedBridgeFill<UniswapV3FillData> {}

export interface CollapsedLiquidityProviderBridgeFill extends CollapsedBridgeFill<LiquidityProviderFillData> {}

export interface CollapsedCurveBridgeFill extends CollapsedBridgeFill<CurveFillData> {}

export interface CollapsedMooniswapBridgeFill extends CollapsedBridgeFill<MooniswapFillData> {}

export interface CollapsedNativeOrderFill extends CollapsedFill {
    data: NativeOrderFillData;
}

export interface OptimizedOrder {
    source: ERC20BridgeSource;
    type: FillQuoteTransformerOrderType;
    inputToken: string;
    outputToken: string;
    gasCost: number;
    inputAmount: BigNumber;
    outputAmount: BigNumber;
    fills: CollapsedFill[];
    isFallback: boolean;
    fillData: any;
}

export interface OptimizedBridgeOrder<TFillData extends BridgeFillData> extends OptimizedOrder {
    type: FillQuoteTransformerOrderType.Bridge;
    sourcePathId: string;
    fillData: TFillData;
}

export interface OptimizedGenericBridgeOrder extends OptimizedBridgeOrder<BridgeFillData> {}

export interface OptimizedUniswapV2BridgeOrder extends OptimizedBridgeOrder<UniswapV2FillData> {}

export interface OptimizedLimitOrder extends OptimizedOrder {
    type: FillQuoteTransformerOrderType.Limit;
    fillData: Omit<NativeOrderFillData, 'type'>;
}

export interface OptimizedRfqOrder extends OptimizedOrder {
    type: FillQuoteTransformerOrderType.Rfq;
    fillData: Omit<NativeOrderFillData, 'type'>;
}

export interface GetMarketOrdersRfqOpts extends RfqRequestOpts {
    quoteRequestor?: QuoteRequestor;
    firmQuoteValidator?: RfqFirmQuoteValidator;
}

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
     * Complexity limit on the search algorithm, i.e., maximum number of
     * nodes to visit. Default is 1024.
     */
    runLimit: number;
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
}

/**
 * A composable operation the be run in `DexOrderSampler.executeAsync()`.
 */
export interface BatchedOperation<TResult> {
    encodeCall(): string;
    handleCallResults(callResults: string): TResult;
    handleRevert(callResults: string): TResult;
}

export interface OptimizedHop {
    inputToken: Address;
    outputToken: Address;
    inputAmount: BigNumber;
    outputAmount: BigNumber;
    sourceFlags: bigint;
    orders: OptimizedOrder[];
    adjustedCompleteRate: BigNumber;
}

export interface OptimizerResult {
    adjustedRate: BigNumber;
    hops: OptimizedHop[];
    // liquidityDelivered: CollapsedFill[] | DexSample<MultiHopFillData>;
    marketSideLiquidity: MarketSideLiquidity;
    unoptimizedPath?: CollapsedPath;
    takerAmountPerEth: BigNumber;
    makerAmountPerEth: BigNumber;
}

export interface OptimizerResultWithReport extends OptimizerResult {
    quoteReport?: QuoteReport;
    priceComparisonsReport?: PriceComparisonsReport;
}

export type MarketDepthSide = Array<Array<DexSample>>;

export interface MarketDepth {
    bids: MarketDepthSide;
    asks: MarketDepthSide;
    makerTokenDecimals: number;
    takerTokenDecimals: number;
}

export interface TokenAmountPerEth {
    [tokenAddress: string]: BigNumber;
}

export interface MarketSideLiquidity {
    side: MarketOperation;
    inputAmount: BigNumber;
    inputToken: string;
    outputToken: string;
    tokenAmountPerEth: TokenAmountPerEth;
    quoteSourceFilters: SourceFilters;
    makerTokenDecimals: number;
    takerTokenDecimals: number;
    quotes: RawHopQuotes[];
    isRfqSupported: boolean;
    gasPrice: BigNumber;
}

export interface RawHopQuotes {
    inputToken: Address;
    outputToken: Address;
    nativeOrders: NativeOrderWithFillableAmounts[];
    dexQuotes: DexSample[][];
}

export interface TokenAdjacencyGraph {
    [token: string]: string[];
    default: string[];
}

export interface LiquidityProviderRegistry {
    [address: string]: {
        tokens: string[];
        gasCost: number | ((takerToken: string, makerToken: string) => number);
    };
}

export interface GenerateOptimizedOrdersOpts {
    runLimit?: number;
    bridgeSlippage?: number;
    maxFallbackSlippage?: number;
    excludedSources?: ERC20BridgeSource[];
    exchangeProxyOverhead?: ExchangeProxyOverhead;
    allowFallback?: boolean;
    shouldBatchBridgeOrders?: boolean;
    gasPrice: BigNumber;
}

export interface ComparisonPrice {
    wholeOrder: BigNumber | undefined;
}

export interface KyberSamplerOpts {
    networkProxy: string;
    hintHandler: string;
    weth: string;
}
