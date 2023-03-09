import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
import { anything, instance, mock, verify, when } from 'ts-mockito';

import { RfqMakerBalanceCacheService } from '../../src/services/rfq_maker_balance_cache_service';
import { ERC20Owner } from '../../src/core/types';
import { CacheClient } from '../../src/utils/cache_client';
import { RfqBalanceCheckUtils } from '../../src/utils/rfq_blockchain_utils';

describe('RfqMakerBalanceCacheService', () => {
    const chainId = ChainId.Ganache;

    const makerA = '0x1111111111111111111111111111111111111111';
    const makerB = '0x2222222222222222222222222222222222222222';
    const makerC = '0x3333333333333333333333333333333333333333';

    const tokenA = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const tokenB = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const tokenC = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    describe('getERC20OwnerBalancesAsync', () => {
        it('should get maker balances from the cache', async () => {
            const addresses = [
                { owner: makerA, token: tokenA },
                { owner: makerB, token: tokenB },
                { owner: makerC, token: tokenC },
            ];

            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.getERC20OwnerBalancesAsync(chainId, addresses)).thenResolve([
                new BigNumber(1),
                new BigNumber(2),
                new BigNumber(3),
            ]);
            const balanceCheckUtilsMock = mock(RfqBalanceCheckUtils);
            const makerBalanceCacheService = new RfqMakerBalanceCacheService(
                instance(cacheClientMock),
                instance(balanceCheckUtilsMock),
            );

            expect(await makerBalanceCacheService.getERC20OwnerBalancesAsync(chainId, addresses)).toEqual([
                new BigNumber(1),
                new BigNumber(2),
                new BigNumber(3),
            ]);
            verify(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).never();
        });

        it('should fetch balances through balance check for addresses not found in the cache', async () => {
            const addresses = [
                { owner: makerA, token: tokenA },
                { owner: makerB, token: tokenB },
                { owner: makerC, token: tokenC },
            ];

            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.getERC20OwnerBalancesAsync(chainId, addresses)).thenResolve([
                null,
                new BigNumber(2),
                null,
            ]);
            when(cacheClientMock.addERC20OwnerAsync(chainId, anything())).thenResolve();
            const balanceCheckUtilsMock = mock(RfqBalanceCheckUtils);
            when(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1),
                new BigNumber(3),
            ]);
            const makerBalanceCacheService = new RfqMakerBalanceCacheService(
                instance(cacheClientMock),
                instance(balanceCheckUtilsMock),
            );

            expect(await makerBalanceCacheService.getERC20OwnerBalancesAsync(chainId, addresses)).toEqual([
                new BigNumber(1),
                new BigNumber(2),
                new BigNumber(3),
            ]);
            verify(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).once();
        });

        it('should get zero addresses if balance check returns malformed results', async () => {
            const addresses = [
                { owner: makerA, token: tokenA },
                { owner: makerB, token: tokenB },
                { owner: makerC, token: tokenC },
            ];

            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.getERC20OwnerBalancesAsync(chainId, addresses)).thenResolve([
                null,
                new BigNumber(2),
                null,
            ]);
            when(cacheClientMock.addERC20OwnerAsync(chainId, anything())).thenResolve();
            const balanceCheckUtilsMock = mock(RfqBalanceCheckUtils);
            when(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([]);
            const makerBalanceCacheService = new RfqMakerBalanceCacheService(
                instance(cacheClientMock),
                instance(balanceCheckUtilsMock),
            );

            expect(await makerBalanceCacheService.getERC20OwnerBalancesAsync(chainId, addresses)).toEqual([
                new BigNumber(0),
                new BigNumber(2),
                new BigNumber(0),
            ]);
            verify(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).once();
        });

        it('should throw an error if reading entries from the cache fails', async () => {
            const addresses = [
                { owner: makerA, token: tokenA },
                { owner: makerB, token: tokenB },
                { owner: makerC, token: '0xbadaddress' },
            ];

            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.getERC20OwnerBalancesAsync(anything(), addresses)).thenReject(
                new Error('Failed to read entries from maker balance cache'),
            );
            const balanceCheckUtilsMock = mock(RfqBalanceCheckUtils);
            const makerBalanceCacheService = new RfqMakerBalanceCacheService(
                instance(cacheClientMock),
                instance(balanceCheckUtilsMock),
            );

            expect(makerBalanceCacheService.getERC20OwnerBalancesAsync(chainId, addresses)).rejects.toThrow(
                'maker balance cache',
            );
            verify(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).never();
        });

        it('should get empty array when addresses are empty', async () => {
            const emptyAddresses: ERC20Owner[] = [];

            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.getERC20OwnerBalancesAsync(chainId, emptyAddresses)).thenResolve([]);
            const balanceCheckUtilsMock = mock(RfqBalanceCheckUtils);
            const makerBalanceCacheService = new RfqMakerBalanceCacheService(
                instance(cacheClientMock),
                instance(balanceCheckUtilsMock),
            );

            expect(await makerBalanceCacheService.getERC20OwnerBalancesAsync(chainId, emptyAddresses)).toEqual([]);
            verify(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).never();
        });
    });

    describe('updateERC20OwnerBalancesAsync', () => {
        it('should update the cache with given maker balances', async () => {
            const addresses = [
                { owner: makerA, token: tokenA },
                { owner: makerB, token: tokenB },
                { owner: makerC, token: tokenC },
            ];
            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.getERC20OwnersAsync(chainId)).thenResolve(addresses);
            when(cacheClientMock.setERC20OwnerBalancesAsync(chainId, addresses, anything())).thenResolve();
            const balanceCheckUtilsMock = mock(RfqBalanceCheckUtils);
            when(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(addresses)).thenResolve([
                new BigNumber(1),
                new BigNumber(2),
                new BigNumber(3),
            ]);
            const makerBalanceCacheService = new RfqMakerBalanceCacheService(
                instance(cacheClientMock),
                instance(balanceCheckUtilsMock),
            );

            await makerBalanceCacheService.updateERC20OwnerBalancesAsync(chainId);
            verify(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).once();
        });
    });

    it('should throw an error if writing entries to the cache fails', async () => {
        const addresses = [
            { owner: makerA, token: tokenA },
            { owner: makerB, token: tokenB },
            { owner: makerC, token: tokenC },
        ];
        const cacheClientMock = mock(CacheClient);
        when(cacheClientMock.getERC20OwnersAsync(chainId)).thenResolve(addresses);
        when(cacheClientMock.setERC20OwnerBalancesAsync(chainId, addresses, anything())).thenReject(
            new Error('Failed to update entries for maker balance cache'),
        );
        const balanceCheckUtilsMock = mock(RfqBalanceCheckUtils);
        when(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(addresses)).thenResolve([
            new BigNumber(1),
            new BigNumber(2),
            new BigNumber(3),
        ]);
        const makerBalanceCacheService = new RfqMakerBalanceCacheService(
            instance(cacheClientMock),
            instance(balanceCheckUtilsMock),
        );

        await expect(makerBalanceCacheService.updateERC20OwnerBalancesAsync(chainId)).rejects.toThrow(
            'maker balance cache',
        );
        verify(balanceCheckUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).once();
    });

    describe('evictZeroBalancesAsync', () => {
        it('should evict entries from the cache', async () => {
            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.evictZeroBalancesAsync(chainId)).thenResolve(1);
            const balanceCheckUtilsMock = mock(RfqBalanceCheckUtils);
            const makerBalanceCacheService = new RfqMakerBalanceCacheService(
                instance(cacheClientMock),
                instance(balanceCheckUtilsMock),
            );

            const numEvicted = await makerBalanceCacheService.evictZeroBalancesAsync(chainId);
            expect(numEvicted).toEqual(1);
            verify(cacheClientMock.evictZeroBalancesAsync(chainId)).once();
        });
    });
});