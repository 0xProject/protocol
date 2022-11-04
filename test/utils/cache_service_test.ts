import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import Redis from 'ioredis';

import { ONE_MINUTE_MS } from '../../src/constants';
import { ERC20Owner } from '../../src/types';
import { CacheClient } from '../../src/utils/cache_client';
import { setupDependenciesAsync, TeardownDependenciesFunctionHandle } from '../test_utils/deployment';

jest.setTimeout(ONE_MINUTE_MS * 2);
let teardownDependencies: TeardownDependenciesFunctionHandle;

describe('CacheClient', () => {
    let redis: Redis;
    let cacheClient: CacheClient;

    const chainId = ChainId.Ganache;

    const makerA = '0x1111111111111111111111111111111111111111';
    const makerB = '0x2222222222222222222222222222222222222222';
    const makerC = '0x3333333333333333333333333333333333333333';

    const tokenA = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const tokenB = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const tokenC = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // compareFn is used to determine the order of ERC20Owner elements
    const compareFn = (a: ERC20Owner, b: ERC20Owner) => a.owner.localeCompare(b.owner);

    beforeAll(async () => {
        teardownDependencies = await setupDependenciesAsync(['redis']);
        redis = new Redis();
        cacheClient = new CacheClient(redis);
    });

    afterAll(async () => {
        await cacheClient.closeAsync();
        if (!teardownDependencies()) {
            throw new Error('Failed to tear down dependencies');
        }
    });

    afterEach(async () => {
        await redis.flushdb();
    });

    describe('addERC20OwnerAsync', () => {
        it('adds pending address to observed addresses without error', async () => {
            expect(cacheClient.addERC20OwnerAsync(chainId, { owner: makerA, token: tokenA })).to.eventually.be.equal(
                void 0,
            );
        });
    });

    describe('getERC20OwnersAsync', () => {
        const addresses = [
            { owner: makerA, token: tokenA },
            { owner: makerB, token: tokenB },
            { owner: makerC, token: tokenC },
        ];

        it('fetches maker token addresses in correct format', async () => {
            addresses.forEach(async (address) => {
                await cacheClient.addERC20OwnerAsync(chainId, address);
            });
            const cachedAddresses = await cacheClient.getERC20OwnersAsync(chainId);
            expect(cachedAddresses.sort(compareFn)).to.deep.eq(addresses.sort(compareFn));
        });

        it('fetches empty arrays if no addresses are found in the set', async () => {
            expect(await cacheClient.getERC20OwnersAsync(chainId)).to.deep.eq([]);
        });
    });

    describe('setERC20OwnerBalancesAsync', () => {
        const addresses = [
            { owner: makerA, token: tokenA },
            { owner: makerB, token: tokenB },
            { owner: makerC, token: tokenC },
        ];
        const balances = [new BigNumber(1), new BigNumber(2), new BigNumber(3)];

        it('sets balances in the cache without error', async () => {
            expect(cacheClient.setERC20OwnerBalancesAsync(chainId, addresses, balances)).to.eventually.be.equal(void 0);
        });

        it('should fail when addresses do not match balances', async () => {
            expect(
                cacheClient.setERC20OwnerBalancesAsync(chainId, addresses, balances.slice(0, -1)),
            ).to.be.rejectedWith('balances');
        });

        it('should not fail when addresses are empty', async () => {
            expect(cacheClient.setERC20OwnerBalancesAsync(chainId, [], [])).to.eventually.be.equal(void 0);
        });
    });

    describe('getERC20OwnerBalancesAsync', () => {
        const addresses = [
            { owner: makerA, token: tokenA },
            { owner: makerB, token: tokenB },
            { owner: makerC, token: tokenC },
        ];
        const balances = [new BigNumber(1), new BigNumber(2), new BigNumber(3)];

        beforeEach(async () => {
            await cacheClient.setERC20OwnerBalancesAsync(chainId, addresses, balances);
        });

        it('fetches correct balances from the cache', async () => {
            expect(await cacheClient.getERC20OwnerBalancesAsync(chainId, addresses)).to.deep.eq([
                new BigNumber(1),
                new BigNumber(2),
                new BigNumber(3),
            ]);
        });

        it('returns null balances if addresses are not in the cache', async () => {
            const badAddresses = [
                { owner: makerA, token: tokenA },
                { owner: makerB, token: tokenB },
                { owner: '0x0000000000000000000000000000000000000000', token: tokenC },
            ];
            expect(await cacheClient.getERC20OwnerBalancesAsync(chainId, badAddresses)).to.deep.eq([
                new BigNumber(1),
                new BigNumber(2),
                null,
            ]);
        });

        it('returns null balances if addresses from a different chain are supplied', async () => {
            expect(await cacheClient.getERC20OwnerBalancesAsync(ChainId.Ropsten, addresses)).to.deep.eq([
                null,
                null,
                null,
            ]);
        });

        it('returns an empty array if addresses are empty', async () => {
            expect(await cacheClient.getERC20OwnerBalancesAsync(chainId, [])).to.deep.eq([]);
        });
    });

    describe('evictZeroBalancesAsync', () => {
        const addresses = [
            { owner: makerA, token: tokenA },
            { owner: makerB, token: tokenB },
            { owner: makerC, token: tokenC },
        ];

        it('evicts zeroed entries from the cache', async () => {
            addresses.forEach(async (address) => {
                await cacheClient.addERC20OwnerAsync(chainId, address);
            });
            let cachedAddresses = await cacheClient.getERC20OwnersAsync(chainId);
            expect(cachedAddresses.sort(compareFn)).to.deep.eq(addresses.sort(compareFn));

            const balances = [new BigNumber(1), new BigNumber(2), new BigNumber(0)];
            await cacheClient.setERC20OwnerBalancesAsync(chainId, addresses, balances);

            const numEvicted = await cacheClient.evictZeroBalancesAsync(chainId);
            expect(numEvicted).to.eq(1);
            cachedAddresses = await cacheClient.getERC20OwnersAsync(chainId);
            expect(cachedAddresses.sort(compareFn)).to.deep.eq(addresses.slice(0, 2).sort(compareFn));
        });

        it('does not evict any entries if there are no stale balances', async () => {
            addresses.forEach(async (address) => {
                await cacheClient.addERC20OwnerAsync(chainId, address);
            });
            let cachedAddresses = await cacheClient.getERC20OwnersAsync(chainId);
            expect(cachedAddresses.sort(compareFn)).to.deep.eq(addresses.sort(compareFn));

            const balances = [new BigNumber(1), new BigNumber(2), new BigNumber(3)];
            await cacheClient.setERC20OwnerBalancesAsync(chainId, addresses, balances);

            const numEvicted = await cacheClient.evictZeroBalancesAsync(chainId);
            expect(numEvicted).to.eq(0);
            cachedAddresses = await cacheClient.getERC20OwnersAsync(chainId);
            expect(cachedAddresses.sort(compareFn)).to.deep.eq(addresses.sort(compareFn));
        });

        it('does not error if the address set is empty', async () => {
            expect(await cacheClient.getERC20OwnersAsync(chainId)).to.have.length(0);
            const numEvicted = await cacheClient.evictZeroBalancesAsync(chainId);
            expect(numEvicted).to.eq(0);
        });
    });

    describe('coolDownMakerForPair', () => {
        const makerId1 = 'makerId1';
        const takerToken = 'takerToken';
        const makerToken = 'makerToken';

        it('should add new makers to the cooling down set for a pair', async () => {
            const isUpdated = await cacheClient.addMakerToCooldownAsync(
                makerId1,
                Date.now(),
                chainId,
                takerToken,
                makerToken,
            );
            expect(isUpdated).to.eq(true);
        });

        it('should update endTime to a time later than existing endTime', async () => {
            const now = Date.now();
            const oneMinuteLater = now + ONE_MINUTE_MS;
            await cacheClient.addMakerToCooldownAsync(makerId1, now, chainId, takerToken, makerToken);
            const isUpdated = await cacheClient.addMakerToCooldownAsync(
                makerId1,
                oneMinuteLater,
                chainId,
                makerToken,
                takerToken,
            );
            expect(isUpdated).to.eq(true);
        });

        it('should not update endTime to a time earlier than existing endTime', async () => {
            const now = Date.now();
            const oneMinuteEarlier = now - ONE_MINUTE_MS;
            await cacheClient.addMakerToCooldownAsync(makerId1, now, chainId, takerToken, makerToken);
            const isUpdated = await cacheClient.addMakerToCooldownAsync(
                makerId1,
                oneMinuteEarlier,
                chainId,
                takerToken,
                makerToken,
            );
            expect(isUpdated).to.eq(false);
        });
    });

    describe('getCoolingDownMakersForPair', () => {
        const makerId1 = 'makerId1';
        const makerId2 = 'makerId2';
        const takerToken = 'takerToken';
        const otherTakerToken = 'otherTakerToken';
        const makerToken = 'makerToken';

        it('should get all makers that are cooling down', async () => {
            const now = Date.now();
            const oneMinuteLater = now + ONE_MINUTE_MS;
            await cacheClient.addMakerToCooldownAsync(makerId1, oneMinuteLater, chainId, takerToken, makerToken);
            await cacheClient.addMakerToCooldownAsync(makerId2, oneMinuteLater, chainId, takerToken, makerToken);
            const result = await cacheClient.getMakersInCooldownForPairAsync(chainId, takerToken, makerToken, now);
            expect(result).to.deep.eq([makerId1, makerId2]);
        });

        it('should not include makers whose cooling down periods already ended', async () => {
            const now = Date.now();
            const oneMinuteEarlier = now - ONE_MINUTE_MS;
            const oneMinuteLater = now + ONE_MINUTE_MS;
            await cacheClient.addMakerToCooldownAsync(makerId1, oneMinuteEarlier, chainId, takerToken, makerToken);
            await cacheClient.addMakerToCooldownAsync(makerId2, oneMinuteLater, chainId, takerToken, makerToken);
            const result = await cacheClient.getMakersInCooldownForPairAsync(chainId, takerToken, makerToken, now);
            expect(result).to.deep.eq([makerId2]);
        });

        it('should only include makers that are cooling down for this pair', async () => {
            const now = Date.now();
            const oneMinuteLater = now + ONE_MINUTE_MS;
            await cacheClient.addMakerToCooldownAsync(makerId1, oneMinuteLater, chainId, takerToken, makerToken);
            await cacheClient.addMakerToCooldownAsync(makerId2, oneMinuteLater, chainId, otherTakerToken, makerToken);
            const result = await cacheClient.getMakersInCooldownForPairAsync(chainId, takerToken, makerToken, now);
            expect(result).to.deep.eq([makerId1]);
        });
    });
});
