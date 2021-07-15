import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { BSC_TOKENS, MAINNET_TOKENS, POLYGON_TOKENS } from '../tokens';
import { Address, ERC20BridgeSource, FillData } from '../types';
import { valueByChainId } from '../utils';

/**
 * Configuration info on a Curve pool.
 */
export interface CurveInfo {
    exchangeFunctionSelector: CurveFunctionSelectors;
    sellQuoteFunctionSelector: CurveFunctionSelectors;
    buyQuoteFunctionSelector: CurveFunctionSelectors;
    poolAddress: Address;
    tokens: Address[];
    metaTokens: string[] | undefined;
    gasSchedule: number;
}

export interface CurveFillData extends FillData {
    fromTokenIdx: number;
    toTokenIdx: number;
    pool: CurveInfo;
}

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
    // Smoothy
    swap_uint256 = '0x5673b02d', // swap(uint256,uint256,uint256,uint256)
    get_swap_amount = '0x45cf2ef6', // getSwapAmount(uint256,uint256,uint256)
    // Nerve BSC, Saddle Mainnet
    swap = '0x91695586', // swap(uint8,uint8,uint256,uint256,uint256)
    calculateSwap = '0xa95b089f', // calculateSwap(uint8,uint8,uint256)
    // Curve V2
    exchange_v2 = '0x5b41b908',
    exchange_underlying_v2 = '0x65b2489b',
    get_dy_v2 = '0x556d6e9f',
    get_dy_underlying_v2 = '0x85f11d1e',
}
// tslint:enable: enum-naming

// const CURVE_FORKS = [
//     ERC20BridgeSource.Curve,
//     ERC20BridgeSource.SnowSwap,
//     ERC20BridgeSource.Nerve,
//     ERC20BridgeSource.Belt,
//     ERC20BridgeSource.Ellipsis,
//     ERC20BridgeSource.Smoothy,
//     ERC20BridgeSource.Saddle,
//     ERC20BridgeSource.XSigma,
// ];

const CURVE_POOLS = {
    compound: '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56', // 0.Compound
    // 1.USDT is dead
    PAX: '0x06364f10b501e868329afbc005b3492902d6c763', // 2.PAX
    // 3.y is dead
    // 3.bUSD is dead
    sUSD: '0xa5407eae9ba41422680e2e00537571bcc53efbfd', // 5.sUSD
    renBTC: '0x93054188d876f558f4a66b2ef1d97d16edf0895b', // 6.ren
    sBTC: '0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714', // 7.sbtc
    HBTC: '0x4ca9b3063ec5866a4b82e437059d2c43d1be596f', // 8.hbtc
    TRI: '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', // 9.3pool
    GUSD: '0x4f062658eaaf2c1ccf8c8e36d6824cdf41167956', // 10.gusd
    HUSD: '0x3ef6a01a0f81d6046290f3e2a8c5b843e738e604', // 11.husd
    // 12.usdk is dead
    USDN: '0x0f9cb53ebe405d49a0bbdbd291a65ff571bc83e1', // 13.usdn
    // 14.linkusd is dead
    mUSD: '0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6', // 15.musd
    // 16.rsv is dead
    dUSD: '0x8038c01a0390a8c547446a0b2c18fc9aefecc10c', // 17.dusd
    tBTC: '0xc25099792e9349c7dd09759744ea681c7de2cb66', // 18.tbtc
    pBTC: '0x7f55dde206dbad629c080068923b36fe9d6bdbef', // 19.pbtc
    bBTC: '0x071c661b4deefb59e2a3ddb20db036821eee8f4b', // 20.bbtc
    oBTC: '0xd81da8d904b52208541bade1bd6595d8a251f8dd', // 21.obtc
    UST: '0x890f4e345b1daed0367a877a1612f86a1f86985f', // 22.ust
    eurs: '0x0ce6a5ff5217e38315f87032cf90686c96627caa', // 23.eurs
    seth: '0xc5424b857f758e906013f3555dad202e4bdb4567', // 24.seth
    aave: '0xdebf20617708857ebe4f679508e7b7863a8a8eee', // 25.aave
    steth: '0xdc24316b9ae028f1497c275eb9192a3ea0f67022', // 26.stETH
    saave: '0xeb16ae0052ed37f479f7fe63849198df1765a733', // saave
    ankreth: '0xa96a65c051bf88b4095ee1f2451c2a9d43f53ae2', // ankreth
    USDP: '0x42d7025938bec20b69cbae5a77421082407f053a', // usdp
    ib: '0x2dded6da1bf5dbdf597c45fcfaa3194e53ecfeaf', // iron bank
    link: '0xf178c0b5bb7e7abf4e12a4838c7b7c5ba2c623c0', // link
    // StableSwap "open pools" (crv.finance)
    TUSD: '0xecd5e75afb02efa118af914515d6521aabd189f1',
    STABLEx: '0x3252efd4ea2d6c78091a1f43982ee2c3659cc3d1',
    alUSD: '0x43b4fdfd4ff969587185cdb6f0bd875c5fc83f8c',
    FRAX: '0xd632f22692fac7611d2aa1c0d552930d43caed3b',
    LUSD: '0xed279fdd11ca84beef15af5d39bb4d4bee23f0ca',
    BUSD: '0x4807862aa8b2bf68830e4c8dc86d0e9a998e085a',
};

