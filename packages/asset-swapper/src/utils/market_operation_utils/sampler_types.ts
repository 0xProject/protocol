import { BigNumber } from '@0x/utils';

import { ERC20BridgeSource } from './types';

export type Bytes = string;
export type Address = Bytes;

export interface RpcLiquidityRequest {
    tokenPath: Address[];
    inputAmount: string;
    source: ERC20BridgeSource; // LiquiditySource; TODO (Romain): should probably link them somehow?
    demand: boolean;
}

export interface LiquidityCurvePoint {
    sellAmount: BigNumber; // TODO (Romain) was bigint
    buyAmount: BigNumber; // TODO (Romain) was bigint
    encodedFillData: Bytes;
}

export interface LiquidityResponse {
    source: ERC20BridgeSource; //LiquiditySource;
    liquidityCurve: LiquidityCurvePoint[][];
}

export interface Market {
    getSellLiquidityAsync(sellAmount: bigint, demand: boolean): Promise<LiquidityCurvePoint[]>;
    getBuyLiquidityAsync(buyAmount: bigint, demand: boolean): Promise<LiquidityCurvePoint[]>;
    getPriceAsync(): Promise<bigint>;
}

export interface TokenResponse {
    address: Address;
    symbol: string;
    decimals: number;
    gasCost: number;
}

// tslint:disable: enum-naming
export enum LiquiditySource {
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
    JetSwap = 'JetSwap',
    Clipper = 'Clipper',
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
    IronSwap = 'IronSwap',
}
// tslint:enable: enum-naming