import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { BridgeContractAddresses } from '../../types';

import { SourceFilters } from './source_filters';
import {
    BancorFillData,
    CurveFillData,
    CurveFunctionSelectors,
    CurveInfo,
    DODOFillData,
    ERC20BridgeSource,
    FeeSchedule,
    FillData,
    GetMarketOrdersOpts,
    LiquidityProviderFillData,
    LiquidityProviderRegistry,
    MultiHopFillData,
    SnowSwapFillData,
    SushiSwapFillData,
    UniswapV2FillData,
} from './types';

// tslint:disable: custom-no-magic-numbers no-bitwise

/**
 * Valid sources for market sell.
 */
export const SELL_SOURCE_FILTER = new SourceFilters([
    ERC20BridgeSource.Native,
    ERC20BridgeSource.Uniswap,
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.Eth2Dai,
    ERC20BridgeSource.Kyber,
    ERC20BridgeSource.Curve,
    ERC20BridgeSource.Balancer,
    ERC20BridgeSource.Bancor,
    ERC20BridgeSource.MStable,
    ERC20BridgeSource.Mooniswap,
    ERC20BridgeSource.Swerve,
    ERC20BridgeSource.SnowSwap,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.Shell,
    ERC20BridgeSource.MultiHop,
    ERC20BridgeSource.Dodo,
    ERC20BridgeSource.Cream,
    ERC20BridgeSource.LiquidityProvider,
    ERC20BridgeSource.CryptoCom,
]);

/**
 * Valid sources for market buy.
 */
export const BUY_SOURCE_FILTER = new SourceFilters([
    ERC20BridgeSource.Native,
    ERC20BridgeSource.Uniswap,
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.Eth2Dai,
    ERC20BridgeSource.Kyber,
    ERC20BridgeSource.Curve,
    ERC20BridgeSource.Balancer,
    // ERC20BridgeSource.Bancor, // FIXME: Bancor Buys not implemented in Sampler
    ERC20BridgeSource.MStable,
    ERC20BridgeSource.Mooniswap,
    ERC20BridgeSource.Shell,
    ERC20BridgeSource.Swerve,
    ERC20BridgeSource.SnowSwap,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.MultiHop,
    ERC20BridgeSource.Dodo,
    ERC20BridgeSource.Cream,
    ERC20BridgeSource.LiquidityProvider,
    ERC20BridgeSource.CryptoCom,
]);

/**
 *  0x Protocol Fee Multiplier
 */
export const PROTOCOL_FEE_MULTIPLIER = new BigNumber(70000);

/**
 * Sources to poll for ETH fee price estimates.
 */
export const FEE_QUOTE_SOURCES = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.UniswapV2];

export const SOURCE_FLAGS: { [source in ERC20BridgeSource]: number } = Object.assign(
    {},
    ...Object.values(ERC20BridgeSource).map((source: ERC20BridgeSource, index) => ({ [source]: 1 << index })),
);

// Mainnet tokens
// Not an exhaustive list, just enough so we don't repeat ourselves
export const TOKENS = {
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
    UST: '0xa47c8bf37f92abed4a126bda807a7b7498661acd',
    // Bitcoins
    WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    RenBTC: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
    sBTC: '0xfe18be6b3bd88a2d2a7f928d00292e7a9963cfc6',
    tBTC: '0x8daebade922df735c38c80c7ebd708af50815faa',
    hBTC: '0x0316eb71485b0ab14103307bf65a021042c6d380',
    pBTC: '0xde5331ac4b3630f94853ff322b66407e0d6331e8',
    bBTC: '0x9be89d2a4cd102d8fecc6bf9da793be995c22541',
    oBTC: '0x8064d9ae6cdf087b1bcd5bdf3531bd5d8c537a68',
    // aTokens (Aave)
    aDAI: '0x028171bca77440897b824ca71d1c56cac55b68a3',
    aUSDC: '0xbcca60bb61934080951369a648fb03df4f96263c',
    aUSDT: '0x3ed3b47dd13ec9a98b44e6204a523e766b225811',
    // Other
    MKR: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    EURS: '0xdb25f211ab05b1c97d595516f45794528a807ad8',
    sEUR: '0xd71ecff9342a5ced620049e616c5035f1db98620',
    sETH: '0x5e74c9036fb86bd7ecdcb084a0673efc32ea31cb',
};

