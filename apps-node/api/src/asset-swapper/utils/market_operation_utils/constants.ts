import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { formatBytes32String, parseBytes32String } from '@ethersproject/strings';
import { Set } from 'immutable';

import { TokenAdjacencyGraph, TokenAdjacencyGraphBuilder } from '../token_adjacency_graph';
import { IdentityFillAdjustor } from './identity_fill_adjustor';
import { SourceFilters } from './source_filters';
import {
    AaveV2FillData,
    BalancerV2BatchSwapFillData,
    BancorFillData,
    CompoundFillData,
    CurveFillData,
    CurveFunctionSelectors,
    CurveInfo,
    DODOFillData,
    FinalTickDEXMultiPathFillData,
    isFinalPathFillData,
    LidoFillData,
    LidoInfo,
    MakerPsmFillData,
    MultiHopFillData,
    PlatypusInfo,
    PsmInfo,
    SynthetixFillData,
    UniswapV2FillData,
    TickDEXMultiPathFillData,
    WOOFiFillData,
} from './types';

import { ERC20BridgeSource, FeeSchedule, FillData, GasSchedule, GetMarketOrdersOpts } from '../../types';

export const ONE_ETHER = new BigNumber(1e18);
export const POSITIVE_INF = new BigNumber('Infinity');
export const ZERO_AMOUNT = new BigNumber(0);
export const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
export const ONE_HOUR_IN_SECONDS = 60 * 60;
export const ONE_SECOND_MS = 1000;
const NULL_BYTES = '0x';
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const SAMPLER_ADDRESS = '0x5555555555555555555555555555555555555555';
export const UNISWAP_V3_MULTIQUOTER_ADDRESS = '0x5555555555555555555555555555555555555556';
export const COMPARISON_PRICE_DECIMALS = 10;

// TODO(kimpers): Consolidate this implementation with the one in @0x/token-metadata
function valueByChainId<T>(rest: Partial<{ [key in ChainId]: T }>, defaultValue: T): { [key in ChainId]: T } {
    // TODO I don't like this but iterating through enums is weird
    return {
        [ChainId.Mainnet]: defaultValue,
        [ChainId.Goerli]: defaultValue,
        [ChainId.Ganache]: defaultValue,
        [ChainId.BSC]: defaultValue,
        [ChainId.Polygon]: defaultValue,
        [ChainId.PolygonMumbai]: defaultValue,
        [ChainId.Avalanche]: defaultValue,
        [ChainId.Fantom]: defaultValue,
        [ChainId.Celo]: defaultValue,
        [ChainId.Optimism]: defaultValue,
        [ChainId.Arbitrum]: defaultValue,
        ...(rest || {}),
    };
}

/**
 * Valid sources for market sell.
 */
export const SELL_SOURCE_FILTER_BY_CHAIN_ID: Record<ChainId, SourceFilters> = {
    [ChainId.Mainnet]: new SourceFilters([
        ERC20BridgeSource.Native,
        ERC20BridgeSource.Uniswap,
        ERC20BridgeSource.UniswapV2,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.Balancer,
        ERC20BridgeSource.BalancerV2,
        ERC20BridgeSource.Bancor,
        ERC20BridgeSource.BancorV3,
        ERC20BridgeSource.MStable,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.Shell,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Dodo,
        ERC20BridgeSource.DodoV2,
        ERC20BridgeSource.CryptoCom,
        ERC20BridgeSource.Lido,
        ERC20BridgeSource.MakerPsm,
        ERC20BridgeSource.KyberDmm,
        ERC20BridgeSource.Component,
        ERC20BridgeSource.Saddle,
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.ShibaSwap,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.Synthetix,
        ERC20BridgeSource.AaveV2,
        ERC20BridgeSource.Compound,
    ]),
    [ChainId.Goerli]: new SourceFilters([
        ERC20BridgeSource.Native,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.Uniswap,
        ERC20BridgeSource.UniswapV2,
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.MultiHop,
    ]),
    [ChainId.PolygonMumbai]: new SourceFilters([ERC20BridgeSource.Native, ERC20BridgeSource.UniswapV3]),
    [ChainId.Ganache]: new SourceFilters([ERC20BridgeSource.Native]),
    [ChainId.BSC]: new SourceFilters([
        ERC20BridgeSource.BakerySwap,
        ERC20BridgeSource.Belt,
        ERC20BridgeSource.Dodo,
        ERC20BridgeSource.DodoV2,
        ERC20BridgeSource.Ellipsis,
        ERC20BridgeSource.Mooniswap,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Nerve,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.PancakeSwap,
        ERC20BridgeSource.PancakeSwapV2,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.ApeSwap,
        ERC20BridgeSource.WaultSwap,
        ERC20BridgeSource.FirebirdOneSwap,
        ERC20BridgeSource.ACryptos,
        ERC20BridgeSource.KyberDmm,
        ERC20BridgeSource.BiSwap,
        ERC20BridgeSource.MDex,
        ERC20BridgeSource.KnightSwap,
        ERC20BridgeSource.WOOFi,
    ]),
    [ChainId.Polygon]: new SourceFilters([
        ERC20BridgeSource.Native,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.QuickSwap,
        ERC20BridgeSource.Dfyn,
        ERC20BridgeSource.MStable,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.DodoV2,
        ERC20BridgeSource.Dodo,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.WaultSwap,
        ERC20BridgeSource.ApeSwap,
        ERC20BridgeSource.FirebirdOneSwap,
        ERC20BridgeSource.BalancerV2,
        ERC20BridgeSource.KyberDmm,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.IronSwap,
        ERC20BridgeSource.AaveV2,
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.MeshSwap,
        ERC20BridgeSource.WOOFi,
        ERC20BridgeSource.AaveV3,
        // ERC20BridgeSource.Dystopia, // Temporarily removed until further investigated.
    ]),
    [ChainId.Avalanche]: new SourceFilters([
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Pangolin,
        ERC20BridgeSource.TraderJoe,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.KyberDmm,
        ERC20BridgeSource.AaveV2,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.GMX,
        ERC20BridgeSource.Platypus,
        ERC20BridgeSource.WOOFi,
        ERC20BridgeSource.AaveV3,
    ]),
    [ChainId.Fantom]: new SourceFilters([
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Beethovenx,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.MorpheusSwap,
        ERC20BridgeSource.SpiritSwap,
        ERC20BridgeSource.SpookySwap,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.Yoshi,
        ERC20BridgeSource.WOOFi,
    ]),
    [ChainId.Celo]: new SourceFilters([
        ERC20BridgeSource.UbeSwap,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.MobiusMoney,
    ]),
    [ChainId.Optimism]: new SourceFilters([
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Saddle,
        ERC20BridgeSource.Velodrome,
        ERC20BridgeSource.Synthetix,
        ERC20BridgeSource.Beethovenx,
        ERC20BridgeSource.AaveV3,
        ERC20BridgeSource.WOOFi,
    ]),
    [ChainId.Arbitrum]: new SourceFilters([
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.BalancerV2,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.GMX,
        ERC20BridgeSource.MultiHop,
        //ERC20BridgeSource.Dodo,
        ERC20BridgeSource.Saddle,
        ERC20BridgeSource.AaveV3,
        ERC20BridgeSource.WOOFi,
    ]),
};

/**
 * Valid sources for market buy.
 */
export const BUY_SOURCE_FILTER_BY_CHAIN_ID: Record<ChainId, SourceFilters> = {
    [ChainId.Mainnet]: new SourceFilters([
        ERC20BridgeSource.Native,
        ERC20BridgeSource.Uniswap,
        ERC20BridgeSource.UniswapV2,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.Balancer,
        ERC20BridgeSource.BalancerV2,
        // ERC20BridgeSource.Bancor, // FIXME: Bancor Buys not implemented in Sampler
        ERC20BridgeSource.BancorV3,
        ERC20BridgeSource.MStable,
        ERC20BridgeSource.Shell,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Dodo,
        ERC20BridgeSource.DodoV2,
        ERC20BridgeSource.Lido,
        ERC20BridgeSource.CryptoCom,
        ERC20BridgeSource.MakerPsm,
        ERC20BridgeSource.KyberDmm,
        ERC20BridgeSource.Component,
        ERC20BridgeSource.Saddle,
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.ShibaSwap,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.Synthetix,
        ERC20BridgeSource.AaveV2,
        ERC20BridgeSource.Compound,
    ]),
    [ChainId.Goerli]: new SourceFilters([
        ERC20BridgeSource.Native,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.Uniswap,
        ERC20BridgeSource.UniswapV2,
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.MultiHop,
    ]),
    [ChainId.PolygonMumbai]: new SourceFilters([ERC20BridgeSource.Native, ERC20BridgeSource.UniswapV3]),
    [ChainId.Ganache]: new SourceFilters([ERC20BridgeSource.Native]),
    [ChainId.BSC]: new SourceFilters([
        ERC20BridgeSource.BakerySwap,
        ERC20BridgeSource.Belt,
        ERC20BridgeSource.Dodo,
        ERC20BridgeSource.DodoV2,
        ERC20BridgeSource.Ellipsis,
        ERC20BridgeSource.Mooniswap,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Nerve,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.PancakeSwap,
        ERC20BridgeSource.PancakeSwapV2,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.ApeSwap,
        ERC20BridgeSource.WaultSwap,
        ERC20BridgeSource.FirebirdOneSwap,
        ERC20BridgeSource.ACryptos,
        ERC20BridgeSource.KyberDmm,
        ERC20BridgeSource.BiSwap,
        ERC20BridgeSource.MDex,
        ERC20BridgeSource.KnightSwap,
        ERC20BridgeSource.WOOFi,
    ]),
    [ChainId.Polygon]: new SourceFilters([
        ERC20BridgeSource.Native,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.QuickSwap,
        ERC20BridgeSource.Dfyn,
        ERC20BridgeSource.MStable,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.DodoV2,
        ERC20BridgeSource.Dodo,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.WaultSwap,
        ERC20BridgeSource.ApeSwap,
        ERC20BridgeSource.FirebirdOneSwap,
        ERC20BridgeSource.BalancerV2,
        ERC20BridgeSource.KyberDmm,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.IronSwap,
        ERC20BridgeSource.AaveV2,
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.MeshSwap,
        ERC20BridgeSource.WOOFi,
        ERC20BridgeSource.AaveV3,
        // ERC20BridgeSource.Dystopia, // Temporarily removed until further investigated.
    ]),
    [ChainId.Avalanche]: new SourceFilters([
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Pangolin,
        ERC20BridgeSource.TraderJoe,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.KyberDmm,
        ERC20BridgeSource.AaveV2,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.GMX,
        ERC20BridgeSource.Platypus,
        ERC20BridgeSource.WOOFi,
        ERC20BridgeSource.AaveV3,
    ]),
    [ChainId.Fantom]: new SourceFilters([
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Beethovenx,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.MorpheusSwap,
        ERC20BridgeSource.SpiritSwap,
        ERC20BridgeSource.SpookySwap,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.Yoshi,
        ERC20BridgeSource.WOOFi,
    ]),
    [ChainId.Celo]: new SourceFilters([
        ERC20BridgeSource.UbeSwap,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.MobiusMoney,
    ]),
    [ChainId.Optimism]: new SourceFilters([
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.Curve,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.MultiHop,
        ERC20BridgeSource.Saddle,
        ERC20BridgeSource.Velodrome,
        ERC20BridgeSource.Synthetix,
        ERC20BridgeSource.Beethovenx,
        ERC20BridgeSource.AaveV3,
        ERC20BridgeSource.WOOFi,
    ]),
    [ChainId.Arbitrum]: new SourceFilters([
        ERC20BridgeSource.UniswapV3,
        ERC20BridgeSource.SushiSwap,
        ERC20BridgeSource.BalancerV2,
        ERC20BridgeSource.Synapse,
        ERC20BridgeSource.CurveV2,
        ERC20BridgeSource.GMX,
        ERC20BridgeSource.MultiHop,
        //ERC20BridgeSource.Dodo,
        ERC20BridgeSource.Saddle,
        ERC20BridgeSource.AaveV3,
        ERC20BridgeSource.WOOFi,
    ]),
};

