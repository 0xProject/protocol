import { BigNumber } from '@0x/utils';

import { MarketOperation, SwapQuote } from '../../src/asset-swapper';
import { IPath } from '../../src/asset-swapper/types';

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
    sourceBreakdown: { singleSource: {}, multihop: [] },
    takerTokenFillAmount: new BigNumber('401019713908867904'),
    makerTokenDecimals: 18,
    takerTokenDecimals: 18,
    takerAmountPerEth: new BigNumber(0),
    makerAmountPerEth: new BigNumber(0),
    blockNumber: 1337420,
    samplerGasUsage: 1_000_000,
};
