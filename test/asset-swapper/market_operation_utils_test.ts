import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import {
    assertRoughlyEquals,
    constants,
    expect,
    getRandomFloat,
    Numberish,
    randomAddress,
} from '@0x/contracts-test-utils';
import { FillQuoteTransformerOrderType, LimitOrder, RfqOrder, SignatureType } from '@0x/protocol-utils';
import { BigNumber, hexUtils, NULL_BYTES } from '@0x/utils';
import { Pool } from 'balancer-labs-sor-v1/dist/types';
import * as _ from 'lodash';
import * as TypeMoq from 'typemoq';

import {
    MarketOperation,
    QuoteRequestor,
    RfqClientV1Price,
    RfqClientV1Quote,
    SignedNativeOrder,
    TokenAdjacencyGraph,
} from '../../src/asset-swapper';
import { Integrator, SignedLimitOrder } from '../../src/asset-swapper/types';
import { MarketOperationUtils } from '../../src/asset-swapper/utils/market_operation_utils/';
import {
    BUY_SOURCE_FILTER_BY_CHAIN_ID,
    SELL_SOURCE_FILTER_BY_CHAIN_ID,
    SOURCE_FLAGS,
    ZERO_AMOUNT,
} from '../../src/asset-swapper/utils/market_operation_utils/constants';
import { AbstractPoolsCache } from '../../src/asset-swapper/utils/market_operation_utils/pools_cache';
import { DexOrderSampler } from '../../src/asset-swapper/utils/market_operation_utils/sampler';
import { BATCH_SOURCE_FILTERS } from '../../src/asset-swapper/utils/market_operation_utils/sampler_operations';
import {
    AggregationError,
    DexSample,
    ERC20BridgeSource,
    FillData,
    GenerateOptimizedOrdersOpts,
    GetMarketOrdersOpts,
    LiquidityProviderFillData,
    MarketSideLiquidity,
    OptimizedMarketBridgeOrder,
    OptimizerResultWithReport,
} from '../../src/asset-swapper/utils/market_operation_utils/types';
import { RfqClient } from '../../src/utils/rfq_client';

const MAKER_TOKEN = randomAddress();
const TAKER_TOKEN = randomAddress();

const DEFAULT_INCLUDED = [
    ERC20BridgeSource.SushiSwap,
    ERC20BridgeSource.Native,
    ERC20BridgeSource.Uniswap,
    ERC20BridgeSource.Curve,
];

const DEFAULT_EXCLUDED = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].sources.filter(
    (s) => !DEFAULT_INCLUDED.includes(s),
);
const BUY_SOURCES = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].sources;
const SELL_SOURCES = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].sources;
const TOKEN_ADJACENCY_GRAPH = TokenAdjacencyGraph.getEmptyGraph();

const SIGNATURE = { v: 1, r: NULL_BYTES, s: NULL_BYTES, signatureType: SignatureType.EthSign };
const FOO_INTEGRATOR: Integrator = {
    integratorId: 'foo',
    label: 'foo',
};

const MAKER_URI = 'https://foo.bar';

/**
 * gets the orders required for a market sell operation by (potentially) merging native orders with
 * generated bridge orders.
 * @param nativeOrders Native orders. Assumes LimitOrders not RfqOrders
 * @param takerAmount Amount of taker asset to sell.
 * @param opts Options object.
 * @return object with optimized orders and a QuoteReport
 */
async function getMarketSellOrdersAsync(
    utils: MarketOperationUtils,
    nativeOrders: SignedNativeOrder[],
    takerAmount: BigNumber,
    opts: Partial<GetMarketOrdersOpts> & { gasPrice: BigNumber },
): Promise<OptimizerResultWithReport> {
    return utils.getOptimizerResultAsync(nativeOrders, takerAmount, MarketOperation.Sell, opts);
}

/**
 * gets the orders required for a market buy operation by (potentially) merging native orders with
 * generated bridge orders.
 * @param nativeOrders Native orders. Assumes LimitOrders not RfqOrders
 * @param makerAmount Amount of maker asset to buy.
 * @param opts Options object.
 * @return object with optimized orders and a QuoteReport
 */
async function getMarketBuyOrdersAsync(
    utils: MarketOperationUtils,
    nativeOrders: SignedNativeOrder[],
    makerAmount: BigNumber,
    opts: Partial<GetMarketOrdersOpts> & { gasPrice: BigNumber },
): Promise<OptimizerResultWithReport> {
    return utils.getOptimizerResultAsync(nativeOrders, makerAmount, MarketOperation.Buy, opts);
}

function toRfqClientV1Price(order: SignedLimitOrder): RfqClientV1Price {
    return {
        expiry: order.order.expiry,
        kind: 'rfq',
        makerAmount: order.order.makerAmount,
        makerToken: order.order.makerToken,
        makerUri: MAKER_URI,
        takerAmount: order.order.takerAmount,
        takerToken: order.order.takerToken,
    };
}

function toRfqClientV1Quote(order: SignedNativeOrder): RfqClientV1Quote {
    return {
        order: new RfqOrder(order.order),
        signature: order.signature,
        makerUri: MAKER_URI,
    };
}

class MockPoolsCache extends AbstractPoolsCache {
    constructor(private readonly _handler: (takerToken: string, makerToken: string) => Pool[]) {
        super(new Map());
    }
    protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        return this._handler(takerToken, makerToken);
    }
}

// Return some pool so that sampling functions are called for Balancer and BalancerV2
const mockPoolsCache = new MockPoolsCache((_takerToken: string, _makerToken: string) => {
    return [
        {
            id: '0xe4b2554b622cc342ac7d6dc19b594553577941df000200000000000000000003',
            balanceIn: new BigNumber('13655.491506618973154788'),
            balanceOut: new BigNumber('8217005.926472'),
            weightIn: new BigNumber('0.5'),
            weightOut: new BigNumber('0.5'),
            swapFee: new BigNumber('0.008'),
            spotPrice: new BigNumber(596.92685),
        },
    ];
});