/**
 *  0x Protocol Fee Multiplier
 */
const PROTOCOL_FEE_MULTIPLIER = new BigNumber(0);

/**
 * Sources to poll for ETH fee price estimates.
 */
export const FEE_QUOTE_SOURCES_BY_CHAIN_ID = valueByChainId<ERC20BridgeSource[]>(
    {
        // Lido added so that we can get fee price estimates for stETH
        [ChainId.Mainnet]: [
            ERC20BridgeSource.UniswapV2,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.Lido,
        ],
        [ChainId.BSC]: [ERC20BridgeSource.PancakeSwap, ERC20BridgeSource.Mooniswap, ERC20BridgeSource.SushiSwap],
        [ChainId.Goerli]: [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap],
        [ChainId.PolygonMumbai]: [ERC20BridgeSource.UniswapV3],
        [ChainId.Polygon]: [ERC20BridgeSource.QuickSwap, ERC20BridgeSource.SushiSwap, ERC20BridgeSource.UniswapV3],
        [ChainId.Avalanche]: [ERC20BridgeSource.Pangolin, ERC20BridgeSource.TraderJoe, ERC20BridgeSource.SushiSwap],
        [ChainId.Fantom]: [ERC20BridgeSource.SpiritSwap, ERC20BridgeSource.SpookySwap, ERC20BridgeSource.SushiSwap],
        [ChainId.Celo]: [ERC20BridgeSource.UbeSwap, ERC20BridgeSource.SushiSwap],
        [ChainId.Optimism]: [ERC20BridgeSource.UniswapV3],
        [ChainId.Arbitrum]: [ERC20BridgeSource.UniswapV3, ERC20BridgeSource.SushiSwap],
    },
    [],
);

// NOTES: It seems unnecessary to use `bigint` over a `Set`.
// Once `ERC20BridgeSource.Native` is broken into Limit, RFQ, OTC orders, consider using `Set`.
// HACK(mzhu25): Limit, Rfq, and Otc orders need to be treated as different sources
//               when computing the exchange proxy gas overhead.
export const SOURCE_FLAGS: { [key in ERC20BridgeSource]: bigint } & {
    RfqOrder: bigint;
    LimitOrder: bigint;
    OtcOrder: bigint;
} = Object.assign(
    {},
    ...['RfqOrder', 'LimitOrder', 'OtcOrder', ...Object.values(ERC20BridgeSource)].map((source, index) => ({
        [source]: source === ERC20BridgeSource.Native ? BigInt(0) : BigInt(1) << BigInt(index),
    })),
);

// Mainnet tokens
// Not an exhaustive list, just enough so we don't repeat ourselves
export const MAINNET_TOKENS = {
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    // Stable Coins
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    sUSD: '0x57ab1ec28d129707052df4df418d58a2d46d5f51',
    BUSD: '0x4fabb145d64652a948d72533023f6e7a623c7c53',
    TUSD: '0x0000000000085d4780b73119b644ae5ecd22b376',
    PAX: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
    GUSD: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
    HUSD: '0xdf574c24545e5ffecb9a659c229253d4111d87e1',
    mUSD: '0xe2f2a5c287993345a840db3b0845fbc70f5935a5',
    USDN: '0x674c6ad92fd080e4004b2312b45f796a192d27a0',
    dUSD: '0x5bc25f649fc4e26069ddf4cf4010f9f706c23831',
    USDP: '0x1456688345527be1f37e9e627da0837d6f08c925',
    USX: '0x0a5e677a6a24b2f1a2bf4f3bffc443231d2fdec8',
    WCUSD: '0xad3e3fc59dff318beceaab7d00eb4f68b1ecf195',
    // Bitcoins
    WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    RenBTC: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
    sBTC: '0xfe18be6b3bd88a2d2a7f928d00292e7a9963cfc6',
    tBTC: '0x8daebade922df735c38c80c7ebd708af50815faa',
    tBTCv2: '0x18084fba666a33d37592fa2633fd49a74dd93a88',
    hBTC: '0x0316eb71485b0ab14103307bf65a021042c6d380',
    pBTC: '0x5228a22e72ccc52d415ecfd199f99d0665e7733b',
    bBTC: '0x9be89d2a4cd102d8fecc6bf9da793be995c22541',
    oBTC: '0x8064d9ae6cdf087b1bcd5bdf3531bd5d8c537a68',
    // aTokens (Aave)
    aDAI: '0x028171bca77440897b824ca71d1c56cac55b68a3',
    aUSDC: '0xbcca60bb61934080951369a648fb03df4f96263c',
    aUSDT: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
    aSUSD: '0x6c5024cd4f8a59110119c56f8933403a539555eb',
    // Other
    MKR: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    EURS: '0xdb25f211ab05b1c97d595516f45794528a807ad8',
    sEUR: '0xd71ecff9342a5ced620049e616c5035f1db98620',
    sETH: '0x5e74c9036fb86bd7ecdcb084a0673efc32ea31cb',
    sJPY: '0xf6b1c627e95bfc3c1b4c9b825a032ff0fbf3e07d',
    sGBP: '0x97fe22e7341a0cd8db6f6c021a24dc8f4dad855f',
    sAUD: '0xf48e200eaf9906362bb1442fca31e0835773b8b4',
    sKRW: '0x269895a3df4d73b077fc823dd6da1b95f72aaf9b',
    sCHF: '0x0f83287ff768d1c1e17a42f44d644d7f22e8ee1d',
    stETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    wstETH: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    LINK: '0x514910771af9ca656af840dff83e8264ecf986ca',
    MANA: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
    KNC: '0xdefa4e8a7bcba345f687a2f1456f5edd9ce97202',
    AAVE: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    sLINK: '0xbbc455cb4f1b9e4bfc4b73970d360c8f032efee6',
    yUSD: '0x5dbcf33d8c2e976c6b560249878e6f1491bca25c',
    ybCRV: '0x2994529c0652d127b7842094103715ec5299bbed',
    yCRV: '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8',
    ynCRV: '0xfcc5c47be19d06bf83eb04298b026f81069ff65b',
    bCRV: '0x3b3ac5386837dc563660fb6a0937dfaa5924333b',
    yDAI: '0xacd43e627e64355f1861cec6d3a6688b31a6f952',
    yUSDC: '0x597ad1e0c13bfe8025993d9e79c69e1c0233522e',
    yUSDT: '0x2f08119c6f07c006695e079aafc638b8789faf18',
    yTUSD: '0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a',
    crETH: '0xcbc1065255cbc3ab41a6868c22d1f1c573ab89fd',
    ankrETH: '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb',
    vETH: '0x898bad2774eb97cf6b94605677f43b41871410b1',
    alETH: '0x0100546f2cd4c9d97f798ffc9755e47865ff7ee6',
    HT: '0x6f259637dcd74c767781e37bc6133cd6a68aa161',
    UST: '0xa47c8bf37f92abed4a126bda807a7b7498661acd',
    // StableSwap "open pools" (crv.finance)
    STABLEx: '0xcd91538b91b4ba7797d39a2f66e63810b50a33d0',
    alUSD: '0xbc6da0fe9ad5f3b0d58160288917aa56653660e9',
    // Frax ecosystem
    FRAX: '0x853d955acef822db058eb8505911ed77f175b99e',
    cvxFXS: '0xfeef77d3f69374f66429c91d732a244f074bdf74',
    FXS: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
    OHM: '0x383518188c0c6d7730d91b2c03a03c837814a899',
    OHMV2: '0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5',
    BTRFLY: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
    // Stargate
    STG: '0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6',
    //
    LUSD: '0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
    // Fei Ecosystem
    FEI: '0x956f47f50a910163d8bf957cf5846d573e7f87ca',
    TRIBE: '0xc7283b66eb1eb5fb86327f08e1b5816b0720212b',
    //
    DSU: '0x605d26fbd5be761089281d5cec2ce86eea667109',
    ESS: '0x24ae124c4cc33d6791f8e8b63520ed7107ac8b3e',
    cvxCRV: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
    CRV: '0xd533a949740bb3306d119cc777fa900ba034cd52',
    MIM: '0x99d8a9c45b2eca8864373a26d1459e3dff1e17f3',
    EURT: '0xc581b735a1688071a1746c968e0798d642ede491',
    // Synapse ecosystem
    nUSD: '0x1b84765de8b7566e4ceaf4d0fd3c5af52d3dde4f',
    CVX: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
    UST_WORMHOLE: '0xa693b19d2931d498c5b318df961919bb4aee87a5',
    RAI: '0x03ab458634910aad20ef5f1c8ee96f1d6ac54919',
    DOLA: '0x865377367054516e17014ccded1e7d814edc9ce4',
    OUSD: '0x2a8e1e676ec238d8a992307b495b45b3feaa5e86',
    agEUR: '0x1a7e4e63778b4f12a199c062f3efdd288afcbce8',
    ibEUR: '0x96e61422b6a9ba0e068b6c5add4ffabc6a4aae27',
    YFI: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
    LUSDCRV: '0xed279fdd11ca84beef15af5d39bb4d4bee23f0ca',
    bLUSD: '0xb9d7dddca9a4ac480991865efef82e01273f79c3',
    rsr: '0x320623b8e4ff03373931769a31fc52a4e78b5d70',
    crvFRAX: '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc',
    cUSDC: '0x39aa39c021dfbae8fac545936693ac917d5e7563',
    cDAI: '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
    cWBTC: '0xccf4429db6322d5c611ee964527d42e5d685dd6a',
};

export const BSC_TOKENS = {
    WBNB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    USDT: '0x55d398326f99059ff775485246999027b3197955',
    USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    DAI: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
    PAX: '0xb7f8cd00c5a06c0537e2abff0b58033d02e5e094',
    UST: '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
    VAI: '0x4bd17003473389a42daf6a0a729f6fdb328bbbd7',
    WEX: '0xa9c41a46a6b3531d28d5c32f6633dd2ff05dfb90',
    WETH: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    BTCB: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    renBTC: '0xfce146bf3146100cfe5db4129cf6c82b0ef4ad8c',
    pBTC: '0xed28a457a5a76596ac48d87c0f577020f6ea1c4c',
    nUSD: '0x23b891e5c62e0955ae2bd185990103928ab817b3',
    BSW: '0x965f527d9159dce6288a2219db51fc6eef120dd1',
    WOO: '0x4691937a7508860f876c9c0a2a617e7d9e945d4b',
};

