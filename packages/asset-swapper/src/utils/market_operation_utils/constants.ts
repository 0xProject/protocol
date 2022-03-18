import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { TokenAdjacencyGraphBuilder } from '../token_adjacency_graph_builder';
import { valueByChainId } from '../utils';

import { SourceFilters } from './source_filters';
import {
    ERC20BridgeSource,
    GetMarketOrdersOpts,
    TokenAdjacencyGraph,
} from './types';

// tslint:disable: custom-no-magic-numbers no-bitwise

export const ONE_ETHER = new BigNumber(1e18);
export const NEGATIVE_INF = new BigNumber('-Infinity');
export const POSITIVE_INF = new BigNumber('Infinity');
export const ZERO_AMOUNT = new BigNumber(0);
export const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
export const ONE_HOUR_IN_SECONDS = 60 * 60;
export const ONE_SECOND_MS = 1000;
export const NULL_BYTES = '0x';
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const COMPARISON_PRICE_DECIMALS = 10;

/**
 * Valid sources for market sell.
 */
export const SELL_SOURCE_FILTER_BY_CHAIN_ID = valueByChainId<SourceFilters>(
    {
        [ChainId.Mainnet]: new SourceFilters([
            ERC20BridgeSource.Native,
            ERC20BridgeSource.Uniswap,
            ERC20BridgeSource.UniswapV2,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.Balancer,
            ERC20BridgeSource.BalancerV2,
            ERC20BridgeSource.Bancor,
            ERC20BridgeSource.MStable,
            ERC20BridgeSource.Mooniswap,
            ERC20BridgeSource.Swerve,
            ERC20BridgeSource.SnowSwap,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.Shell,
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.Dodo,
            ERC20BridgeSource.DodoV2,
            ERC20BridgeSource.Cream,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.CryptoCom,
            ERC20BridgeSource.Linkswap,
            ERC20BridgeSource.Lido,
            ERC20BridgeSource.MakerPsm,
            ERC20BridgeSource.KyberDmm,
            ERC20BridgeSource.Smoothy,
            ERC20BridgeSource.Component,
            ERC20BridgeSource.Saddle,
            ERC20BridgeSource.XSigma,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.CurveV2,
            ERC20BridgeSource.ShibaSwap,
            ERC20BridgeSource.Synapse,
            // TODO: enable after FQT has been redeployed on Ethereum mainnet
            // ERC20BridgeSource.AaveV2,
            // ERC20BridgeSource.Compound,
        ]),
        [ChainId.Ropsten]: new SourceFilters([
            ERC20BridgeSource.Native,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.Uniswap,
            ERC20BridgeSource.UniswapV2,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.Mooniswap,
        ]),
        [ChainId.Rinkeby]: new SourceFilters([ERC20BridgeSource.Native]),
        [ChainId.Kovan]: new SourceFilters([ERC20BridgeSource.Native]),
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
            ERC20BridgeSource.Smoothy,
            ERC20BridgeSource.ApeSwap,
            ERC20BridgeSource.CafeSwap,
            ERC20BridgeSource.CheeseSwap,
            ERC20BridgeSource.JulSwap,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.WaultSwap,
            ERC20BridgeSource.FirebirdOneSwap,
            ERC20BridgeSource.JetSwap,
            ERC20BridgeSource.ACryptos,
            ERC20BridgeSource.KyberDmm,
        ]),
        [ChainId.Polygon]: new SourceFilters([
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.QuickSwap,
            ERC20BridgeSource.ComethSwap,
            ERC20BridgeSource.Dfyn,
            ERC20BridgeSource.MStable,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.DodoV2,
            ERC20BridgeSource.Dodo,
            ERC20BridgeSource.CurveV2,
            ERC20BridgeSource.WaultSwap,
            ERC20BridgeSource.Polydex,
            ERC20BridgeSource.ApeSwap,
            ERC20BridgeSource.FirebirdOneSwap,
            ERC20BridgeSource.BalancerV2,
            ERC20BridgeSource.KyberDmm,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.JetSwap,
            ERC20BridgeSource.IronSwap,
            ERC20BridgeSource.AaveV2,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.Synapse,
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
        ]),
        [ChainId.Fantom]: new SourceFilters([
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.Beethovenx,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.CurveV2,
            ERC20BridgeSource.Geist,
            ERC20BridgeSource.JetSwap,
            ERC20BridgeSource.MorpheusSwap,
            ERC20BridgeSource.SpiritSwap,
            ERC20BridgeSource.SpookySwap,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.Synapse,
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
        ]),
    },
    new SourceFilters([]),
);

/**
 * Valid sources for market buy.
 */
export const BUY_SOURCE_FILTER_BY_CHAIN_ID = valueByChainId<SourceFilters>(
    {
        [ChainId.Mainnet]: new SourceFilters([
            ERC20BridgeSource.Native,
            ERC20BridgeSource.Uniswap,
            ERC20BridgeSource.UniswapV2,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.Balancer,
            ERC20BridgeSource.BalancerV2,
            // ERC20BridgeSource.Bancor, // FIXME: Bancor Buys not implemented in Sampler
            ERC20BridgeSource.MStable,
            ERC20BridgeSource.Mooniswap,
            ERC20BridgeSource.Shell,
            ERC20BridgeSource.Swerve,
            ERC20BridgeSource.SnowSwap,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.Dodo,
            ERC20BridgeSource.DodoV2,
            ERC20BridgeSource.Cream,
            ERC20BridgeSource.Lido,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.CryptoCom,
            ERC20BridgeSource.Linkswap,
            ERC20BridgeSource.MakerPsm,
            ERC20BridgeSource.KyberDmm,
            ERC20BridgeSource.Smoothy,
            ERC20BridgeSource.Component,
            ERC20BridgeSource.Saddle,
            ERC20BridgeSource.XSigma,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.CurveV2,
            ERC20BridgeSource.ShibaSwap,
            ERC20BridgeSource.Synapse,
            // TODO: enable after FQT has been redeployed on Ethereum mainnet
            // ERC20BridgeSource.AaveV2,
            // ERC20BridgeSource.Compound,
        ]),
        [ChainId.Ropsten]: new SourceFilters([
            ERC20BridgeSource.Native,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.Uniswap,
            ERC20BridgeSource.UniswapV2,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.Mooniswap,
        ]),
        [ChainId.Rinkeby]: new SourceFilters([ERC20BridgeSource.Native]),
        [ChainId.Kovan]: new SourceFilters([ERC20BridgeSource.Native]),
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
            ERC20BridgeSource.Smoothy,
            ERC20BridgeSource.ApeSwap,
            ERC20BridgeSource.CafeSwap,
            ERC20BridgeSource.CheeseSwap,
            ERC20BridgeSource.JulSwap,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.WaultSwap,
            ERC20BridgeSource.FirebirdOneSwap,
            ERC20BridgeSource.JetSwap,
            ERC20BridgeSource.ACryptos,
            ERC20BridgeSource.KyberDmm,
            ERC20BridgeSource.Synapse,
        ]),
        [ChainId.Polygon]: new SourceFilters([
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.QuickSwap,
            ERC20BridgeSource.ComethSwap,
            ERC20BridgeSource.Dfyn,
            ERC20BridgeSource.MStable,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.DodoV2,
            ERC20BridgeSource.Dodo,
            ERC20BridgeSource.CurveV2,
            ERC20BridgeSource.WaultSwap,
            ERC20BridgeSource.Polydex,
            ERC20BridgeSource.ApeSwap,
            ERC20BridgeSource.FirebirdOneSwap,
            ERC20BridgeSource.BalancerV2,
            ERC20BridgeSource.KyberDmm,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.JetSwap,
            ERC20BridgeSource.IronSwap,
            ERC20BridgeSource.AaveV2,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.Synapse,
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
        ]),
        [ChainId.Fantom]: new SourceFilters([
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.Beethovenx,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.CurveV2,
            ERC20BridgeSource.Geist,
            ERC20BridgeSource.JetSwap,
            ERC20BridgeSource.MorpheusSwap,
            ERC20BridgeSource.SpiritSwap,
            ERC20BridgeSource.SpookySwap,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.Synapse,
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
        ]),
    },
    new SourceFilters([]),
);

