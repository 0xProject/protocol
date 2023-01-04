import { BigNumber, NULL_ADDRESS, NULL_BYTES } from '@0x/utils';

import { MarketOperation, RfqOrderFields, SwapQuote } from '../../src/asset-swapper';
import { IPath } from '../../src/asset-swapper/types';

export const rfqtIndicativeQuoteResponse = {
    makerAmount: '100000000000000000',
    takerAmount: '100000000000000000',
    makerToken: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
    takerToken: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
    expiry: '1903620548', // in the year 2030
};

export const ganacheZrxWethRfqOrderExchangeProxy: RfqOrderFields = {
    chainId: 1337,
    verifyingContract: '0x48bacb9266a570d521063ef5dd96e61686dbe788',
    maker: '0x5409ed021d9299bf6814279a6a1411a7e866a631',
    makerAmount: new BigNumber('100000000000000000'),
    takerAmount: new BigNumber('100000000000000000'),
    expiry: new BigNumber('33122559973'),
    salt: new BigNumber('1586559973114'),
    makerToken: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
    takerToken: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
    pool: NULL_BYTES,
    txOrigin: NULL_ADDRESS,
    taker: NULL_ADDRESS,
};

const bestCaseQuoteInfo = {
    feeTakerTokenAmount: new BigNumber('383288145500497440'),
    makerAmount: new BigNumber('213528060573258946'),
    gas: 3857345,
    protocolFeeInWeiAmount: new BigNumber('569793054675519573'),
    takerAmount: new BigNumber('933887973800245567'),
    totalTakerAmount: new BigNumber('709708376093637456'),
    slippage: 0,
};

export const randomSellQuote: SwapQuote = {
    gasPrice: new BigNumber('201111549'),
    type: MarketOperation.Sell as MarketOperation.Sell,
    makerToken: '0xb9302bbc853c3e3480a1eefc2bb6bf4cdca809e6',
    takerToken: '0x5471a5833768d1151d34701eba1c9123d1ba2f8a',
    path: undefined as unknown as IPath,
    bestCaseQuoteInfo,
    worstCaseQuoteInfo: {
        makerAmount: new BigNumber('195425597817301501'),
        gas: 277671,
        protocolFeeInWeiAmount: new BigNumber('526097088876239888'),
        takerAmount: new BigNumber('227180691057406275'),
        totalTakerAmount: new BigNumber('858719009621193719'),
        slippage: 0,
    },
    sourceBreakdown: {},
    takerTokenFillAmount: new BigNumber('401019713908867904'),
    makerTokenDecimals: 18,
    takerTokenDecimals: 18,
    takerAmountPerEth: new BigNumber(0),
    makerAmountPerEth: new BigNumber(0),
    blockNumber: 1337420,
};
