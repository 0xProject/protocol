import { ChainId } from '@0x/contract-addresses';
import { anything, instance, mock, when } from 'ts-mockito';
import { Connection, Repository } from 'typeorm';

import { RfqMaker } from '../../src/entities';
import { RfqMakerService } from '../../src/services/rfq_maker_service';
import { ConfigManager } from '../../src/utils/config_manager';
import { RfqMakerDbUtils } from '../../src/utils/rfq_maker_db_utils';

describe('RfqMakerService', () => {
    const makerId = 'fakeMaker1';
    const makerApiKey = 'fakeMakerApiKey1';
    const chainId = ChainId.Ganache;
    const updatedAt = new Date();
    const pairs: [string, string][] = [
        ['0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7', '0xf84830b73b2ed3c7267e7638f500110ea47fdf30'],
    ];

    describe('getRfqMakerAsync', () => {
        it('should get RfqMaker entity from db connection', async () => {
            // Given
            const rfqMaker: RfqMaker = new RfqMaker({
                makerId,
                chainId,
                updatedAt,
                pairs,
                rfqtUri: null,
                rfqmUri: null,
            });
            const repositoryMock = mock(Repository);
            when(repositoryMock.findOne(anything())).thenResolve(rfqMaker);
            const connectionMock = mock(Connection);
            when(connectionMock.getRepository(RfqMaker)).thenReturn(instance(repositoryMock));
            const rfqDbUtils = new RfqMakerDbUtils(instance(connectionMock));

            const configManagerMock = mock(ConfigManager);

            const rfqMakerService = new RfqMakerService(rfqDbUtils, configManagerMock);

            // When
            const rfqMakerFromSevice = await rfqMakerService.getRfqMakerAsync(makerId, chainId);

            // Then
            expect(rfqMakerFromSevice.makerId).toEqual(makerId);
            expect(rfqMakerFromSevice.chainId).toEqual(chainId);
            expect(rfqMakerFromSevice.updatedAt).toEqual(updatedAt);
            expect(rfqMakerFromSevice.pairs).toEqual(pairs);
        });

        it('should get default RfqMaker entity if there is no information in DB', async () => {
            // Given
            const repositoryMock = mock(Repository);
            when(repositoryMock.findOne(anything())).thenResolve(undefined);
            const connectionMock = mock(Connection);
            when(connectionMock.getRepository(RfqMaker)).thenReturn(instance(repositoryMock));
            const rfqDbUtils = new RfqMakerDbUtils(instance(connectionMock));

            const configManagerMock = mock(ConfigManager);

            const rfqMakerService = new RfqMakerService(rfqDbUtils, configManagerMock);

            // When
            const rfqMakerFromSevice = await rfqMakerService.getRfqMakerAsync(makerId, chainId);

            // Then
            expect(rfqMakerFromSevice.makerId).toEqual(makerId);
            expect(rfqMakerFromSevice.chainId).toEqual(chainId);
            expect(rfqMakerFromSevice.updatedAt).toEqual(null);
            expect(rfqMakerFromSevice.pairs.length).toEqual(0);
        });
    });

    describe('createOrUpdateRfqMakerAsync', () => {
        it('should create or update the RfqMaker entity through db connection', async () => {
            // Given
            const repositoryMock = mock(Repository);
            when(repositoryMock.save(anything())).thenCall((rfqMaker) => {
                // Then
                expect(rfqMaker.makerId).toEqual(makerId);
                expect(rfqMaker.chainId).toEqual(chainId);
                expect(rfqMaker.pairs).toEqual(pairs);
            });
            const connectionMock = mock(Connection);
            when(connectionMock.getRepository(RfqMaker)).thenReturn(instance(repositoryMock));
            const rfqDbUtils = new RfqMakerDbUtils(instance(connectionMock));
            const configManagerMock = mock(ConfigManager);

            const rfqMakerService = new RfqMakerService(rfqDbUtils, configManagerMock);

            // When
            await rfqMakerService.createOrUpdateRfqMakerAsync(makerId, chainId, pairs, null, null);
        });
    });

    describe('patchRfqMakerAsync', () => {
        it('should update pairs', async () => {
            // Given
            const originalRfqMaker: RfqMaker = new RfqMaker({
                makerId,
                chainId,
                updatedAt,
                pairs,
                rfqtUri: null,
                rfqmUri: null,
            });
            const newPairs: [string, string][] = [];
            const rfqMakerServiceMock = mock(RfqMakerService);
            when(rfqMakerServiceMock.getRfqMakerAsync(anything(), anything())).thenResolve(originalRfqMaker);

            // Expect
            when(
                rfqMakerServiceMock.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenCall((makerIdToSave, chainIdToSave, pairsToSave, rfqtUriToSave, rfqmUriToSave) => {
                expect(makerIdToSave).toEqual(originalRfqMaker.makerId);
                expect(chainIdToSave).toEqual(originalRfqMaker.chainId);
                expect(pairsToSave).toEqual(newPairs);
                expect(rfqtUriToSave).toEqual(originalRfqMaker.rfqtUri);
                expect(rfqmUriToSave).toEqual(originalRfqMaker.rfqmUri);
            });
            const rfqMakerService = instance(rfqMakerServiceMock);

            // When
            await rfqMakerService.patchRfqMakerAsync(makerId, chainId, newPairs, undefined, undefined);
        });
        it('should update URIs from null to a valid string', async () => {
            // Given
            const originalRfqMaker: RfqMaker = new RfqMaker({
                makerId,
                chainId,
                updatedAt,
                pairs,
                rfqtUri: null,
                rfqmUri: null,
            });
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-inferrable-types
            const newRfqtUri: string = 'http://localhost:3001';
            const rfqMakerServiceMock = mock(RfqMakerService);
            when(rfqMakerServiceMock.getRfqMakerAsync(anything(), anything())).thenResolve(originalRfqMaker);

            // Expect
            when(
                rfqMakerServiceMock.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenCall((makerIdToSave, chainIdToSave, pairsToSave, rfqtUriToSave, rfqmUriToSave) => {
                expect(makerIdToSave).toEqual(originalRfqMaker.makerId);
                expect(chainIdToSave).toEqual(originalRfqMaker.chainId);
                expect(pairsToSave).toEqual(originalRfqMaker.pairs);
                expect(rfqtUriToSave).toEqual(newRfqtUri);
                expect(rfqmUriToSave).toEqual(originalRfqMaker.rfqmUri);
            });
            const rfqMakerService = instance(rfqMakerServiceMock);

            // When
            await rfqMakerService.patchRfqMakerAsync(makerId, chainId, undefined, newRfqtUri, undefined);
        });
        it('should update URIs from string to null', async () => {
            // Given
            const originalRfqMaker: RfqMaker = new RfqMaker({
                makerId,
                chainId,
                updatedAt,
                pairs,
                rfqtUri: 'http://localhost:3001',
                rfqmUri: 'http://localhost:3002',
            });
            const rfqMakerServiceMock = mock(RfqMakerService);
            when(rfqMakerServiceMock.getRfqMakerAsync(anything(), anything())).thenResolve(originalRfqMaker);

            // Expect
            when(
                rfqMakerServiceMock.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenCall((makerIdToSave, chainIdToSave, pairsToSave, rfqtUriToSave, rfqmUriToSave) => {
                expect(makerIdToSave).toEqual(originalRfqMaker.makerId);
                expect(chainIdToSave).toEqual(originalRfqMaker.chainId);
                expect(pairsToSave).toEqual(originalRfqMaker.pairs);
                expect(rfqtUriToSave).toEqual(originalRfqMaker.rfqtUri);
                expect(rfqmUriToSave).toEqual(null);
            });
            const rfqMakerService = instance(rfqMakerServiceMock);

            // When
            await rfqMakerService.patchRfqMakerAsync(makerId, chainId, undefined, undefined, null);
        });
    });

    describe('mapMakerApiKeyToId', () => {
        it('should map maker api key to maker id correctly', async () => {
            // Given
            const rfqDbUtils = mock(RfqMakerDbUtils);
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getRfqMakerIdForApiKey(makerApiKey)).thenReturn(makerId);

            const rfqMakerService = new RfqMakerService(rfqDbUtils, instance(configManagerMock));

            // When
            const makerIdFromService = rfqMakerService.mapMakerApiKeyToId(makerApiKey);

            // Then
            expect(makerIdFromService).toEqual(makerId);
        });

        it('should return null for undefined api key', async () => {
            // Given
            const rfqDbUtilsMock = mock(RfqMakerDbUtils);
            const configManagerMock = mock(ConfigManager);
            when(configManagerMock.getRfqMakerIdForApiKey(makerApiKey)).thenReturn(makerId);

            const rfqMakerService = new RfqMakerService(rfqDbUtilsMock, instance(configManagerMock));

            // When
            const makerIdFromService = rfqMakerService.mapMakerApiKeyToId(undefined);

            // Then
            expect(makerIdFromService).toEqual(null);
        });
    });

    describe('isValidChainId', () => {
        it('should return false for invalid number chainId', async () => {
            // Given
            const invalidChainId = '123a';

            // When
            const isValidChainId = RfqMakerService.isValidChainId(invalidChainId);

            // Then
            expect(isValidChainId).toEqual(false);
        });

        it('should return false for unknown number chainId', async () => {
            // Given
            const invalidChainId = '12345';

            // When
            const isValidChainId = RfqMakerService.isValidChainId(invalidChainId);

            // Then
            expect(isValidChainId).toEqual(false);
        });

        it('should return number ChainId for well formated chainId', async () => {
            // Given
            const validChainId = '1337';

            // When
            const isValidChainId = RfqMakerService.isValidChainId(validChainId);

            // Then
            expect(isValidChainId).toEqual(true);
        });
    });

    describe('validatePairsPayload', () => {
        it('should pass with valid input pairs', async () => {
            await RfqMakerService.validatePairsPayloadOrThrow(pairs);
        });

        it('should throw for non array input', async () => {
            expect(() => {
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                RfqMakerService.validatePairsPayloadOrThrow('123' as any);
            }).toThrow();
        });

        it('should throw for array of non arrays', async () => {
            expect(() => {
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                RfqMakerService.validatePairsPayloadOrThrow(['123'] as any);
            }).toThrow();
        });

        it('should throw for incorrect sub-array length', async () => {
            expect(() => {
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                RfqMakerService.validatePairsPayloadOrThrow(['123'] as any);
            }).toThrow();
        });

        it('should throw for pairs of invalid ethereum addresses', async () => {
            expect(() => {
                RfqMakerService.validatePairsPayloadOrThrow([['123', '234']]);
            }).toThrow();
        });

        it('should throw for pairs of identical ethereum addresses', async () => {
            expect(() => {
                RfqMakerService.validatePairsPayloadOrThrow([
                    ['0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7', '0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7'],
                ]);
            }).toThrow();
        });
    });
});