/**
 *  0x Protocol Fee Multiplier
 */
export const PROTOCOL_FEE_MULTIPLIER = new BigNumber(0);

/**
 * Sources to poll for ETH fee price estimates.
 */
export const FEE_QUOTE_SOURCES_BY_CHAIN_ID = valueByChainId<ERC20BridgeSource[]>(
    {
        [ChainId.Mainnet]: [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap, ERC20BridgeSource.UniswapV3],
        [ChainId.BSC]: [ERC20BridgeSource.PancakeSwap, ERC20BridgeSource.Mooniswap, ERC20BridgeSource.SushiSwap],
        [ChainId.Ropsten]: [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap],
        [ChainId.Polygon]: [ERC20BridgeSource.QuickSwap, ERC20BridgeSource.SushiSwap, ERC20BridgeSource.UniswapV3],
        [ChainId.Avalanche]: [ERC20BridgeSource.Pangolin, ERC20BridgeSource.TraderJoe, ERC20BridgeSource.SushiSwap],
        [ChainId.Fantom]: [ERC20BridgeSource.SpiritSwap, ERC20BridgeSource.SpookySwap, ERC20BridgeSource.SushiSwap],
        [ChainId.Celo]: [ERC20BridgeSource.UbeSwap, ERC20BridgeSource.SushiSwap],
        [ChainId.Optimism]: [ERC20BridgeSource.UniswapV3],
    },
    [],
);

// HACK(mzhu25): Limit and RFQ orders need to be treated as different sources
//               when computing the exchange proxy gas overhead.
export const SOURCE_FLAGS: { [key in ERC20BridgeSource]: bigint } & {
    RfqOrder: bigint;
    LimitOrder: bigint;
} = Object.assign(
    {},
    ...['RfqOrder', 'LimitOrder', ...Object.values(ERC20BridgeSource)].map((source, index) => ({
        [source]: source === ERC20BridgeSource.Native ? BigInt(0) : BigInt(1) << BigInt(index),
    })),
);

export const VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID = valueByChainId<ERC20BridgeSource[]>(
    {
        [ChainId.Mainnet]: [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap, ERC20BridgeSource.UniswapV3],
        [ChainId.BSC]: [
            ERC20BridgeSource.PancakeSwap,
            ERC20BridgeSource.PancakeSwapV2,
            ERC20BridgeSource.BakerySwap,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.ApeSwap,
            ERC20BridgeSource.CafeSwap,
            ERC20BridgeSource.CheeseSwap,
            ERC20BridgeSource.JulSwap,
        ],
    },
    [],
);

// Mainnet tokens
// Not an exhaustive list, just enough so we don't repeat ourselves
export const MAINNET_TOKENS = {
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    UST: '0xa47c8bf37f92abed4a126bda807a7b7498661acd',
    MIR: '0x09a3ecafa817268f77be1283176b946c4ff2e608',
    // StableSwap "open pools" (crv.finance)
    STABLEx: '0xcd91538b91b4ba7797d39a2f66e63810b50a33d0',
    alUSD: '0xbc6da0fe9ad5f3b0d58160288917aa56653660e9',
    // Frax ecosystem
    FRAX: '0x853d955acef822db058eb8505911ed77f175b99e',
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
};

export const BSC_TOKENS = {
    WBNB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    USDT: '0x55d398326f99059ff775485246999027b3197955',
    USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    DAI: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
    UST: '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
    WEX: '0xa9c41a46a6b3531d28d5c32f6633dd2ff05dfb90',
    WETH: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
};

export const POLYGON_TOKENS = {
    DAI: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    USDT: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    WBTC: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    WMATIC: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    WETH: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    nUSD: '0xb6c473756050de474286bed418b77aeac39b02af',
};

export const AVALANCHE_TOKENS = {
    WAVAX: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    WETH: '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
    WBTC: '0x50b7545627a5162f82a992c33b87adc75187b218',
    // bridged USDC
    USDC: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
    // native USDC on Avalanche
    nUSDC: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    USDT: '0xc7198437980c041c805a1edcba50c1ce5db95118',
    aDAI: '0x47afa96cdc9fab46904a55a6ad4bf6660b53c38a',
    aUSDC: '0x46a51127c3ce23fb7ab1de06226147f446e4a857',
    aUSDT: '0x532e6537fea298397212f09a61e03311686f548e',
    nETH: '0x19e1ae0ee35c0404f835521146206595d37981ae',
    nUSD: '0xcfc37a6ab183dd4aed08c204d1c2773c0b1bdf46',
    aWETH: '0x53f7c5869a859f0aec3d334ee8b4cf01e3492f21',
    MIM: '0x130966628846bfd36ff31a822705796e8cb8c18d',
    DAI: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70',
};

export const CELO_TOKENS = {
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
};

export const GEIST_FANTOM_POOLS = {
    lendingPool: '0x9fad24f572045c7869117160a571b2e50b10d068',
};

export const OPTIMISM_TOKENS = {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    USDT: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    DAI: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    WBTC: '0x68f180fcce6836688e9084f035309e29bf0a2095',
    nETH: '0x809dc529f07651bd43a172e8db6f4a7a0d771036',
    sWETH: '0x121ab82b49b2bc4c7901ca46b8277962b4350204',
};

export const DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID = valueByChainId<string[]>(
    {
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
        [ChainId.Ropsten]: [
            getContractAddressesForChainOrThrow(ChainId.Ropsten).etherToken,
            '0xad6d458402f60fd3bd25163575031acdce07538d', // DAI
            '0x07865c6e87b9f70255377e024ace6630c1eaa37f', // USDC
        ],
        [ChainId.Polygon]: [
            POLYGON_TOKENS.WMATIC,
            POLYGON_TOKENS.WETH,
            POLYGON_TOKENS.USDC,
            POLYGON_TOKENS.DAI,
            POLYGON_TOKENS.USDT,
            POLYGON_TOKENS.WBTC,
            POLYGON_TOKENS.nUSD,
        ],
        [ChainId.Avalanche]: [
            AVALANCHE_TOKENS.WAVAX,
            AVALANCHE_TOKENS.WETH,
            AVALANCHE_TOKENS.DAI,
            AVALANCHE_TOKENS.USDT,
            AVALANCHE_TOKENS.USDC,
            AVALANCHE_TOKENS.nUSD,
            AVALANCHE_TOKENS.nETH,
            AVALANCHE_TOKENS.aWETH,
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
        ],
        [ChainId.Optimism]: [
            OPTIMISM_TOKENS.WETH,
            OPTIMISM_TOKENS.DAI,
            OPTIMISM_TOKENS.USDC,
            OPTIMISM_TOKENS.USDT,
            OPTIMISM_TOKENS.nETH,
            OPTIMISM_TOKENS.sWETH,
        ],
    },
    [],
);

