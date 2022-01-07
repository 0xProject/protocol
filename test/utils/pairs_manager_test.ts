// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { ChainId } from '@0x/contract-addresses';
import { expect } from '@0x/contracts-test-utils';
import { anything, instance, mock, when } from 'ts-mockito';

import { MakerIdsToConfigs } from '../../src/config';
import { RfqMakerPairs } from '../../src/entities';
import { ConfigManager } from '../../src/utils/config_manager';
import { PairsManager } from '../../src/utils/pairs_manager';
import { RfqMakerDbUtils } from '../../src/utils/rfq_maker_db_utils';
import { CHAIN_ID } from '../constants';

const createMockConfigManager = (
    chainId: ChainId,
    allMakers: MakerIdsToConfigs,
    rfqMakers: MakerIdsToConfigs,
    otcMakers: MakerIdsToConfigs,
): ConfigManager => {
    const configManagerMock = mock(ConfigManager);
    when(configManagerMock.getChainId()).thenReturn(chainId);
    when(configManagerMock.getRfqmMakerConfigMap()).thenReturn(allMakers);
    when(configManagerMock.getRfqmMakerConfigMapForRfqOrder()).thenReturn(rfqMakers);
    when(configManagerMock.getRfqmMakerConfigMapForOtcOrder()).thenReturn(otcMakers);

    return instance(configManagerMock);
};

const createMockRfqMakerDbUtilsInstance = (rfqMakerPairs: RfqMakerPairs[]): RfqMakerDbUtils => {
    const rfqMakerDbUtilsMock = mock(RfqMakerDbUtils);
    when(rfqMakerDbUtilsMock.getPairsArrayAsync(anything())).thenResolve(rfqMakerPairs);

    return instance(rfqMakerDbUtilsMock);
};

