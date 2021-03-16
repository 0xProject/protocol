import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { TokenAdjacencyGraphBuilder } from '../token_adjacency_graph_builder';

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
    TokenAdjacencyGraph,
    UniswapV2FillData,
} from './types';

// tslint:disable: custom-no-magic-numbers no-bitwise

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
    ERC20BridgeSource.Component,
    ERC20BridgeSource.MultiHop,
    ERC20BridgeSource.Dodo,
    ERC20BridgeSource.DodoV2,
    ERC20BridgeSource.Cream,
    ERC20BridgeSource.LiquidityProvider,
    ERC20BridgeSource.CryptoCom,
    ERC20BridgeSource.Linkswap,
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
    ERC20BridgeSource.Component,
    ERC20BridgeSource.Swerve,
    ERC20BridgeSource.SnowSwap,
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.MultiHop,
    ERC20BridgeSource.Dodo,
    ERC20BridgeSource.DodoV2,
    ERC20BridgeSource.Cream,
    ERC20BridgeSource.LiquidityProvider,
    ERC20BridgeSource.CryptoCom,
    ERC20BridgeSource.Linkswap,
]);

/**
 *  0x Protocol Fee Multiplier
 */
export const PROTOCOL_FEE_MULTIPLIER = new BigNumber(70000);

/**
 * Sources to poll for ETH fee price estimates.
 */
export const FEE_QUOTE_SOURCES = [ERC20BridgeSource.UniswapV2, ERC20BridgeSource.SushiSwap];

export const SOURCE_FLAGS: { [source in ERC20BridgeSource]: number } = Object.assign(
    {},
    ...Object.values(ERC20BridgeSource).map((source: ERC20BridgeSource, index) => ({ [source]: 1 << index })),
);

const MIRROR_WRAPPED_TOKENS = {
    mAAPL: '0xd36932143f6ebdedd872d5fb0651f4b72fd15a84',
    mSLV: '0x9d1555d8cb3c846bb4f7d5b1b1080872c3166676',
    mIAU: '0x1d350417d9787e000cc1b95d70e9536dcd91f373',
    mAMZN: '0x0cae9e4d663793c2a2a0b211c1cf4bbca2b9caa7',
    mGOOGL: '0x4b70ccd1cf9905be1faed025eadbd3ab124efe9a',
    mTSLA: '0x21ca39943e91d704678f5d00b6616650f066fd63',
    mQQQ: '0x13b02c8de71680e71f0820c996e4be43c2f57d15',
    mTWTR: '0xedb0414627e6f1e3f082de65cd4f9c693d78cca9',
    mMSFT: '0x41bbedd7286daab5910a1f15d12cbda839852bd7',
    mNFLX: '0xc8d674114bac90148d11d3c1d33c61835a0f9dcd',
    mBABA: '0x676ce85f66adb8d7b8323aeefe17087a3b8cb363',
    mUSO: '0x31c63146a635eb7465e5853020b39713ac356991',
    mVIXY: '0xf72fcd9dcf0190923fadd44811e240ef4533fc86',
    mLUNA: '0xd2877702675e6ceb975b4a1dff9fb7baf4c91ea9',
};

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
    USDP: '0x1456688345527be1f37e9e627da0837d6f08c925',
    // Bitcoins
    WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    RenBTC: '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d',
    sBTC: '0xfe18be6b3bd88a2d2a7f928d00292e7a9963cfc6',
    tBTC: '0x8daebade922df735c38c80c7ebd708af50815faa',
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
    stETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    LINK: '0x514910771af9ca656af840dff83e8264ecf986ca',
    sLINK: '0xbbc455cb4f1b9e4bfc4b73970d360c8f032efee6',
    // Mirror Protocol
    UST: '0xa47c8bf37f92abed4a126bda807a7b7498661acd',
    MIR: '0x09a3ecafa817268f77be1283176b946c4ff2e608',
    ...MIRROR_WRAPPED_TOKENS,
    // StableSwap "open pools" (crv.finance)
    STABLEx: '0xcd91538b91b4ba7797d39a2f66e63810b50a33d0',
    alUSD: '0xbc6da0fe9ad5f3b0d58160288917aa56653660e9',
};

