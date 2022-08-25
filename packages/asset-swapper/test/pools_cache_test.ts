import { ChainId } from '@0x/contract-addresses';
import * as chai from 'chai';
import 'mocha';

import { BalancerPoolsCache, BalancerV2PoolsCache, PoolsCache } from '../src/utils/market_operation_utils/pools_cache';

import { chaiSetup } from './utils/chai_setup';

chaiSetup.configure();
const expect = chai.expect;

const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
const wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

const timeoutMs = 5000;
const poolKeys: string[] = ['id', 'balanceIn', 'balanceOut', 'weightIn', 'weightOut', 'swapFee'];

describe('Pools Caches for Balancer-based sampling', () => {
    async function fetchAndAssertPoolsAsync(cache: PoolsCache, takerToken: string, makerToken: string): Promise<void> {
        const pools = await cache.getFreshPoolsForPairAsync(takerToken, makerToken, timeoutMs);
        expect(pools.length).greaterThan(0, `Failed to find any pools for ${takerToken} and ${makerToken}`);
        expect(pools[0]).not.undefined();
        expect(Object.keys(pools[0])).to.include.members(poolKeys);
        const cachedPoolIds = cache.getPoolAddressesForPair(takerToken, makerToken);
        expect(cachedPoolIds).to.deep.equal(pools.map(p => p.id));
    }

    describe('BalancerPoolsCache', () => {
        const cache = BalancerPoolsCache.create(ChainId.Mainnet);
        it('fetches pools', async () => {
            const pairs = [
                [usdcAddress, daiAddress],
                [usdcAddress, wethAddress],
                [daiAddress, wethAddress],
            ];
            await Promise.all(
                pairs.map(async ([takerToken, makerToken]) => fetchAndAssertPoolsAsync(cache, takerToken, makerToken)),
            );
        });
    });

    describe('BalancerV2PoolsCache', () => {
        it('fetches pools (Beethoven X - Fantom)', async () => {
            const cache = BalancerV2PoolsCache.createBeethovenXPoolCache(ChainId.Fantom);
            const wftmAddress = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83';
            const beetsAddress = '0xf24bcf4d1e507740041c9cfd2dddb29585adce1e';
            const fantomWethAddress = '0x74b23882a30290451a17c44f4f05243b6b58c76d';

            const pairs = [
                [wftmAddress, beetsAddress],
                [wftmAddress, fantomWethAddress],
            ];

            await Promise.all(
                pairs.map(async ([takerToken, makerToken]) => fetchAndAssertPoolsAsync(cache, takerToken, makerToken)),
            );
        });
    });
});
