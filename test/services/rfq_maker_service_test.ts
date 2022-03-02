// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { ChainId } from '@0x/contract-addresses';
import { expect } from '@0x/contracts-test-utils';
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
        it('should get pairs from db connection', async () => {
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
            expect(rfqMakerFromSevice.makerId).to.be.eq(makerId);
            expect(rfqMakerFromSevice.chainId).to.be.eq(chainId);
            expect(rfqMakerFromSevice.updatedAt).to.be.eq(updatedAt);
            expect(rfqMakerFromSevice.pairs).to.be.eq(pairs);
        });

        it('should get default pairs if there is no information in DB', async () => {
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
            expect(rfqMakerFromSevice.makerId).to.be.eq(makerId);
            expect(rfqMakerFromSevice.chainId).to.be.eq(chainId);
            expect(rfqMakerFromSevice.updatedAt).to.be.eq(null);
            expect(rfqMakerFromSevice.pairs.length).to.be.eq(0);
        });
    });

    describe('createOrUpdateRfqMakerAsync', () => {
        it('should create or update pairs through db connection', async () => {
            // Given
            const repositoryMock = mock(Repository);
            when(repositoryMock.save(anything())).thenCall((rfqMaker) => {
                // Then
                expect(rfqMaker.makerId).to.be.eq(makerId);
                expect(rfqMaker.chainId).to.be.eq(chainId);
                expect(rfqMaker.pairs).to.be.eq(pairs);
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
            expect(makerIdFromService).to.be.eq(makerId);
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
            expect(makerIdFromService).to.be.eq(null);
        });
    });

    describe('isValidChainId', () => {
        it('should return false for invalid number chainId', async () => {
            // Given
            const invalidChainId = '123a';

            // When
            const isValidChainId = RfqMakerService.isValidChainId(invalidChainId);

            // Then
            expect(isValidChainId).to.be.eq(false);
        });

        it('should return false for unknown number chainId', async () => {
            // Given
            const invalidChainId = '12345';

            // When
            const isValidChainId = RfqMakerService.isValidChainId(invalidChainId);

            // Then
            expect(isValidChainId).to.be.eq(false);
        });

        it('should return number ChainId for well formated chainId', async () => {
            // Given
            const validChainId = '1337';

            // When
            const isValidChainId = RfqMakerService.isValidChainId(validChainId);

            // Then
            expect(isValidChainId).to.be.eq(true);
        });
    });

    describe('validatePairsPayload', () => {
        it('should pass with valid input pairs', async () => {
            expect(() => {
                RfqMakerService.validatePairsPayloadOrThrow(pairs);
            }).to.not.throw();
        });

        it('should throw for non array input', async () => {
            expect(() => {
                RfqMakerService.validatePairsPayloadOrThrow('123' as any);
            }).to.throw();
        });

        it('should throw for array of non arrays', async () => {
            expect(() => {
                RfqMakerService.validatePairsPayloadOrThrow(['123'] as any);
            }).to.throw();
        });

        it('should throw for incorrect sub-array length', async () => {
            expect(() => {
                RfqMakerService.validatePairsPayloadOrThrow(['123'] as any);
            }).to.throw();
        });

        it('should throw for pairs of invalid ethereum addresses', async () => {
            expect(() => {
                RfqMakerService.validatePairsPayloadOrThrow([['123', '234']]);
            }).to.throw();
        });

        it('should throw for pairs of identical ethereum addresses', async () => {
            expect(() => {
                RfqMakerService.validatePairsPayloadOrThrow([
                    ['0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7', '0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7'],
                ]);
            }).to.throw();
        });
    });
});
