import { ERC20BridgeSource } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import 'mocha';

import { ZERO } from '../src/constants';
import { marketDepthUtils } from '../src/utils/market_depth_utils';

const B = (v: number | string) => new BigNumber(v);

// tslint:disable:custom-no-magic-numbers

const SUITE_NAME = 'market depth utils';
describe(SUITE_NAME, () => {
    describe('getBucketPrices', () => {
        it('returns a range from start to end', async () => {
            const start = B('1');
            const end = B('123');
            const num = 10;
            const range = marketDepthUtils.getBucketPrices(start, end, num);
            expect(range[0]).to.be.bignumber.eq('1');
            expect(range[10]).to.be.bignumber.eq('123');
            expect(range.length).to.be.eq(11);
        });
        it('can go from high to low', async () => {
            const start = B('123');
            const end = B('1');
            const num = 10;
            const range = marketDepthUtils.getBucketPrices(start, end, num);
            expect(range[0]).to.be.bignumber.eq('123');
            expect(range[10]).to.be.bignumber.eq('1');
            expect(range.length).to.be.eq(11);
        });
    });
    describe('getSampleAmountsFromDepthSide', () => {
        it('plucks out the input sample amounts', async () => {
            const defaultSample = { output: B(10), source: ERC20BridgeSource.Uniswap };
            const sampleAmounts = marketDepthUtils.getSampleAmountsFromDepthSide([
                [
                    { ...defaultSample, input: B(1) },
                    { ...defaultSample, input: B(2) },
                ],
            ]);
            expect(sampleAmounts).to.deep.include(B(1));
            expect(sampleAmounts).to.deep.include(B(2));
        });
        it('ignores Native results if they are present', async () => {
            const defaultSample = { output: B(10), source: ERC20BridgeSource.Uniswap };
            const nativeSample = { output: B(10), source: ERC20BridgeSource.Native };
            const sampleAmounts = marketDepthUtils.getSampleAmountsFromDepthSide([
                [{ ...defaultSample, input: B(1) }],
                [
                    { ...nativeSample, input: B(1) },
                    { ...nativeSample, input: B(2) },
                ],
            ]);
            expect(sampleAmounts).to.deep.include(B(1));
            expect(sampleAmounts).to.not.deep.include(B(2));
        });
        it('plucks Native results if it has to', async () => {
            const nativeSample = { output: B(10), source: ERC20BridgeSource.Native };
            const sampleAmounts = marketDepthUtils.getSampleAmountsFromDepthSide([
                [
                    { ...nativeSample, input: B(1) },
                    { ...nativeSample, input: B(2) },
                ],
            ]);
            expect(sampleAmounts).to.deep.include(B(1));
            expect(sampleAmounts).to.deep.include(B(2));
        });
    });
    describe('sampleNativeOrders', () => {
        it('can partially fill a sample amount', async () => {
            const nativePath = [{ input: B(100), output: B(200), source: ERC20BridgeSource.Native }];
            const output = marketDepthUtils.sampleNativeOrders(nativePath, B(10), MarketOperation.Sell);
            expect(output).to.be.bignumber.eq(B(20));
        });
        it('returns zero if it cannot fully fill the amount', async () => {
            const nativePath = [{ input: B(100), output: B(200), source: ERC20BridgeSource.Native }];
            const output = marketDepthUtils.sampleNativeOrders(nativePath, B(101), MarketOperation.Sell);
            expect(output).to.be.bignumber.eq(ZERO);
        });
        it('runs across multiple orders', async () => {
            const nativePath = [
                { input: B(50), output: B(200), source: ERC20BridgeSource.Native },
                { input: B(50), output: B(50), source: ERC20BridgeSource.Native },
            ];
            const output = marketDepthUtils.sampleNativeOrders(nativePath, B(100), MarketOperation.Sell);
            expect(output).to.be.bignumber.eq(B(250));
        });
    });
    describe('normalizeMarketDepthToSampleOutput', () => {
        it('converts raw orders into samples for Native', async () => {
            const nativePath = [
                { input: B(50), output: B(200), source: ERC20BridgeSource.Native },
                { input: B(50), output: B(50), source: ERC20BridgeSource.Native },
            ];
            const uniPath = [
                { input: B(1), output: B(10), source: ERC20BridgeSource.Uniswap },
                { input: B(2), output: B(20), source: ERC20BridgeSource.Uniswap },
            ];
            const results = marketDepthUtils.normalizeMarketDepthToSampleOutput(
                [uniPath, nativePath],
                MarketOperation.Sell,
            );
            expect(results).to.deep.include(uniPath);
            expect(results).to.deep.include([
                { input: B(1), output: B(4), source: ERC20BridgeSource.Native },
                { input: B(2), output: B(8), source: ERC20BridgeSource.Native },
            ]);
        });
    });
    describe('calculateStartEndBucketPrice', () => {
        const nativePath = [
            { input: B(1), output: B(4), source: ERC20BridgeSource.Native },
            { input: B(2), output: B(8), source: ERC20BridgeSource.Native },
        ];
        const uniPath = [
            { input: B(1), output: B(10), source: ERC20BridgeSource.Uniswap },
            { input: B(2), output: B(20), source: ERC20BridgeSource.Uniswap },
        ];
        describe('sell', () => {
            it('starts at the best (highest) price and ends perc lower', async () => {
                const [start, end] = marketDepthUtils.calculateStartEndBucketPrice(
                    [nativePath, uniPath],
                    MarketOperation.Sell,
                    20,
                );
                // Best price is the uniswap 1 for 10
                expect(start).to.be.bignumber.eq(B(10));
                expect(end).to.be.bignumber.eq(start.times(0.8));
            });
        });
        describe('buy', () => {
            it('starts at the best (lowest) price and ends perc higher', async () => {
                const [start, end] = marketDepthUtils.calculateStartEndBucketPrice(
                    [nativePath, uniPath],
                    MarketOperation.Buy,
                    20,
                );
                // Best price is the native 4 to receive 1
                expect(start).to.be.bignumber.eq(B(4));
                expect(end).to.be.bignumber.eq(start.times(1.2));
            });
        });
    });
    describe('distributeSamplesToBuckets', () => {
        const nativePath = [
            { input: B(1), output: B(4), source: ERC20BridgeSource.Native },
            { input: B(2), output: B(8), source: ERC20BridgeSource.Native },
        ];
        const uniPath = [
            { input: B(1), output: B(10), source: ERC20BridgeSource.Uniswap },
            { input: B(2), output: B(20), source: ERC20BridgeSource.Uniswap },
        ];
        describe('sell', () => {
            it('allocates the samples to the right bucket by price', async () => {
                const buckets = [B(10), B(8), B(4), B(1)];
                const allocated = marketDepthUtils.distributeSamplesToBuckets(
                    [nativePath, uniPath],
                    buckets,
                    MarketOperation.Sell,
                );
                const [first, second, third, fourth] = allocated;
                expect(first.cumulative).to.be.bignumber.eq(2);
                expect(first.bucketTotal).to.be.bignumber.eq(2);
                expect(first.bucket).to.be.eq(0);
                expect(first.price).to.be.bignumber.eq(10);
                expect(first.sources[ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);

                expect(second.cumulative).to.be.bignumber.eq(2);
                expect(second.bucketTotal).to.be.bignumber.eq(0);
                expect(second.bucket).to.be.eq(1);
                expect(second.price).to.be.bignumber.eq(8);
                expect(second.sources[ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);

                expect(third.cumulative).to.be.bignumber.eq(4);
                expect(third.bucketTotal).to.be.bignumber.eq(2);
                expect(third.bucket).to.be.eq(2);
                expect(third.price).to.be.bignumber.eq(4);
                expect(third.sources[ERC20BridgeSource.Native]).to.be.bignumber.eq(2);
                expect(third.sources[ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);

                expect(fourth.cumulative).to.be.bignumber.eq(4);
                expect(fourth.bucketTotal).to.be.bignumber.eq(0);
                expect(fourth.bucket).to.be.eq(3);
                expect(fourth.price).to.be.bignumber.eq(1);
                expect(fourth.sources[ERC20BridgeSource.Native]).to.be.bignumber.eq(2);
                expect(fourth.sources[ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);
            });
            it('does not allocate to a bucket if there is none available', async () => {
                const buckets = [B(10)];
                const badSource = [{ input: B(1), output: B(5), source: ERC20BridgeSource.Uniswap }];
                const allocated = marketDepthUtils.distributeSamplesToBuckets(
                    [badSource],
                    buckets,
                    MarketOperation.Sell,
                );
                const [first] = allocated;
                expect(first.cumulative).to.be.bignumber.eq(0);
                expect(first.bucketTotal).to.be.bignumber.eq(0);
                expect(first.bucket).to.be.eq(0);
                expect(first.price).to.be.bignumber.eq(10);
                expect(first.sources[ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(0);
            });
        });
        describe('buy', () => {
            it('allocates the samples to the right bucket by price', async () => {
                const buckets = [B(1), B(4), B(10)];
                const allocated = marketDepthUtils.distributeSamplesToBuckets(
                    [nativePath, uniPath],
                    buckets,
                    MarketOperation.Buy,
                );
                const [first, second, third] = allocated;
                expect(first.cumulative).to.be.bignumber.eq(0);
                expect(first.bucketTotal).to.be.bignumber.eq(0);
                expect(first.bucket).to.be.eq(0);
                expect(first.price).to.be.bignumber.eq(1);

                expect(second.cumulative).to.be.bignumber.eq(2);
                expect(second.bucketTotal).to.be.bignumber.eq(2);
                expect(second.bucket).to.be.eq(1);
                expect(second.price).to.be.bignumber.eq(4);
                expect(second.sources[ERC20BridgeSource.Native]).to.be.bignumber.eq(2);

                expect(third.cumulative).to.be.bignumber.eq(4);
                expect(third.bucketTotal).to.be.bignumber.eq(2);
                expect(third.bucket).to.be.eq(2);
                expect(third.price).to.be.bignumber.eq(10);
                expect(third.sources[ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);
                expect(third.sources[ERC20BridgeSource.Native]).to.be.bignumber.eq(2);
            });
        });
    });
    describe('calculateDepthForSide', () => {
        // Essentially orders not samples
        const nativePath = [{ input: B(10), output: B(80), source: ERC20BridgeSource.Native }];
        it('calculates prices and allocates into buckets. Partial 0x', async () => {
            const dexPaths = [
                [
                    { input: B(1), output: B(10), source: ERC20BridgeSource.Uniswap },
                    { input: B(2), output: B(11), source: ERC20BridgeSource.Uniswap },
                ],
                [
                    { input: B(1), output: B(0), source: ERC20BridgeSource.Curve },
                    { input: B(2), output: B(0), source: ERC20BridgeSource.Curve },
                ],
            ];
            const result = marketDepthUtils.calculateDepthForSide(
                [nativePath, ...dexPaths],
                MarketOperation.Sell,
                4, // buckets
                1, // distribution
                20, // max end perc
            );
            const emptySources: { [key: string]: BigNumber } = {};
            Object.values(ERC20BridgeSource).forEach(s => (emptySources[s] = ZERO));
            expect(result).to.be.deep.eq([
                {
                    price: B(10),
                    bucket: 0,
                    bucketTotal: B(1),
                    cumulative: B(1),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1) },
                },
                {
                    price: B(9.5),
                    bucket: 1,
                    bucketTotal: ZERO,
                    cumulative: B(1),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1) },
                },
                {
                    price: B(9),
                    bucket: 2,
                    bucketTotal: ZERO,
                    cumulative: B(1),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1) },
                },
                {
                    price: B(8.5),
                    bucket: 3,
                    bucketTotal: ZERO,
                    cumulative: B(1),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1) },
                },
                // Native is the sample for the sample for 2 (overriding the 1 sample), since we didn't sample for 10 it does
                // not contain the entire order
                {
                    price: B(8),
                    bucket: 4,
                    bucketTotal: B(2),
                    cumulative: B(3),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1), [ERC20BridgeSource.Native]: B(2) },
                },
            ]);
        });

        it('calculates prices and allocates into buckets. Partial Uni', async () => {
            const dexPaths = [
                [
                    { input: B(1), output: B(10), source: ERC20BridgeSource.Uniswap },
                    { input: B(2), output: B(11), source: ERC20BridgeSource.Uniswap },
                    { input: B(10), output: B(0), source: ERC20BridgeSource.Uniswap },
                ],
                [
                    { input: B(1), output: B(0), source: ERC20BridgeSource.Curve },
                    { input: B(2), output: B(0), source: ERC20BridgeSource.Curve },
                    { input: B(10), output: B(0), source: ERC20BridgeSource.Curve },
                ],
            ];
            const result = marketDepthUtils.calculateDepthForSide(
                [nativePath, ...dexPaths],
                MarketOperation.Sell,
                4, // buckets
                1, // distribution
                20, // max end perc
            );
            const emptySources: { [key: string]: BigNumber } = {};
            Object.values(ERC20BridgeSource).forEach(s => (emptySources[s] = ZERO));
            expect(result).to.be.deep.eq([
                {
                    price: B(10),
                    bucket: 0,
                    bucketTotal: B(1),
                    cumulative: B(1),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1) },
                },
                {
                    price: B(9.5),
                    bucket: 1,
                    bucketTotal: ZERO,
                    cumulative: B(1),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1) },
                },
                {
                    price: B(9),
                    bucket: 2,
                    bucketTotal: ZERO,
                    cumulative: B(1),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1) },
                },
                {
                    price: B(8.5),
                    bucket: 3,
                    bucketTotal: ZERO,
                    cumulative: B(1),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1) },
                },
                {
                    price: B(8),
                    bucket: 4,
                    bucketTotal: B(10),
                    cumulative: B(11),
                    sources: { ...emptySources, [ERC20BridgeSource.Uniswap]: B(1), [ERC20BridgeSource.Native]: B(10) },
                },
            ]);
        });
    });
});
