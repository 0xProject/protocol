import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import {
    constants,
    expect,
    getRandomFloat,
    getRandomInteger,
    randomAddress,
    toBaseUnitAmount,
} from '@0x/contracts-test-utils';
import { FillQuoteTransformerOrderType, LimitOrderFields, SignatureType } from '@0x/protocol-utils';
import { BigNumber, hexUtils, NULL_ADDRESS } from '@0x/utils';
import * as _ from 'lodash';
import { SignedLimitOrder } from '../../src/asset-swapper/types';

import { DexOrderSampler, getSampleAmounts } from '../../src/asset-swapper/utils/market_operation_utils/sampler';
import { ERC20BridgeSource } from '../../src/asset-swapper/utils/market_operation_utils/types';
import { TokenAdjacencyGraphBuilder } from '../../src/asset-swapper/utils/token_adjacency_graph';

import { MockSamplerContract } from './utils/mock_sampler_contract';
import { generatePseudoRandomSalt } from './utils/utils';

const CHAIN_ID = 1;
const EMPTY_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
describe('DexSampler tests', () => {
    const MAKER_TOKEN = randomAddress();
    const TAKER_TOKEN = randomAddress();
    const chainId = ChainId.Mainnet;

    const wethAddress = getContractAddressesForChainOrThrow(CHAIN_ID).etherToken;
    const exchangeProxyAddress = getContractAddressesForChainOrThrow(CHAIN_ID).exchangeProxy;

    const tokenAdjacencyGraph = new TokenAdjacencyGraphBuilder([wethAddress]).build();

    describe('getSampleAmounts()', () => {
        const FILL_AMOUNT = getRandomInteger(1, 1e18);
        const NUM_SAMPLES = 16;

        it('generates the correct number of amounts', () => {
            const amounts = getSampleAmounts(FILL_AMOUNT, NUM_SAMPLES);
            expect(amounts).to.be.length(NUM_SAMPLES);
        });

        it('first amount is nonzero', () => {
            const amounts = getSampleAmounts(FILL_AMOUNT, NUM_SAMPLES);
            expect(amounts[0]).to.not.bignumber.eq(0);
        });

        it('last amount is the fill amount', () => {
            const amounts = getSampleAmounts(FILL_AMOUNT, NUM_SAMPLES);
            expect(amounts[NUM_SAMPLES - 1]).to.bignumber.eq(FILL_AMOUNT);
        });

        it('can generate a single amount', () => {
            const amounts = getSampleAmounts(FILL_AMOUNT, 1);
            expect(amounts).to.be.length(1);
            expect(amounts[0]).to.bignumber.eq(FILL_AMOUNT);
        });

        it('generates ascending amounts', () => {
            const amounts = getSampleAmounts(FILL_AMOUNT, NUM_SAMPLES);
            for (const i of _.times(NUM_SAMPLES).slice(1)) {
                const prev = amounts[i - 1];
                const amount = amounts[i];
                expect(prev).to.bignumber.lt(amount);
            }
        });
    });

    function createOrder(overrides?: Partial<LimitOrderFields>): SignedLimitOrder {
        const o: SignedLimitOrder = {
            order: {
                salt: generatePseudoRandomSalt(),
                expiry: getRandomInteger(0, 2 ** 64),
                makerToken: MAKER_TOKEN,
                takerToken: TAKER_TOKEN,
                makerAmount: getRandomInteger(1, 1e18),
                takerAmount: getRandomInteger(1, 1e18),
                takerTokenFeeAmount: constants.ZERO_AMOUNT,
                chainId: CHAIN_ID,
                pool: EMPTY_BYTES32,
                feeRecipient: NULL_ADDRESS,
                sender: NULL_ADDRESS,
                maker: NULL_ADDRESS,
                taker: NULL_ADDRESS,
                verifyingContract: exchangeProxyAddress,
                ...overrides,
            },
            signature: { v: 1, r: hexUtils.random(), s: hexUtils.random(), signatureType: SignatureType.EthSign },
            type: FillQuoteTransformerOrderType.Limit,
        };
        return o;
    }
    const ORDERS = _.times(4, () => createOrder());
    const SIMPLE_ORDERS = ORDERS.map((o) => _.omit(o.order, ['chainId', 'verifyingContract']));

    describe('operations', () => {
        it('getLimitOrderFillableMakerAssetAmounts()', async () => {
            const expectedFillableAmounts = ORDERS.map(() => getRandomInteger(0, 100e18));
            const sampler = new MockSamplerContract({
                getLimitOrderFillableMakerAssetAmounts: (orders, signatures) => {
                    expect(orders).to.deep.eq(SIMPLE_ORDERS);
                    expect(signatures).to.deep.eq(ORDERS.map((o) => o.signature));
                    return expectedFillableAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getLimitOrderFillableMakerAmounts(ORDERS, exchangeProxyAddress),
            );
            expect(fillableAmounts).to.deep.eq(expectedFillableAmounts);
        });

        it('getLimitOrderFillableTakerAssetAmounts()', async () => {
            const expectedFillableAmounts = ORDERS.map(() => getRandomInteger(0, 100e18));
            const sampler = new MockSamplerContract({
                getLimitOrderFillableTakerAssetAmounts: (orders, signatures) => {
                    expect(orders).to.deep.eq(SIMPLE_ORDERS);
                    expect(signatures).to.deep.eq(ORDERS.map((o) => o.signature));
                    return expectedFillableAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getLimitOrderFillableTakerAmounts(ORDERS, exchangeProxyAddress),
            );
            expect(fillableAmounts).to.deep.eq(expectedFillableAmounts);
        });

        it('getLiquidityProviderSellQuotes()', async () => {
            const expectedMakerToken = randomAddress();
            const expectedTakerToken = randomAddress();
            const poolAddress = randomAddress();
            const gasCost = 123;
            const sampler = new MockSamplerContract({
                sampleSellsFromLiquidityProvider: (providerAddress, takerToken, makerToken, _fillAmounts) => {
                    expect(providerAddress).to.eq(poolAddress);
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    return [toBaseUnitAmount(1001)];
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                undefined,
                {
                    [poolAddress]: { tokens: [expectedMakerToken, expectedTakerToken], gasCost },
                },
                async () => undefined,
            );
            const [result] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getSellQuotes(
                    [ERC20BridgeSource.LiquidityProvider],
                    expectedMakerToken,
                    expectedTakerToken,
                    [toBaseUnitAmount(1000)],
                ),
            );
            expect(result).to.deep.equal([
                [
                    {
                        source: 'LiquidityProvider',
                        output: toBaseUnitAmount(1001),
                        input: toBaseUnitAmount(1000),
                        fillData: { poolAddress, gasCost },
                    },
                ],
            ]);
        });

        it('getLiquidityProviderBuyQuotes()', async () => {
            const expectedMakerToken = randomAddress();
            const expectedTakerToken = randomAddress();
            const poolAddress = randomAddress();
            const gasCost = 321;
            const sampler = new MockSamplerContract({
                sampleBuysFromLiquidityProvider: (providerAddress, takerToken, makerToken, _fillAmounts) => {
                    expect(providerAddress).to.eq(poolAddress);
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    return [toBaseUnitAmount(999)];
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                undefined,
                {
                    [poolAddress]: { tokens: [expectedMakerToken, expectedTakerToken], gasCost },
                },
                async () => undefined,
            );
            const [result] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getBuyQuotes(
                    [ERC20BridgeSource.LiquidityProvider],
                    expectedMakerToken,
                    expectedTakerToken,
                    [toBaseUnitAmount(1000)],
                ),
            );
            expect(result).to.deep.equal([
                [
                    {
                        source: 'LiquidityProvider',
                        output: toBaseUnitAmount(999),
                        input: toBaseUnitAmount(1000),
                        fillData: { poolAddress, gasCost },
                    },
                ],
            ]);
        });

        it('getUniswapSellQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleSellsFromUniswap: (_router, takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return expectedMakerFillAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getUniswapSellQuotes(
                    randomAddress(),
                    expectedMakerToken,
                    expectedTakerToken,
                    expectedTakerFillAmounts,
                ),
            );
            expect(fillableAmounts).to.deep.eq(expectedMakerFillAmounts);
        });

        it('getUniswapV2SellQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleSellsFromUniswapV2: (_router, path, fillAmounts) => {
                    expect(path).to.deep.eq([expectedMakerToken, expectedTakerToken]);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return expectedMakerFillAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getUniswapV2SellQuotes(
                    NULL_ADDRESS,
                    [expectedMakerToken, expectedTakerToken],
                    expectedTakerFillAmounts,
                ),
            );
            expect(fillableAmounts).to.deep.eq(expectedMakerFillAmounts);
        });

        it('getUniswapBuyQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleBuysFromUniswap: (_router, takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedMakerFillAmounts);
                    return expectedTakerFillAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getUniswapBuyQuotes(
                    randomAddress(),
                    expectedMakerToken,
                    expectedTakerToken,
                    expectedMakerFillAmounts,
                ),
            );
            expect(fillableAmounts).to.deep.eq(expectedTakerFillAmounts);
        });

        interface RatesBySource {
            [src: string]: BigNumber;
        }

        it('getSellQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const sources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.UniswapV2];
            const ratesBySource: RatesBySource = {
                [ERC20BridgeSource.Uniswap]: getRandomFloat(0, 100),
                [ERC20BridgeSource.UniswapV2]: getRandomFloat(0, 100),
            };
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 3);
            let uniswapRouter: string;
            let uniswapV2Router: string;
            const sampler = new MockSamplerContract({
                sampleSellsFromUniswap: (router, takerToken, makerToken, fillAmounts) => {
                    uniswapRouter = router;
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return fillAmounts.map((a) => a.times(ratesBySource[ERC20BridgeSource.Uniswap]).integerValue());
                },
                sampleSellsFromUniswapV2: (router, path, fillAmounts) => {
                    uniswapV2Router = router;
                    if (path.length === 2) {
                        expect(path).to.deep.eq([expectedTakerToken, expectedMakerToken]);
                    } else if (path.length === 3) {
                        expect(path).to.deep.eq([expectedTakerToken, wethAddress, expectedMakerToken]);
                    } else {
                        expect(path).to.have.lengthOf.within(2, 3);
                    }
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return fillAmounts.map((a) => a.times(ratesBySource[ERC20BridgeSource.UniswapV2]).integerValue());
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                tokenAdjacencyGraph,
                undefined,
                async () => undefined,
            );
            const [quotes] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getSellQuotes(
                    sources,
                    expectedMakerToken,
                    expectedTakerToken,
                    expectedTakerFillAmounts,
                ),
            );
            const expectedQuotes = sources.map((s) =>
                expectedTakerFillAmounts.map((a) => ({
                    source: s,
                    input: a,
                    output: a.times(ratesBySource[s]).integerValue(),
                    fillData: (() => {
                        if (s === ERC20BridgeSource.UniswapV2) {
                            return {
                                router: uniswapV2Router,
                                tokenAddressPath: [expectedTakerToken, expectedMakerToken],
                            };
                        }
                        // TODO jacob pass through
                        if (s === ERC20BridgeSource.Uniswap) {
                            return { router: uniswapRouter };
                        }
                        return {};
                    })(),
                })),
            );
            const uniswapV2ETHQuotes = [
                expectedTakerFillAmounts.map((a) => ({
                    source: ERC20BridgeSource.UniswapV2,
                    input: a,
                    output: a.times(ratesBySource[ERC20BridgeSource.UniswapV2]).integerValue(),
                    fillData: {
                        router: uniswapV2Router,
                        tokenAddressPath: [expectedTakerToken, wethAddress, expectedMakerToken],
                    },
                })),
            ];
            //  extra quote for Uniswap V2, which provides a direct quote (tokenA -> tokenB) AND an ETH quote (tokenA -> ETH -> tokenB)
            const additionalSourceCount = 1;
            expect(quotes).to.have.lengthOf(sources.length + additionalSourceCount);
            expect(quotes).to.deep.eq(expectedQuotes.concat(uniswapV2ETHQuotes));
        });
        it('getBuyQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const sources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.UniswapV2];
            const ratesBySource: RatesBySource = {
                [ERC20BridgeSource.Uniswap]: getRandomFloat(0, 100),
                [ERC20BridgeSource.UniswapV2]: getRandomFloat(0, 100),
            };
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 3);
            let uniswapRouter: string;
            let uniswapV2Router: string;
            const sampler = new MockSamplerContract({
                sampleBuysFromUniswap: (router, takerToken, makerToken, fillAmounts) => {
                    uniswapRouter = router;
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedMakerFillAmounts);
                    return fillAmounts.map((a) => a.times(ratesBySource[ERC20BridgeSource.Uniswap]).integerValue());
                },
                sampleBuysFromUniswapV2: (router, path, fillAmounts) => {
                    uniswapV2Router = router;
                    if (path.length === 2) {
                        expect(path).to.deep.eq([expectedTakerToken, expectedMakerToken]);
                    } else if (path.length === 3) {
                        expect(path).to.deep.eq([expectedTakerToken, wethAddress, expectedMakerToken]);
                    } else {
                        expect(path).to.have.lengthOf.within(2, 3);
                    }
                    expect(fillAmounts).to.deep.eq(expectedMakerFillAmounts);
                    return fillAmounts.map((a) => a.times(ratesBySource[ERC20BridgeSource.UniswapV2]).integerValue());
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                chainId,
                sampler,
                undefined,
                undefined,
                tokenAdjacencyGraph,
                undefined,
                async () => undefined,
            );
            const [quotes] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getBuyQuotes(sources, expectedMakerToken, expectedTakerToken, expectedMakerFillAmounts),
            );
            const expectedQuotes = sources.map((s) =>
                expectedMakerFillAmounts.map((a) => ({
                    source: s,
                    input: a,
                    output: a.times(ratesBySource[s]).integerValue(),
                    fillData: (() => {
                        if (s === ERC20BridgeSource.UniswapV2) {
                            return {
                                router: uniswapV2Router,
                                tokenAddressPath: [expectedTakerToken, expectedMakerToken],
                            };
                        }
                        if (s === ERC20BridgeSource.Uniswap) {
                            return { router: uniswapRouter };
                        }
                        return {};
                    })(),
                })),
            );
            const uniswapV2ETHQuotes = [
                expectedMakerFillAmounts.map((a) => ({
                    source: ERC20BridgeSource.UniswapV2,
                    input: a,
                    output: a.times(ratesBySource[ERC20BridgeSource.UniswapV2]).integerValue(),
                    fillData: {
                        router: uniswapV2Router,
                        tokenAddressPath: [expectedTakerToken, wethAddress, expectedMakerToken],
                    },
                })),
            ];
            //  extra quote for Uniswap V2, which provides a direct quote (tokenA -> tokenB) AND an ETH quote (tokenA -> ETH -> tokenB)
            expect(quotes).to.have.lengthOf(sources.length + 1);
            expect(quotes).to.deep.eq(expectedQuotes.concat(uniswapV2ETHQuotes));
        });
        describe('batched operations', () => {
            it('getLimitOrderFillableMakerAssetAmounts(), getLimitOrderFillableTakerAssetAmounts()', async () => {
                const expectedFillableTakerAmounts = ORDERS.map(() => getRandomInteger(0, 100e18));
                const expectedFillableMakerAmounts = ORDERS.map(() => getRandomInteger(0, 100e18));
                const sampler = new MockSamplerContract({
                    getLimitOrderFillableMakerAssetAmounts: (orders, signatures) => {
                        expect(orders).to.deep.eq(SIMPLE_ORDERS);
                        expect(signatures).to.deep.eq(ORDERS.map((o) => o.signature));
                        return expectedFillableMakerAmounts;
                    },
                    getLimitOrderFillableTakerAssetAmounts: (orders, signatures) => {
                        expect(orders).to.deep.eq(SIMPLE_ORDERS);
                        expect(signatures).to.deep.eq(ORDERS.map((o) => o.signature));
                        return expectedFillableTakerAmounts;
                    },
                });
                const dexOrderSampler = new DexOrderSampler(
                    chainId,
                    sampler,
                    undefined,
                    undefined,
                    undefined,
                    undefined,
                    async () => undefined,
                );
                const [fillableMakerAmounts, fillableTakerAmounts] = await dexOrderSampler.executeAsync(
                    dexOrderSampler.getLimitOrderFillableMakerAmounts(ORDERS, exchangeProxyAddress),
                    dexOrderSampler.getLimitOrderFillableTakerAmounts(ORDERS, exchangeProxyAddress),
                );
                expect(fillableMakerAmounts).to.deep.eq(expectedFillableMakerAmounts);
                expect(fillableTakerAmounts).to.deep.eq(expectedFillableTakerAmounts);
            });
        });
    });
});