const CURVE_POLYGON_POOLS = {
    aave: '0x445fe580ef8d70ff569ab36e80c647af338db351',
    ren: '0xc2d95eef97ec6c17551d45e77b590dc1f9117c67',
};

const CURVE_V2_POLYGON_POOLS = {
    atricrypto: '0x3fcd5de6a9fc8a99995c406c77dda3ed7e406f81',
};

const FIREBIRDONESWAP_BSC_POOLS = {
    oneswap: '0x01c9475dbd36e46d1961572c8de24b74616bae9e',
};

const FIREBIRDONESWAP_POLYGON_POOLS = {
    oneswap: '0x01c9475dbd36e46d1961572c8de24b74616bae9e',
};

export const IRONSWAP_POOLS = {
    is3usd: '0x837503e8a8753ae17fb8c8151b8e6f586defcb57',
};

const SWERVE_POOLS = {
    y: '0x329239599afb305da0a2ec69c58f8a6697f9f88d',
};

const SNOWSWAP_POOLS = {
    yUSD: '0xbf7ccd6c446acfcc5df023043f2167b62e81899b',
    yVault: '0x4571753311e37ddb44faa8fb78a6df9a6e3c6c0b',
    // POOL Disabled as it uses WETH over ETH
    // There is a conflict with Curve and SnowSwap
    // where Curve uses ETH and SnowSwap uses WETH
    // To re-enable this we need to flag an WETH
    // unwrap or not
    // eth: '0x16bea2e63adade5984298d53a4d4d9c09e278192',
};

const SADDLE_POOLS = {
    stables: '0x3911f80530595fbd01ab1516ab61255d75aeb066',
    bitcoins: '0x4f6a43ad7cba042606decaca730d4ce0a57ac62e',
    alETH: '0xa6018520eaacc06c30ff2e1b3ee2c7c22e64196a',
    d4: '0xc69ddcd4dfef25d8a793241834d4cc4b3668ead6',
};

const NERVE_POOLS = {
    threePool: '0x1b3771a66ee31180906972580ade9b81afc5fcdc',
};

const BELT_POOLS = {
    vPool: '0xf16d312d119c13dd27fd0dc814b0bcdcaaa62dfd',
};

const ELLIPSIS_POOLS = {
    threePool: '0x160caed03795365f3a589f10c379ffa7d75d4e76',
};

const XSIGMA_POOLS = {
    stable: '0x3333333ACdEdBbC9Ad7bda0876e60714195681c5',
};

const CURVE_V2_POOLS = {
    tricrypto: '0x80466c64868e1ab14a1ddf27a676c3fcbe638fe5',
};
// Order dependent
const CURVE_TRI_POOL_MAINNET_TOKENS = [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT];
const CURVE_TRI_BTC_POOL_TOKEN = [MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.sBTC];
const CURVE_POLYGON_ATRICRYPTO_UNDERLYING_TOKENS = [POLYGON_TOKENS.DAI, POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT];
const CURVE_POLYGON_ATRICRYPTO_TOKENS = [POLYGON_TOKENS.amDAI, POLYGON_TOKENS.amUSDC, POLYGON_TOKENS.amUSDT];

