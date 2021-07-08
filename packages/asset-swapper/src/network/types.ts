import { BigNumber } from '@0x/utils';

import { ChainEthCallOverrides } from './chain';

export type Bytes = string;
export type Address = Bytes;

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
    // Polygon only
    QuickSwap = 'QuickSwap',
    ComethSwap = 'ComethSwap',
    Dfyn = 'Dfyn',
    WaultSwap = 'WaultSwap',
    Polydex = 'Polydex',
    FirebirdOneSwap = 'FirebirdOneSwap',
}

export interface FillData {}

export interface DexSample<TFillData extends FillData = FillData> {
    source: ERC20BridgeSource;
    fillData: TFillData;
    input: BigNumber;
    output: BigNumber;
}

export interface MultiHopCallInfo {
    quoterData: Bytes;
    quoterTarget: Address;
    overrides: ChainEthCallOverrides;
    resultHandler: (resultData: Bytes) => DexSample;
}

export interface SourceSampler {
    canConvertTokens(tokenAddressPath: Address[]): boolean;
    getSellSamplesAsync(
        tokenAddressPath: Address[],
        takerFillAmounts: BigNumber[],
    ): Promise<DexSample[][]>;
    getBuySamplesAsync(
        tokenAddressPath: Address[],
        makerFillAmounts: BigNumber[],
    ): Promise<DexSample[][]>;
    getMultiHopSellCallInfosAsync(
        tokenAddressPath: Address[],
        takerFillAmount: BigNumber,
    ): Promise<MultiHopCallInfo[]>;
    getMultiHopBuyCallInfosAsync(
        tokenAddressPath: Address[],
        makerFillAmount: BigNumber,
    ): Promise<MultiHopCallInfo[]>;
}

export interface SourceSamplerMap {
    [s: string]: SourceSampler;
}

export interface TokenAdjacencyGraph {
    [token: string]: Address[];
    default: Address[];
}
