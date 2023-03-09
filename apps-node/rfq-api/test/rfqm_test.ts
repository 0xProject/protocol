import { ContractAddresses } from '@0x/contract-addresses';
import { ethSignHashWithKey, OtcOrder, SignatureType } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import Axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { expect } from 'chai';
import { TransactionReceiptStatus } from 'ethereum-types';
import { BigNumber as EthersBigNumber, ethers } from 'ethers';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import Redis from 'ioredis';
import { Producer } from 'sqs-producer';
import * as request from 'supertest';
import { anyString, anything, deepEqual, instance, mock, when } from 'ts-mockito';
import { DataSource } from 'typeorm';

import * as config from '../src/config';
import {
    ADMIN_PATH,
    DEFAULT_MIN_EXPIRY_DURATION_MS,
    ETH_DECIMALS,
    ONE_MINUTE_MS,
    ONE_SECOND_MS,
    RFQM_PATH,
    ZERO,
} from '../src/core/constants';
import { RfqmV2JobEntity, RfqmV2QuoteEntity } from '../src/entities';
import { RfqmJobStatus, RfqmOrderTypes, StoredOtcOrder } from '../src/entities/types';
import {
    buildRfqAdminService,
    buildRfqMakerService,
    runHttpRfqmServiceAsync,
} from '../src/runners/http_rfqm_service_runner';
import { FeeService } from '../src/services/fee_service';
import { RfqmService } from '../src/services/rfqm_service';
import { RfqMakerBalanceCacheService } from '../src/services/rfq_maker_balance_cache_service';
import { GaslessApprovalTypes, GaslessTypes, PermitEip712Types, StoredFee } from '../src/core/types';
import { CacheClient } from '../src/utils/cache_client';
import { ConfigManager } from '../src/utils/config_manager';
import { QuoteServerClient } from '../src/utils/quote_server_client';
import { RfqmDbUtils, storedOtcOrderToOtcOrder } from '../src/utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../src/utils/rfq_blockchain_utils';
import { RfqMakerDbUtils } from '../src/utils/rfq_maker_db_utils';
import { RfqMakerManager } from '../src/utils/rfq_maker_manager';
import { BLOCK_FINALITY_THRESHOLD } from '../src/utils/SubmissionContext';
import { TokenMetadataManager } from '../src/utils/TokenMetadataManager';

import {
    CONTRACT_ADDRESSES,
    getProvider,
    MATCHA_AFFILIATE_ADDRESS,
    MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
    MOCK_EXECUTE_META_TRANSACTION_HASH,
    MOCK_PERMIT_APPROVAL,
    TEST_RFQ_ORDER_FILLED_EVENT_LOG,
} from './constants';
import { setupDependenciesAsync, TeardownDependenciesFunctionHandle } from './test_utils/deployment';
import { initDbDataSourceAsync } from './test_utils/initDbDataSourceAsync';

const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';
const API_KEY = 'koolApiKey';
const ADMIN_API_KEY = 'adminApiKey';
const INTEGRATOR_ID = 'koolIntegratorId';
const contractAddresses: ContractAddresses = CONTRACT_ADDRESSES;
const WORKER_FULL_BALANCE_WEI = new BigNumber(1).shiftedBy(ETH_DECIMALS);

// RFQM Market Maker request specific constants
const MARKET_MAKER_1 = 'https://mock-rfqt1.club';
const MARKET_MAKER_2 = 'https://mock-rfqt2.club';
const MARKET_MAKER_3 = 'https://mock-rfqt3.club';
const MARKET_MAKER_2_ADDR = '0xbEA29fE10caed0E1a65A7AdBddd254dD372e83Ff';
const MARKET_MAKER_3_ADDR = '0xA84f003D3a6F62c5dF218c7fb7b0EFB766b5AC07';
const GAS_PRICE = new BigNumber(100);

const MOCK_META_TX_CALL_DATA = '0x123';
const RANDOM_VALID_SIGNATURE = {
    r: '0x72ba2125d4efe1f9cc77882138ed94cbd485f8897fe6d9fe34854906634fc59d',
    s: '0x1e19d3d29ab2855debc62a1df98a727673b8bf31c4da3a391a6eaea465920ff2',
    v: 27,
    signatureType: SignatureType.EthSign,
};
const SAFE_EXPIRY = '1903620548';
const GAS_ESTIMATE = 165000;
const WORKER_ADDRESS = '0xaWorkerAddress';
const FIRST_TRANSACTION_HASH = '0xfirstTxHash';
const FIRST_SIGNED_TRANSACTION = '0xfirstSignedTransaction';
const TX_STATUS: TransactionReceiptStatus = 1;
// it's over 9K
const MINED_BLOCK = 9001;
// the tx should be finalized
const CURRENT_BLOCK = MINED_BLOCK + BLOCK_FINALITY_THRESHOLD;
const MOCK_EXCHANGE_PROXY = '0xtheExchangeProxy';
const SUCCESSFUL_TRANSACTION_RECEIPT = {
    blockHash: '0xaBlockHash',
    blockNumber: MINED_BLOCK,
    byzantium: true,
    confirmations: 2,
    contractAddress: '',
    cumulativeGasUsed: EthersBigNumber.from(150000),
    effectiveGasPrice: EthersBigNumber.from(1000),
    from: WORKER_ADDRESS,
    gasUsed: EthersBigNumber.from(GAS_ESTIMATE),
    logs: [TEST_RFQ_ORDER_FILLED_EVENT_LOG],
    logsBloom: '',
    status: TX_STATUS,
    to: MOCK_EXCHANGE_PROXY,
    transactionHash: FIRST_TRANSACTION_HASH,
    transactionIndex: 5,
    type: 2,
};