const createCurveExchangePool = (info: { tokens: Address[]; pool: Address; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaTokens: undefined,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveExchangeUnderlyingPool = (info: { tokens: Address[]; pool: Address; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: info.tokens,
    metaTokens: undefined,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveMetaTriPool = (info: { tokens: Address[]; pool: Address; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [...info.tokens, ...CURVE_TRI_POOL_MAINNET_TOKENS],
    metaTokens: info.tokens,
    poolAddress: info.pool,
    gasSchedule: info.gasSchedule,
});

const createCurveMetaTriBtcPool = (info: { tokens: Address[]; pool: Address; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [...info.tokens, ...CURVE_TRI_BTC_POOL_TOKEN],
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
/**
 * Mainnet Curve configuration
 * The tokens are in order of their index, which each curve defines
 * I.e DaiUsdc curve has DAI as index 0 and USDC as index 1
 */
const CURVE_MAINNET_INFOS: { [name: string]: CurveInfo } = {
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
};

const CURVE_POLYGON_INFOS: { [name: string]: CurveInfo } = {
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

const CURVE_V2_POLYGON_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_V2_POLYGON_POOLS.atricrypto]: createCurveV2MetaTriPool({
        tokens: [POLYGON_TOKENS.WBTC, POLYGON_TOKENS.WETH],
        pool: CURVE_V2_POLYGON_POOLS.atricrypto,
        gasSchedule: 300e3,
    }),
};

const SWERVE_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [SWERVE_POOLS.y]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT, MAINNET_TOKENS.TUSD],
        pool: SWERVE_POOLS.y,
        gasSchedule: 140e3,
    }),
};

const SNOWSWAP_MAINNET_INFOS: { [name: string]: CurveInfo } = {
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

const BELT_BSC_INFOS: { [name: string]: CurveInfo } = {
    [BELT_POOLS.vPool]: createCurveExchangeUnderlyingPool({
        tokens: [BSC_TOKENS.DAI, BSC_TOKENS.USDC, BSC_TOKENS.USDT, BSC_TOKENS.BUSD],
        pool: BELT_POOLS.vPool,
        gasSchedule: 4490e3,
    }),
};

const ELLIPSIS_BSC_INFOS: { [name: string]: CurveInfo } = {
    [ELLIPSIS_POOLS.threePool]: createCurveExchangePool({
        tokens: [BSC_TOKENS.BUSD, BSC_TOKENS.USDC, BSC_TOKENS.USDT],
        pool: ELLIPSIS_POOLS.threePool,
        gasSchedule: 140e3,
    }),
};

const XSIGMA_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [XSIGMA_POOLS.stable]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
        pool: XSIGMA_POOLS.stable,
        gasSchedule: 150e3,
    }),
};

// Curve-like sources using custom selectors
const SADDLE_MAINNET_INFOS: { [name: string]: CurveInfo } = {
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

export const CURVE_V2_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_V2_POOLS.tricrypto]: createCurveExchangeV2Pool({
        tokens: [MAINNET_TOKENS.USDT, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.WETH],
        pool: CURVE_V2_POOLS.tricrypto,
        gasSchedule: 300e3,
    }),
};