// Note be careful here as a UNION is performed when finding intermediary tokens
// attaching to a default intermediary token (stables or ETH etc) can have a large impact
export const DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID = valueByChainId<TokenAdjacencyGraph>(
    {
        [ChainId.Mainnet]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Mainnet],
        })
            .tap(builder => {
                // Mirror Protocol
                builder.add(MAINNET_TOKENS.MIR, MAINNET_TOKENS.UST);
                // Convex and Curve
                builder.add(MAINNET_TOKENS.cvxCRV, MAINNET_TOKENS.CRV).add(MAINNET_TOKENS.CRV, MAINNET_TOKENS.cvxCRV);
                // FEI TRIBE liquid in UniV2
                builder.add(MAINNET_TOKENS.FEI, MAINNET_TOKENS.TRIBE).add(MAINNET_TOKENS.TRIBE, MAINNET_TOKENS.FEI);
                // FRAX ecosystem
                builder.add(MAINNET_TOKENS.FRAX, MAINNET_TOKENS.FXS).add(MAINNET_TOKENS.FXS, MAINNET_TOKENS.FRAX);
                builder.add(MAINNET_TOKENS.FRAX, MAINNET_TOKENS.OHM).add(MAINNET_TOKENS.OHM, MAINNET_TOKENS.FRAX);
                // REDACTED CARTEL
                builder
                    .add(MAINNET_TOKENS.OHMV2, MAINNET_TOKENS.BTRFLY)
                    .add(MAINNET_TOKENS.BTRFLY, MAINNET_TOKENS.OHMV2);
                // STARGATE
                builder.add(MAINNET_TOKENS.USDC, MAINNET_TOKENS.STG).add(MAINNET_TOKENS.STG, MAINNET_TOKENS.USDC);
            })
            // Build
            .build(),
        [ChainId.BSC]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.BSC],
        }).build(),
        [ChainId.Polygon]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Polygon],
        }).build(),
        [ChainId.Avalanche]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Avalanche],
        })
            .tap(builder => {
                // Synape nETH/aWETH pool
                builder
                    .add(AVALANCHE_TOKENS.aWETH, AVALANCHE_TOKENS.nETH)
                    .add(AVALANCHE_TOKENS.nETH, AVALANCHE_TOKENS.aWETH);
            })
            .build(),
        [ChainId.Fantom]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Fantom],
        }).build(),
        [ChainId.Celo]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Celo],
        }).build(),
        [ChainId.Optimism]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Optimism],
        }).build(),
    },
    new TokenAdjacencyGraphBuilder({ default: [] }).build(),
);

export const NATIVE_FEE_TOKEN_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: getContractAddressesForChainOrThrow(ChainId.Mainnet).etherToken,
        [ChainId.BSC]: getContractAddressesForChainOrThrow(ChainId.BSC).etherToken,
        [ChainId.Ganache]: getContractAddressesForChainOrThrow(ChainId.Ganache).etherToken,
        [ChainId.Ropsten]: getContractAddressesForChainOrThrow(ChainId.Ropsten).etherToken,
        [ChainId.Rinkeby]: getContractAddressesForChainOrThrow(ChainId.Rinkeby).etherToken,
        [ChainId.Kovan]: getContractAddressesForChainOrThrow(ChainId.Kovan).etherToken,
        [ChainId.Polygon]: getContractAddressesForChainOrThrow(ChainId.Polygon).etherToken,
        [ChainId.Avalanche]: getContractAddressesForChainOrThrow(ChainId.Avalanche).etherToken,
        [ChainId.Fantom]: getContractAddressesForChainOrThrow(ChainId.Fantom).etherToken,
        [ChainId.Celo]: getContractAddressesForChainOrThrow(ChainId.Celo).etherToken,
        [ChainId.Optimism]: getContractAddressesForChainOrThrow(ChainId.Optimism).etherToken,
    },
    NULL_ADDRESS,
);

<<<<<<< HEAD
=======
export const NATIVE_FEE_TOKEN_AMOUNT_BY_CHAIN_ID = valueByChainId(
    { [ChainId.Mainnet]: ONE_ETHER.times(0.1) },
    ONE_ETHER,
);

// Order dependent
const CURVE_TRI_POOL_MAINNET_TOKENS = [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT];
const CURVE_TRI_BTC_POOL_TOKEN = [MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.sBTC];
const CURVE_POLYGON_ATRICRYPTO_UNDERLYING_TOKENS = [POLYGON_TOKENS.DAI, POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT];
const CURVE_POLYGON_ATRICRYPTO_TOKENS = [POLYGON_TOKENS.amDAI, POLYGON_TOKENS.amUSDC, POLYGON_TOKENS.amUSDT];
const CURVE_FANTOM_TWO_POOL_TOKENS = [FANTOM_TOKENS.DAI, FANTOM_TOKENS.USDC];

const createCurveExchangePool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaTokens: undefined,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveExchangeUnderlyingPool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaTokens: undefined,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveMetaTriPool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [...info.tokens, ...CURVE_TRI_POOL_MAINNET_TOKENS],
    metaTokens: info.tokens,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveMetaTriBtcPool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [...info.tokens, ...CURVE_TRI_BTC_POOL_TOKEN],
    metaTokens: info.tokens,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveMetaTwoPoolFantom = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [...info.tokens, ...CURVE_FANTOM_TWO_POOL_TOKENS],
    metaTokens: info.tokens,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveExchangeV2Pool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_v2,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_v2,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaTokens: undefined,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveV2MetaTriPool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying_v2,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying_v2,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [...CURVE_POLYGON_ATRICRYPTO_UNDERLYING_TOKENS, ...info.tokens],
    metaTokens: info.tokens,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveFactoryCryptoExchangePool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying_uint256,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_uint256,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaTokens: undefined,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});
const MOBIUSMONEY_CELO_SHARED: CurveInfo = {
    exchangeFunctionSelector: CurveFunctionSelectors.swap,
    sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    metaTokens: undefined,
    gasSchedule: 150e3,
    poolAddress: NULL_ADDRESS,
    tokens: [],
};

/**
 * Mainnet Curve configuration
 * The tokens are in order of their index, which each curve defines
 * I.e DaiUsdc curve has DAI as index 0 and USDC as index 1
 */