export const POLYGON_TOKENS = {
    DAI: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    USDT: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    amDAI: '0x27f8d03b3a2196956ed754badc28d73be8830a6e',
    amUSDC: '0x1a13f4ca1d028320a707d99520abfefca3998b7f',
    amUSDT: '0x60d55f02a771d515e077c9c2403a1ef324885cec',
    WBTC: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    WMATIC: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    WETH: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    renBTC: '0xdbf31df14b66535af65aac99c32e9ea844e14501',
    QUICK: '0x831753dd7087cac61ab5644b308642cc1c33dc13',
    DFYN: '0xc168e40227e4ebd8c1cae80f7a55a4f0e6d66c97',
    BANANA: '0x5d47baba0d66083c52009271faf3f50dcc01023c',
    WEXPOLY: '0x4c4bf319237d98a30a929a96112effa8da3510eb',
    nUSD: '0xb6c473756050de474286bed418b77aeac39b02af',
    ANY: '0x6ab6d61428fde76768d7b45d8bfeec19c6ef91a8',
    WOO: '0x1b815d120b3ef02039ee11dc2d33de7aa4a8c603',
};

export const AVALANCHE_TOKENS = {
    WAVAX: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    WETH: '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
    // bridged WBTC from Ethereum WBTC.e
    WBTC: '0x50b7545627a5162f82a992c33b87adc75187b218',
    // bridged BTC from Bitcoin BTC.b
    BTCb: '0x152b9d0fdc40c096757f570a51e494bd4b943e50',
    DAI: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70',
    // bridged USDC
    USDC: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
    // native USDC on Avalanche usdc.e
    nUSDC: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    // usdt.e
    USDt: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    USDT: '0xc7198437980c041c805a1edcba50c1ce5db95118',
    aDAI: '0x47afa96cdc9fab46904a55a6ad4bf6660b53c38a',
    aUSDC: '0x46a51127c3ce23fb7ab1de06226147f446e4a857',
    aUSDT: '0x532e6537fea298397212f09a61e03311686f548e',
    nETH: '0x19e1ae0ee35c0404f835521146206595d37981ae',
    nUSD: '0xcfc37a6ab183dd4aed08c204d1c2773c0b1bdf46',
    aWETH: '0x53f7c5869a859f0aec3d334ee8b4cf01e3492f21',
    MIM: '0x130966628846bfd36ff31a822705796e8cb8c18d',
    MAG: '0x1d60109178c48e4a937d8ab71699d8ebb6f7c5de',
    sAVAX: '0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be',
    UST: '0xb599c3590f42f8f995ecfa0f85d2980b76862fc1',
    FRAX: '0xd24c2ad096400b6fbcd2ad8b24e7acbc21a1da64',
    YUSD: '0x111111111111ed1d73f860f57b2798b683f2d325',
    WOO: '0xabc9547b534519ff73921b1fba6e672b5f58d083',
};

const CELO_TOKENS = {
    WCELO: '0x471ece3750da237f93b8e339c536989b8978a438',
    // Some of these tokens are Optics bridge? tokens which
    // had an issue and migrated from v1 to v2
    WETHv1: '0xe919f65739c26a42616b7b8eedc6b5524d1e3ac4',
    oWETH: '0x122013fd7df1c6f636a5bb8f03108e876548b455',
    WBTC: '0xbaab46e28388d2779e6e31fd00cf0e5ad95e327b',
    cUSD: '0x765de816845861e75a25fca122bb6898b8b1282a',
    // ??
    cBTC: '0xd629eb00deced2a080b7ec630ef6ac117e614f1b',
    cETH: '0x2def4285787d58a2f811af24755a8150622f4361',
    UBE: '0x00be915b9dcf56a3cbe739d9b9c202ca692409ec',
    // Moolah
    mCELO: '0x7d00cd74ff385c955ea3d79e47bf06bd7386387d',
    mCUSD: '0x918146359264c492bd6934071c6bd31c854edbc3',
    mCEUR: '0xe273ad7ee11dcfaa87383ad5977ee1504ac07568',
    amCUSD: '0x64defa3544c695db8c535d289d843a189aa26b98',
    MOO: '0x17700282592d6917f6a73d0bf8accf4d578c131e',

    //
    wBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    wETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    wBTCO: '0xbe50a3013a1c94768a1abb78c3cb79ab28fc1ace',
    pUSDC: '0xcc82628f6a8defa1e2b0ad7ed448bef3647f7941',
    cUSDC: '0x2a3684e9dc20b857375ea04235f2f7edbe818fa7',
    cUSDC_V2: '0xef4229c8c3250c675f21bcefa42f58efbff6002a',
    pUSDC_V2: '0x1bfc26ce035c368503fae319cc2596716428ca44',
    pUSD: '0xeadf4a7168a82d30ba0619e64d5bcf5b30b45226',
    pCELO: '0x301a61d01a63c8d670c2b8a43f37d12ef181f997',
    aaUSDC: '0xb70e0a782b058bfdb0d109a3599bec1f19328e36',
    asUSDC: '0xcd7d7ff64746c1909e44db8e95331f9316478817',
    mcUSDT: '0xcfffe0c89a779c09df3df5624f54cdf7ef5fdd5d',
    mcUSDC: '0x93db49be12b864019da9cb147ba75cdc0506190e',
    DAI: '0x90ca507a5d4458a4c6c6249d186b6dcb02a5bccd',
};

export const FANTOM_TOKENS = {
    WFTM: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    WETH: '0x74b23882a30290451a17c44f4f05243b6b58c76d',
    USDC: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
    DAI: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
    fUSDT: '0x049d68029688eabf473097a2fc38ef61633a3c7a',
    WBTC: '0x321162cd933e2be498cd2267a90534a804051b11',
    WCRV: '0x1e4f97b9f9f913c46f1632781732927b9019c68b',
    renBTC: '0xdbf31df14b66535af65aac99c32e9ea844e14501',
    MIM: '0x82f0b8b456c1a451378467398982d4834b6829c1',
    nUSD: '0xed2a7edd7413021d440b09d654f3b87712abab66',
    nETH: '0x67c10c397dd0ba417329543c1a40eb48aaa7cd00',
    gfUSDT: '0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5',
    gUSDC: '0xe578c856933d8e1082740bf7661e379aa2a30b26',
    gDAI: '0x07e6332dd090d287d3489245038daf987955dcfb',
    FRAX: '0xdc301622e621166bd8e82f2ca0a26c13ad0be355',
    gFTM: '0x39b3bd37208cbade74d0fcbdbb12d606295b430a',
    gETH: '0x25c130b2624cf12a4ea30143ef50c5d68cefa22f',
    gWBTC: '0x38aca5484b8603373acc6961ecd57a6a594510a3',
    gCRV: '0x690754a168b022331caa2467207c61919b3f8a98',
    gMIM: '0xc664fc7b8487a3e10824cda768c1d239f2403bbe',
    WOO: '0x6626c47c00f1d87902fc13eecfac3ed06d5e8d8a',
    USDT: '0x049d68029688eabf473097a2fc38ef61633a3c7a',
    alUSD: '0xb67fa6defce4042070eb1ae1511dcd6dcc6a532e',
};

export const OPTIMISM_TOKENS = {
    ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    USDT: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    DAI: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    FRAX: '0x2e3d870790dc77a83dd1d18184acc7439a53f475',
    WBTC: '0x68f180fcce6836688e9084f035309e29bf0a2095',
    nETH: '0x809dc529f07651bd43a172e8db6f4a7a0d771036',
    sWETH: '0x121ab82b49b2bc4c7901ca46b8277962b4350204',
    // Synthetix synths:
    sAAVE: '0x00b8d5a5e1ac97cb4341c4bc4367443c8776e8d9',
    sAVAX: '0xb2b42b231c68cbb0b4bf2ffebf57782fd97d3da4',
    sBTC: '0x298b9b95708152ff6968aafd889c6586e9169f1d',
    sETH: '0xe405de8f52ba7559f9df3c368500b6e6ae6cee49',
    sEUR: '0xfbc4198702e81ae77c06d58f81b629bdf36f0a71',
    sLINK: '0xc5db22719a06418028a40a9b5e9a7c02959d0d08',
    sMATIC: '0x81ddfac111913d3d5218dea999216323b7cd6356',
    sSOL: '0x8b2f7ae8ca8ee8428b6d76de88326bb413db2766',
    sUNI: '0xf5a6115aa582fd1beea22bc93b7dc7a785f60d03',
    sUSD: '0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9',
    OP: '0x4200000000000000000000000000000000000042',
};

export const ARBITRUM_TOKENS = {
    ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    USDC: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    FRAX: '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
    nETH: '0x3ea9b0ab55f34fb188824ee288ceaefc63cf908e',
    WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    nUSD: '0x2913e812cf0dcca30fb28e6cac3d2dcff4497688',
    MIM: '0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a',
    WBTC: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    VST: '0x64343594ab9b56e99087bfa6f2335db24c2d1f17',
    WOO: '0xcafcd85d8ca7ad1e1c6f82f651fa15e33aefd07b',
};

export const REBASING_TOKENS = Set.of(MAINNET_TOKENS.stETH);

const SADDLE_MAINNET_POOLS = {
    // swaps
    stablesV2: '0xacb83e0633d6605c5001e2ab59ef3c745547c8c7',
    alETH: '0xa6018520eaacc06c30ff2e1b3ee2c7c22e64196a',
    d4: '0xc69ddcd4dfef25d8a793241834d4cc4b3668ead6',
    '4Pool': '0x101cd330d088634b6f64c2eb4276e63bf1bbfde3',
    fraxBP: '0x13cc34aa8037f722405285ad2c82fe570bfa2bdc',
    frax3Pool: '0x8caea59f3bf1f341f89c51607e4919841131e47a',
    usx: '0x2bff1b48cc01284416e681b099a0cddca0231d72',

    // metaswaps
    susdMetaPoolV3: '0x4568727f50c7246ded8c39214ed6ff3c157f080d',
    fraxAlusdMetaPool: '0xfb516cf3710fc6901f2266aaeb8834cf5e4e9558',
    fraxSusdMetaPool: '0x69baa0d7c2e864b74173922ca069ac79d3be1556',
};

const SADDLE_OPTIMISM_POOLS = {
    // swaps
    fraxBP: '0xf6c2e0adc659007ba7c48446f5a4e4e94dfe08b5',
};

const SADDLE_ARBITRUM_POOLS = {
    // swaps
    arbUSDPoolV2: '0xfeea4d1bacb0519e8f952460a70719944fe56ee0',
    fraxBP: '0x401afbc31ad2a3bc0ed8960d63efcdea749b4849',
};

const IRONSWAP_POOLS = {
    is3usd: '0x837503e8a8753ae17fb8c8151b8e6f586defcb57',
};

const NERVE_POOLS = {
    threePool: '0x1b3771a66ee31180906972580ade9b81afc5fcdc',
};

const SYNAPSE_MAINNET_POOLS = {
    nUSDLP: '0x1116898dda4015ed8ddefb84b6e8bc24528af2d8',
};

const SYNAPSE_OPTIMISM_POOLS = {
    nETHLP: '0xe27bff97ce92c3e1ff7aa9f86781fdd6d48f5ee9',
};