export const POOLS = {
    curve_compound: '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56', // 0.Compound
    // 1.USDT is dead
    curve_PAX: '0x06364f10b501e868329afbc005b3492902d6c763', // 2.PAX
    curve_y: '0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51', // 3. y
    curve_BUSD: '0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27', // 4. bUSD
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
    curve_dUSD: '0x8038c01a0390a8c547446a0b2c18fc9aefecc10c', // 17.dusd
    curve_tBTC: '0xc25099792e9349c7dd09759744ea681c7de2cb66', // 18.tbtc
    curve_pBTC: '0x7f55dde206dbad629c080068923b36fe9d6bdbef', // 19.pbtc
    curve_bBTC: '0x071c661b4deefb59e2a3ddb20db036821eee8f4b', // 20.bbtc
    curve_oBTC: '0xd81da8d904b52208541bade1bd6595d8a251f8dd', // 21.obtc
    curve_UST: '0x890f4e345b1daed0367a877a1612f86a1f86985f', // 22.ust
    curve_eurs: '0x0ce6a5ff5217e38315f87032cf90686c96627caa', // 23.eurs
    // curve_seth: '0xc5424b857f758e906013f3555dad202e4bdb4567', // 24.seth
    curve_aave: '0xdebf20617708857ebe4f679508e7b7863a8a8eee', // 25.aave
    // curve steth: '0xdc24316b9ae028f1497c275eb9192a3ea0f67022' // 26.stETH
    curve_saave: '0xeb16ae0052ed37f479f7fe63849198df1765a733', // saave
    // curve_ankreth: '0xa96a65c051bf88b4095ee1f2451c2a9d43f53ae2', // ankreth
    curve_USDP: '0x42d7025938bec20b69cbae5a77421082407f053a', // usdp
    curve_ib: '0x2dded6da1bf5dbdf597c45fcfaa3194e53ecfeaf', // iron bank
    curve_link: '0xf178c0b5bb7e7abf4e12a4838c7b7c5ba2c623c0', // link
    // StableSwap "open pools" (crv.finance)
    curve_TUSD: '0xecd5e75afb02efa118af914515d6521aabd189f1',
    curve_STABLEx: '0x3252efd4ea2d6c78091a1f43982ee2c3659cc3d1',
    curve_alUSD: '0x43b4fdfd4ff969587185cdb6f0bd875c5fc83f8c',
};

export const DEFAULT_INTERMEDIATE_TOKENS = [TOKENS.WETH, TOKENS.USDT, TOKENS.DAI, TOKENS.USDC, TOKENS.WBTC];

export const DEFAULT_TOKEN_ADJACENCY_GRAPH: TokenAdjacencyGraph = new TokenAdjacencyGraphBuilder({
    default: DEFAULT_INTERMEDIATE_TOKENS,
})
    // Mirror Protocol
    .tap(builder => {
        builder
            .add(TOKENS.MIR, TOKENS.UST)
            .add(TOKENS.UST, [TOKENS.MIR, ...Object.values(MIRROR_WRAPPED_TOKENS)])
            .add(TOKENS.USDT, TOKENS.UST);
        Object.values(MIRROR_WRAPPED_TOKENS).forEach(t => builder.add(t, TOKENS.UST));
    })
    // Build
    .build();

// Order dependent
const CURVE_TRI_POOL_TOKENS = [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT];
const CURVE_TRI_BTC_POOL_TOKEN = [TOKENS.RenBTC, TOKENS.WBTC, TOKENS.sBTC];

const createCurveExchangePool = (info: { tokens: string[]; pool: string}) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaToken: undefined,
    poolAddress: info.pool,
});

const createCurveExchangeUnderlyingPool = (info: { tokens: string[]; pool: string}) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaToken: undefined,
    poolAddress: info.pool,
});

const createCurveMetaTriPool = (info: { token: string; pool: string }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [info.token, ...CURVE_TRI_POOL_TOKENS],
    metaToken: info.token,
    poolAddress: info.pool,
});

const createCurveMetaTriBtcPool = (info: { token: string; pool: string }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [info.token, ...CURVE_TRI_BTC_POOL_TOKEN],
    metaToken: info.token,
    poolAddress: info.pool,
});