export const CURVE_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_POOLS.compound]: createCurveExchangeUnderlyingPool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC],
        pool: CURVE_POOLS.compound,
        gasSchedule: 587e3,
    }),
    [CURVE_POOLS.PAX]: createCurveExchangeUnderlyingPool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT, MAINNET_TOKENS.PAX],
        pool: CURVE_POOLS.PAX,
        gasSchedule: 742e3,
    }),
    [CURVE_POOLS.sUSD]: createCurveExchangeUnderlyingPool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT, MAINNET_TOKENS.sUSD],
        pool: CURVE_POOLS.sUSD,
        gasSchedule: 302e3,
    }),
    [CURVE_POOLS.renBTC]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.WBTC],
        pool: CURVE_POOLS.renBTC,
        gasSchedule: 171e3,
    }),
    [CURVE_POOLS.sBTC]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.sBTC],
        pool: CURVE_POOLS.sBTC,
        gasSchedule: 327e3,
    }),
    [CURVE_POOLS.HBTC]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.hBTC, MAINNET_TOKENS.WBTC],
        pool: CURVE_POOLS.HBTC,
        gasSchedule: 210e3,
    }),
    [CURVE_POOLS.TRI]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        pool: CURVE_POOLS.TRI,
        gasSchedule: 176e3,
    }),
    [CURVE_POOLS.GUSD]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.GUSD],
        pool: CURVE_POOLS.GUSD,
        gasSchedule: 411e3,
    }),
    [CURVE_POOLS.HUSD]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.HUSD],
        pool: CURVE_POOLS.HUSD,
        gasSchedule: 396e3,
    }),
    [CURVE_POOLS.USDN]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.USDN],
        pool: CURVE_POOLS.USDN,
        gasSchedule: 398e3,
    }),
    [CURVE_POOLS.mUSD]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.mUSD],
        pool: CURVE_POOLS.mUSD,
        gasSchedule: 385e3,
    }),
    [CURVE_POOLS.dUSD]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.dUSD],
        pool: CURVE_POOLS.dUSD,
        gasSchedule: 371e3,
    }),
    [CURVE_POOLS.tBTC]: createCurveMetaTriBtcPool({
        tokens: [MAINNET_TOKENS.tBTC],
        pool: CURVE_POOLS.tBTC,
        gasSchedule: 482e3,
    }),
    [CURVE_POOLS.pBTC]: createCurveMetaTriBtcPool({
        tokens: [MAINNET_TOKENS.pBTC],
        pool: CURVE_POOLS.pBTC,
        gasSchedule: 503e3,
    }),
    [CURVE_POOLS.bBTC]: createCurveMetaTriBtcPool({
        tokens: [MAINNET_TOKENS.bBTC],
        pool: CURVE_POOLS.bBTC,
        gasSchedule: 497e3,
    }),
    [CURVE_POOLS.oBTC]: createCurveMetaTriBtcPool({
        tokens: [MAINNET_TOKENS.oBTC],
        pool: CURVE_POOLS.oBTC,
        gasSchedule: 488e3,
    }),
    [CURVE_POOLS.UST]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.UST],
        pool: CURVE_POOLS.UST,
        gasSchedule: 340e3,
    }),
    [CURVE_POOLS.eurs]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.EURS, MAINNET_TOKENS.sEUR],
        pool: CURVE_POOLS.eurs,
        gasSchedule: 320e3,
    }),
    [CURVE_POOLS.eurt]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.EURT, MAINNET_TOKENS.sEUR],
        pool: CURVE_POOLS.eurt,
        gasSchedule: 320e3,
    }),
    [CURVE_POOLS.aave]: createCurveExchangeUnderlyingPool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        pool: CURVE_POOLS.aave,
        gasSchedule: 580e3,
    }),
    [CURVE_POOLS.aave]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.aDAI, MAINNET_TOKENS.aUSDC, MAINNET_TOKENS.aUSDT],
        pool: CURVE_POOLS.aave,
        gasSchedule: 580e3,
    }),
    [CURVE_POOLS.saave]: createCurveExchangeUnderlyingPool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.sUSD],
        pool: CURVE_POOLS.saave,
        gasSchedule: 580e3,
    }),
    [CURVE_POOLS.saave]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.aDAI, MAINNET_TOKENS.aSUSD],
        pool: CURVE_POOLS.saave,
        gasSchedule: 580e3,
    }),
    [CURVE_POOLS.USDP]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.USDP],
        pool: CURVE_POOLS.USDP,
        gasSchedule: 374e3,
    }),
    [CURVE_POOLS.ib]: createCurveExchangeUnderlyingPool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        pool: CURVE_POOLS.ib,
        gasSchedule: 646e3,
    }),
    [CURVE_POOLS.link]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.LINK, MAINNET_TOKENS.sLINK],
        pool: CURVE_POOLS.link,
        gasSchedule: 319e3,
    }),
    [CURVE_POOLS.TUSD]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.TUSD],
        pool: CURVE_POOLS.TUSD,
        gasSchedule: 404e3,
    }),
    [CURVE_POOLS.STABLEx]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.STABLEx],
        pool: CURVE_POOLS.STABLEx,
        gasSchedule: 397e3,
    }),
    [CURVE_POOLS.alUSD]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.alUSD],
        pool: CURVE_POOLS.alUSD,
        gasSchedule: 387e3,
    }),
    [CURVE_POOLS.FRAX]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.FRAX],
        pool: CURVE_POOLS.FRAX,
        gasSchedule: 387e3,
    }),
    [CURVE_POOLS.LUSD]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.LUSD],
        pool: CURVE_POOLS.LUSD,
        gasSchedule: 387e3,
    }),
    [CURVE_POOLS.BUSD]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.BUSD],
        pool: CURVE_POOLS.BUSD,
        gasSchedule: 387e3,
    }),
    [CURVE_POOLS.steth]: createCurveExchangePool({
        // This pool uses ETH
        tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.stETH],
        pool: CURVE_POOLS.steth,
        gasSchedule: 151e3,
    }),
    [CURVE_POOLS.seth]: createCurveExchangePool({
        // This pool uses ETH
        tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.sETH],
        pool: CURVE_POOLS.seth,
        gasSchedule: 187e3,
    }),
    [CURVE_POOLS.ankreth]: createCurveExchangePool({
        // This pool uses ETH
        tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.ankrETH],
        pool: CURVE_POOLS.ankreth,
        gasSchedule: 125e3,
    }),
    [CURVE_POOLS.DSU3CRV]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.DSU],
        pool: CURVE_POOLS.DSU3CRV,
        gasSchedule: 387e3,
    }),
    [CURVE_POOLS.mim]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.MIM],
        pool: CURVE_POOLS.mim,
        gasSchedule: 300e3,
    }),
    [CURVE_POOLS.cvxcrv]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.CRV, MAINNET_TOKENS.cvxCRV],
        pool: CURVE_POOLS.cvxcrv,
        gasSchedule: 105e3,
    }),
    [CURVE_POOLS.ethcrv]: {
        ...createCurveExchangePool({
            // This pool uses ETH
            tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.CRV],
            pool: CURVE_POOLS.ethcrv,
            gasSchedule: 350e3,
        }),
        // This pool has a custom get_dy and exchange selector with uint256
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_uint256,
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying_uint256,
    },
    [CURVE_POOLS.ethcvx]: {
        ...createCurveExchangePool({
            // This pool uses ETH
            tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.CVX],
            pool: CURVE_POOLS.ethcvx,
            gasSchedule: 350e3,
        }),
        // This pool has a custom get_dy and exchange selector with uint256
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_uint256,
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying_uint256,
    },
    [CURVE_POOLS.mimust]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.MIM, MAINNET_TOKENS.UST],
        pool: CURVE_POOLS.mimust,
        gasSchedule: 105e3,
    }),
    [CURVE_POOLS.usttri_wormhole]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.UST_WORMHOLE],
        pool: CURVE_POOLS.usttri_wormhole,
        gasSchedule: 340e3,
    }),
    [CURVE_POOLS.fei_tri]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.FEI],
        pool: CURVE_POOLS.fei_tri,
        gasSchedule: 340e3,
    }),
    [CURVE_POOLS.rai_tri]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.RAI],
        pool: CURVE_POOLS.rai_tri,
        gasSchedule: 340e3,
    }),
    [CURVE_POOLS.DOLA_tri]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.DOLA],
        pool: CURVE_POOLS.DOLA_tri,
        gasSchedule: 340e3,
    }),
    [CURVE_POOLS.OUSD_tri]: createCurveMetaTriPool({
        tokens: [MAINNET_TOKENS.OUSD],
        pool: CURVE_POOLS.OUSD_tri,
        gasSchedule: 340e3,
    }),
    [CURVE_POOLS.d3pool]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.FRAX, MAINNET_TOKENS.FEI, MAINNET_TOKENS.alUSD],
        pool: CURVE_POOLS.d3pool,
        gasSchedule: 176e3,
    }),
    [CURVE_POOLS.triEURpool]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.agEUR, MAINNET_TOKENS.EURT, MAINNET_TOKENS.EURS],
        pool: CURVE_POOLS.triEURpool,
        gasSchedule: 176e3,
    }),
    [CURVE_POOLS.ibEURsEUR]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.ibEUR, MAINNET_TOKENS.sEUR],
        pool: CURVE_POOLS.ibEURsEUR,
        gasSchedule: 176e3,
    }),
    [CURVE_POOLS.btrflyweth]: createCurveFactoryCryptoExchangePool({
        tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.BTRFLY],
        pool: CURVE_POOLS.btrflyweth,
        gasSchedule: 250e3,
    }),
    [CURVE_POOLS.wethyfi]: createCurveFactoryCryptoExchangePool({
        tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.YFI],
        pool: CURVE_POOLS.wethyfi,
        gasSchedule: 250e3,
    }),
    [CURVE_POOLS.stgusdc]: createCurveFactoryCryptoExchangePool({
        tokens: [MAINNET_TOKENS.STG, MAINNET_TOKENS.USDC],
        pool: CURVE_POOLS.stgusdc,
        gasSchedule: 400e3,
    }),
};

