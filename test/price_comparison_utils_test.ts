// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { ERC20BridgeSource } from '@0x/asset-swapper';
import { ChainId } from '@0x/contract-addresses';
import { expect } from '@0x/contracts-test-utils';
import { getTokenMetadataIfExists } from '@0x/token-metadata';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';

import { ZERO } from '../src/constants';
import { priceComparisonUtils } from '../src/utils/price_comparison_utils';

const WETH = getTokenMetadataIfExists('WETH', ChainId.Mainnet)!;
const DAI = getTokenMetadataIfExists('DAI', ChainId.Mainnet)!;
const USDC = getTokenMetadataIfExists('USDC', ChainId.Mainnet)!;
const buyAmount = new BigNumber('23318242912334152626');
const sellAmount = new BigNumber('70100000000000000');
const ethToDaiRate = buyAmount.div(sellAmount).decimalPlaces(18);
const ethToWethRate = new BigNumber(1);
const gasPrice = new BigNumber(100000000000); // 100 GWEI
const estimatedGas = new BigNumber(136000);

const SUITE_NAME = 'priceComparisonUtils';
const daiWethQuoteBase = {
    buyTokenAddress: DAI.tokenAddress,
    sellTokenAddress: WETH.tokenAddress,
    buyAmount,
    sellAmount,
    sellTokenToEthRate: ethToWethRate,
    buyTokenToEthRate: ethToDaiRate,
    gasPrice,
    estimatedGas,
};

