// // tslint:disable: no-unbound-method
// import { ChainId, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
// import {
//     assertRoughlyEquals,
//     constants,
//     expect,
//     getRandomFloat,
//     Numberish,
//     randomAddress,
// } from '@0x/contracts-test-utils';
// import { FillQuoteTransformerOrderType, LimitOrder, RfqOrder, SignatureType } from '@0x/protocol-utils';
// import { BigNumber, hexUtils, NULL_BYTES } from '@0x/utils';
// import { Web3Wrapper } from '@0x/web3-wrapper';
// import { Pool } from '@balancer-labs/sor/dist/types';
// import * as _ from 'lodash';
// import * as TypeMoq from 'typemoq';
//
// import { MarketOperation, QuoteRequestor, RfqRequestOpts, SignedNativeOrder } from '../src';
// import { NativeOrderWithFillableAmounts } from '../src/types';
// import { MarketOperationUtils } from '../src/utils/market_operation_utils/';
// import {
//     BUY_SOURCE_FILTER_BY_CHAIN_ID,
//     POSITIVE_INF,
//     SELL_SOURCE_FILTER_BY_CHAIN_ID,
//     SOURCE_FLAGS,
// } from '../src/utils/market_operation_utils/constants';
// import { createFills } from '../src/utils/market_operation_utils/fills';
// import { PoolsCache } from '../src/utils/market_operation_utils/pools_cache';
// import { DexOrderSampler } from '../src/utils/market_operation_utils/sampler';
// import { BATCH_SOURCE_FILTERS } from '../src/utils/market_operation_utils/sampler_operations';
// import { SourceFilters } from '../src/utils/market_operation_utils/source_filters';
// import {
//     AggregationError,
//     DexSample,
//     ERC20BridgeSource,
//     FillData,
//     GenerateOptimizedOrdersOpts,
//     GetMarketOrdersOpts,
//     LiquidityProviderFillData,
//     MarketSideLiquidity,
//     NativeFillData,
//     OptimizedMarketBridgeOrder,
//     OptimizerResultWithReport,
//     TokenAdjacencyGraph,
// } from '../src/utils/market_operation_utils/types';
//
// const MAKER_TOKEN = randomAddress();
// const TAKER_TOKEN = randomAddress();
//
// const DEFAULT_INCLUDED = [
//     ERC20BridgeSource.Eth2Dai,
//     ERC20BridgeSource.Kyber,
//     ERC20BridgeSource.Native,
//     ERC20BridgeSource.Uniswap,
// ];
//
// const DEFAULT_EXCLUDED = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].sources.filter(
//     s => !DEFAULT_INCLUDED.includes(s),
// );
// const BUY_SOURCES = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].sources;
// const SELL_SOURCES = SELL_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].sources;
// const TOKEN_ADJACENCY_GRAPH: TokenAdjacencyGraph = { default: [] };
//
// const SIGNATURE = { v: 1, r: NULL_BYTES, s: NULL_BYTES, signatureType: SignatureType.EthSign };
//
// /**
//  * gets the orders required for a market sell operation by (potentially) merging native orders with
//  * generated bridge orders.
//  * @param nativeOrders Native orders. Assumes LimitOrders not RfqOrders
//  * @param takerAmount Amount of taker asset to sell.
//  * @param opts Options object.
//  * @return object with optimized orders and a QuoteReport
//  */
// async function getMarketSellOrdersAsync(
//     utils: MarketOperationUtils,
//     nativeOrders: SignedNativeOrder[],
//     takerAmount: BigNumber,
//     opts?: Partial<GetMarketOrdersOpts>,
// ): Promise<OptimizerResultWithReport> {
//     return utils.getOptimizerResultAsync(nativeOrders, takerAmount, MarketOperation.Sell, opts);
// }
//
// /**
//  * gets the orders required for a market buy operation by (potentially) merging native orders with
//  * generated bridge orders.
//  * @param nativeOrders Native orders. Assumes LimitOrders not RfqOrders
//  * @param makerAmount Amount of maker asset to buy.
//  * @param opts Options object.
//  * @return object with optimized orders and a QuoteReport
//  */
// async function getMarketBuyOrdersAsync(
//     utils: MarketOperationUtils,
//     nativeOrders: SignedNativeOrder[],
//     makerAmount: BigNumber,
//     opts?: Partial<GetMarketOrdersOpts>,
// ): Promise<OptimizerResultWithReport> {
//     return utils.getOptimizerResultAsync(nativeOrders, makerAmount, MarketOperation.Buy, opts);
// }
//
// class MockPoolsCache extends PoolsCache {
//     constructor(private readonly _handler: (takerToken: string, makerToken: string) => Pool[]) {
//         super({});
//     }
//     protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
//         return this._handler(takerToken, makerToken);
//     }
// }
//
// // Return some pool so that sampling functions are called for Balancer, BalancerV2, and Cream
// // tslint:disable:custom-no-magic-numbers
// const mockPoolsCache = new MockPoolsCache((_takerToken: string, _makerToken: string) => {
//     return [
//         {
//             id: '0xe4b2554b622cc342ac7d6dc19b594553577941df000200000000000000000003',
//             balanceIn: new BigNumber('13655.491506618973154788'),
//             balanceOut: new BigNumber('8217005.926472'),
//             weightIn: new BigNumber('0.5'),
//             weightOut: new BigNumber('0.5'),
//             swapFee: new BigNumber('0.008'),
//             spotPrice: new BigNumber(596.92685),
//         },
//     ];
// });
// // tslint:enable:custom-no-magic-numbers
//
// // tslint:disable: custom-no-magic-numbers promise-function-async
// describe('MarketOperationUtils tests', () => {
//     const CHAIN_ID = ChainId.Mainnet;
//     const contractAddresses = {
//         ...getContractAddressesForChainOrThrow(CHAIN_ID),
//     };
//
//     function getMockedQuoteRequestor(
//         type: 'indicative' | 'firm',
//         results: SignedNativeOrder[],
//         verifiable: TypeMoq.Times,
//     ): TypeMoq.IMock<QuoteRequestor> {
//         const args: [any, any, any, any, any, any] = [
//             TypeMoq.It.isAny(),
//             TypeMoq.It.isAny(),
//             TypeMoq.It.isAny(),
//             TypeMoq.It.isAny(),
//             TypeMoq.It.isAny(),
//             TypeMoq.It.isAny(),
//         ];
//         const requestor = TypeMoq.Mock.ofType(QuoteRequestor, TypeMoq.MockBehavior.Loose, true);
//         requestor
//             .setup(mqr => mqr.getMakerUriForSignature(TypeMoq.It.isValue(SIGNATURE)))
//             .returns(() => 'https://foo.bar');
//         if (type === 'firm') {
//             requestor
//                 .setup(r => r.requestRfqtFirmQuotesAsync(...args))
//                 .returns(async () => results)
//                 .verifiable(verifiable);
//         } else {
//             requestor
//                 .setup(r => r.requestRfqtIndicativeQuotesAsync(...args))
//                 .returns(async () => results.map(r => r.order))
//                 .verifiable(verifiable);
//         }
//         return requestor;
//     }
//
//     function createOrdersFromSellRates(takerAmount: BigNumber, rates: Numberish[]): SignedNativeOrder[] {
//         const singleTakerAmount = takerAmount.div(rates.length).integerValue(BigNumber.ROUND_UP);
//         return rates.map(r => {
//             const o: SignedNativeOrder = {
//                 order: {
//                     ...new LimitOrder({
//                         makerAmount: singleTakerAmount.times(r).integerValue(),
//                         takerAmount: singleTakerAmount,
//                     }),
//                 },
//                 signature: SIGNATURE,
//                 type: FillQuoteTransformerOrderType.Limit,
//             };
//             return o;
//         });
//     }
//
//     function createOrdersFromBuyRates(makerAmount: BigNumber, rates: Numberish[]): SignedNativeOrder[] {
//         const singleMakerAmount = makerAmount.div(rates.length).integerValue(BigNumber.ROUND_UP);
//         return rates.map(r => {
//             const o: SignedNativeOrder = {
//                 order: {
//                     ...new LimitOrder({
//                         makerAmount: singleMakerAmount,
//                         takerAmount: singleMakerAmount.div(r).integerValue(),
//                     }),
//                 },
//                 signature: SIGNATURE,
//                 type: FillQuoteTransformerOrderType.Limit,
//             };
//             return o;
//         });
//     }
//
//     const ORDER_DOMAIN = {
//         exchangeAddress: contractAddresses.exchange,
//         chainId: CHAIN_ID,
//     };
//
//     function createSamplesFromRates(
//         source: ERC20BridgeSource,
//         inputs: Numberish[],
//         rates: Numberish[],
//         fillData?: FillData,
//     ): DexSample[] {
//         const samples: DexSample[] = [];
//         inputs.forEach((input, i) => {
//             const rate = rates[i];
//             samples.push({
//                 source,
//                 fillData: fillData || DEFAULT_FILL_DATA[source],
//                 input: new BigNumber(input),
//                 output: new BigNumber(input)
//                     .minus(i === 0 ? 0 : samples[i - 1].input)
//                     .times(rate)
//                     .plus(i === 0 ? 0 : samples[i - 1].output)
//                     .integerValue(),
//             });
//         });
//         return samples;
//     }
//
//     type GetMultipleQuotesOperation = (
//         sources: ERC20BridgeSource[],
//         makerToken: string,
//         takerToken: string,
//         fillAmounts: BigNumber[],
//         wethAddress: string,
//         tokenAdjacencyGraph: TokenAdjacencyGraph,
//         liquidityProviderAddress?: string,
//     ) => DexSample[][];
//
//     function createGetMultipleSellQuotesOperationFromRates(rates: RatesBySource): GetMultipleQuotesOperation {
//         return (
//             sources: ERC20BridgeSource[],
//             _makerToken: string,
//             _takerToken: string,
//             fillAmounts: BigNumber[],
//             _wethAddress: string,
//         ) => {
//             return BATCH_SOURCE_FILTERS.getAllowed(sources).map(s => createSamplesFromRates(s, fillAmounts, rates[s]));
//         };
//     }
//
//     function createGetMultipleBuyQuotesOperationFromRates(rates: RatesBySource): GetMultipleQuotesOperation {
//         return (
//             sources: ERC20BridgeSource[],
//             _makerToken: string,
//             _takerToken: string,
//             fillAmounts: BigNumber[],
//             _wethAddress: string,
//         ) => {
//             return BATCH_SOURCE_FILTERS.getAllowed(sources).map(s =>
//                 createSamplesFromRates(s, fillAmounts, rates[s].map(r => new BigNumber(1).div(r))),
//             );
//         };
//     }
//
//     type GetMedianRateOperation = (
//         sources: ERC20BridgeSource[],
//         makerToken: string,
//         takerToken: string,
//         fillAmounts: BigNumber[],
//         wethAddress: string,
//         liquidityProviderAddress?: string,
//     ) => BigNumber;
//
//     function createGetMedianSellRate(rate: Numberish): GetMedianRateOperation {
//         return (
//             _sources: ERC20BridgeSource[],
//             _makerToken: string,
//             _takerToken: string,
//             _fillAmounts: BigNumber[],
//             _wethAddress: string,
//         ) => {
//             return new BigNumber(rate);
//         };
//     }
//
//     function createDecreasingRates(count: number): BigNumber[] {
//         const rates: BigNumber[] = [];
//         const initialRate = getRandomFloat(1e-3, 1e2);
//         _.times(count, () => getRandomFloat(0.95, 1)).forEach((r, i) => {
//             const prevRate = i === 0 ? initialRate : rates[i - 1];
//             rates.push(prevRate.times(r));
//         });
//         return rates;
//     }
//
//     const NUM_SAMPLES = 3;
//
//     interface RatesBySource {
//         [source: string]: Numberish[];
//     }
//
//     const ZERO_RATES: RatesBySource = Object.assign(
//         {},
//         ...Object.values(ERC20BridgeSource).map(source => ({
//             [source]: _.times(NUM_SAMPLES, () => 0),
//         })),
//     );
//
//     const DEFAULT_RATES: RatesBySource = {
//         ...ZERO_RATES,
//         [ERC20BridgeSource.Native]: createDecreasingRates(NUM_SAMPLES),
//         [ERC20BridgeSource.Eth2Dai]: createDecreasingRates(NUM_SAMPLES),
//         [ERC20BridgeSource.Uniswap]: createDecreasingRates(NUM_SAMPLES),
//         [ERC20BridgeSource.Kyber]: createDecreasingRates(NUM_SAMPLES),
//     };
//
//     interface FillDataBySource {
//         [source: string]: FillData;
//     }
//
//     const DEFAULT_FILL_DATA: FillDataBySource = {
//         [ERC20BridgeSource.UniswapV2]: { tokenAddressPath: [] },
//         [ERC20BridgeSource.Balancer]: { poolAddress: randomAddress() },
//         [ERC20BridgeSource.BalancerV2]: {
//             vault: randomAddress(),
//             poolId: randomAddress(),
//             deadline: Math.floor(Date.now() / 1000) + 300,
//         },
//         [ERC20BridgeSource.Bancor]: { path: [], networkAddress: randomAddress() },
//         [ERC20BridgeSource.Kyber]: { hint: '0x', reserveId: '0x', networkAddress: randomAddress() },
//         [ERC20BridgeSource.Curve]: {
//             pool: {
//                 poolAddress: randomAddress(),
//                 tokens: [TAKER_TOKEN, MAKER_TOKEN],
//                 exchangeFunctionSelector: hexUtils.random(4),
//                 sellQuoteFunctionSelector: hexUtils.random(4),
//                 buyQuoteFunctionSelector: hexUtils.random(4),
//             },
//             fromTokenIdx: 0,
//             toTokenIdx: 1,
//         },
//         [ERC20BridgeSource.Swerve]: {
//             pool: {
//                 poolAddress: randomAddress(),
//                 tokens: [TAKER_TOKEN, MAKER_TOKEN],
//                 exchangeFunctionSelector: hexUtils.random(4),
//                 sellQuoteFunctionSelector: hexUtils.random(4),
//                 buyQuoteFunctionSelector: hexUtils.random(4),
//             },
//             fromTokenIdx: 0,
//             toTokenIdx: 1,
//         },
//         [ERC20BridgeSource.SnowSwap]: {
//             pool: {
//                 poolAddress: randomAddress(),
//                 tokens: [TAKER_TOKEN, MAKER_TOKEN],
//                 exchangeFunctionSelector: hexUtils.random(4),
//                 sellQuoteFunctionSelector: hexUtils.random(4),
//                 buyQuoteFunctionSelector: hexUtils.random(4),
//             },
//             fromTokenIdx: 0,
//             toTokenIdx: 1,
//         },
//         [ERC20BridgeSource.Smoothy]: {
//             pool: {
//                 poolAddress: randomAddress(),
//                 tokens: [TAKER_TOKEN, MAKER_TOKEN],
//                 exchangeFunctionSelector: hexUtils.random(4),
//                 sellQuoteFunctionSelector: hexUtils.random(4),
//                 buyQuoteFunctionSelector: hexUtils.random(4),
//             },
//             fromTokenIdx: 0,
//             toTokenIdx: 1,
//         },
//         [ERC20BridgeSource.Saddle]: {
//             pool: {
//                 poolAddress: randomAddress(),
//                 tokens: [TAKER_TOKEN, MAKER_TOKEN],
//                 exchangeFunctionSelector: hexUtils.random(4),
//                 sellQuoteFunctionSelector: hexUtils.random(4),
//                 buyQuoteFunctionSelector: hexUtils.random(4),
//             },
//             fromTokenIdx: 0,
//             toTokenIdx: 1,
//         },
//         [ERC20BridgeSource.LiquidityProvider]: { poolAddress: randomAddress() },
//         [ERC20BridgeSource.SushiSwap]: { tokenAddressPath: [] },
//         [ERC20BridgeSource.Mooniswap]: { poolAddress: randomAddress() },
//         [ERC20BridgeSource.Native]: { order: new LimitOrder() },
//         [ERC20BridgeSource.MultiHop]: {},
//         [ERC20BridgeSource.Shell]: { poolAddress: randomAddress() },
//         [ERC20BridgeSource.Component]: { poolAddress: randomAddress() },
//         [ERC20BridgeSource.Cream]: { poolAddress: randomAddress() },
//         [ERC20BridgeSource.Dodo]: {},
//         [ERC20BridgeSource.DodoV2]: {},
//         [ERC20BridgeSource.CryptoCom]: { tokenAddressPath: [] },
//         [ERC20BridgeSource.Linkswap]: { tokenAddressPath: [] },
//         [ERC20BridgeSource.Uniswap]: { router: randomAddress() },
//         [ERC20BridgeSource.Eth2Dai]: { router: randomAddress() },
//         [ERC20BridgeSource.MakerPsm]: {},
//         [ERC20BridgeSource.KyberDmm]: { tokenAddressPath: [], router: randomAddress(), poolsPath: [] },
//     };
//
//     const DEFAULT_OPS = {
//         getTokenDecimals(_makerAddress: string, _takerAddress: string): BigNumber[] {
//             const result = new BigNumber(18);
//             return [result, result];
//         },
//         getLimitOrderFillableTakerAmounts(orders: SignedNativeOrder[]): BigNumber[] {
//             return orders.map(o => o.order.takerAmount);
//         },
//         getLimitOrderFillableMakerAmounts(orders: SignedNativeOrder[]): BigNumber[] {
//             return orders.map(o => o.order.makerAmount);
//         },
//         getSellQuotes: createGetMultipleSellQuotesOperationFromRates(DEFAULT_RATES),
//         getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(DEFAULT_RATES),
//         getMedianSellRate: createGetMedianSellRate(1),
//         getTwoHopSellQuotes: (..._params: any[]) => [],
//         getTwoHopBuyQuotes: (..._params: any[]) => [],
//         isAddressContract: (..._params: any[]) => false,
//     };
//
//     const MOCK_SAMPLER = ({
//         async executeAsync(...ops: any[]): Promise<any[]> {
//             return MOCK_SAMPLER.executeBatchAsync(ops);
//         },
//         async executeBatchAsync(ops: any[]): Promise<any[]> {
//             return ops;
//         },
//         poolsCaches: {
//             [ERC20BridgeSource.BalancerV2]: mockPoolsCache,
//             [ERC20BridgeSource.Balancer]: mockPoolsCache,
//             [ERC20BridgeSource.Cream]: mockPoolsCache,
//         },
//         liquidityProviderRegistry: {},
//         chainId: CHAIN_ID,
//     } as any) as DexOrderSampler;
//
//     function replaceSamplerOps(ops: Partial<typeof DEFAULT_OPS> = {}): void {
//         Object.assign(MOCK_SAMPLER, DEFAULT_OPS);
//         Object.assign(MOCK_SAMPLER, ops);
//     }
//
//     describe('MarketOperationUtils', () => {
//         let marketOperationUtils: MarketOperationUtils;
//
//         before(async () => {
//             marketOperationUtils = new MarketOperationUtils(MOCK_SAMPLER, contractAddresses, ORDER_DOMAIN);
//         });
//
//         describe('getMarketSellOrdersAsync()', () => {
//             const FILL_AMOUNT = new BigNumber('100e18');
//             const ORDERS = createOrdersFromSellRates(
//                 FILL_AMOUNT,
//                 _.times(NUM_SAMPLES, i => DEFAULT_RATES[ERC20BridgeSource.Native][i]),
//             );
//             const DEFAULT_OPTS: Partial<GetMarketOrdersOpts> = {
//                 numSamples: NUM_SAMPLES,
//                 sampleDistributionBase: 1,
//                 bridgeSlippage: 0,
//                 maxFallbackSlippage: 100,
//                 excludedSources: DEFAULT_EXCLUDED,
//                 allowFallback: false,
//                 gasSchedule: {},
//                 feeSchedule: {},
//             };
//
//             beforeEach(() => {
//                 replaceSamplerOps();
//             });
//
//             it('queries `numSamples` samples', async () => {
//                 const numSamples = _.random(1, NUM_SAMPLES);
//                 let actualNumSamples = 0;
//                 replaceSamplerOps({
//                     getSellQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
//                         actualNumSamples = amounts.length;
//                         return DEFAULT_OPS.getSellQuotes(
//                             sources,
//                             makerToken,
//                             takerToken,
//                             amounts,
//                             wethAddress,
//                             TOKEN_ADJACENCY_GRAPH,
//                         );
//                     },
//                 });
//                 await getMarketSellOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
//                     ...DEFAULT_OPTS,
//                     numSamples,
//                 });
//                 expect(actualNumSamples).eq(numSamples);
//             });
//
//             it('polls all DEXes if `excludedSources` is empty', async () => {
//                 let sourcesPolled: ERC20BridgeSource[] = [];
//                 replaceSamplerOps({
//                     getSellQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
//                         sourcesPolled = sourcesPolled.concat(sources.slice());
//                         return DEFAULT_OPS.getSellQuotes(
//                             sources,
//                             makerToken,
//                             takerToken,
//                             amounts,
//                             wethAddress,
//                             TOKEN_ADJACENCY_GRAPH,
//                         );
//                     },
//                     getTwoHopSellQuotes: (...args: any[]) => {
//                         sourcesPolled.push(ERC20BridgeSource.MultiHop);
//                         return DEFAULT_OPS.getTwoHopSellQuotes(...args);
//                     },
//                 });
//                 await getMarketSellOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
//                     ...DEFAULT_OPTS,
//                     excludedSources: [],
//                 });
//                 expect(_.uniq(sourcesPolled).sort()).to.deep.equals(SELL_SOURCES.slice().sort());
//             });
//
//             it('does not poll DEXes in `excludedSources`', async () => {
//                 const excludedSources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.Eth2Dai];
//                 let sourcesPolled: ERC20BridgeSource[] = [];
//                 replaceSamplerOps({
//                     getSellQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
//                         sourcesPolled = sourcesPolled.concat(sources.slice());
//                         return DEFAULT_OPS.getSellQuotes(
//                             sources,
//                             makerToken,
//                             takerToken,
//                             amounts,
//                             wethAddress,
//                             TOKEN_ADJACENCY_GRAPH,
//                         );
//                     },
//                     getTwoHopSellQuotes: (sources: ERC20BridgeSource[], ...args: any[]) => {
//                         if (sources.length !== 0) {
//                             sourcesPolled.push(ERC20BridgeSource.MultiHop);
//                             sourcesPolled.push(...sources);
//                         }
//                         return DEFAULT_OPS.getTwoHopSellQuotes(...args);
//                     },
//                 });
//                 await getMarketSellOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
//                     ...DEFAULT_OPTS,
//                     excludedSources,
//                 });
//                 expect(_.uniq(sourcesPolled).sort()).to.deep.equals(_.without(SELL_SOURCES, ...excludedSources).sort());
//             });
//
//             it('only polls DEXes in `includedSources`', async () => {
//                 const includedSources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.Eth2Dai];
//                 let sourcesPolled: ERC20BridgeSource[] = [];
//                 replaceSamplerOps({
//                     getSellQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
//                         sourcesPolled = sourcesPolled.concat(sources.slice());
//                         return DEFAULT_OPS.getSellQuotes(
//                             sources,
//                             makerToken,
//                             takerToken,
//                             amounts,
//                             wethAddress,
//                             TOKEN_ADJACENCY_GRAPH,
//                         );
//                     },
//                     getTwoHopSellQuotes: (sources: ERC20BridgeSource[], ...args: any[]) => {
//                         if (sources.length !== 0) {
//                             sourcesPolled.push(ERC20BridgeSource.MultiHop);
//                             sourcesPolled.push(...sources);
//                         }
//                         return DEFAULT_OPS.getTwoHopSellQuotes(sources, ...args);
//                     },
//                 });
//                 await getMarketSellOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
//                     ...DEFAULT_OPTS,
//                     excludedSources: [],
//                     includedSources,
//                 });
//                 expect(_.uniq(sourcesPolled).sort()).to.deep.equals(includedSources.sort());
//             });
//
//             // // TODO (xianny): v4 will have a new way of representing bridge data
//             // it('generates bridge orders with correct asset data', async () => {
//             //     const improvedOrdersResponse = await getMarketSellOrdersAsync(
//             //         marketOperationUtils,
//             //         // Pass in empty orders to prevent native orders from being used.
//             //         ORDERS.map(o => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
//             //         FILL_AMOUNT,
//             //         DEFAULT_OPTS,
//             //     );
//             //     const improvedOrders = improvedOrdersResponse.optimizedOrders;
//             //     expect(improvedOrders).to.not.be.length(0);
//             //     for (const order of improvedOrders) {
//             //         expect(getSourceFromAssetData(order.makerAssetData)).to.exist('');
//             //         const makerAssetDataPrefix = hexUtils.slice(
//             //             assetDataUtils.encodeERC20BridgeAssetData(
//             //                 MAKER_TOKEN,
//             //                 constants.NULL_ADDRESS,
//             //                 constants.NULL_BYTES,
//             //             ),
//             //             0,
//             //             36,
//             //         );
//             //         assertSamePrefix(order.makerAssetData, makerAssetDataPrefix);
//             //         expect(order.takerAssetData).to.eq(TAKER_ASSET_DATA);
//             //     }
//             // });
//
//             it('getMarketSellOrdersAsync() optimizer will be called once only if price-aware RFQ is disabled', async () => {
//                 const mockedMarketOpUtils = TypeMoq.Mock.ofType(
//                     MarketOperationUtils,
//                     TypeMoq.MockBehavior.Loose,
//                     false,
//                     MOCK_SAMPLER,
//                     contractAddresses,
//                     ORDER_DOMAIN,
//                 );
//                 mockedMarketOpUtils.callBase = true;
//
//                 // Ensure that `_generateOptimizedOrdersAsync` is only called once
//                 mockedMarketOpUtils
//                     .setup(m => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
//                     .returns(async (a, b) => mockedMarketOpUtils.target._generateOptimizedOrdersAsync(a, b))
//                     .verifiable(TypeMoq.Times.once());
//
//                 const totalAssetAmount = ORDERS.map(o => o.order.takerAmount).reduce((a, b) => a.plus(b));
//                 await mockedMarketOpUtils.object.getOptimizerResultAsync(
//                     ORDERS,
//                     totalAssetAmount,
//                     MarketOperation.Sell,
//                     DEFAULT_OPTS,
//                 );
//                 mockedMarketOpUtils.verifyAll();
//             });
//
//             it('optimizer will send in a comparison price to RFQ providers', async () => {
//                 // Set up mocked quote requestor, will return an order that is better
//                 // than the best of the orders.
//                 const mockedQuoteRequestor = TypeMoq.Mock.ofType(QuoteRequestor, TypeMoq.MockBehavior.Loose, false, {});
//
//                 let requestedComparisonPrice: BigNumber | undefined;
//
//                 // to get a comparisonPrice, you need a feeschedule for a native order
//                 const feeSchedule = {
//                     [ERC20BridgeSource.Native]: _.constant(new BigNumber(1)),
//                 };
//                 mockedQuoteRequestor
//                     .setup(mqr => mqr.getMakerUriForSignature(TypeMoq.It.isValue(SIGNATURE)))
//                     .returns(() => 'https://foo.bar');
//                 mockedQuoteRequestor
//                     .setup(mqr =>
//                         mqr.requestRfqtFirmQuotesAsync(
//                             TypeMoq.It.isAny(),
//                             TypeMoq.It.isAny(),
//                             TypeMoq.It.isAny(),
//                             TypeMoq.It.isAny(),
//                             TypeMoq.It.isAny(),
//                             TypeMoq.It.isAny(),
//                         ),
//                     )
//                     .callback(
//                         (
//                             _makerToken: string,
//                             _takerToken: string,
//                             _assetFillAmount: BigNumber,
//                             _marketOperation: MarketOperation,
//                             comparisonPrice: BigNumber | undefined,
//                             _options: RfqRequestOpts,
//                         ) => {
//                             requestedComparisonPrice = comparisonPrice;
//                         },
//                     )
//                     .returns(async () => {
//                         return [
//                             {
//                                 order: {
//                                     ...new RfqOrder({
//                                         makerToken: MAKER_TOKEN,
//                                         takerToken: TAKER_TOKEN,
//                                         makerAmount: Web3Wrapper.toBaseUnitAmount(321, 6),
//                                         takerAmount: Web3Wrapper.toBaseUnitAmount(1, 18),
//                                     }),
//                                 },
//                                 signature: SIGNATURE,
//                                 type: FillQuoteTransformerOrderType.Rfq,
//                             },
//                         ];
//                     });
//
//                 // Set up sampler, will only return 1 on-chain order
//                 const mockedMarketOpUtils = TypeMoq.Mock.ofType(
//                     MarketOperationUtils,
//                     TypeMoq.MockBehavior.Loose,
//                     false,
//                     MOCK_SAMPLER,
//                     contractAddresses,
//                     ORDER_DOMAIN,
//                 );
//                 mockedMarketOpUtils.callBase = true;
//                 mockedMarketOpUtils
//                     .setup(mou =>
//                         mou.getMarketSellLiquidityAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny(), TypeMoq.It.isAny()),
//                     )
//                     .returns(async () => {
//                         return {
//                             side: MarketOperation.Sell,
//                             inputAmount: Web3Wrapper.toBaseUnitAmount(1, 18),
//                             inputToken: MAKER_TOKEN,
//                             outputToken: TAKER_TOKEN,
//                             inputAmountPerEth: Web3Wrapper.toBaseUnitAmount(1, 18),
//                             outputAmountPerEth: Web3Wrapper.toBaseUnitAmount(1, 6),
//                             quoteSourceFilters: new SourceFilters(),
//                             makerTokenDecimals: 6,
//                             takerTokenDecimals: 18,
//                             quotes: {
//                                 dexQuotes: [],
//                                 rfqtIndicativeQuotes: [],
//                                 twoHopQuotes: [],
//                                 nativeOrders: [
//                                     {
//                                         order: new LimitOrder({
//                                             makerToken: MAKER_TOKEN,
//                                             takerToken: TAKER_TOKEN,
//                                             makerAmount: Web3Wrapper.toBaseUnitAmount(320, 6),
//                                             takerAmount: Web3Wrapper.toBaseUnitAmount(1, 18),
//                                         }),
//                                         fillableTakerAmount: Web3Wrapper.toBaseUnitAmount(1, 18),
//                                         fillableMakerAmount: Web3Wrapper.toBaseUnitAmount(320, 6),
//                                         fillableTakerFeeAmount: new BigNumber(0),
//                                         type: FillQuoteTransformerOrderType.Limit,
//                                         signature: SIGNATURE,
//                                     },
//                                 ],
//                             },
//                             isRfqSupported: true,
//                         };
//                     });
//                 const result = await mockedMarketOpUtils.object.getOptimizerResultAsync(
//                     ORDERS,
//                     Web3Wrapper.toBaseUnitAmount(1, 18),
//                     MarketOperation.Sell,
//                     {
//                         ...DEFAULT_OPTS,
//                         feeSchedule,
//                         rfqt: {
//                             isIndicative: false,
//                             apiKey: 'foo',
//                             takerAddress: randomAddress(),
//                             txOrigin: randomAddress(),
//                             intentOnFilling: true,
//                             quoteRequestor: {
//                                 requestRfqtFirmQuotesAsync: mockedQuoteRequestor.object.requestRfqtFirmQuotesAsync,
//                                 getMakerUriForSignature: mockedQuoteRequestor.object.getMakerUriForSignature,
//                             } as any,
//                         },
//                     },
//                 );
//                 expect(result.optimizedOrders.length).to.eql(1);
//                 // tslint:disable-next-line:no-unnecessary-type-assertion
//                 expect(requestedComparisonPrice!.toString()).to.eql('320');
//                 expect(result.optimizedOrders[0].makerAmount.toString()).to.eql('321000000');
//                 expect(result.optimizedOrders[0].takerAmount.toString()).to.eql('1000000000000000000');
//             });
//
//             it('getMarketSellOrdersAsync() will not rerun the optimizer if no orders are returned', async () => {
//                 // Ensure that `_generateOptimizedOrdersAsync` is only called once
//                 const mockedMarketOpUtils = TypeMoq.Mock.ofType(
//                     MarketOperationUtils,
//                     TypeMoq.MockBehavior.Loose,
//                     false,
//                     MOCK_SAMPLER,
//                     contractAddresses,
//                     ORDER_DOMAIN,
//                 );
//                 mockedMarketOpUtils.callBase = true;
//                 mockedMarketOpUtils
//                     .setup(m => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
//                     .returns(async (a, b) => mockedMarketOpUtils.target._generateOptimizedOrdersAsync(a, b))
//                     .verifiable(TypeMoq.Times.once());
//
//                 const requestor = getMockedQuoteRequestor('firm', [], TypeMoq.Times.once());
//
//                 const totalAssetAmount = ORDERS.map(o => o.order.takerAmount).reduce((a, b) => a.plus(b));
//                 await mockedMarketOpUtils.object.getOptimizerResultAsync(
//                     ORDERS,
//                     totalAssetAmount,
//                     MarketOperation.Sell,
//                     {
//                         ...DEFAULT_OPTS,
//                         rfqt: {
//                             isIndicative: false,
//                             apiKey: 'foo',
//                             takerAddress: randomAddress(),
//                             intentOnFilling: true,
//                             txOrigin: randomAddress(),
//                             quoteRequestor: {
//                                 requestRfqtFirmQuotesAsync: requestor.object.requestRfqtFirmQuotesAsync,
//                             } as any,
//                         },
//                     },
//                 );
//                 mockedMarketOpUtils.verifyAll();
//                 requestor.verifyAll();
//             });
//
//             it('getMarketSellOrdersAsync() will rerun the optimizer if one or more indicative are returned', async () => {
//                 const requestor = getMockedQuoteRequestor('indicative', [ORDERS[0], ORDERS[1]], TypeMoq.Times.once());
//
//                 const numOrdersInCall: number[] = [];
//                 const numIndicativeQuotesInCall: number[] = [];
//
//                 const mockedMarketOpUtils = TypeMoq.Mock.ofType(
//                     MarketOperationUtils,
//                     TypeMoq.MockBehavior.Loose,
//                     false,
//                     MOCK_SAMPLER,
//                     contractAddresses,
//                     ORDER_DOMAIN,
//                 );
//                 mockedMarketOpUtils.callBase = true;
//                 mockedMarketOpUtils
//                     .setup(m => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
//                     .callback(async (msl: MarketSideLiquidity, _opts: GenerateOptimizedOrdersOpts) => {
//                         numOrdersInCall.push(msl.quotes.nativeOrders.length);
//                         numIndicativeQuotesInCall.push(msl.quotes.rfqtIndicativeQuotes.length);
//                     })
//                     .returns(async (a, b) => mockedMarketOpUtils.target._generateOptimizedOrdersAsync(a, b))
//                     .verifiable(TypeMoq.Times.exactly(2));
//
//                 const totalAssetAmount = ORDERS.map(o => o.order.takerAmount).reduce((a, b) => a.plus(b));
//                 await mockedMarketOpUtils.object.getOptimizerResultAsync(
//                     ORDERS.slice(2, ORDERS.length),
//                     totalAssetAmount,
//                     MarketOperation.Sell,
//                     {
//                         ...DEFAULT_OPTS,
//                         rfqt: {
//                             isIndicative: true,
//                             apiKey: 'foo',
//                             takerAddress: randomAddress(),
//                             txOrigin: randomAddress(),
//                             intentOnFilling: true,
//                             quoteRequestor: {
//                                 requestRfqtIndicativeQuotesAsync: requestor.object.requestRfqtIndicativeQuotesAsync,
//                                 getMakerUriForSignature: requestor.object.getMakerUriForSignature,
//                             } as any,
//                         },
//                     },
//                 );
//                 mockedMarketOpUtils.verifyAll();
//                 requestor.verifyAll();
//
//                 // The first and second optimizer call contains same number of RFQ orders.
//                 expect(numOrdersInCall.length).to.eql(2);
//                 expect(numOrdersInCall[0]).to.eql(1);
//                 expect(numOrdersInCall[1]).to.eql(1);
//
//                 // The first call to optimizer will have no RFQ indicative quotes. The second call will have
//                 // two indicative quotes.
//                 expect(numIndicativeQuotesInCall.length).to.eql(2);
//                 expect(numIndicativeQuotesInCall[0]).to.eql(0);
//                 expect(numIndicativeQuotesInCall[1]).to.eql(2);
//             });
//
//             it('getMarketSellOrdersAsync() will rerun the optimizer if one or more RFQ orders are returned', async () => {
//                 const requestor = getMockedQuoteRequestor('firm', [ORDERS[0]], TypeMoq.Times.once());
//
//                 // Ensure that `_generateOptimizedOrdersAsync` is only called once
//
//                 // TODO: Ensure fillable amounts increase too
//                 const numOrdersInCall: number[] = [];
//                 const mockedMarketOpUtils = TypeMoq.Mock.ofType(
//                     MarketOperationUtils,
//                     TypeMoq.MockBehavior.Loose,
//                     false,
//                     MOCK_SAMPLER,
//                     contractAddresses,
//                     ORDER_DOMAIN,
//                 );
//                 mockedMarketOpUtils.callBase = true;
//                 mockedMarketOpUtils
//                     .setup(m => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
//                     .callback(async (msl: MarketSideLiquidity, _opts: GenerateOptimizedOrdersOpts) => {
//                         numOrdersInCall.push(msl.quotes.nativeOrders.length);
//                     })
//                     .returns(async (a, b) => mockedMarketOpUtils.target._generateOptimizedOrdersAsync(a, b))
//                     .verifiable(TypeMoq.Times.exactly(2));
//
//                 const totalAssetAmount = ORDERS.map(o => o.order.takerAmount).reduce((a, b) => a.plus(b));
//                 await mockedMarketOpUtils.object.getOptimizerResultAsync(
//                     ORDERS.slice(1, ORDERS.length),
//                     totalAssetAmount,
//                     MarketOperation.Sell,
//                     {
//                         ...DEFAULT_OPTS,
//                         rfqt: {
//                             isIndicative: false,
//                             apiKey: 'foo',
//                             takerAddress: randomAddress(),
//                             intentOnFilling: true,
//                             txOrigin: randomAddress(),
//                             quoteRequestor: {
//                                 requestRfqtFirmQuotesAsync: requestor.object.requestRfqtFirmQuotesAsync,
//                             } as any,
//                         },
//                     },
//                 );
//                 mockedMarketOpUtils.verifyAll();
//                 requestor.verifyAll();
//                 expect(numOrdersInCall.length).to.eql(2);
//
//                 // The first call to optimizer was without an RFQ order.
//                 // The first call to optimizer was with an extra RFQ order.
//                 expect(numOrdersInCall[0]).to.eql(2);
//                 expect(numOrdersInCall[1]).to.eql(3);
//             });
//
//             it('getMarketSellOrdersAsync() will not raise a NoOptimalPath error if no initial path was found during on-chain DEX optimization, but a path was found after RFQ optimization', async () => {
//                 let hasFirstOptimizationRun = false;
//                 let hasSecondOptimizationRun = false;
//                 const requestor = getMockedQuoteRequestor('firm', [ORDERS[0], ORDERS[1]], TypeMoq.Times.once());
//
//                 const mockedMarketOpUtils = TypeMoq.Mock.ofType(
//                     MarketOperationUtils,
//                     TypeMoq.MockBehavior.Loose,
//                     false,
//                     MOCK_SAMPLER,
//                     contractAddresses,
//                     ORDER_DOMAIN,
//                 );
//                 mockedMarketOpUtils.callBase = true;
//                 mockedMarketOpUtils
//                     .setup(m => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
//                     .returns(async (msl: MarketSideLiquidity, _opts: GenerateOptimizedOrdersOpts) => {
//                         if (msl.quotes.nativeOrders.length === 1) {
//                             hasFirstOptimizationRun = true;
//                             throw new Error(AggregationError.NoOptimalPath);
//                         } else if (msl.quotes.nativeOrders.length === 3) {
//                             hasSecondOptimizationRun = true;
//                             return mockedMarketOpUtils.target._generateOptimizedOrdersAsync(msl, _opts);
//                         } else {
//                             throw new Error('Invalid path. this error message should never appear');
//                         }
//                     })
//                     .verifiable(TypeMoq.Times.exactly(2));
//
//                 const totalAssetAmount = ORDERS.map(o => o.order.takerAmount).reduce((a, b) => a.plus(b));
//                 await mockedMarketOpUtils.object.getOptimizerResultAsync(
//                     ORDERS.slice(2, ORDERS.length),
//                     totalAssetAmount,
//                     MarketOperation.Sell,
//                     {
//                         ...DEFAULT_OPTS,
//                         rfqt: {
//                             isIndicative: false,
//                             apiKey: 'foo',
//                             takerAddress: randomAddress(),
//                             txOrigin: randomAddress(),
//                             intentOnFilling: true,
//                             quoteRequestor: {
//                                 requestRfqtFirmQuotesAsync: requestor.object.requestRfqtFirmQuotesAsync,
//                             } as any,
//                         },
//                     },
//                 );
//                 mockedMarketOpUtils.verifyAll();
//                 requestor.verifyAll();
//
//                 expect(hasFirstOptimizationRun).to.eql(true);
//                 expect(hasSecondOptimizationRun).to.eql(true);
//             });
//
//             it('getMarketSellOrdersAsync() will raise a NoOptimalPath error if no path was found during on-chain DEX optimization and RFQ optimization', async () => {
//                 const mockedMarketOpUtils = TypeMoq.Mock.ofType(
//                     MarketOperationUtils,
//                     TypeMoq.MockBehavior.Loose,
//                     false,
//                     MOCK_SAMPLER,
//                     contractAddresses,
//                     ORDER_DOMAIN,
//                 );
//                 mockedMarketOpUtils.callBase = true;
//                 mockedMarketOpUtils
//                     .setup(m => m._generateOptimizedOrdersAsync(TypeMoq.It.isAny(), TypeMoq.It.isAny()))
//                     .returns(async (msl: MarketSideLiquidity, _opts: GenerateOptimizedOrdersOpts) => {
//                         throw new Error(AggregationError.NoOptimalPath);
//                     })
//                     .verifiable(TypeMoq.Times.exactly(1));
//
//                 try {
//                     await mockedMarketOpUtils.object.getOptimizerResultAsync(
//                         ORDERS.slice(2, ORDERS.length),
//                         ORDERS[0].order.takerAmount,
//                         MarketOperation.Sell,
//                         DEFAULT_OPTS,
//                     );
//                     expect.fail(`Call should have thrown "${AggregationError.NoOptimalPath}" but instead succeded`);
//                 } catch (e) {
//                     if (e.message !== AggregationError.NoOptimalPath) {
//                         expect.fail(e);
//                     }
//                 }
//                 mockedMarketOpUtils.verifyAll();
//             });
//
//             it('generates bridge orders with correct taker amount', async () => {
//                 const improvedOrdersResponse = await getMarketSellOrdersAsync(
//                     marketOperationUtils,
//                     // Pass in empty orders to prevent native orders from being used.
//                     ORDERS.map(o => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
//                     FILL_AMOUNT,
//                     DEFAULT_OPTS,
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const totaltakerAmount = BigNumber.sum(...improvedOrders.map(o => o.takerAmount));
//                 expect(totaltakerAmount).to.bignumber.gte(FILL_AMOUNT);
//             });
//
//             it('generates bridge orders with max slippage of `bridgeSlippage`', async () => {
//                 const bridgeSlippage = _.random(0.1, true);
//                 const improvedOrdersResponse = await getMarketSellOrdersAsync(
//                     marketOperationUtils,
//                     // Pass in empty orders to prevent native orders from being used.
//                     ORDERS.map(o => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, bridgeSlippage },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 expect(improvedOrders).to.not.be.length(0);
//                 for (const order of improvedOrders) {
//                     const expectedMakerAmount = order.fills[0].output;
//                     const slippage = new BigNumber(1).minus(order.makerAmount.div(expectedMakerAmount.plus(1)));
//                     assertRoughlyEquals(slippage, bridgeSlippage, 1);
//                 }
//             });
//
//             it('can mix convex sources', async () => {
//                 const rates: RatesBySource = { ...DEFAULT_RATES };
//                 rates[ERC20BridgeSource.Native] = [0.4, 0.3, 0.2, 0.1];
//                 rates[ERC20BridgeSource.Uniswap] = [0.5, 0.05, 0.05, 0.05];
//                 rates[ERC20BridgeSource.Eth2Dai] = [0.6, 0.05, 0.05, 0.05];
//                 rates[ERC20BridgeSource.Kyber] = [0, 0, 0, 0]; // unused
//                 replaceSamplerOps({
//                     getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
//                 });
//                 const improvedOrdersResponse = await getMarketSellOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4 },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [
//                     ERC20BridgeSource.Eth2Dai,
//                     ERC20BridgeSource.Uniswap,
//                     ERC20BridgeSource.Native,
//                     ERC20BridgeSource.Native,
//                 ];
//                 expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
//             });
//
//             const ETH_TO_MAKER_RATE = 1.5;
//
//             it('factors in fees for native orders', async () => {
//                 // Native orders will have the best rates but have fees,
//                 // dropping their effective rates.
//                 const nativeFeeRate = 0.06;
//                 const rates: RatesBySource = {
//                     [ERC20BridgeSource.Native]: [1, 0.99, 0.98, 0.97], // Effectively [0.94, 0.93, 0.92, 0.91]
//                     [ERC20BridgeSource.Uniswap]: [0.96, 0.1, 0.1, 0.1],
//                     [ERC20BridgeSource.Eth2Dai]: [0.95, 0.1, 0.1, 0.1],
//                     [ERC20BridgeSource.Kyber]: [0.1, 0.1, 0.1, 0.1],
//                 };
//                 const feeSchedule = {
//                     [ERC20BridgeSource.Native]: _.constant(
//                         FILL_AMOUNT.div(4)
//                             .times(nativeFeeRate)
//                             .dividedToIntegerBy(ETH_TO_MAKER_RATE),
//                     ),
//                 };
//                 replaceSamplerOps({
//                     getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
//                     getMedianSellRate: createGetMedianSellRate(ETH_TO_MAKER_RATE),
//                 });
//                 const improvedOrdersResponse = await getMarketSellOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4, feeSchedule },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [
//                     ERC20BridgeSource.Native,
//                     ERC20BridgeSource.Uniswap,
//                     ERC20BridgeSource.Eth2Dai,
//                     ERC20BridgeSource.Native,
//                 ];
//                 expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
//             });
//
//             it('factors in fees for dexes', async () => {
//                 // Kyber will have the best rates but will have fees,
//                 // dropping its effective rates.
//                 const uniswapFeeRate = 0.2;
//                 const rates: RatesBySource = {
//                     [ERC20BridgeSource.Native]: [0.95, 0.1, 0.1, 0.1],
//                     [ERC20BridgeSource.Kyber]: [0.1, 0.1, 0.1, 0.1],
//                     [ERC20BridgeSource.Eth2Dai]: [0.92, 0.1, 0.1, 0.1],
//                     // Effectively [0.8, ~0.5, ~0, ~0]
//                     [ERC20BridgeSource.Uniswap]: [1, 0.7, 0.2, 0.2],
//                 };
//                 const feeSchedule = {
//                     [ERC20BridgeSource.Uniswap]: _.constant(
//                         FILL_AMOUNT.div(4)
//                             .times(uniswapFeeRate)
//                             .dividedToIntegerBy(ETH_TO_MAKER_RATE),
//                     ),
//                 };
//                 replaceSamplerOps({
//                     getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
//                     getMedianSellRate: createGetMedianSellRate(ETH_TO_MAKER_RATE),
//                 });
//                 const improvedOrdersResponse = await getMarketSellOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4, feeSchedule },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [
//                     ERC20BridgeSource.Native,
//                     ERC20BridgeSource.Eth2Dai,
//                     ERC20BridgeSource.Uniswap,
//                 ];
//                 expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
//             });
//
//             it('can mix one concave source', async () => {
//                 const rates: RatesBySource = {
//                     [ERC20BridgeSource.Kyber]: [0, 0, 0, 0], // Won't use
//                     [ERC20BridgeSource.Eth2Dai]: [0.5, 0.85, 0.75, 0.75], // Concave
//                     [ERC20BridgeSource.Uniswap]: [0.96, 0.2, 0.1, 0.1],
//                     [ERC20BridgeSource.Native]: [0.95, 0.2, 0.2, 0.1],
//                 };
//                 replaceSamplerOps({
//                     getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
//                     getMedianSellRate: createGetMedianSellRate(ETH_TO_MAKER_RATE),
//                 });
//                 const improvedOrdersResponse = await getMarketSellOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4 },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [
//                     ERC20BridgeSource.Eth2Dai,
//                     ERC20BridgeSource.Uniswap,
//                     ERC20BridgeSource.Native,
//                 ];
//                 expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
//             });
//
//             it('fallback orders use different sources', async () => {
//                 const rates: RatesBySource = {};
//                 rates[ERC20BridgeSource.Native] = [0.9, 0.8, 0.5, 0.5];
//                 rates[ERC20BridgeSource.Uniswap] = [0.6, 0.05, 0.01, 0.01];
//                 rates[ERC20BridgeSource.Eth2Dai] = [0.4, 0.3, 0.01, 0.01];
//                 rates[ERC20BridgeSource.Kyber] = [0.35, 0.2, 0.01, 0.01];
//                 replaceSamplerOps({
//                     getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
//                 });
//                 const improvedOrdersResponse = await getMarketSellOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4, allowFallback: true },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const firstSources = orderSources.slice(0, 4);
//                 const secondSources = orderSources.slice(4);
//                 expect(_.intersection(firstSources, secondSources)).to.be.length(0);
//             });
//
//             it('does not create a fallback if below maxFallbackSlippage', async () => {
//                 const rates: RatesBySource = {};
//                 rates[ERC20BridgeSource.Native] = [1, 1, 0.01, 0.01];
//                 rates[ERC20BridgeSource.Uniswap] = [1, 1, 0.01, 0.01];
//                 rates[ERC20BridgeSource.Eth2Dai] = [0.49, 0.49, 0.49, 0.49];
//                 rates[ERC20BridgeSource.Kyber] = [0.35, 0.2, 0.01, 0.01];
//                 replaceSamplerOps({
//                     getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
//                 });
//                 const improvedOrdersResponse = await getMarketSellOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4, allowFallback: true, maxFallbackSlippage: 0.25 },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const firstSources = [ERC20BridgeSource.Native, ERC20BridgeSource.Native, ERC20BridgeSource.Uniswap];
//                 const secondSources: ERC20BridgeSource[] = [];
//                 expect(orderSources.slice(0, firstSources.length).sort()).to.deep.eq(firstSources.sort());
//                 expect(orderSources.slice(firstSources.length).sort()).to.deep.eq(secondSources.sort());
//             });
//
//             it('is able to create a order from LiquidityProvider', async () => {
//                 const liquidityProviderAddress = (DEFAULT_FILL_DATA[ERC20BridgeSource.LiquidityProvider] as any)
//                     .poolAddress;
//                 const rates: RatesBySource = {};
//                 rates[ERC20BridgeSource.LiquidityProvider] = [1, 1, 1, 1];
//                 MOCK_SAMPLER.liquidityProviderRegistry[liquidityProviderAddress] = {
//                     tokens: [MAKER_TOKEN, TAKER_TOKEN],
//                     gasCost: 0,
//                 };
//                 replaceSamplerOps({
//                     getLimitOrderFillableTakerAmounts: () => [constants.ZERO_AMOUNT],
//                     getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
//                 });
//
//                 const sampler = new MarketOperationUtils(MOCK_SAMPLER, contractAddresses, ORDER_DOMAIN);
//                 const ordersAndReport = await sampler.getOptimizerResultAsync(
//                     [
//                         {
//                             order: new LimitOrder({
//                                 makerToken: MAKER_TOKEN,
//                                 takerToken: TAKER_TOKEN,
//                             }),
//                             type: FillQuoteTransformerOrderType.Limit,
//                             signature: {} as any,
//                         },
//                     ],
//                     FILL_AMOUNT,
//                     MarketOperation.Sell,
//                     {
//                         includedSources: [ERC20BridgeSource.LiquidityProvider],
//                         excludedSources: [],
//                         numSamples: 4,
//                         bridgeSlippage: 0,
//                     },
//                 );
//                 const result = ordersAndReport.optimizedOrders;
//                 expect(result.length).to.eql(1);
//                 expect(
//                     (result[0] as OptimizedMarketBridgeOrder<LiquidityProviderFillData>).fillData.poolAddress,
//                 ).to.eql(liquidityProviderAddress);
//
//                 // // TODO (xianny): decode bridge data in v4 format
//                 // // tslint:disable-next-line:no-unnecessary-type-assertion
//                 // const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(
//                 //     result[0].makerAssetData,
//                 // ) as ERC20BridgeAssetData;
//                 // expect(decodedAssetData.assetProxyId).to.eql(AssetProxyId.ERC20Bridge);
//                 // expect(decodedAssetData.bridgeAddress).to.eql(liquidityProviderAddress);
//                 // expect(result[0].takerAmount).to.bignumber.eql(FILL_AMOUNT);
//             });
//
//             it('factors in exchange proxy gas overhead', async () => {
//                 // Uniswap has a slightly better rate than LiquidityProvider,
//                 // but LiquidityProvider is better accounting for the EP gas overhead.
//                 const rates: RatesBySource = {
//                     [ERC20BridgeSource.Native]: [0.01, 0.01, 0.01, 0.01],
//                     [ERC20BridgeSource.Uniswap]: [1, 1, 1, 1],
//                     [ERC20BridgeSource.LiquidityProvider]: [0.9999, 0.9999, 0.9999, 0.9999],
//                 };
//                 MOCK_SAMPLER.liquidityProviderRegistry[randomAddress()] = {
//                     tokens: [MAKER_TOKEN, TAKER_TOKEN],
//                     gasCost: 0,
//                 };
//                 replaceSamplerOps({
//                     getSellQuotes: createGetMultipleSellQuotesOperationFromRates(rates),
//                     getMedianSellRate: createGetMedianSellRate(ETH_TO_MAKER_RATE),
//                 });
//                 const optimizer = new MarketOperationUtils(MOCK_SAMPLER, contractAddresses, ORDER_DOMAIN);
//                 const gasPrice = 100e9; // 100 gwei
//                 const exchangeProxyOverhead = (sourceFlags: number) =>
//                     sourceFlags === SOURCE_FLAGS.LiquidityProvider
//                         ? constants.ZERO_AMOUNT
//                         : new BigNumber(1.3e5).times(gasPrice);
//                 const improvedOrdersResponse = await optimizer.getOptimizerResultAsync(
//                     createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     MarketOperation.Sell,
//                     {
//                         ...DEFAULT_OPTS,
//                         numSamples: 4,
//                         includedSources: [
//                             ERC20BridgeSource.Native,
//                             ERC20BridgeSource.Uniswap,
//                             ERC20BridgeSource.LiquidityProvider,
//                         ],
//                         excludedSources: [],
//                         exchangeProxyOverhead,
//                     },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [ERC20BridgeSource.LiquidityProvider];
//                 expect(orderSources).to.deep.eq(expectedSources);
//             });
//         });
//
//         describe('getMarketBuyOrdersAsync()', () => {
//             const FILL_AMOUNT = new BigNumber('100e18');
//             const ORDERS = createOrdersFromBuyRates(
//                 FILL_AMOUNT,
//                 _.times(NUM_SAMPLES, () => DEFAULT_RATES[ERC20BridgeSource.Native][0]),
//             );
//             const DEFAULT_OPTS: Partial<GetMarketOrdersOpts> = {
//                 numSamples: NUM_SAMPLES,
//                 sampleDistributionBase: 1,
//                 bridgeSlippage: 0,
//                 maxFallbackSlippage: 100,
//                 excludedSources: DEFAULT_EXCLUDED,
//                 allowFallback: false,
//                 gasSchedule: {},
//                 feeSchedule: {},
//             };
//
//             beforeEach(() => {
//                 replaceSamplerOps();
//             });
//
//             it('queries `numSamples` samples', async () => {
//                 const numSamples = _.random(1, 16);
//                 let actualNumSamples = 0;
//                 replaceSamplerOps({
//                     getBuyQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
//                         actualNumSamples = amounts.length;
//                         return DEFAULT_OPS.getBuyQuotes(
//                             sources,
//                             makerToken,
//                             takerToken,
//                             amounts,
//                             wethAddress,
//                             TOKEN_ADJACENCY_GRAPH,
//                         );
//                     },
//                 });
//                 await getMarketBuyOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
//                     ...DEFAULT_OPTS,
//                     numSamples,
//                 });
//                 expect(actualNumSamples).eq(numSamples);
//             });
//
//             it('polls all DEXes if `excludedSources` is empty', async () => {
//                 let sourcesPolled: ERC20BridgeSource[] = [];
//                 replaceSamplerOps({
//                     getBuyQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
//                         sourcesPolled = sourcesPolled.concat(sources.slice());
//                         return DEFAULT_OPS.getBuyQuotes(
//                             sources,
//                             makerToken,
//                             takerToken,
//                             amounts,
//                             wethAddress,
//                             TOKEN_ADJACENCY_GRAPH,
//                         );
//                     },
//                     getTwoHopBuyQuotes: (sources: ERC20BridgeSource[], ..._args: any[]) => {
//                         if (sources.length !== 0) {
//                             sourcesPolled.push(ERC20BridgeSource.MultiHop);
//                             sourcesPolled.push(...sources);
//                         }
//                         return DEFAULT_OPS.getTwoHopBuyQuotes(..._args);
//                     },
//                 });
//                 await getMarketBuyOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
//                     ...DEFAULT_OPTS,
//                     excludedSources: [],
//                 });
//                 expect(_.uniq(sourcesPolled).sort()).to.deep.equals(BUY_SOURCES.sort());
//             });
//
//             it('does not poll DEXes in `excludedSources`', async () => {
//                 const excludedSources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.Eth2Dai];
//                 let sourcesPolled: ERC20BridgeSource[] = [];
//                 replaceSamplerOps({
//                     getBuyQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
//                         sourcesPolled = sourcesPolled.concat(sources.slice());
//                         return DEFAULT_OPS.getBuyQuotes(
//                             sources,
//                             makerToken,
//                             takerToken,
//                             amounts,
//                             wethAddress,
//                             TOKEN_ADJACENCY_GRAPH,
//                         );
//                     },
//                     getTwoHopBuyQuotes: (sources: ERC20BridgeSource[], ..._args: any[]) => {
//                         if (sources.length !== 0) {
//                             sourcesPolled.push(ERC20BridgeSource.MultiHop);
//                             sourcesPolled.push(...sources);
//                         }
//                         return DEFAULT_OPS.getTwoHopBuyQuotes(..._args);
//                     },
//                 });
//                 await getMarketBuyOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
//                     ...DEFAULT_OPTS,
//                     excludedSources,
//                 });
//                 expect(_.uniq(sourcesPolled).sort()).to.deep.eq(_.without(BUY_SOURCES, ...excludedSources).sort());
//             });
//
//             it('only polls DEXes in `includedSources`', async () => {
//                 const includedSources = [ERC20BridgeSource.Uniswap, ERC20BridgeSource.Eth2Dai];
//                 let sourcesPolled: ERC20BridgeSource[] = [];
//                 replaceSamplerOps({
//                     getBuyQuotes: (sources, makerToken, takerToken, amounts, wethAddress) => {
//                         sourcesPolled = sourcesPolled.concat(sources.slice());
//                         return DEFAULT_OPS.getBuyQuotes(
//                             sources,
//                             makerToken,
//                             takerToken,
//                             amounts,
//                             wethAddress,
//                             TOKEN_ADJACENCY_GRAPH,
//                         );
//                     },
//                     getTwoHopBuyQuotes: (sources: ERC20BridgeSource[], ..._args: any[]) => {
//                         if (sources.length !== 0) {
//                             sourcesPolled.push(ERC20BridgeSource.MultiHop);
//                             sourcesPolled.push(...sources);
//                         }
//                         return DEFAULT_OPS.getTwoHopBuyQuotes(..._args);
//                     },
//                 });
//                 await getMarketBuyOrdersAsync(marketOperationUtils, ORDERS, FILL_AMOUNT, {
//                     ...DEFAULT_OPTS,
//                     excludedSources: [],
//                     includedSources,
//                 });
//                 expect(_.uniq(sourcesPolled).sort()).to.deep.eq(includedSources.sort());
//             });
//
//             // it('generates bridge orders with correct asset data', async () => {
//             //     const improvedOrdersResponse = await getMarketBuyOrdersAsync(
//             //         marketOperationUtils,
//             //         // Pass in empty orders to prevent native orders from being used.
//             //         ORDERS.map(o => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
//             //         FILL_AMOUNT,
//             //         DEFAULT_OPTS,
//             //     );
//             //     const improvedOrders = improvedOrdersResponse.optimizedOrders;
//             //     expect(improvedOrders).to.not.be.length(0);
//             //     for (const order of improvedOrders) {
//             //         expect(getSourceFromAssetData(order.makerAssetData)).to.exist('');
//             //         const makerAssetDataPrefix = hexUtils.slice(
//             //             assetDataUtils.encodeERC20BridgeAssetData(
//             //                 MAKER_TOKEN,
//             //                 constants.NULL_ADDRESS,
//             //                 constants.NULL_BYTES,
//             //             ),
//             //             0,
//             //             36,
//             //         );
//             //         assertSamePrefix(order.makerAssetData, makerAssetDataPrefix);
//             //         expect(order.takerAssetData).to.eq(TAKER_ASSET_DATA);
//             //     }
//             // });
//
//             it('generates bridge orders with correct maker amount', async () => {
//                 const improvedOrdersResponse = await getMarketBuyOrdersAsync(
//                     marketOperationUtils,
//                     // Pass in empty orders to prevent native orders from being used.
//                     ORDERS.map(o => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
//                     FILL_AMOUNT,
//                     DEFAULT_OPTS,
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const totalmakerAmount = BigNumber.sum(...improvedOrders.map(o => o.makerAmount));
//                 expect(totalmakerAmount).to.bignumber.gte(FILL_AMOUNT);
//             });
//
//             it('generates bridge orders with max slippage of `bridgeSlippage`', async () => {
//                 const bridgeSlippage = _.random(0.1, true);
//                 const improvedOrdersResponse = await getMarketBuyOrdersAsync(
//                     marketOperationUtils,
//                     // Pass in empty orders to prevent native orders from being used.
//                     ORDERS.map(o => ({ ...o, makerAmount: constants.ZERO_AMOUNT })),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, bridgeSlippage },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 expect(improvedOrders).to.not.be.length(0);
//                 for (const order of improvedOrders) {
//                     const expectedTakerAmount = order.fills[0].output;
//                     const slippage = order.takerAmount.div(expectedTakerAmount.plus(1)).minus(1);
//                     assertRoughlyEquals(slippage, bridgeSlippage, 1);
//                 }
//             });
//
//             it('can mix convex sources', async () => {
//                 const rates: RatesBySource = { ...ZERO_RATES };
//                 rates[ERC20BridgeSource.Native] = [0.4, 0.3, 0.2, 0.1];
//                 rates[ERC20BridgeSource.Uniswap] = [0.5, 0.05, 0.05, 0.05];
//                 rates[ERC20BridgeSource.Eth2Dai] = [0.6, 0.05, 0.05, 0.05];
//                 replaceSamplerOps({
//                     getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
//                 });
//                 const improvedOrdersResponse = await getMarketBuyOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4 },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [
//                     ERC20BridgeSource.Eth2Dai,
//                     ERC20BridgeSource.Uniswap,
//                     ERC20BridgeSource.Native,
//                     ERC20BridgeSource.Native,
//                 ];
//                 expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
//             });
//
//             const ETH_TO_TAKER_RATE = 1.5;
//
//             it('factors in fees for native orders', async () => {
//                 // Native orders will have the best rates but have fees,
//                 // dropping their effective rates.
//                 const nativeFeeRate = 0.06;
//                 const rates: RatesBySource = {
//                     ...ZERO_RATES,
//                     [ERC20BridgeSource.Native]: [1, 0.99, 0.98, 0.97], // Effectively [0.94, ~0.93, ~0.92, ~0.91]
//                     [ERC20BridgeSource.Uniswap]: [0.96, 0.1, 0.1, 0.1],
//                     [ERC20BridgeSource.Eth2Dai]: [0.95, 0.1, 0.1, 0.1],
//                     [ERC20BridgeSource.Kyber]: [0.1, 0.1, 0.1, 0.1],
//                 };
//                 const feeSchedule = {
//                     [ERC20BridgeSource.Native]: _.constant(
//                         FILL_AMOUNT.div(4)
//                             .times(nativeFeeRate)
//                             .dividedToIntegerBy(ETH_TO_TAKER_RATE),
//                     ),
//                 };
//                 replaceSamplerOps({
//                     getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
//                     getMedianSellRate: createGetMedianSellRate(ETH_TO_TAKER_RATE),
//                 });
//                 const improvedOrdersResponse = await getMarketBuyOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4, feeSchedule },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [
//                     ERC20BridgeSource.Uniswap,
//                     ERC20BridgeSource.Eth2Dai,
//                     ERC20BridgeSource.Native,
//                     ERC20BridgeSource.Native,
//                 ];
//                 expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
//             });
//
//             it('factors in fees for dexes', async () => {
//                 // Uniswap will have the best rates but will have fees,
//                 // dropping its effective rates.
//                 const uniswapFeeRate = 0.2;
//                 const rates: RatesBySource = {
//                     ...ZERO_RATES,
//                     [ERC20BridgeSource.Native]: [0.95, 0.1, 0.1, 0.1],
//                     // Effectively [0.8, ~0.5, ~0, ~0]
//                     [ERC20BridgeSource.Uniswap]: [1, 0.7, 0.2, 0.2],
//                     [ERC20BridgeSource.Eth2Dai]: [0.92, 0.1, 0.1, 0.1],
//                 };
//                 const feeSchedule = {
//                     [ERC20BridgeSource.Uniswap]: _.constant(
//                         FILL_AMOUNT.div(4)
//                             .times(uniswapFeeRate)
//                             .dividedToIntegerBy(ETH_TO_TAKER_RATE),
//                     ),
//                 };
//                 replaceSamplerOps({
//                     getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
//                     getMedianSellRate: createGetMedianSellRate(ETH_TO_TAKER_RATE),
//                 });
//                 const improvedOrdersResponse = await getMarketBuyOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4, feeSchedule },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [
//                     ERC20BridgeSource.Native,
//                     ERC20BridgeSource.Eth2Dai,
//                     ERC20BridgeSource.Uniswap,
//                 ];
//                 expect(orderSources.sort()).to.deep.eq(expectedSources.sort());
//             });
//
//             it('fallback orders use different sources', async () => {
//                 const rates: RatesBySource = { ...ZERO_RATES };
//                 rates[ERC20BridgeSource.Native] = [0.9, 0.8, 0.5, 0.5];
//                 rates[ERC20BridgeSource.Uniswap] = [0.6, 0.05, 0.01, 0.01];
//                 rates[ERC20BridgeSource.Eth2Dai] = [0.4, 0.3, 0.01, 0.01];
//                 replaceSamplerOps({
//                     getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
//                 });
//                 const improvedOrdersResponse = await getMarketBuyOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4, allowFallback: true },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const firstSources = orderSources.slice(0, 4);
//                 const secondSources = orderSources.slice(4);
//                 expect(_.intersection(firstSources, secondSources)).to.be.length(0);
//             });
//
//             it('does not create a fallback if below maxFallbackSlippage', async () => {
//                 const rates: RatesBySource = { ...ZERO_RATES };
//                 rates[ERC20BridgeSource.Native] = [1, 1, 0.01, 0.01];
//                 rates[ERC20BridgeSource.Uniswap] = [1, 1, 0.01, 0.01];
//                 rates[ERC20BridgeSource.Eth2Dai] = [0.49, 0.49, 0.49, 0.49];
//                 replaceSamplerOps({
//                     getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
//                 });
//                 const improvedOrdersResponse = await getMarketBuyOrdersAsync(
//                     marketOperationUtils,
//                     createOrdersFromBuyRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     { ...DEFAULT_OPTS, numSamples: 4, allowFallback: true, maxFallbackSlippage: 0.25 },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const firstSources = [ERC20BridgeSource.Native, ERC20BridgeSource.Native, ERC20BridgeSource.Uniswap];
//                 const secondSources: ERC20BridgeSource[] = [];
//                 expect(orderSources.slice(0, firstSources.length).sort()).to.deep.eq(firstSources.sort());
//                 expect(orderSources.slice(firstSources.length).sort()).to.deep.eq(secondSources.sort());
//             });
//
//             it('factors in exchange proxy gas overhead', async () => {
//                 // Uniswap has a slightly better rate than LiquidityProvider,
//                 // but LiquidityProvider is better accounting for the EP gas overhead.
//                 const rates: RatesBySource = {
//                     [ERC20BridgeSource.Native]: [0.01, 0.01, 0.01, 0.01],
//                     [ERC20BridgeSource.Uniswap]: [1, 1, 1, 1],
//                     [ERC20BridgeSource.LiquidityProvider]: [0.9999, 0.9999, 0.9999, 0.9999],
//                 };
//                 MOCK_SAMPLER.liquidityProviderRegistry[randomAddress()] = {
//                     tokens: [MAKER_TOKEN, TAKER_TOKEN],
//                     gasCost: 0,
//                 };
//                 replaceSamplerOps({
//                     getBuyQuotes: createGetMultipleBuyQuotesOperationFromRates(rates),
//                     getMedianSellRate: createGetMedianSellRate(ETH_TO_TAKER_RATE),
//                 });
//                 const optimizer = new MarketOperationUtils(MOCK_SAMPLER, contractAddresses, ORDER_DOMAIN);
//                 const gasPrice = 100e9; // 100 gwei
//                 const exchangeProxyOverhead = (sourceFlags: number) =>
//                     sourceFlags === SOURCE_FLAGS.LiquidityProvider
//                         ? constants.ZERO_AMOUNT
//                         : new BigNumber(1.3e5).times(gasPrice);
//                 const improvedOrdersResponse = await optimizer.getOptimizerResultAsync(
//                     createOrdersFromSellRates(FILL_AMOUNT, rates[ERC20BridgeSource.Native]),
//                     FILL_AMOUNT,
//                     MarketOperation.Buy,
//                     {
//                         ...DEFAULT_OPTS,
//                         numSamples: 4,
//                         includedSources: [
//                             ERC20BridgeSource.Native,
//                             ERC20BridgeSource.Uniswap,
//                             ERC20BridgeSource.LiquidityProvider,
//                         ],
//                         excludedSources: [],
//                         exchangeProxyOverhead,
//                     },
//                 );
//                 const improvedOrders = improvedOrdersResponse.optimizedOrders;
//                 const orderSources = improvedOrders.map(o => o.fills[0].source);
//                 const expectedSources = [ERC20BridgeSource.LiquidityProvider];
//                 expect(orderSources).to.deep.eq(expectedSources);
//             });
//         });
//     });
//
//     describe('createFills', () => {
//         const takerAmount = new BigNumber(5000000);
//         const outputAmountPerEth = new BigNumber(0.5);
//         // tslint:disable-next-line:no-object-literal-type-assertion
//         const smallOrder: NativeOrderWithFillableAmounts = {
//             order: {
//                 ...new LimitOrder({
//                     chainId: 1,
//                     maker: 'SMALL_ORDER',
//                     takerAmount,
//                     makerAmount: takerAmount.times(2),
//                 }),
//             },
//             fillableMakerAmount: takerAmount.times(2),
//             fillableTakerAmount: takerAmount,
//             fillableTakerFeeAmount: new BigNumber(0),
//             type: FillQuoteTransformerOrderType.Limit,
//             signature: SIGNATURE,
//         };
//         const largeOrder: NativeOrderWithFillableAmounts = {
//             order: {
//                 ...new LimitOrder({
//                     chainId: 1,
//                     maker: 'LARGE_ORDER',
//                     takerAmount: smallOrder.order.takerAmount.times(2),
//                     makerAmount: smallOrder.order.makerAmount.times(2),
//                 }),
//             },
//             fillableTakerAmount: smallOrder.fillableTakerAmount.times(2),
//             fillableMakerAmount: smallOrder.fillableMakerAmount.times(2),
//             fillableTakerFeeAmount: new BigNumber(0),
//             type: FillQuoteTransformerOrderType.Limit,
//             signature: SIGNATURE,
//         };
//         const orders = [smallOrder, largeOrder];
//         const feeSchedule = {
//             [ERC20BridgeSource.Native]: _.constant(2e5),
//         };
//
//         it('penalizes native fill based on target amount when target is smaller', () => {
//             const path = createFills({
//                 side: MarketOperation.Sell,
//                 orders,
//                 dexQuotes: [],
//                 targetInput: takerAmount.minus(1),
//                 outputAmountPerEth,
//                 feeSchedule,
//             });
//             expect((path[0][0].fillData as NativeFillData).order.maker).to.eq(smallOrder.order.maker);
//             expect(path[0][0].input).to.be.bignumber.eq(takerAmount.minus(1));
//         });
//
//         it('penalizes native fill based on available amount when target is larger', () => {
//             const path = createFills({
//                 side: MarketOperation.Sell,
//                 orders,
//                 dexQuotes: [],
//                 targetInput: POSITIVE_INF,
//                 outputAmountPerEth,
//                 feeSchedule,
//             });
//             expect((path[0][0].fillData as NativeFillData).order.maker).to.eq(largeOrder.order.maker);
//             expect((path[0][1].fillData as NativeFillData).order.maker).to.eq(smallOrder.order.maker);
//         });
//     });
// });
// // tslint:disable-next-line: max-file-line-count