export const CURVE_V2_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_V2_POOLS.tricrypto]: createCurveExchangeV2Pool({
        tokens: [MAINNET_TOKENS.USDT, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.WETH],
        pool: CURVE_V2_POOLS.tricrypto,
        gasSchedule: 300e3,
    }),
    [CURVE_V2_POOLS.tricrypto2]: createCurveExchangeV2Pool({
        tokens: [MAINNET_TOKENS.USDT, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.WETH],
        pool: CURVE_V2_POOLS.tricrypto2,
        gasSchedule: 300e3,
    }),
};

export const CURVE_POLYGON_INFOS: { [name: string]: CurveInfo } = {
    ['aave_exchangeunderlying']: createCurveExchangeUnderlyingPool({
        tokens: CURVE_POLYGON_ATRICRYPTO_UNDERLYING_TOKENS,
        pool: CURVE_POLYGON_POOLS.aave,
        gasSchedule: 300e3,
    }),
    ['aave_exchange']: createCurveExchangePool({
        tokens: CURVE_POLYGON_ATRICRYPTO_TOKENS,
        pool: CURVE_POLYGON_POOLS.aave,
        gasSchedule: 150e3,
    }),
    [CURVE_POLYGON_POOLS.ren]: createCurveExchangeUnderlyingPool({
        tokens: [POLYGON_TOKENS.WBTC, POLYGON_TOKENS.renBTC],
        pool: CURVE_POLYGON_POOLS.ren,
        gasSchedule: 350e3,
    }),
};

export const CURVE_V2_POLYGON_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_V2_POLYGON_POOLS.atricrypto3]: createCurveV2MetaTriPool({
        tokens: [POLYGON_TOKENS.WBTC, POLYGON_TOKENS.WETH],
        pool: CURVE_V2_POLYGON_POOLS.atricrypto3,
        gasSchedule: 300e3,
    }),
};

export const CURVE_AVALANCHE_INFOS: { [name: string]: CurveInfo } = {
    ['aave_exchangeunderlying']: createCurveExchangeUnderlyingPool({
        tokens: [AVALANCHE_TOKENS.DAI, AVALANCHE_TOKENS.USDC, AVALANCHE_TOKENS.USDT],
        pool: CURVE_AVALANCHE_POOLS.aave,
        gasSchedule: 850e3,
    }),
    ['aave_exchange']: createCurveExchangePool({
        tokens: [AVALANCHE_TOKENS.aDAI, AVALANCHE_TOKENS.aUSDC, AVALANCHE_TOKENS.aUSDT],
        pool: CURVE_AVALANCHE_POOLS.aave,
        gasSchedule: 150e3,
    }),
    [CURVE_AVALANCHE_POOLS.mim]: createCurveExchangePool({
        tokens: [AVALANCHE_TOKENS.MIM, AVALANCHE_TOKENS.USDT, AVALANCHE_TOKENS.USDC],
        pool: CURVE_AVALANCHE_POOLS.mim,
        gasSchedule: 150e3,
    }),
    [CURVE_AVALANCHE_POOLS.USDC]: createCurveExchangePool({
        tokens: [AVALANCHE_TOKENS.USDC, AVALANCHE_TOKENS.nUSDC],
        pool: CURVE_AVALANCHE_POOLS.USDC,
        gasSchedule: 150e3,
    }),
};

export const CURVE_V2_AVALANCHE_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_V2_AVALANCHE_POOLS.atricrypto]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying_v2,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying_v2,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        tokens: [
            AVALANCHE_TOKENS.DAI,
            AVALANCHE_TOKENS.USDC,
            AVALANCHE_TOKENS.USDT,
            AVALANCHE_TOKENS.WBTC,
            AVALANCHE_TOKENS.WETH,
        ],
        metaTokens: undefined,
        poolAddress: CURVE_V2_AVALANCHE_POOLS.atricrypto,
        gasSchedule: 1300e3,
    },
};

// TODO: modify gasSchedule
export const CURVE_FANTOM_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_FANTOM_POOLS.ren]: createCurveExchangePool({
        tokens: [FANTOM_TOKENS.WBTC, FANTOM_TOKENS.renBTC],
        pool: CURVE_FANTOM_POOLS.ren,
        gasSchedule: 171e3,
    }),
    [CURVE_FANTOM_POOLS.twoPool]: createCurveExchangePool({
        tokens: [FANTOM_TOKENS.DAI, FANTOM_TOKENS.USDC],
        pool: CURVE_FANTOM_POOLS.twoPool,
        gasSchedule: 176e3,
    }),
    [CURVE_FANTOM_POOLS.fUSDT]: createCurveExchangeUnderlyingPool({
        tokens: [FANTOM_TOKENS.fUSDT, FANTOM_TOKENS.DAI, FANTOM_TOKENS.USDC],
        pool: CURVE_FANTOM_POOLS.fUSDT,
        gasSchedule: 587e3,
    }),
    [CURVE_FANTOM_POOLS.tri_v2]: createCurveExchangePool({
        tokens: [FANTOM_TOKENS.MIM, FANTOM_TOKENS.fUSDT, FANTOM_TOKENS.USDC],
        pool: CURVE_FANTOM_POOLS.tri_v2,
        gasSchedule: 176e3,
    }),
    ['geist_exchangeunderlying']: createCurveExchangeUnderlyingPool({
        tokens: [FANTOM_TOKENS.DAI, FANTOM_TOKENS.USDC, FANTOM_TOKENS.fUSDT],
        pool: CURVE_FANTOM_POOLS.geist,
        gasSchedule: 850e3,
    }),
    ['geist_exchange']: createCurveExchangePool({
        tokens: [FANTOM_TOKENS.gDAI, FANTOM_TOKENS.gUSDC, FANTOM_TOKENS.gfUSDT],
        pool: CURVE_FANTOM_POOLS.geist,
        gasSchedule: 150e3,
    }),
    [CURVE_FANTOM_POOLS.FRAX_twoPool]: createCurveMetaTwoPoolFantom({
        tokens: [FANTOM_TOKENS.FRAX],
        pool: CURVE_FANTOM_POOLS.FRAX_twoPool,
        gasSchedule: 411e3,
    }),
};

