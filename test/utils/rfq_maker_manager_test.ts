// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { anything, instance, mock, when } from 'ts-mockito';

import { MakerIdSet } from '../../src/config';
import { RfqMaker } from '../../src/entities';
import { ConfigManager } from '../../src/utils/config_manager';
import { RfqMakerDbUtils } from '../../src/utils/rfq_maker_db_utils';
import { RfqMakerManager } from '../../src/utils/rfq_maker_manager';
import { CHAIN_ID } from '../constants';

const createMockConfigManager = (
    rfqtRfqMakers: MakerIdSet,
    rfqtOtcMakers: MakerIdSet,
    rfqmOtcMakers: MakerIdSet,
): ConfigManager => {
    const configManagerMock = mock(ConfigManager);
    when(configManagerMock.getRfqmMakerIdSetForOtcOrder()).thenReturn(rfqmOtcMakers);
    when(configManagerMock.getRfqtMakerIdSetForRfqOrder()).thenReturn(rfqtRfqMakers);
    when(configManagerMock.getRfqtMakerIdSetForOtcOrder()).thenReturn(rfqtOtcMakers);

    return instance(configManagerMock);
};

const createMockRfqMakerDbUtilsInstance = (rfqMaker: RfqMaker[]): RfqMakerDbUtils => {
    const rfqMakerDbUtilsMock = mock(RfqMakerDbUtils);
    when(rfqMakerDbUtilsMock.getRfqMakersAsync(anything())).thenResolve(rfqMaker);
    when(rfqMakerDbUtilsMock.getRfqMakersUpdateTimeHashAsync(anything())).thenResolve('hash');

    return instance(rfqMakerDbUtilsMock);
};

