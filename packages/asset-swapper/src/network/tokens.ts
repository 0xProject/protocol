import { ChainId } from '@0x/contract-addresses';

import { NULL_ADDRESS } from './constants';
import { TokenAdjacencyGraphBuilder } from './token_adjacency_graph_builder';
import { Address, TokenAdjacencyGraph  } from './types';
import { valueByChainId } from './utils';


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
    MANA: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
    KNC: '0xdefa4e8a7bcba345f687a2f1456f5edd9ce97202',
    AAVE: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    sLINK: '0xbbc455cb4f1b9e4bfc4b73970d360c8f032efee6',
    yUSD: '0x5dbcf33d8c2e976c6b560249878e6f1491bca25c',
    ybCRV: '0x2994529c0652d127b7842094103715ec5299bbed',
    yCRV: '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8',
    bCRV: '0x3b3ac5386837dc563660fb6a0937dfaa5924333b',
    yDAI: '0xacd43e627e64355f1861cec6d3a6688b31a6f952',
    yUSDC: '0x597ad1e0c13bfe8025993d9e79c69e1c0233522e',
    yUSDT: '0x2f08119c6f07c006695e079aafc638b8789faf18',
    yTUSD: '0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a',
    crETH: '0xcbc1065255cbc3ab41a6868c22d1f1c573ab89fd',
    ankrETH: '0xe95a203b1a91a908f9b9ce46459d101078c2c3cb',
    vETH: '0x898bad2774eb97cf6b94605677f43b41871410b1',
    HT: '0x6f259637dcD74C767781E37Bc6133cd6A68aa161',
    // Mirror Protocol
    UST: '0xa47c8bf37f92abed4a126bda807a7b7498661acd',
    MIR: '0x09a3ecafa817268f77be1283176b946c4ff2e608',
    ...MIRROR_WRAPPED_TOKENS,
    // StableSwap "open pools" (crv.finance)
    STABLEx: '0xcd91538b91b4ba7797d39a2f66e63810b50a33d0',
    alUSD: '0xbc6da0fe9ad5f3b0d58160288917aa56653660e9',
    FRAX: '0x853d955acef822db058eb8505911ed77f175b99e',
    LUSD: '0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
};

export const ROPSTEN_TOKENS = {
    WETH: '0xc778417e063141139fce010982780140aa0cd5ab',
    DAI: '0xad6d458402f60fd3bd25163575031acdce07538d',
    USDC: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
};

export const BSC_TOKENS = {
    WBNB: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    BUSD: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    USDT: '0x55d398326f99059ff775485246999027b3197955',
    USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    DAI: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
    PAX: '0xb7f8cd00c5a06c0537e2abff0b58033d02e5e094',
    UST: '0x23396cf899ca06c4472205fc903bdb4de249d6fc',
    WEX: '0xa9c41a46a6b3531d28d5c32f6633dd2ff05dfb90',
    WETH: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
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
            ROPSTEN_TOKENS.WETH,
            ROPSTEN_TOKENS.DAI,
            ROPSTEN_TOKENS.USDC,
        ],
        [ChainId.Polygon]: [
            POLYGON_TOKENS.WMATIC,
            POLYGON_TOKENS.WETH,
            POLYGON_TOKENS.USDC,
            POLYGON_TOKENS.DAI,
            POLYGON_TOKENS.USDT,
            POLYGON_TOKENS.WBTC,
        ],
    },
    [],
);

export const DEFAULT_TOKEN_ADJACENCY_GRAPH_BY_CHAIN_ID = valueByChainId<TokenAdjacencyGraph>(
    {
        [ChainId.Mainnet]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Mainnet],
        })
            // Mirror Protocol
            .tap(builder => {
                builder
                    .add(MAINNET_TOKENS.MIR, MAINNET_TOKENS.UST)
                    .add(MAINNET_TOKENS.UST, [MAINNET_TOKENS.MIR, ...Object.values(MIRROR_WRAPPED_TOKENS)])
                    .add(MAINNET_TOKENS.USDT, MAINNET_TOKENS.UST);
                Object.values(MIRROR_WRAPPED_TOKENS).forEach(t => builder.add(t, MAINNET_TOKENS.UST));
            })
            // Build
            .build(),
        [ChainId.BSC]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.BSC],
        }).build(),
        [ChainId.Polygon]: new TokenAdjacencyGraphBuilder({
            default: DEFAULT_INTERMEDIATE_TOKENS_BY_CHAIN_ID[ChainId.Polygon],
        }).build(),
    },
    new TokenAdjacencyGraphBuilder({ default: [] }).build(),
);

export const WRAPPED_NETWORK_TOKEN_BY_CHAIN_ID = {
    ...Object.values(ChainId).map(c => ({ [c]: NULL_ADDRESS })),
    [ChainId.Mainnet]: MAINNET_TOKENS.WETH,
    [ChainId.Ropsten]: ROPSTEN_TOKENS.WETH,
    [ChainId.Polygon]: POLYGON_TOKENS.WMATIC,
    [ChainId.BSC]: BSC_TOKENS.WBNB,
} as any as { [k in ChainId]: Address };