export const CURVE_V2_FANTOM_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_V2_FANTOM_POOLS.tricrypto]: createCurveExchangeV2Pool({
        tokens: [FANTOM_TOKENS.fUSDT, FANTOM_TOKENS.WBTC, FANTOM_TOKENS.WETH],
        pool: CURVE_V2_FANTOM_POOLS.tricrypto,
        gasSchedule: 300e3,
    }),
};

export const CURVE_OPTIMISM_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_OPTIMISM_POOLS.tri]: createCurveExchangePool({
        tokens: [OPTIMISM_TOKENS.DAI, OPTIMISM_TOKENS.USDC, OPTIMISM_TOKENS.USDT],
        pool: CURVE_OPTIMISM_POOLS.tri,
        gasSchedule: 150e3,
    }),
};

export const SWERVE_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [SWERVE_POOLS.y]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT, MAINNET_TOKENS.TUSD],
        pool: SWERVE_POOLS.y,
        gasSchedule: 140e3,
    }),
};

export const SNOWSWAP_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [SNOWSWAP_POOLS.yUSD]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.yUSD, MAINNET_TOKENS.ybCRV],
        pool: SNOWSWAP_POOLS.yUSD,
        gasSchedule: 990e3,
    }),
    [SNOWSWAP_POOLS.yUSD]: createCurveExchangeUnderlyingPool({
        tokens: [MAINNET_TOKENS.yCRV, MAINNET_TOKENS.bCRV],
        pool: SNOWSWAP_POOLS.yUSD,
        gasSchedule: 990e3,
    }),
    [SNOWSWAP_POOLS.yVault]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.yDAI, MAINNET_TOKENS.yUSDC, MAINNET_TOKENS.yUSDT, MAINNET_TOKENS.yTUSD],
        pool: SNOWSWAP_POOLS.yVault,
        gasSchedule: 1490e3,
    }),
    // Unsupported due to collision with WETH and ETH with execution using MixinCurve
    // [SNOWSWAP_POOLS.eth]: createCurveExchangePool({
    //     tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.vETH, MAINNET_TOKENS.ankrETH, MAINNET_TOKENS.crETH],
    //     pool: SNOWSWAP_POOLS.eth,
    //     gasSchedule: 990e3,
    // }),
};

export const BELT_BSC_INFOS: { [name: string]: CurveInfo } = {
    [BELT_POOLS.vPool]: createCurveExchangeUnderlyingPool({
        tokens: [BSC_TOKENS.DAI, BSC_TOKENS.USDC, BSC_TOKENS.USDT, BSC_TOKENS.BUSD],
        pool: BELT_POOLS.vPool,
        gasSchedule: 4490e3,
    }),
};

export const ELLIPSIS_BSC_INFOS: { [name: string]: CurveInfo } = {
    [ELLIPSIS_POOLS.threePool]: createCurveExchangePool({
        tokens: [BSC_TOKENS.BUSD, BSC_TOKENS.USDC, BSC_TOKENS.USDT],
        pool: ELLIPSIS_POOLS.threePool,
        gasSchedule: 140e3,
    }),
};

export const XSIGMA_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [XSIGMA_POOLS.stable]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        pool: XSIGMA_POOLS.stable,
        gasSchedule: 150e3,
    }),
};

// Curve-like sources using custom selectors
export const SADDLE_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [SADDLE_POOLS.stables]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SADDLE_POOLS.stables,
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        metaTokens: undefined,
        gasSchedule: 150e3,
    },
    [SADDLE_POOLS.bitcoins]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SADDLE_POOLS.bitcoins,
        tokens: [MAINNET_TOKENS.tBTC, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.sBTC],
        metaTokens: undefined,
        gasSchedule: 150e3,
    },
    [SADDLE_POOLS.alETH]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SADDLE_POOLS.alETH,
        tokens: [MAINNET_TOKENS.WETH, MAINNET_TOKENS.alETH, MAINNET_TOKENS.sETH],
        metaTokens: undefined,
        gasSchedule: 200e3,
    },
    [SADDLE_POOLS.d4]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap,
        sellQuoteFunctionSelector: CurveFunctionSelectors.calculateSwap,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SADDLE_POOLS.d4,
        tokens: [MAINNET_TOKENS.alUSD, MAINNET_TOKENS.FEI, MAINNET_TOKENS.FRAX, MAINNET_TOKENS.LUSD],
        metaTokens: undefined,
        gasSchedule: 150e3,
    },
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

export const SMOOTHY_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [SMOOTHY_POOLS.syUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap_uint256,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_swap_amount,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SMOOTHY_POOLS.syUSD,
        tokens: [
            MAINNET_TOKENS.USDT,
            MAINNET_TOKENS.USDC,
            MAINNET_TOKENS.DAI,
            MAINNET_TOKENS.TUSD,
            MAINNET_TOKENS.sUSD,
            MAINNET_TOKENS.BUSD,
            MAINNET_TOKENS.PAX,
            MAINNET_TOKENS.GUSD,
        ],
        metaTokens: undefined,
        gasSchedule: 190e3,
    },
};

