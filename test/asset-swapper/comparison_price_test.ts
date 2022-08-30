import { BigNumber } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';

import { SOURCE_FLAGS } from '../../src/asset-swapper';
import { MarketOperation } from '../../src/asset-swapper/types';
import { getComparisonPrices } from '../../src/asset-swapper/utils/market_operation_utils/comparison_price';
import { SourceFilters } from '../../src/asset-swapper/utils/market_operation_utils/source_filters';
import {
    DexSample,
    ERC20BridgeSource,
    MarketSideLiquidity,
} from '../../src/asset-swapper/utils/market_operation_utils/types';

import { chaiSetup } from './utils/chai_setup';

chaiSetup.configure();
const expect = chai.expect;

const DAI_TOKEN = '0x6b175474e89094c44da98b954eedeac495271d0f';
const ETH_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const GAS_PRICE = new BigNumber(50e9); // 50 gwei
const NATIVE_ORDER_GAS = 220e3; // 220K gas

// DEX samples to fill in MarketSideLiquidity
const curveSample: DexSample = {
    source: ERC20BridgeSource.Curve,
    input: new BigNumber(10000),
    output: new BigNumber(10001),
    fillData: {},
};
const uniswapSample1: DexSample = {
    source: ERC20BridgeSource.UniswapV2,
    input: new BigNumber(10003),
    output: new BigNumber(10004),
    fillData: {},
};
const dexQuotes: DexSample[] = [curveSample, uniswapSample1];

const feeSchedule = {
    [ERC20BridgeSource.Native]: _.constant({
        gas: NATIVE_ORDER_GAS,
        fee: GAS_PRICE.times(NATIVE_ORDER_GAS),
    }),
};

const exchangeProxyOverhead = (sourceFlags: bigint) => {
    if ([SOURCE_FLAGS.RfqOrder].includes(sourceFlags)) {
        return new BigNumber(20e3).times(GAS_PRICE);
    } else {
        return new BigNumber(200e3).times(GAS_PRICE);
    }
};

const buyMarketSideLiquidity: MarketSideLiquidity = {
    // needed params
    outputAmountPerEth: new BigNumber(500),
    inputAmountPerEth: new BigNumber(1),
    side: MarketOperation.Buy,
    makerTokenDecimals: 18,
    takerTokenDecimals: 18,
    // extra
    inputAmount: new BigNumber(0),
    inputToken: ETH_TOKEN,
    outputToken: DAI_TOKEN,
    quotes: {
        twoHopQuotes: [],
        rfqtIndicativeQuotes: [],
        dexQuotes: [dexQuotes],
        nativeOrders: [],
    },
    quoteSourceFilters: new SourceFilters(),
    isRfqSupported: false,
    blockNumber: 1337420,
};

const sellMarketSideLiquidity: MarketSideLiquidity = {
    // needed params
    outputAmountPerEth: new BigNumber(500),
    inputAmountPerEth: new BigNumber(1),
    side: MarketOperation.Sell,
    makerTokenDecimals: 18,
    takerTokenDecimals: 18,
    // extra
    inputAmount: new BigNumber(0),
    inputToken: ETH_TOKEN,
    outputToken: DAI_TOKEN,
    quotes: {
        dexQuotes: [dexQuotes],
        nativeOrders: [],
        twoHopQuotes: [],
        rfqtIndicativeQuotes: [],
    },
    quoteSourceFilters: new SourceFilters(),
    isRfqSupported: false,
    blockNumber: 1337420,
};

describe('getComparisonPrices', async () => {
    it('should create a proper comparison price for Sells', () => {
        // test selling 10 ETH for DAI
        // here, ETH is the input token
        // and DAI is the output token
        const AMOUNT = new BigNumber(10 * 1e18);
        // raw maker over taker rate, let's say is 500 flat
        const adjustedRate = new BigNumber(500);

        const comparisonPrices = getComparisonPrices(
            adjustedRate,
            AMOUNT,
            sellMarketSideLiquidity,
            feeSchedule,
            exchangeProxyOverhead,
        );

        // expected outcome
        const EXPECTED_PRICE = new BigNumber('500.6');

        expect(comparisonPrices.wholeOrder).to.deep.eq(EXPECTED_PRICE);
    });
    it('should create a proper comparison price for Buys', () => {
        // test buying 10 ETH with DAI
        // here, ETH is the input token
        // and DAI is the output token (now from the maker's perspective)
        const AMOUNT = new BigNumber(10 * 1e18);

        // raw maker over taker rate, let's say is ETH/DAI rate is 500 flat
        const adjustedRate = new BigNumber(1).dividedBy(new BigNumber(500));

        const comparisonPrices = getComparisonPrices(
            adjustedRate,
            AMOUNT,
            buyMarketSideLiquidity,
            feeSchedule,
            exchangeProxyOverhead,
        );

        // expected outcome
        const EXPECTED_PRICE = new BigNumber('0.0020024029');

        expect(comparisonPrices.wholeOrder).to.deep.eq(EXPECTED_PRICE);
    });
    it('should not return a price if takerAmount is < 0', () => {
        // test selling 0.00001 ETH for DAI
        // this will result in a negative comparison price, but here we should return undefined
        const AMOUNT = new BigNumber(0.00001 * 1e18);
        // raw maker over taker rate, let's say is 500 flat
        const adjustedRate = new BigNumber(500);

        const comparisonPrices = getComparisonPrices(
            adjustedRate,
            AMOUNT,
            sellMarketSideLiquidity,
            feeSchedule,
            exchangeProxyOverhead,
        );

        expect(comparisonPrices.wholeOrder === undefined);
    });
});