export const POOLS = {
    curve_compound: '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56', // 0.Compound
    // 1.USDT is dead
    curve_PAX: '0x06364f10b501e868329afbc005b3492902d6c763', // 2.PAX
    curve_y: '0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51', // 3.Y
    curve_BUSD: '0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27', // 4.BUSD
    curve_sUSD: '0xa5407eae9ba41422680e2e00537571bcc53efbfd', // 5.sUSD
    curve_renBTC: '0x93054188d876f558f4a66b2ef1d97d16edf0895b', // 6.ren
    curve_sBTC: '0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714', // 7.sbtc
    curve_HBTC: '0x4ca9b3063ec5866a4b82e437059d2c43d1be596f', // 8.hbtc
    curve_TRI: '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', // 9.3pool
    curve_GUSD: '0x4f062658eaaf2c1ccf8c8e36d6824cdf41167956', // 10.gusd
    curve_HUSD: '0x3ef6a01a0f81d6046290f3e2a8c5b843e738e604', // 11.husd
    // 12.usdk is dead
    curve_USDN: '0x0f9cb53ebe405d49a0bbdbd291a65ff571bc83e1', // 13.usdn
    // 14.linkusd is dead
    curve_mUSD: '0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6', // 15.musd
    // 16.rsv is dead
    curve_tBTC: '0xc25099792e9349c7dd09759744ea681c7de2cb66', // 17.tbtc
    curve_dUSD: '0x8038c01a0390a8c547446a0b2c18fc9aefecc10c', // 18.dusd
    curve_pBTC: '0x5228a22e72ccc52d415ecfd199f99d0665e7733b', // 19.pbtc
    curve_bBTC: '0x071c661b4deefb59e2a3ddb20db036821eee8f4b', // 20.bbtc
    curve_oBTC: '0xd81da8d904b52208541bade1bd6595d8a251f8dd', // 21.obtc
    curve_UST: '0x890f4e345b1daed0367a877a1612f86a1f86985f', // 22.ust
    curve_eurs: '0x0ce6a5ff5217e38315f87032cf90686c96627caa', // 23.eurs
    // curve_seth: '0xc5424b857f758e906013f3555dad202e4bdb4567', // 24.seth
    curve_aave: '0xdebf20617708857ebe4f679508e7b7863a8a8eee', // 25.aave
};

/**
 * Mainnet Curve configuration
 * The tokens are in order of their index, which each curve defines
 * I.e DaiUsdc curve has DAI as index 0 and USDC as index 1
 */
