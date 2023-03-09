// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { DEFAULT_FEE_MODEL_CONFIGURATION } from '../../src/config';
import { ConfigManager } from '../../src/utils/config_manager';

describe('ConfigManager', () => {
    describe('getRfqMakerIdForApiKey', () => {
        it('should return correct maker Ids', () => {
            // Given
            const configManager = new ConfigManager();
            // Facts defined in test_env file
            const apiKeyToMakerIds = [
                {
                    apiKey: 'd2ed029a-a8a6-48af-9934-bcf3ce07cddf',
                    makerId: 'degen-trading',
                },
                {
                    apiKey: '03da31bd-cbd9-4167-932d-11b054d02832',
                    makerId: 'tradfi-finance',
                },
                {
                    apiKey: '16a35054-d41f-46b0-83bb-166015aaf86e',
                    makerId: 'i-love-rfqorder',
                },
            ];

            apiKeyToMakerIds.forEach((apiKeyIdPair) => {
                // When
                const makerId = configManager.getRfqMakerIdForApiKey(apiKeyIdPair.apiKey);

                // Then
                expect(makerId).toEqual(apiKeyIdPair.makerId);
            });
        });

        it('should ignore conflict api key', () => {
            // Given
            const configManager = new ConfigManager();
            // Facts defined in test_env file
            const conflictApiKey = 'bc5dfd4c-580f-475f-aa7e-611cbb6d70cd';

            // When
            const makerIdForConflictKey = configManager.getRfqMakerIdForApiKey(conflictApiKey);

            // Then
            expect(makerIdForConflictKey).toEqual(undefined);
        });

        it('should ignore unknown api key', () => {
            // Given
            const configManager = new ConfigManager();
            const unknownApiKey = '7825fbc1-9b7d-4ba7-9237-2f1ec971cf20';

            // When
            const makerIdForUnknownKey = configManager.getRfqMakerIdForApiKey(unknownApiKey);

            // Then
            expect(makerIdForUnknownKey).toEqual(undefined);
        });
    });
    describe('getFeeModelConfiguration', () => {
        const chainId = 1;
        const tokenA = '0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7';
        const tokenB = '0xf84830b73b2ed3c7267e7638f500110ea47fdf30';
        const unknownToken = '0xf84830b73b2ed3c7267e7638f500110ea47fdf31';
        const marginRakeRatio = 0.4;
        const tradeSizeBps = 5;

        it('should find fee model config for given pairs', () => {
            // Given
            const configManager = new ConfigManager();

            // When
            const feeModelConfig = configManager.getFeeModelConfiguration(chainId, tokenA, tokenB);

            // Then
            expect(feeModelConfig.marginRakeRatio).toEqual(marginRakeRatio);
            expect(feeModelConfig.tradeSizeBps).toEqual(tradeSizeBps);
        });

        it('should ignore tokens order when looking for fee model config', () => {
            // Given
            const configManager = new ConfigManager();

            // When
            const feeModelConfig = configManager.getFeeModelConfiguration(chainId, tokenB, tokenA);

            // Then
            expect(feeModelConfig.marginRakeRatio).toEqual(marginRakeRatio);
            expect(feeModelConfig.tradeSizeBps).toEqual(tradeSizeBps);
        });

        it('should return default fee model config when chainId is not found', () => {
            // Given
            const configManager = new ConfigManager();

            // When
            const feeModelConfig = configManager.getFeeModelConfiguration(137, tokenA, tokenB);

            // Then
            expect(feeModelConfig.marginRakeRatio).toEqual(DEFAULT_FEE_MODEL_CONFIGURATION.marginRakeRatio);
            expect(feeModelConfig.tradeSizeBps).toEqual(DEFAULT_FEE_MODEL_CONFIGURATION.tradeSizeBps);
        });

        it('should return default fee model config when chainId is not found', () => {
            // Given
            const configManager = new ConfigManager();

            // When
            const feeModelConfig = configManager.getFeeModelConfiguration(chainId, tokenA, unknownToken);

            // Then
            expect(feeModelConfig.marginRakeRatio).toEqual(DEFAULT_FEE_MODEL_CONFIGURATION.marginRakeRatio);
            expect(feeModelConfig.tradeSizeBps).toEqual(DEFAULT_FEE_MODEL_CONFIGURATION.tradeSizeBps);
        });
    });
});