/**
 * Mainnet Curve configuration
 * The tokens are in order of their index, which each curve defines
 * I.e DaiUsdc curve has DAI as index 0 and USDC as index 1
 */
export const MAINNET_CURVE_INFOS: { [name: string]: CurveInfo } = {
    [POOLS.curve_compound]: createCurveExchangeUnderlyingPool({ tokens: [TOKENS.DAI, TOKENS.USDC], pool: POOLS.curve_compound }),
    // usdt is dead
    [POOLS.curve_PAX]: createCurveExchangeUnderlyingPool({ tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.PAX], pool: POOLS.curve_PAX }),
    [POOLS.curve_y]: createCurveExchangeUnderlyingPool({ tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.TUSD], pool: POOLS.curve_y }),
    [POOLS.curve_BUSD]: createCurveExchangeUnderlyingPool({ tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.BUSD], pool: POOLS.curve_BUSD }),
    [POOLS.curve_sUSD]: createCurveExchangeUnderlyingPool({ tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT, TOKENS.sUSD], pool: POOLS.curve_sUSD }),
    [POOLS.curve_renBTC]: createCurveExchangePool({ tokens: [TOKENS.RenBTC, TOKENS.WBTC], pool: POOLS.curve_renBTC }),
    [POOLS.curve_sBTC]: createCurveExchangePool({ tokens: [TOKENS.RenBTC, TOKENS.WBTC, TOKENS.sBTC], pool: POOLS.curve_sBTC }),
    [POOLS.curve_HBTC]: createCurveExchangePool({ tokens: [TOKENS.hBTC, TOKENS.WBTC], pool: POOLS.curve_HBTC }),
    [POOLS.curve_TRI]: createCurveExchangePool({ tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT], pool: POOLS.curve_TRI }),
    [POOLS.curve_GUSD]: createCurveMetaTriPool({ token: TOKENS.GUSD, pool: POOLS.curve_GUSD }),
    [POOLS.curve_HUSD]: createCurveMetaTriPool({ token: TOKENS.HUSD, pool: POOLS.curve_HUSD }),
    // usdk is dead
    [POOLS.curve_USDN]: createCurveMetaTriPool({ token: TOKENS.USDN, pool: POOLS.curve_USDN }),
    // linkusd is dead
    [POOLS.curve_mUSD]: createCurveMetaTriPool({ token: TOKENS.mUSD, pool: POOLS.curve_mUSD }),
    // rsv is dead
    [POOLS.curve_dUSD]: createCurveMetaTriPool({ token: TOKENS.dUSD, pool: POOLS.curve_dUSD }),
    [POOLS.curve_tBTC]: createCurveMetaTriBtcPool({ token: TOKENS.tBTC, pool: POOLS.curve_tBTC }),
    [POOLS.curve_pBTC]: createCurveMetaTriBtcPool({ token: TOKENS.pBTC, pool: POOLS.curve_pBTC }),
    [POOLS.curve_bBTC]: createCurveMetaTriBtcPool({ token: TOKENS.bBTC, pool: POOLS.curve_bBTC }),
    [POOLS.curve_oBTC]: createCurveMetaTriBtcPool({ token: TOKENS.oBTC, pool: POOLS.curve_oBTC }),
    [POOLS.curve_UST]: createCurveMetaTriPool({ token: TOKENS.UST, pool: POOLS.curve_UST }),
    [POOLS.curve_eurs]: createCurveExchangePool({ tokens: [TOKENS.EURS, TOKENS.sEUR], pool: POOLS.curve_eurs }),
    // TODO: sETH
    [POOLS.curve_aave]: createCurveExchangeUnderlyingPool({ tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT], pool: POOLS.curve_aave }),
    [POOLS.curve_aave]: createCurveExchangePool({ tokens: [TOKENS.aDAI, TOKENS.aUSDC, TOKENS.aUSDT], pool: POOLS.curve_aave }),
    // TODO: stETH
    [POOLS.curve_saave]: createCurveExchangeUnderlyingPool({ tokens: [TOKENS.DAI, TOKENS.sUSD], pool: POOLS.curve_saave }),
    [POOLS.curve_saave]: createCurveExchangePool({ tokens: [TOKENS.aDAI, TOKENS.aSUSD], pool: POOLS.curve_saave }),
    // TODO: ankrETH
    [POOLS.curve_USDP]: createCurveMetaTriPool({ token: TOKENS.USDP, pool: POOLS.curve_USDP }),
    [POOLS.curve_ib]: createCurveExchangeUnderlyingPool({ tokens: [TOKENS.DAI, TOKENS.USDC, TOKENS.USDT], pool: POOLS.curve_ib }),
    [POOLS.curve_link]: createCurveExchangePool({ tokens: [TOKENS.LINK, TOKENS.sLINK], pool: POOLS.curve_link }),
    // StableSwap "open pools" (crv.finance)
    [POOLS.curve_TUSD]: createCurveMetaTriPool({ token: TOKENS.TUSD, pool: POOLS.curve_TUSD }),
    [POOLS.curve_STABLEx]: createCurveMetaTriPool({ token: TOKENS.STABLEx, pool: POOLS.curve_STABLEx }),
    [POOLS.curve_alUSD]: createCurveMetaTriPool({ token: TOKENS.alUSD, pool: POOLS.curve_alUSD }),
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
export const MAINNET_KYBER_NETWORK_PROXY = '0x9aab3f75489902f3a48495025729a0af77d4b11e';