export const MAINNET_CURVE_INFOS: { [name: string]: CurveInfo } = {
    [POOLS.curve_compound]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.get_dx_underlying,
        poolAddress: POOLS.curve_compound,
        tokens: [TOKENS.DAI, TOKENS.USDC],
        metaToken: undefined,
    },
    [POOLS.curve_PAX]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_PAX,
        tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.PAX],
        metaToken: undefined,
    },
    [POOLS.curve_y]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.get_dx_underlying,
        poolAddress: POOLS.curve_y,
        tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.TUSD],
        metaToken: undefined,
    },
    [POOLS.curve_BUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.get_dx_underlying,
        poolAddress: POOLS.curve_BUSD,
        tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.BUSD],
        metaToken: undefined,
    },
    [POOLS.curve_sUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_sUSD,
        tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.sUSD],
        metaToken: undefined,
    },
    [POOLS.curve_renBTC]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_renBTC,
        tokens: [TOKENS.RenBTC, TOKENS.WBTC],
        metaToken: undefined,
    },
    [POOLS.curve_sBTC]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_sBTC,
        tokens: [TOKENS.RenBTC, TOKENS.WBTC, TOKENS.sBTC],
        metaToken: undefined,
    },
    [POOLS.curve_HBTC]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_HBTC,
        tokens: [TOKENS.hBTC, TOKENS.WBTC],
        metaToken: undefined,
    },
    [POOLS.curve_TRI]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_TRI,
        tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT],
        metaToken: undefined,
    },
    [POOLS.curve_GUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_GUSD,
        tokens: [TOKENS.GUSD, TOKENS.DAI, TOKENS.USDC, TOKENS.USDT],
        metaToken: TOKENS.GUSD,
    },
    [POOLS.curve_HUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_HUSD,
        tokens: [TOKENS.HUSD, TOKENS.DAI, TOKENS.USDC, TOKENS.USDT],
        metaToken: TOKENS.HUSD,
    },
    [POOLS.curve_USDN]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_USDN,
        tokens: [TOKENS.USDN, TOKENS.DAI, TOKENS.USDC, TOKENS.USDT],
        metaToken: TOKENS.USDN,
    },
    [POOLS.curve_mUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_mUSD,
        tokens: [TOKENS.mUSD, TOKENS.DAI, TOKENS.USDC, TOKENS.USDT],
        metaToken: TOKENS.mUSD,
    },
    [POOLS.curve_tBTC]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_tBTC,
        tokens: [TOKENS.tBTC, TOKENS.RenBTC, TOKENS.WBTC, TOKENS.sBTC],
        metaToken: TOKENS.tBTC,
    },
    [POOLS.curve_dUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_dUSD,
        tokens: [TOKENS.dUSD, TOKENS.DAI, TOKENS.USDC, TOKENS.USDT],
        metaToken: TOKENS.dUSD,
    },
    [POOLS.curve_pBTC]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_pBTC,
        tokens: [TOKENS.pBTC, TOKENS.RenBTC, TOKENS.WBTC, TOKENS.sBTC],
        metaToken: TOKENS.pBTC,
    },
    [POOLS.curve_bBTC]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_bBTC,
        tokens: [TOKENS.bBTC, TOKENS.RenBTC, TOKENS.WBTC, TOKENS.sBTC],
        metaToken: TOKENS.bBTC,
    },
    [POOLS.curve_oBTC]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_oBTC,
        tokens: [TOKENS.oBTC, TOKENS.RenBTC, TOKENS.WBTC, TOKENS.sBTC],
        metaToken: TOKENS.oBTC,
    },
    [POOLS.curve_UST]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_UST,
        tokens: [TOKENS.UST, TOKENS.DAI, TOKENS.USDC, TOKENS.USDT],
        metaToken: TOKENS.UST,
    },
    [POOLS.curve_eurs]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_eurs,
        tokens: [TOKENS.EURS, TOKENS.sEUR],
        metaToken: undefined,
    },
    // [POOLS.curve_seth]: {
    //     exchangeFunctionSelector: CurveFunctionSelectors.exchange,
    //     sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
    //     buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    //     poolAddress: POOLS.curve_seth,
    //     tokens: [TOKENS.ETH, TOKENS.sETH],
    //     metaToken: undefined,
    // },
    [POOLS.curve_aave]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_aave,
        tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT],
        metaToken: undefined,
    },
    [POOLS.curve_aave]: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: POOLS.curve_aave,
        tokens: [TOKENS.aDAI, TOKENS.aUSDC, TOKENS.aUSDT],
        metaToken: undefined,
    },
};

export const MAINNET_SWERVE_INFOS: { [name: string]: CurveInfo } = {
    swUSD: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: '0x329239599afb305da0a2ec69c58f8a6697f9f88d', // _target: 0xa5407eae9ba41422680e2e00537571bcc53efbfd
        tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.TUSD],
        metaToken: undefined,
    },
};

