// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty

import { ERC20BridgeSource } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';

import { ChainId } from '../src/types';
import { priceComparisonUtils } from '../src/utils/price_comparison_utils';
import { getTokenMetadataIfExists } from '../src/utils/token_metadata_utils';

const WETH = getTokenMetadataIfExists('WETH', ChainId.Mainnet)!;
const DAI = getTokenMetadataIfExists('DAI', ChainId.Mainnet)!;
const USDC = getTokenMetadataIfExists('USDC', ChainId.Mainnet)!;
const buyAmount = new BigNumber('23318242912334152626');
const sellAmount = new BigNumber('70100000000000000');

const SUITE_NAME = 'priceComparisonUtils';

describe(SUITE_NAME, () => {
    describe('getPriceComparisonFromQuote', () => {
        it('returns comparison prices for quote reporter sources when quoting sellAmount', () => {
            const price = buyAmount.div(sellAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                { sellAmount },
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: WETH.tokenAddress,
                    buyAmount,
                    sellAmount,
                    quoteReport: {
                        sourcesConsidered: [
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                        ],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    gas: new BigNumber(90e3),
                },

                // Kyber sample not found
                {
                    name: ERC20BridgeSource.Kyber,
                    price: null,
                    gas: null,
                },
            ]);
        });

        it('returns comparison prices for quote reporter sources when quoting buyAmount', () => {
            const price = sellAmount.div(buyAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                { buyAmount },
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: WETH.tokenAddress,
                    buyAmount,
                    sellAmount,
                    quoteReport: {
                        sourcesConsidered: [
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                        ],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    gas: new BigNumber(90e3),
                },

                // Balancer sample not found
                {
                    name: ERC20BridgeSource.Balancer,
                    price: null,
                    gas: null,
                },
            ]);
        });

        it('filters out incomplete samples with 0 makerAmount when quoting sellAmount', () => {
            const price = buyAmount.div(sellAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                { sellAmount },
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: WETH.tokenAddress,
                    buyAmount,
                    sellAmount,
                    quoteReport: {
                        sourcesConsidered: [
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                            {
                                makerAmount: new BigNumber(0),
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.MStable,
                                fillData: {},
                            },
                        ],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    gas: new BigNumber(90e3),
                },

                // MStable placeholder instead of invalid 0 amount result
                {
                    name: ERC20BridgeSource.MStable,
                    price: null,
                    gas: null,
                },
            ]);
        });

        it('filters out incomplete samples with 0 takerAmount when quoting buyAmount', () => {
            const price = sellAmount.div(buyAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                { buyAmount },
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: WETH.tokenAddress,
                    buyAmount,
                    sellAmount,
                    quoteReport: {
                        sourcesConsidered: [
                            {
                                makerAmount: buyAmount,
                                takerAmount: sellAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                            {
                                makerAmount: buyAmount,
                                takerAmount: new BigNumber(0),
                                liquiditySource: ERC20BridgeSource.MStable,
                                fillData: {},
                            },
                        ],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    gas: new BigNumber(90e3),
                },

                // MStable placeholder instead of invalid 0 amount result
                {
                    name: ERC20BridgeSource.MStable,
                    price: null,
                    gas: null,
                },
            ]);
        });

        it('returns the Kyber results with highest makerAmount when quoting sellAmount', () => {
            const higherBuyAmount = buyAmount.plus(1e18);
            const higherPrice = higherBuyAmount.div(sellAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                { sellAmount },
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: WETH.tokenAddress,
                    buyAmount: higherBuyAmount,
                    sellAmount,
                    quoteReport: {
                        sourcesConsidered: [
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
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.Kyber,
                    price: higherPrice,
                    gas: new BigNumber(5e5),
                },
            ]);
        });

        it('returns the Kyber results with lowest takerAmount when quoting buyAmount', () => {
            const lowerSellAmount = sellAmount.minus(0.01e18);
            const lowerSellPrice = lowerSellAmount.div(buyAmount).decimalPlaces(18);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                { buyAmount },
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: WETH.tokenAddress,
                    buyAmount,
                    sellAmount: lowerSellAmount,
                    quoteReport: {
                        sourcesConsidered: [
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
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                {
                    name: ERC20BridgeSource.Kyber,
                    price: lowerSellPrice,
                    gas: new BigNumber(5e5),
                },
            ]);
        });

        it('handles buying tokens with a different number of decimals', () => {
            const price = new BigNumber(1).decimalPlaces(6);
            const daiAmount = new BigNumber(1e18);
            const usdcAmount = new BigNumber(1e6);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                { buyAmount: daiAmount },
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: USDC.tokenAddress,
                    buyAmount: daiAmount,
                    sellAmount: usdcAmount,
                    quoteReport: {
                        sourcesConsidered: [
                            {
                                makerAmount: daiAmount,
                                takerAmount: usdcAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                        ],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    gas: new BigNumber(90e3),
                },
            ]);
        });

        it('handles selling tokens with a different number of decimals', () => {
            const price = new BigNumber(1).decimalPlaces(18);
            const daiAmount = new BigNumber(1e18);
            const usdcAmount = new BigNumber(1e6);

            const comparisons = priceComparisonUtils.getPriceComparisonFromQuote(
                ChainId.Mainnet,
                { sellAmount: usdcAmount },
                {
                    buyTokenAddress: DAI.tokenAddress,
                    sellTokenAddress: USDC.tokenAddress,
                    buyAmount: daiAmount,
                    sellAmount: usdcAmount,
                    quoteReport: {
                        sourcesConsidered: [
                            {
                                makerAmount: daiAmount,
                                takerAmount: usdcAmount,
                                liquiditySource: ERC20BridgeSource.Uniswap,
                                fillData: {},
                            },
                        ],
                    },
                },
            );

            expect(comparisons).to.deep.include.members([
                // Uniswap sample found
                {
                    name: ERC20BridgeSource.Uniswap,
                    price,
                    gas: new BigNumber(90e3),
                },
            ]);
        });
    });
});
