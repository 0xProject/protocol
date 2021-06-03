// tslint:disable:max-file-line-count
import {
    BigNumber,
    MockedRfqQuoteResponse,
    ProtocolFeeUtils,
    QuoteRequestor,
    RfqMakerAssetOfferings,
    rfqtMocker,
    RfqtQuoteEndpoint,
    SignatureType,
} from '@0x/asset-swapper';
import { ContractAddresses } from '@0x/contract-addresses';
import { expect } from '@0x/contracts-test-utils';
import { MetaTransaction, MetaTransactionFields } from '@0x/protocol-utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import Axios, { AxiosInstance } from 'axios';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import 'mocha';
import { Producer } from 'sqs-producer';
import * as request from 'supertest';
import { anything, instance, mock, when } from 'ts-mockito';
import { Connection } from 'typeorm';

import * as config from '../src/config';
import { RFQM_PATH } from '../src/constants';
import { getDBConnectionAsync } from '../src/db_connection';
import { RfqmJobEntity, RfqmQuoteEntity } from '../src/entities';
import { runHttpRfqmServiceAsync } from '../src/runners/http_rfqm_service_runner';
import { RfqmService, RfqmTypes } from '../src/services/rfqm_service';
import { ConfigManager } from '../src/utils/config_manager';
import { RfqmOrderTypes, StoredFee, StoredOrder, storedOrderToRfqmOrder } from '../src/utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../src/utils/rfq_blockchain_utils';

import { CONTRACT_ADDRESSES, getProvider, NULL_ADDRESS } from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';

// Force reload of the app avoid variables being polluted between test suites
delete require.cache[require.resolve('../src/app')];

const SUITE_NAME = 'RFQM Integration Tests';
const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';
const API_KEY = 'koolApiKey';
const contractAddresses: ContractAddresses = CONTRACT_ADDRESSES;