const NERVE_BSC_INFOS: { [name: string]: CurveInfo } = {
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

const FIREBIRDONESWAP_BSC_INFOS: { [name: string]: CurveInfo } = {
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

const FIREBIRDONESWAP_POLYGON_INFOS: { [name: string]: CurveInfo } = {
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

const CURVELIKE_INFOS_BY_CHAIN_ID = (valueByChainId(
    {
        [ChainId.Mainnet]: {
            [ERC20BridgeSource.Curve]: CURVE_MAINNET_INFOS,
            [ERC20BridgeSource.Swerve]: SWERVE_MAINNET_INFOS,
            [ERC20BridgeSource.SnowSwap]: SNOWSWAP_MAINNET_INFOS,
            [ERC20BridgeSource.Saddle]: SADDLE_MAINNET_INFOS,
            [ERC20BridgeSource.XSigma]: XSIGMA_MAINNET_INFOS,
            [ERC20BridgeSource.CurveV2]: CURVE_V2_MAINNET_INFOS,
        },
        [ChainId.BSC]: {
            [ERC20BridgeSource.Nerve]: NERVE_BSC_INFOS,
            [ERC20BridgeSource.Belt]: BELT_BSC_INFOS,
            [ERC20BridgeSource.Ellipsis]: ELLIPSIS_BSC_INFOS,
            [ERC20BridgeSource.FirebirdOneSwap]: FIREBIRDONESWAP_BSC_INFOS,
        },
        [ChainId.Polygon]: {
            [ERC20BridgeSource.Curve]: CURVE_POLYGON_INFOS,
            [ERC20BridgeSource.CurveV2]: CURVE_V2_POLYGON_INFOS,
            [ERC20BridgeSource.FirebirdOneSwap]: FIREBIRDONESWAP_POLYGON_INFOS,
            [ERC20BridgeSource.IronSwap]: IRONSWAP_POLYGON_INFOS,
        },
    },
    {},
) as any) as { [k in ChainId]: { [k2 in ERC20BridgeSource]: { [name: string]: CurveInfo } } };

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromCurve'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromCurve'];
type SamplerSellEthCall = SamplerEthCall<CurveFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<CurveFillData, BuyContractBuyFunction>;

export class CurveSampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    CurveFillData
> {
    public static async createAsync(chain: Chain, fork: ERC20BridgeSource): Promise<CurveSampler> {
        const curveInfos = CURVELIKE_INFOS_BY_CHAIN_ID[chain.chainId];
        if (!curveInfos) {
            throw new Error(`No curve configs for chain ${chain.chainId}`);
        }
        return new CurveSampler(chain, fork, Object.values(curveInfos[fork] || {}));
    }

    protected constructor(
        chain: Chain,
        public readonly fork: ERC20BridgeSource,
        private readonly _curveInfos: CurveInfo[],
    ) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromCurve',
            buyContractBuyFunctionName: 'sampleBuysFromCurve',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        if (tokenAddressPath.length !== 2) {
            return false;
        }
        return this._curveInfos.some(c => isCurveCompatible(c, tokenAddressPath));
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const curves = this._findCompatibleCurves(tokenAddressPath);
        return curves.map(c => {
            const fromTokenIdx = c.tokens.indexOf(takerToken);
            const toTokenIdx = c.tokens.indexOf(makerToken);
            return {
                args: [
                    {
                        poolAddress: c.poolAddress,
                        sellQuoteFunctionSelector: c.sellQuoteFunctionSelector,
                        buyQuoteFunctionSelector: c.buyQuoteFunctionSelector,
                    },
                    new BigNumber(fromTokenIdx),
                    new BigNumber(toTokenIdx),
                    takerFillAmounts,
                ],
                getDexSamplesFromResult: samples => {
                    return takerFillAmounts.map((a, i) => ({
                        source: this.fork,
                        fillData: { fromTokenIdx, toTokenIdx, pool: c },
                        input: a,
                        output: samples[i],
                    }));
                },
            } as SamplerSellEthCall;
        });
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const curves = this._findCompatibleCurves(tokenAddressPath);
        return curves.map(c => {
            const fromTokenIdx = c.tokens.indexOf(takerToken);
            const toTokenIdx = c.tokens.indexOf(makerToken);
            return {
                args: [
                    {
                        poolAddress: c.poolAddress,
                        sellQuoteFunctionSelector: c.sellQuoteFunctionSelector,
                        buyQuoteFunctionSelector: c.buyQuoteFunctionSelector,
                    },
                    new BigNumber(fromTokenIdx),
                    new BigNumber(toTokenIdx),
                    makerFillAmounts,
                ],
                getDexSamplesFromResult: samples =>
                    makerFillAmounts.map((a, i) => ({
                        source: this.fork,
                        fillData: { fromTokenIdx, toTokenIdx, pool: c },
                        input: a,
                        output: samples[i],
                    })),
            } as SamplerSellEthCall;
        });
    }

    private _findCompatibleCurves(tokenAddressPath: Address[]): CurveInfo[] {
        return this._curveInfos.filter(c => isCurveCompatible(c, tokenAddressPath));
    }
}

export function isCurveCompatible(curve: CurveInfo, tokens: Address[]): boolean {
    return (
        tokens.every(t => curve.tokens.includes(t)) &&
        (!curve.metaTokens || tokens.some(t => curve.metaTokens!.includes(t)))
    );
}
