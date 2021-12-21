// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { expect } from '@0x/contracts-test-utils';

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
                expect(makerId).to.be.eq(apiKeyIdPair.makerId);
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
            expect(makerIdForConflictKey).to.be.eq(undefined);
        });

        it('should ignore unknown api key', () => {
            // Given
            const configManager = new ConfigManager();
            const unknownApiKey = '7825fbc1-9b7d-4ba7-9237-2f1ec971cf20';

            // When
            const makerIdForUnknownKey = configManager.getRfqMakerIdForApiKey(unknownApiKey);

            // Then
            expect(makerIdForUnknownKey).to.be.eq(undefined);
        });
    });
});