export const LIQUIDITY_PROVIDER_REGISTRY: LiquidityProviderRegistry = {};

export const MAINNET_UNISWAP_V1_ROUTER = '0xc0a47dfe034b400b47bdad5fecda2621de6c4d95';
export const MAINNET_UNISWAP_V2_ROUTER = '0xf164fc0ec4e93095b804a4795bbe1e041497b92a';
export const MAINNET_SUSHI_SWAP_ROUTER = '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f';
export const MAINNET_CRYPTO_COM_ROUTER = '0xceb90e4c17d626be0facd78b79c9c87d7ca181b3';
export const MAINNET_LINKSWAP_ROUTER = '0xa7ece0911fe8c60bff9e99f8fafcdbe56e07aff1';

export const MAINNET_MSTABLE_ROUTER = '0xe2f2a5c287993345a840db3b0845fbc70f5935a5';
export const MAINNET_OASIS_ROUTER = '0x794e6e91555438afc3ccf1c5076a74f42133d08d';

export const MAINNET_MOONISWAP_REGISTRY = '0x71CD6666064C3A1354a3B4dca5fA1E2D3ee7D303';
export const MAINNET_MOONISWAP_V2_REGISTRY = '0xc4a8b7e29e3c8ec560cd4945c1cf3461a85a148d';
export const MAINNET_MOONISWAP_V2_1_REGISTRY = '0xbaf9a5d4b0052359326a6cdab54babaa3a3a9643';

export const MAINNET_DODO_HELPER = '0x533da777aedce766ceae696bf90f8541a4ba80eb';
export const MAINNET_DODOV2_PRIVATE_POOL_FACTORY = '0x6b4fa0bc61eddc928e0df9c7f01e407bfcd3e5ef';
export const MAINNET_DODOV2_VENDING_MACHINE_FACTORY = '0x72d220ce168c4f361dd4dee5d826a01ad8598f6c';
export const MAX_DODOV2_POOLS_QUERIED = 3;

export const CURVE_LIQUIDITY_PROVIDER_BY_CHAIN_ID: { [id: string]: string } = {
    '1': '0x561b94454b65614ae3db0897b74303f4acf7cc75',
    '3': '0xae241c6fc7f28f6dc0cb58b4112ba7f63fcaf5e2',
    '1337': NULL_ADDRESS,
};

// TODO(dorothy-zbornak): Point these to real addresses after deploying.
export const MOONISWAP_LIQUIDITY_PROVIDER_BY_CHAIN_ID: { [id: string]: string } = {
    '1': '0xa2033d6ba88756ce6a87584d69dc87bda9a4f889',
    '3': '0x87e0393aee0fb8c10b8653c6507c182264fe5a34',
    '1337': NULL_ADDRESS,
};

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

