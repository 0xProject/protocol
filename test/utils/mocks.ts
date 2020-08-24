import { MarketOperation } from '@0x/asset-swapper';
import { BigNumber } from '@0x/utils';

export const ganacheZrxWethOrder1 = {
    chainId: 1337,
    exchangeAddress: '0x48bacb9266a570d521063ef5dd96e61686dbe788',
    makerAddress: '0x5409ED021D9299bf6814279A6A1411A7e866A631',
    takerAddress: '0x6ecbe1db9ef729cbe972c83fb886247691fb6beb',
    feeRecipientAddress: '0x1000000000000000000000000000000000000011',
    senderAddress: '0x0000000000000000000000000000000000000000',
    makerAssetAmount: '100000000000000000',
    takerAssetAmount: '100000000000000000',
    makerFee: '0',
    takerFee: '0',
    expirationTimeSeconds: '33122559973',
    salt: '1586559973114',
    makerAssetData: '0xf47261b0000000000000000000000000871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
    takerAssetData: '0xf47261b00000000000000000000000000b1ba0af832d7c05fd64161e0db78e85978e8082',
    makerFeeAssetData: '0x',
    takerFeeAssetData: '0x',
    signature:
        '0x1b3ac5f86ffd9b243ed27b8964ecee82988893e740e976b700557c83c03a38275517ae18fecdc5979bd0db950f87c76f3a6f548af35b7226a76ff675ae8f6eee5502',
};

export const ganacheZrxWethOrderExchangeProxy = {
    chainId: 1337,
    exchangeAddress: '0x48bacb9266a570d521063ef5dd96e61686dbe788',
    makerAddress: '0x5409ed021d9299bf6814279a6a1411a7e866a631',
    feeRecipientAddress: '0x1000000000000000000000000000000000000011',
    senderAddress: '0x0000000000000000000000000000000000000000',
    makerAssetAmount: '100000000000000000',
    takerAssetAmount: '100000000000000000',
    makerFee: '0',
    takerFee: '0',
    expirationTimeSeconds: '33122559973',
    salt: '1586559973114',
    makerAssetData: '0xf47261b0000000000000000000000000871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
    takerAssetData: '0xf47261b00000000000000000000000000b1ba0af832d7c05fd64161e0db78e85978e8082',
    makerFeeAssetData: '0x',
    takerFeeAssetData: '0x',
    signature: '0x', // TODOO
};

export const rfqtIndicativeQuoteResponse = {
    makerAssetAmount: '100000000000000000',
    takerAssetAmount: '100000000000000000',
    makerAssetData: '0xf47261b0000000000000000000000000871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
    takerAssetData: '0xf47261b00000000000000000000000000b1ba0af832d7c05fd64161e0db78e85978e8082',
    expirationTimeSeconds: '1903620548', // in the year 2030
};

export const liquiditySources0xOnly = [
    { name: '0x', proportion: '1' },
    { name: 'Uniswap', proportion: '0' },
    { name: 'Uniswap_V2', proportion: '0' },
    { name: 'Eth2Dai', proportion: '0' },
    { name: 'Kyber', proportion: '0' },
    { name: 'Curve', proportion: '0' },
    { name: 'LiquidityProvider', proportion: '0' },
    { name: 'MultiBridge', proportion: '0' },
    { name: 'Balancer', proportion: '0' },
    { name: 'Bancor', proportion: '0' },
    { name: 'mStable', proportion: '0' },
    { name: 'Mooniswap', proportion: '0' },
];

export const randomSellQuote = {
    gasPrice: new BigNumber('201111549'),
    type: MarketOperation.Sell as MarketOperation.Sell, // tslint:disable-line:no-unnecessary-type-assertion
    makerAssetData: '0xf47261b0000000000000000000000000b9302bbc853c3e3480a1eefc2bb6bf4cdca809e6',
    takerAssetData: '0xf47261b00000000000000000000000005471a5833768d1151d34701eba1c9123d1ba2f8a',
    orders: [
        {
            fillableMakerAssetAmount: new BigNumber('496094186121342509'),
            fillableTakerFeeAmount: new BigNumber('132544309273197631'),
            fillableTakerAssetAmount: new BigNumber('416658039773949107'),
            fills: [],
            chainId: 1,
            exchangeAddress: '0x61935cbdd02287b511119ddb11aeb42f1593b7ef',
            expirationTimeSeconds: new BigNumber('952911858'),
            feeRecipientAddress: '0xe5cea514b4a6ce775e0e06ae7bbf7cc01b308406',
            makerAddress: '0x00695b063b2f306d0210d98b4d931afec20ce027',
            makerAssetAmount: new BigNumber('519075362360104984'),
            takerAssetAmount: new BigNumber('570131374720806489'),
            makerFee: new BigNumber('782424419613311665'),
            takerFee: new BigNumber('731964463215211967'),
            salt: new BigNumber('739706916'),
            signature:
                '0xf86a11e74f6f14d38a09f5ed9e6f8cbf34e762bbbe8bb79377cdb3fc1cd6ae3a518806c2b27c38f0e930e83326e40e53c17d0589f52f5260ca173b96fe96ab62532b',
            senderAddress: '0x0000000000000000000000000000000000000000',
            takerAddress: '0x0000000000000000000000000000000000000000',
            makerAssetData: '0xf47261b0000000000000000000000000b9302bbc853c3e3480a1eefc2bb6bf4cdca809e6',
            takerAssetData: '0xf47261b00000000000000000000000005471a5833768d1151d34701eba1c9123d1ba2f8a',
            makerFeeAssetData: '0xf47261b00000000000000000000000006aa46984d0589a3d0714d7678e193f2b3a1237a6',
            takerFeeAssetData: '0xf47261b0000000000000000000000000325bc5de51da662c8c04f8393fb5cc7f181e58d1',
        },
    ],
    bestCaseQuoteInfo: {
        feeTakerAssetAmount: new BigNumber('383288145500497440'),
        makerAssetAmount: new BigNumber('213528060573258946'),
        gas: 3857345,
        protocolFeeInWeiAmount: new BigNumber('569793054675519573'),
        takerAssetAmount: new BigNumber('933887973800245567'),
        totalTakerAssetAmount: new BigNumber('709708376093637456'),
    },
    worstCaseQuoteInfo: {
        feeTakerAssetAmount: new BigNumber('556208982260696635'),
        makerAssetAmount: new BigNumber('195425597817301501'),
        gas: 277671,
        protocolFeeInWeiAmount: new BigNumber('526097088876239888'),
        takerAssetAmount: new BigNumber('227180691057406275'),
        totalTakerAssetAmount: new BigNumber('858719009621193719'),
    },
    sourceBreakdown: {},
    takerAssetFillAmount: new BigNumber('401019713908867904'),
};
