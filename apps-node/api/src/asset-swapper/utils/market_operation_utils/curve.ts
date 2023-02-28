import { CurveFunctionSelectors, CurveInfo } from './types';
import {
    MAINNET_TOKENS,
    AVALANCHE_TOKENS,
    FANTOM_TOKENS,
    POLYGON_TOKENS,
    ARBITRUM_TOKENS,
    OPTIMISM_TOKENS,
    BSC_TOKENS,
} from './constants';

// Order dependent
const CURVE_TRI_POOL_MAINNET_TOKENS = [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT];
const CURVE_TRI_BTC_POOL_TOKEN = [MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.sBTC];
const CURVE_POLYGON_ATRICRYPTO_UNDERLYING_TOKENS = [POLYGON_TOKENS.DAI, POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT];
const CURVE_POLYGON_ATRICRYPTO_TOKENS = [POLYGON_TOKENS.amDAI, POLYGON_TOKENS.amUSDC, POLYGON_TOKENS.amUSDT];
const CURVE_FANTOM_TWO_POOL_TOKENS = [FANTOM_TOKENS.DAI, FANTOM_TOKENS.USDC];
const CURVE_ARBITRUM_TWO_POOL_TOKENS = [ARBITRUM_TOKENS.USDC, ARBITRUM_TOKENS.USDT];

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
    btrflyweth: '0xf43b15ab692fde1f9c24a9fce700adcc809d5391', // redacted cartel
    stgusdc: '0x3211c6cbef1429da3d0d58494938299c92ad5860', // stargate
    // StableSwap "open pools" (crv.finance)
    TUSD: '0xecd5e75afb02efa118af914515d6521aabd189f1',
    STABLEx: '0x3252efd4ea2d6c78091a1f43982ee2c3659cc3d1',
    alUSD: '0x43b4fdfd4ff969587185cdb6f0bd875c5fc83f8c',
    FRAX: '0xd632f22692fac7611d2aa1c0d552930d43caed3b',
    LUSD: '0xed279fdd11ca84beef15af5d39bb4d4bee23f0ca',
    BUSD: '0x4807862aa8b2bf68830e4c8dc86d0e9a998e085a',
    DSU3CRV: '0x6ec80df362d7042c50d4469bcfbc174c9dd9109a',
    cvxcrv: '0x9d0464996170c6b9e75eed71c68b99ddedf279e8',
    cvxfxs: '0xd658a338613198204dca1143ac3f01a722b5d94a',
    mim: '0x5a6a4d54456819380173272a5e8e9b9904bdf41b',
    eurt: '0xfd5db7463a3ab53fd211b4af195c5bccc1a03890',
    ethcrv: '0x8301ae4fc9c624d1d396cbdaa1ed877821d7c511',
    ethcvx: '0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4',
    fei_tri: '0x06cb22615ba53e60d67bf6c341a0fd5e718e1655',
    rai_tri: '0x618788357d0ebd8a37e763adab3bc575d54c2c7d',
    DOLA_tri: '0xaa5a67c256e27a5d80712c51971408db3370927d',
    OUSD_tri: '0x87650d7bbfc3a9f10587d7778206671719d9910d',
    d3pool: '0xbaaa1f5dba42c3389bdbc2c9d2de134f5cd0dc89',
    triEURpool: '0xb9446c4ef5ebe66268da6700d26f96273de3d571',
    ibEURsEUR: '0x19b080fe1ffa0553469d20ca36219f17fcf03859',
    wethyfi: '0xc26b89a667578ec7b3f11b2f98d6fd15c07c54ba',
    ycrvcrv: '0x453d92c7d4263201c69aacfaf589ed14202d83a4',
    bLUSD: '0x74ed5d42203806c8cdcf2f04ca5f60dc777b901c',
    rsr: '0x6a6283ab6e31c2aec3fa08697a8f806b740660b2',
    DOLAFRAX: '0xe57180685e3348589e9521aa53af0bcd497e884d',
    crvfrax: '0xdcef968d416a41cdac0ed8702fac8128a64241a2',
};

const CURVE_V2_POOLS = {
    tricrypto: '0x80466c64868e1ab14a1ddf27a676c3fcbe638fe5',
    tricrypto2: '0xd51a44d3fae010294c616388b506acda1bfaae46',
};

const CURVE_POLYGON_POOLS = {
    aave: '0x445fe580ef8d70ff569ab36e80c647af338db351',
    ren: '0xc2d95eef97ec6c17551d45e77b590dc1f9117c67',
};

const CURVE_V2_POLYGON_POOLS = {
    atricrypto3: '0x1d8b86e3d88cdb2d34688e87e72f388cb541b7c8',
};

const CURVE_AVALANCHE_POOLS = {
    aave: '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
    mim: '0xaea2e71b631fa93683bcf256a8689dfa0e094fcd',
    USDC: '0x3a43a5851a3e3e0e25a3c1089670269786be1577',
};

const CURVE_V2_AVALANCHE_POOLS = {
    atricrypto: '0x58e57ca18b7a47112b877e31929798cd3d703b0f',
};

const CURVE_FANTOM_POOLS = {
    fUSDT: '0x92d5ebf3593a92888c25c0abef126583d4b5312e',
    twoPool: '0x27e611fd27b276acbd5ffd632e5eaebec9761e40',
    ren: '0x3ef6a01a0f81d6046290f3e2a8c5b843e738e604',
    tri_v2: '0x2dd7c9371965472e5a5fd28fbe165007c61439e1',
    geist: '0x0fa949783947bf6c1b171db13aeacbb488845b3f',
    FRAX_twoPool: '0x7a656b342e14f745e2b164890e88017e27ae7320',
};

