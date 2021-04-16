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

const wethAddressKovan = '0x02822e968856186a20fec2c824d4b174d0b70502';
const balAddressKovan = '0x41286bb1d3e870f3f750eb7e1c25d7e48c8a1ac7';
const usdcAddressKovan = '0xc2569dd7d0fd715b054fbf16e75b001e5c0c1115';

const usdcAddress = '0x15f713a15d311db8aff4d08590b75c7016ea9917';
const daiAddress = '0x1528f3fcc26d13f7079325fb78d9442607781c8c';
const wethAddress = '0xd52af87dea6cec4f2cc0cf480bcee439d2b848fc';

const timeoutMs = 5000;
const poolKeys: string[] = ['id', 'balanceIn', 'balanceOut', 'weightIn', 'weightOut', 'swapFee'];

describe('Pools Caches for Balancer-based sampling', () => {
    async function fetchAndAssertPoolsAsync(cache: PoolsCache, takerToken: string, makerToken: string): Promise<void> {
        const pools = await cache.getFreshPoolsForPairAsync(takerToken, makerToken, timeoutMs);
        expect(pools.length).greaterThan(0, `Failed to find any pools for ${takerToken} and ${makerToken}`);
        expect(pools[0]).not.undefined();
        expect(Object.keys(pools[0])).to.include.members(poolKeys);
    }

    describe.skip('BalancerPoolsCache', () => {
        const cache = new BalancerPoolsCache();
        it('fetches pools', async () => {
            const pairs = [[usdcAddress, daiAddress], [usdcAddress, wethAddress], [daiAddress, wethAddress]];
            await Promise.all(
                // tslint:disable-next-line:promise-function-async
                pairs.map(([takerToken, makerToken]) => fetchAndAssertPoolsAsync(cache, takerToken, makerToken)),
            );
        });
    });

    // TODO: switch to mainnet addresses
    describe('BalancerV2PoolsCache', () => {
        const cache = new BalancerV2PoolsCache(
            'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-kovan-v2',
        );
        it('fetches pools', async () => {
            const pairs = [[wethAddressKovan, balAddressKovan], [wethAddressKovan, usdcAddressKovan]];
            await Promise.all(
                // tslint:disable-next-line:promise-function-async
                pairs.map(([takerToken, makerToken]) => fetchAndAssertPoolsAsync(cache, takerToken, makerToken)),
            );
        });
    });

    describe.skip('CreamPoolsCache', () => {
        const cache = new CreamPoolsCache();
        it('fetches pools', async () => {
            const pairs = [[usdcAddress, daiAddress], [usdcAddress, wethAddress], [daiAddress, wethAddress]];
            await Promise.all(
                // tslint:disable-next-line:promise-function-async
                pairs.map(([takerToken, makerToken]) => fetchAndAssertPoolsAsync(cache, takerToken, makerToken)),
            );
        });
    });
});