describe('RfqMakerManager', () => {
    // Tokens in Checksum representation
    const tokenA = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const tokenB = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const tokenC = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    const makerIdSet: MakerIdSet = new Set();
    makerIdSet.add('maker1');
    makerIdSet.add('maker2');

    const rfqMaker: RfqMaker[] = [
        {
            makerId: 'maker1',
            chainId: CHAIN_ID,
            pairs: [],
            updatedAt: new Date(),
            rfqtUri: 'https://maker1.asdf',
            rfqmUri: 'https://maker1.asdf',
        },
        {
            makerId: 'maker2',
            chainId: CHAIN_ID,
            pairs: [],
            updatedAt: new Date(),
            rfqtUri: 'https://maker2.asdf',
            rfqmUri: 'https://maker2.asdf',
        },
    ];

    describe('getRfqmV2MakerUrisForPair', () => {
        it('should return a list of maker uris for a given config', async () => {
            // Given
            rfqMaker[0].pairs = [[tokenA, tokenB]];
            rfqMaker[1].pairs = [[tokenA, tokenB]];
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMaker);
            const configManager = createMockConfigManager(makerIdSet, makerIdSet, makerIdSet);

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            // When
            const makerUris = rfqMakerManager.getRfqmV2MakerUrisForPair(tokenA, tokenB);

            // Then
            expect(makerUris).toEqual(['https://maker1.asdf', 'https://maker2.asdf']);
        });

        it('should ignore ordering when considering pairs', async () => {
            // Given
            rfqMaker[0].pairs = [[tokenA, tokenB]];
            rfqMaker[1].pairs = [[tokenB, tokenA]];
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMaker);
            const configManager = createMockConfigManager(makerIdSet, makerIdSet, makerIdSet);

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            // When
            const makerUris1 = rfqMakerManager.getRfqmV2MakerUrisForPair(tokenB, tokenA); // order doesn't matter
            const makerUris2 = rfqMakerManager.getRfqmV2MakerUrisForPair(tokenB, tokenA); // order doesn't matter

            // Then
            expect(makerUris1).toEqual(['https://maker1.asdf', 'https://maker2.asdf']);
            expect(makerUris2).toEqual(['https://maker1.asdf', 'https://maker2.asdf']);
        });

        it('should return whitelisted makers only', async () => {
            // Given
            rfqMaker[0].pairs = [[tokenA, tokenB]];
            rfqMaker[1].pairs = [[tokenA, tokenB]];
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMaker);
            const configManager = createMockConfigManager(makerIdSet, makerIdSet, makerIdSet);

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            const whitelistedMakerIds = [rfqMaker[0].makerId];

            // When
            const makerUris1 = rfqMakerManager.getRfqmV2MakerUrisForPair(tokenA, tokenB);
            const makerUris2 = rfqMakerManager.getRfqmV2MakerUrisForPair(tokenA, tokenB, whitelistedMakerIds);

            // Then
            expect(makerUris1).toEqual(['https://maker1.asdf', 'https://maker2.asdf']);
            expect(makerUris2).toEqual(['https://maker1.asdf']);
        });

        it('should ignore casing when considering pairs', async () => {
            // Given
            // These pairs are selected such that when sorted as is: [0xF, 0xd]
            // But their order fips when sorted after lower casing:  [0xd, 0xf]
            const token_0xd = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
            const token_0xF = '0xFA2562da1Bba7B954f26C74725dF51fb62646313';
            rfqMaker[0].pairs = [[token_0xd, token_0xF]];
            rfqMaker[1].pairs = [[token_0xd.toLowerCase(), token_0xF.toLowerCase()]]; // case doesn't matter
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMaker);
            const configManager = createMockConfigManager(makerIdSet, makerIdSet, makerIdSet);

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            // When
            const makerUris1 = rfqMakerManager.getRfqmV2MakerUrisForPair(token_0xd, token_0xF);
            const makerUris2 = rfqMakerManager.getRfqmV2MakerUrisForPair(
                token_0xd.toUpperCase(),
                token_0xF.toUpperCase(),
            ); // case doesn't matter

            // Then
            expect(makerUris1).toEqual(makerUris2);
        });

        it('should return [] if no maker uris are providing liquidity', async () => {
            // Given
            rfqMaker[0].pairs = [[tokenA, tokenB]];
            rfqMaker[1].pairs = [[tokenA, tokenB]];
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMaker);

            const makerIdSetForMaker2Only: MakerIdSet = new Set();
            makerIdSetForMaker2Only.add('maker2');
            const configManager = createMockConfigManager(new Set(), makerIdSet, makerIdSetForMaker2Only);

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            // When
            const uris = rfqMakerManager.getRfqmV2MakerUrisForPair(tokenA, tokenC);

            // Then
            expect(uris).toEqual([]);
        });
    });

    describe('findMakerIdWithRfqmUri', () => {
        it('should return correct maker Id if the rfqm URI exists', async () => {
            // Given
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMaker);
            const configManager = createMockConfigManager(makerIdSet, makerIdSet, makerIdSet);

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            // When
            const maker1Id = rfqMakerManager.findMakerIdWithRfqmUri('https://maker1.asdf');
            const maker2Id = rfqMakerManager.findMakerIdWithRfqmUri('https://maker2.asdf');

            // Then
            expect(maker1Id).toEqual('maker1');
            expect(maker2Id).toEqual('maker2');
        });

        it('should return null if the maker URI does not exist', async () => {
            // Given
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMaker);
            const configManager = createMockConfigManager(makerIdSet, makerIdSet, makerIdSet);

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            // When
            const nullMakerId = rfqMakerManager.findMakerIdWithRfqmUri('https://maker-null.asdf');

            // Then
            expect(nullMakerId).toEqual(null);
        });
    });

    describe('getRfqtV2MakerOfferings', () => {
        it('should return the RfqMakerAssetOfferings for OtcOrder', async () => {
            // Given
            const rfqMakerForMaker123 = [...rfqMaker];
            rfqMakerForMaker123[0].pairs = [[tokenA, tokenB]];
            rfqMakerForMaker123[1].pairs = [[tokenA, tokenB]];
            rfqMakerForMaker123.push({
                makerId: 'maker3',
                chainId: CHAIN_ID,
                pairs: [[tokenA, tokenC]],
                updatedAt: new Date(),
                rfqtUri: 'https://maker3.asdf',
                rfqmUri: null,
            });

            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMakerForMaker123);

            const makerIdSetWithMakers23: MakerIdSet = new Set();
            makerIdSetWithMakers23.add('maker2');
            makerIdSetWithMakers23.add('maker3');
            const configManager = createMockConfigManager(makerIdSetWithMakers23, makerIdSetWithMakers23, new Set());

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            // When
            const assetOfferings = rfqMakerManager.getRfqtV2MakerOfferings();

            // Then
            expect(assetOfferings).toEqual({
                'https://maker2.asdf': [[tokenA, tokenB]],
                'https://maker3.asdf': [[tokenA, tokenC]],
            });
        });
    });

    describe('getRfqtV1MakerOfferings', () => {
        it('should return the RfqMakerAssetOfferings for RfqOrder', async () => {
            // Given
            const rfqMakerForMaker123 = [...rfqMaker];
            rfqMakerForMaker123[0].pairs = [[tokenA, tokenB]];
            rfqMakerForMaker123[1].pairs = [[tokenA, tokenB]];
            rfqMakerForMaker123.push({
                makerId: 'maker3',
                chainId: CHAIN_ID,
                pairs: [[tokenA, tokenC]],
                updatedAt: new Date(),
                rfqmUri: null,
                rfqtUri: 'https://maker3.asdf',
            });

            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMakerForMaker123);

            const makerIdSetWithMakers23: MakerIdSet = new Set();
            makerIdSetWithMakers23.add('maker2');
            makerIdSetWithMakers23.add('maker3');
            const configManager = createMockConfigManager(makerIdSetWithMakers23, new Set(), new Set());

            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            // When
            const assetOfferings = rfqMakerManager.getRfqtV1MakerOfferings();

            // Then
            expect(assetOfferings).toEqual({
                'https://maker2.asdf': [[tokenA, tokenB]],
                'https://maker3.asdf': [[tokenA, tokenC]],
            });
        });
    });
    describe('getRfqtV2MakersForPair', () => {
        it('should return the market makers trading rfqt-otc', async () => {
            rfqMaker[0].pairs = [[tokenB, tokenA]];
            rfqMaker[1].pairs = [[tokenB, tokenB]]; // This maker should not be included in the result

            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMaker);
            const configManager = createMockConfigManager(new Set(), new Set(['maker1', 'maker2']), new Set());
            const rfqMakerManager = new RfqMakerManager(configManager, rfqMakerDbUtils, CHAIN_ID);
            await rfqMakerManager.initializeAsync();

            const makers = rfqMakerManager.getRfqtV2MakersForPair(tokenA, tokenB);

            expect(makers.length).toEqual(1);
            expect(makers[0].makerId).toEqual('maker1');
        });
    });
});