export const MAINNET_SNOWSWAP_INFOS: { [name: string]: CurveInfo } = {
    yVaultCurve: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.get_dx,
        poolAddress: '0xbf7ccd6c446acfcc5df023043f2167b62e81899b',
        tokens: [
            '0x5dbcf33d8c2e976c6b560249878e6f1491bca25c', // yUSD
            '0x2994529c0652d127b7842094103715ec5299bbed', // ybCRV
        ],
        metaToken: undefined,
    },
    yVaultCurveUnderlying: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
        buyQuoteFunctionSelector: CurveFunctionSelectors.get_dx_underlying,
        poolAddress: '0xbf7ccd6c446acfcc5df023043f2167b62e81899b',
        tokens: [
            '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8', // yCRV
            '0x3b3ac5386837dc563660fb6a0937dfaa5924333b', // bCRV
        ],
        metaToken: undefined,
    },
    yVaultUSD: {
        exchangeFunctionSelector: CurveFunctionSelectors.exchange,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
        buyQuoteFunctionSelector: CurveFunctionSelectors.get_dx,
        poolAddress: '0x4571753311e37ddb44faa8fb78a6df9a6e3c6c0b',
        tokens: [
            '0xacd43e627e64355f1861cec6d3a6688b31a6f952', // yDAI
            '0x597ad1e0c13bfe8025993d9e79c69e1c0233522e', // yUSDC
            '0x2f08119c6f07c006695e079aafc638b8789faf18', // yUSDT
            '0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a', // yTUSD
        ],
        metaToken: undefined,
    },
};

/**
 * Kyber reserve prefixes
 * 0xff Fed price reserve
 * 0xaa Automated price reserve
 * 0xbb Bridged price reserve (i.e Uniswap/Curve)
 */
export const KYBER_BRIDGED_LIQUIDITY_PREFIX = '0xbb';
export const MAX_KYBER_RESERVES_QUERIED = 5;

export const LIQUIDITY_PROVIDER_REGISTRY: LiquidityProviderRegistry = {};

export const MAINNET_UNISWAP_V2_ROUTER = '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a';
export const MAINNET_SUSHI_SWAP_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F';
export const MAINNET_CRYPTO_COM_ROUTER = '0xCeB90E4C17d626BE0fACd78b79c9c87d7ca181b3';

export const MAINNET_MOONISWAP_REGISTRY = '0x71CD6666064C3A1354a3B4dca5fA1E2D3ee7D303';
export const MAINNET_MOONISWAP_V2_REGISTRY = '0xc4a8b7e29e3c8ec560cd4945c1cf3461a85a148d';
export const MAINNET_MOONISWAP_V2_1_REGISTRY = '0xbaf9a5d4b0052359326a6cdab54babaa3a3a9643';

export const MAINNET_SHELL_POOLS = {
    StableCoins: {
        poolAddress: '0x8f26d7bab7a73309141a291525c965ecdea7bf42',
        tokens: [TOKENS.USDC, TOKENS.USDT, TOKENS.sUSD, TOKENS.DAI],
    },
    Bitcoin: {
        poolAddress: '0xc2d019b901f8d4fdb2b9a65b5d226ad88c66ee8d',
        tokens: [TOKENS.RenBTC, TOKENS.WBTC, TOKENS.sBTC],
    },
};

export const ERC20_PROXY_ID = '0xf47261b0';
export const WALLET_SIGNATURE = '0x04';
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

const EMPTY_BRIDGE_ADDRESSES: BridgeContractAddresses = {
    uniswapBridge: NULL_ADDRESS,
    uniswapV2Bridge: NULL_ADDRESS,
    eth2DaiBridge: NULL_ADDRESS,
    kyberBridge: NULL_ADDRESS,
    curveBridge: NULL_ADDRESS,
    multiBridge: NULL_ADDRESS,
    balancerBridge: NULL_ADDRESS,
    bancorBridge: NULL_ADDRESS,
    mStableBridge: NULL_ADDRESS,
    mooniswapBridge: NULL_ADDRESS,
    sushiswapBridge: NULL_ADDRESS,
    shellBridge: NULL_ADDRESS,
    dodoBridge: NULL_ADDRESS,
    creamBridge: NULL_ADDRESS,
    snowswapBridge: NULL_ADDRESS,
    swerveBridge: NULL_ADDRESS,
    cryptoComBridge: NULL_ADDRESS,
};