const SYNAPSE_BSC_POOLS = {
    nUSDLP: '0x28ec0b36f0819ecb5005cab836f4ed5a2eca4d13',
};

const SYNAPSE_POLYGON_POOLS = {
    nUSDLP: '0x85fcd7dd0a1e1a9fcd5fd886ed522de8221c3ee5',
};

const SYNAPSE_FANTOM_POOLS = {
    nUSDLP: '0x2913e812cf0dcca30fb28e6cac3d2dcff4497688',
    nETHLP: '0x8d9ba570d6cb60c7e3e0f31343efe75ab8e65fb1',
};

const SYNAPSE_AVALANCHE_POOLS = {
    nUSDLP: '0xed2a7edd7413021d440b09d654f3b87712abab66',
    nETHLP: '0x77a7e60555bc18b4be44c181b2575eee46212d44',
};

const SYNAPSE_ARBITRUM_POOLS = {
    nUSDLP: '0x0db3fe3b770c95a0b99d1ed6f2627933466c0dd8',
    nETHLP: '0xa067668661c84476afcdc6fa5d758c4c01c34352',
};

const FIREBIRDONESWAP_BSC_POOLS = {
    oneswap: '0x01c9475dbd36e46d1961572c8de24b74616bae9e',
};

const FIREBIRDONESWAP_POLYGON_POOLS = {
    oneswap: '0x01c9475dbd36e46d1961572c8de24b74616bae9e',
};
const MOBIUSMONEY_CELO_POOLS = {
    usdc_optics_v2: '0x9906589ea8fd27504974b7e8201df5bbde986b03',
    dai_optics_v2: '0xf3f65dfe0c8c8f2986da0fec159abe6fd4e700b4',
    weth_optics_v2: '0x74ef28d635c6c5800dd3cd62d4c4f8752daacb09',
    pusdc_optics_v2: '0xcce0d62ce14fb3e4363eb92db37ff3630836c252',
    usdc_allbridge_solana: '0x63c1914bf00a9b395a2bf89aada55a5615a3656e',
    usdc_poly_optics: '0xa2f0e57d4ceacf025e81c76f28b9ad6e9fbe8735',
};

const PLATYPUS_AVALANCHE_POOLS = {
    usd: '0x66357dcace80431aee0a7507e2e361b7e2402370',
    yusd: '0xc828d995c686aaba78a4ac89dfc8ec0ff4c5be83',
    frax: '0xb8e567fc23c39c94a1f6359509d7b43d1fbed824',
    mim: '0x30c30d826be87cd0a4b90855c2f38f7fcfe4eaa7',
    sAVAX: '0x4658ea7e9960d6158a261104aaa160cc953bb6ba',
};

export const WOOFI_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0xc90bfe9951a4efbf20aca5ecd9966b2bf8a01294',
        [ChainId.Fantom]: '0x382a9b0bc5d29e96c3a0b81ce9c64d6c8f150efb',
        [ChainId.Avalanche]: '0xc22fbb3133df781e6c25ea6acebe2d2bb8cea2f9',
        [ChainId.Polygon]: '0x817eb46d60762442da3d931ff51a30334ca39b74',
        [ChainId.Arbitrum]: '0x9aed3a8896a85fe9a8cac52c9b402d092b629a30',
        [ChainId.Optimism]: '0xeaf1ac8e89ea0ae13e0f03634a4ff23502527024',
    },
    NULL_ADDRESS,
);

export const WOOFI_SUPPORTED_TOKENS = Set.of(
    BSC_TOKENS.BUSD,
    BSC_TOKENS.WBNB,
    BSC_TOKENS.WOO,
    BSC_TOKENS.WETH,
    BSC_TOKENS.BTCB,
    AVALANCHE_TOKENS.nUSDC,
    AVALANCHE_TOKENS.WAVAX,
    AVALANCHE_TOKENS.BTCb,
    AVALANCHE_TOKENS.WETH,
    AVALANCHE_TOKENS.WOO,
    FANTOM_TOKENS.USDC,
    FANTOM_TOKENS.WFTM,
    FANTOM_TOKENS.WETH,
    FANTOM_TOKENS.WBTC,
    FANTOM_TOKENS.WOO,
    POLYGON_TOKENS.USDC,
    POLYGON_TOKENS.WMATIC,
    POLYGON_TOKENS.WBTC,
    POLYGON_TOKENS.WETH,
    POLYGON_TOKENS.WOO,
    ARBITRUM_TOKENS.ETH,
    ARBITRUM_TOKENS.USDC,
    ARBITRUM_TOKENS.WETH,
    ARBITRUM_TOKENS.WBTC,
    ARBITRUM_TOKENS.WOO,
    OPTIMISM_TOKENS.ETH,
    OPTIMISM_TOKENS.USDC,
    OPTIMISM_TOKENS.WETH,
    OPTIMISM_TOKENS.WBTC,
    OPTIMISM_TOKENS.OP,
);

export const DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID: Record<ChainId, string[]> = {
    [ChainId.Mainnet]: [
        MAINNET_TOKENS.WETH,
        MAINNET_TOKENS.USDT,
        MAINNET_TOKENS.DAI,
        MAINNET_TOKENS.USDC,
        MAINNET_TOKENS.WBTC,
    ],
    [ChainId.BSC]: [
        BSC_TOKENS.WBNB,
        BSC_TOKENS.BUSD,
        BSC_TOKENS.DAI,
        BSC_TOKENS.USDC,
        BSC_TOKENS.WETH,
        BSC_TOKENS.USDT,
        BSC_TOKENS.WEX,
    ],
    [ChainId.Goerli]: [
        getContractAddressesForChainOrThrow(ChainId.Goerli).etherToken,
        '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844',
        '0x07865c6e87b9f70255377e024ace6630c1eaa37f', // USDC
    ],
    [ChainId.PolygonMumbai]: [
        getContractAddressesForChainOrThrow(ChainId.PolygonMumbai).etherToken,
        '0xe6b8a5cf854791412c1f6efc7caf629f5df1c747', // USDC
    ],
    [ChainId.Polygon]: [
        POLYGON_TOKENS.WMATIC,
        POLYGON_TOKENS.WETH,
        POLYGON_TOKENS.USDC,
        POLYGON_TOKENS.DAI,
        POLYGON_TOKENS.USDT,
        POLYGON_TOKENS.WBTC,
    ],
    [ChainId.Avalanche]: [
        AVALANCHE_TOKENS.WAVAX,
        AVALANCHE_TOKENS.WETH,
        AVALANCHE_TOKENS.WBTC,
        AVALANCHE_TOKENS.DAI,
        AVALANCHE_TOKENS.USDT,
        AVALANCHE_TOKENS.USDC,
        AVALANCHE_TOKENS.nUSD,
        AVALANCHE_TOKENS.nETH,
        AVALANCHE_TOKENS.aWETH,
        AVALANCHE_TOKENS.MIM,
    ],
    [ChainId.Fantom]: [
        FANTOM_TOKENS.WFTM,
        FANTOM_TOKENS.WETH,
        FANTOM_TOKENS.DAI,
        FANTOM_TOKENS.USDC,
        FANTOM_TOKENS.nUSD,
        FANTOM_TOKENS.nETH,
        FANTOM_TOKENS.MIM,
    ],
    [ChainId.Celo]: [
        CELO_TOKENS.WCELO,
        CELO_TOKENS.mCUSD,
        CELO_TOKENS.WETHv1,
        CELO_TOKENS.amCUSD,
        CELO_TOKENS.WBTC,
        CELO_TOKENS.cUSD,
    ],
    [ChainId.Optimism]: [
        OPTIMISM_TOKENS.WETH,
        OPTIMISM_TOKENS.DAI,
        OPTIMISM_TOKENS.USDC,
        OPTIMISM_TOKENS.USDT,
        OPTIMISM_TOKENS.nETH,
        OPTIMISM_TOKENS.sWETH,
    ],
    [ChainId.Arbitrum]: [
        ARBITRUM_TOKENS.USDC,
        ARBITRUM_TOKENS.USDT,
        ARBITRUM_TOKENS.WETH,
        ARBITRUM_TOKENS.WBTC,
        ARBITRUM_TOKENS.FRAX,
        ARBITRUM_TOKENS.MIM,
    ],
    [ChainId.Ganache]: [],
};

// Note be careful here as a UNION is performed when finding intermediary tokens
// attaching to a default intermediary token (stables or ETH etc) can have a large impact
export const DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID: Record<ChainId, TokenAdjacencyGraph> = {
    [ChainId.Mainnet]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Mainnet])
        .tap((builder) => {
            // Convex and Curve
            builder.addBidirectional(MAINNET_TOKENS.cvxCRV, MAINNET_TOKENS.CRV);
            // Convex and FXS
            builder.addBidirectional(MAINNET_TOKENS.cvxFXS, MAINNET_TOKENS.FXS);
            // FEI TRIBE liquid in UniV2
            builder.addBidirectional(MAINNET_TOKENS.FEI, MAINNET_TOKENS.TRIBE);
            // FRAX ecosystem
            builder.addBidirectional(MAINNET_TOKENS.FRAX, MAINNET_TOKENS.FXS);
            builder.addBidirectional(MAINNET_TOKENS.FRAX, MAINNET_TOKENS.OHM);
            // REDACTED CARTEL
            builder.addBidirectional(MAINNET_TOKENS.OHMV2, MAINNET_TOKENS.BTRFLY);
            // Lido
            builder.addBidirectional(MAINNET_TOKENS.stETH, MAINNET_TOKENS.wstETH);
            // Compound
            builder.addBidirectional(MAINNET_TOKENS.cUSDC, MAINNET_TOKENS.USDC);
            builder.addBidirectional(MAINNET_TOKENS.cDAI, MAINNET_TOKENS.DAI);
            builder.addBidirectional(MAINNET_TOKENS.cWBTC, MAINNET_TOKENS.WBTC);

            // Synthetix Atomic Swap
            builder.addCompleteSubgraph([
                MAINNET_TOKENS.sBTC,
                MAINNET_TOKENS.sETH,
                MAINNET_TOKENS.sUSD,
                MAINNET_TOKENS.sEUR,
                MAINNET_TOKENS.sJPY,
                MAINNET_TOKENS.sGBP,
                MAINNET_TOKENS.sAUD,
                MAINNET_TOKENS.sKRW,
                MAINNET_TOKENS.sCHF,
            ]);
        })
        .build(),
    [ChainId.BSC]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.BSC]).build(),
    [ChainId.Polygon]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Polygon])
        .tap((builder) => {
            builder.addBidirectional(POLYGON_TOKENS.QUICK, POLYGON_TOKENS.ANY);
        })
        .build(),
    [ChainId.Avalanche]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Avalanche])
        .tap((builder) => {
            // Synapse nETH/aWETH pool
            builder.addBidirectional(AVALANCHE_TOKENS.aWETH, AVALANCHE_TOKENS.nETH);
            // Trader Joe MAG/MIM pool
            builder.addBidirectional(AVALANCHE_TOKENS.MIM, AVALANCHE_TOKENS.MAG);
        })
        .build(),
    [ChainId.Fantom]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Fantom]).build(),
    [ChainId.Celo]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Celo]).build(),
    [ChainId.Arbitrum]: new TokenAdjacencyGraphBuilder(
        DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Arbitrum],
    ).build(),
    [ChainId.Optimism]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Optimism])
        .tap((builder) => {
            // Synthetix Atomic Swap
            builder.addCompleteSubgraph([
                OPTIMISM_TOKENS.sAAVE,
                OPTIMISM_TOKENS.sAVAX,
                OPTIMISM_TOKENS.sBTC,
                OPTIMISM_TOKENS.sETH,
                OPTIMISM_TOKENS.sEUR,
                OPTIMISM_TOKENS.sLINK,
                OPTIMISM_TOKENS.sMATIC,
                OPTIMISM_TOKENS.sSOL,
                OPTIMISM_TOKENS.sUNI,
                OPTIMISM_TOKENS.sUSD,
            ]);
        })
        .build(),
    // Testnets:
    [ChainId.Goerli]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Goerli]).build(),
    [ChainId.Ganache]: new TokenAdjacencyGraphBuilder(DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Ganache]).build(),
    [ChainId.PolygonMumbai]: new TokenAdjacencyGraphBuilder(
        DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.PolygonMumbai],
    ).build(),
};