export const MAINNET_COMPONENT_POOLS = {
    USDPUSDCUSDT: {
        poolAddress: '0x49519631b404e06ca79c9c7b0dc91648d86f08db',
        tokens: [TOKENS.USDP, TOKENS.USDC, TOKENS.USDT],
    },
    USDPDAISUSD: {
        poolAddress: '0x6477960dd932d29518d7e8087d5ea3d11e606068',
        tokens: [TOKENS.USDP, TOKENS.DAI, TOKENS.sUSD],
    },
};

export const BALANCER_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer';
export const BALANCER_TOP_POOLS_FETCHED = 250;
export const BALANCER_MAX_POOLS_FETCHED = 3;

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
        const nativeFillData = fillData as ({ type: FillQuoteTransformerOrderType });
        return nativeFillData && nativeFillData.type === FillQuoteTransformerOrderType.Limit
            ? PROTOCOL_FEE_MULTIPLIER.plus(100e3).toNumber()
            : // TODO jacob revisit wth v4 LimitOrders
              100e3;
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
            case POOLS.curve_renBTC: // [233106]
                return 83e3;
            case POOLS.curve_TRI: // [221383 - 249948]
                return 85e3;
            case POOLS.curve_HBTC: // [265782 - 278294]
                return 122e3;
            case POOLS.curve_sUSD: // [228096 - 381599]
                return 154e3;
            case POOLS.curve_sBTC: // [242063 - 406242]
                return 174e3;
            case POOLS.curve_link: // [370064 - 381732]
                return 225e3;
            case POOLS.curve_UST: // [349422 - 416373]
                return 232e3;
            case POOLS.curve_eurs: // [398089 - 404619]
                return 251e3;
            case POOLS.curve_USDP: // [371969 - 442917]
                return 257e3;
            case POOLS.curve_dUSD: // [398102 - 470423]
                return 284e3;
            case POOLS.curve_mUSD: // [418131 - 479049]
                return 298e3;
            case POOLS.curve_alUSD: // [414774 - 487158]
                return 300e3;
            case POOLS.curve_HUSD: // [440249 - 473340]
                return 306e3;
            case POOLS.curve_STABLEx: // [425524 - 497083]
                return 311e3;
            case POOLS.curve_TUSD: // [433531 - 503346]
                return 318e3;
            case POOLS.curve_oBTC: // [448496 - 516252]
                return 332e3;
            case POOLS.curve_GUSD: // [452506 - 516970]
                return 334e3;
            case POOLS.curve_USDN: // [439125 - 537742]
                return 338e3;
            case POOLS.curve_bBTC: // [464178 - 704563]
                return 434e3;
            case POOLS.curve_tBTC: // [495019 - 690657]
                return 442e3;
            case POOLS.curve_pBTC: // [514910 - 710548]
                return 462e3;
            case POOLS.curve_aave: // [598267 - 663538]
                return 480e3;
            case POOLS.curve_compound: // [691499 - 708651]
                return 550e3;
            case POOLS.curve_ib: // [676688 - 725010]
                return 550e3;
            case POOLS.curve_saave: // [588743 - 603627]
                return 596e3;
            case POOLS.curve_PAX: // [689012 - 936663]
                return 662e3;
            case POOLS.curve_y: // [977847 - 1621074]
                return 1149e3;
            case POOLS.curve_BUSD: // [1013492 - 1684537]
                return 1199e3;
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
        let gas = 90e3;
        const path = (fillData as UniswapV2FillData).tokenAddressPath;
        if (path.length > 2) {
            gas += (path.length - 2) * 60e3; // +60k for each hop.
        }
        return gas;
    },
    [ERC20BridgeSource.Linkswap]: (fillData?: FillData) => {
        // TODO: Different base cost if to/from ETH.
        let gas = 90e3;
        const path = (fillData as UniswapV2FillData).tokenAddressPath;
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
    [ERC20BridgeSource.Component]: () => 135e3,
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

export const DEFAULT_FEE_SCHEDULE: Required<FeeSchedule> = { ...DEFAULT_GAS_SCHEDULE };

export const POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS = new BigNumber(20000);

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