export const BRIDGE_ADDRESSES_BY_CHAIN: { [chainId in ChainId]: BridgeContractAddresses } = {
    [ChainId.Mainnet]: {
        uniswapBridge: '0x36691c4f426eb8f42f150ebde43069a31cb080ad',
        uniswapV2Bridge: '0xdcd6011f4c6b80e470d9487f5871a0cba7c93f48',
        kyberBridge: '0xadd97271402590564ddd8ad23cb5317b1fb0fffb',
        eth2DaiBridge: '0x991c745401d5b5e469b8c3e2cb02c748f08754f1',
        curveBridge: '0x1796cd592d19e3bcd744fbb025bb61a6d8cb2c09',
        multiBridge: '0xc03117a8c9bde203f70aa911cb64a7a0df5ba1e1',
        balancerBridge: '0xfe01821ca163844203220cd08e4f2b2fb43ae4e4',
        bancorBridge: '0xc880c252db7c51f74161633338a3bdafa8e65276',
        mStableBridge: '0x2bf04fcea05f0989a14d9afa37aa376baca6b2b3',
        mooniswapBridge: '0x02b7eca484ad960fca3f7709e0b2ac81eec3069c',
        sushiswapBridge: '0x47ed0262a0b688dcb836d254c6a2e96b6c48a9f5',
        shellBridge: '0xf1c0811e3788caae7dbfae43da9d9131b1a8a148',
        dodoBridge: '0xe9da66965a9344aab2167e6813c03f043cc7a6ca',
        creamBridge: '0xb9d4bf2c8dab828f4ffb656acdb6c2b497d44f25',
        swerveBridge: '0xf9786d5eb1de47fa56a8f7bb387653c6d410bfee',
        snowswapBridge: '0xb1dbe83d15236ec10fdb214c6b89774b454754fd',
        cryptoComBridge: '0x015850307f6aab4ac6631923ceefe71b57492c9b',
    },
    [ChainId.Kovan]: {
        ...EMPTY_BRIDGE_ADDRESSES,
        uniswapBridge: '0x0e85f89f29998df65402391478e5924700c0079d',
        uniswapV2Bridge: '0x7b3530a635d099de0534dc27e46cd7c57578c3c8',
        eth2DaiBridge: '0x2d47147429b474d2e4f83e658015858a1312ed5b',
        kyberBridge: '0xaecfa25920f892b6eb496e1f6e84037f59da7f44',
        curveBridge: '0x81c0ab53a7352d2e97f682a37cba44e54647eefb',
        balancerBridge: '0x407b4128e9ecad8769b2332312a9f655cb9f5f3a',
    },
    [ChainId.Rinkeby]: EMPTY_BRIDGE_ADDRESSES,
    [ChainId.Ropsten]: EMPTY_BRIDGE_ADDRESSES,
    [ChainId.Ganache]: EMPTY_BRIDGE_ADDRESSES,
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
    [ERC20BridgeSource.Native]: _fillData => {
        // const nativeFillData = (_fillData as NativeRfqOrderFillData|NativeLimitOrderFillData)
        return 150e3;
    },
    [ERC20BridgeSource.Uniswap]: () => 90e3,
    [ERC20BridgeSource.LiquidityProvider]: fillData => {
        return (fillData as LiquidityProviderFillData).gasCost;
    },
    [ERC20BridgeSource.Eth2Dai]: () => 400e3,
    [ERC20BridgeSource.Kyber]: () => 450e3,
    [ERC20BridgeSource.Curve]: fillData => {
        const poolAddress = (fillData as CurveFillData).pool.poolAddress.toLowerCase();
        switch (poolAddress) {
            case POOLS.curve_renBTC:
            case POOLS.curve_sBTC:
            case POOLS.curve_sUSD:
            case POOLS.curve_HBTC:
            case POOLS.curve_TRI:
                return 150e3;
            case POOLS.curve_USDN:
            case POOLS.curve_mUSD:
                return 300e3;
            case POOLS.curve_GUSD:
            case POOLS.curve_HUSD:
                return 310e3;
            case POOLS.curve_tBTC:
                return 370e3;
            case POOLS.curve_UST:
                return 500e3;
            case POOLS.curve_dUSD:
            case POOLS.curve_bBTC:
            case POOLS.curve_oBTC:
            case POOLS.curve_eurs:
                return 600e3;
            case POOLS.curve_compound:
                return 750e3;
            case POOLS.curve_aave:
                return 800e3;
            case POOLS.curve_PAX:
            case POOLS.curve_y:
            case POOLS.curve_BUSD:
                return 850e3;
            // case POOLS.curve_seth:
            default:
                throw new Error(`Unrecognized Curve address: ${poolAddress}`);
        }
    },
    [ERC20BridgeSource.MultiBridge]: () => 350e3,
    [ERC20BridgeSource.UniswapV2]: (fillData?: FillData) => {
        // TODO: Different base cost if to/from ETH.
        let gas = 90e3;
        const path = (fillData as UniswapV2FillData).tokenAddressPath;
        if (path.length > 2) {
            gas += (path.length - 2) * 60e3; // +60k for each hop.
        }
        return gas;
    },
    [ERC20BridgeSource.SushiSwap]: (fillData?: FillData) => {
        // TODO: Different base cost if to/from ETH.
        let gas = 90e3;
        const path = (fillData as SushiSwapFillData).tokenAddressPath;
        if (path.length > 2) {
            gas += (path.length - 2) * 60e3; // +60k for each hop.
        }
        return gas;
    },
    [ERC20BridgeSource.CryptoCom]: (fillData?: FillData) => {
        // TODO: Different base cost if to/from ETH.
        let gas = 90e3 + 20e3 + 60e3; // temporary allowance diff, unrolled FQT
        const path = (fillData as SushiSwapFillData).tokenAddressPath;
        if (path.length > 2) {
            gas += (path.length - 2) * 60e3; // +60k for each hop.
        }
        return gas;
    },
    [ERC20BridgeSource.Balancer]: () => 120e3,
    [ERC20BridgeSource.Cream]: () => 120e3,
    [ERC20BridgeSource.MStable]: () => 700e3,
    [ERC20BridgeSource.Mooniswap]: () => 130e3,
    [ERC20BridgeSource.Swerve]: () => 150e3,
    [ERC20BridgeSource.Shell]: () => 170e3,
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
    [ERC20BridgeSource.SnowSwap]: fillData => {
        switch ((fillData as SnowSwapFillData).pool.poolAddress.toLowerCase()) {
            case '0xbf7ccd6c446acfcc5df023043f2167b62e81899b':
                return 1000e3;
            case '0x4571753311e37ddb44faa8fb78a6df9a6e3c6c0b':
                return 1500e3;
            default:
                throw new Error('Unrecognized SnowSwap address');
        }
    },
    [ERC20BridgeSource.Bancor]: (fillData?: FillData) => {
        let gas = 200e3;
        const path = (fillData as BancorFillData).path;
        if (path.length > 2) {
            gas += (path.length - 2) * 60e3; // +60k for each hop.
        }
        return gas;
    },
};

