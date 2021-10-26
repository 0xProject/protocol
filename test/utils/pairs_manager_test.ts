// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { RfqMakerAssetOfferings } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { instance, mock, when } from 'ts-mockito';

import { ConfigManager } from '../../src/utils/config_manager';
import { PairsManager } from '../../src/utils/pairs_manager';

describe('PairsManager', () => {
    // Tokens in Checksum representation
    const tokenA = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const tokenB = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
    const tokenC = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    describe('getRfqmMakerUrisForPair', () => {
        it('should return a list of maker uris for a given config', () => {
            // Given
            const offerings: RfqMakerAssetOfferings = {
                'https://maker1.asdf': [[tokenA, tokenB]],
                'https://maker2.asdf': [[tokenA, tokenB]],
            };
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getRfqmAssetOfferings()).thenReturn(offerings);
            const configManager = instance(configManagerMock);
            const pairsManager = new PairsManager(configManager);

            // When
            const makerUris = pairsManager.getRfqmMakerUrisForPair(tokenA, tokenB);

            // Then
            expect(makerUris).to.deep.eq(['https://maker1.asdf', 'https://maker2.asdf']);
        });

        it('should ignore ordering when considering pairs', () => {
            // Given
            const offerings: RfqMakerAssetOfferings = {
                'https://maker1.asdf': [[tokenA, tokenB]],
                'https://maker2.asdf': [[tokenB, tokenA]], // order doesn't matter
            };
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getRfqmAssetOfferings()).thenReturn(offerings);
            const configManager = instance(configManagerMock);
            const pairsManager = new PairsManager(configManager);

            // When
            const makerUris1 = pairsManager.getRfqmMakerUrisForPair(tokenB, tokenA); // order doesn't matter
            const makerUris2 = pairsManager.getRfqmMakerUrisForPair(tokenB, tokenA); // order doesn't matter

            // Then
            expect(makerUris1).to.deep.eq(['https://maker1.asdf', 'https://maker2.asdf']);
            expect(makerUris2).to.deep.eq(['https://maker1.asdf', 'https://maker2.asdf']);
        });

        it('should ignore casing when considering pairs', () => {
            // Given
            // These pairs are selected such that when sorted as is: [0xF, 0xd]
            // But their order fips when sorted after lower casing:  [0xd, 0xf]
            const token_0xd = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
            const token_0xF = '0xFA2562da1Bba7B954f26C74725dF51fb62646313';

            const offerings: RfqMakerAssetOfferings = {
                'https://maker1.asdf': [[token_0xd, token_0xF]],
                'https://maker2.asdf': [[token_0xd.toLowerCase(), token_0xF.toLowerCase()]], // case doesn't matter
            };
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getRfqmAssetOfferings()).thenReturn(offerings);
            const configManager = instance(configManagerMock);
            const pairsManager = new PairsManager(configManager);

            // When
            const makerUris1 = pairsManager.getRfqmMakerUrisForPair(token_0xd, token_0xF);
            const makerUris2 = pairsManager.getRfqmMakerUrisForPair(token_0xd.toUpperCase(), token_0xF.toUpperCase()); // case doesn't matter

            // Then
            expect(makerUris1).to.deep.eq(makerUris2);
        });
    });

    describe('getRfqtMakerUrisForPair', () => {
        it('should not be confused w/RFQM', () => {
            // Given
            const rfqmOfferings: RfqMakerAssetOfferings = {
                'https://maker1.asdf': [[tokenA, tokenB]],
                'https://maker2.asdf': [[tokenA, tokenB]],
            };
            const rfqtOfferings: RfqMakerAssetOfferings = {
                'https://maker3.asdf': [[tokenA, tokenC]],
                'https://maker4.asdf': [[tokenA, tokenC]],
            };
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getRfqmAssetOfferings()).thenReturn(rfqmOfferings);
            when(configManagerMock.getRfqtAssetOfferings()).thenReturn(rfqtOfferings);
            const configManager = instance(configManagerMock);
            const pairsManager = new PairsManager(configManager);

            // When
            const rfqmMakerUris = pairsManager.getRfqtMakerUrisForPair(tokenA, tokenB);
            const rfqtMakerUris = pairsManager.getRfqtMakerUrisForPair(tokenA, tokenC);

            // Then
            expect(rfqtMakerUris).to.deep.eq(['https://maker3.asdf', 'https://maker4.asdf']);
            expect(rfqtMakerUris).to.not.deep.eq(rfqmMakerUris);
        });
    });
});
