// tslint:disable:custom-no-magic-numbers
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';

import { MarketOperation } from '../src/types';
import { getComparisonPrices } from '../src/utils/market_operation_utils/comparison_price';
import { SOURCE_FLAGS } from '../src/utils/market_operation_utils/constants';
import { SourceFilters } from '../src/utils/market_operation_utils/source_filters';
import {
    DexSample,
    ERC20BridgeSource,
    MarketSideLiquidity,
    OptimizerResult,
} from '../src/utils/market_operation_utils/types';

import { chaiSetup } from './utils/chai_setup';

chaiSetup.configure();
const expect = chai.expect;

const DAI_TOKEN = '0x6b175474e89094c44da98b954eedeac495271d0f';
const ETH_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const GAS_PRICE = 50e9; // 50 gwei

// DEX samples to fill in MarketSideLiquidity
const kyberSample1: DexSample = {
    source: ERC20BridgeSource.Kyber,
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
const dexQuotes: DexSample[] = [kyberSample1, uniswapSample1];

const exchangeProxyOverhead = (sourceFlags: number) =>
    sourceFlags === SOURCE_FLAGS.Native ? new BigNumber(220e3).times(GAS_PRICE) : new BigNumber(0);

describe('getComparisonPrices', async () => {
    it('should create a proper comparison price for Sells', () => {
        // test selling 10 ETH for DAI
        // here, ETH is the input token
        // and DAI is the output token
        const AMOUNT = new BigNumber(10 * 1e18);
        const marketSideLiquidity: MarketSideLiquidity = {
            // needed params
            ethToOutputRate: new BigNumber(500),
            ethToInputRate: new BigNumber(1),
            side: MarketOperation.Sell,
            makerTokenDecimals: 18,
            takerTokenDecimals: 18,
            // extra
            inputAmount: new BigNumber(10 * 1e18),
            inputToken: ETH_TOKEN,
            outputToken: DAI_TOKEN,
            dexQuotes: [dexQuotes],
            nativeOrders: [],
            orderFillableAmounts: [],
            twoHopQuotes: [],
            rfqtIndicativeQuotes: [],
            quoteSourceFilters: new SourceFilters(),
        };

        // raw maker over taker rate, let's say is 500 flat
        const adjustedRate = new BigNumber(500);
        const optimizerResult: OptimizerResult = {
            // needed params
            adjustedRate,
            exchangeProxyOverhead,
            // extraneous
            optimizedOrders: [],
            liquidityDelivered: [],
            sourceFlags: SOURCE_FLAGS.Uniswap_V2,
        };

        const comparisonPrices = getComparisonPrices(optimizerResult, AMOUNT, marketSideLiquidity);

        // expected outcome
        const EXPECTED_PRICE = new BigNumber('500.55');

        expect(comparisonPrices.wholeOrder).to.deep.eq(EXPECTED_PRICE);
    });
    it('should create a proper comparison price for Buys', () => {
        // test buying 10 ETH with DAI
        // here, ETH is the input token
        // and DAI is the output token (now from the maker's perspective)
        const AMOUNT = new BigNumber(10 * 1e18);
        const marketSideLiquidity: MarketSideLiquidity = {
            // needed params
            ethToOutputRate: new BigNumber(500),
            ethToInputRate: new BigNumber(1),
            side: MarketOperation.Buy,
            makerTokenDecimals: 18,
            takerTokenDecimals: 18,
            // extra
            inputAmount: new BigNumber(10 * 1e18),
            inputToken: ETH_TOKEN,
            outputToken: DAI_TOKEN,
            dexQuotes: [dexQuotes],
            nativeOrders: [],
            orderFillableAmounts: [],
            twoHopQuotes: [],
            rfqtIndicativeQuotes: [],
            quoteSourceFilters: new SourceFilters(),
        };

        // raw maker over taker rate, let's say is ETH/DAI rate is 500 flat
        const adjustedRate = new BigNumber(1).dividedBy(new BigNumber(500));
        const optimizerResult: OptimizerResult = {
            // needed params
            adjustedRate,
            exchangeProxyOverhead,
            // extraneous
            optimizedOrders: [],
            liquidityDelivered: [],
            sourceFlags: SOURCE_FLAGS.Uniswap_V2,
        };

        const comparisonPrices = getComparisonPrices(optimizerResult, AMOUNT, marketSideLiquidity);

        // expected outcome
        const EXPECTED_PRICE = new BigNumber('0.0020022024');

        expect(comparisonPrices.wholeOrder).to.deep.eq(EXPECTED_PRICE);
    });
});