const MOCK_RFQM_JOB = new RfqmV2JobEntity({
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
    order: {
        order: {
            chainId: '1337',
            expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                new BigNumber(SAFE_EXPIRY),
                ZERO,
                new BigNumber(SAFE_EXPIRY),
            ).toString(),
            maker: '0x123',
            makerAmount: '1',
            makerToken: '0x123',
            taker: '0x123',
            takerAmount: '1',
            takerToken: '0x123',
            txOrigin: '0x123',
            verifyingContract: '0x123',
        },
        type: RfqmOrderTypes.Otc,
    },
    orderHash: '0x288d4d771179738ee9ca60f14df74612fb1ca43dfbc3bbb49dd9226a19747c11',
    status: RfqmJobStatus.PendingSubmitted,
    updatedAt: new Date(),
    workerAddress: null,
    lastLookResult: null,
    affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
    takerSpecifiedSide: 'makerToken',
    workflow: 'rfqm',
});

jest.setTimeout(ONE_MINUTE_MS * 2);
let teardownDependencies: TeardownDependenciesFunctionHandle;

describe('RFQM Integration', () => {
    let app: Express.Application;
    let axiosClient: AxiosInstance;
    let cacheClient: CacheClient;
    let dataSource: DataSource;
    let dbUtils: RfqmDbUtils;
    let mockAxios: AxiosMockAdapter;
    let rfqBlockchainUtilsMock: RfqBlockchainUtils;
    let rfqmServiceChainId1337: RfqmService;
    let rfqmServiceChainId3: RfqmService;
    let server: Server;
    let takerAddress: string;

    beforeAll(async () => {
        teardownDependencies = await setupDependenciesAsync(['postgres', 'ganache', 'redis']);

        // Create a Provider
        const provider = getProvider();
        const web3Wrapper = new Web3Wrapper(provider);
        [takerAddress] = await web3Wrapper.getAvailableAddressesAsync();

        // Build dependencies
        // Create the mock FeeService
        const feeServiceMock = mock(FeeService);
        when(feeServiceMock.getGasPriceEstimationAsync()).thenResolve(GAS_PRICE);
        when(feeServiceMock.calculateFeeAsync(anything(), anything())).thenResolve({
            feeWithDetails: {
                token: '0xToken',
                amount: new BigNumber(300),
                type: 'fixed',
                details: {
                    feeModelVersion: 1,
                    kind: 'default',
                    gasFeeAmount: new BigNumber(100),
                    gasPrice: GAS_PRICE,
                    zeroExFeeAmount: new BigNumber(200),
                    tradeSizeBps: 4,
                    feeTokenBaseUnitPriceUsd: new BigNumber(30),
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: new BigNumber(20),
                },
                breakdown: {
                    gas: {
                        amount: new BigNumber(100),
                        details: {
                            gasPrice: GAS_PRICE,
                            estimatedGas: new BigNumber(1),
                        },
                    },
                    zeroEx: {
                        amount: new BigNumber(200),
                        details: {
                            kind: 'volume',
                            tradeSizeBps: 4,
                        },
                    },
                },
                conversionRates: {
                    nativeTokenBaseUnitPriceUsd: new BigNumber(30),
                    feeTokenBaseUnitPriceUsd: new BigNumber(30),
                    takerTokenBaseUnitPriceUsd: null,
                    makerTokenBaseUnitPriceUsd: new BigNumber(20),
                },
            },
        });
        const feeServiceInstance = instance(feeServiceMock);

        // Create the mock ConfigManager
        const configManagerMock = mock(ConfigManager);
        when(configManagerMock.getAdminApiKey()).thenReturn(ADMIN_API_KEY);
        when(configManagerMock.getRfqmApiKeyWhitelist()).thenReturn(new Set([API_KEY]));
        when(configManagerMock.getIntegratorIdForApiKey(API_KEY)).thenReturn(INTEGRATOR_ID);
        when(configManagerMock.getIntegratorByIdOrThrow(INTEGRATOR_ID)).thenReturn({
            integratorId: INTEGRATOR_ID,
            apiKeys: [API_KEY],
            allowedChainIds: [1337],
            label: 'Test',
            rfqm: true,
            plp: false,
            rfqt: false,
            gaslessRfqtVip: true,
        });
        const configManager = instance(configManagerMock);

        // Create Axios client and mock
        axiosClient = Axios.create();
        mockAxios = new AxiosMockAdapter(axiosClient);

        // Create the mock rfqBlockchainUtils
        rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
        when(rfqBlockchainUtilsMock.generateMetaTransactionCallData(anything(), anything(), anything())).thenReturn(
            MOCK_META_TX_CALL_DATA,
        );
        when(rfqBlockchainUtilsMock.getTokenBalancesAsync(anything())).thenResolve([new BigNumber(1)]);
        when(rfqBlockchainUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([new BigNumber(1)]);
        when(rfqBlockchainUtilsMock.getNonceAsync(anything())).thenResolve(1);
        when(rfqBlockchainUtilsMock.estimateGasForAsync(anything())).thenResolve(GAS_ESTIMATE);
        when(rfqBlockchainUtilsMock.signTransactionAsync(anything())).thenResolve({
            signedTransaction: FIRST_SIGNED_TRANSACTION,
            transactionHash: FIRST_TRANSACTION_HASH,
        });
        when(rfqBlockchainUtilsMock.submitSignedTransactionAsync(FIRST_SIGNED_TRANSACTION)).thenResolve(
            FIRST_TRANSACTION_HASH,
        );
        when(rfqBlockchainUtilsMock.getReceiptsAsync(deepEqual([FIRST_TRANSACTION_HASH]))).thenResolve([
            SUCCESSFUL_TRANSACTION_RECEIPT,
        ]);
        when(rfqBlockchainUtilsMock.getCurrentBlockAsync()).thenResolve(CURRENT_BLOCK);
        when(rfqBlockchainUtilsMock.getExchangeProxyAddress()).thenReturn(MOCK_EXCHANGE_PROXY);
        when(rfqBlockchainUtilsMock.getAccountBalanceAsync(MOCK_WORKER_REGISTRY_ADDRESS)).thenResolve(
            WORKER_FULL_BALANCE_WEI,
        );
        when(rfqBlockchainUtilsMock.computeEip712Hash(anything())).thenReturn(MOCK_EXECUTE_META_TRANSACTION_HASH);
        const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);

        const tokenMetadataManagerMock = mock(TokenMetadataManager);
        when(tokenMetadataManagerMock.getTokenDecimalsAsync(anything())).thenResolve(18);
        const tokenMetadataManager = instance(tokenMetadataManagerMock);

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
        dataSource = await initDbDataSourceAsync();
        dbUtils = new RfqmDbUtils(dataSource);

        // Create the mock sqsProducer
        const sqsProducerMock = mock(Producer);
        when(sqsProducerMock.send(anything())).thenResolve(sqsResponse);
        when(sqsProducerMock.queueSize()).thenResolve(0);
        const sqsProducer = instance(sqsProducerMock);

        // Create the quote server client
        const quoteServerClient = new QuoteServerClient(axiosClient);

        // Create the CacheClient
        const redis = new Redis();
        cacheClient = new CacheClient(redis);

        // Create the maker balance cache service
        const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
        when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve(
            [new BigNumber(200000000000000000)],
            [new BigNumber(200000000000000000), new BigNumber(200000000000000000)],
        );
        const rfqMakerBalanceCacheService = instance(rfqMakerBalanceCacheServiceMock);

        // Create the mock RfqMakerManager
        const rfqMakerManagerMock = mock(RfqMakerManager);
        when(
            rfqMakerManagerMock.getRfqmV2MakerUrisForPair(anyString(), anyString(), anything(), anything()),
        ).thenReturn([MARKET_MAKER_2, MARKET_MAKER_3]);
        when(rfqMakerManagerMock.getRfqmV2MakerOfferings()).thenReturn({
            'https://mock-rfqm1.club': [
                ['0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c', '0x0b1ba0af832d7c05fd64161e0db78e85978e8082'],
            ],
        });
        const rfqMakerManager = instance(rfqMakerManagerMock);
        rfqmServiceChainId1337 = new RfqmService(
            1337,
            feeServiceInstance,
            /* feeModelVersion */ 0,
            contractAddresses,
            MOCK_WORKER_REGISTRY_ADDRESS,
            rfqBlockchainUtils,
            dbUtils,
            sqsProducer,
            quoteServerClient,
            DEFAULT_MIN_EXPIRY_DURATION_MS,
            cacheClient,
            rfqMakerBalanceCacheService,
            rfqMakerManager,
            tokenMetadataManager,
            /* gaslessRfqtVipRolloutPercentage */ 0,
        );

        // Create another RFQM Service for chain ID 3 that returns 0 offering
        const rfqMakerManagerChain3Mock = mock(RfqMakerManager);
        when(rfqMakerManagerChain3Mock.getRfqmV2MakerOfferings()).thenReturn({
            'https://mock-rfqm1.club': [],
        });
        const rfqMakerManagerChainId3 = instance(rfqMakerManagerChain3Mock);
        rfqmServiceChainId3 = new RfqmService(
            3,
            feeServiceInstance,
            /* feeModelVersion */ 0,
            contractAddresses,
            MOCK_WORKER_REGISTRY_ADDRESS,
            rfqBlockchainUtils,
            dbUtils,
            sqsProducer,
            quoteServerClient,
            DEFAULT_MIN_EXPIRY_DURATION_MS,
            cacheClient,
            rfqMakerBalanceCacheService,
            rfqMakerManagerChainId3,
            tokenMetadataManager,
            /* gaslessRfqtVipRolloutPercentage */ 0,
        );

        const rfqAdminService = buildRfqAdminService(dbUtils);
        const rfqMakerService = buildRfqMakerService(new RfqMakerDbUtils(dataSource), configManager);

        // Start the server
        const res = await runHttpRfqmServiceAsync(
            new Map([
                [1337, rfqmServiceChainId1337],
                [3, rfqmServiceChainId3],
            ]),
            new Map(),
            rfqAdminService,
            rfqMakerService,
            configManager,
            config.defaultHttpServiceConfig,
            dataSource,
            false,
        );
        app = res.app;
        server = res.server;
    });

    afterEach(async () => {
        await dataSource.query('TRUNCATE TABLE rfqm_quotes CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_jobs CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_transaction_submissions CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_quotes CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_jobs CASCADE;');
        await dataSource.query('TRUNCATE TABLE rfqm_v2_transaction_submissions CASCADE;');
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err?: Error) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
        await cacheClient.closeAsync();
        if (!teardownDependencies()) {
            throw new Error('Failed to tear down dependencies');
        }
    });

    describe('rfqm/v1/healthz', () => {
        it('should return a 200 OK with active pairs', async () => {
            const appResponse = await request(app)
                .get(`${RFQM_PATH}/healthz`)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);
            expect(appResponse.body.pairs[0][0]).to.equal('0x0b1ba0af832d7c05fd64161e0db78e85978e8082');
            expect(appResponse.body.pairs[0][1]).to.equal('0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c');
        });

        // This test is to cover this issue: https://github.com/0xProject/0x-rfq-api/pull/200
        it('should return correct values for different chains', async () => {
            const chainId3HealthzResponse = await request(app)
                .get(`${RFQM_PATH}/healthz`)
                .set('0x-chain-id', '3')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);
            // tslint:disable-next-line: no-unused-expression
            expect(chainId3HealthzResponse.body.pairs).to.be.an('array').that.is.empty;

            const chainId1337HealthzResponse = await request(app)
                .get(`${RFQM_PATH}/healthz`)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);
            expect(chainId1337HealthzResponse.body.pairs[0][0]).to.equal('0x0b1ba0af832d7c05fd64161e0db78e85978e8082');
            expect(chainId1337HealthzResponse.body.pairs[0][1]).to.equal('0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c');
        });
    });

    describe('rfqm/v1/price', () => {
        it('should return a 200 OK with an indicative quote for buys', async () => {
            const buyAmount = 200000000000000000;
            const winningQuote = 100000000000000000;
            const losingQuote = 150000000000000000;
            const zeroExApiParams = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                buyAmount: buyAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            const baseResponse = {
                makerAmount: buyAmount.toString(),
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                expiry: '1903620548', // in the year 2030
            };

            mockAxios.onGet(`${MARKET_MAKER_2}/rfqm/v2/price`).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                takerAmount: winningQuote.toString(),
                maker: MARKET_MAKER_2_ADDR,
            });
            mockAxios.onGet(`${MARKET_MAKER_3}/rfqm/v2/price`).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                takerAmount: losingQuote.toString(),
                maker: MARKET_MAKER_3_ADDR,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${zeroExApiParams.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            const expectedPrice = '0.5';
            expect(appResponse.body.liquidityAvailable).to.equal(true);
            expect(appResponse.body.price).to.equal(expectedPrice);
        });

        it('should return a 200 OK with an indicative quote for sells', async () => {
            const sellAmount = 100000000000000000;
            const winningQuote = 200000000000000000;
            const losingQuote = 150000000000000000;
            const zeroExApiParams = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            const baseResponse = {
                takerAmount: sellAmount.toString(),
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                expiry: '1903620548', // in the year 2030
            };

            mockAxios.onGet(`${MARKET_MAKER_2}/rfqm/v2/price`).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                makerAmount: winningQuote.toString(),
                maker: MARKET_MAKER_2_ADDR,
            });
            mockAxios.onGet(`${MARKET_MAKER_3}/rfqm/v2/price`).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                makerAmount: losingQuote.toString(),
                maker: MARKET_MAKER_3_ADDR,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${zeroExApiParams.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            const expectedPrice = '2';
            expect(appResponse.body.liquidityAvailable).to.equal(true);
            expect(appResponse.body.price).to.equal(expectedPrice);
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

            mockAxios.onGet(`${MARKET_MAKER_2}/rfqm/v2/price`).replyOnce(HttpStatus.OK, {
                makerAmount: quotedAmount.toString(),
                takerAmount: sellAmount.toString(),
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                expiry: '0', // already expired
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            expect(appResponse.body.liquidityAvailable).to.equal(false);
            expect(appResponse.body.price).to.equal(undefined);
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
            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', 'unknown-key')
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Invalid API key');
        });

        it('should return a 400 BAD REQUEST if API Key does not have access to the chain', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });
            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1')
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Invalid API key');
        });

        it('should return a 400 BAD REQUEST Validation Error if Chain Id cannot be parsed', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', 'invalid-id')
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
            expect(appResponse.body.validationErrors[0].reason).to.equal('Invalid chain id');
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

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
            expect(appResponse.body.validationErrors[0].reason).to.equal(
                'Unwrapped Native Asset is not supported. Use WETH instead',
            );
        });

        it('should return a 400 BAD REQUEST if buyToken is missing', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
            });
            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
        });

        it('should return a 400 BAD REQUEST if sellToken is missing', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellAmount: sellAmount.toString(),
                takerAddress,
            });
            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
        });

        it('should return a 400 BAD REQUEST if both sellAmount and buyAmount are missing', async () => {
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                takerAddress,
            });
            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
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

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/price?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
            expect(appResponse.body.validationErrors[0].reason).to.equal(
                `Token ${UNKNOWN_TOKEN} is currently unsupported`,
            );
        });
    });

    describe('rfqm/v1/quote', () => {
        it('should return a 200 OK, liquidityAvailable === false if no valid firm quotes found', async () => {
            const sellAmount = 100000000000000000;
            const insufficientSellAmount = 1;

            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'false',
                skipValidation: 'true',
            });

            const baseResponse = {
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                expiry: '1903620548', // in the year 2030
            };

            mockAxios.onGet(`${MARKET_MAKER_2}/rfqm/v2/price`).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                takerAmount: insufficientSellAmount,
                makerAmount: insufficientSellAmount,
                maker: MARKET_MAKER_2_ADDR,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${params.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            expect(appResponse.body.liquidityAvailable).to.equal(false);
            expect(appResponse.body.price).to.equal(undefined);
        });

        it('should return a 200 OK with a firm quote for buys', async () => {
            const buyAmount = 200000000000000000;
            const winningQuote = 100000000000000000;
            const losingQuote = 150000000000000000;
            const zeroExApiParams = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                buyAmount: buyAmount.toString(),
                takerAddress,
                intentOnFilling: 'true',
                skipValidation: 'true',
            });

            const headers = {
                Accept: 'application/json, text/plain, */*',
                '0x-api-key': INTEGRATOR_ID,
                '0x-integrator-id': INTEGRATOR_ID,
            };

            const baseResponse = {
                makerAmount: buyAmount.toString(),
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                expiry: '1903620548', // in the year 2030
            };

            mockAxios.onGet(`${MARKET_MAKER_2}/rfqm/v2/price`, { headers }).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                takerAmount: winningQuote.toString(),
                maker: MARKET_MAKER_2_ADDR,
            });
            mockAxios.onGet(`${MARKET_MAKER_3}/rfqm/v2/price`, { headers }).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                takerAmount: losingQuote.toString(),
                maker: MARKET_MAKER_3_ADDR,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${zeroExApiParams.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            const expectedPrice = '0.5';
            expect(appResponse.body.price).to.equal(expectedPrice);
            expect(appResponse.body.type).to.equal(GaslessTypes.OtcOrder);
            expect(appResponse.body.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            expect(appResponse.body.order.maker).to.equal(MARKET_MAKER_2_ADDR);
            expect(appResponse.body.approval).to.equal(undefined);
        });

        it('should return a 200 OK with a firm quote when OtcOrder pricing is available for sells', async () => {
            const sellAmount = 100000000000000000;
            const winningQuote = 200000000000000000;
            const losingQuote = 150000000000000000;
            const zeroExApiParams = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                intentOnFilling: 'true',
                skipValidation: 'true',
            });

            const headers = {
                Accept: 'application/json, text/plain, */*',
                '0x-api-key': INTEGRATOR_ID,
                '0x-integrator-id': INTEGRATOR_ID,
            };

            const baseResponse = {
                takerAmount: sellAmount.toString(),
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                expiry: '1903620548', // in the year 2030
            };

            mockAxios.onGet(`${MARKET_MAKER_2}/rfqm/v2/price`, { headers }).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                makerAmount: winningQuote.toString(),
                maker: MARKET_MAKER_2_ADDR,
            });
            mockAxios.onGet(`${MARKET_MAKER_3}/rfqm/v2/price`, { headers }).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                makerAmount: losingQuote.toString(),
                maker: MARKET_MAKER_3_ADDR,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${zeroExApiParams.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            const expectedPrice = '2';
            expect(appResponse.body.price).to.equal(expectedPrice);
            expect(appResponse.body.type).to.equal(GaslessTypes.OtcOrder);
            expect(appResponse.body.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            expect(appResponse.body.order.maker).to.equal(MARKET_MAKER_2_ADDR);
            expect(appResponse.body.approval).to.equal(undefined);
        });

        it('should return a 200 OK with a firm quote when OtcOrder pricing is available for sells and checkApproval is true', async () => {
            when(rfqBlockchainUtilsMock.getAllowanceAsync(anything(), anything(), anything())).thenResolve(
                new BigNumber(0),
            );
            when(rfqBlockchainUtilsMock.getGaslessApprovalAsync(anything(), anything(), anything())).thenResolve(
                MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
            );

            const sellAmount = 100000000000000000;
            const winningQuote = 200000000000000000;
            const losingQuote = 150000000000000000;
            const zeroExApiParams = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
                checkApproval: 'true',
            });

            const headers = {
                Accept: 'application/json, text/plain, */*',
                '0x-api-key': INTEGRATOR_ID,
                '0x-integrator-id': INTEGRATOR_ID,
            };

            const baseResponse = {
                takerAmount: sellAmount.toString(),
                makerToken: contractAddresses.zrxToken,
                takerToken: contractAddresses.etherToken,
                expiry: '1903620548', // in the year 2030
            };

            mockAxios.onGet(`${MARKET_MAKER_2}/rfqm/v2/price`, { headers }).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                makerAmount: winningQuote.toString(),
                maker: MARKET_MAKER_2_ADDR,
            });
            mockAxios.onGet(`${MARKET_MAKER_3}/rfqm/v2/price`, { headers }).replyOnce(HttpStatus.OK, {
                ...baseResponse,
                makerAmount: losingQuote.toString(),
                maker: MARKET_MAKER_3_ADDR,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${zeroExApiParams.toString()}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            const expectedPrice = '2';
            const expectedApproval = {
                isRequired: true,
                isGaslessAvailable: true,
                type: MOCK_EXECUTE_META_TRANSACTION_APPROVAL.kind,
                hash: MOCK_EXECUTE_META_TRANSACTION_HASH,
                eip712: MOCK_EXECUTE_META_TRANSACTION_APPROVAL.eip712,
            };
            expect(appResponse.body.price).to.equal(expectedPrice);
            expect(appResponse.body.type).to.equal(GaslessTypes.OtcOrder);
            expect(appResponse.body.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            expect(appResponse.body.order.maker).to.equal(MARKET_MAKER_2_ADDR);
            expect(appResponse.body.approval).to.eql(expectedApproval);
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

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${params.toString()}`)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Invalid API key');
        });

        it('should return a 400 BAD REQUEST if takerAddress is missing', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${params.toString()}`)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
        });

        it('should return a 400 BAD REQUEST if buyToken is missing', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                sellToken: 'WETH',
                sellAmount: sellAmount.toString(),
                takerAddress,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${params.toString()}`)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
        });

        it('should return a 400 BAD REQUEST if sellToken is missing', async () => {
            const sellAmount = 100000000000000000;
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellAmount: sellAmount.toString(),
                takerAddress,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${params.toString()}`)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
        });

        it('should return a 400 BAD REQUEST if both sellAmount and buyAmount are missing', async () => {
            const params = new URLSearchParams({
                buyToken: 'ZRX',
                sellToken: 'WETH',
                takerAddress,
            });

            const appResponse = await request(app)
                .get(`${RFQM_PATH}/quote?${params.toString()}`)
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
        });
    });

    describe('rfqm/v1/submit', () => {
        const mockStoredFee: StoredFee = {
            token: '0x123',
            amount: '1000',
            type: 'fixed',
        };
        const mockStoredOrder: StoredOtcOrder = {
            type: RfqmOrderTypes.Otc,
            order: {
                chainId: '1337',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                    new BigNumber(SAFE_EXPIRY),
                    ZERO,
                    new BigNumber(SAFE_EXPIRY),
                ).toString(),
                maker: '0x123',
                makerAmount: '1',
                makerToken: '0x123',
                taker: '0x123',
                takerAmount: '1',
                takerToken: '0x123',
                txOrigin: '0x123',
                verifyingContract: '0x123',
            },
        };
        // OtcOrder Taker
        const otcOrderTakerAddress = '0xdA9AC423442169588DE6b4305f4E820D708d0cE5';
        const otcOrderTakerPrivateKey = '0x653fa328df81be180b58e42737bc4cef037a19a3b9673b15d20ee2eebb2e509d';

        // OtcOrder
        const mockStoredOtcOrder: StoredOtcOrder = {
            type: RfqmOrderTypes.Otc,
            order: {
                txOrigin: '0x123',
                maker: '0x123',
                taker: otcOrderTakerAddress,
                makerToken: '0x123',
                takerToken: '0x123',
                makerAmount: '1',
                takerAmount: '1',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                    new BigNumber(SAFE_EXPIRY),
                    ZERO,
                    new BigNumber(SAFE_EXPIRY),
                ).toString(),
                chainId: '1337',
                verifyingContract: '0x123',
            },
        };
        const otcOrder = storedOtcOrderToOtcOrder(mockStoredOtcOrder);
        it('[v2] should return status 201 created and queue up a job with a successful request', async () => {
            // OtcOrder
            const order = otcOrder;
            const orderHash = order.getHash();

            // Taker Signature
            const takerSignature = ethSignHashWithKey(orderHash, otcOrderTakerPrivateKey);

            const mockQuote = new RfqmV2QuoteEntity({
                orderHash,
                makerUri: MARKET_MAKER_1,
                fee: mockStoredFee,
                order: mockStoredOtcOrder,
                chainId: 1337,
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
                takerSpecifiedSide: 'makerToken',
                workflow: 'rfqm',
            });

            // write a corresponding quote entity to validate against
            await dataSource.getRepository(RfqmV2QuoteEntity).insert(mockQuote);

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: GaslessTypes.OtcOrder, order, signature: takerSignature })
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            expect(appResponse.body.orderHash).to.equal(orderHash);

            const dbJobEntity = await dataSource.getRepository(RfqmV2JobEntity).findOne({
                where: {
                    orderHash,
                },
            });
            expect(dbJobEntity).to.not.equal(null);
            expect(dbJobEntity?.orderHash).to.equal(mockQuote.orderHash);
            expect(dbJobEntity?.makerUri).to.equal(MARKET_MAKER_1);
            expect(dbJobEntity?.affiliateAddress).to.equal(MATCHA_AFFILIATE_ADDRESS);
            expect(dbJobEntity?.takerSignature).to.deep.eq(takerSignature);
        });

        it('[v2] should return status 404 not found if there is not a pre-existing quote', async () => {
            const order = otcOrder;

            // Taker Signature
            const takerSignature = ethSignHashWithKey(order.getHash(), otcOrderTakerPrivateKey);

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({
                    type: GaslessTypes.OtcOrder,
                    order,
                    signature: takerSignature,
                })
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.NOT_FOUND)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Not Found');
        });

        it('should return a 400 BAD REQUEST Error the type is not supported', async () => {
            const invalidType = 'v10rfq';

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: invalidType, order: mockStoredOrder, signature: RANDOM_VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
            expect(appResponse.body.validationErrors[0].reason).to.equal(
                `${invalidType} is an invalid value for 'type'`,
            );
        });

        it('[v2] should fail with status code 500 if a quote has already been submitted', async () => {
            // OtcOrder
            const order = otcOrder;
            const orderHash = order.getHash();

            // Taker Signature
            const takerSignature = ethSignHashWithKey(orderHash, otcOrderTakerPrivateKey);

            const mockQuote = new RfqmV2QuoteEntity({
                orderHash,
                makerUri: MARKET_MAKER_1,
                fee: mockStoredFee,
                order: mockStoredOtcOrder,
                chainId: 1337,
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
                takerSpecifiedSide: 'makerToken',
                workflow: 'rfqm',
            });

            // write a corresponding quote entity to validate against
            await dataSource.getRepository(RfqmV2QuoteEntity).insert(mockQuote);

            await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: GaslessTypes.OtcOrder, order, signature: takerSignature })
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            // try to submit again
            await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: GaslessTypes.OtcOrder, order, signature: takerSignature })
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.INTERNAL_SERVER_ERROR)
                .expect('Content-Type', /json/);
        });

        it('[v2] should fail with 400 BAD REQUEST if meta tx is too close to expiration', async () => {
            const order = new OtcOrder({
                ...otcOrder,
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(ZERO, ZERO, ZERO),
            });
            const orderHash = order.getHash();

            const mockQuote = new RfqmV2QuoteEntity({
                orderHash,
                makerUri: MARKET_MAKER_1,
                fee: mockStoredFee,
                order: mockStoredOtcOrder,
                chainId: 1337,
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
                takerSpecifiedSide: 'makerToken',
                workflow: 'rfqm',
            });

            await dataSource.getRepository(RfqmV2QuoteEntity).insert(mockQuote);

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: GaslessTypes.OtcOrder, order, signature: RANDOM_VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
            expect(appResponse.body.validationErrors[0].reason).to.equal(`order will expire too soon`);
        });

        it('[v2] should fail with 400 BAD REQUEST if signature is invalid', async () => {
            const order = otcOrder;
            const orderHash = order.getHash();

            const mockQuote = new RfqmV2QuoteEntity({
                orderHash,
                makerUri: MARKET_MAKER_1,
                fee: mockStoredFee,
                order: mockStoredOtcOrder,
                chainId: 1337,
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
                takerSpecifiedSide: 'makerToken',
                workflow: 'rfqm',
            });

            await dataSource.getRepository(RfqmV2QuoteEntity).insert(mockQuote);

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit`)
                .send({ type: GaslessTypes.OtcOrder, order, signature: RANDOM_VALID_SIGNATURE })
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/);

            expect(appResponse.body.reason).to.equal('Validation Failed');
            expect(appResponse.body.validationErrors[0].reason).to.equal(`signature is not valid`);
        });
    });

    describe('rfqm/v1/submit-with-approval', () => {
        const mockStoredFee: StoredFee = {
            token: '0x123',
            amount: '1000',
            type: 'fixed',
        };

        // OtcOrder Taker
        const otcOrderTakerAddress = '0xdA9AC423442169588DE6b4305f4E820D708d0cE5';
        const otcOrderTakerPrivateKey = '0x653fa328df81be180b58e42737bc4cef037a19a3b9673b15d20ee2eebb2e509d';

        // OtcOrder
        const mockStoredOtcOrder: StoredOtcOrder = {
            type: RfqmOrderTypes.Otc,
            order: {
                txOrigin: '0x123',
                maker: '0x123',
                taker: otcOrderTakerAddress,
                makerToken: '0x123',
                takerToken: '0x123',
                makerAmount: '1',
                takerAmount: '1',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                    new BigNumber(SAFE_EXPIRY),
                    ZERO,
                    new BigNumber(SAFE_EXPIRY),
                ).toString(),
                chainId: '1337',
                verifyingContract: '0x123',
            },
        };

        // Approval
        const approval = {
            type: MOCK_PERMIT_APPROVAL.kind,
            eip712: MOCK_PERMIT_APPROVAL.eip712,
        };
        const otcOrder = storedOtcOrderToOtcOrder(mockStoredOtcOrder);
        it('[v2] should return status 201 created and queue up a job with a successful request', async () => {
            // OtcOrder
            const order = otcOrder;
            const orderHash = order.getHash();

            // Taker Signature
            const takerSignature = ethSignHashWithKey(orderHash, otcOrderTakerPrivateKey);

            // Approval signature
            const signer = new ethers.Wallet(otcOrderTakerPrivateKey);
            const typesCopy: Partial<PermitEip712Types> = { ...approval.eip712.types };
            delete typesCopy.EIP712Domain;
            const rawApprovalSignature = await signer._signTypedData(
                approval.eip712.domain,
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                typesCopy as any,
                approval.eip712.message,
            );
            const { v, r, s } = ethers.utils.splitSignature(rawApprovalSignature);
            const approvalSignature = {
                v,
                r,
                s,
                signatureType: 3,
            };

            const mockQuote = new RfqmV2QuoteEntity({
                orderHash,
                makerUri: MARKET_MAKER_1,
                fee: mockStoredFee,
                order: mockStoredOtcOrder,
                chainId: 1337,
                affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
                takerSpecifiedSide: 'makerToken',
                workflow: 'rfqm',
            });

            // write a corresponding quote entity to validate against
            await dataSource.getRepository(RfqmV2QuoteEntity).insert(mockQuote);

            const appResponse = await request(app)
                .post(`${RFQM_PATH}/submit-with-approval`)
                .send({
                    trade: { type: GaslessTypes.OtcOrder, order, signature: takerSignature },
                    approval: {
                        type: GaslessApprovalTypes.Permit,
                        eip712: approval.eip712,
                        signature: approvalSignature,
                    },
                })
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.CREATED)
                .expect('Content-Type', /json/);

            expect(appResponse.body.orderHash).to.equal(orderHash);

            const dbJobEntity = await dataSource.getRepository(RfqmV2JobEntity).findOne({
                where: {
                    orderHash,
                },
            });

            expect(dbJobEntity).to.not.equal(null);
            expect(dbJobEntity?.orderHash).to.equal(mockQuote.orderHash);
            expect(dbJobEntity?.makerUri).to.equal(MARKET_MAKER_1);
            expect(dbJobEntity?.affiliateAddress).to.equal(MATCHA_AFFILIATE_ADDRESS);
            expect(dbJobEntity?.takerSignature).to.deep.eq(takerSignature);
            expect(dbJobEntity?.approval?.eip712).to.deep.eq(approval.eip712);
            expect(dbJobEntity?.approval?.kind).to.deep.eq(approval.type);
            expect(dbJobEntity?.approvalSignature).to.deep.eq(approvalSignature);
        });
    });

    describe('rfqm/v1/status/:orderHash', () => {
        it('should return a 404 NOT FOUND if the order hash is not found', () => {
            const orderHash = '0x00';
            return request(app)
                .get(`${RFQM_PATH}/status/${orderHash}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.NOT_FOUND);
        });

        it('should return a 200 when the order exists', async () => {
            await dbUtils.writeV2JobAsync(MOCK_RFQM_JOB);

            const response = await request(app)
                .get(`${RFQM_PATH}/status/${MOCK_RFQM_JOB.orderHash}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            // Response details are covered by the service test, but do one small check for sanity
            expect(response.body.status).to.equal('submitted');
        });

        it('should return status reason for failures', async () => {
            await dbUtils.writeV2JobAsync({
                ...MOCK_RFQM_JOB,
                status: RfqmJobStatus.FailedRevertedConfirmed,
            });

            const response = await request(app)
                .get(`${RFQM_PATH}/status/${MOCK_RFQM_JOB.orderHash}`)
                .set('0x-api-key', API_KEY)
                .set('0x-chain-id', '1337')
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            // Response details are covered by the service test, but do one small check for sanity
            expect(response.body.reason).to.equal('transaction_reverted');
        });
    });

    describe('/admin/v1/cleanup', () => {
        it('should return a 400 BAD REQUEST if the order hash is not found', () => {
            const orderHash = '0x00';
            return request(app)
                .post(`${ADMIN_PATH}/cleanup`)
                .send({ orderHashes: [orderHash] })
                .set('0x-admin-api-key', ADMIN_API_KEY)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return a 400 BAD REQUEST if no order hashes are sent', async () => {
            await request(app)
                .post(`${ADMIN_PATH}/cleanup`)
                .send({ orderHashes: [] })
                .set('0x-admin-api-key', ADMIN_API_KEY)
                .expect(HttpStatus.BAD_REQUEST);
        });

        it('should return a 400 BAD REQUEST if all job updates fail', async () => {
            await dbUtils.writeV2JobAsync({ ...MOCK_RFQM_JOB, status: RfqmJobStatus.SucceededConfirmed });
            const response = await request(app)
                .post(`${ADMIN_PATH}/cleanup`)
                .send({ orderHashes: [MOCK_RFQM_JOB.orderHash] })
                .set('0x-admin-api-key', ADMIN_API_KEY)
                .expect(HttpStatus.BAD_REQUEST);

            expect(response.body.unmodifiedJobs[0]).to.equal(MOCK_RFQM_JOB.orderHash);
        });

        it('should return a 401 UNAUTHORIZED if the API key is not an admin key', async () => {
            await dbUtils.writeV2JobAsync(MOCK_RFQM_JOB);
            const badApiKey = '0xbadapikey';

            return request(app)
                .post(`${ADMIN_PATH}/cleanup`)
                .send({ orderHashes: [MOCK_RFQM_JOB.orderHash] })
                .set('0x-admin-api-key', badApiKey)
                .expect(HttpStatus.UNAUTHORIZED);
        });

        it('should return a 200 OK when the jobs are successfully set to failure', async () => {
            await dbUtils.writeV2JobAsync({
                ...MOCK_RFQM_JOB,
                expiry: new BigNumber(Date.now() - 60_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0),
            });

            const response = await request(app)
                .post(`${ADMIN_PATH}/cleanup`)
                .send({ orderHashes: [MOCK_RFQM_JOB.orderHash] })
                .set('0x-admin-api-key', ADMIN_API_KEY)
                .expect(HttpStatus.OK)
                .expect('Content-Type', /json/);

            expect(response.body.modifiedJobs[0]).to.equal(MOCK_RFQM_JOB.orderHash);
        });

        it('should return a 207 MULTI STATUS if some jobs succeed and some jobs fail', async () => {
            await dbUtils.writeV2JobAsync({
                ...MOCK_RFQM_JOB,
                status: RfqmJobStatus.SucceededConfirmed,
                orderHash: '0x01',
            });
            await dbUtils.writeV2JobAsync({
                ...MOCK_RFQM_JOB,
                expiry: new BigNumber(Date.now() - 60_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0),
                orderHash: '0x02',
            });

            const response = await request(app)
                .post(`${ADMIN_PATH}/cleanup`)
                .send({ orderHashes: ['0x01', '0x02'] })
                .set('0x-admin-api-key', ADMIN_API_KEY)
                .expect(HttpStatus.MULTI_STATUS);

            expect(response.body.unmodifiedJobs[0]).to.equal('0x01');
            expect(response.body.modifiedJobs[0]).to.equal('0x02');
        });
    });
});