const CURVE_V2_FANTOM_POOLS = {
    tricrypto: '0x3a1659ddcf2339be3aea159ca010979fb49155ff',
};

const CURVE_OPTIMISM_POOLS = {
    tri: '0x1337bedc9d22ecbe766df105c9623922a27963ec',
};

const CURVE_V2_ARBITRUM_POOLS = {
    tri: '0x960ea3e3c7fb317332d990873d354e18d7645590',
    twoPool: '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
    vstFrax: '0x59bf0545fca0e5ad48e13da269facd2e8c886ba4',
    MIM: '0x30df229cefa463e991e29d42db0bae2e122b2ac7',
    fraxBP: '0xc9b8a3fdecb9d5b218d02555a8baf332e5b740d5',
};

const BELT_POOLS = {
    vPool: '0xf16d312d119c13dd27fd0dc814b0bcdcaaa62dfd',
};

const ELLIPSIS_POOLS = {
    threePool: '0x160caed03795365f3a589f10c379ffa7d75d4e76',
};

const ACRYPTOS_POOLS = {
    acs4usd: '0xb3f0c9ea1f05e312093fdb031e789a756659b0ac',
    acs4vai: '0x191409d5a4effe25b0f4240557ba2192d18a191e',
    acs4ust: '0x99c92765efc472a9709ced86310d64c4573c4b77',
    acs3btc: '0xbe7caa236544d1b9a0e7f91e94b9f5bfd3b5ca81',
};

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

const createCurveMetaTwoPoolArbitrum = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
    exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying,
    sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying,
    buyQuoteFunctionSelector: CurveFunctionSelectors.None,
    tokens: [...info.tokens, ...CURVE_ARBITRUM_TWO_POOL_TOKENS],
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
    //@todo investigate Underlying tokens not being able to support swap
    // [CURVE_POOLS.ib]: createCurveExchangeUnderlyingPool({
    //     tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
    //     pool: CURVE_POOLS.ib,
    //     gasSchedule: 646e3,
    // }),
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
        gasSchedule: 250e3,
    }),
    [CURVE_POOLS.cvxfxs]: createCurveFactoryCryptoExchangePool({
        tokens: [MAINNET_TOKENS.FXS, MAINNET_TOKENS.cvxFXS],
        pool: CURVE_POOLS.cvxfxs,
        gasSchedule: 390e3,
    }),
    [CURVE_POOLS.ycrvcrv]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.CRV, MAINNET_TOKENS.ynCRV],
        pool: CURVE_POOLS.ycrvcrv,
        gasSchedule: 450e3,
    }),
    [CURVE_POOLS.bLUSD]: createCurveFactoryCryptoExchangePool({
        tokens: [MAINNET_TOKENS.bLUSD, MAINNET_TOKENS.LUSDCRV],
        pool: CURVE_POOLS.bLUSD,
        gasSchedule: 390e3,
    }),
    [CURVE_POOLS.crvfrax]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.FRAX, MAINNET_TOKENS.USDC],
        pool: CURVE_POOLS.crvfrax,
        gasSchedule: 390e3,
    }),
    [CURVE_POOLS.rsr]: createCurveFactoryCryptoExchangePool({
        tokens: [MAINNET_TOKENS.rsr, MAINNET_TOKENS.crvFRAX],
        pool: CURVE_POOLS.rsr,
        gasSchedule: 390e3,
    }),
    [CURVE_POOLS.DOLAFRAX]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.DOLA, MAINNET_TOKENS.crvFRAX],
        pool: CURVE_POOLS.DOLAFRAX,
        gasSchedule: 260e3,
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

export const CURVE_V2_ARBITRUM_INFOS: { [name: string]: CurveInfo } = {
    [CURVE_V2_ARBITRUM_POOLS.tri]: createCurveExchangeV2Pool({
        tokens: [ARBITRUM_TOKENS.USDT, ARBITRUM_TOKENS.WBTC, ARBITRUM_TOKENS.WETH],
        pool: CURVE_V2_ARBITRUM_POOLS.tri,
        gasSchedule: 600e3,
    }),
    [CURVE_V2_ARBITRUM_POOLS.twoPool]: createCurveExchangePool({
        tokens: [ARBITRUM_TOKENS.USDC, ARBITRUM_TOKENS.USDT],
        pool: CURVE_V2_ARBITRUM_POOLS.twoPool,
        gasSchedule: 400e3,
    }),
    [CURVE_V2_ARBITRUM_POOLS.MIM]: createCurveMetaTwoPoolArbitrum({
        tokens: [ARBITRUM_TOKENS.MIM],
        pool: CURVE_V2_ARBITRUM_POOLS.MIM,
        gasSchedule: 400e3,
    }),
    [CURVE_V2_ARBITRUM_POOLS.fraxBP]: createCurveExchangePool({
        tokens: [ARBITRUM_TOKENS.FRAX, ARBITRUM_TOKENS.USDC],
        pool: CURVE_V2_ARBITRUM_POOLS.fraxBP,
        gasSchedule: 200e3,
    }),
    [CURVE_V2_ARBITRUM_POOLS.vstFrax]: createCurveExchangePool({
        tokens: [ARBITRUM_TOKENS.VST, ARBITRUM_TOKENS.FRAX],
        pool: CURVE_V2_ARBITRUM_POOLS.vstFrax,
        gasSchedule: 200e3,
    }),
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