// TODO (rhinodavid): this constant is being used for reasons other than fees
// (see swap_handlers). Needs to be rethought or at least renamed.
export const NATIVE_FEE_TOKEN_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: getContractAddressesForChainOrThrow(ChainId.Mainnet).etherToken,
        [ChainId.BSC]: getContractAddressesForChainOrThrow(ChainId.BSC).etherToken,
        [ChainId.Ganache]: getContractAddressesForChainOrThrow(ChainId.Ganache).etherToken,
        [ChainId.Goerli]: getContractAddressesForChainOrThrow(ChainId.Goerli).etherToken,
        [ChainId.PolygonMumbai]: getContractAddressesForChainOrThrow(ChainId.PolygonMumbai).etherToken,
        [ChainId.Polygon]: getContractAddressesForChainOrThrow(ChainId.Polygon).etherToken,
        [ChainId.Avalanche]: getContractAddressesForChainOrThrow(ChainId.Avalanche).etherToken,
        [ChainId.Fantom]: getContractAddressesForChainOrThrow(ChainId.Fantom).etherToken,
        [ChainId.Celo]: getContractAddressesForChainOrThrow(ChainId.Celo).etherToken,
        [ChainId.Optimism]: getContractAddressesForChainOrThrow(ChainId.Optimism).etherToken,
        [ChainId.Arbitrum]: getContractAddressesForChainOrThrow(ChainId.Arbitrum).etherToken,
    },
    NULL_ADDRESS,
);

export const NATIVE_FEE_TOKEN_AMOUNT_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: ONE_ETHER.times(0.1),
        [ChainId.Optimism]: ONE_ETHER.times(0.1),
        [ChainId.Arbitrum]: ONE_ETHER.times(0.1),
    },
    ONE_ETHER,
);

const MOBIUSMONEY_CELO_SHARED: CurveInfo = {
    exchangeFunctionSelector: CurveFunctionSelectors.swap,
    sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    metaTokens: undefined,
    gasSchedule: 150e3,
    poolAddress: NULL_ADDRESS,
    tokens: [],
};

const createSaddleSwapPool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.swap,
    sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaTokens: undefined,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createSaddleMetaSwapPool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.swapUnderlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwapUnderlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaTokens: [info.tokens[0]],
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

// Curve-like sources using custom selectors
export const SADDLE_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [SADDLE_MAINNET_POOLS.stablesV2]: createSaddleSwapPool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        pool: SADDLE_MAINNET_POOLS.stablesV2,
        gasSchedule: 150e3,
    }),
    [SADDLE_MAINNET_POOLS.alETH]: createSaddleSwapPool({
        tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.alETH, MAINNET_TOKENS.sETH],
        pool: SADDLE_MAINNET_POOLS.alETH,
        gasSchedule: 200e3,
    }),
    [SADDLE_MAINNET_POOLS.fraxBP]: createSaddleSwapPool({
        tokens: [MAINNET_TOKENS.USDC, MAINNET_TOKENS.FRAX],
        pool: SADDLE_MAINNET_POOLS.fraxBP,
        gasSchedule: 150e3,
    }),
    [SADDLE_MAINNET_POOLS.usx]: createSaddleSwapPool({
        tokens: [MAINNET_TOKENS.USDC, MAINNET_TOKENS.USX],
        pool: SADDLE_MAINNET_POOLS.usx,
        gasSchedule: 150e3,
    }),
    [SADDLE_MAINNET_POOLS.susdMetaPoolV3]: createSaddleMetaSwapPool({
        tokens: [MAINNET_TOKENS.sUSD, MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        pool: SADDLE_MAINNET_POOLS.susdMetaPoolV3,
        gasSchedule: 370e3,
    }),
    [SADDLE_MAINNET_POOLS.fraxAlusdMetaPool]: createSaddleMetaSwapPool({
        tokens: [MAINNET_TOKENS.alUSD, MAINNET_TOKENS.USDC, MAINNET_TOKENS.FRAX],
        pool: SADDLE_MAINNET_POOLS.fraxAlusdMetaPool,
        gasSchedule: 320e3,
    }),
    [SADDLE_MAINNET_POOLS.fraxSusdMetaPool]: createSaddleMetaSwapPool({
        tokens: [MAINNET_TOKENS.sUSD, MAINNET_TOKENS.USDC, MAINNET_TOKENS.FRAX],
        pool: SADDLE_MAINNET_POOLS.fraxSusdMetaPool,
        gasSchedule: 370e3,
    }),
};

export const SADDLE_OPTIMISM_INFOS: { [name: string]: CurveInfo } = {
    [SADDLE_OPTIMISM_POOLS.fraxBP]: createSaddleSwapPool({
        tokens: [OPTIMISM_TOKENS.USDC, OPTIMISM_TOKENS.FRAX],
        pool: SADDLE_OPTIMISM_POOLS.fraxBP,
        gasSchedule: 150e3,
    }),
};

export const SADDLE_ARBITRUM_INFOS: { [name: string]: CurveInfo } = {
    [SADDLE_ARBITRUM_POOLS.fraxBP]: createSaddleSwapPool({
        tokens: [ARBITRUM_TOKENS.USDC, ARBITRUM_TOKENS.FRAX],
        pool: SADDLE_ARBITRUM_POOLS.fraxBP,
        gasSchedule: 200e3,
    }),
    [SADDLE_ARBITRUM_POOLS.arbUSDPoolV2]: createSaddleSwapPool({
        tokens: [ARBITRUM_TOKENS.FRAX, ARBITRUM_TOKENS.USDC, ARBITRUM_TOKENS.USDT],
        pool: SADDLE_ARBITRUM_POOLS.arbUSDPoolV2,
        gasSchedule: 200e3,
    }),
};

export const IRONSWAP_POLYGON_INFOS: { [name: string]: CurveInfo } = {
    [IRONSWAP_POOLS.is3usd]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: IRONSWAP_POOLS.is3usd,
        tokens: [POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT, POLYGON_TOKENS.DAI],
        metaTokens: undefined,
        gasSchedule: 150e3,
    },
};

export const NERVE_BSC_INFOS: { [name: string]: CurveInfo } = {
    [NERVE_POOLS.threePool]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: NERVE_POOLS.threePool,
        tokens: [BSC_TOKENS.BUSD, BSC_TOKENS.USDT, BSC_TOKENS.USDC],
        metaTokens: undefined,
        gasSchedule: 140e3,
    },
};

export const SYNAPSE_BSC_INFOS: { [name: string]: CurveInfo } = {
    [SYNAPSE_BSC_POOLS.nUSDLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_BSC_POOLS.nUSDLP,
        tokens: [BSC_TOKENS.nUSD, BSC_TOKENS.BUSD, BSC_TOKENS.USDC, BSC_TOKENS.USDT],
        metaTokens: undefined,
        gasSchedule: 140e3,
    },
};

export const SYNAPSE_FANTOM_INFOS: { [name: string]: CurveInfo } = {
    [SYNAPSE_FANTOM_POOLS.nUSDLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_FANTOM_POOLS.nUSDLP,
        tokens: [FANTOM_TOKENS.nUSD, FANTOM_TOKENS.MIM, FANTOM_TOKENS.USDC, FANTOM_TOKENS.fUSDT],
        metaTokens: undefined,
        gasSchedule: 140e3,
    },
};

export const SYNAPSE_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [SYNAPSE_MAINNET_POOLS.nUSDLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_MAINNET_POOLS.nUSDLP,
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        metaTokens: undefined,
        gasSchedule: 140e3,
    },
};

export const SYNAPSE_OPTIMISM_INFOS: { [name: string]: CurveInfo } = {
    [SYNAPSE_OPTIMISM_POOLS.nETHLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_OPTIMISM_POOLS.nETHLP,
        tokens: [OPTIMISM_TOKENS.nETH, OPTIMISM_TOKENS.sWETH],
        metaTokens: undefined,
        gasSchedule: 140e3,
    },
};

export const SYNAPSE_POLYGON_INFOS: { [name: string]: CurveInfo } = {
    [SYNAPSE_POLYGON_POOLS.nUSDLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_POLYGON_POOLS.nUSDLP,
        tokens: [POLYGON_TOKENS.nUSD, POLYGON_TOKENS.DAI, POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT],
        metaTokens: undefined,
        gasSchedule: 140e3,
    },
};

export const SYNAPSE_AVALANCHE_INFOS: { [name: string]: CurveInfo } = {
    [SYNAPSE_AVALANCHE_POOLS.nUSDLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_AVALANCHE_POOLS.nUSDLP,
        tokens: [AVALANCHE_TOKENS.nUSD, AVALANCHE_TOKENS.DAI, AVALANCHE_TOKENS.USDC, AVALANCHE_TOKENS.USDT],
        metaTokens: undefined,
        gasSchedule: 140e3,
    },
    [SYNAPSE_AVALANCHE_POOLS.nETHLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_AVALANCHE_POOLS.nETHLP,
        tokens: [AVALANCHE_TOKENS.nETH, AVALANCHE_TOKENS.aWETH],
        metaTokens: undefined,
        gasSchedule: 140e3,
    },
};

export const SYNAPSE_ARBITRUM_INFOS: { [name: string]: CurveInfo } = {
    [SYNAPSE_ARBITRUM_POOLS.nUSDLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_ARBITRUM_POOLS.nUSDLP,
        tokens: [ARBITRUM_TOKENS.nUSD, ARBITRUM_TOKENS.MIM, ARBITRUM_TOKENS.USDC, ARBITRUM_TOKENS.USDT],
        metaTokens: undefined,
        gasSchedule: 200e3,
    },
    [SYNAPSE_ARBITRUM_POOLS.nETHLP]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SYNAPSE_ARBITRUM_POOLS.nETHLP,
        tokens: [ARBITRUM_TOKENS.nETH, ARBITRUM_TOKENS.WETH],
        metaTokens: undefined,
        gasSchedule: 175e3,
    },
};