export const SMOOTHY_BSC_INFOS: { [name: string]: CurveInfo } = {
    [SMOOTHY_POOLS.syUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap_uint256,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_swap_amount,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SMOOTHY_POOLS.syUSD,
        tokens: [BSC_TOKENS.BUSD, BSC_TOKENS.USDT, BSC_TOKENS.USDC, BSC_TOKENS.DAI, BSC_TOKENS.PAX, BSC_TOKENS.UST],
        metaTokens: undefined,
        gasSchedule: 90e3,
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

const ACRYPTOS_ACS4USD_POOL_BSC_TOKENS = [BSC_TOKENS.BUSD, BSC_TOKENS.USDT, BSC_TOKENS.DAI, BSC_TOKENS.USDC];

const createAcryptosMetaUsdPool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [...info.tokens, ...ACRYPTOS_ACS4USD_POOL_BSC_TOKENS],
    metaTokens: info.tokens,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

export const ACRYPTOS_BSC_INFOS: { [name: string]: CurveInfo } = {
    [ACRYPTOS_POOLS.acs4usd]: createCurveExchangePool({
        tokens: ACRYPTOS_ACS4USD_POOL_BSC_TOKENS,
        pool: ACRYPTOS_POOLS.acs4usd,
        gasSchedule: 145e3,
    }),

    [ACRYPTOS_POOLS.acs4vai]: createAcryptosMetaUsdPool({
        tokens: [BSC_TOKENS.VAI],
        pool: ACRYPTOS_POOLS.acs4vai,
        gasSchedule: 300e3,
    }),

    [ACRYPTOS_POOLS.acs4ust]: createAcryptosMetaUsdPool({
        tokens: [BSC_TOKENS.UST],
        pool: ACRYPTOS_POOLS.acs4ust,
        gasSchedule: 300e3,
    }),

    [ACRYPTOS_POOLS.acs3btc]: createCurveExchangePool({
        tokens: [BSC_TOKENS.BTCB, BSC_TOKENS.renBTC, BSC_TOKENS.pBTC],
        pool: ACRYPTOS_POOLS.acs3btc,
        gasSchedule: 145e3,
    }),
};

/**
 * Kyber reserve prefixes
 * 0xff Fed price reserve
 * 0xaa Automated price reserve
 * 0xbb Bridged price reserve (i.e Uniswap/Curve)
 */
export const KYBER_BRIDGED_LIQUIDITY_PREFIX = '0xbb';
export const KYBER_BANNED_RESERVES = ['0xff4f6e65426974205175616e7400000000000000000000000000000000000000'];
export const MAX_KYBER_RESERVES_QUERIED = 5;
export const KYBER_CONFIG_BY_CHAIN_ID = valueByChainId<KyberSamplerOpts>(
    {
        [ChainId.Mainnet]: {
            networkProxy: '0x9aab3f75489902f3a48495025729a0af77d4b11e',
            hintHandler: '0xa1C0Fa73c39CFBcC11ec9Eb1Afc665aba9996E2C',
            weth: MAINNET_TOKENS.WETH,
        },
        [ChainId.Ropsten]: {
            networkProxy: '0x818e6fecd516ecc3849daf6845e3ec868087b755',
            hintHandler: '0x63f773c026093eef988e803bdd5772dd235a8e71',
            weth: getContractAddressesForChainOrThrow(ChainId.Ropsten).etherToken,
        },
    },
    {
        networkProxy: NULL_ADDRESS,
        hintHandler: NULL_ADDRESS,
        weth: NULL_ADDRESS,
    },
);

export const LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID = valueByChainId<LiquidityProviderRegistry>(
    {
        [ChainId.Mainnet]: {
            ['0x1d0d407c5af8c86f0a6494de86e56ae21e46a951']: {
                tokens: [
                    MAINNET_TOKENS.WETH,
                    MAINNET_TOKENS.USDC,
                    MAINNET_TOKENS.USDT,
                    MAINNET_TOKENS.WBTC,
                    MAINNET_TOKENS.PAX,
                    MAINNET_TOKENS.LINK,
                    MAINNET_TOKENS.KNC,
                    MAINNET_TOKENS.MANA,
                    MAINNET_TOKENS.DAI,
                    MAINNET_TOKENS.BUSD,
                    MAINNET_TOKENS.AAVE,
                    MAINNET_TOKENS.HT,
                ],
                gasCost: (takerToken: string, makerToken: string) =>
                    [takerToken, makerToken].includes(MAINNET_TOKENS.WETH) ? 160e3 : 280e3,
            },
        },
    },
    {},
);

export const UNISWAPV1_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xc0a47dfe034b400b47bdad5fecda2621de6c4d95',
        [ChainId.Ropsten]: '0x9c83dce8ca20e9aaf9d3efc003b2ea62abc08351',
    },
    NULL_ADDRESS,
);

export const UNISWAPV2_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
        [ChainId.Ropsten]: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
    },
    NULL_ADDRESS,
);

export const SUSHISWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
        [ChainId.BSC]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Ropsten]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Polygon]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Avalanche]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Fantom]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ChainId.Celo]: '0x1421bde4b10e8dd459b3bcb598810b1337d56842',
    },
    NULL_ADDRESS,
);

export const CRYPTO_COM_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xceb90e4c17d626be0facd78b79c9c87d7ca181b3',
    },
    NULL_ADDRESS,
);

export const LINKSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    { [ChainId.Mainnet]: '0xa7ece0911fe8c60bff9e99f8fafcdbe56e07aff1' },
    NULL_ADDRESS,
);

export const SHIBASWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x03f7724180aa6b939894b5ca4314783b0b36b329',
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

export const OASIS_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x5e3e0548935a83ad29fb2a9153d331dc6d49020f',
    },
    NULL_ADDRESS,
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

export const MOONISWAP_REGISTRIES_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: ['0xbaf9a5d4b0052359326a6cdab54babaa3a3a9643'],
        [ChainId.BSC]: ['0xd41b24bba51fac0e4827b6f94c0d6ddeb183cd64'],
    },
    [] as string[],
);

export const DODOV1_CONFIG_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            helper: '0x533da777aedce766ceae696bf90f8541a4ba80eb',
            registry: '0x3A97247DF274a17C59A3bd12735ea3FcDFb49950',
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
    },
    [] as string[],
);
export const MAX_DODOV2_POOLS_QUERIED = 3;

export const CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x561b94454b65614ae3db0897b74303f4acf7cc75',
        [ChainId.Ropsten]: '0xae241c6fc7f28f6dc0cb58b4112ba7f63fcaf5e2',
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

export const MOONISWAP_LIQUIDITY_PROVIDER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xa2033d6ba88756ce6a87584d69dc87bda9a4f889',
        [ChainId.Ropsten]: '0x87e0393aee0fb8c10b8653c6507c182264fe5a34',
    },
    NULL_ADDRESS,
);

export const BANCOR_REGISTRY_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4',
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

export const GEIST_INFO_ADDRESS_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Fantom]: '0xd8321aa83fb0a4ecd6348d4577431310a6e0814d',
    },
    NULL_ADDRESS,
);

export const BALANCER_V2_VAULT_ADDRESS_BY_CHAIN = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        [ChainId.Polygon]: '0xba12222222228d8ba445958a75a0704d566bf2c8',
    },
    NULL_ADDRESS,
);

export const BEETHOVEN_X_VAULT_ADDRESS_BY_CHAIN = valueByChainId<string>(
    {
        [ChainId.Fantom]: '0x20dd72ed959b6147912c2e529f0a0c651c33c9ce',
    },
    NULL_ADDRESS,
);

export const LIDO_INFO_BY_CHAIN = valueByChainId<LidoInfo>(
    {
        [ChainId.Mainnet]: {
            stEthToken: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
            wethToken: MAINNET_TOKENS.WETH,
        },
    },
    {
        stEthToken: NULL_ADDRESS,
        wethToken: NULL_ADDRESS,
    },
);

export const BALANCER_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer';
export const BALANCER_TOP_POOLS_FETCHED = 250;
export const BALANCER_MAX_POOLS_FETCHED = 3;

export const BALANCER_V2_SUBGRAPH_URL_BY_CHAIN = valueByChainId<string>(
    {
        [ChainId.Polygon]: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
    },
    'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
);

export const BEETHOVEN_X_SUBGRAPH_URL_BY_CHAIN = valueByChainId<string>(
    {
        [ChainId.Fantom]: 'https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx',
    },
    'https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx',
);

export const UNISWAPV3_CONFIG_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            quoter: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.Ropsten]: {
            quoter: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.Polygon]: {
            quoter: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.Optimism]: {
            quoter: '0x61ffe014ba17989e743c5f6cb21bf9697530b21e',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
    },
    { quoter: NULL_ADDRESS, router: NULL_ADDRESS },
);

export const AAVE_V2_SUBGRAPH_URL_BY_CHAIN_ID = valueByChainId(
    {
        // TODO: enable after FQT has been redeployed on Ethereum mainnet
        // [ChainId.Mainnet]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v2',
        [ChainId.Polygon]: 'https://api.thegraph.com/subgraphs/name/aave/aave-v2-matic',
        [ChainId.Avalanche]: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v2-avalanche',
    },
    null,
);

