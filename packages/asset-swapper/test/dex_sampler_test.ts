import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { expect, getRandomFloat, getRandomInteger, randomAddress, toBaseUnitAmount } from '@0x/contracts-test-utils';
import { LimitOrder, LimitOrderFields } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as _ from 'lodash';

import { BalancerPool } from '../src/utils/market_operation_utils/balancer_utils';
import { DexOrderSampler, getSampleAmounts } from '../src/utils/market_operation_utils/sampler';
import { ERC20BridgeSource, TokenAdjacencyGraph } from '../src/utils/market_operation_utils/types';

import { MockBalancerPoolsCache } from './utils/mock_balancer_pools_cache';
import { MockSamplerContract } from './utils/mock_sampler_contract';
import { generatePseudoRandomSalt } from './utils/utils';

class MockLimitOrder extends LimitOrder {
    public signature?: string;
    constructor(fields: Partial<LimitOrderFields> & { signature?: string } = {}) {
        super(_.omit(fields, 'signature'));
        this.signature = fields.signature;
    }
}
const CHAIN_ID = 1;
// tslint:disable: custom-no-magic-numbers
describe('DexSampler tests', () => {
    const MAKER_TOKEN = randomAddress();
    const TAKER_TOKEN = randomAddress();

    const wethAddress = getContractAddressesForChainOrThrow(CHAIN_ID).etherToken;
    const exchangeAddress = getContractAddressesForChainOrThrow(CHAIN_ID).exchange;
    const exchangeProxyAddress = getContractAddressesForChainOrThrow(CHAIN_ID).exchangeProxy;

    const tokenAdjacencyGraph: TokenAdjacencyGraph = { default: [wethAddress] };

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

    function createOrder(overrides?: Partial<LimitOrderFields>): MockLimitOrder {
        return new MockLimitOrder({
            salt: generatePseudoRandomSalt(),
            expiry: getRandomInteger(0, 2 ** 64),
            makerToken: MAKER_TOKEN,
            takerToken: TAKER_TOKEN,
            makerAmount: getRandomInteger(1, 1e18),
            takerAmount: getRandomInteger(1, 1e18),
            chainId: CHAIN_ID,
            signature: hexUtils.random(),
            verifyingContract: exchangeProxyAddress,
            ...overrides,
        });
    }
    const ORDERS = _.times(4, () => createOrder());
    const SIMPLE_ORDERS = ORDERS.map(o => _.omit(o, ['signature', 'chainId']));

    describe('operations', () => {
        // it('getOrderFillableMakerAmounts()', async () => {
        //     const expectedFillableAmounts = ORDERS.map(() => getRandomInteger(0, 100e18));
        //     const sampler = new MockSamplerContract({
        //         getOrderFillableMakerAssetAmounts: (orders, signatures) => {
        //             expect(orders).to.deep.eq(SIMPLE_ORDERS);
        //             expect(signatures).to.deep.eq(ORDERS.map(o => o.signature));
        //             return expectedFillableAmounts;
        //         },
        //     });
        //     const dexOrderSampler = new DexOrderSampler(
        //         sampler,
        //         undefined,
        //         undefined,
        //         undefined,
        //         undefined,
        //         undefined,
        //         async () => undefined,
        //     );
        //     const [fillableAmounts] = await dexOrderSampler.executeAsync(
        //         dexOrderSampler.getOrderFillableMakerAmounts(ORDERS, exchangeAddress),
        //     );
        //     expect(fillableAmounts).to.deep.eq(expectedFillableAmounts);
        // });

        // it('getOrderFillableTakerAmounts()', async () => {
        //     const expectedFillableAmounts = ORDERS.map(() => getRandomInteger(0, 100e18));
        //     const sampler = new MockSamplerContract({
        //         getOrderFillableTakerAssetAmounts: (orders, signatures) => {
        //             expect(orders).to.deep.eq(SIMPLE_ORDERS);
        //             expect(signatures).to.deep.eq(ORDERS.map(o => o.signature));
        //             return expectedFillableAmounts;
        //         },
        //     });
        //     const dexOrderSampler = new DexOrderSampler(
        //         sampler,
        //         undefined,
        //         undefined,
        //         undefined,
        //         undefined,
        //         undefined,
        //         async () => undefined,
        //     );
        //     const [fillableAmounts] = await dexOrderSampler.executeAsync(
        //         dexOrderSampler.getOrderFillableTakerAmounts(ORDERS, exchangeAddress),
        //     );
        //     expect(fillableAmounts).to.deep.eq(expectedFillableAmounts);
        // });

        it('getKyberSellQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleSellsFromKyberNetwork: (_reserveOffset, takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return ['0x', '0x', expectedMakerFillAmounts];
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getKyberSellQuotes(
                    new BigNumber(0),
                    expectedMakerToken,
                    expectedTakerToken,
                    expectedTakerFillAmounts,
                ),
            );
            expect(fillableAmounts).to.deep.eq(expectedMakerFillAmounts);
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
                sampler,
                undefined,
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
                sampler,
                undefined,
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

        it('getEth2DaiSellQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleSellsFromEth2Dai: (takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return expectedMakerFillAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getEth2DaiSellQuotes(expectedMakerToken, expectedTakerToken, expectedTakerFillAmounts),
            );
            expect(fillableAmounts).to.deep.eq(expectedMakerFillAmounts);
        });

        it('getUniswapSellQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleSellsFromUniswap: (takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return expectedMakerFillAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getUniswapSellQuotes(expectedMakerToken, expectedTakerToken, expectedTakerFillAmounts),
            );
            expect(fillableAmounts).to.deep.eq(expectedMakerFillAmounts);
        });

        it('getUniswapV2SellQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleSellsFromUniswapV2: (path, fillAmounts) => {
                    expect(path).to.deep.eq([expectedMakerToken, expectedTakerToken]);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return expectedMakerFillAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getUniswapV2SellQuotes(
                    [expectedMakerToken, expectedTakerToken],
                    expectedTakerFillAmounts,
                ),
            );
            expect(fillableAmounts).to.deep.eq(expectedMakerFillAmounts);
        });

        it('getEth2DaiBuyQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleBuysFromEth2Dai: (takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedMakerFillAmounts);
                    return expectedTakerFillAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getEth2DaiBuyQuotes(expectedMakerToken, expectedTakerToken, expectedMakerFillAmounts),
            );
            expect(fillableAmounts).to.deep.eq(expectedTakerFillAmounts);
        });

        it('getUniswapBuyQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 10);
            const sampler = new MockSamplerContract({
                sampleBuysFromUniswap: (takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedMakerFillAmounts);
                    return expectedTakerFillAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getUniswapBuyQuotes(expectedMakerToken, expectedTakerToken, expectedMakerFillAmounts),
            );
            expect(fillableAmounts).to.deep.eq(expectedTakerFillAmounts);
        });

        interface RatesBySource {
            [src: string]: BigNumber;
        }

        it('getSellQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const sources = [ERC20BridgeSource.Eth2Dai, ERC20BridgeSource.Uniswap, ERC20BridgeSource.UniswapV2];
            const ratesBySource: RatesBySource = {
                [ERC20BridgeSource.Kyber]: getRandomFloat(0, 100),
                [ERC20BridgeSource.Eth2Dai]: getRandomFloat(0, 100),
                [ERC20BridgeSource.Uniswap]: getRandomFloat(0, 100),
                [ERC20BridgeSource.UniswapV2]: getRandomFloat(0, 100),
            };
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 3);
            const sampler = new MockSamplerContract({
                sampleSellsFromUniswap: (takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return fillAmounts.map(a => a.times(ratesBySource[ERC20BridgeSource.Uniswap]).integerValue());
                },
                sampleSellsFromEth2Dai: (takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return fillAmounts.map(a => a.times(ratesBySource[ERC20BridgeSource.Eth2Dai]).integerValue());
                },
                sampleSellsFromUniswapV2: (router, path, fillAmounts) => {
                    if (path.length === 2) {
                        expect(path).to.deep.eq([expectedTakerToken, expectedMakerToken]);
                    } else if (path.length === 3) {
                        expect(path).to.deep.eq([expectedTakerToken, wethAddress, expectedMakerToken]);
                    } else {
                        expect(path).to.have.lengthOf.within(2, 3);
                    }
                    expect(fillAmounts).to.deep.eq(expectedTakerFillAmounts);
                    return fillAmounts.map(a => a.times(ratesBySource[ERC20BridgeSource.UniswapV2]).integerValue());
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
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
            const expectedQuotes = sources.map(s =>
                expectedTakerFillAmounts.map(a => ({
                    source: s,
                    input: a,
                    output: a.times(ratesBySource[s]).integerValue(),
                    fillData:
                        s === ERC20BridgeSource.UniswapV2
                            ? { tokenAddressPath: [expectedTakerToken, expectedMakerToken] }
                            : {},
                })),
            );
            const uniswapV2ETHQuotes = [
                expectedTakerFillAmounts.map(a => ({
                    source: ERC20BridgeSource.UniswapV2,
                    input: a,
                    output: a.times(ratesBySource[ERC20BridgeSource.UniswapV2]).integerValue(),
                    fillData: {
                        tokenAddressPath: [expectedTakerToken, wethAddress, expectedMakerToken],
                    },
                })),
            ];
            //  extra quote for Uniswap V2, which provides a direct quote (tokenA -> tokenB) AND an ETH quote (tokenA -> ETH -> tokenB)
            const additionalSourceCount = 1;
            expect(quotes).to.have.lengthOf(sources.length + additionalSourceCount);
            expect(quotes).to.deep.eq(expectedQuotes.concat(uniswapV2ETHQuotes));
        });
        it('getSellQuotes() fetches pools but not samples from Balancer', async () => {
            // HACK
            // We disabled the off-chain sampling due to incorrect data observed between
            // on-chain and off-chain sampling
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedTakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 3);
            const pools: BalancerPool[] = [generateBalancerPool(), generateBalancerPool()];
            const balancerPoolsCache = new MockBalancerPoolsCache({
                getPoolsForPairAsync: async (takerToken: string, makerToken: string) => {
                    expect(takerToken).equal(expectedTakerToken);
                    expect(makerToken).equal(expectedMakerToken);
                    return Promise.resolve(pools);
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                new MockSamplerContract({}),
                undefined,
                balancerPoolsCache,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const quotes = await dexOrderSampler.getBalancerSellQuotesOffChainAsync(
                expectedMakerToken,
                expectedTakerToken,
                expectedTakerFillAmounts,
            );
            expect(quotes).to.have.lengthOf(0);
        });
        it('getBuyQuotes()', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const sources = [ERC20BridgeSource.Eth2Dai, ERC20BridgeSource.Uniswap, ERC20BridgeSource.UniswapV2];
            const ratesBySource: RatesBySource = {
                [ERC20BridgeSource.Eth2Dai]: getRandomFloat(0, 100),
                [ERC20BridgeSource.Uniswap]: getRandomFloat(0, 100),
                [ERC20BridgeSource.UniswapV2]: getRandomFloat(0, 100),
            };
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 3);
            const sampler = new MockSamplerContract({
                sampleBuysFromUniswap: (takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedMakerFillAmounts);
                    return fillAmounts.map(a => a.times(ratesBySource[ERC20BridgeSource.Uniswap]).integerValue());
                },
                sampleBuysFromEth2Dai: (takerToken, makerToken, fillAmounts) => {
                    expect(takerToken).to.eq(expectedTakerToken);
                    expect(makerToken).to.eq(expectedMakerToken);
                    expect(fillAmounts).to.deep.eq(expectedMakerFillAmounts);
                    return fillAmounts.map(a => a.times(ratesBySource[ERC20BridgeSource.Eth2Dai]).integerValue());
                },
                sampleBuysFromUniswapV2: (router, path, fillAmounts) => {
                    if (path.length === 2) {
                        expect(path).to.deep.eq([expectedTakerToken, expectedMakerToken]);
                    } else if (path.length === 3) {
                        expect(path).to.deep.eq([expectedTakerToken, wethAddress, expectedMakerToken]);
                    } else {
                        expect(path).to.have.lengthOf.within(2, 3);
                    }
                    expect(fillAmounts).to.deep.eq(expectedMakerFillAmounts);
                    return fillAmounts.map(a => a.times(ratesBySource[ERC20BridgeSource.UniswapV2]).integerValue());
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
                undefined,
                undefined,
                tokenAdjacencyGraph,
                undefined,
                async () => undefined,
            );
            const [quotes] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getBuyQuotes(sources, expectedMakerToken, expectedTakerToken, expectedMakerFillAmounts),
            );
            const expectedQuotes = sources.map(s =>
                expectedMakerFillAmounts.map(a => ({
                    source: s,
                    input: a,
                    output: a.times(ratesBySource[s]).integerValue(),
                    fillData:
                        s === ERC20BridgeSource.UniswapV2
                            ? { tokenAddressPath: [expectedTakerToken, expectedMakerToken] }
                            : {},
                })),
            );
            const uniswapV2ETHQuotes = [
                expectedMakerFillAmounts.map(a => ({
                    source: ERC20BridgeSource.UniswapV2,
                    input: a,
                    output: a.times(ratesBySource[ERC20BridgeSource.UniswapV2]).integerValue(),
                    fillData: {
                        tokenAddressPath: [expectedTakerToken, wethAddress, expectedMakerToken],
                    },
                })),
            ];
            //  extra quote for Uniswap V2, which provides a direct quote (tokenA -> tokenB) AND an ETH quote (tokenA -> ETH -> tokenB)
            expect(quotes).to.have.lengthOf(sources.length + 1);
            expect(quotes).to.deep.eq(expectedQuotes.concat(uniswapV2ETHQuotes));
        });
        it('getBuyQuotes() uses samples from Balancer', async () => {
            const expectedTakerToken = randomAddress();
            const expectedMakerToken = randomAddress();
            const expectedMakerFillAmounts = getSampleAmounts(new BigNumber(100e18), 3);
            const pools: BalancerPool[] = [generateBalancerPool(), generateBalancerPool()];
            const balancerPoolsCache = new MockBalancerPoolsCache({
                getPoolsForPairAsync: async (takerToken: string, makerToken: string) => {
                    expect(takerToken).equal(expectedTakerToken);
                    expect(makerToken).equal(expectedMakerToken);
                    return Promise.resolve(pools);
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                new MockSamplerContract({}),
                undefined,
                balancerPoolsCache,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const quotes = await dexOrderSampler.getBalancerBuyQuotesOffChainAsync(
                expectedMakerToken,
                expectedTakerToken,
                expectedMakerFillAmounts,
            );
            expect(quotes).to.have.lengthOf(0);
        });
    });

    describe('batched operations', () => {
        it('getOrderFillableMakerAmounts(), getOrderFillableTakerAmounts()', async () => {
            const expectedFillableTakerAmounts = ORDERS.map(() => getRandomInteger(0, 100e18));
            const expectedFillableMakerAmounts = ORDERS.map(() => getRandomInteger(0, 100e18));
            const sampler = new MockSamplerContract({
                getOrderFillableMakerAssetAmounts: (orders, signatures) => {
                    expect(orders).to.deep.eq(SIMPLE_ORDERS);
                    expect(signatures).to.deep.eq(ORDERS.map(o => o.signature));
                    return expectedFillableMakerAmounts;
                },
                getOrderFillableTakerAssetAmounts: (orders, signatures) => {
                    expect(orders).to.deep.eq(SIMPLE_ORDERS);
                    expect(signatures).to.deep.eq(ORDERS.map(o => o.signature));
                    return expectedFillableTakerAmounts;
                },
            });
            const dexOrderSampler = new DexOrderSampler(
                sampler,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                async () => undefined,
            );
            const [fillableMakerAmounts, fillableTakerAmounts] = await dexOrderSampler.executeAsync(
                dexOrderSampler.getOrderFillableMakerAmounts(ORDERS, exchangeAddress),
                dexOrderSampler.getOrderFillableTakerAmounts(ORDERS, exchangeAddress),
            );
            expect(fillableMakerAmounts).to.deep.eq(expectedFillableMakerAmounts);
            expect(fillableTakerAmounts).to.deep.eq(expectedFillableTakerAmounts);
        });
    });
});
function generateBalancerPool(): BalancerPool {
    return {
        id: randomAddress(),
        balanceIn: getRandomInteger(1, 1e18),
        balanceOut: getRandomInteger(1, 1e18),
        weightIn: getRandomInteger(0, 1e5),
        weightOut: getRandomInteger(0, 1e5),
        swapFee: getRandomInteger(0, 1e5),
    };
}
// tslint:disable-next-line: max-file-line-count