export const FIREBIRDONESWAP_BSC_INFOS: { [name: string]: CurveInfo } = {
    [FIREBIRDONESWAP_BSC_POOLS.oneswap]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: FIREBIRDONESWAP_BSC_POOLS.oneswap,
        tokens: [BSC_TOKENS.BUSD, BSC_TOKENS.USDT, BSC_TOKENS.DAI, BSC_TOKENS.USDC],
        metaTokens: undefined,
        gasSchedule: 100e3,
    },
};

export const FIREBIRDONESWAP_POLYGON_INFOS: { [name: string]: CurveInfo } = {
    [FIREBIRDONESWAP_POLYGON_POOLS.oneswap]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: FIREBIRDONESWAP_POLYGON_POOLS.oneswap,
        tokens: [POLYGON_TOKENS.DAI, POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT],
        metaTokens: undefined,
        gasSchedule: 100e3,
    },
};

export const MOBIUSMONEY_CELO_INFOS: { [name: string]: CurveInfo } = {
    [MOBIUSMONEY_CELO_POOLS.usdc_optics_v2]: {
        ...MOBIUSMONEY_CELO_SHARED,
        poolAddress: MOBIUSMONEY_CELO_POOLS.usdc_optics_v2,
        tokens: [CELO_TOKENS.cUSD, CELO_TOKENS.cUSDC_V2],
    },
    [MOBIUSMONEY_CELO_POOLS.weth_optics_v2]: {
        ...MOBIUSMONEY_CELO_SHARED,
        poolAddress: MOBIUSMONEY_CELO_POOLS.weth_optics_v2,
        tokens: [CELO_TOKENS.cETH, CELO_TOKENS.oWETH],
    },
    [MOBIUSMONEY_CELO_POOLS.pusdc_optics_v2]: {
        ...MOBIUSMONEY_CELO_SHARED,
        poolAddress: MOBIUSMONEY_CELO_POOLS.pusdc_optics_v2,
        tokens: [CELO_TOKENS.cUSD, CELO_TOKENS.pUSDC_V2],
    },
    [MOBIUSMONEY_CELO_POOLS.usdc_allbridge_solana]: {
        ...MOBIUSMONEY_CELO_SHARED,
        poolAddress: MOBIUSMONEY_CELO_POOLS.usdc_allbridge_solana,
        tokens: [CELO_TOKENS.cUSD, CELO_TOKENS.asUSDC],
    },
    [MOBIUSMONEY_CELO_POOLS.usdc_poly_optics]: {
        ...MOBIUSMONEY_CELO_SHARED,
        poolAddress: MOBIUSMONEY_CELO_POOLS.usdc_poly_optics,
        tokens: [CELO_TOKENS.cUSD, CELO_TOKENS.pUSD],
    },
    [MOBIUSMONEY_CELO_POOLS.dai_optics_v2]: {
        ...MOBIUSMONEY_CELO_SHARED,
        poolAddress: MOBIUSMONEY_CELO_POOLS.dai_optics_v2,
        tokens: [CELO_TOKENS.cUSD, CELO_TOKENS.DAI],
    },
};

export const PLATYPUS_AVALANCHE_INFOS: { [name: string]: PlatypusInfo } = {
    [PLATYPUS_AVALANCHE_POOLS.usd]: {
        poolAddress: PLATYPUS_AVALANCHE_POOLS.usd,
        tokens: [
            AVALANCHE_TOKENS.USDT,
            AVALANCHE_TOKENS.USDC,
            AVALANCHE_TOKENS.DAI,
            AVALANCHE_TOKENS.nUSDC,
            AVALANCHE_TOKENS.USDt,
        ],
        gasSchedule: 300e3,
    },
    [PLATYPUS_AVALANCHE_POOLS.yusd]: {
        poolAddress: PLATYPUS_AVALANCHE_POOLS.yusd,
        tokens: [AVALANCHE_TOKENS.YUSD, AVALANCHE_TOKENS.nUSDC],
        gasSchedule: 300e3,
    },
    [PLATYPUS_AVALANCHE_POOLS.frax]: {
        poolAddress: PLATYPUS_AVALANCHE_POOLS.frax,
        tokens: [AVALANCHE_TOKENS.FRAX, AVALANCHE_TOKENS.nUSDC],
        gasSchedule: 300e3,
    },
    [PLATYPUS_AVALANCHE_POOLS.mim]: {
        poolAddress: PLATYPUS_AVALANCHE_POOLS.mim,
        tokens: [AVALANCHE_TOKENS.MIM, AVALANCHE_TOKENS.nUSDC],
        gasSchedule: 300e3,
    },
    [PLATYPUS_AVALANCHE_POOLS.sAVAX]: {
        poolAddress: PLATYPUS_AVALANCHE_POOLS.sAVAX,
        tokens: [AVALANCHE_TOKENS.WAVAX, AVALANCHE_TOKENS.sAVAX],
        gasSchedule: 300e3,
    },
};

export const UNISWAPV1_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xc0a47dfe034b400b47bdad5fecda2621de6c4d95',
        [ChainId.Goerli]: '0x6ce570d02d73d4c384b46135e87f8c592a8c86da',
    },
    NULL_ADDRESS,
);

export const UNISWAPV2_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
        [ChainId.Goerli]: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
    },
    NULL_ADDRESS,
);

export const SUSHISWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
        [ChainId.BSC]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Goerli]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Polygon]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Avalanche]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Fantom]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Celo]: '0x1421bde4b10e8dd459b3bcb598810b1337d56842',
        [ChainId.Arbitrum]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
    },
    NULL_ADDRESS,
);

export const CRYPTO_COM_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xceb90e4c17d626be0facd78b79c9c87d7ca181b3',
    },
    NULL_ADDRESS,
);

export const SHIBASWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x03f7724180aa6b939894b5ca4314783b0b36b329',
    },
    NULL_ADDRESS,
);

export const DYSTOPIA_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Polygon]: '0xbe75dd16d029c6b32b7ad57a0fd9c1c20dd2862e',
    },
    NULL_ADDRESS,
);

export const MSTABLE_POOLS_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            mUSD: {
                poolAddress: '0xe2f2a5c287993345a840db3b0845fbc70f5935a5',
                tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
            },
            mBTC: {
                poolAddress: '0x945facb997494cc2570096c74b5f66a3507330a1',
                tokens: [MAINNET_TOKENS.WBTC, MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.sBTC],
            },
        },
        [ChainId.Polygon]: {
            mUSD: {
                poolAddress: '0xe840b73e5287865eec17d250bfb1536704b43b21',
                tokens: [POLYGON_TOKENS.DAI, POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT],
            },
            mBTC: {
                poolAddress: NULL_ADDRESS,
                tokens: [] as string[],
            },
        },
    },
    {
        mUSD: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
        mBTC: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
    },
);

export const KYBER_DMM_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x1c87257f5e8609940bc751a07bb085bb7f8cdbe6',
        [ChainId.Polygon]: '0x546c79662e028b661dfb4767664d0273184e4dd1',
        [ChainId.BSC]: '0x78df70615ffc8066cc0887917f2cd72092c86409',
        [ChainId.Avalanche]: '0x8efa5a9ad6d594cf76830267077b78ce0bc5a5f8',
        [ChainId.Fantom]: '0x5d5a5a0a465129848c2549669e12cdc2f8de039a',
    },
    NULL_ADDRESS,
);

export const BISWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0x3a6d8ca21d1cf76f653a67577fa0d27453350dd8',
    },
    NULL_ADDRESS,
);

export const MDEX_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0x7dae51bd3e3376b8c7c4900e9107f12be3af1ba8',
    },
    NULL_ADDRESS,
);

export const KNIGHTSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0x05e61e0cdcd2170a76f9568a110cee3afdd6c46f',
    },
    NULL_ADDRESS,
);

export const MOONISWAP_REGISTRIES_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.BSC]: ['0xd41b24bba51fac0e4827b6f94c0d6ddeb183cd64'],
    },
    [] as string[],
);

export const DODOV1_CONFIG_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            helper: '0x533da777aedce766ceae696bf90f8541a4ba80eb',
            registry: '0x3a97247df274a17c59a3bd12735ea3fcdfb49950',
        },
        [ChainId.BSC]: {
            helper: '0x0f859706aee7fcf61d5a8939e8cb9dbb6c1eda33',
            registry: '0xca459456a45e300aa7ef447dbb60f87cccb42828',
        },
        [ChainId.Polygon]: {
            helper: '0xdfaf9584f5d229a9dbe5978523317820a8897c5a',
            registry: '0x357c5e9cfa8b834edcef7c7aabd8f9db09119d11',
        },
    },
    { helper: NULL_ADDRESS, registry: NULL_ADDRESS },
);

export const DODOV2_FACTORIES_BY_CHAIN_ID = valueByChainId<string[]>(
    {
        [ChainId.Mainnet]: [
            '0x6b4fa0bc61eddc928e0df9c7f01e407bfcd3e5ef', // Private Pool
            '0x72d220ce168c4f361dd4dee5d826a01ad8598f6c', // Vending Machine
            '0x6fddb76c93299d985f4d3fc7ac468f9a168577a4', // Stability Pool
        ],
        [ChainId.BSC]: [
            '0xafe0a75dffb395eaabd0a7e1bbbd0b11f8609eef', // Private Pool
            '0x790b4a80fb1094589a3c0efc8740aa9b0c1733fb', // Vending Machine
            '0x0fb9815938ad069bf90e14fe6c596c514bede767', // Stability Pool
        ],
        [ChainId.Polygon]: [
            '0x95e887adf9eaa22cc1c6e3cb7f07adc95b4b25a8', // Private Pool
            '0x79887f65f83bdf15bcc8736b5e5bcdb48fb8fe13', // Vending Machine
            '0x43c49f8dd240e1545f147211ec9f917376ac1e87', // Stability Pool
        ],
        [ChainId.Arbitrum]: [
            '0xa6cf3d163358af376ec5e8b7cc5e102a05fde63d', // Private Pool
            '0xda4c4411c55b0785e501332354a036c04833b72b', // Vending Machine
            '0xc8fe2440744dcd733246a4db14093664defd5a53', // Stability Pool
        ],
    },
    [] as string[],
);
export const MAX_DODOV2_POOLS_QUERIED = 3;

export const CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x561b94454b65614ae3db0897b74303f4acf7cc75',
    },
    NULL_ADDRESS,
);

export const MAKER_PSM_INFO_BY_CHAIN_ID = valueByChainId<PsmInfo>(
    {
        [ChainId.Mainnet]: {
            // Currently only USDC is supported
            gemTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ilkIdentifier: formatBytes32String('PSM-USDC-A'),
            psmAddress: '0x89b78cfa322f6c5de0abceecab66aee45393cc5a',
        },
    },
    {
        gemTokenAddress: NULL_ADDRESS,
        ilkIdentifier: NULL_BYTES,
        psmAddress: NULL_ADDRESS,
    },
);

export const BANCOR_REGISTRY_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x52ae12abe5d8bd778bd5397f99ca900624cfadd4',
    },
    NULL_ADDRESS,
);

export const BANCORV3_NETWORK_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xeef417e1d5cc832e619ae18d2f140de2999dd4fb',
    },
    NULL_ADDRESS,
);

export const BANCORV3_NETWORK_INFO_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x8e303d296851b320e6a697bacb979d13c9d6e760',
    },
    NULL_ADDRESS,
);