export const COMPOUND_API_URL_BY_CHAIN_ID = valueByChainId(
    {
        // TODO: enable after FQT has been redeployed on Ethereum mainnet
        // [ChainId.Mainnet]: 'https://api.compound.finance/api/v2',
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

export const CAFESWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0x933daea3a5995fb94b14a7696a5f3ffd7b1e385a',
    },
    NULL_ADDRESS,
);

export const CHEESESWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0x3047799262d8d2ef41ed2a222205968bc9b0d895',
    },
    NULL_ADDRESS,
);

export const JULSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0xbd67d157502a23309db761c41965600c2ec788b2',
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

export const COMETHSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Polygon]: '0x93bcdc45f7e62f89a8e901dc4a0e2c6c427d9f25',
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

export const POLYDEX_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Polygon]: '0xe5c67ba380fb2f70a47b489e94bced486bb8fb74',
    },
    NULL_ADDRESS,
);

export const JETSWAP_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.BSC]: '0xbe65b8f75b9f20f4c522e0067a3887fada714800',
        [ChainId.Polygon]: '0x5c6ec38fb0e2609672bdf628b1fd605a523e5923',
        [ChainId.Fantom]: '0x845e76a8691423fbc4ecb8dd77556cb61c09ee25',
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

export const VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID = valueByChainId<ERC20BridgeSource[]>(
    {
        [ChainId.Mainnet]: [
            ERC20BridgeSource.UniswapV2,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.UniswapV3,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.Native,
        ],
        [ChainId.BSC]: [
            ERC20BridgeSource.PancakeSwap,
            ERC20BridgeSource.PancakeSwapV2,
            ERC20BridgeSource.BakerySwap,
            ERC20BridgeSource.SushiSwap,
            ERC20BridgeSource.ApeSwap,
            ERC20BridgeSource.CafeSwap,
            ERC20BridgeSource.CheeseSwap,
            ERC20BridgeSource.JulSwap,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.Native,
        ],
    },
    [],
);

const uniswapV2CloneGasSchedule = (fillData?: FillData) => {
    // TODO: Different base cost if to/from ETH.
    let gas = 90e3;
    const path = (fillData as UniswapV2FillData).tokenAddressPath;
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
// tslint:disable:custom-no-magic-numbers
export const DEFAULT_GAS_SCHEDULE: Required<FeeSchedule> = {
    [ERC20BridgeSource.Native]: fillData => {
        // TODO jacob re-order imports so there is no circular rependency with SignedNativeOrder
        const nativeFillData = fillData as { type: FillQuoteTransformerOrderType };
        return nativeFillData && nativeFillData.type === FillQuoteTransformerOrderType.Limit
            ? PROTOCOL_FEE_MULTIPLIER.plus(100e3).toNumber()
            : // TODO jacob revisit wth v4 LimitOrders
              100e3;
    },
    [ERC20BridgeSource.Uniswap]: () => 90e3,
    [ERC20BridgeSource.LiquidityProvider]: fillData => {
        return (fillData as LiquidityProviderFillData).gasCost || 100e3;
    },
    [ERC20BridgeSource.Eth2Dai]: () => 400e3,
    [ERC20BridgeSource.Kyber]: () => 450e3,
    [ERC20BridgeSource.Curve]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.CurveV2]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Swerve]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.SnowSwap]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Nerve]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Synapse]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Belt]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Ellipsis]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Smoothy]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.Saddle]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.IronSwap]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.XSigma]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.FirebirdOneSwap]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.MobiusMoney]: fillData => (fillData as CurveFillData).pool.gasSchedule,
    [ERC20BridgeSource.MultiBridge]: () => 350e3,
    [ERC20BridgeSource.UniswapV2]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.SushiSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.CryptoCom]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.Linkswap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.ShibaSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.Balancer]: () => 120e3,
    [ERC20BridgeSource.BalancerV2]: () => 100e3,
    [ERC20BridgeSource.Cream]: () => 120e3,
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
        return new BigNumber(firstHopGas)
            .plus(secondHopGas)
            .plus(30e3)
            .toNumber();
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
    [ERC20BridgeSource.KyberDmm]: (fillData?: FillData) => {
        // TODO: Different base cost if to/from ETH.
        let gas = 95e3;
        const path = (fillData as UniswapV2FillData).tokenAddressPath;
        if (path.length > 2) {
            gas += (path.length - 2) * 65e3; // +65k for each hop.
        }
        return gas;
    },
    [ERC20BridgeSource.UniswapV3]: (fillData?: FillData) => {
        const uniFillData = fillData as UniswapV3FillData | FinalUniswapV3FillData;
        // NOTE: This base value was heuristically chosen by looking at how much it generally
        // underestimated gas usage
        const base = 34e3; // 34k base
        let gas = base;
        if (isFinalUniswapV3FillData(uniFillData)) {
            gas += uniFillData.gasUsed;
        } else {
            // NOTE: We don't actually know which of the paths would be used in the router
            // therefore we estimate using the median of gas usage returned from UniswapV3
            // For the best case scenario (least amount of hops & ticks) this will
            // overestimate the gas usage
            const pathAmountsWithGasUsed = uniFillData.pathAmounts.filter(p => p.gasUsed > 0);
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
    [ERC20BridgeSource.Lido]: () => 226e3,
    [ERC20BridgeSource.AaveV2]: (fillData?: FillData) => {
        const aaveFillData = fillData as AaveV2FillData;
        // NOTE: The Aave deposit method is more expensive than the withdraw
        return aaveFillData.takerToken === aaveFillData.underlyingToken ? 400e3 : 300e3;
    },
    [ERC20BridgeSource.Geist]: (fillData?: FillData) => {
        const geistFillData = fillData as GeistFillData;
        return geistFillData.takerToken === geistFillData.underlyingToken ? 400e3 : 300e3;
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

    //
    // BSC
    //
    [ERC20BridgeSource.PancakeSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.PancakeSwapV2]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.BakerySwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.ApeSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.CafeSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.CheeseSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.JulSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.WaultSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.ACryptos]: fillData => (fillData as CurveFillData).pool.gasSchedule,

    //
    // Polygon
    //
    [ERC20BridgeSource.QuickSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.ComethSwap]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.Dfyn]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.Polydex]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.JetSwap]: uniswapV2CloneGasSchedule,

    //
    // Avalanche
    //
    [ERC20BridgeSource.Pangolin]: uniswapV2CloneGasSchedule,
    [ERC20BridgeSource.TraderJoe]: uniswapV2CloneGasSchedule,

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
    [ERC20BridgeSource.Beethovenx]: () => 100e3,
};

export const DEFAULT_FEE_SCHEDULE: Required<FeeSchedule> = { ...DEFAULT_GAS_SCHEDULE };

>>>>>>> e638268f9 (updated routing)
export const POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS = new BigNumber(20000);

// tslint:enable:custom-no-magic-numbers

export const DEFAULT_GET_MARKET_ORDERS_OPTS: Omit<GetMarketOrdersOpts, 'gasPrice'> = {
    // tslint:disable-next-line: custom-no-magic-numbers
    runLimit: 2 ** 15,
    excludedSources: [],
    excludedFeeSources: [],
    includedSources: [],
    bridgeSlippage: 0.005,
    maxFallbackSlippage: 0.05,
    exchangeProxyOverhead: () => ZERO_AMOUNT,
    allowFallback: true,
    shouldGenerateQuoteReport: true,
    shouldIncludePriceComparisonsReport: false,
    tokenAdjacencyGraph: { default: [] },
    neonRouterNumSamples: 14,
};