export const DEFAULT_FEE_SCHEDULE: Required<FeeSchedule> = Object.assign(
    {},
    ...(Object.keys(DEFAULT_GAS_SCHEDULE) as ERC20BridgeSource[]).map(k => ({
        [k]:
            k === ERC20BridgeSource.Native
                ? (fillData: FillData) => PROTOCOL_FEE_MULTIPLIER.plus(DEFAULT_GAS_SCHEDULE[k](fillData))
                : (fillData: FillData) => DEFAULT_GAS_SCHEDULE[k](fillData),
    })),
);

// tslint:enable:custom-no-magic-numbers

export const DEFAULT_GET_MARKET_ORDERS_OPTS: GetMarketOrdersOpts = {
    // tslint:disable-next-line: custom-no-magic-numbers
    runLimit: 2 ** 15,
    excludedSources: [],
    excludedFeeSources: [],
    includedSources: [],
    bridgeSlippage: 0.005,
    maxFallbackSlippage: 0.05,
    numSamples: 13,
    sampleDistributionBase: 1.05,
    feeSchedule: DEFAULT_FEE_SCHEDULE,
    gasSchedule: DEFAULT_GAS_SCHEDULE,
    exchangeProxyOverhead: () => ZERO_AMOUNT,
    allowFallback: true,
    shouldGenerateQuoteReport: false,
    tokenAdjacencyGraph: { default: [] },
};
