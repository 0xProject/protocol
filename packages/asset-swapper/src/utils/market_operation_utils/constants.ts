import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { TokenAdjacencyGraphBuilder } from '../token_adjacency_graph_builder';

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

// TODO(kimpers): Consolidate this implementation with the one in @0x/token-metadata
function valueByChainId<T>(rest: Partial<{ [key in ChainId]: T }>, defaultValue: T): { [key in ChainId]: T } {
    // TODO I don't like this but iterating through enums is weird
    return {
        [ChainId.Mainnet]: defaultValue,
        [ChainId.Ropsten]: defaultValue,
        [ChainId.Rinkeby]: defaultValue,
        [ChainId.Kovan]: defaultValue,
        [ChainId.Ganache]: defaultValue,
        [ChainId.BSC]: defaultValue,
        [ChainId.Polygon]: defaultValue,
        [ChainId.PolygonMumbai]: defaultValue,
        [ChainId.Avalanche]: defaultValue,
        [ChainId.Fantom]: defaultValue,
        ...(rest || {}),
    };
}

/**
 * Valid sources for market sell.
 */
export const SELL_SOURCE_FILTER_BY_CHAIN_ID = valueByChainId<SourceFilters>(
    {
        [ChainId.Mainnet]: new SourceFilters([
            ERC20BridgeSource.Native,
            ERC20BridgeSource.Uniswap,
            ERC20BridgeSource.UniswapV2,
            ERC20BridgeSource.Eth2Dai,
            ERC20BridgeSource.Kyber,
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
        ]),
        [ChainId.Ropsten]: new SourceFilters([
            ERC20BridgeSource.Kyber,
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
        ]),
        [ChainId.Avalanche]: new SourceFilters([
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.Pangolin,
            ERC20BridgeSource.TraderJoe,
            ERC20BridgeSource.SushiSwap,
        ]),
        [ChainId.Fantom]: new SourceFilters([
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.CurveV2,
            ERC20BridgeSource.SpiritSwap,
            ERC20BridgeSource.SpookySwap,
            ERC20BridgeSource.SushiSwap,
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
            ERC20BridgeSource.Eth2Dai,
            ERC20BridgeSource.Kyber,
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
        ]),
        [ChainId.Ropsten]: new SourceFilters([
            ERC20BridgeSource.Kyber,
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
        ]),
        [ChainId.Avalanche]: new SourceFilters([
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.Pangolin,
            ERC20BridgeSource.TraderJoe,
            ERC20BridgeSource.SushiSwap,
        ]),
        [ChainId.Fantom]: new SourceFilters([
            ERC20BridgeSource.MultiHop,
            ERC20BridgeSource.Curve,
            ERC20BridgeSource.CurveV2,
            ERC20BridgeSource.SpiritSwap,
            ERC20BridgeSource.SpookySwap,
            ERC20BridgeSource.SushiSwap,
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
        [ChainId.Polygon]: [ERC20BridgeSource.QuickSwap, ERC20BridgeSource.SushiSwap],
        [ChainId.Avalanche]: [ERC20BridgeSource.Pangolin, ERC20BridgeSource.TraderJoe, ERC20BridgeSource.SushiSwap],
        [ChainId.Fantom]: [ERC20BridgeSource.SpiritSwap, ERC20BridgeSource.SpookySwap, ERC20BridgeSource.SushiSwap],
    },
    [],
);

export const CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x561b94454b65614ae3db0897b74303f4acf7cc75',
        [ChainId.Ropsten]: '0xae241c6fc7f28f6dc0cb58b4112ba7f63fcaf5e2',
    },
    NULL_ADDRESS,
);

export const MOONISWAP_LIQUIDITY_PROVIDER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0xa2033d6ba88756ce6a87584d69dc87bda9a4f889',
        [ChainId.Ropsten]: '0x87e0393aee0fb8c10b8653c6507c182264fe5a34',
    },
    NULL_ADDRESS,
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
    cvxCRV: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
    CRV: '0xd533a949740bb3306d119cc777fa900ba034cd52',
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
};

export const AVALANCHE_TOKENS = {
    WAVAX: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
    WETH: '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab',
    DAI: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70',
    USDC: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
    USDT: '0xc7198437980c041c805a1edcba50c1ce5db95118',
};

export const FANTOM_TOKENS = {
    WFTM: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    WETH: '0x74b23882a30290451a17c44f4f05243b6b58c76d',
    USDC: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
    DAI: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
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
        ],
        [ChainId.Avalanche]: [
            AVALANCHE_TOKENS.WAVAX,
            AVALANCHE_TOKENS.WETH,
            AVALANCHE_TOKENS.DAI,
            AVALANCHE_TOKENS.USDT,
            AVALANCHE_TOKENS.USDC,
        ],
        [ChainId.Fantom]: [FANTOM_TOKENS.WFTM, FANTOM_TOKENS.WETH, FANTOM_TOKENS.DAI, FANTOM_TOKENS.USDC],
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
        }).build(),
        [ChainId.Fantom]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Fantom],
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
    },
    NULL_ADDRESS,
);

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
};
