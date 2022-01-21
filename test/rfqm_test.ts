// tslint:disable:max-file-line-count custom-no-magic-numbers
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
import { expect, randomAddress } from '@0x/contracts-test-utils';
import { MetaTransaction, MetaTransactionFields, RfqOrder } from '@0x/protocol-utils';
import { generatePseudoRandom256BitNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import Axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { TransactionReceiptStatus } from 'ethereum-types';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import 'mocha';
import * as redis from 'redis';
import { Producer } from 'sqs-producer';
import * as request from 'supertest';
import { anyString, anything, instance, mock, when } from 'ts-mockito';
import { Connection } from 'typeorm';

import * as config from '../src/config';
import { ETH_DECIMALS, RFQM_PATH } from '../src/constants';
import { RfqmJobEntity, RfqmQuoteEntity, RfqmTransactionSubmissionEntity } from '../src/entities';
import { RfqmJobStatus, RfqmOrderTypes, StoredFee, StoredOrder } from '../src/entities/RfqmJobEntity';
import { RfqmTransactionSubmissionStatus } from '../src/entities/RfqmTransactionSubmissionEntity';
import { runHttpRfqmServiceAsync } from '../src/runners/http_rfqm_service_runner';
import { BLOCK_FINALITY_THRESHOLD, RfqmService, RfqmTypes } from '../src/services/rfqm_service';
import { CacheClient } from '../src/utils/cache_client';
import { ConfigManager } from '../src/utils/config_manager';
import { QuoteServerClient } from '../src/utils/quote_server_client';
import { RfqmDbUtils, storedOrderToRfqmOrder } from '../src/utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../src/utils/rfq_blockchain_utils';

import {
    CHAIN_ID,
    CONTRACT_ADDRESSES,
    getProvider,
    MATCHA_AFFILIATE_ADDRESS,
    NULL_ADDRESS,
    TEST_DECODED_RFQ_ORDER_FILLED_EVENT_LOG,
    TEST_RFQ_ORDER_FILLED_EVENT_LOG,
} from './constants';
import { initDBConnectionAsync } from './utils/db_connection';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';

// Force reload of the app avoid variables being polluted between test suites
delete require.cache[require.resolve('../src/app')];

const SUITE_NAME = 'RFQM Integration Tests';
const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';
const API_KEY = 'koolApiKey';
const INTEGRATOR_ID = 'koolIntegratorId';
const contractAddresses: ContractAddresses = CONTRACT_ADDRESSES;
const WORKER_FULL_BALANCE_WEI = new BigNumber(1).shiftedBy(ETH_DECIMALS);

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
const NONCE = 1;
const GAS_ESTIMATE = 165000;
const WORKER_ADDRESS = '0xaWorkerAddress';
const FIRST_TRANSACTION_HASH = '0xfirstTxHash';
const FIRST_SIGNED_TRANSACTION = '0xfirstSignedTransaction';
const TX_STATUS: TransactionReceiptStatus = 1;
const GAS_PRICE = new BigNumber(100);
// it's over 9K
const MINED_BLOCK = 9001;
// the tx should be finalized
const CURRENT_BLOCK = MINED_BLOCK + BLOCK_FINALITY_THRESHOLD;
const MOCK_EXCHANGE_PROXY = '0xtheExchangeProxy';
const EXPECTED_FILL_AMOUNT = new BigNumber(9000);
const SUCCESSFUL_TRANSACTION_RECEIPT = {
    blockHash: '0xaBlockHash',
    blockNumber: MINED_BLOCK,
    contractAddress: null,
    cumulativeGasUsed: 150000,
    from: WORKER_ADDRESS,
    gasUsed: GAS_ESTIMATE,
    logs: [TEST_RFQ_ORDER_FILLED_EVENT_LOG],
    status: TX_STATUS,
    to: MOCK_EXCHANGE_PROXY,
    transactionHash: FIRST_TRANSACTION_HASH,
    transactionIndex: 5,
};
const TEST_TRANSACTION_WATCHER_SLEEP_MS = 500;

const MOCK_RFQM_JOB: RfqmJobEntity = {
    calldata:
        '0xaa77476c000000000000000000000000374a16f5e686c09b0cc9e8bc3466b3b645c74aa7000000000000000000000000f84830b73b2ed3c7267e7638f500110ea47fdf30000000000000000000000000000000000000000000000000002356870546ced00000000000000000000000000000000000000000000000015af1d78b58c4000100000000000000000000000006754422cf9f54ae0e67d42fd788b33d8eb4c5d500000000000000000000000006652bdd5a8eb3d206caedd6b95b61f820abb9b1000000000000000000000000a85795b9b37e200c67398d7796ab301a838f539d00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060c2a83100000000000000000000000000000000000000000000000000000179f85d57800000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000001c45c3a18bfafd33f71ac9b53d29a69d550ea5429bb6eafce9c0f8f9c4c253e5d45056b83e5b7eeb97629144760dcdccc4eeb09c1d215f8ebededeb790a2277d070000000000000000000000000000000000000000000000015af1d78b58c40001',
    chainId: 1337,
    createdAt: new Date(),
    expiry: new BigNumber(Date.now()),
    fee: {
        amount: '1000',
        token: '0x123',
        type: 'fixed',
    },
    integratorId: null,
    makerUri: MARKET_MAKER_1,
    metadata: null,
    metaTransactionHash: '0xd2fb3c7e481ff79fde1692d5ab0ecdf6a1d9e2ec57a789683adac9e0aa620860',
    order: {
        order: {
            chainId: '1337',
            expiry: SAFE_EXPIRY,
            maker: '0x123',
            makerAmount: '1',
            makerToken: '0x123',
            pool: '0x1234',
            salt: '1000',
            taker: '0x123',
            takerAmount: '1',
            takerToken: '0x123',
            txOrigin: '0x123',
            verifyingContract: '0x123',
        },
        type: RfqmOrderTypes.V4Rfq,
    },
    orderHash: '0x288d4d771179738ee9ca60f14df74612fb1ca43dfbc3bbb49dd9226a19747c11',
    status: RfqmJobStatus.PendingSubmitted,
    updatedAt: new Date(),
    isCompleted: false,
    workerAddress: null,
    lastLookResult: null,
    affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
};

describe(SUITE_NAME, () => {
    let takerAddress: string;
    let makerAddress: string;
    let axiosClient: AxiosInstance;
    let app: Express.Application;
    let server: Server;
    let connection: Connection;
    let rfqmService: RfqmService;
    let dbUtils: RfqmDbUtils;
    let cacheClient: CacheClient;

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
        when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(GAS_PRICE);
        const protocolFeeUtils = instance(protocolFeeUtilsMock);

        // Create the mock ConfigManager
        const configManagerMock = mock(ConfigManager);
        when(configManagerMock.getRfqmApiKeyWhitelist()).thenReturn(new Set([API_KEY]));
        when(configManagerMock.getIntegratorIdForApiKey(API_KEY)).thenReturn(INTEGRATOR_ID);
        when(configManagerMock.getIntegratorByIdOrThrow(INTEGRATOR_ID)).thenReturn({
            integratorId: INTEGRATOR_ID,
            apiKeys: [API_KEY],
            label: 'Test',
            rfqm: true,
            plp: false,
            rfqt: false,
        });
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
        when(rfqBlockchainUtilsMock.generateMetaTransactionCallData(anything(), anything(), anything())).thenReturn(
            MOCK_META_TX_CALL_DATA,
        );
        when(
            rfqBlockchainUtilsMock.validateMetaTransactionOrThrowAsync(anything(), anything(), anything(), anything()),
        ).thenResolve(validationResponse);
        when(rfqBlockchainUtilsMock.getNonceAsync(anything())).thenResolve(NONCE);
        when(rfqBlockchainUtilsMock.estimateGasForExchangeProxyCallAsync(anything(), anything())).thenResolve(
            GAS_ESTIMATE,
        );
        when(rfqBlockchainUtilsMock.signTransactionAsync(anything())).thenResolve({
            signedTransaction: FIRST_SIGNED_TRANSACTION,
            transactionHash: FIRST_TRANSACTION_HASH,
        });
        when(rfqBlockchainUtilsMock.submitSignedTransactionAsync(FIRST_SIGNED_TRANSACTION)).thenResolve(
            FIRST_TRANSACTION_HASH,
        );
        when(rfqBlockchainUtilsMock.submitCallDataToExchangeProxyAsync(anything(), anything(), anything())).thenResolve(
            FIRST_TRANSACTION_HASH,
        );
        when(rfqBlockchainUtilsMock.getTransactionReceiptIfExistsAsync(FIRST_TRANSACTION_HASH)).thenResolve(
            SUCCESSFUL_TRANSACTION_RECEIPT,
        );
        when(rfqBlockchainUtilsMock.getCurrentBlockAsync()).thenResolve(CURRENT_BLOCK);
        when(rfqBlockchainUtilsMock.getExchangeProxyAddress()).thenReturn(MOCK_EXCHANGE_PROXY);
        when(rfqBlockchainUtilsMock.getTakerTokenFillAmountFromMetaTxCallData(anything())).thenReturn(
            EXPECTED_FILL_AMOUNT,
        );
        when(
            rfqBlockchainUtilsMock.decodeMetaTransactionCallDataAndValidateAsync(anyString(), anyString(), anything()),
        ).thenResolve(validationResponse);
        when(rfqBlockchainUtilsMock.getDecodedRfqOrderFillEventLogFromLogs(anything())).thenReturn(
            TEST_DECODED_RFQ_ORDER_FILLED_EVENT_LOG,
        );
        when(rfqBlockchainUtilsMock.getAccountBalanceAsync(MOCK_WORKER_REGISTRY_ADDRESS)).thenResolve(
            WORKER_FULL_BALANCE_WEI,
        );
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

        // Create the dbUtils
        connection = await initDBConnectionAsync();
        dbUtils = new RfqmDbUtils(connection);

        // Create the mock sqsProducer
        const sqsProducerMock = mock(Producer);
        when(sqsProducerMock.send(anything())).thenResolve(sqsResponse);
        when(sqsProducerMock.queueSize()).thenResolve(0);
        const sqsProducer = instance(sqsProducerMock);

        // Create the quote server client
        const quoteServerClient = new QuoteServerClient(axiosClient);

        // Create the CacheClient
        const redisClient = redis.createClient({
            url: config.REDIS_URI,
        });
        cacheClient = new CacheClient(redisClient);

        rfqmService = new RfqmService(
            quoteRequestor,
            protocolFeeUtils,
            contractAddresses,
            MOCK_WORKER_REGISTRY_ADDRESS,
            rfqBlockchainUtils,
            dbUtils,
            sqsProducer,
            quoteServerClient,
            TEST_TRANSACTION_WATCHER_SLEEP_MS,
            cacheClient,
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
        await connection.query('TRUNCATE TABLE rfqm_transaction_submissions CASCADE;');
    });

    after(async () => {
        await connection.query('TRUNCATE TABLE rfqm_quotes CASCADE;');
        await connection.query('TRUNCATE TABLE rfqm_jobs CASCADE;');
        await connection.query('TRUNCATE TABLE rfqm_transaction_submissions CASCADE;');
        await new Promise<void>((resolve, reject) => {
            server.close((err?: Error) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
        await cacheClient.closeAsync();
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('rfqm/v1/healthz', async () => {
        it('should return a 200 OK with active pairs', async () => {
            const appResponse = await request(app)
                .get(`${RFQM_PATH}/healthz`)
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);
            expect(appResponse.body.pairs[0][0]).to.equal('0x0b1ba0af832d7c05fd64161e0db78e85978e8082');
            expect(appResponse.body.pairs[0][1]).to.equal('0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c');
        });
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
                        requestApiKey: INTEGRATOR_ID,
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
                        requestApiKey: INTEGRATOR_ID,
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
                        requestApiKey: INTEGRATOR_ID,
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
                        requestApiKey: INTEGRATOR_ID,
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

        it('should return a 200 OK, liquidityAvailable === false if no valid quotes found', async () => {
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
                        requestApiKey: INTEGRATOR_ID,
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
                        requestApiKey: INTEGRATOR_ID,
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
                        .expect(HttpStatus.OK)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.liquidityAvailable).to.equal(false);
                    expect(appResponse.body.price).to.equal(undefined);
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
                        requestApiKey: INTEGRATOR_ID,
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
                        requestApiKey: INTEGRATOR_ID,
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
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
            });

            const expectedPrice = '2';
            return rfqtMocker.withMockedRfqtQuotes(
                [
                    {
                        // Quote from MM 1
                        endpoint: MARKET_MAKER_1,
                        requestApiKey: INTEGRATOR_ID,
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
                        requestApiKey: INTEGRATOR_ID,
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
                    expect(repositoryResponse?.affiliateAddress).to.equal(MATCHA_AFFILIATE_ADDRESS);
                },
                axiosClient,
            );
        });

        it('should return a 200 OK, liquidityAvailable === false if no valid firm quotes found', async () => {
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
                        requestApiKey: INTEGRATOR_ID,
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
                        requestApiKey: INTEGRATOR_ID,
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
                        .expect(HttpStatus.OK)
                        .expect('Content-Type', /json/);

                    expect(appResponse.body.liquidityAvailable).to.equal(false);
                    expect(appResponse.body.price).to.equal(undefined);
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
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
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
            expect(dbJobEntity?.affiliateAddress).to.equal(MATCHA_AFFILIATE_ADDRESS);
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

    describe('rfqm/v1/status/:orderHash', () => {
        it('should return a 404 NOT FOUND if the order hash is not found', () => {
            const orderHash = '0x00';
            return request(app)
                .get(`${RFQM_PATH}/status/${orderHash}`)
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.NOT_FOUND);
        });

        it('should return a 200 when the order exists', async () => {
            await dbUtils.writeRfqmJobToDbAsync(MOCK_RFQM_JOB);

            const response = await request(app)
                .get(`${RFQM_PATH}/status/${MOCK_RFQM_JOB.orderHash}`)
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            // Response details are covered by the service test, but do one small check for sanity
            expect(response.body.status).to.equal('submitted');
        });
    });

    describe('completeSubmissionLifecycleAsync', async () => {
        const callData = '0x123';
        const orderHash = '0xanOrderHash';

        it('should successfully process a transaction', async () => {
            await dbUtils.writeRfqmJobToDbAsync({
                ...MOCK_RFQM_JOB,
                orderHash,
                calldata: callData,
            });
            await rfqmService.completeSubmissionLifecycleAsync(orderHash, WORKER_ADDRESS, callData);

            // find the saved results
            const dbSubmissionEntity = await connection.getRepository(RfqmTransactionSubmissionEntity).findOne({
                transactionHash: FIRST_TRANSACTION_HASH,
            });
            expect(dbSubmissionEntity).to.not.be.null();
            expect(dbSubmissionEntity?.transactionHash).to.equal(FIRST_TRANSACTION_HASH);
            expect(dbSubmissionEntity?.orderHash).to.equal(orderHash);
            expect(dbSubmissionEntity?.from).to.deep.equal(WORKER_ADDRESS);
            expect(dbSubmissionEntity?.gasUsed).to.deep.equal(new BigNumber(GAS_ESTIMATE));
            expect(dbSubmissionEntity?.gasPrice).to.deep.equal(GAS_PRICE);
            expect(dbSubmissionEntity?.nonce).to.deep.equal(NONCE);
            expect(dbSubmissionEntity?.status).to.deep.equal(RfqmTransactionSubmissionStatus.SucceededConfirmed);
            expect(dbSubmissionEntity?.blockMined).to.deep.equal(new BigNumber(MINED_BLOCK));
            expect(dbSubmissionEntity?.to).to.deep.equal(MOCK_EXCHANGE_PROXY);
            expect(dbSubmissionEntity?.statusReason).to.deep.equal(null);
        });
    });
    describe('processJobAsync', async () => {
        const feeAddress = randomAddress();
        const mockStoredFee: StoredFee = {
            token: feeAddress,
            amount: '1000',
            type: 'fixed',
        };

        const blockchainUtils = new RfqBlockchainUtils(getProvider(), contractAddresses.exchangeProxy);
        const order = new RfqOrder({
            txOrigin: randomAddress(),
            chainId: CHAIN_ID,
            expiry: new BigNumber(new Date().getTime()).plus(60 * 5),
            maker: randomAddress(),
            taker: NULL_ADDRESS,
            makerAmount: new BigNumber(1),
            takerAmount: EXPECTED_FILL_AMOUNT,
            makerToken: randomAddress(),
            takerToken: randomAddress(),
            pool: `0x${generatePseudoRandom256BitNumber().toString(16)}`,
            salt: new BigNumber(1),
            verifyingContract: contractAddresses.exchangeProxy,
        });
        const metaTransaction = blockchainUtils.generateMetaTransaction(
            order,
            VALID_SIGNATURE,
            randomAddress(),
            new BigNumber(1),
            CHAIN_ID,
        );
        const orderHash = order.getHash();
        const workerAddress = randomAddress();

        const mockQuote = new RfqmQuoteEntity({
            orderHash,
            metaTransactionHash: metaTransaction.getHash(),
            makerUri: MARKET_MAKER_1,
            fee: mockStoredFee,
            order: {
                type: RfqmOrderTypes.V4Rfq,
                order: {
                    ...order,
                    chainId: order.chainId.toString(),
                    makerAmount: order.makerAmount.toString(),
                    takerAmount: order.takerAmount.toString(),
                    salt: order.salt.toString(),
                    expiry: order.expiry.toString(),
                },
            },
            chainId: 1337,
            affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
        });
        const mmResponse = {
            fee: mockStoredFee,
            proceedWithFill: true,
            signedOrderHash: orderHash,
            takerTokenFillAmount: EXPECTED_FILL_AMOUNT.toString(),
        };

        const txSubmission: Partial<RfqmTransactionSubmissionEntity> = {
            transactionHash: FIRST_TRANSACTION_HASH,
            orderHash,
            createdAt: new Date(),
            from: workerAddress,
            to: '0x123',
            nonce: 0,
            gasPrice: new BigNumber(1),
            gasUsed: new BigNumber(100),
            status: RfqmTransactionSubmissionStatus.Submitted,
        };

        it('should sucessfully resolve when the job is processed', async () => {
            const mockAxios = new AxiosMockAdapter(axiosClient);
            mockAxios.onPost(`${MARKET_MAKER_1}/submit`).replyOnce(HttpStatus.OK, mmResponse);
            // write a corresponding quote entity to validate against
            await connection.getRepository(RfqmQuoteEntity).insert(mockQuote);

            await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            await rfqmService.processRfqmJobAsync(orderHash, workerAddress);

            const job = await dbUtils.findJobByOrderHashAsync(orderHash);
            expect(job?.status).to.eq(RfqmJobStatus.SucceededConfirmed);

            const submissions = await dbUtils.findRfqmTransactionSubmissionsByOrderHashAsync(orderHash);
            expect(submissions[0].status).to.eq(RfqmTransactionSubmissionStatus.SucceededConfirmed);

            mockAxios.reset();
        });

        it('should clear out calldata if market maker rejects last look', async () => {
            const mockAxios = new AxiosMockAdapter(axiosClient);
            const lastLookResponse = {
                fee: mockStoredFee,
                proceedWithFill: false,
                signedOrderHash: orderHash,
                takerTokenFillAmount: EXPECTED_FILL_AMOUNT.toString(),
            };
            mockAxios.onPost(`${MARKET_MAKER_1}/submit`).replyOnce(HttpStatus.OK, lastLookResponse);

            // write a corresponding quote entity to validate against
            await connection.getRepository(RfqmQuoteEntity).insert(mockQuote);

            await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            await rfqmService.processRfqmJobAsync(orderHash, workerAddress);

            const job = await dbUtils.findJobByOrderHashAsync(orderHash);
            expect(job?.status).to.eq(RfqmJobStatus.FailedLastLookDeclined);
            expect(job?.calldata).to.eq('');

            mockAxios.reset();
        });

        it('should sucessfully resolve when there is a retry after last look is accepted', async () => {
            // write a corresponding quote entity to validate against
            await connection.getRepository(RfqmQuoteEntity).insert(mockQuote);

            await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            // mark job as having completed last look
            const jobBefore = await dbUtils.findJobByOrderHashAsync(orderHash);
            jobBefore!.status = RfqmJobStatus.PendingLastLookAccepted;
            jobBefore!.lastLookResult = true;
            await dbUtils.updateRfqmJobAsync(orderHash, false, jobBefore!);

            await rfqmService.processRfqmJobAsync(orderHash, workerAddress);

            const jobAfter = await dbUtils.findJobByOrderHashAsync(orderHash);

            expect(jobAfter?.status).to.eq(RfqmJobStatus.SucceededConfirmed);

            const submissions = await dbUtils.findRfqmTransactionSubmissionsByOrderHashAsync(orderHash);
            expect(submissions[0].status).to.eq(RfqmTransactionSubmissionStatus.SucceededConfirmed);
        });
        it('should successfully complete a job if previous submissions found', async () => {
            // write a corresponding quote entity to validate against
            await connection.getRepository(RfqmQuoteEntity).insert(mockQuote);

            await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: RfqmTypes.MetaTransaction, metaTransaction, signature: VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            // mark job as having been submitted on-chain
            await dbUtils.writeRfqmTransactionSubmissionToDbAsync(txSubmission);
            const jobBefore = await dbUtils.findJobByOrderHashAsync(orderHash);
            jobBefore!.status = RfqmJobStatus.PendingSubmitted;
            jobBefore!.lastLookResult = true;
            await dbUtils.updateRfqmJobAsync(orderHash, false, jobBefore!);

            await rfqmService.processRfqmJobAsync(orderHash, workerAddress);

            const jobAfter = await dbUtils.findJobByOrderHashAsync(orderHash);

            expect(jobAfter?.status).to.eq(RfqmJobStatus.SucceededConfirmed);

            const submissions = await dbUtils.findRfqmTransactionSubmissionsByOrderHashAsync(orderHash);
            expect(submissions[0].status).to.eq(RfqmTransactionSubmissionStatus.SucceededConfirmed);
        });
    });
});
