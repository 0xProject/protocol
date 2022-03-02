// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { expect } from '@0x/contracts-test-utils';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import * as request from 'supertest';
import { anything, instance, mock, resetCalls, verify, when } from 'ts-mockito';
import { Connection } from 'typeorm';

import * as config from '../src/config';
import { RFQ_MAKER_API_KEY_HEADER, RFQ_MAKER_PATH } from '../src/constants';
import { RfqMaker } from '../src/entities';
import { runHttpRfqmServiceAsync } from '../src/runners/http_rfqm_service_runner';
import { RfqmService } from '../src/services/rfqm_service';
import { RfqMakerService } from '../src/services/rfq_maker_service';
import { ConfigManager } from '../src/utils/config_manager';

describe('RFQ maker API tests', () => {
    const makerApiKey = '111222333';
    const unknownMakerApiKey = '111222334';
    const makerId = '11';
    const chainId = 56;
    const invalidChainId = 57;
    const pairs: [string, string][] = [
        ['0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7', '0xf84830b73b2ed3c7267e7638f500110ea47fdf30'],
    ];
    const invalidPairs: [string, string][] = [['0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7', '123']];
    const rfqMaker = new RfqMaker({ makerId, chainId, updatedAt: null, pairs, rfqtUri: null, rfqmUri: null });

    let app: Express.Application;
    let server: Server;
    let mockRfqMakerService: RfqMakerService;

    before(async () => {
        const connection = mock(Connection);
        const configManagerMock = mock(ConfigManager);
        const mockRfqmService = mock(RfqmService);

        mockRfqMakerService = mock(RfqMakerService);
        when(mockRfqMakerService.mapMakerApiKeyToId(makerApiKey)).thenReturn(makerId);
        when(mockRfqMakerService.getRfqMakerAsync(makerId, chainId)).thenResolve(rfqMaker);
        when(
            mockRfqMakerService.createOrUpdateRfqMakerAsync(makerId, chainId, anything(), anything(), anything()),
        ).thenResolve(rfqMaker);

        // Start the server
        const res = await runHttpRfqmServiceAsync(
            mockRfqmService,
            instance(mockRfqMakerService),
            configManagerMock,
            config.defaultHttpServiceConfig,
            connection,
            false,
        );
        app = res.app;
        server = res.server;
    });

    beforeEach(() => {
        resetCalls(mockRfqMakerService);
    });

    after(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err?: Error) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    });

    describe('GET /maker/v1/chain-id/:chainId', async () => {
        it('should return a 401 UNAUTHORIZED without maker api key', async () => {
            const response = await request(app)
                .get(`${RFQ_MAKER_PATH}/chain-id/${chainId}`)
                .expect(HttpStatus.UNAUTHORIZED)
                .expect('Content-Type', /json/);

            expect(response.body.error).to.be.eq('Invalid api key.');
            verify(mockRfqMakerService.mapMakerApiKeyToId(undefined)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(anything(), anything())).never();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });

        it('should return a 401 UNAUTHORIZED with an unknown maker api key', async () => {
            const response = await request(app)
                .get(`${RFQ_MAKER_PATH}/chain-id/${chainId}`)
                .set(RFQ_MAKER_API_KEY_HEADER, unknownMakerApiKey)
                .expect(HttpStatus.UNAUTHORIZED)
                .expect('Content-Type', /json/);

            expect(response.body.error).to.be.eq('Invalid api key.');
            verify(mockRfqMakerService.mapMakerApiKeyToId(unknownMakerApiKey)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(anything(), anything())).never();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });

        it('should return a 400 BAD_REQUEST with an invalid chainId', async () => {
            const response = await request(app)
                .get(`${RFQ_MAKER_PATH}/chain-id/${invalidChainId}`)
                .set(RFQ_MAKER_API_KEY_HEADER, makerApiKey)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(response.body.error).to.be.eq('Invalid chainId.');
            verify(mockRfqMakerService.mapMakerApiKeyToId(makerApiKey)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(anything(), anything())).never();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });

        it('should return a 200 OK with active pairs', async () => {
            const response = await request(app)
                .get(`${RFQ_MAKER_PATH}/chain-id/${chainId}`)
                .set(RFQ_MAKER_API_KEY_HEADER, makerApiKey)
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            expect(response.body.makerId).to.be.eq(makerId);
            expect(response.body.chainId).to.be.eq(chainId);
            expect(response.body.pairs).to.deep.equal(pairs);
            verify(mockRfqMakerService.mapMakerApiKeyToId(makerApiKey)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(makerId, chainId)).once();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });
    });

    describe('PUT /maker/v1/chain-id/:chainId', async () => {
        it('should return a 401 UNAUTHORIZED without maker api key', async () => {
            const response = await request(app)
                .put(`${RFQ_MAKER_PATH}/chain-id/${chainId}`)
                .send({ pairs, rfqtUri: null, rfqmUri: null })
                .expect(HttpStatus.UNAUTHORIZED)
                .expect('Content-Type', /json/);

            expect(response.body.error).to.be.eq('Invalid api key.');
            verify(mockRfqMakerService.mapMakerApiKeyToId(undefined)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(anything(), anything())).never();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });

        it('should return a 401 UNAUTHORIZED with an unknown maker api key', async () => {
            const response = await request(app)
                .put(`${RFQ_MAKER_PATH}/chain-id/${chainId}`)
                .send({ pairs, rfqtUri: null, rfqmUri: null })
                .set(RFQ_MAKER_API_KEY_HEADER, unknownMakerApiKey)
                .expect(HttpStatus.UNAUTHORIZED)
                .expect('Content-Type', /json/);

            expect(response.body.error).to.be.eq('Invalid api key.');
            verify(mockRfqMakerService.mapMakerApiKeyToId(unknownMakerApiKey)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(anything(), anything())).never();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });

        it('should return a 400 BAD_REQUEST with an invalid chainId', async () => {
            const response = await request(app)
                .put(`${RFQ_MAKER_PATH}/chain-id/${invalidChainId}`)
                .send({ pairs, rfqtUri: null, rfqmUri: null })
                .set(RFQ_MAKER_API_KEY_HEADER, makerApiKey)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(response.body.error).to.be.eq('Invalid chainId.');
            verify(mockRfqMakerService.mapMakerApiKeyToId(makerApiKey)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(anything(), anything())).never();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });

        it('should return a 400 BAD_REQUEST with an invalid pairs payload', async () => {
            const response = await request(app)
                .put(`${RFQ_MAKER_PATH}/chain-id/${chainId}`)
                .send({ pairs: invalidPairs, rfqtUri: null, rfqmUri: null })
                .set(RFQ_MAKER_API_KEY_HEADER, makerApiKey)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(response.body.error).to.be.eq('address of second token for pair 0 is invalid.');
            verify(mockRfqMakerService.mapMakerApiKeyToId(makerApiKey)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(anything(), anything())).never();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });

        it('should return a 201 CREATED on a valid PUT', async () => {
            const response = await request(app)
                .put(`${RFQ_MAKER_PATH}/chain-id/${chainId}`)
                .send({ pairs, rfqtUri: null, rfqmUri: null })
                .set(RFQ_MAKER_API_KEY_HEADER, makerApiKey)
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            expect(response.body.makerId).to.be.eq(makerId);
            expect(response.body.chainId).to.be.eq(chainId);
            expect(response.body.pairs).to.deep.equal(pairs);
            verify(mockRfqMakerService.mapMakerApiKeyToId(makerApiKey)).once();
            verify(mockRfqMakerService.getRfqMakerAsync(anything(), anything())).never();
            verify(
                mockRfqMakerService.createOrUpdateRfqMakerAsync(makerId, chainId, anything(), anything(), anything()),
            ).once();
        });
    });
});
