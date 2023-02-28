import { ChainId } from '@0x/contract-addresses';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';

import {
    NativeOrderWithFillableAmounts,
    ERC20BridgeSource,
    FillData,
    FeeSchedule,
    FillAdjustor,
    ExchangeProxyOverhead,
} from '../../types';
import { V4RFQIndicativeQuoteMM } from '../../utils/quote_requestor';

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

export interface AaveInfo {
    lendingPool: string;
    aToken: string;
    underlyingToken: string;
}

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

interface BalancerBatchSwapStep {
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
    // Only needed for gas estimation
    chainId: ChainId;
}

export interface UniswapV2FillData extends FillData {
    tokenAddressPath: string[];
    router: string;
}

export interface ShellFillData extends FillData {
    poolAddress: string;
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
    firstHopSource: {
        source: ERC20BridgeSource;
        fillData: FillData;
    };
    secondHopSource: {
        source: ERC20BridgeSource;
        fillData: FillData;
    };
    intermediateToken: string;
}

interface MakerPsmExtendedData {
    isSellOperation: boolean;
    takerToken: string;
}

export type MakerPsmFillData = FillData & MakerPsmExtendedData & PsmInfo;

export interface HopInfo {
    sourceIndex: BigNumber;
    returnData: string;
}

export interface PathAmount {
    path: string;
    inputAmount: BigNumber;
    gasUsed: number;
}
export interface TickDEXMultiPathFillData extends FillData {
    tokenAddressPath: string[];
    router: string;
    pathAmounts: PathAmount[];
}

export interface KyberDmmFillData extends UniswapV2FillData {
    poolsPath: string[];
}

export function isFinalPathFillData(
    data: TickDEXMultiPathFillData | FinalTickDEXMultiPathFillData,
): data is FinalTickDEXMultiPathFillData {
    return !!(data as FinalTickDEXMultiPathFillData).path;
}

export interface FinalTickDEXMultiPathFillData extends Omit<TickDEXMultiPathFillData, 'pathAmounts'> {
    // The encoded path that can fll the maximum input amount.
    path: string;
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

interface AaveV3L2EncodedParameter {
    inputAmount: BigNumber;
    l2Parameter: string;
}
export interface AaveV3FillData extends AaveV2FillData {
    l2EncodedParams: AaveV3L2EncodedParameter[];
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
    router: string;
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
    samplerGasUsage: number;
}

export interface PathContext {
    side: MarketOperation;
    inputToken: string;
    outputToken: string;
}

export interface RawQuotes {
    nativeOrders: NativeOrderWithFillableAmounts[];
    rfqtIndicativeQuotes: V4RFQIndicativeQuoteMM[];
    twoHopQuotes: DexSample<MultiHopFillData>[][];
    dexQuotes: DexSample<FillData>[][];
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