export const SHELL_POOLS_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            StableCoins: {
                poolAddress: '0x8f26d7bab7a73309141a291525c965ecdea7bf42',
                tokens: [MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT, MAINNET_TOKENS.sUSD, MAINNET_TOKENS.DAI],
            },
            Bitcoin: {
                poolAddress: '0xc2d019b901f8d4fdb2b9a65b5d226ad88c66ee8d',
                tokens: [MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.sBTC],
            },
        },
    },
    {
        StableCoins: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
        Bitcoin: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
    },
);

export const COMPONENT_POOLS_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            USDP_USDC_USDT: {
                poolAddress: '0x49519631b404e06ca79c9c7b0dc91648d86f08db',
                tokens: [MAINNET_TOKENS.USDP, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
            },
            USDP_DAI_SUSD: {
                poolAddress: '0x6477960dd932d29518d7e8087d5ea3d11e606068',
                tokens: [MAINNET_TOKENS.USDP, MAINNET_TOKENS.DAI, MAINNET_TOKENS.sUSD],
            },
        },
    },
    {
        USDP_USDC_USDT: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
        USDP_DAI_SUSD: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
    },
);

export const BALANCER_V2_VAULT_ADDRESS_BY_CHAIN = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        [ChainId.Polygon]: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        [ChainId.Arbitrum]: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        [ChainId.Fantom]: '0x20dd72ed959b6147912c2e529f0a0c651c33c9ce',
        [ChainId.Optimism]: '0xba12222222228d8ba445958a75a0704d566bf2c8',
    },
    NULL_ADDRESS,
);

export const LIDO_INFO_BY_CHAIN = valueByChainId<LidoInfo>(
    {
        [ChainId.Mainnet]: {
            stEthToken: MAINNET_TOKENS.stETH,
            wstEthToken: MAINNET_TOKENS.wstETH,
            wethToken: MAINNET_TOKENS.WETH,
        },
    },
    {
        wstEthToken: NULL_ADDRESS,
        stEthToken: NULL_ADDRESS,
        wethToken: NULL_ADDRESS,
    },
);

export const BALANCER_TOP_POOLS_FETCHED = 250;
export const BALANCER_MAX_POOLS_FETCHED = 3;

export const BALANCER_V2_SUBGRAPH_URL_BY_CHAIN = valueByChainId(
    {
        [ChainId.Mainnet]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
        [ChainId.Polygon]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
        [ChainId.Arbitrum]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-arbitrum-v2',
        [ChainId.Fantom]: 'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx',
        [ChainId.Optimism]: 'https://api.thegraph.com/subgraphs/name/beethovenxfi/beethovenx-optimism',
    },
    null,
);

export const UNISWAPV3_CONFIG_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.Goerli]: {
            factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.PolygonMumbai]: {
            factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.Polygon]: {
            factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.Optimism]: {
            factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.Arbitrum]: {
            factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
    },
    { factory: NULL_ADDRESS, router: NULL_ADDRESS },
);

export const AAVE_V2_SUBGRAPH_URL_BY_CHAIN_ID = valueByChainId(
    {
        // TODO: enable after FQT has been redeployed on Ethereum mainnet
        [ChainId.Mainnet]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v2',
        [ChainId.Polygon]: 'https://api.thegraph.com/subgraphs/name/aave/aave-v2-matic',
        [ChainId.Avalanche]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v2-avalanche',
    },
    null,
);

export const AAVE_V3_SUBGRAPH_URL_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Polygon]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-polygon',
        [ChainId.Avalanche]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-avalanche',
        [ChainId.Arbitrum]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-arbitrum',
        [ChainId.Optimism]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-optimism',
    },
    null,
);

export const AAVE_V3_L2_ENCODERS_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Arbitrum]: '0x9abadecd08572e0ea5af4d47a9c7984a5aa503dc',
        [ChainId.Optimism]: '0x9abadecd08572e0ea5af4d47a9c7984a5aa503dc',
    },
    NULL_ADDRESS,
);

export const COMPOUND_API_URL_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: 'https://api.compound.finance/api/v2',
    },
    null,
);

//
// BSC
//
export const PANCAKESWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0x05ff2b0db69458a0750badebc4f9e13add608c7f',
    },
    NULL_ADDRESS,
);

export const PANCAKESWAPV2_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
    },
    NULL_ADDRESS,
);

export const BAKERYSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0xcde540d7eafe93ac5fe6233bee57e1270d3e330f',
    },
    NULL_ADDRESS,
);

export const APESWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0xc0788a3ad43d79aa53b09c2eacc313a787d1d607',
        [ChainId.Polygon]: '0xc0788a3ad43d79aa53b09c2eacc313a787d1d607',
    },
    NULL_ADDRESS,
);

//
// Polygon
//
export const QUICKSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Polygon]: '0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff',
    },
    NULL_ADDRESS,
);

export const DFYN_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Polygon]: '0xa102072a4c07f06ec3b4900fdc4c7b80b6c57429',
    },
    NULL_ADDRESS,
);

export const WAULTSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0xd48745e39bbed146eec15b79cbf964884f9877c2',
        [ChainId.Polygon]: '0x3a1d87f206d12415f5b0a33e786967680aab4f6d',
    },
    NULL_ADDRESS,
);

export const MESHSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Polygon]: '0x10f4a785f458bc144e3706575924889954946639',
    },
    NULL_ADDRESS,
);

export const PANGOLIN_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Avalanche]: '0xe54ca86531e17ef3616d22ca28b0d458b6c89106',
    },
    NULL_ADDRESS,
);

export const TRADER_JOE_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Avalanche]: '0x60ae616a2155ee3d9a68541ba4544862310933d4',
    },
    NULL_ADDRESS,
);

export const UBESWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Celo]: '0x7d28570135a2b1930f331c507f65039d4937f66c',
    },
    NULL_ADDRESS,
);

export const MORPHEUSSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Fantom]: '0x8ac868293d97761a1fed6d4a01e9ff17c5594aa3',
    },
    NULL_ADDRESS,
);

export const SPIRITSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Fantom]: '0x16327e3fbdaca3bcf7e38f5af2599d2ddc33ae52',
    },
    NULL_ADDRESS,
);

export const SPOOKYSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Fantom]: '0xf491e7b69e4244ad4002bc14e878a34207e38c29',
    },
    NULL_ADDRESS,
);

export const GMX_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Avalanche]: '0x5f719c2f1095f7b9fc68a68e35b51194f4b6abe8',
        [ChainId.Arbitrum]: '0xabbc5f99639c9b6bcb58544ddf04efa6802f4064',
    },
    NULL_ADDRESS,
);

export const GMX_READER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Avalanche]: '0x67b789d48c926006f5132bfce4e976f0a7a63d5d',
        [ChainId.Arbitrum]: '0x22199a49a999c351ef7927602cfb187ec3cae489',
    },
    NULL_ADDRESS,
);

export const GMX_VAULT_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Avalanche]: '0x9ab2de34a33fb459b538c43f251eb825645e8595',
        [ChainId.Arbitrum]: '0x489ee077994b6658eafa855c308275ead8097c4a',
    },
    NULL_ADDRESS,
);

export const PLATYPUS_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Avalanche]: '0x73256ec7575d999c360c1eec118ecbefd8da7d12',
    },
    NULL_ADDRESS,
);

export const YOSHI_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Fantom]: '0xe4a4642b19c4d0cba965673cd51422b1eda0a78d',
    },
    NULL_ADDRESS,
);

export const VELODROME_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Optimism]: '0xa132dab612db5cb9fc9ac426a0cc215a3423f9c9',
    },
    NULL_ADDRESS,
);

export const SYNTHETIX_READ_PROXY_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x4e3b31eb0e5cb73641ee1e65e7dcefe520ba3ef2',
        [ChainId.Optimism]: '0x1cb059b7e74fd21665968c908806143e744d5f30',
    },
    NULL_ADDRESS,
);

export const SYNTHETIX_CURRENCY_KEYS_BY_CHAIN_ID = valueByChainId<Map<string, string>>(
    {
        // There is no easy way to find out what synths are supported on mainnet.
        // The below list is based on https://sips.synthetix.io/sccp/sccp-190.
        [ChainId.Mainnet]: new Map([
            [MAINNET_TOKENS.sAUD, 'sAUD'],
            [MAINNET_TOKENS.sBTC, 'sBTC'],
            [MAINNET_TOKENS.sCHF, 'sCHF'],
            [MAINNET_TOKENS.sETH, 'sETH'],
            [MAINNET_TOKENS.sEUR, 'sEUR'],
            [MAINNET_TOKENS.sGBP, 'sGBP'],
            [MAINNET_TOKENS.sJPY, 'sJPY'],
            [MAINNET_TOKENS.sKRW, 'sKRW'],
            [MAINNET_TOKENS.sUSD, 'sUSD'],
        ]),
        // Supported assets can be find through SynthUtil::synthsRates.
        // Low liquidity tokens can be excluded.
        [ChainId.Optimism]: new Map([
            [OPTIMISM_TOKENS.sAAVE, 'sAAVE'],
            [OPTIMISM_TOKENS.sAVAX, 'sAVAX'],
            [OPTIMISM_TOKENS.sBTC, 'sBTC'],
            [OPTIMISM_TOKENS.sETH, 'sETH'],
            [OPTIMISM_TOKENS.sEUR, 'sEUR'],
            [OPTIMISM_TOKENS.sLINK, 'sLINK'],
            [OPTIMISM_TOKENS.sMATIC, 'sMATIC'],
            [OPTIMISM_TOKENS.sSOL, 'sSOL'],
            [OPTIMISM_TOKENS.sUNI, 'sUNI'],
            [OPTIMISM_TOKENS.sUSD, 'sUSD'],
        ]),
    },
    new Map(),
);

export const VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID = valueByChainId<Set<ERC20BridgeSource>>(
    {
        [ChainId.Mainnet]: Set.of(
            ERC20BridgeSource.UniswapV2,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.Native,
        ),
        [ChainId.BSC]: Set.of(
            ERC20BridgeSource.PancakeSwap,
            ERC20BridgeSource.PancakeSwapV2,
            ERC20BridgeSource.BakerySwap,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.ApeSwap,
            ERC20BridgeSource.Native,
        ),
    },
    Set.of(),
);

const uniswapV2CloneGasSchedule = (fillData?: FillData) => {
    const uniV2FillData = fillData as UniswapV2FillData;
    // TODO: Different base cost if to/from ETH.
    let gas = 90e3;
    const path = (uniV2FillData as UniswapV2FillData).tokenAddressPath;
    if (path.length > 2) {
        gas += (path.length - 2) * 60e3; // +60k for each hop.
    }
    return gas;
};

/**
 * Calculated gross gas cost of the underlying exchange.
 * The cost of switching from one source to another, assuming
 * we are in the middle of a transaction.
 * I.e remove the overhead cost of ExchangeProxy (130k) and
 * the ethereum transaction cost (21k)
 */