describe(SUITE_NAME, () => {
    describe('getPriceComparisonFromQuote', () => {
        const savingsInEthVsUniswapV1 = new BigNumber('-0.001263636363636364');
        const savingsInEthVsUniswapV2 = new BigNumber('0.004736363636363636');
        const savingsInEthVsKyber = new BigNumber('0.034736363636363636');

        it('returns comparison prices for quote reporter sources when quoting sellAmount', () => {
            const price = buyAmount.div(sellAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                MarketOperation.Sell,
                {
                    ...daiWethQuoteBase,
                    priceComparisonsReport: {
                        dexSources: [
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                        ],
                        multiHopSources: [],
                        nativeSources: [],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    sellAmount,
                    buyAmount,
                    gas: new BigNumber(111e3),
                    savingsInEth: savingsInEthVsUniswapV1,
                },

                // Native sample not found
                {
                    name: ERC20BridgeSource.Native,
                    price: null,
                    gas: null,
                    savingsInEth: null,
                    sellAmount: null,
                    buyAmount: null,
                },
            ]);
        });

        it('returns comparison prices for quote reporter sources when quoting buyAmount', () => {
            const price = sellAmount.div(buyAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(ChainId.Mainnet, MarketOperation.Buy, {
                ...daiWethQuoteBase,
                priceComparisonsReport: {
                    dexSources: [
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount,
                            liquiditySource: ERC20BridgeSource.Uniswap,
                            fillData: {},
                        },
                    ],
                    multiHopSources: [],
                    nativeSources: [],
                },
            });

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    sellAmount,
                    buyAmount,
                    gas: new BigNumber(111e3),
                    savingsInEth: savingsInEthVsUniswapV1,
                },

                // Native sample not found
                {
                    name: ERC20BridgeSource.Native,
                    price: null,
                    gas: null,
                    savingsInEth: null,
                    sellAmount: null,
                    buyAmount: null,
                },
            ]);
        });

        it('filters out incomplete samples with 0 makerAmount when quoting sellAmount', () => {
            const price = buyAmount.div(sellAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                MarketOperation.Sell,
                {
                    ...daiWethQuoteBase,
                    priceComparisonsReport: {
                        dexSources: [
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                            {
                                makerAmount: ZERO,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.MStable,
                                fillData: {},
                            },
                        ],
                        multiHopSources: [],
                        nativeSources: [],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    sellAmount,
                    buyAmount,
                    gas: new BigNumber(111e3),
                    savingsInEth: savingsInEthVsUniswapV1,
                },

                // Native placeholder instead of invalid 0 amount result
                {
                    name: ERC20BridgeSource.Native,
                    price: null,
                    gas: null,
                    savingsInEth: null,
                    sellAmount: null,
                    buyAmount: null,
                },
            ]);
        });

        it('filters out incomplete samples with 0 takerAmount when quoting buyAmount', () => {
            const price = sellAmount.div(buyAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(ChainId.Mainnet, MarketOperation.Buy, {
                ...daiWethQuoteBase,
                priceComparisonsReport: {
                    dexSources: [
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount,
                            liquiditySource: ERC20BridgeSource.Uniswap,
                            fillData: {},
                        },
                        {
                            makerAmount: buyAmount,
                            takerAmount: ZERO,
                            liquiditySource: ERC20BridgeSource.MStable,
                            fillData: {},
                        },
                    ],
                    multiHopSources: [],
                    nativeSources: [],
                },
            });

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    sellAmount,
                    buyAmount,
                    gas: new BigNumber(111e3),
                    savingsInEth: savingsInEthVsUniswapV1,
                },

                // Native placeholder instead of invalid 0 amount result
                {
                    name: ERC20BridgeSource.Native,
                    price: null,
                    gas: null,
                    savingsInEth: null,
                    sellAmount: null,
                    buyAmount: null,
                },
            ]);
        });

        it('returns the Kyber results with highest makerAmount when quoting sellAmount', () => {
            const higherBuyAmount = buyAmount.plus(1e18);
            const higherPrice = higherBuyAmount.div(sellAmount).decimalPlaces(18, BigNumber.ROUND_FLOOR);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                MarketOperation.Sell,
                {
                    ...daiWethQuoteBase,
                    buyAmount: higherBuyAmount,
                    priceComparisonsReport: {
                        dexSources: [
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.Kyber,
                                fillData: {},
                            },
                            {
                                makerAmount: higherBuyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.Kyber,
                                fillData: {},
                            },
                        ],
                        multiHopSources: [],
                        nativeSources: [],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.Kyber,
                    price: higherPrice,
                    sellAmount,
                    buyAmount: higherBuyAmount,
                    gas: new BigNumber(4.71e5),
                    savingsInEth: savingsInEthVsKyber,
                },
            ]);
        });

        it('returns the Kyber results with lowest takerAmount when quoting buyAmount', () => {
            const lowerSellAmount = sellAmount.minus(0.01e18);
            const lowerSellPrice = lowerSellAmount.div(buyAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(ChainId.Mainnet, MarketOperation.Buy, {
                ...daiWethQuoteBase,
                sellAmount: lowerSellAmount,
                priceComparisonsReport: {
                    dexSources: [
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount,
                            liquiditySource: ERC20BridgeSource.Kyber,
                            fillData: {},
                        },
                        {
                            makerAmount: buyAmount,
                            takerAmount: lowerSellAmount,
                            liquiditySource: ERC20BridgeSource.Kyber,
                            fillData: {},
                        },
                    ],
                    multiHopSources: [],
                    nativeSources: [],
                },
            });

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.Kyber,
                    price: lowerSellPrice,
                    sellAmount: lowerSellAmount,
                    buyAmount,
                    gas: new BigNumber(4.71e5),
                    savingsInEth: savingsInEthVsKyber,
                },
            ]);
        });

        it('should match price decimal places to maker asset for sell quotes', () => {
            const wethAmount = new BigNumber(1 / 3).times(1e18).decimalPlaces(0, BigNumber.ROUND_FLOOR);
            const usdcAmount = new BigNumber(100e6);

            const price = wethAmount.div(usdcAmount).div(1e12).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                MarketOperation.Sell,
                {
                    buyTokenAddress: WETH.tokenAddress,
                    sellTokenAddress: USDC.tokenAddress,
                    buyAmount: wethAmount,
                    sellAmount: usdcAmount,
                    sellTokenToEthRate: ethToDaiRate,
                    buyTokenToEthRate: ethToDaiRate,
                    gasPrice,
                    estimatedGas,
                    priceComparisonsReport: {
                        dexSources: [
                            {
                                makerAmount: wethAmount,
                                takerAmount: usdcAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                        ],
                        multiHopSources: [],
                        nativeSources: [],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    sellAmount: usdcAmount,
                    buyAmount: wethAmount,
                    gas: new BigNumber(111e3),
                    savingsInEth: savingsInEthVsUniswapV1,
                },
            ]);
        });

        it('should match price decimal places to taker asset for buy quotes', () => {
            const usdcAmount = new BigNumber(100e6);
            const wethAmount = new BigNumber(7 / 3).times(1e18).decimalPlaces(0, BigNumber.ROUND_FLOOR);

            const price = usdcAmount.div(wethAmount).times(1e12).decimalPlaces(6);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(ChainId.Mainnet, MarketOperation.Buy, {
                buyTokenAddress: WETH.tokenAddress,
                sellTokenAddress: USDC.tokenAddress,
                buyAmount: wethAmount,
                sellAmount: usdcAmount,
                sellTokenToEthRate: ethToDaiRate,
                buyTokenToEthRate: ethToDaiRate,
                gasPrice,
                estimatedGas,
                priceComparisonsReport: {
                    dexSources: [
                        {
                            makerAmount: wethAmount,
                            takerAmount: usdcAmount,
                            liquiditySource: ERC20BridgeSource.Uniswap,
                            fillData: {},
                        },
                    ],
                    multiHopSources: [],
                    nativeSources: [],
                },
            });

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    sellAmount: usdcAmount,
                    buyAmount: wethAmount,
                    gas: new BigNumber(111e3),
                    savingsInEth: savingsInEthVsUniswapV1,
                },
            ]);
        });

        it('handles selling tokens with a different number of decimals', () => {
            const price = new BigNumber(1).decimalPlaces(18);
            const daiAmount = new BigNumber(1e18);
            const usdcAmount = new BigNumber(1e6);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                MarketOperation.Sell,
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: USDC.tokenAddress,
                    buyAmount: daiAmount,
                    sellAmount: usdcAmount,
                    sellTokenToEthRate: ethToWethRate,
                    buyTokenToEthRate: ethToDaiRate,
                    gasPrice,
                    estimatedGas,
                    priceComparisonsReport: {
                        dexSources: [
                            {
                                makerAmount: daiAmount,
                                takerAmount: usdcAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                        ],
                        multiHopSources: [],
                        nativeSources: [],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    sellAmount: usdcAmount,
                    buyAmount: daiAmount,
                    gas: new BigNumber(111e3),
                    savingsInEth: savingsInEthVsUniswapV1,
                },
            ]);
        });

        it('returns the sample with lowest gas usage for the same output amounts when quoting buyAmount', () => {
            const price = sellAmount.div(buyAmount).decimalPlaces(18);
            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(ChainId.Mainnet, MarketOperation.Buy, {
                ...daiWethQuoteBase,
                priceComparisonsReport: {
                    dexSources: [
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount,
                            liquiditySource: ERC20BridgeSource.UniswapV2,
                            fillData: {
                                // Path length > 2 receives a higher gas estimate
                                tokenAddressPath: [{}, {}, {}],
                            },
                        },
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount,
                            liquiditySource: ERC20BridgeSource.UniswapV2,
                            fillData: {
                                tokenAddressPath: [],
                            },
                        },
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount,
                            liquiditySource: ERC20BridgeSource.UniswapV2,
                            fillData: {
                                // Path length > 2 receives a higher gas estimate
                                tokenAddressPath: [{}, {}, {}],
                            },
                        },
                    ],
                    multiHopSources: [],
                    nativeSources: [],
                },
            });

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.UniswapV2,
                    price,
                    buyAmount,
                    sellAmount,
                    gas: new BigNumber(1.71e5),
                    savingsInEth: savingsInEthVsUniswapV2,
                },
            ]);
        });

        it('returns the sample with lowest gas usage for the same output amounts when quoting sellAmount', () => {
            const price = buyAmount.div(sellAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                MarketOperation.Sell,
                {
                    ...daiWethQuoteBase,
                    priceComparisonsReport: {
                        dexSources: [
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.UniswapV2,
                                fillData: {
                                    // Path length > 2 receives a higher gas estimate
                                    tokenAddressPath: [{}, {}, {}],
                                },
                            },
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.UniswapV2,
                                fillData: {
                                    tokenAddressPath: [],
                                },
                            },
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.UniswapV2,
                                fillData: {
                                    // Path length > 2 receives a higher gas estimate
                                    tokenAddressPath: [{}, {}, {}],
                                },
                            },
                        ],
                        multiHopSources: [],
                        nativeSources: [],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.UniswapV2,
                    price,
                    buyAmount,
                    sellAmount,
                    gas: new BigNumber(1.71e5),
                    savingsInEth: savingsInEthVsUniswapV2,
                },
            ]);
        });

        it('returns the overall cheapest sample taking gas into account for sellAmount quotes', () => {
            const price = buyAmount.div(sellAmount).decimalPlaces(18);
            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                MarketOperation.Sell,
                {
                    ...daiWethQuoteBase,
                    priceComparisonsReport: {
                        dexSources: [
                            {
                                makerAmount: buyAmount.plus(1e18), // $1 more received but roughly $1.66 higher gas costs
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.UniswapV2,
                                fillData: {
                                    // Path length > 2 receives a higher gas estimate
                                    tokenAddressPath: [{}, {}, {}],
                                },
                            },
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.UniswapV2,
                                fillData: {
                                    tokenAddressPath: [],
                                },
                            },
                        ],
                        multiHopSources: [],
                        nativeSources: [],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.UniswapV2,
                    price,
                    buyAmount,
                    sellAmount,
                    gas: new BigNumber(1.71e5),
                    savingsInEth: savingsInEthVsUniswapV2,
                },
            ]);
        });

        it('returns the overall cheapest sample taking gas into account for buyAmount quotes', () => {
            const price = sellAmount.div(buyAmount).decimalPlaces(18);
            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(ChainId.Mainnet, MarketOperation.Buy, {
                ...daiWethQuoteBase,
                priceComparisonsReport: {
                    dexSources: [
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount.minus(0.004e18), // Taker needs to sell $1.33 less but $1.66 higher gas costs
                            liquiditySource: ERC20BridgeSource.UniswapV2,
                            fillData: {
                                // Path length > 2 receives a higher gas estimate
                                tokenAddressPath: [{}, {}, {}],
                            },
                        },
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount,
                            liquiditySource: ERC20BridgeSource.UniswapV2,
                            fillData: {
                                tokenAddressPath: [],
                            },
                        },
                    ],
                    multiHopSources: [],
                    nativeSources: [],
                },
            });

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.UniswapV2,
                    price,
                    buyAmount,
                    sellAmount,
                    gas: new BigNumber(1.71e5),
                    savingsInEth: savingsInEthVsUniswapV2,
                },
            ]);
        });

        it('ignores gas cost when buyTokenToEthRate is 0 for sellAmount quotes', () => {
            const price = buyAmount.plus(1e18).div(sellAmount).decimalPlaces(18, BigNumber.ROUND_FLOOR);
            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                MarketOperation.Sell,
                {
                    ...daiWethQuoteBase,
                    buyTokenToEthRate: ZERO,
                    priceComparisonsReport: {
                        dexSources: [
                            {
                                makerAmount: buyAmount.plus(1e18), // $1 more received but roughly $1.66 higher gas costs
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.UniswapV2,
                                fillData: {
                                    // Path length > 2 receives a higher gas estimate
                                    tokenAddressPath: [{}, {}, {}],
                                },
                            },
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.UniswapV2,
                                fillData: {
                                    tokenAddressPath: [],
                                },
                            },
                        ],
                        multiHopSources: [],
                        nativeSources: [],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.UniswapV2,
                    price,
                    gas: new BigNumber(2.21e5),
                    savingsInEth: ZERO,
                    buyAmount: buyAmount.plus(1e18),
                    sellAmount,
                },
            ]);
        });

        it('ignores gas cost when sellTokenToEthRate is 0 for buyAmount quotes', () => {
            const price = sellAmount.minus(0.004e18).div(buyAmount).decimalPlaces(18, BigNumber.ROUND_CEIL);
            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(ChainId.Mainnet, MarketOperation.Buy, {
                ...daiWethQuoteBase,
                sellTokenToEthRate: ZERO,
                priceComparisonsReport: {
                    dexSources: [
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount.minus(0.004e18), // Taker needs to sell $1.33 less but $1.66 higher gas costs
                            liquiditySource: ERC20BridgeSource.UniswapV2,
                            fillData: {
                                // Path length > 2 receives a higher gas estimate
                                tokenAddressPath: [{}, {}, {}],
                            },
                        },
                        {
                            makerAmount: buyAmount,
                            takerAmount: sellAmount,
                            liquiditySource: ERC20BridgeSource.UniswapV2,
                            fillData: {
                                tokenAddressPath: [],
                            },
                        },
                    ],
                    multiHopSources: [],
                    nativeSources: [],
                },
            });

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.UniswapV2,
                    price,
                    gas: new BigNumber(2.21e5),
                    savingsInEth: ZERO,
                    buyAmount,
                    sellAmount: sellAmount.minus(0.004e18),
                },
            ]);
        });
    });
});