// RFQM Market Maker request specific constants
const MARKET_MAKER_1 = 'https://mock-rfqt1.club';
const MARKET_MAKER_2 = 'https://mock-rfqt2.club';
const BASE_RFQM_REQUEST_PARAMS = {
    txOrigin: MOCK_WORKER_REGISTRY_ADDRESS,
    takerAddress: NULL_ADDRESS,
    protocolVersion: '4',
    comparisonPrice: undefined,
    isLastLook: 'true',
    feeToken: contractAddresses.etherToken,
    feeAmount: '16500000',
    feeType: 'fixed',
};
const MOCK_META_TX_CALL_DATA = '0x123';
const VALID_SIGNATURE = { v: 28, r: '0x', s: '0x', signatureType: SignatureType.EthSign };
const SAFE_EXPIRY = '1903620548';
describe(SUITE_NAME, () => {
    let takerAddress: string;
    let makerAddress: string;
    let axiosClient: AxiosInstance;
    let app: Express.Application;
    let server: Server;
    let connection: Connection;

    before(async () => {
        // docker-compose up
        await setupDependenciesAsync(SUITE_NAME);

        // Create a Provider
        const provider = getProvider();
        const web3Wrapper = new Web3Wrapper(provider);
        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        [makerAddress, takerAddress] = accounts;

        // Build dependencies
        // Create the mock ProtocolFeeUtils
        const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
        when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(100));
        const protocolFeeUtils = instance(protocolFeeUtilsMock);

        // Create the mock ConfigManager
        const configManagerMock = mock(ConfigManager);
        when(configManagerMock.getRfqmApiKeyWhitelist()).thenReturn(new Set([API_KEY]));
        const configManager = instance(configManagerMock);

        // Create Axios client
        axiosClient = Axios.create();

        // Mock config for the asset offerings in this test
        const mockAssetOfferings: RfqMakerAssetOfferings = {
            [MARKET_MAKER_1]: [[contractAddresses.zrxToken, contractAddresses.etherToken]],
            [MARKET_MAKER_2]: [[contractAddresses.zrxToken, contractAddresses.etherToken]],
        };

        // Build QuoteRequestor, note that Axios client it accessible outside of this scope
        const quoteRequestor = new QuoteRequestor({}, mockAssetOfferings, axiosClient);

        // Create the mock rfqBlockchainUtils
        const validationResponse: [BigNumber, BigNumber] = [new BigNumber(1), new BigNumber(1)];
        const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
        when(
            rfqBlockchainUtilsMock.generateMetaTransaction(anything(), anything(), anything(), anything(), anything()),
        ).thenCall((_rfqOrder, _signature, _taker, _takerAmount, chainId) => new MetaTransaction({ chainId }));
        when(rfqBlockchainUtilsMock.generateMetaTransactionCallData(anything(), anything())).thenReturn(
            MOCK_META_TX_CALL_DATA,
        );
        when(rfqBlockchainUtilsMock.generateMetaTransactionCallData(anything(), anything())).thenReturn(
            MOCK_META_TX_CALL_DATA,
        );
        when(
            rfqBlockchainUtilsMock.validateMetaTransactionOrThrowAsync(anything(), anything(), anything(), anything()),
        ).thenResolve(validationResponse);
        const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);

        interface SqsResponse {
            Id: string;
            MD5OfMessageBody: string;
            MessageId: string;
        }
        const sqsResponse: SqsResponse[] = [
            {
                Id: 'id',
                MD5OfMessageBody: 'MD5OfMessageBody',
                MessageId: 'MessageId',
            },
        ];

        // Create the mock sqsProducer
        const sqsProducerMock = mock(Producer);
        when(sqsProducerMock.send(anything())).thenResolve(sqsResponse);
        const sqsProducer = instance(sqsProducerMock);

        connection = await getDBConnectionAsync();
        await connection.synchronize(true);

        const rfqmService = new RfqmService(
            quoteRequestor,
            protocolFeeUtils,
            contractAddresses,
            MOCK_WORKER_REGISTRY_ADDRESS,
            rfqBlockchainUtils,
            connection,
            sqsProducer,
        );

        // Start the server
        const res = await runHttpRfqmServiceAsync(
            rfqmService,
            configManager,
            config.defaultHttpServiceConfig,
            connection,
        );
        app = res.app;
        server = res.server;
    });

    beforeEach(async () => {
        await connection.query('TRUNCATE TABLE rfqm_quotes CASCADE;');
        await connection.query('TRUNCATE TABLE rfqm_jobs CASCADE;');
    });

    after(async () => {
        await connection.query('TRUNCATE TABLE rfqm_quotes CASCADE;');
        await connection.query('TRUNCATE TABLE rfqm_jobs CASCADE;');
        await new Promise<void>((resolve, reject) => {
            server.close((err?: Error) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('rfqm/v1/price', async () => {
        it('should return a 200 OK with an indicative quote for sells', async () => {
            const sellAmount = 100000000000000000;
            const winningQuote = 200000000000000000;
            const losingQuote = 150000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            const expectedPrice = '2';
            return rfqtMocker.withMockedRfqtQuotes(
                [
                    {
                        // Quote from MM 1
                        endpoint: MARKET_MAKER_1,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            makerAmount: losingQuote.toString(),
                            takerAmount: sellAmount.toString(),
                            makerToken: contractAddresses.zrxToken,
                            takerToken: contractAddresses.etherToken,
                            expiry: '1903620548', // in the year 2030
                        },
                    },
                    {
                        // Quote from MM 2
                        endpoint: MARKET_MAKER_2,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            makerAmount: winningQuote.toString(),
                            takerAmount: sellAmount.toString(),
                            makerToken: contractAddresses.zrxToken,
                            takerToken: contractAddresses.etherToken,
                            expiry: '1903620548', // in the year 2030
                        },
                    },
                ] as MockedRfqQuoteResponse[],
                RfqtQuoteEndpoint.Indicative,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/price?${params.toString()}`)
                        .set('0x-api-key', API_KEY)
                        .expect(HttpStatus.OK)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.price).to.equal(expectedPrice);
                },
                axiosClient,
            );
        });

        it('should return a 200 OK with an indicative quote for buys', async () => {
            const buyAmount = 200000000000000000;
            const winningQuote = 100000000000000000;
            const losingQuote = 150000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                buyAmount: buyAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            const expectedPrice = '0.5';
            return rfqtMocker.withMockedRfqtQuotes(
                [
                    {
                        // Quote from MM 1
                        endpoint: MARKET_MAKER_1,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            buyAmountBaseUnits: buyAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            makerAmount: buyAmount.toString(),
                            takerAmount: losingQuote.toString(),
                            makerToken: contractAddresses.zrxToken,
                            takerToken: contractAddresses.etherToken,
                            expiry: '1903620548', // in the year 2030
                        },
                    },
                    {
                        // Quote from MM 2
                        endpoint: MARKET_MAKER_2,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            buyAmountBaseUnits: buyAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            makerAmount: buyAmount.toString(),
                            takerAmount: winningQuote.toString(),
                            makerToken: contractAddresses.zrxToken,
                            takerToken: contractAddresses.etherToken,
                            expiry: '1903620548', // in the year 2030
                        },
                    },
                ] as MockedRfqQuoteResponse[],
                RfqtQuoteEndpoint.Indicative,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/price?${params.toString()}`)
                        .set('0x-api-key', API_KEY)
                        .expect(HttpStatus.OK)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.price).to.equal(expectedPrice);
                },
                axiosClient,
            );
        });

        it('should return a 404 NOT FOUND Error if no valid quotes found', async () => {
            const sellAmount = 100000000000000000;
            const quotedAmount = 200000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            return rfqtMocker.withMockedRfqtQuotes(
                [
                    {
                        // Quote from MM 1
                        endpoint: MARKET_MAKER_1,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            makerAmount: quotedAmount.toString(),
                            takerAmount: sellAmount.toString(),
                            makerToken: contractAddresses.zrxToken,
                            takerToken: contractAddresses.etherToken,
                            expiry: '0', // already expired
                        },
                    },
                    {
                        // Quote from MM 2
                        endpoint: MARKET_MAKER_2,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            makerAmount: quotedAmount.toString(),
                            takerAmount: sellAmount.toString(),
                            makerToken: contractAddresses.zrxToken,
                            takerToken: contractAddresses.etherToken,
                            expiry: '0', // already expired
                        },
                    },
                ] as MockedRfqQuoteResponse[],
                RfqtQuoteEndpoint.Indicative,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/price?${params.toString()}`)
                        .set('0x-api-key', API_KEY)
                        .expect(HttpStatus.NOT_FOUND)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.reason).to.equal('Not Found');
                },
                axiosClient,
            );
        });

        it('should return a 400 BAD REQUEST if API Key is not permitted access', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            return rfqtMocker.withMockedRfqtQuotes(
                [],
                RfqtQuoteEndpoint.Indicative,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/price?${params.toString()}`)
                        .set('0x-api-key', 'unknown-key')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.reason).to.equal('Invalid API key');
                },
                axiosClient,
            );
        });

        it('should return a 400 BAD REQUEST Validation Error if sending ETH, not WETH', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'ETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            return rfqtMocker.withMockedRfqtQuotes(
                [],
                RfqtQuoteEndpoint.Indicative,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/price?${params.toString()}`)
                        .set('0x-api-key', API_KEY)
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.reason).to.equal('Validation Failed');
                    expect(appResponse.body.validationErrors[0].reason).to.equal(
                        'Unwrapped Native Asset is not supported. Use WETH instead',
                    );
                },
                axiosClient,
            );
        });

        it('should return a 400 BAD REQUEST Error if trading an unknown token', async () => {
            const sellAmount = 100000000000000000;
            const UNKNOWN_TOKEN = 'RACCOONS_FOREVER';
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: UNKNOWN_TOKEN,
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            return rfqtMocker.withMockedRfqtQuotes(
                [],
                RfqtQuoteEndpoint.Indicative,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/price?${params.toString()}`)
                        .set('0x-api-key', API_KEY)
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.reason).to.equal('Validation Failed');
                    expect(appResponse.body.validationErrors[0].reason).to.equal(
                        `Token ${UNKNOWN_TOKEN} is currently unsupported`,
                    );
                },
                axiosClient,
            );
        });

        it('should return a 500 Internal Server Error if something crashes', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            return rfqtMocker.withMockedRfqtQuotes(
                [
                    {
                        // Bogus error from MM 1
                        endpoint: MARKET_MAKER_1,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 500,
                        responseData: {
                            makerAmount: {},
                            takerAmount: {},
                            makerToken: {},
                            takerToken: {},
                            expiry: {},
                        },
                    },
                    {
                        // Bogus error from MM 2
                        endpoint: MARKET_MAKER_2,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 500,
                        responseData: {
                            makerAmount: {},
                            takerAmount: {},
                            makerToken: {},
                            takerToken: {},
                            expiry: {},
                        },
                    },
                ] as MockedRfqQuoteResponse[],
                RfqtQuoteEndpoint.Indicative,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/price?${params.toString()}`)
                        .set('0x-api-key', API_KEY)
                        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.reason).to.equal('Server Error');
                },
                axiosClient,
            );
        });
    });

    describe('rfqm/v1/quote', async () => {
        it('should return a 200 OK with a firm quote for sells', async () => {
            const sellAmount = 100000000000000000;
            const winningQuote = 200000000000000000;
            const losingQuote = 150000000000000000;

            const BASE_SIGNED_ORDER = {
                maker: makerAddress,
                taker: takerAddress,
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                pool: '0x1234',
                salt: '0',
                chainId: 1337,
                verifyingContract: '0xd209925defc99488e3afff1174e48b4fa628302a',
                txOrigin: MOCK_WORKER_REGISTRY_ADDRESS,
                expiry: new BigNumber('1903620548'),
            };

            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            const expectedPrice = '2';
            return rfqtMocker.withMockedRfqtQuotes(
                [
                    {
                        // Quote from MM 1
                        endpoint: MARKET_MAKER_1,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            takerAddress,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            signedOrder: {
                                ...BASE_SIGNED_ORDER,
                                makerAmount: winningQuote,
                                takerAmount: sellAmount,
                                signature: {
                                    ...VALID_SIGNATURE,
                                },
                            },
                        },
                    },
                    {
                        // Quote from MM 2
                        endpoint: MARKET_MAKER_2,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            takerAddress,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            signedOrder: {
                                ...BASE_SIGNED_ORDER,
                                makerAmount: losingQuote,
                                takerAmount: sellAmount,
                                signature: {
                                    ...VALID_SIGNATURE,
                                    r: '0xb1',
                                    s: '0xb2',
                                },
                            },
                        },
                    },
                ] as MockedRfqQuoteResponse[],
                RfqtQuoteEndpoint.Firm,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/quote?${params.toString()}`)
                        .set('0x-api-key', API_KEY)
                        .expect(HttpStatus.OK)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.price).to.equal(expectedPrice);
                    expect(appResponse.body.metaTransactionHash).to.match(/^0x[0-9a-fA-F]+/);
                    expect(appResponse.body.orderHash).to.match(/^0x[0-9a-fA-F]+/);

                    const repositoryResponse = await connection.getRepository(RfqmQuoteEntity).findOne({
                        orderHash: appResponse.body.orderHash,
                    });
                    expect(repositoryResponse).to.not.be.null();
                    expect(repositoryResponse?.orderHash).to.equal(appResponse.body.orderHash);
                    expect(repositoryResponse?.makerUri).to.equal(MARKET_MAKER_1);
                },
                axiosClient,
            );
        });

        it('should return a 404 NOT FOUND if no valid firm quotes found', async () => {
            const sellAmount = 100000000000000000;
            const insufficientSellAmount = 1;

            const BASE_SIGNED_ORDER = {
                maker: makerAddress,
                taker: takerAddress,
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                pool: '0x1234',
                salt: '0',
                chainId: 1,
                verifyingContract: '0xd209925defc99488e3afff1174e48b4fa628302a',
                txOrigin: MOCK_WORKER_REGISTRY_ADDRESS,
                expiry: new BigNumber('1903620548'),
            };

            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            return rfqtMocker.withMockedRfqtQuotes(
                [
                    {
                        // Quote from MM 1
                        endpoint: MARKET_MAKER_1,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            takerAddress,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            signedOrder: {
                                ...BASE_SIGNED_ORDER,
                                makerAmount: insufficientSellAmount,
                                takerAmount: insufficientSellAmount,
                                signature: {
                                    ...VALID_SIGNATURE,
                                },
                            },
                        },
                    },
                    {
                        // Quote from MM 2
                        endpoint: MARKET_MAKER_2,
                        requestApiKey: API_KEY,
                        requestParams: {
                            ...BASE_RFQM_REQUEST_PARAMS,
                            takerAddress,
                            sellAmountBaseUnits: sellAmount.toString(),
                            buyTokenAddress: contractAddresses.zrxToken,
                            sellTokenAddress: contractAddresses.etherToken,
                        },
                        responseCode: 200,
                        responseData: {
                            signedOrder: {
                                ...BASE_SIGNED_ORDER,
                                makerAmount: insufficientSellAmount,
                                takerAmount: insufficientSellAmount,
                                signature: {
                                    ...VALID_SIGNATURE,
                                    r: '0xb1',
                                    s: '0xb2',
                                },
                            },
                        },
                    },
                ] as MockedRfqQuoteResponse[],
                RfqtQuoteEndpoint.Firm,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/quote?${params.toString()}`)
                        .set('0x-api-key', API_KEY)
                        .expect(HttpStatus.NOT_FOUND)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.reason).to.equal('Not Found');
                },
                axiosClient,
            );
        });

        it('should return a 400 BAD REQUEST if api key is missing', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            return rfqtMocker.withMockedRfqtQuotes(
                [] as MockedRfqQuoteResponse[],
                RfqtQuoteEndpoint.Firm,
                async () => {
                    const appResponse = await request(app)
                        .get(`${RFQM_PATH}/quote?${params.toString()}`)
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.reason).to.equal('Invalid API key');
                },
                axiosClient,
            );
        });
    });

    describe('rfqm/v1/submit', async () => {
        const createMockMetaTx = (overrideFields?: Partial<MetaTransactionFields>): MetaTransaction => {
            return new MetaTransaction({
                signer: '0x123',
                sender: '0x123',
                minGasPrice: new BigNumber('123'),
                maxGasPrice: new BigNumber('123'),
                expirationTimeSeconds: new BigNumber(SAFE_EXPIRY),
                salt: new BigNumber('123'),
                callData: '0x123',
                value: new BigNumber('123'),
                feeToken: '0x123',
                feeAmount: new BigNumber('123'),
                chainId: 1337,
                verifyingContract: '0x123',
                ...overrideFields,
            });
        };
        const mockStoredFee: StoredFee = {
            token: '0x123',
            amount: '1000',
            type: 'fixed',
        };
        const mockStoredOrder: StoredOrder = {
            type: RfqmOrderTypes.V4Rfq,
            order: {
                txOrigin: '0x123',
                maker: '0x123',
                taker: '0x123',
                makerToken: '0x123',
                takerToken: '0x123',
                makerAmount: '1',
                takerAmount: '1',
                pool: '0x1234',
                expiry: SAFE_EXPIRY,
                salt: '1000',
                chainId: '1337',
                verifyingContract: '0x123',
            },
        };
        it('should return status 201 created and queue up a job with a successful request', async () => {
            const mockMetaTx = createMockMetaTx();
            const order = storedOrderToRfqmOrder(mockStoredOrder);
            const mockQuote = new RfqmQuoteEntity({
                orderHash: order.getHash(),
                metaTransactionHash: mockMetaTx.getHash(),
                makerUri: MARKET_MAKER_1,
                fee: mockStoredFee,
                order: mockStoredOrder,
                chainId: 1337,
            });

            // write a corresponding quote entity to validate against
            await connection.getRepository(RfqmQuoteEntity).insert(mockQuote);

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction: mockMetaTx, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            expect(appResponse.body.metaTransactionHash).to.match(/^0x[0-9a-fA-F]+/);
            expect(appResponse.body.orderHash).to.match(/^0x[0-9a-fA-F]+/);

            const dbJobEntity = await connection.getRepository(RfqmJobEntity).findOne({
                metaTransactionHash: mockMetaTx.getHash(),
            });
            expect(dbJobEntity).to.not.be.null();
            expect(dbJobEntity?.orderHash).to.equal(mockQuote.orderHash);
            expect(dbJobEntity?.makerUri).to.equal(MARKET_MAKER_1);
        });
        it('should return status 404 not found if there is not a pre-existing quote', async () => {
            const mockMetaTx = createMockMetaTx();

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction: mockMetaTx, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.NOT_FOUND)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Not Found');
        });
        it('should return a 400 BAD REQUEST Error the type is not supported', async () => {
            const mockMetaTx = createMockMetaTx();
            const invalidType = 'v10rfq';

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: invalidType, metaTransaction: mockMetaTx, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
            expect(appResponse.body.validationErrors[0].reason).to.equal(
                `${invalidType} is an invalid value for 'type'`,
            );
        });
        it('should fail with status code 500 if a quote has already been submitted', async () => {
            const mockMetaTx = createMockMetaTx();
            const order = storedOrderToRfqmOrder(mockStoredOrder);
            const mockQuote = new RfqmQuoteEntity({
                orderHash: order.getHash(),
                metaTransactionHash: mockMetaTx.getHash(),
                makerUri: MARKET_MAKER_1,
                fee: mockStoredFee,
                order: mockStoredOrder,
                chainId: 1337,
            });
            await connection.getRepository(RfqmQuoteEntity).insert(mockQuote);

            await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction: mockMetaTx, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            // try to submit again
            await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction: mockMetaTx, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.INTERNAL_SERVER_ERROR)
                .expect('Content-Type', /json/);
        });
        it('should fail with 400 BAD REQUEST if meta tx is too close to expiration', async () => {
            const mockMetaTx = createMockMetaTx({ expirationTimeSeconds: new BigNumber(1) });
            const order = storedOrderToRfqmOrder(mockStoredOrder);
            const mockQuote = new RfqmQuoteEntity({
                orderHash: order.getHash(),
                metaTransactionHash: mockMetaTx.getHash(),
                makerUri: MARKET_MAKER_1,
                fee: mockStoredFee,
                order: mockStoredOrder,
                chainId: 1337,
            });
            await connection.getRepository(RfqmQuoteEntity).insert(mockQuote);

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction: mockMetaTx, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
            expect(appResponse.body.validationErrors[0].reason).to.equal(`metatransaction will expire too soon`);
        });
    });
});