export const DEFAULT_GAS_SCHEDULE: GasSchedule = {
    [ERC20BridgeSource.Native]: (fillData) => {
        // TODO jacob re-order imports so there is no circular rependency with SignedNativeOrder
        const nativeFillData = fillData as { type: FillQuoteTransformerOrderType };
        if (!nativeFillData || nativeFillData.type === undefined) {
            return 100e3;
        }
        switch (nativeFillData.type) {
            case FillQuoteTransformerOrderType.Limit:
                // TODO jacob revisit wth v4 LimitOrders
                return PROTOCOL_FEE_MULTIPLIER.plus(100e3).toNumber();
            case FillQuoteTransformerOrderType.Rfq:
            case FillQuoteTransformerOrderType.Bridge:
                // Should never hit a Bridge order, but if it does, set it to the same as RfqOrder to preserve old logic
                return 100e3;
            case FillQuoteTransformerOrderType.Otc:
                return 85e3;
            default:
                ((_: never) => {
                    throw new Error('unreachable');
                })(nativeFillData.type);
        }
    },
    [ERC20BridgeSource.Uniswap]: () => 90e3,
    [ERC20BridgeSource.Curve]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.CurveV2]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Nerve]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Synapse]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Belt]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Ellipsis]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Saddle]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.IronSwap]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.FirebirdOneSwap]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.MobiusMoney]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.UniswapV2]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.SushiSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.CryptoCom]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.ShibaSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.BiSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.MDex]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.KnightSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.Balancer]: () => 120e3,
    [ERC20BridgeSource.BalancerV2]: (fillData?: FillData) => {
        return 140e3 + ((fillData as BalancerV2BatchSwapFillData).swapSteps.length - 1) * 80e3;
    },
    [ERC20BridgeSource.MStable]: () => 200e3,
    [ERC20BridgeSource.MakerPsm]: (fillData?: FillData) => {
        const psmFillData = fillData as MakerPsmFillData;
        return psmFillData.takerToken === psmFillData.gemTokenAddress ? 210e3 : 290e3;
    },
    [ERC20BridgeSource.Mooniswap]: () => 130e3,
    [ERC20BridgeSource.Shell]: () => 170e3,
    [ERC20BridgeSource.Component]: () => 188e3,
    [ERC20BridgeSource.MultiHop]: (fillData?: FillData) => {
        const firstHop = (fillData as MultiHopFillData).firstHopSource;
        const secondHop = (fillData as MultiHopFillData).secondHopSource;
        const firstHopGas = DEFAULT_GAS_SCHEDULE[firstHop.source](firstHop.fillData);
        const secondHopGas = DEFAULT_GAS_SCHEDULE[secondHop.source](secondHop.fillData);
        return new BigNumber(firstHopGas).plus(secondHopGas).plus(30e3).toNumber();
    },
    [ERC20BridgeSource.Dodo]: (fillData?: FillData) => {
        const isSellBase = (fillData as DODOFillData).isSellBase;
        // Sell base is cheaper as it is natively supported
        // sell quote requires additional calculation and overhead
        return isSellBase ? 180e3 : 300e3;
    },
    [ERC20BridgeSource.DodoV2]: (_fillData?: FillData) => 100e3,
    [ERC20BridgeSource.Bancor]: (fillData?: FillData) => {
        let gas = 200e3;
        const path = (fillData as BancorFillData).path;
        if (path.length > 2) {
            gas += (path.length - 2) * 60e3; // +60k for each hop.
        }
        return gas;
    },
    [ERC20BridgeSource.BancorV3]: () => 250e3, // revisit gas costs with wrap/unwrap
    [ERC20BridgeSource.KyberDmm]: (fillData?: FillData) => {
        let gas = 170e3;
        const path = (fillData as UniswapV2FillData).tokenAddressPath;
        if (path.length > 2) {
            gas += (path.length - 2) * 65e3; // +65k for each hop.
        }
        return gas;
    },
    [ERC20BridgeSource.UniswapV3]: (fillData?: FillData) => {
        const uniFillData = fillData as TickDEXMultiPathFillData | FinalTickDEXMultiPathFillData;
        // NOTE: This base value was heuristically chosen by looking at how much it generally
        // underestimated gas usage
        const base = 34e3; // 34k base
        let gas = base;
        if (isFinalPathFillData(uniFillData)) {
            gas += uniFillData.gasUsed;
        } else {
            // NOTE: We don't actually know which of the paths would be used in the router
            // therefore we estimate using the median of gas usage returned from UniswapV3
            // For the best case scenario (least amount of hops & ticks) this will
            // overestimate the gas usage
            const pathAmountsWithGasUsed = uniFillData.pathAmounts.filter((p) => p.gasUsed > 0);
            const medianGasUsedForPath =
                pathAmountsWithGasUsed[Math.floor(pathAmountsWithGasUsed.length / 2)]?.gasUsed ?? 0;
            gas += medianGasUsedForPath;
        }

        // If we for some reason could not read `gasUsed` when sampling
        // fall back to legacy gas estimation
        if (gas === base) {
            gas = 100e3;
            const path = uniFillData.tokenAddressPath;
            if (path.length > 2) {
                gas += (path.length - 2) * 32e3; // +32k for each hop.
            }
        }

        return gas;
    },
    [ERC20BridgeSource.Lido]: (fillData?: FillData) => {
        const lidoFillData = fillData as LidoFillData;
        const wethAddress = NATIVE_FEE_TOKEN_BY_CHAIN_ID[ChainId.Mainnet];
        // WETH -> stETH
        if (lidoFillData.takerToken === wethAddress) {
            return 226e3;
        } else if (lidoFillData.takerToken === lidoFillData.stEthTokenAddress) {
            return 120e3;
        } else {
            return 95e3;
        }
    },
    [ERC20BridgeSource.AaveV2]: (fillData?: FillData) => {
        const aaveFillData = fillData as AaveV2FillData;
        // NOTE: The Aave deposit method is more expensive than the withdraw
        return aaveFillData.takerToken === aaveFillData.underlyingToken ? 400e3 : 300e3;
    },
    [ERC20BridgeSource.AaveV3]: (fillData?: FillData) => {
        const aaveFillData = fillData as AaveV2FillData;
        // NOTE: The Aave deposit method is more expensive than the withdraw
        return aaveFillData.takerToken === aaveFillData.underlyingToken ? 400e3 : 300e3;
    },
    [ERC20BridgeSource.Compound]: (fillData?: FillData) => {
        // NOTE: cETH is handled differently than other cTokens
        const wethAddress = NATIVE_FEE_TOKEN_BY_CHAIN_ID[ChainId.Mainnet];
        const compoundFillData = fillData as CompoundFillData;
        if (compoundFillData.takerToken === compoundFillData.cToken) {
            return compoundFillData.makerToken === wethAddress ? 120e3 : 150e3;
        } else {
            return compoundFillData.takerToken === wethAddress ? 210e3 : 250e3;
        }
    },
    [ERC20BridgeSource.Synthetix]: (fillData?: FillData) => {
        const { chainId, makerTokenSymbolBytes32, takerTokenSymbolBytes32 } = fillData as SynthetixFillData;
        const makerTokenSymbol = parseBytes32String(makerTokenSymbolBytes32);
        const takerTokenSymbol = parseBytes32String(takerTokenSymbolBytes32);

        // Gas cost widely varies by token on mainnet.
        if (chainId === ChainId.Mainnet) {
            if (takerTokenSymbol === 'sBTC' || makerTokenSymbol === 'sBTC') {
                return 800e3;
            }
            if (takerTokenSymbol === 'sETH' || makerTokenSymbol === 'sETH') {
                return 700e3;
            }
            return 580e3;
        }

        // Optimism
        if (takerTokenSymbol === 'sUSD' || makerTokenSymbol === 'sUSD') {
            return 480e3;
        }
        return 580e3;
    },
    //
    // BSC
    //
    [ERC20BridgeSource.PancakeSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.PancakeSwapV2]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.BakerySwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.ApeSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.WaultSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.ACryptos]: (fillData) => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.WOOFi]: (fillData?: FillData) => {
        const woofiFillData = fillData as WOOFiFillData;
        const quoteTokenAddresses = [
            BSC_TOKENS.BUSD,
            AVALANCHE_TOKENS.nUSDC,
            FANTOM_TOKENS.USDC,
            POLYGON_TOKENS.USDC,
            ARBITRUM_TOKENS.USDC,
            OPTIMISM_TOKENS.USDC,
        ];
        const hasQuoteToken =
            quoteTokenAddresses.includes(woofiFillData.takerToken) ||
            quoteTokenAddresses.includes(woofiFillData.makerToken);
        if (woofiFillData.chainId === ChainId.BSC) {
            if (hasQuoteToken) {
                return 550e3;
            } else {
                return 100e4;
            }
        } else if (woofiFillData.chainId === ChainId.Avalanche) {
            if (hasQuoteToken) {
                return 300e3;
            } else {
                return 550e3;
            }
        } else if (woofiFillData.chainId === ChainId.Polygon) {
            if (hasQuoteToken) {
                return 500e3;
            } else {
                return 700e3;
            }
        } else {
            // Fantom
            if (hasQuoteToken) {
                return 400e3;
            } else {
                return 600e3;
            }
        }
    },
    //
    // Polygon
    //
    [ERC20BridgeSource.QuickSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.Dfyn]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.MeshSwap]: uniswapV2CloneGasSchedule,

    //
    // Avalanche
    //
    [ERC20BridgeSource.Pangolin]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.TraderJoe]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.GMX]: () => 450e3,
    [ERC20BridgeSource.Platypus]: () => 450e3,

    //
    // Celo
    //
    [ERC20BridgeSource.UbeSwap]: uniswapV2CloneGasSchedule,

    //
    // Fantom
    //
    [ERC20BridgeSource.MorpheusSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.SpiritSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.SpookySwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.Yoshi]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.Beethovenx]: (fillData?: FillData) => {
        const balancerFillData = fillData as BalancerV2BatchSwapFillData;
        if (balancerFillData.chainId === ChainId.Fantom) {
            return 125e3 + (balancerFillData.swapSteps.length - 1) * 50e3;
        }
        return 305e3 + (balancerFillData.swapSteps.length - 1) * 100e3;
    },
    //
    // Optimism
    //
    [ERC20BridgeSource.Velodrome]: () => 160e3,
    [ERC20BridgeSource.Dystopia]: () => 160e3,
};

const DEFAULT_FEE_SCHEDULE: FeeSchedule = Object.keys(DEFAULT_GAS_SCHEDULE).reduce((acc, key) => {
    acc[key as ERC20BridgeSource] = (fillData: FillData) => {
        return {
            gas: DEFAULT_GAS_SCHEDULE[key as ERC20BridgeSource](fillData),
            fee: ZERO_AMOUNT,
        };
    };
    return acc;
}, {} as FeeSchedule);

const numSamples = 40;
export const DEFAULT_GET_MARKET_ORDERS_OPTS: Omit<GetMarketOrdersOpts, 'gasPrice'> = {
    excludedSources: [],
    includedSources: [],
    bridgeSlippage: 0.005,
    numSamples: numSamples,
    sampleDistributionBase: 1,
    feeSchedule: DEFAULT_FEE_SCHEDULE,
    exchangeProxyOverhead: () => ZERO_AMOUNT,
    shouldGenerateQuoteReport: true,
    tokenAdjacencyGraph: TokenAdjacencyGraph.getEmptyGraph(),
    neonRouterNumSamples: numSamples + 1,
    fillAdjustor: new IdentityFillAdjustor(),
    endpoint: 'price',
};