describe('PairsManager', () => {
    // Tokens in Checksum representation
    const tokenA = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const tokenB = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const tokenC = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    const makerConfigMap: MakerIdsToConfigs = new Map();
    makerConfigMap.set('maker1', {
        makerId: 'maker1',
        label: 'maker1',
        rfqmMakerUri: 'https://maker1.asdf',
        rfqmOrderTypes: ['otc'],
        rfqtMakerUri: 'https://maker1.asdf',
        rfqtOrderTypes: [],
        apiKeyHashes: [],
    });
    makerConfigMap.set('maker2', {
        makerId: 'maker2',
        label: 'maker2',
        rfqmMakerUri: 'https://maker2.asdf',
        rfqmOrderTypes: ['otc'],
        rfqtMakerUri: 'https://maker2.asdf',
        rfqtOrderTypes: [],
        apiKeyHashes: [],
    });

    const rfqMakerPairs: RfqMakerPairs[] = [
        {
            makerId: 'maker1',
            chainId: CHAIN_ID,
            pairs: [],
            updatedAt: new Date(),
        },
        {
            makerId: 'maker2',
            chainId: CHAIN_ID,
            pairs: [],
            updatedAt: new Date(),
        },
    ];

    describe('getRfqmMakerUrisForPairOnOtcOrder', () => {
        it('should return a list of maker uris for a given config', async () => {
            // Given
            rfqMakerPairs[0].pairs = [[tokenA, tokenB]];
            rfqMakerPairs[1].pairs = [[tokenA, tokenB]];
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMakerPairs);
            const configManager = createMockConfigManager(CHAIN_ID, makerConfigMap, new Map(), makerConfigMap);

            const pairsManager = new PairsManager(configManager, rfqMakerDbUtils);
            await pairsManager.initializeAsync();

            // When
            const makerUris = pairsManager.getRfqmMakerUrisForPairOnOtcOrder(tokenA, tokenB);

            // Then
            expect(makerUris).to.deep.eq(['https://maker1.asdf', 'https://maker2.asdf']);
        });

        it('should ignore ordering when considering pairs', async () => {
            // Given
            rfqMakerPairs[0].pairs = [[tokenA, tokenB]];
            rfqMakerPairs[1].pairs = [[tokenB, tokenA]];
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMakerPairs);
            const configManager = createMockConfigManager(CHAIN_ID, makerConfigMap, new Map(), makerConfigMap);

            const pairsManager = new PairsManager(configManager, rfqMakerDbUtils);
            await pairsManager.initializeAsync();

            // When
            const makerUris1 = pairsManager.getRfqmMakerUrisForPairOnOtcOrder(tokenB, tokenA); // order doesn't matter
            const makerUris2 = pairsManager.getRfqmMakerUrisForPairOnOtcOrder(tokenB, tokenA); // order doesn't matter

            // Then
            expect(makerUris1).to.deep.eq(['https://maker1.asdf', 'https://maker2.asdf']);
            expect(makerUris2).to.deep.eq(['https://maker1.asdf', 'https://maker2.asdf']);
        });

        it('should ignore casing when considering pairs', async () => {
            // Given
            // These pairs are selected such that when sorted as is: [0xF, 0xd]
            // But their order fips when sorted after lower casing:  [0xd, 0xf]
            const token_0xd = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
            const token_0xF = '0xFA2562da1Bba7B954f26C74725dF51fb62646313';
            rfqMakerPairs[0].pairs = [[token_0xd, token_0xF]];
            rfqMakerPairs[1].pairs = [[token_0xd.toLowerCase(), token_0xF.toLowerCase()]]; // case doesn't matter
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMakerPairs);
            const configManager = createMockConfigManager(CHAIN_ID, makerConfigMap, new Map(), makerConfigMap);

            const pairsManager = new PairsManager(configManager, rfqMakerDbUtils);
            await pairsManager.initializeAsync();

            // When
            const makerUris1 = pairsManager.getRfqmMakerUrisForPairOnOtcOrder(token_0xd, token_0xF);
            const makerUris2 = pairsManager.getRfqmMakerUrisForPairOnOtcOrder(
                token_0xd.toUpperCase(),
                token_0xF.toUpperCase(),
            ); // case doesn't matter

            // Then
            expect(makerUris1).to.deep.eq(makerUris2);
        });

        it('should filter for only those uris that offer OtcOrder', async () => {
            // Given
            rfqMakerPairs[0].pairs = [[tokenA, tokenB]];
            rfqMakerPairs[1].pairs = [[tokenA, tokenB]];
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMakerPairs);

            const makerConfigMapForMaker2Only: MakerIdsToConfigs = new Map();
            makerConfigMapForMaker2Only.set('maker2', makerConfigMap.get('maker2')!);
            const configManager = createMockConfigManager(
                CHAIN_ID,
                makerConfigMap,
                new Map(),
                makerConfigMapForMaker2Only,
            );

            const pairsManager = new PairsManager(configManager, rfqMakerDbUtils);
            await pairsManager.initializeAsync();

            // When
            const uris = pairsManager.getRfqmMakerUrisForPairOnOtcOrder(tokenA, tokenB);

            // Then
            expect(uris).to.deep.eq(['https://maker2.asdf']);
        });

        it('should return [] if no maker uris are providing liquidity', async () => {
            // Given
            rfqMakerPairs[0].pairs = [[tokenA, tokenB]];
            rfqMakerPairs[1].pairs = [[tokenA, tokenB]];
            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMakerPairs);

            const makerConfigMapForMaker2Only: MakerIdsToConfigs = new Map();
            makerConfigMapForMaker2Only.set('maker2', makerConfigMap.get('maker2')!);
            const configManager = createMockConfigManager(
                CHAIN_ID,
                makerConfigMap,
                new Map(),
                makerConfigMapForMaker2Only,
            );

            const pairsManager = new PairsManager(configManager, rfqMakerDbUtils);
            await pairsManager.initializeAsync();

            // When
            const uris = pairsManager.getRfqmMakerUrisForPairOnOtcOrder(tokenA, tokenC);

            // Then
            expect(uris).to.deep.eq([]);
        });
    });

    describe('getRfqmMakerOfferingsForRfqOrder', () => {
        it('should return the RfqMakerAssetOfferings for RfqOrder', async () => {
            // Given
            const rfqMakerPairsForMaker123 = [...rfqMakerPairs];
            rfqMakerPairsForMaker123[0].pairs = [[tokenA, tokenB]];
            rfqMakerPairsForMaker123[1].pairs = [[tokenA, tokenB]];
            rfqMakerPairsForMaker123.push({
                makerId: 'maker3',
                chainId: CHAIN_ID,
                pairs: [[tokenA, tokenC]],
                updatedAt: new Date(),
            });

            const rfqMakerDbUtils = createMockRfqMakerDbUtilsInstance(rfqMakerPairsForMaker123);

            const makerConfigMapWithMakers23: MakerIdsToConfigs = new Map();
            makerConfigMapWithMakers23.set('maker2', makerConfigMap.get('maker2')!);
            makerConfigMapWithMakers23.set('maker3', {
                makerId: 'maker3',
                label: 'maker3',
                rfqmMakerUri: 'https://maker3.asdf',
                rfqmOrderTypes: ['rfq'],
                rfqtMakerUri: 'https://maker3.asdf',
                rfqtOrderTypes: [],
                apiKeyHashes: [],
            });
            const configManager = createMockConfigManager(
                CHAIN_ID,
                makerConfigMapWithMakers23,
                makerConfigMapWithMakers23,
                new Map(),
            );

            const pairsManager = new PairsManager(configManager, rfqMakerDbUtils);
            await pairsManager.initializeAsync();

            // When
            const assetOfferings = pairsManager.getRfqmMakerOfferingsForRfqOrder();

            // Then
            expect(assetOfferings).to.deep.eq({
                'https://maker2.asdf': [[tokenA, tokenB]],
                'https://maker3.asdf': [[tokenA, tokenC]],
            });
        });
    });
});
