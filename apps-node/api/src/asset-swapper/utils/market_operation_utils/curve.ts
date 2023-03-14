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
// const CURVE_POLYGON_ATRICRYPTO_UNDERLYING_TOKENS = [POLYGON_TOKENS.DAI, POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT];
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

// const CURVE_V2_POLYGON_POOLS = {
//     atricrypto3: '0x1d8b86e3d88cdb2d34688e87e72f388cb541b7c8',
// };

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

// const createCurveV2MetaTriPool = (info: { tokens: string[]; pool: string; gasSchedule: number }) => ({
//     exchangeFunctionSelector: CurveFunctionSelectors.exchange_underlying_v2,
//     sellQuoteFunctionSelector: CurveFunctionSelectors.get_dy_underlying_v2,
//     buyQuoteFunctionSelector: CurveFunctionSelectors.None,
//     tokens: [...CURVE_POLYGON_ATRICRYPTO_UNDERLYING_TOKENS, ...info.tokens],
//     metaTokens: info.tokens,
//     poolAddress: info.pool,
//     gasSchedule: info.gasSchedule,
// });

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
    // [CURVE_POOLS.compound]: createCurveExchangeUnderlyingPool({
    //     tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC],
    //     pool: CURVE_POOLS.compound,
    //     gasSchedule: 587e3,
    // }),
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
    // [CURVE_POOLS.aave]: createCurveExchangeUnderlyingPool({
    //     tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
    //     pool: CURVE_POOLS.aave,
    //     gasSchedule: 580e3,
    // }),
    [CURVE_POOLS.aave]: createCurveExchangePool({
        tokens: [MAINNET_TOKENS.aDAI, MAINNET_TOKENS.aUSDC, MAINNET_TOKENS.aUSDT],
        pool: CURVE_POOLS.aave,
        gasSchedule: 580e3,
    }),
    // [CURVE_POOLS.saave]: createCurveExchangeUnderlyingPool({
    //     tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.sUSD],
    //     pool: CURVE_POOLS.saave,
    //     gasSchedule: 580e3,
    // }),
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
    '0xd658a338613198204dca1143ac3f01a722b5d94a': createCurveExchangeV2Pool({
        tokens: ['0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0', '0xfeef77d3f69374f66429c91d732a244f074bdf74'],
        pool: '0xd658a338613198204dca1143ac3f01a722b5d94a',
        gasSchedule: 557341,
    }),
    '0xc26b89a667578ec7b3f11b2f98d6fd15c07c54ba': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e'],
        pool: '0xc26b89a667578ec7b3f11b2f98d6fd15c07c54ba',
        gasSchedule: 631715,
    }),
    '0x6bfe880ed1d639bf80167b93cc9c56a39c1ba2dc': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0'],
        pool: '0x6bfe880ed1d639bf80167b93cc9c56a39c1ba2dc',
        gasSchedule: 565000,
    }),
    '0x9409280dc1e6d33ab7a8c6ec03e5763fb61772b5': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x5a98fcbea516cf06857215779fd812ca3bef1b32'],
        pool: '0x9409280dc1e6d33ab7a8c6ec03e5763fb61772b5',
        gasSchedule: 530000,
    }),
    '0xd51a44d3fae010294c616388b506acda1bfaae46': createCurveExchangeV2Pool({
        tokens: [
            '0xdac17f958d2ee523a2206206994597c13d831ec7',
            '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        ],
        pool: '0xd51a44d3fae010294c616388b506acda1bfaae46',
        gasSchedule: 460158,
    }),
    '0x98a7f18d4e56cfe84e3d081b40001b3d5bd3eb8b': createCurveExchangeV2Pool({
        tokens: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', '0xdb25f211ab05b1c97d595516f45794528a807ad8'],
        pool: '0x98a7f18d4e56cfe84e3d081b40001b3d5bd3eb8b',
        gasSchedule: 400000,
    }),
    '0x8301ae4fc9c624d1d396cbdaa1ed877821d7c511': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xd533a949740bb3306d119cc777fa900ba034cd52'],
        pool: '0x8301ae4fc9c624d1d396cbdaa1ed877821d7c511',
        gasSchedule: 538584,
    }),
    '0x941eb6f616114e4ecaa85377945ea306002612fe': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0'],
        pool: '0x941eb6f616114e4ecaa85377945ea306002612fe',
        gasSchedule: 589184,
    }),
    '0xfb8814d005c5f32874391e888da6eb2fe7a27902': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x73968b9a57c6e53d41345fd57a6e6ae27d6cdb2f'],
        pool: '0xfb8814d005c5f32874391e888da6eb2fe7a27902',
        gasSchedule: 400000,
    }),
    '0x6ec38b3228251a0c5d491faf66858e2e23d7728b': createCurveExchangeV2Pool({
        tokens: ['0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
        pool: '0x6ec38b3228251a0c5d491faf66858e2e23d7728b',
        gasSchedule: 603747,
    }),
    '0x1570af3df649fc74872c5b8f280a162a3bdd4eb6': createCurveExchangeV2Pool({
        tokens: ['0x96e61422b6a9ba0e068b6c5add4ffabc6a4aae27', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
        pool: '0x1570af3df649fc74872c5b8f280a162a3bdd4eb6',
        gasSchedule: 400000,
    }),
    '0x3211c6cbef1429da3d0d58494938299c92ad5860': createCurveExchangeV2Pool({
        tokens: ['0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6', '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
        pool: '0x3211c6cbef1429da3d0d58494938299c92ad5860',
        gasSchedule: 400000,
    }),
    '0x21410232b484136404911780bc32756d5d1a9fa9': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44'],
        pool: '0x21410232b484136404911780bc32756d5d1a9fa9',
        gasSchedule: 480000,
    }),
    '0x838af967537350d2c44abb8c010e49e32673ab94': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x9ae380f0272e2162340a5bb646c354271c0f5cfc'],
        pool: '0x838af967537350d2c44abb8c010e49e32673ab94',
        gasSchedule: 540000,
    }),
    '0xf861483fa7e511fbc37487d91b6faa803af5d37c': createCurveExchangeV2Pool({
        tokens: ['0x853d955acef822db058eb8505911ed77f175b99e', '0x5ca135cb8527d76e932f34b5145575f9d8cbe08e'],
        pool: '0xf861483fa7e511fbc37487d91b6faa803af5d37c',
        gasSchedule: 490000,
    }),
    '0xe0e970a99bc4f53804d8145bebbc7ebc9422ba7f': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x2e9d63788249371f1dfc918a52f8d799f4a38c94'],
        pool: '0xe0e970a99bc4f53804d8145bebbc7ebc9422ba7f',
        gasSchedule: 550000,
    }),
    '0x799d141e83d88996c48b98a4f8eb3d96ab422dd3': createCurveExchangeV2Pool({
        tokens: ['0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', '0xfd56a3dcfc0690881a466ae432d71bb2db588083'],
        pool: '0x799d141e83d88996c48b98a4f8eb3d96ab422dd3',
        gasSchedule: 550000,
    }),
    '0x6e314039f4c56000f4ebb3a7854a84cc6225fb92': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xc55126051b22ebb829d00368f4b12bde432de5da'],
        pool: '0x6e314039f4c56000f4ebb3a7854a84cc6225fb92',
        gasSchedule: 430000,
    }),
    '0x5fae7e604fc3e24fd43a72867cebac94c65b404a': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xbe9895146f7af43049ca1c1ae358b0541ea49704'],
        pool: '0x5fae7e604fc3e24fd43a72867cebac94c65b404a',
        gasSchedule: 562744,
    }),
    '0x58257e4291f95165184b4bea7793a1d6f8e7b627': createCurveExchangeV2Pool({
        tokens: ['0x1a7e4e63778b4f12a199c062f3efdd288afcbce8', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x58257e4291f95165184b4bea7793a1d6f8e7b627',
        gasSchedule: 370000,
    }),
    '0x21d158d95c2e150e144c36fc64e3653b8d6c6267': createCurveExchangeV2Pool({
        tokens: ['0xfeef77d3f69374f66429c91d732a244f074bdf74', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x21d158d95c2e150e144c36fc64e3653b8d6c6267',
        gasSchedule: 480000,
    }),
    '0xbec570d92afb7ffc553bdd9d4b4638121000b10d': createCurveExchangeV2Pool({
        tokens: ['0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0xbec570d92afb7ffc553bdd9d4b4638121000b10d',
        gasSchedule: 455000,
    }),
    '0x4149d1038575ce235e03e03b39487a80fd709d31': createCurveExchangeV2Pool({
        tokens: ['0xdbdb4d16eda451d0503b854cf79d55697f90c8df', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x4149d1038575ce235e03e03b39487a80fd709d31',
        gasSchedule: 380000,
    }),
    '0x31c325a01861c7dbd331a9270296a31296d797a0': createCurveExchangeV2Pool({
        tokens: ['0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x31c325a01861c7dbd331a9270296a31296d797a0',
        gasSchedule: 450000,
    }),
    '0x13b876c26ad6d21cb87ae459eaf6d7a1b788a113': createCurveExchangeV2Pool({
        tokens: ['0x3472a5a71965499acd81997a54bba8d852c6e53d', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x13b876c26ad6d21cb87ae459eaf6d7a1b788a113',
        gasSchedule: 600000,
    }),
    '0xdcb11e81c8b8a1e06bf4b50d4f6f3bb31f7478c3': createCurveExchangeV2Pool({
        tokens: ['0x045da4bfe02b320f4403674b3b7d121737727a36', '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'],
        pool: '0xdcb11e81c8b8a1e06bf4b50d4f6f3bb31f7478c3',
        gasSchedule: 530000,
    }),
    '0x6a6283ab6e31c2aec3fa08697a8f806b740660b2': createCurveExchangeV2Pool({
        tokens: ['0x320623b8e4ff03373931769a31fc52a4e78b5d70', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x6a6283ab6e31c2aec3fa08697a8f806b740660b2',
        gasSchedule: 582923,
    }),
    '0x342d1c4aa76ea6f5e5871b7f11a019a0eb713a4f': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0x72953a5c32413614d24c29c84a66ae4b59581bbf'],
        pool: '0x342d1c4aa76ea6f5e5871b7f11a019a0eb713a4f',
        gasSchedule: 457316,
    }),
    '0x808db6e464279c6a77a1164e0b34d64bd6fb526e': createCurveExchangeV2Pool({
        tokens: ['0xe80c0cd204d654cebe8dd64a4857cab6be8345a3', '0x836a808d4828586a69364065a1e064609f5078c7'],
        pool: '0x808db6e464279c6a77a1164e0b34d64bd6fb526e',
        gasSchedule: 550000,
    }),
    '0xfc1e8bf3e81383ef07be24c3fd146745719de48d': createCurveExchangeV2Pool({
        tokens: ['0x64aa3364f17a4d01c6f1751fd97c2bd3d7e7f1d5', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0xfc1e8bf3e81383ef07be24c3fd146745719de48d',
        gasSchedule: 350000,
    }),
    '0x867fe27fc2462cff8890b54dfd64e6d42a9d1ac8': createCurveExchangeV2Pool({
        tokens: ['0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x867fe27fc2462cff8890b54dfd64e6d42a9d1ac8',
        gasSchedule: 500000,
    }),
    '0x0f3159811670c117c372428d4e69ac32325e4d0f': createCurveExchangeV2Pool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xae78736cd615f374d3085123a210448e74fc6393'],
        pool: '0x0f3159811670c117c372428d4e69ac32325e4d0f',
        gasSchedule: 440000,
    }),
    '0x447ddd4960d9fdbf6af9a790560d0af76795cb08': createCurveExchangePool({
        tokens: ['0xae78736cd615f374d3085123a210448e74fc6393', '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0'],
        pool: '0x447ddd4960d9fdbf6af9a790560d0af76795cb08',
        gasSchedule: 300000,
    }),
    '0xc250b22d15e43d95fbe27b12d98b6098f8493eac': createCurveExchangePool({
        tokens: ['0x808d3e6b23516967ceae4f17a5f9038383ed5311', '0xc770eefad204b5180df6a14ee197d99d808ee52d'],
        pool: '0xc250b22d15e43d95fbe27b12d98b6098f8493eac',
        gasSchedule: 315000,
    }),
    '0x9001a452d39a8710d27ed5c2e10431c13f5fba74': createCurveExchangePool({
        tokens: ['0xd3b5d9a561c293fb42b446fe7e237daa9bf9aa84', '0xdbdb4d16eda451d0503b854cf79d55697f90c8df'],
        pool: '0x9001a452d39a8710d27ed5c2e10431c13f5fba74',
        gasSchedule: 310000,
    }),
    '0x961226b64ad373275130234145b96d100dc0b655': createCurveExchangePool({
        tokens: ['0xadf15ec41689fc5b6dca0db7c53c9bfe7981e655', '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0'],
        pool: '0x961226b64ad373275130234145b96d100dc0b655',
        gasSchedule: 390000,
    }),
    '0x8c524635d52bd7b1bd55e062303177a7d916c046': createCurveExchangePool({
        tokens: ['0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0', '0x402f878bdd1f5c66fdaf0fababcf74741b68ac36'],
        pool: '0x8c524635d52bd7b1bd55e062303177a7d916c046',
        gasSchedule: 410000,
    }),
    '0x48ff31bbbd8ab553ebe7cbd84e1ea3dba8f54957': createCurveExchangePool({
        tokens: ['0x31429d1856ad1377a8a0079410b297e1a9e214c2', '0x752b4c6e92d96467fe9b9a2522ef07228e00f87c'],
        pool: '0x48ff31bbbd8ab553ebe7cbd84e1ea3dba8f54957',
        gasSchedule: 300000,
    }),
    '0xf7b55c3732ad8b2c2da7c24f30a69f55c54fb717': createCurveExchangePool({
        tokens: ['0xd533a949740bb3306d119cc777fa900ba034cd52', '0xd1b5651e55d4ceed36251c61c50c889b36f6abb5'],
        pool: '0xf7b55c3732ad8b2c2da7c24f30a69f55c54fb717',
        gasSchedule: 300000,
    }),
    '0x828b154032950c8ff7cf8085d841723db2696056': createCurveExchangePool({
        tokens: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', '0xae7ab96520de3a18e5e111b5eaab095312d7fe84'],
        pool: '0x828b154032950c8ff7cf8085d841723db2696056',
        gasSchedule: 355000,
    }),
    '0xdadfd00a2bbeb1abc4936b1644a3033e1b653228': createCurveExchangePool({
        tokens: ['0xbcb8b7fc9197feda75c101fa69d3211b5a30dcd9', '0x6021444f1706f15465bee85463bcc7d7cc17fc03'],
        pool: '0xdadfd00a2bbeb1abc4936b1644a3033e1b653228',
        gasSchedule: 280000,
    }),
    '0xba3436fd341f2c8a928452db3c5a3670d1d5cc73': createCurveExchangePool({
        tokens: ['0x1a7e4e63778b4f12a199c062f3efdd288afcbce8', '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c'],
        pool: '0xba3436fd341f2c8a928452db3c5a3670d1d5cc73',
        gasSchedule: 315000,
    }),
    '0xf9078fb962a7d13f55d40d49c8aa6472abd1a5a6': createCurveExchangePool({
        tokens: ['0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b', '0xf05e58fcea29ab4da01a495140b349f8410ba904'],
        pool: '0xf9078fb962a7d13f55d40d49c8aa6472abd1a5a6',
        gasSchedule: 300000,
    }),
    '0x0e9b5b092cad6f1c5e6bc7f89ffe1abb5c95f1c2': createCurveFactoryCryptoExchangePool({
        tokens: ['0xba3335588d9403515223f109edc4eb7269a9ab5d', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
        pool: '0x0e9b5b092cad6f1c5e6bc7f89ffe1abb5c95f1c2',
        gasSchedule: 510000,
    }),
    '0x5b3b5df2bf2b6543f78e053bd91c4bdd820929f1': createCurveExchangePool({
        tokens: ['0x31d4eb09a216e181ec8a43ce79226a487d6f0ba9', '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'],
        pool: '0x5b3b5df2bf2b6543f78e053bd91c4bdd820929f1',
        gasSchedule: 275000,
    }),
    '0xbcb91e689114b9cc865ad7871845c95241df4105': createCurveExchangePool({
        tokens: ['0xf0a93d4994b3d98fb5e3a2f90dbc2d69073cb86b', '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'],
        pool: '0xbcb91e689114b9cc865ad7871845c95241df4105',
        gasSchedule: 440000,
    }),
    '0xfbdca68601f835b27790d98bbb8ec7f05fdeaa9b': createCurveExchangePool({
        tokens: ['0x8751d4196027d4e6da63716fa7786b5174f04c15', '0x075b1bb99792c9e1041ba13afef80c91a1e70fb3'],
        pool: '0xfbdca68601f835b27790d98bbb8ec7f05fdeaa9b',
        gasSchedule: 330000,
    }),
    '0x0fafafd3c393ead5f5129cfc7e0e12367088c473': createCurveExchangePool({
        tokens: ['0x7945b0a6674b175695e5d1d08ae1e6f13744abb0', '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'],
        pool: '0x0fafafd3c393ead5f5129cfc7e0e12367088c473',
        gasSchedule: 280000,
    }),
    '0xe6b5cc1b4b47305c58392ce3d359b10282fc36ea': createCurveExchangePool({
        tokens: ['0x0c10bf8fcb7bf5412187a595ab97a3609160b5c6', '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'],
        pool: '0xe6b5cc1b4b47305c58392ce3d359b10282fc36ea',
        gasSchedule: 270000,
    }),
    '0xe3c190c57b5959ae62efe3b6797058b76ba2f5ef': createCurveExchangePool({
        tokens: ['0x57ab1ec28d129707052df4df418d58a2d46d5f51', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0xe3c190c57b5959ae62efe3b6797058b76ba2f5ef',
        gasSchedule: 400000,
    }),
    '0x497ce58f34605b9944e6b15ecafe6b001206fd25': createCurveExchangePool({
        tokens: ['0x5f98805a4e8be255a32880fdec7f6728c6568ba0', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x497ce58f34605b9944e6b15ecafe6b001206fd25',
        gasSchedule: 270000,
    }),
    '0x04b727c7e246ca70d496ecf52e6b6280f3c8077d': createCurveExchangePool({
        tokens: ['0xff709449528b6fb6b88f557f7d93dece33bca78d', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x04b727c7e246ca70d496ecf52e6b6280f3c8077d',
        gasSchedule: 270000,
    }),
    '0x4e43151b78b5fbb16298c1161fcbf7531d5f8d93': createCurveExchangePool({
        tokens: ['0x056fd409e1d7a124bd7017459dfea2f387b6d5cd', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x4e43151b78b5fbb16298c1161fcbf7531d5f8d93',
        gasSchedule: 300000,
    }),
    '0x33baeda08b8afacc4d3d07cf31d49fc1f1f3e893': createCurveExchangePool({
        tokens: ['0x0000000000085d4780b73119b644ae5ecd22b376', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x33baeda08b8afacc4d3d07cf31d49fc1f1f3e893',
        gasSchedule: 280000,
    }),
    '0xb30da2376f63de30b42dc055c93fa474f31330a5': createCurveExchangePool({
        tokens: ['0xbc6da0fe9ad5f3b0d58160288917aa56653660e9', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0xb30da2376f63de30b42dc055c93fa474f31330a5',
        gasSchedule: 265000,
    }),
    '0xc9c32cd16bf7efb85ff14e0c8603cc90f6f2ee49': createCurveExchangePool({
        tokens: ['0xbea0000029ad1c77d3d5d23ba2d8893db9d1efab', '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'],
        pool: '0xc9c32cd16bf7efb85ff14e0c8603cc90f6f2ee49',
        gasSchedule: 300000,
    }),
    '0x66e335622ad7a6c9c72c98dbfcce684996a20ef9': createCurveExchangePool({
        tokens: ['0x8d6cebd76f18e1558d4db88138e2defb3909fad6', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x66e335622ad7a6c9c72c98dbfcce684996a20ef9',
        gasSchedule: 265000,
    }),
    '0x326290a1b0004eee78fa6ed4f1d8f4b2523ab669': createCurveExchangePool({
        tokens: ['0xd7c9f0e536dc865ae858b0c0453fe76d13c3beac', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x326290a1b0004eee78fa6ed4f1d8f4b2523ab669',
        gasSchedule: 265000,
    }),
    '0x84c333e94aea4a51a21f6cf0c7f528c50dc7592c': createCurveExchangePool({
        tokens: ['0x3c20ac688410be8f391be1fb00afc5c212972f86', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0x84c333e94aea4a51a21f6cf0c7f528c50dc7592c',
        gasSchedule: 265000,
    }),
    '0x2863a328a0b7fc6040f11614fa0728587db8e353': createCurveExchangePool({
        tokens: ['0x66eff5221ca926636224650fd3b9c497ff828f7d', '0x051d7e5609917bd9b73f04bac0ded8dd46a74301'],
        pool: '0x2863a328a0b7fc6040f11614fa0728587db8e353',
        gasSchedule: 260000,
    }),
    '0xf95aaa7ebb1620e46221b73588502960ef63dba0': createCurveExchangePool({
        tokens: ['0x18084fba666a33d37592fa2633fd49a74dd93a88', '0x051d7e5609917bd9b73f04bac0ded8dd46a74301'],
        pool: '0xf95aaa7ebb1620e46221b73588502960ef63dba0',
        gasSchedule: 265000,
    }),
    '0xc3b19502f8c02be75f3f77fd673503520deb51dd': createCurveExchangePool({
        tokens: ['0xab5eb14c09d416f0ac63661e57edb7aecdb9befa', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0xc3b19502f8c02be75f3f77fd673503520deb51dd',
        gasSchedule: 270000,
    }),
    '0xe9123cbc5d1ea65301d417193c40a72ac8d53501': createCurveExchangePool({
        tokens: ['0x94a18d9fe00bab617fad8b49b11e9f1f64db6b36', '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490'],
        pool: '0xe9123cbc5d1ea65301d417193c40a72ac8d53501',
        gasSchedule: 275000,
    }),
    '0xaeda92e6a3b1028edc139a4ae56ec881f3064d4f': createCurveExchangePool({
        tokens: ['0xa0d69e286b938e21cbf7e51d71f6a4c8918f482f', '0x3175df0976dfa876431c2e9ee6bc45b65d3473cc'],
        pool: '0xaeda92e6a3b1028edc139a4ae56ec881f3064d4f',
        gasSchedule: 265000,
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
    // TODO: re-enable.
    // ['aave_exchangeunderlying']: createCurveExchangeUnderlyingPool({
    //     tokens: CURVE_POLYGON_ATRICRYPTO_UNDERLYING_TOKENS,
    //     pool: CURVE_POLYGON_POOLS.aave,
    //     gasSchedule: 300e3,
    // }),
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
    // [CURVE_V2_POLYGON_POOLS.atricrypto3]: createCurveV2MetaTriPool({
    //     tokens: [POLYGON_TOKENS.WBTC, POLYGON_TOKENS.WETH],
    //     pool: CURVE_V2_POLYGON_POOLS.atricrypto3,
    //     gasSchedule: 300e3,
    // }),
};

export const CURVE_AVALANCHE_INFOS: { [name: string]: CurveInfo } = {
    // ['aave_exchangeunderlying']: createCurveExchangeUnderlyingPool({
    //     tokens: [AVALANCHE_TOKENS.DAI, AVALANCHE_TOKENS.USDC, AVALANCHE_TOKENS.USDT],
    //     pool: CURVE_AVALANCHE_POOLS.aave,
    //     gasSchedule: 850e3,
    // }),
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
    // TODO: either remove Belt altogether or add new pools.
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
