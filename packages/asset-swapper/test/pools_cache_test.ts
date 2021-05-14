import * as chai from 'chai';
import 'mocha';

import {
    BalancerPoolsCache,
    BalancerV2PoolsCache,
    CreamPoolsCache,
    PoolsCache,
} from '../src/utils/market_operation_utils/pools_cache';

import { chaiSetup } from './utils/chai_setup';

chaiSetup.configure();
const expect = chai.expect;

const usdcAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
const wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const wbtcAddress = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const balAddress = '0xba100000625a3754423978a60c9317c58a424e3d';
const creamAddress = '0x2ba592f78db6436527729929aaf6c908497cb200';

const timeoutMs = 5000;
const poolKeys: string[] = ['id', 'balanceIn', 'balanceOut', 'weightIn', 'weightOut', 'swapFee'];

describe('Pools Caches for Balancer-based sampling', () => {
    async function fetchAndAssertPoolsAsync(cache: PoolsCache, takerToken: string, makerToken: string): Promise<void> {
        const pools = await cache.getFreshPoolsForPairAsync(takerToken, makerToken, timeoutMs);
        expect(pools.length).greaterThan(0, `Failed to find any pools for ${takerToken} and ${makerToken}`);
        expect(pools[0]).not.undefined();
        expect(Object.keys(pools[0])).to.include.members(poolKeys);
        const cachedPoolIds = cache.getCachedPoolAddressesForPair(takerToken, makerToken);
        expect(cachedPoolIds).to.deep.equal(pools.map(p => p.id));
    }

    describe('BalancerPoolsCache', () => {
        const cache = new BalancerPoolsCache();
        it('fetches pools', async () => {
            const pairs = [
                [usdcAddress, daiAddress],
                [usdcAddress, wethAddress],
                [daiAddress, wethAddress],
            ];
            await Promise.all(
                // tslint:disable-next-line:promise-function-async
                pairs.map(([takerToken, makerToken]) => fetchAndAssertPoolsAsync(cache, takerToken, makerToken)),
            );
        });
    });

    describe('BalancerV2PoolsCache', () => {
        const cache = new BalancerV2PoolsCache();
        it('fetches pools', async () => {
            const pairs = [
                [wethAddress, wbtcAddress],
                [wethAddress, balAddress],
            ];
            await Promise.all(
                // tslint:disable-next-line:promise-function-async
                pairs.map(([takerToken, makerToken]) => fetchAndAssertPoolsAsync(cache, takerToken, makerToken)),
            );
        });
    });

    describe('CreamPoolsCache', () => {
        const cache = new CreamPoolsCache();
        it('fetches pools', async () => {
            const pairs = [
                [usdcAddress, creamAddress],
                [creamAddress, wethAddress],
            ];
            await Promise.all(
                // tslint:disable-next-line:promise-function-async
                pairs.map(([takerToken, makerToken]) => fetchAndAssertPoolsAsync(cache, takerToken, makerToken)),
            );
        });
    });
});