describe('MarketOperationUtils tests', () => {
    const CHAIN_ID = ChainId.Mainnet;
    const contractAddresses = {
        ...getContractAddressesForChainOrThrow(CHAIN_ID),
    };

    function getMockedQuoteRequestor(
        _type: 'indicative' | 'firm',
        _results: SignedNativeOrder[],
        _verifiable: TypeMoq.Times,
    ): TypeMoq.IMock<QuoteRequestor> {
        const args: [any, any, any, any, any, any] = [
            TypeMoq.It.isAny(),
            TypeMoq.It.isAny(),
            TypeMoq.It.isAny(),
            TypeMoq.It.isAny(),
            TypeMoq.It.isAny(),
            TypeMoq.It.isAny(),
        ];
        const requestor = TypeMoq.Mock.ofType(QuoteRequestor, TypeMoq.MockBehavior.Loose, true);
        requestor.setup((r) => r.getMakerUriForSignature(TypeMoq.It.isValue(SIGNATURE))).returns(() => MAKER_URI);
        requestor
            .setup((r) => r.setMakerUriForSignature(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
            .returns(() => undefined);
        return requestor;
    }

    function createOrdersFromSellRates(takerAmount: BigNumber, rates: Numberish[]): SignedLimitOrder[] {
        const singleTakerAmount = takerAmount.div(rates.length).integerValue(BigNumber.ROUND_UP);
        return rates.map((r) => {
            const o: SignedNativeOrder = {
                order: {
                    ...new LimitOrder({
                        makerAmount: singleTakerAmount.times(r).integerValue(),
                        takerAmount: singleTakerAmount,
                    }),
                },
                signature: SIGNATURE,
                type: FillQuoteTransformerOrderType.Limit,
            };
            return o;
        });
    }

    function createOrdersFromBuyRates(makerAmount: BigNumber, rates: Numberish[]): SignedLimitOrder[] {
        const singleMakerAmount = makerAmount.div(rates.length).integerValue(BigNumber.ROUND_UP);
        return rates.map((r) => {
            const o: SignedNativeOrder = {
                order: {
                    ...new LimitOrder({
                        makerAmount: singleMakerAmount,
                        takerAmount: singleMakerAmount.div(r).integerValue(),
                    }),
                },
                signature: SIGNATURE,
                type: FillQuoteTransformerOrderType.Limit,
            };
            return o;
        });
    }

    function createSamplesFromRates(
        source: ERC20BridgeSource,
        inputs: Numberish[],
        rates: Numberish[],
        fillData?: FillData,
    ): DexSample[] {
        const samples: DexSample[] = [];
        inputs.forEach((input, i) => {
            const rate = rates[i];
            samples.push({
                source,
                fillData: fillData || DEFAULT_FILL_DATA[source],
                input: new BigNumber(input),
                output: new BigNumber(input)
                    .minus(i === 0 ? 0 : samples[i - 1].input)
                    .times(rate)
                    .plus(i === 0 ? 0 : samples[i - 1].output)
                    .integerValue(),
            });
        });
        return samples;
    }

    type GetMultipleQuotesOperation = (
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        fillAmounts: BigNumber[],
        wethAddress: string,
        tokenAdjacencyGraph: TokenAdjacencyGraph,
        liquidityProviderAddress?: string,
    ) => DexSample[][];

    function createGetMultipleSellQuotesOperationFromRates(rates: RatesBySource): GetMultipleQuotesOperation {
        return (
            sources: ERC20BridgeSource[],
            _makerToken: string,
            _takerToken: string,
            fillAmounts: BigNumber[],
            _wethAddress: string,
        ) => {
            return BATCH_SOURCE_FILTERS.getAllowed(sources).map((s) =>
                createSamplesFromRates(s, fillAmounts, rates[s]),
            );
        };
    }

    function createGetMultipleBuyQuotesOperationFromRates(rates: RatesBySource): GetMultipleQuotesOperation {
        return (
            sources: ERC20BridgeSource[],
            _makerToken: string,
            _takerToken: string,
            fillAmounts: BigNumber[],
            _wethAddress: string,
        ) => {
            return BATCH_SOURCE_FILTERS.getAllowed(sources).map((s) =>
                createSamplesFromRates(
                    s,
                    fillAmounts,
                    rates[s].map((r) => new BigNumber(1).div(r)),
                ),
            );
        };
    }

    type GetBestNativeTokenSellRateOperation = (
        sources: ERC20BridgeSource[],
        makerToken: string,
        takerToken: string,
        fillAmounts: BigNumber[],
        wethAddress: string,
        liquidityProviderAddress?: string,
    ) => BigNumber;

    function createGetBestNativeSellRate(rate: Numberish): GetBestNativeTokenSellRateOperation {
        return (
            _sources: ERC20BridgeSource[],
            _makerToken: string,
            _takerToken: string,
            _fillAmounts: BigNumber[],
            _wethAddress: string,
        ) => {
            return new BigNumber(rate);
        };
    }

    function createDecreasingRates(count: number): BigNumber[] {
        const rates: BigNumber[] = [];
        const initialRate = getRandomFloat(1e-3, 1e2);
        _.times(count, () => getRandomFloat(0.95, 1)).forEach((r, i) => {
            const prevRate = i === 0 ? initialRate : rates[i - 1];
            rates.push(prevRate.times(r));
        });
        return rates;
    }

    const NUM_SAMPLES = 3;

    interface RatesBySource {
        [source: string]: Numberish[];
    }

    const ZERO_RATES: RatesBySource = Object.assign(
        {},
        ...Object.values(ERC20BridgeSource).map((source) => ({
            [source]: _.times(NUM_SAMPLES, () => 0),
        })),
    );

    const DEFAULT_RATES: RatesBySource = {
        ...ZERO_RATES,
        [ERC20BridgeSource.Native]: createDecreasingRates(NUM_SAMPLES),
        [ERC20BridgeSource.SushiSwap]: createDecreasingRates(NUM_SAMPLES),
        [ERC20BridgeSource.Uniswap]: createDecreasingRates(NUM_SAMPLES),
        [ERC20BridgeSource.Curve]: createDecreasingRates(NUM_SAMPLES),
    };

    interface FillDataBySource {
        [source: string]: FillData;
    }

    const DEFAULT_FILL_DATA: FillDataBySource = {
        [ERC20BridgeSource.UniswapV2]: { tokenAddressPath: [] },
        [ERC20BridgeSource.Balancer]: { poolAddress: randomAddress() },
        [ERC20BridgeSource.BalancerV2]: {
            vault: randomAddress(),
            poolId: randomAddress(),
            deadline: Math.floor(Date.now() / 1000) + 300,
        },
        [ERC20BridgeSource.Bancor]: { path: [], networkAddress: randomAddress() },
        [ERC20BridgeSource.Curve]: {
            pool: {
                poolAddress: randomAddress(),
                tokens: [TAKER_TOKEN, MAKER_TOKEN],
                exchangeFunctionSelector: hexUtils.random(4),
                sellQuoteFunctionSelector: hexUtils.random(4),
                buyQuoteFunctionSelector: hexUtils.random(4),
            },
            fromTokenIdx: 0,
            toTokenIdx: 1,
        },
        [ERC20BridgeSource.Saddle]: {
            pool: {
                poolAddress: randomAddress(),
                tokens: [TAKER_TOKEN, MAKER_TOKEN],
                exchangeFunctionSelector: hexUtils.random(4),
                sellQuoteFunctionSelector: hexUtils.random(4),
                buyQuoteFunctionSelector: hexUtils.random(4),
            },
            fromTokenIdx: 0,
            toTokenIdx: 1,
        },
        [ERC20BridgeSource.LiquidityProvider]: { poolAddress: randomAddress() },
        [ERC20BridgeSource.SushiSwap]: { tokenAddressPath: [] },
        [ERC20BridgeSource.Mooniswap]: { poolAddress: randomAddress() },
        [ERC20BridgeSource.Native]: { order: new LimitOrder() },
        [ERC20BridgeSource.MultiHop]: {},
        [ERC20BridgeSource.Shell]: { poolAddress: randomAddress() },
        [ERC20BridgeSource.Component]: { poolAddress: randomAddress() },
        [ERC20BridgeSource.Dodo]: {},
        [ERC20BridgeSource.DodoV2]: {},
        [ERC20BridgeSource.CryptoCom]: { tokenAddressPath: [] },
        [ERC20BridgeSource.Uniswap]: { router: randomAddress() },
        [ERC20BridgeSource.MakerPsm]: {},
        [ERC20BridgeSource.KyberDmm]: { tokenAddressPath: [], router: randomAddress(), poolsPath: [] },
    };

    const DEFAULT_OPS = {
        getTokenDecimals(_makerAddress: string, _takerAddress: string): BigNumber[] {
            const result = new BigNumber(18);
            return [result, result];
        },
        getLimitOrderFillableTakerAmounts(orders: SignedNativeOrder[]): BigNumber[] {
            return orders.map((o) => o.order.takerAmount);
        },
        getLimitOrderFillableMakerAmounts(orders: SignedNativeOrder[]): BigNumber[] {
            return orders.map((o) => o.order.makerAmount);
        },
        getSellQuotes: createGetMultipleSellQuotesOperationFromRates(DEFAULT_RATES),
        getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(DEFAULT_RATES),
        getBestNativeTokenSellRate: createGetBestNativeSellRate(1),
        getTwoHopSellQuotes: (..._params: any[]) => [],
        getTwoHopBuyQuotes: (..._params: any[]) => [],
        isAddressContract: (..._params: any[]) => false,
        getGasLeft: () => ZERO_AMOUNT,
        getBlockNumber: () => ZERO_AMOUNT,
    };

    const MOCK_SAMPLER = {
        async executeAsync(...ops: any[]): Promise<any[]> {
            return MOCK_SAMPLER.executeBatchAsync(ops);
        },
        async executeBatchAsync(ops: any[]): Promise<any[]> {
            return ops;
        },
        poolsCaches: {
            [ERC20BridgeSource.BalancerV2]: mockPoolsCache,
            [ERC20BridgeSource.Balancer]: mockPoolsCache,
        },
        liquidityProviderRegistry: {},
        chainId: CHAIN_ID,
    } as any as DexOrderSampler;

    function replaceSamplerOps(ops: Partial<typeof DEFAULT_OPS> = {}): void {
        Object.assign(MOCK_SAMPLER, DEFAULT_OPS);
        Object.assign(MOCK_SAMPLER, ops);
    }

    describe('MarketOperationUtils', () => {
        let marketOperationUtils: MarketOperationUtils;

        before(async () => {
            marketOperationUtils = new MarketOperationUtils(MOCK_SAMPLER, contractAddresses);
        });

        describe('getMarketSellOrdersAsync()', () => {
            const FILL_AMOUNT = new BigNumber('100e18');
            const ORDERS = createOrdersFromSellRates(
                FILL_AMOUNT,
                _.times(NUM_SAMPLES, (i) => DEFAULT_RATES[ERC20BridgeSource.Native][i]),
            );
            const DEFAULT_OPTS: Partial<GetMarketOrdersOpts> & { gasPrice: BigNumber } = {
                numSamples: NUM_SAMPLES,
                sampleDistributionBase: 1,
                bridgeSlippage: 0,
                maxFallbackSlippage: 100,
                excludedSources: DEFAULT_EXCLUDED,
                allowFallback: false,
                gasSchedule: {},
                feeSchedule: {},
                gasPrice: new BigNumber(30e9),
            };

            beforeEach(() => {
                replaceSamplerOps();
            });

            it('queries `numSamples` samples', async () => {
                // neon-router requires at least 3 samples
                const numSamples = _.random(3, NUM_SAMPLES);
                let actualNumSamples = 0;
                replaceSamplerOps({
                    getSellQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
                        actualNumSamples = amounts.length;
                        return DEFAULT_OPS.getSellQuotes(
                            sources,
                            makerToken,
                            takerToken,
                            amounts,
                            wethAddress,
                            TOKEN_ADJACENCY_GRAPH,
                        );
                    },
                });
                await getMarketSellOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
                    ...DEFAULT_OPTS,
                    numSamples,
                    neonRouterNumSamples: numSamples,
                });
                expect(actualNumSamples).eq(numSamples);
            });

            it('polls all DEXes if `excludedSources` is empty', async () => {
                let sourcesPolled: ERC20BridgeSource[] = [];
                replaceSamplerOps({
                    getSellQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
                        sourcesPolled = sourcesPolled.concat(sources.slice());
                        return DEFAULT_OPS.getSellQuotes(
                            sources,
                            makerToken,
                            takerToken,
                            amounts,
                            wethAddress,
                            TOKEN_ADJACENCY_GRAPH,
                        );
                    },
                    getTwoHopSellQuotes: (...args: any[]) => {
                        sourcesPolled.push(ERC20BridgeSource.MultiHop);
                        return DEFAULT_OPS.getTwoHopSellQuotes(...args);
                    },
                });
                await getMarketSellOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
                    ...DEFAULT_OPTS,
                    excludedSources: [],
                });
                expect(_.uniq(sourcesPolled).sort()).to.deep.equals(SELL_SOURCES.slice().sort());
            });

            it('does not poll DEXes in `excludedSources`', async () => {
                const excludedSources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.SushiSwap];
                let sourcesPolled: ERC20BridgeSource[] = [];
                replaceSamplerOps({
                    getSellQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
                        sourcesPolled = sourcesPolled.concat(sources.slice());
                        return DEFAULT_OPS.getSellQuotes(
                            sources,
                            makerToken,
                            takerToken,
                            amounts,
                            wethAddress,
                            TOKEN_ADJACENCY_GRAPH,
                        );
                    },
                    getTwoHopSellQuotes: (sources: ERC20BridgeSource[], ...args: any[]) => {
                        if (sources.length !== 0) {
                            sourcesPolled.push(ERC20BridgeSource.MultiHop);
                            sourcesPolled.push(...sources);
                        }
                        return DEFAULT_OPS.getTwoHopSellQuotes(...args);
                    },
                });
                await getMarketSellOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
                    ...DEFAULT_OPTS,
                    excludedSources,
                });
                expect(_.uniq(sourcesPolled).sort()).to.deep.equals(_.without(SELL_SOURCES, ...excludedSources).sort());
            });

            it('only polls DEXes in `includedSources`', async () => {
                const includedSources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.SushiSwap];
                let sourcesPolled: ERC20BridgeSource[] = [];
                replaceSamplerOps({
                    getSellQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
                        sourcesPolled = sourcesPolled.concat(sources.slice());
                        return DEFAULT_OPS.getSellQuotes(
                            sources,
                            makerToken,
                            takerToken,
                            amounts,
                            wethAddress,
                            TOKEN_ADJACENCY_GRAPH,
                        );
                    },
                    getTwoHopSellQuotes: (sources: ERC20BridgeSource[], ...args: any[]) => {
                        if (sources.length !== 0) {
                            sourcesPolled.push(ERC20BridgeSource.MultiHop);
                            sourcesPolled.push(...sources);
                        }
                        return DEFAULT_OPS.getTwoHopSellQuotes(sources, ...args);
                    },
                });
                await getMarketSellOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
                    ...DEFAULT_OPTS,
                    excludedSources: [],
                    includedSources,
                });
                expect(_.uniq(sourcesPolled).sort()).to.deep.equals(includedSources.sort());
            });

            // // TODO (xianny): v4 will have a new way of representing bridge data
            // it('generates bridge orders with correct asset data', async () => {
            //     const improvedOrdersResponse = await getMarketSellOrdersAsync(
            //         marketOperationUtils,
            //         // Pass in empty orders to prevent native orders from being used.
            //         ORDERS.map(o => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
            //         FILL_AMOUNT,
            //         DEFAULT_OPTS,
            //     );
            //     const improvedOrders = improvedOrdersResponse.optimizedOrders;
            //     expect(improvedOrders).to.not.be.length(0);
            //     for (const order of improvedOrders) {
            //         expect(getSourceFromAssetData(order.makerAssetData)).to.exist('');
            //         const makerAssetDataPrefix = hexUtils.slice(
            //             assetDataUtils.encodeERC20BridgeAssetData(
            //                 MAKER_TOKEN,
            //                 constants.NULL_ADDRESS,
            //                 constants.NULL_BYTES,
            //             ),
            //             0,
            //             36,
            //         );
            //         assertSamePrefix(order.makerAssetData, makerAssetDataPrefix);
            //         expect(order.takerAssetData).to.eq(TAKER_ASSET_DATA);
            //     }
            // });

            it('getMarketSellOrdersAsync() optimizer will be called once only if price-aware RFQ is disabled', async () => {
                const mockedMarketOpUtils = TypeMoq.Mock.ofType(
                    MarketOperationUtils,
                    TypeMoq.MockBehavior.Loose,
                    false,
                    MOCK_SAMPLER,
                    contractAddresses,
                );
                mockedMarketOpUtils.callBase = true;

                // Ensure that `_generateOptimizedOrdersAsync` is only called once
                mockedMarketOpUtils
                    .setup((m) => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                    .returns(async (a, b) => mockedMarketOpUtils.target._generateOptimizedOrdersAsync(a, b))
                    .verifiable(TypeMoq.Times.once());

                const totalAssetAmount = ORDERS.map((o) => o.order.takerAmount).reduce((a, b) => a.plus(b));
                await mockedMarketOpUtils.object.getOptimizerResultAsync(
                    ORDERS,
                    totalAssetAmount,
                    MarketOperation.Sell,
                    DEFAULT_OPTS,
                );
                mockedMarketOpUtils.verifyAll();
            });

            it('getMarketSellOrdersAsync() will not rerun the optimizer if no orders are returned', async () => {
                // Ensure that `_generateOptimizedOrdersAsync` is only called once
                const mockedMarketOpUtils = TypeMoq.Mock.ofType(
                    MarketOperationUtils,
                    TypeMoq.MockBehavior.Loose,
                    false,
                    MOCK_SAMPLER,
                    contractAddresses,
                );
                mockedMarketOpUtils.callBase = true;
                mockedMarketOpUtils
                    .setup((m) => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                    .returns(async (a, b) => mockedMarketOpUtils.target._generateOptimizedOrdersAsync(a, b))
                    .verifiable(TypeMoq.Times.once());

                const requestor = getMockedQuoteRequestor('firm', [], TypeMoq.Times.once());
                const rfqClient = TypeMoq.Mock.ofType(RfqClient, TypeMoq.MockBehavior.Loose, true);
                rfqClient
                    .setup((client) => client.getV1QuotesAsync(TypeMoq.It.isAny()))
                    .returns(async () => ({ quotes: [] }))
                    .verifiable(TypeMoq.Times.once());

                rfqClient
                    .setup((client) => client.getV2QuotesAsync(TypeMoq.It.isAny()))
                    .returns(async () => [])
                    .verifiable(TypeMoq.Times.once());

                const totalAssetAmount = ORDERS.map((o) => o.order.takerAmount).reduce((a, b) => a.plus(b));
                await mockedMarketOpUtils.object.getOptimizerResultAsync(
                    ORDERS,
                    totalAssetAmount,
                    MarketOperation.Sell,
                    {
                        ...DEFAULT_OPTS,
                        rfqt: {
                            isIndicative: false,
                            integrator: FOO_INTEGRATOR,
                            takerAddress: randomAddress(),
                            intentOnFilling: true,
                            txOrigin: randomAddress(),
                            rfqClient: {
                                getV1PricesAsync: rfqClient.object.getV1PricesAsync,
                                getV1QuotesAsync: rfqClient.object.getV1QuotesAsync,
                                getV2PricesAsync: rfqClient.object.getV2PricesAsync,
                                getV2QuotesAsync: rfqClient.object.getV2QuotesAsync,
                            } as any,
                            quoteRequestor: {} as any,
                        },
                    },
                );
                mockedMarketOpUtils.verifyAll();
                rfqClient.verifyAll();
            });

            it('getMarketSellOrdersAsync() will rerun the optimizer if one or more indicative are returned', async () => {
                const requestor = getMockedQuoteRequestor('indicative', [ORDERS[0], ORDERS[1]], TypeMoq.Times.once());
                const rfqClient = TypeMoq.Mock.ofType(RfqClient, TypeMoq.MockBehavior.Loose, true);
                rfqClient
                    .setup((client) => client.getV1PricesAsync(TypeMoq.It.isAny()))
                    .returns(async () => ({ prices: [ORDERS[0], ORDERS[1]].map(toRfqClientV1Price) }))
                    .verifiable(TypeMoq.Times.once());

                rfqClient
                    .setup((client) => client.getV2PricesAsync(TypeMoq.It.isAny()))
                    .returns(async () => [])
                    .verifiable(TypeMoq.Times.once());

                const numOrdersInCall: number[] = [];
                const numIndicativeQuotesInCall: number[] = [];

                const mockedMarketOpUtils = TypeMoq.Mock.ofType(
                    MarketOperationUtils,
                    TypeMoq.MockBehavior.Loose,
                    false,
                    MOCK_SAMPLER,
                    contractAddresses,
                );
                mockedMarketOpUtils.callBase = true;
                mockedMarketOpUtils
                    .setup((m) => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                    .callback(async (msl: MarketSideLiquidity, _opts: GenerateOptimizedOrdersOpts) => {
                        numOrdersInCall.push(msl.quotes.nativeOrders.length);
                        numIndicativeQuotesInCall.push(msl.quotes.rfqtIndicativeQuotes.length);
                    })
                    .returns(async (a, b) => mockedMarketOpUtils.target._generateOptimizedOrdersAsync(a, b))
                    .verifiable(TypeMoq.Times.exactly(2));

                const totalAssetAmount = ORDERS.map((o) => o.order.takerAmount).reduce((a, b) => a.plus(b));
                await mockedMarketOpUtils.object.getOptimizerResultAsync(
                    ORDERS.slice(2, ORDERS.length),
                    totalAssetAmount,
                    MarketOperation.Sell,
                    {
                        ...DEFAULT_OPTS,
                        rfqt: {
                            isIndicative: true,
                            integrator: FOO_INTEGRATOR,
                            takerAddress: randomAddress(),
                            txOrigin: randomAddress(),
                            intentOnFilling: true,
                            rfqClient: {
                                getV1PricesAsync: rfqClient.object.getV1PricesAsync,
                                getV1QuotesAsync: rfqClient.object.getV1QuotesAsync,
                                getV2PricesAsync: rfqClient.object.getV2PricesAsync,
                                getV2QuotesAsync: rfqClient.object.getV2QuotesAsync,
                            } as any,
                            quoteRequestor: {
                                getMakerUriForSignature: requestor.object.getMakerUriForSignature,
                            } as any,
                        },
                    },
                );
                mockedMarketOpUtils.verifyAll();
                rfqClient.verifyAll();

                // The first and second optimizer call contains same number of RFQ orders.
                expect(numOrdersInCall.length).to.eql(2);
                expect(numOrdersInCall[0]).to.eql(1);
                expect(numOrdersInCall[1]).to.eql(1);

                // The first call to optimizer will have no RFQ indicative quotes. The second call will have
                // two indicative quotes.
                expect(numIndicativeQuotesInCall.length).to.eql(2);
                expect(numIndicativeQuotesInCall[0]).to.eql(0);
                expect(numIndicativeQuotesInCall[1]).to.eql(2);
            });

            it('getMarketSellOrdersAsync() will rerun the optimizer if one or more RFQ orders are returned', async () => {
                const requestor = getMockedQuoteRequestor('firm', [ORDERS[0]], TypeMoq.Times.once());
                const rfqClient = TypeMoq.Mock.ofType(RfqClient, TypeMoq.MockBehavior.Loose, true);
                rfqClient
                    .setup((client) => client.getV1QuotesAsync(TypeMoq.It.isAny()))
                    .returns(async () => ({ quotes: [ORDERS[0]].map(toRfqClientV1Quote) }))
                    .verifiable(TypeMoq.Times.once());

                rfqClient
                    .setup((client) => client.getV2QuotesAsync(TypeMoq.It.isAny()))
                    .returns(async () => [])
                    .verifiable(TypeMoq.Times.once());

                // Ensure that `_generateOptimizedOrdersAsync` is only called once

                // TODO: Ensure fillable amounts increase too
                const numOrdersInCall: number[] = [];
                const mockedMarketOpUtils = TypeMoq.Mock.ofType(
                    MarketOperationUtils,
                    TypeMoq.MockBehavior.Loose,
                    false,
                    MOCK_SAMPLER,
                    contractAddresses,
                );
                mockedMarketOpUtils.callBase = true;
                mockedMarketOpUtils
                    .setup((m) => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                    .callback(async (msl: MarketSideLiquidity, _opts: GenerateOptimizedOrdersOpts) => {
                        numOrdersInCall.push(msl.quotes.nativeOrders.length);
                    })
                    .returns(async (a, b) => mockedMarketOpUtils.target._generateOptimizedOrdersAsync(a, b))
                    .verifiable(TypeMoq.Times.exactly(2));

                const totalAssetAmount = ORDERS.map((o) => o.order.takerAmount).reduce((a, b) => a.plus(b));
                await mockedMarketOpUtils.object.getOptimizerResultAsync(
                    ORDERS.slice(1, ORDERS.length),
                    totalAssetAmount,
                    MarketOperation.Sell,
                    {
                        ...DEFAULT_OPTS,
                        rfqt: {
                            isIndicative: false,
                            integrator: {
                                integratorId: 'foo',
                                label: 'foo',
                            },
                            takerAddress: randomAddress(),
                            intentOnFilling: true,
                            txOrigin: randomAddress(),
                            rfqClient: {
                                getV1PricesAsync: rfqClient.object.getV1PricesAsync,
                                getV1QuotesAsync: rfqClient.object.getV1QuotesAsync,
                                getV2PricesAsync: rfqClient.object.getV2PricesAsync,
                                getV2QuotesAsync: rfqClient.object.getV2QuotesAsync,
                            } as any,
                            quoteRequestor: {
                                setMakerUriForSignature: requestor.object.setMakerUriForSignature,
                                getMakerUriForSignature: requestor.object.getMakerUriForSignature,
                            } as any,
                        },
                    },
                );
                mockedMarketOpUtils.verifyAll();
                rfqClient.verifyAll();
                expect(numOrdersInCall.length).to.eql(2);

                // The first call to optimizer was without an RFQ order.
                // The first call to optimizer was with an extra RFQ order.
                expect(numOrdersInCall[0]).to.eql(2);
                expect(numOrdersInCall[1]).to.eql(3);
            });

            it('getMarketSellOrdersAsync() will not raise a NoOptimalPath error if no initial path was found during on-chain DEX optimization, but a path was found after RFQ optimization', async () => {
                let hasFirstOptimizationRun = false;
                let hasSecondOptimizationRun = false;
                const requestor = getMockedQuoteRequestor('firm', [ORDERS[0], ORDERS[1]], TypeMoq.Times.once());

                const rfqClient = TypeMoq.Mock.ofType(RfqClient, TypeMoq.MockBehavior.Loose, true);
                rfqClient
                    .setup((client) => client.getV1QuotesAsync(TypeMoq.It.isAny()))
                    .returns(async () => ({ quotes: [ORDERS[0], ORDERS[1]].map(toRfqClientV1Quote) }))
                    .verifiable(TypeMoq.Times.once());

                rfqClient
                    .setup((client) => client.getV2QuotesAsync(TypeMoq.It.isAny()))
                    .returns(async () => [])
                    .verifiable(TypeMoq.Times.once());

                const mockedMarketOpUtils = TypeMoq.Mock.ofType(
                    MarketOperationUtils,
                    TypeMoq.MockBehavior.Loose,
                    false,
                    MOCK_SAMPLER,
                    contractAddresses,
                );
                mockedMarketOpUtils.callBase = true;
                mockedMarketOpUtils
                    .setup((m) => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                    .returns(async (msl: MarketSideLiquidity, _opts: GenerateOptimizedOrdersOpts) => {
                        if (msl.quotes.nativeOrders.length === 1) {
                            hasFirstOptimizationRun = true;
                            throw new Error(AggregationError.NoOptimalPath);
                        } else if (msl.quotes.nativeOrders.length === 3) {
                            hasSecondOptimizationRun = true;
                            return mockedMarketOpUtils.target._generateOptimizedOrdersAsync(msl, _opts);
                        } else {
                            throw new Error('Invalid path. this error message should never appear');
                        }
                    })
                    .verifiable(TypeMoq.Times.exactly(2));

                const totalAssetAmount = ORDERS.map((o) => o.order.takerAmount).reduce((a, b) => a.plus(b));
                await mockedMarketOpUtils.object.getOptimizerResultAsync(
                    ORDERS.slice(2, ORDERS.length),
                    totalAssetAmount,
                    MarketOperation.Sell,
                    {
                        ...DEFAULT_OPTS,
                        rfqt: {
                            isIndicative: false,
                            integrator: FOO_INTEGRATOR,
                            takerAddress: randomAddress(),
                            txOrigin: randomAddress(),
                            intentOnFilling: true,
                            rfqClient: {
                                getV1PricesAsync: rfqClient.object.getV1PricesAsync,
                                getV1QuotesAsync: rfqClient.object.getV1QuotesAsync,
                                getV2PricesAsync: rfqClient.object.getV2PricesAsync,
                                getV2QuotesAsync: rfqClient.object.getV2QuotesAsync,
                            } as any,
                            quoteRequestor: {
                                setMakerUriForSignature: requestor.object.setMakerUriForSignature,
                                getMakerUriForSignature: requestor.object.getMakerUriForSignature,
                            } as any,
                        },
                    },
                );
                mockedMarketOpUtils.verifyAll();
                rfqClient.verifyAll();

                expect(hasFirstOptimizationRun).to.eql(true);
                expect(hasSecondOptimizationRun).to.eql(true);
            });

            it('getMarketSellOrdersAsync() will raise a NoOptimalPath error if no path was found during on-chain DEX optimization and RFQ optimization', async () => {
                const mockedMarketOpUtils = TypeMoq.Mock.ofType(
                    MarketOperationUtils,
                    TypeMoq.MockBehavior.Loose,
                    false,
                    MOCK_SAMPLER,
                    contractAddresses,
                );
                mockedMarketOpUtils.callBase = true;
                mockedMarketOpUtils
                    .setup((m) => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
                    .returns(async (msl: MarketSideLiquidity, _opts: GenerateOptimizedOrdersOpts) => {
                        throw new Error(AggregationError.NoOptimalPath);
                    })
                    .verifiable(TypeMoq.Times.exactly(1));

                try {
                    await mockedMarketOpUtils.object.getOptimizerResultAsync(
                        ORDERS.slice(2, ORDERS.length),
                        ORDERS[0].order.takerAmount,
                        MarketOperation.Sell,
                        DEFAULT_OPTS,
                    );
                    expect.fail(`Call should have thrown "${AggregationError.NoOptimalPath}" but instead succeded`);
                } catch (e) {
                    if (e.message !== AggregationError.NoOptimalPath) {
                        expect.fail(e);
                    }
                }
                mockedMarketOpUtils.verifyAll();
            });

            it('generates bridge orders with correct taker amount', async () => {
                const improvedOrdersResponse = await getMarketSellOrdersAsync(
                    marketOperationUtils,
                    // Pass in empty orders to prevent native orders from being used.
                    ORDERS.map((o) => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
                    FILL_AMOUNT,
                    DEFAULT_OPTS,
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const totaltakerAmount = BigNumber.sum(...improvedOrders.map((o) => o.takerAmount));
                expect(totaltakerAmount).to.bignumber.gte(FILL_AMOUNT);
            });

            it('generates bridge orders with max slippage of `bridgeSlippage`', async () => {
                const bridgeSlippage = _.random(0.1, true);
                const improvedOrdersResponse = await getMarketSellOrdersAsync(
                    marketOperationUtils,
                    // Pass in empty orders to prevent native orders from being used.
                    ORDERS.map((o) => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, bridgeSlippage },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                expect(improvedOrders).to.not.be.length(0);
                for (const order of improvedOrders) {
                    const expectedMakerAmount = order.fill.output;
                    const slippage = new BigNumber(1).minus(order.makerAmount.div(expectedMakerAmount.plus(1)));
                    assertRoughlyEquals(slippage, bridgeSlippage, 1);
                }
            });

            it('can mix convex sources', async () => {
                const rates: RatesBySource = { ...DEFAULT_RATES };
                rates[ERC20BridgeSource.Native] = [0.4, 0.3, 0.2, 0.1];
                rates[ERC20BridgeSource.Uniswap] = [0.5, 0.05, 0.05, 0.05];
                rates[ERC20BridgeSource.SushiSwap] = [0.6, 0.05, 0.05, 0.05];
                rates[ERC20BridgeSource.Curve] = [0, 0, 0, 0]; // unused
                replaceSamplerOps({
                    getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
                });
                const improvedOrdersResponse = await getMarketSellOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4 },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [
                    ERC20BridgeSource.SushiSwap,
                    ERC20BridgeSource.Uniswap,
                    ERC20BridgeSource.Native,
                    ERC20BridgeSource.Native,
                ];
                expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
            });

            const ETH_TO_MAKER_RATE = 1.5;

            // TODO: disabled as this is not supported by neon-router
            it.skip('factors in fees for native orders', async () => {
                // Native orders will have the best rates but have fees,
                // dropping their effective rates.
                const nativeFeeRate = 0.06;
                const rates: RatesBySource = {
                    [ERC20BridgeSource.Native]: [1, 0.99, 0.98, 0.97], // Effectively [0.94, 0.93, 0.92, 0.91]
                    [ERC20BridgeSource.Uniswap]: [0.96, 0.1, 0.1, 0.1],
                    [ERC20BridgeSource.SushiSwap]: [0.95, 0.1, 0.1, 0.1],
                };
                const feeSchedule = {
                    [ERC20BridgeSource.Native]: _.constant({
                        gas: 1,
                        fee: FILL_AMOUNT.div(4).times(nativeFeeRate).dividedToIntegerBy(ETH_TO_MAKER_RATE),
                    }),
                };
                replaceSamplerOps({
                    getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
                    getBestNativeTokenSellRate: createGetBestNativeSellRate(ETH_TO_MAKER_RATE),
                });
                const improvedOrdersResponse = await getMarketSellOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4, feeSchedule },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [
                    ERC20BridgeSource.Native,
                    ERC20BridgeSource.Uniswap,
                    ERC20BridgeSource.SushiSwap,
                    ERC20BridgeSource.Native,
                ];
                expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
            });

            it('factors in fees for dexes', async () => {
                const uniswapFeeRate = 0.2;
                const rates: RatesBySource = {
                    [ERC20BridgeSource.Native]: [0.95, 0.1, 0.1, 0.1],
                    [ERC20BridgeSource.Curve]: [0.1, 0.1, 0.1, 0.1],
                    [ERC20BridgeSource.SushiSwap]: [0.92, 0.1, 0.1, 0.1],
                    // Effectively [0.8, ~0.5, ~0, ~0]
                    [ERC20BridgeSource.Uniswap]: [1, 0.7, 0.2, 0.2],
                };
                const feeSchedule = {
                    [ERC20BridgeSource.Uniswap]: _.constant({
                        gas: 1,
                        fee: FILL_AMOUNT.div(4).times(uniswapFeeRate).dividedToIntegerBy(ETH_TO_MAKER_RATE),
                    }),
                };
                replaceSamplerOps({
                    getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
                    getBestNativeTokenSellRate: createGetBestNativeSellRate(ETH_TO_MAKER_RATE),
                });
                const improvedOrdersResponse = await getMarketSellOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4, feeSchedule },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [
                    ERC20BridgeSource.Native,
                    ERC20BridgeSource.SushiSwap,
                    ERC20BridgeSource.Uniswap,
                ];
                expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
            });

            it('can mix one concave source', async () => {
                const rates: RatesBySource = {
                    [ERC20BridgeSource.Curve]: [0, 0, 0, 0], // Won't use
                    [ERC20BridgeSource.SushiSwap]: [0.5, 0.85, 0.75, 0.75], // Concave
                    [ERC20BridgeSource.Uniswap]: [0.96, 0.2, 0.1, 0.1],
                    [ERC20BridgeSource.Native]: [0.95, 0.2, 0.2, 0.1],
                };
                replaceSamplerOps({
                    getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
                    getBestNativeTokenSellRate: createGetBestNativeSellRate(ETH_TO_MAKER_RATE),
                });
                const improvedOrdersResponse = await getMarketSellOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4 },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [
                    ERC20BridgeSource.SushiSwap,
                    ERC20BridgeSource.Uniswap,
                    ERC20BridgeSource.Native,
                ];
                expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
            });

            // NOTE: Currently fallbacks for native orders are disabled
            // TODO: remove this if we remove fallbacks completely
            it.skip('does not create a fallback if below maxFallbackSlippage', async () => {
                const rates: RatesBySource = {};
                rates[ERC20BridgeSource.Native] = [1, 1, 0.01, 0.01];
                rates[ERC20BridgeSource.Uniswap] = [1, 1, 0.01, 0.01];
                rates[ERC20BridgeSource.SushiSwap] = [0.49, 0.49, 0.49, 0.49];
                rates[ERC20BridgeSource.Curve] = [0.35, 0.2, 0.01, 0.01];
                replaceSamplerOps({
                    getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
                });
                const improvedOrdersResponse = await getMarketSellOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4, allowFallback: true, maxFallbackSlippage: 0.25 },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const firstSources = [ERC20BridgeSource.Native, ERC20BridgeSource.Native, ERC20BridgeSource.Uniswap];
                const secondSources: ERC20BridgeSource[] = [];
                expect(orderSources.slice(0, firstSources.length).sort()).to.deep.eq(firstSources.sort());
                expect(orderSources.slice(firstSources.length).sort()).to.deep.eq(secondSources.sort());
            });

            it('is able to create a order from LiquidityProvider', async () => {
                const liquidityProviderAddress = (DEFAULT_FILL_DATA[ERC20BridgeSource.LiquidityProvider] as any)
                    .poolAddress;
                const rates: RatesBySource = {};
                rates[ERC20BridgeSource.LiquidityProvider] = [1, 1, 1, 1];
                MOCK_SAMPLER.liquidityProviderRegistry[liquidityProviderAddress] = {
                    tokens: [MAKER_TOKEN, TAKER_TOKEN],
                    gasCost: 0,
                };
                replaceSamplerOps({
                    getLimitOrderFillableTakerAmounts: () => [constants.ZERO_AMOUNT],
                    getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
                });

                const sampler = new MarketOperationUtils(MOCK_SAMPLER, contractAddresses);
                const ordersAndReport = await sampler.getOptimizerResultAsync(
                    [
                        {
                            order: new LimitOrder({
                                makerToken: MAKER_TOKEN,
                                takerToken: TAKER_TOKEN,
                            }),
                            type: FillQuoteTransformerOrderType.Limit,
                            signature: {} as any,
                        },
                    ],
                    FILL_AMOUNT,
                    MarketOperation.Sell,
                    {
                        includedSources: [ERC20BridgeSource.LiquidityProvider],
                        excludedSources: [],
                        numSamples: 4,
                        bridgeSlippage: 0,
                        gasPrice: new BigNumber(30e9),
                    },
                );
                const result = ordersAndReport.optimizedOrders;
                expect(result.length).to.eql(1);
                expect(
                    (result[0] as OptimizedMarketBridgeOrder<LiquidityProviderFillData>).fillData.poolAddress,
                ).to.eql(liquidityProviderAddress);

                // // TODO (xianny): decode bridge data in v4 format
                // const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(
                //     result[0].makerAssetData,
                // ) as ERC20BridgeAssetData;
                // expect(decodedAssetData.assetProxyId).to.eql(AssetProxyId.ERC20Bridge);
                // expect(decodedAssetData.bridgeAddress).to.eql(liquidityProviderAddress);
                // expect(result[0].takerAmount).to.bignumber.eql(FILL_AMOUNT);
            });

            it('factors in exchange proxy gas overhead', async () => {
                // Uniswap has a slightly better rate than LiquidityProvider,
                // but LiquidityProvider is better accounting for the EP gas overhead.
                const rates: RatesBySource = {
                    [ERC20BridgeSource.Native]: [0.01, 0.01, 0.01, 0.01],
                    [ERC20BridgeSource.Uniswap]: [1, 1, 1, 1],
                    [ERC20BridgeSource.LiquidityProvider]: [0.9999, 0.9999, 0.9999, 0.9999],
                };
                MOCK_SAMPLER.liquidityProviderRegistry[randomAddress()] = {
                    tokens: [MAKER_TOKEN, TAKER_TOKEN],
                    gasCost: 0,
                };
                replaceSamplerOps({
                    getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
                    getBestNativeTokenSellRate: createGetBestNativeSellRate(ETH_TO_MAKER_RATE),
                });
                const optimizer = new MarketOperationUtils(MOCK_SAMPLER, contractAddresses);
                const gasPrice = 100e9; // 100 gwei
                const exchangeProxyOverhead = (sourceFlags: bigint) =>
                    sourceFlags === SOURCE_FLAGS.LiquidityProvider
                        ? constants.ZERO_AMOUNT
                        : new BigNumber(1.3e5).times(gasPrice);
                const improvedOrdersResponse = await optimizer.getOptimizerResultAsync(
                    createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    MarketOperation.Sell,
                    {
                        ...DEFAULT_OPTS,
                        numSamples: 4,
                        includedSources: [
                            ERC20BridgeSource.Native,
                            ERC20BridgeSource.Uniswap,
                            ERC20BridgeSource.LiquidityProvider,
                        ],
                        excludedSources: [],
                        exchangeProxyOverhead,
                    },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [ERC20BridgeSource.LiquidityProvider];
                expect(orderSources).to.deep.eq(expectedSources);
            });
        });

        describe('getMarketBuyOrdersAsync()', () => {
            const FILL_AMOUNT = new BigNumber('100e18');
            const ORDERS = createOrdersFromBuyRates(
                FILL_AMOUNT,
                _.times(NUM_SAMPLES, () => DEFAULT_RATES[ERC20BridgeSource.Native][0]),
            );
            const GAS_PRICE = new BigNumber(100e9); // 100 gwei
            const DEFAULT_OPTS: Partial<GetMarketOrdersOpts> & { gasPrice: BigNumber } = {
                numSamples: NUM_SAMPLES,
                sampleDistributionBase: 1,
                bridgeSlippage: 0,
                maxFallbackSlippage: 100,
                excludedSources: DEFAULT_EXCLUDED,
                allowFallback: false,
                gasSchedule: {},
                feeSchedule: {},
                gasPrice: GAS_PRICE,
            };

            beforeEach(() => {
                replaceSamplerOps();
            });

            it('queries `numSamples` samples', async () => {
                // neon-router requires at least 3 samples
                const numSamples = _.random(3, 16);
                let actualNumSamples = 0;
                replaceSamplerOps({
                    getBuyQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
                        actualNumSamples = amounts.length;
                        return DEFAULT_OPS.getBuyQuotes(
                            sources,
                            makerToken,
                            takerToken,
                            amounts,
                            wethAddress,
                            TOKEN_ADJACENCY_GRAPH,
                        );
                    },
                });
                await getMarketBuyOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
                    ...DEFAULT_OPTS,
                    numSamples,
                    // Make sure to use same number of samples in neon-router for compatibility
                    neonRouterNumSamples: numSamples,
                });
                expect(actualNumSamples).eq(numSamples);
            });

            it('polls all DEXes if `excludedSources` is empty', async () => {
                let sourcesPolled: ERC20BridgeSource[] = [];
                replaceSamplerOps({
                    getBuyQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
                        sourcesPolled = sourcesPolled.concat(sources.slice());
                        return DEFAULT_OPS.getBuyQuotes(
                            sources,
                            makerToken,
                            takerToken,
                            amounts,
                            wethAddress,
                            TOKEN_ADJACENCY_GRAPH,
                        );
                    },
                    getTwoHopBuyQuotes: (sources: ERC20BridgeSource[], ..._args: any[]) => {
                        if (sources.length !== 0) {
                            sourcesPolled.push(ERC20BridgeSource.MultiHop);
                            sourcesPolled.push(...sources);
                        }
                        return DEFAULT_OPS.getTwoHopBuyQuotes(..._args);
                    },
                });
                await getMarketBuyOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
                    ...DEFAULT_OPTS,
                    excludedSources: [],
                });
                expect(_.uniq(sourcesPolled).sort()).to.deep.equals(BUY_SOURCES.sort());
            });

            it('does not poll DEXes in `excludedSources`', async () => {
                const excludedSources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.SushiSwap];
                let sourcesPolled: ERC20BridgeSource[] = [];
                replaceSamplerOps({
                    getBuyQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
                        sourcesPolled = sourcesPolled.concat(sources.slice());
                        return DEFAULT_OPS.getBuyQuotes(
                            sources,
                            makerToken,
                            takerToken,
                            amounts,
                            wethAddress,
                            TOKEN_ADJACENCY_GRAPH,
                        );
                    },
                    getTwoHopBuyQuotes: (sources: ERC20BridgeSource[], ..._args: any[]) => {
                        if (sources.length !== 0) {
                            sourcesPolled.push(ERC20BridgeSource.MultiHop);
                            sourcesPolled.push(...sources);
                        }
                        return DEFAULT_OPS.getTwoHopBuyQuotes(..._args);
                    },
                });
                await getMarketBuyOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
                    ...DEFAULT_OPTS,
                    excludedSources,
                });
                expect(_.uniq(sourcesPolled).sort()).to.deep.eq(_.without(BUY_SOURCES, ...excludedSources).sort());
            });

            it('only polls DEXes in `includedSources`', async () => {
                const includedSources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.SushiSwap];
                let sourcesPolled: ERC20BridgeSource[] = [];
                replaceSamplerOps({
                    getBuyQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
                        sourcesPolled = sourcesPolled.concat(sources.slice());
                        return DEFAULT_OPS.getBuyQuotes(
                            sources,
                            makerToken,
                            takerToken,
                            amounts,
                            wethAddress,
                            TOKEN_ADJACENCY_GRAPH,
                        );
                    },
                    getTwoHopBuyQuotes: (sources: ERC20BridgeSource[], ..._args: any[]) => {
                        if (sources.length !== 0) {
                            sourcesPolled.push(ERC20BridgeSource.MultiHop);
                            sourcesPolled.push(...sources);
                        }
                        return DEFAULT_OPS.getTwoHopBuyQuotes(..._args);
                    },
                });
                await getMarketBuyOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
                    ...DEFAULT_OPTS,
                    excludedSources: [],
                    includedSources,
                });
                expect(_.uniq(sourcesPolled).sort()).to.deep.eq(includedSources.sort());
            });

            // it('generates bridge orders with correct asset data', async () => {
            //     const improvedOrdersResponse = await getMarketBuyOrdersAsync(
            //         marketOperationUtils,
            //         // Pass in empty orders to prevent native orders from being used.
            //         ORDERS.map(o => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
            //         FILL_AMOUNT,
            //         DEFAULT_OPTS,
            //     );
            //     const improvedOrders = improvedOrdersResponse.optimizedOrders;
            //     expect(improvedOrders).to.not.be.length(0);
            //     for (const order of improvedOrders) {
            //         expect(getSourceFromAssetData(order.makerAssetData)).to.exist('');
            //         const makerAssetDataPrefix = hexUtils.slice(
            //             assetDataUtils.encodeERC20BridgeAssetData(
            //                 MAKER_TOKEN,
            //                 constants.NULL_ADDRESS,
            //                 constants.NULL_BYTES,
            //             ),
            //             0,
            //             36,
            //         );
            //         assertSamePrefix(order.makerAssetData, makerAssetDataPrefix);
            //         expect(order.takerAssetData).to.eq(TAKER_ASSET_DATA);
            //     }
            // });

            it('generates bridge orders with correct maker amount', async () => {
                const improvedOrdersResponse = await getMarketBuyOrdersAsync(
                    marketOperationUtils,
                    // Pass in empty orders to prevent native orders from being used.
                    ORDERS.map((o) => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
                    FILL_AMOUNT,
                    DEFAULT_OPTS,
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const totalmakerAmount = BigNumber.sum(...improvedOrders.map((o) => o.makerAmount));
                expect(totalmakerAmount).to.bignumber.gte(FILL_AMOUNT);
            });

            it('generates bridge orders with max slippage of `bridgeSlippage`', async () => {
                const bridgeSlippage = _.random(0.1, true);
                const improvedOrdersResponse = await getMarketBuyOrdersAsync(
                    marketOperationUtils,
                    // Pass in empty orders to prevent native orders from being used.
                    ORDERS.map((o) => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, bridgeSlippage },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                expect(improvedOrders).to.not.be.length(0);
                for (const order of improvedOrders) {
                    const expectedTakerAmount = order.fill.output;
                    const slippage = order.takerAmount.div(expectedTakerAmount.plus(1)).minus(1);
                    assertRoughlyEquals(slippage, bridgeSlippage, 1);
                }
            });

            // TODO: disabled as this is not supported by neon-router
            it.skip('can mix convex sources', async () => {
                const rates: RatesBySource = { ...ZERO_RATES };
                rates[ERC20BridgeSource.Native] = [0.4, 0.3, 0.2, 0.1];
                rates[ERC20BridgeSource.Uniswap] = [0.5, 0.05, 0.05, 0.05];
                rates[ERC20BridgeSource.SushiSwap] = [0.6, 0.05, 0.05, 0.05];
                replaceSamplerOps({
                    getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
                });
                const improvedOrdersResponse = await getMarketBuyOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4 },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [
                    ERC20BridgeSource.SushiSwap,
                    ERC20BridgeSource.Uniswap,
                    ERC20BridgeSource.Native,
                    ERC20BridgeSource.Native,
                ];
                expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
            });

            const ETH_TO_TAKER_RATE = 1.5;

            // TODO: disabled as this is not supported by neon-router
            it.skip('factors in fees for native orders', async () => {
                // Native orders will have the best rates but have fees,
                // dropping their effective rates.
                const nativeFeeRate = 0.06;
                const rates: RatesBySource = {
                    ...ZERO_RATES,
                    [ERC20BridgeSource.Native]: [1, 0.99, 0.98, 0.97], // Effectively [0.94, ~0.93, ~0.92, ~0.91]
                    [ERC20BridgeSource.Uniswap]: [0.96, 0.1, 0.1, 0.1],
                    [ERC20BridgeSource.SushiSwap]: [0.95, 0.1, 0.1, 0.1],
                    [ERC20BridgeSource.Curve]: [0.1, 0.1, 0.1, 0.1],
                };
                const feeSchedule = {
                    [ERC20BridgeSource.Native]: _.constant({
                        gas: 1,
                        fee: FILL_AMOUNT.div(4).times(nativeFeeRate).dividedToIntegerBy(ETH_TO_TAKER_RATE),
                    }),
                };
                replaceSamplerOps({
                    getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
                    getBestNativeTokenSellRate: createGetBestNativeSellRate(ETH_TO_TAKER_RATE),
                });
                const improvedOrdersResponse = await getMarketBuyOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4, feeSchedule },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [
                    ERC20BridgeSource.Uniswap,
                    ERC20BridgeSource.SushiSwap,
                    ERC20BridgeSource.Native,
                    ERC20BridgeSource.Native,
                ];
                expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
            });

            it('factors in fees for dexes', async () => {
                // Uniswap will have the best rates but will have fees,
                // dropping its effective rates.
                const uniswapFeeRate = 0.2;
                const rates: RatesBySource = {
                    ...ZERO_RATES,
                    [ERC20BridgeSource.Native]: [0.95, 0.1, 0.1, 0.1],
                    // Effectively [0.8, ~0.5, ~0, ~0]
                    [ERC20BridgeSource.Uniswap]: [1, 0.7, 0.2, 0.2],
                    [ERC20BridgeSource.SushiSwap]: [0.92, 0.1, 0.1, 0.1],
                };
                const feeSchedule = {
                    [ERC20BridgeSource.Uniswap]: _.constant({
                        gas: 1,
                        fee: FILL_AMOUNT.div(4).times(uniswapFeeRate).dividedToIntegerBy(ETH_TO_TAKER_RATE),
                    }),
                };
                replaceSamplerOps({
                    getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
                    getBestNativeTokenSellRate: createGetBestNativeSellRate(ETH_TO_TAKER_RATE),
                });
                const improvedOrdersResponse = await getMarketBuyOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4, feeSchedule },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [
                    ERC20BridgeSource.Native,
                    ERC20BridgeSource.SushiSwap,
                    ERC20BridgeSource.Uniswap,
                ];
                expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
            });

            // NOTE: Currently fallbacks for native orders are disabled
            // TODO: remove this if we remove fallbacks completely
            it.skip('does not create a fallback if below maxFallbackSlippage', async () => {
                const rates: RatesBySource = { ...ZERO_RATES };
                rates[ERC20BridgeSource.Native] = [1, 1, 0.01, 0.01];
                rates[ERC20BridgeSource.Uniswap] = [1, 1, 0.01, 0.01];
                rates[ERC20BridgeSource.SushiSwap] = [0.49, 0.49, 0.49, 0.49];
                replaceSamplerOps({
                    getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
                });
                const improvedOrdersResponse = await getMarketBuyOrdersAsync(
                    marketOperationUtils,
                    createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    { ...DEFAULT_OPTS, numSamples: 4, allowFallback: true, maxFallbackSlippage: 0.25 },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const firstSources = [ERC20BridgeSource.Native, ERC20BridgeSource.Native, ERC20BridgeSource.Uniswap];
                const secondSources: ERC20BridgeSource[] = [];
                expect(orderSources.slice(0, firstSources.length).sort()).to.deep.eq(firstSources.sort());
                expect(orderSources.slice(firstSources.length).sort()).to.deep.eq(secondSources.sort());
            });

            it('factors in exchange proxy gas overhead', async () => {
                // Uniswap has a slightly better rate than LiquidityProvider,
                // but LiquidityProvider is better accounting for the EP gas overhead.
                const rates: RatesBySource = {
                    [ERC20BridgeSource.Native]: [0.01, 0.01, 0.01, 0.01],
                    [ERC20BridgeSource.Uniswap]: [1, 1, 1, 1],
                    [ERC20BridgeSource.LiquidityProvider]: [0.9999, 0.9999, 0.9999, 0.9999],
                };
                MOCK_SAMPLER.liquidityProviderRegistry[randomAddress()] = {
                    tokens: [MAKER_TOKEN, TAKER_TOKEN],
                    gasCost: 0,
                };
                replaceSamplerOps({
                    getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
                    getBestNativeTokenSellRate: createGetBestNativeSellRate(ETH_TO_TAKER_RATE),
                });
                const optimizer = new MarketOperationUtils(MOCK_SAMPLER, contractAddresses);
                const exchangeProxyOverhead = (sourceFlags: bigint) =>
                    sourceFlags === SOURCE_FLAGS.LiquidityProvider
                        ? constants.ZERO_AMOUNT
                        : new BigNumber(1.3e5).times(GAS_PRICE);
                const improvedOrdersResponse = await optimizer.getOptimizerResultAsync(
                    createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
                    FILL_AMOUNT,
                    MarketOperation.Buy,
                    {
                        ...DEFAULT_OPTS,
                        numSamples: 4,
                        includedSources: [
                            ERC20BridgeSource.Native,
                            ERC20BridgeSource.Uniswap,
                            ERC20BridgeSource.LiquidityProvider,
                        ],
                        excludedSources: [],
                        exchangeProxyOverhead,
                    },
                );
                const improvedOrders = improvedOrdersResponse.optimizedOrders;
                const orderSources = improvedOrders.map((o) => o.source);
                const expectedSources = [ERC20BridgeSource.LiquidityProvider];
                expect(orderSources).to.deep.eq(expectedSources);
            });
        });
    });
});
