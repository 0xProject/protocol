// tslint:disable:max-file-line-count
import {
    BigNumber,
    MockedRfqQuoteResponse,
    ProtocolFeeUtils,
    QuoteRequestor,
    RfqMakerAssetOfferings,
    rfqtMocker,
    RfqtQuoteEndpoint,
} from '@0x/asset-swapper';
import { ContractAddresses } from '@0x/contract-addresses';
import { expect } from '@0x/contracts-test-utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import Axios, { AxiosInstance } from 'axios';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import 'mocha';
import * as request from 'supertest';
import { instance, mock, when } from 'ts-mockito';

import * as config from '../src/config';
import { RFQM_PATH } from '../src/constants';
import { runHttpRfqmServiceAsync } from '../src/runners/http_rfqm_service_runner';
import { RfqmService } from '../src/services/rfqm_service';
import { ConfigManager } from '../src/utils/config_manager';

import { CONTRACT_ADDRESSES, getProvider, NULL_ADDRESS } from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';

// Force reload of the app avoid variables being polluted between test suites
delete require.cache[require.resolve('../src/app')];

const SUITE_NAME = 'RFQM Integration Tests';
const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';
const API_KEY = 'koolApiKey';

// RFQM Market Maker request specific constants
const MARKET_MAKER_1 = 'https://mock-rfqt1.club';
const MARKET_MAKER_2 = 'https://mock-rfqt2.club';
const BASE_RFQM_REQUEST_PARAMS = {
    txOrigin: MOCK_WORKER_REGISTRY_ADDRESS,
    takerAddress: NULL_ADDRESS,
    protocolVersion: '4',
    comparisonPrice: undefined,
    isLastLook: 'true',
};

describe(SUITE_NAME, () => {
    const contractAddresses: ContractAddresses = CONTRACT_ADDRESSES;
    let takerAddress: string;
    let axiosClient: AxiosInstance;
    let app: Express.Application;
    let server: Server;

    before(async () => {
        // docker-compose up
        await setupDependenciesAsync(SUITE_NAME);

        // Create a Provider
        const provider = getProvider();
        const web3Wrapper = new Web3Wrapper(provider);
        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        [, takerAddress] = accounts;

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
        const rfqmService = new RfqmService(
            quoteRequestor,
            protocolFeeUtils,
            contractAddresses,
            MOCK_WORKER_REGISTRY_ADDRESS,
        );

        // Start the server
        const res = await runHttpRfqmServiceAsync(rfqmService, configManager, config.defaultHttpServiceConfig);
        app = res.app;
        server = res.server;
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
                gasPrice: '100',
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
                gasPrice: '100',
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
                gasPrice: '100',
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
                gasPrice: '100',
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
                gasPrice: '100',
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
                gasPrice: '100',
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
                gasPrice: '100',
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
});
