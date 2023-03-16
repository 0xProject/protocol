// tslint:disable custom-no-magic-numbers max-file-line-count
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { OtcOrder } from '@0x/protocol-utils';
import { Signature, SignatureType } from '@0x/protocol-utils/lib/src/signature_utils';
import { TokenMetadata } from '@0x/token-metadata';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';

import { Integrator } from '../../src/config';
import { DEFAULT_MIN_EXPIRY_DURATION_MS, NULL_ADDRESS, ONE_SECOND_MS } from '../../src/core/constants';
import { RfqMaker } from '../../src/entities';
import { QuoteRequestor } from '../../src/quoteRequestor/QuoteRequestor';
import { FeeService } from '../../src/services/fee_service';
import { RfqtService } from '../../src/services/RfqtService';
import { RfqMakerBalanceCacheService } from '../../src/services/rfq_maker_balance_cache_service';
import { FirmQuoteContext, QuoteContext } from '../../src/services/types';
import { IndicativeQuote } from '../../src/core/types';
import { CacheClient } from '../../src/utils/cache_client';
import { ConfigManager } from '../../src/utils/config_manager';
import { GasStationAttendant } from '../../src/utils/GasStationAttendant';
import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { RfqBalanceCheckUtils, RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { RfqMakerDbUtils } from '../../src/utils/rfq_maker_db_utils';
import { RfqMakerAssetOfferings, RfqMakerManager } from '../../src/utils/rfq_maker_manager';
import { TokenMetadataManager } from '../../src/utils/TokenMetadataManager';
import { TokenPriceOracle } from '../../src/utils/TokenPriceOracle';
import { ZeroExApiClient } from '../../src/utils/ZeroExApiClient';
import { RfqDynamicBlacklist } from '../../src/utils/rfq_dynamic_blacklist';

jest.mock('../../src/utils/rfq_maker_manager', () => ({
    RfqMakerManager: jest.fn().mockImplementation(() => {
        return {
            getRfqtV2MakersForPair: jest.fn(),
        };
    }),
}));

jest.mock('../../src/quoteRequestor/QuoteRequestor', () => ({
    QuoteRequestor: jest.fn().mockImplementation(() => {
        return {
            requestRfqtIndicativeQuotesAsync: jest.fn().mockResolvedValue([]),
            requestRfqtFirmQuotesAsync: jest.fn().mockResolvedValue([]),
        };
    }),
}));

jest.mock('../../src/utils/quote_server_client', () => ({
    QuoteServerClient: jest.fn().mockImplementation(() => {
        return {
            batchGetPriceV2Async: jest.fn().mockResolvedValue([]),
        };
    }),
}));

jest.mock('../../src/services/rfq_maker_balance_cache_service', () => ({
    RfqMakerBalanceCacheService: jest.fn().mockImplementation(() => {
        return {
            getERC20OwnerBalancesAsync: jest.fn().mockResolvedValue([]),
        };
    }),
}));

// TODO (rhinodavid): Find a better way to initialize mocked classes
const mockQuoteRequestor = jest.mocked(new QuoteRequestor({} as RfqMakerAssetOfferings, {} as AxiosInstance));
const mockRfqMakerManager = jest.mocked(new RfqMakerManager({} as ConfigManager, {} as RfqMakerDbUtils, 0));
const mockQuoteServerClient = jest.mocked(new QuoteServerClient({} as AxiosInstance));
const mockFeeService = jest.mocked(
    new FeeService(
        1337,
        {} as TokenMetadata,
        {} as ConfigManager,
        {} as GasStationAttendant,
        {} as TokenPriceOracle,
        {} as ZeroExApiClient,
        DEFAULT_MIN_EXPIRY_DURATION_MS,
    ),
);
const mockRfqBlockchainUtils = jest.mocked({} as RfqBlockchainUtils);
const mockTokenMetadataManager = jest.mocked(new TokenMetadataManager(1337, {} as RfqBlockchainUtils));
// tslint:enable: no-object-literal-type-assertion
const mockContractAddresses = getContractAddressesForChainOrThrow(1337);
const mockRfqMakerBalanceCacheService = jest.mocked(
    new RfqMakerBalanceCacheService({} as CacheClient, {} as RfqBalanceCheckUtils),
);
const mockCacheClient = jest.mocked({} as CacheClient);
const mockTokenPriceOracle = jest.mocked({} as TokenPriceOracle);
const mockRfqDynamicBlacklist = jest.mocked(new Set() as RfqDynamicBlacklist);

describe('Rfqt Service', () => {
    beforeEach(() => {
        mockQuoteRequestor.requestRfqtFirmQuotesAsync.mockClear();
        mockQuoteRequestor.requestRfqtIndicativeQuotesAsync.mockClear();
        mockQuoteServerClient.batchGetPriceV2Async.mockClear();
        mockRfqMakerManager.getRfqtV2MakersForPair.mockClear();
        mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync.mockClear();
    });
    describe('v1', () => {
        describe('getV1PricesAsync', () => {
            it('passes through calls to QuoteRequestor::requestRfqtIndicativeQuotesAsync', async () => {
                const rfqtService = new RfqtService(
                    0,
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                await rfqtService.getV1PricesAsync({
                    altRfqAssetOfferings: {
                        'alt-mm': [
                            {
                                id: 'id',
                                baseAsset: '0xbaseasset',
                                quoteAsset: '0xquoteasset',
                                baseAssetDecimals: 420,
                                quoteAssetDecimals: 69,
                            },
                        ],
                    },
                    assetFillAmount: new BigNumber(111),
                    comparisonPrice: new BigNumber(666),
                    makerToken: '0xmakertoken',
                    marketOperation: MarketOperation.Buy,
                    takerAddress: '0xtakeraddress',
                    takerToken: '0xtakertoken',
                    intentOnFilling: false,
                    integrator: {
                        apiKeys: [],
                        allowedChainIds: [],
                        integratorId: 'uuid-integrator',
                        plp: false,
                        rfqm: false,
                        rfqt: true,
                        label: 'Scam Integrator 1',
                    },
                    txOrigin: '0xtxorigin',
                });

                const args = mockQuoteRequestor.requestRfqtIndicativeQuotesAsync.mock.calls[0];
                expect(args).toMatchInlineSnapshot(`
                    [
                      "0xmakertoken",
                      "0xtakertoken",
                      "111",
                      "Buy",
                      "666",
                      {
                        "altRfqAssetOfferings": {
                          "alt-mm": [
                            {
                              "baseAsset": "0xbaseasset",
                              "baseAssetDecimals": 420,
                              "id": "id",
                              "quoteAsset": "0xquoteasset",
                              "quoteAssetDecimals": 69,
                            },
                          ],
                        },
                        "integrator": {
                          "allowedChainIds": [],
                          "apiKeys": [],
                          "integratorId": "uuid-integrator",
                          "label": "Scam Integrator 1",
                          "plp": false,
                          "rfqm": false,
                          "rfqt": true,
                        },
                        "intentOnFilling": false,
                        "isIndicative": true,
                        "isLastLook": false,
                        "makerEndpointMaxResponseTimeMs": 600,
                        "takerAddress": "0xtakeraddress",
                        "txOrigin": "0xtxorigin",
                      },
                    ]
                `);
            });
        });
        describe('getV1QuotesAsync', () => {
            it('passes through calls to QuoteRequestor::requestRfqtFirmQuotesAsync', async () => {
                mockQuoteRequestor.requestRfqtFirmQuotesAsync.mockResolvedValue([]);
                const rfqtService = new RfqtService(
                    0,
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                await rfqtService.getV1QuotesAsync({
                    altRfqAssetOfferings: {
                        'alt-mm': [
                            {
                                id: 'id',
                                baseAsset: '0xbaseasset',
                                quoteAsset: '0xquoteasset',
                                baseAssetDecimals: 420,
                                quoteAssetDecimals: 69,
                            },
                        ],
                    },
                    assetFillAmount: new BigNumber(111),
                    comparisonPrice: new BigNumber(666),
                    makerToken: '0xmakertoken',
                    marketOperation: MarketOperation.Buy,
                    takerAddress: '0xtakeraddress',
                    takerToken: '0xtakertoken',
                    intentOnFilling: false,
                    integrator: {
                        allowedChainIds: [],
                        apiKeys: [],
                        integratorId: 'uuid-integrator',
                        plp: false,
                        rfqm: false,
                        rfqt: true,
                        label: 'Scam Integrator 1',
                    },
                    txOrigin: '0xtxorigin',
                });

                const args = mockQuoteRequestor.requestRfqtFirmQuotesAsync.mock.calls[0];
                expect(args).toMatchInlineSnapshot(`
                    [
                      "0xmakertoken",
                      "0xtakertoken",
                      "111",
                      "Buy",
                      "666",
                      {
                        "altRfqAssetOfferings": {
                          "alt-mm": [
                            {
                              "baseAsset": "0xbaseasset",
                              "baseAssetDecimals": 420,
                              "id": "id",
                              "quoteAsset": "0xquoteasset",
                              "quoteAssetDecimals": 69,
                            },
                          ],
                        },
                        "integrator": {
                          "allowedChainIds": [],
                          "apiKeys": [],
                          "integratorId": "uuid-integrator",
                          "label": "Scam Integrator 1",
                          "plp": false,
                          "rfqm": false,
                          "rfqt": true,
                        },
                        "intentOnFilling": false,
                        "isIndicative": false,
                        "isLastLook": false,
                        "makerEndpointMaxResponseTimeMs": 600,
                        "takerAddress": "0xtakeraddress",
                        "txOrigin": "0xtxorigin",
                      },
                    ]
                `);
            });
        });
    });
    describe('v2', () => {
        const maker = new RfqMaker({
            makerId: 'maker-id',
            chainId: 1337,
            updatedAt: new Date(),
            pairs: [['0x1', '0x2']],
            rfqmUri: null,
            rfqtUri: 'maker.uri',
        });
        const maker2 = new RfqMaker({
            makerId: 'maker2-id',
            chainId: 1337,
            updatedAt: new Date(),
            pairs: [['0x1', '0x2']],
            rfqmUri: null,
            rfqtUri: 'maker2.uri',
        });
        const altonomy = new RfqMaker({
            makerId: 'fc8468a7-8bc3-4df0-abce-2bbd04c24cb0',
            chainId: 1337,
            updatedAt: new Date(),
            pairs: [['0x1', '0x2']],
            rfqmUri: null,
            rfqtUri: 'altonomy.uri',
        });
        const integrator: Integrator = {
            allowedChainIds: [1337], // tslint:disable-line: custom-no-magic-numbers
            apiKeys: [],
            integratorId: 'integrator-id',
            label: 'test integrator',
            plp: false,
            rfqm: false,
            rfqt: true,
        };
        describe('getV2PricesAsync', () => {
            it('transforms the API request into a quote server client request for buys', async () => {
                const quoteContext: QuoteContext = {
                    isFirm: false,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken: '0x1',
                    isSelling: false,
                    takerAddress: '0x0',
                    takerToken: '0x2',
                    txOrigin: '0xtakeraddress',
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                await rfqtService.getV2PricesAsync(quoteContext);

                expect(mockQuoteServerClient.batchGetPriceV2Async.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      [
                        "maker.uri",
                      ],
                      {
                        "allowedChainIds": [
                          1337,
                        ],
                        "apiKeys": [],
                        "integratorId": "integrator-id",
                        "label": "test integrator",
                        "plp": false,
                        "rfqm": false,
                        "rfqt": true,
                      },
                      {
                        "buyAmountBaseUnits": "1000",
                        "buyTokenAddress": "0x1",
                        "chainId": "1337",
                        "feeAmount": "100",
                        "feeToken": "0x0b1ba0af832d7c05fd64161e0db78e85978e8082",
                        "integratorId": "integrator-id",
                        "protocolVersion": "4",
                        "sellTokenAddress": "0x2",
                        "takerAddress": "0x0",
                        "txOrigin": "0xtakeraddress",
                        "workflow": "rfqt",
                      },
                      [Function],
                      "rfqt",
                    ]
                `);
            });
            it('[workflow: gasless-rfqt] transforms the API request into a quote server client request for buys', async () => {
                const quoteContext: QuoteContext = {
                    isFirm: false,
                    workflow: 'gasless-rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken: '0x1',
                    isSelling: false,
                    takerAddress: '0x0',
                    takerToken: '0x2',
                    txOrigin: '0xtakeraddress',
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([altonomy]);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                await rfqtService.getV2PricesAsync(quoteContext);

                expect(mockQuoteServerClient.batchGetPriceV2Async.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      [
                        "altonomy.uri",
                      ],
                      {
                        "allowedChainIds": [
                          1337,
                        ],
                        "apiKeys": [],
                        "integratorId": "integrator-id",
                        "label": "test integrator",
                        "plp": false,
                        "rfqm": false,
                        "rfqt": true,
                      },
                      {
                        "buyAmountBaseUnits": "1000",
                        "buyTokenAddress": "0x1",
                        "chainId": "1337",
                        "feeAmount": "100",
                        "feeToken": "0x0b1ba0af832d7c05fd64161e0db78e85978e8082",
                        "integratorId": "integrator-id",
                        "protocolVersion": "4",
                        "sellTokenAddress": "0x2",
                        "takerAddress": "0x0",
                        "txOrigin": "0xtakeraddress",
                        "workflow": "gasless-rfqt",
                      },
                      [Function],
                      "gasless-rfqt",
                    ]
                `);
            });
            it('transforms the API request into a quote server client request for sells', async () => {
                const quoteContext: QuoteContext = {
                    isFirm: false,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken: '0x1',
                    isSelling: true,
                    takerAddress: '0x0',
                    takerToken: '0x2',
                    txOrigin: '0xtakeraddress',
                };
                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                await rfqtService.getV2PricesAsync(quoteContext);

                expect(mockQuoteServerClient.batchGetPriceV2Async.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      [
                        "maker.uri",
                      ],
                      {
                        "allowedChainIds": [
                          1337,
                        ],
                        "apiKeys": [],
                        "integratorId": "integrator-id",
                        "label": "test integrator",
                        "plp": false,
                        "rfqm": false,
                        "rfqt": true,
                      },
                      {
                        "buyTokenAddress": "0x1",
                        "chainId": "1337",
                        "feeAmount": "100",
                        "feeToken": "0x0b1ba0af832d7c05fd64161e0db78e85978e8082",
                        "integratorId": "integrator-id",
                        "protocolVersion": "4",
                        "sellAmountBaseUnits": "1000",
                        "sellTokenAddress": "0x2",
                        "takerAddress": "0x0",
                        "txOrigin": "0xtakeraddress",
                        "workflow": "rfqt",
                      },
                      [Function],
                      "rfqt",
                    ]
                `);
            });
            it('gets prices', async () => {
                const quoteContext: QuoteContext = {
                    isFirm: false,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken: '0x1',
                    isSelling: true,
                    takerAddress: '0x0',
                    takerToken: '0x2',
                    txOrigin: '0xtakeraddress',
                };

                const price: IndicativeQuote = {
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
                    expiry: new BigNumber(9999999999999999),
                    maker: '0xmakeraddress',
                    makerAmount: new BigNumber(1000),
                    makerToken: '0x1',
                    makerUri: 'maker.uri',
                    takerAmount: new BigNumber(1001),
                    takerToken: '0x2',
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);
                mockQuoteServerClient.batchGetPriceV2Async = jest.fn().mockResolvedValue([price]);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                const result = await rfqtService.getV2PricesAsync(quoteContext);
                expect(result.length).toEqual(1);
                expect(result[0].makerId).toEqual('maker-id');
                expect(result[0]).toMatchInlineSnapshot(`
                    {
                      "expiry": "10000000000000000",
                      "makerAddress": "0xmakeraddress",
                      "makerAmount": "1000",
                      "makerId": "maker-id",
                      "makerToken": "0x1",
                      "makerUri": "maker.uri",
                      "takerAmount": "1001",
                      "takerToken": "0x2",
                    }
                `);
            });
            it('gets prices from whitelisted makers only', async () => {
                const quoteContext: QuoteContext = {
                    isFirm: false,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator: {
                        ...integrator,
                        whitelistMakerIds: ['maker1'],
                    },
                    makerToken: '0x1',
                    isSelling: true,
                    takerAddress: '0x0',
                    takerToken: '0x2',
                    txOrigin: '0xtakeraddress',
                };

                const price: IndicativeQuote = {
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
                    expiry: new BigNumber(9999999999999999),
                    maker: '0xmakeraddress',
                    makerAmount: new BigNumber(1000),
                    makerToken: '0x1',
                    makerUri: 'maker.uri',
                    takerAmount: new BigNumber(1001),
                    takerToken: '0x2',
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([
                    {
                        ...maker,
                        makerId: 'maker1',
                    },
                    {
                        ...maker,
                        makerId: 'maker2',
                    },
                ]);
                mockQuoteServerClient.batchGetPriceV2Async = jest.fn().mockResolvedValue([price]);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                const result = await rfqtService.getV2PricesAsync(quoteContext);
                expect(result.length).toEqual(1);
                expect(result[0].makerId).toEqual('maker1');
                expect(result[0]).toMatchInlineSnapshot(`
                    {
                      "expiry": "10000000000000000",
                      "makerAddress": "0xmakeraddress",
                      "makerAmount": "1000",
                      "makerId": "maker1",
                      "makerToken": "0x1",
                      "makerUri": "maker.uri",
                      "takerAmount": "1001",
                      "takerToken": "0x2",
                    }
                `);
            });
        });
        describe('getV2QuotesAsync', () => {
            const makerToken = '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE';
            const makerAddress = '0x79b7a69d90c82E014Bf0315e164208119B510FA0';
            const maker2Address = '0xe1bA72a87fb38bd7323f61177f158Fbb2D4549f4';
            const takerToken = '0x42d6622deCe394b54999Fbd73D108123806f6a18';
            const takerAddress = '0xE06fFA8146bBdECcBaaF72B6043b29091071AEB8';
            const fakeNow = new Date(1657069278103);
            const expiry = new BigNumber(fakeNow.getTime() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);

            mockRfqBlockchainUtils.isValidOrderSignerAsync = jest.fn().mockResolvedValue(true);
            it('filters out quotes with no signatures', async () => {
                const quoteContext: FirmQuoteContext = {
                    isFirm: true,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken,
                    isSelling: false,
                    takerAddress,
                    trader: takerAddress,
                    takerToken,
                    txOrigin: takerAddress,
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);
                mockQuoteServerClient.batchGetPriceV2Async = jest.fn().mockResolvedValue([
                    {
                        maker: makerAddress,
                        makerUri: maker.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(999),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                ]);
                mockQuoteServerClient.signV2Async = jest.fn().mockResolvedValue(undefined);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                const result = await rfqtService.getV2QuotesAsync(quoteContext);

                expect(result.length).toEqual(0);
            });

            it('filters out quotes with no signatures and still handles fillable amounts correctly', async () => {
                const quoteContext: FirmQuoteContext = {
                    isFirm: true,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken,
                    isSelling: false,
                    takerAddress,
                    trader: takerAddress,
                    takerToken,
                    txOrigin: takerAddress,
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker, maker2]);
                mockQuoteServerClient.batchGetPriceV2Async = jest.fn().mockResolvedValue([
                    {
                        maker: makerAddress,
                        makerUri: maker.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(999),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                    {
                        maker: maker2Address,
                        makerUri: maker2.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(999),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                ]);
                // First maker has no signature
                mockQuoteServerClient.signV2Async = jest.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce({
                    v: 27,
                    r: '0x123',
                    s: '0x456',
                    signatureType: SignatureType.EIP712,
                });
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });

                // Second maker has a smaller fillable amount
                mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync = jest
                    .fn()
                    .mockResolvedValue([new BigNumber(1000), new BigNumber(100)]);

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                const result = await rfqtService.getV2QuotesAsync(quoteContext, fakeNow);
                const order = new OtcOrder({
                    chainId: 1337,
                    makerAmount: new BigNumber(999),
                    takerAmount: new BigNumber(1000),
                    taker: NULL_ADDRESS,
                    makerToken,
                    takerToken,
                    maker: maker2Address,
                    txOrigin: quoteContext.txOrigin,
                    expiryAndNonce: new BigNumber(
                        '10401598717691489530826623925864187439861993812812831231287826374367',
                    ),
                    verifyingContract: mockContractAddresses.exchangeProxy,
                });

                expect(result.length).toEqual(1);
                expect(result).toEqual([
                    {
                        fillableMakerAmount: new BigNumber(100),
                        fillableTakerAmount: new BigNumber(100),
                        fillableTakerFeeAmount: new BigNumber(0),
                        makerId: maker2.makerId,
                        makerUri: maker2.rfqtUri,
                        order,
                        signature: {
                            v: 27,
                            r: '0x0000000000000000000000000000000000000000000000000000000000000123',
                            s: '0x0000000000000000000000000000000000000000000000000000000000000456',
                            signatureType: SignatureType.EIP712,
                        },
                    },
                ]);
            });

            it("doesn't blow up if a sign request fails", async () => {
                const quoteContext: FirmQuoteContext = {
                    isFirm: true,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken,
                    isSelling: false,
                    takerAddress,
                    trader: takerAddress,
                    takerToken,
                    txOrigin: takerAddress,
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);
                mockQuoteServerClient.batchGetPriceV2Async = jest.fn().mockResolvedValue([
                    {
                        maker: makerAddress,
                        makerUri: maker.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(999),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                ]);
                mockQuoteServerClient.signV2Async = jest.fn().mockRejectedValue(new Error('EXPLODE'));
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                const result = await rfqtService.getV2QuotesAsync(quoteContext);

                expect(result.length).toEqual(0);
            });

            it('[workflow: rfqt] creates orders with unique nonces', async () => {
                const quoteContext: FirmQuoteContext = {
                    isFirm: true,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken,
                    isSelling: false,
                    takerAddress,
                    trader: takerAddress,
                    takerToken,
                    txOrigin: takerAddress,
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);
                mockQuoteServerClient.batchGetPriceV2Async = jest.fn().mockResolvedValue([
                    {
                        maker: makerAddress,
                        makerUri: maker.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(999),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                    {
                        maker: makerAddress,
                        makerUri: maker.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(900),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                ]);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });
                mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync = jest
                    .fn()
                    .mockResolvedValue([new BigNumber(10000), new BigNumber(10000)]);

                const signature: Signature = { r: 'r', v: 21, s: 's', signatureType: SignatureType.EIP712 };
                mockQuoteServerClient.signV2Async = jest.fn().mockResolvedValue(signature);

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                const result = await rfqtService.getV2QuotesAsync(quoteContext, fakeNow);

                const [{ nonce: nonce1 }, { nonce: nonce2 }] = [
                    OtcOrder.parseExpiryAndNonce(result[0].order.expiryAndNonce),
                    OtcOrder.parseExpiryAndNonce(result[1].order.expiryAndNonce),
                ];

                expect(nonce1.toString()).not.toEqual(nonce2.toString());
            });

            it('[workflow: gasless-rfqt] creates orders with unique buckets', async () => {
                const quoteContext: FirmQuoteContext = {
                    isFirm: true,
                    workflow: 'gasless-rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken,
                    isSelling: false,
                    takerAddress,
                    trader: takerAddress,
                    takerToken,
                    txOrigin: takerAddress,
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([altonomy]);
                mockQuoteServerClient.batchGetPriceV2Async = jest.fn().mockResolvedValue([
                    {
                        maker: makerAddress,
                        makerUri: altonomy.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(999),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                    {
                        maker: makerAddress,
                        makerUri: altonomy.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(900),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                ]);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });
                mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync = jest
                    .fn()
                    .mockResolvedValue([new BigNumber(10000), new BigNumber(10000)]);

                const signature: Signature = { r: 'r', v: 21, s: 's', signatureType: SignatureType.EIP712 };
                mockQuoteServerClient.signV2Async = jest.fn().mockResolvedValue(signature);

                // 0 is a special return value since this will trigger a wrap around
                mockCacheClient.getNextNOtcOrderBucketsAsync = jest.fn().mockResolvedValue(0);

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                const result = await rfqtService.getV2QuotesAsync(quoteContext, fakeNow);
                console.log('result', result);

                const [{ nonceBucket: bucket1 }, { nonceBucket: bucket2 }] = [
                    OtcOrder.parseExpiryAndNonce(result[0].order.expiryAndNonce),
                    OtcOrder.parseExpiryAndNonce(result[1].order.expiryAndNonce),
                ];

                expect(bucket1.toString()).not.toEqual(bucket2.toString());
                // check that buckets are greater than zero (successfully wrapped around for negative numbers)
                expect(bucket1.toNumber()).toBeGreaterThanOrEqual(0);
                expect(bucket2.toNumber()).toBeGreaterThanOrEqual(0);
            });

            it('gets a signed quote', async () => {
                const quoteContext: FirmQuoteContext = {
                    isFirm: true,
                    workflow: 'rfqt',
                    isUnwrap: false,
                    originalMakerToken: '0x1',
                    takerTokenDecimals: 18,
                    makerTokenDecimals: 18,
                    feeModelVersion: 1,
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    makerToken,
                    isSelling: false,
                    takerAddress: NULL_ADDRESS,
                    trader: takerAddress,
                    takerToken,
                    txOrigin: takerAddress,
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);
                mockQuoteServerClient.batchGetPriceV2Async = jest.fn().mockResolvedValue([
                    {
                        maker: makerAddress,
                        makerUri: maker.rfqtUri,
                        makerToken,
                        takerToken,
                        makerAmount: new BigNumber(999),
                        takerAmount: new BigNumber(1000),
                        expiry,
                    },
                ]);
                const signature: Signature = { r: 'r', v: 21, s: 's', signatureType: SignatureType.EIP712 };
                mockQuoteServerClient.signV2Async = jest.fn().mockResolvedValue(signature);
                mockFeeService.calculateFeeAsync = jest.fn().mockResolvedValue({
                    feeWithDetails: {
                        token: '0x0b1ba0af832d7c05fd64161e0db78e85978e8082',
                        amount: new BigNumber(100),
                        type: 'fixed',
                    },
                });
                mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync = jest
                    .fn()
                    .mockResolvedValue([new BigNumber(10000)]);

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    DEFAULT_MIN_EXPIRY_DURATION_MS,
                    mockRfqBlockchainUtils,
                    mockTokenMetadataManager,
                    mockContractAddresses,
                    mockFeeService,
                    1,
                    mockRfqMakerBalanceCacheService,
                    mockCacheClient,
                    mockTokenPriceOracle,
                    mockRfqDynamicBlacklist,
                );

                const result = await rfqtService.getV2QuotesAsync(quoteContext, fakeNow);

                expect(result.length).toEqual(1);
                expect(result[0]).toMatchObject({
                    fillableMakerAmount: new BigNumber(999),
                    fillableTakerAmount: new BigNumber(1000),
                    fillableTakerFeeAmount: new BigNumber(0),
                    makerId: maker.makerId,
                    makerUri: maker.rfqtUri,
                    signature,
                });
                expect(result[0].order).toMatchInlineSnapshot(`
                                    OtcOrder {
                                      "chainId": 1337,
                                      "expiry": "1657070278",
                                      "expiryAndNonce": "10401598717691489530826623925864187439861993812812831231287826374366",
                                      "maker": "0x79b7a69d90c82E014Bf0315e164208119B510FA0",
                                      "makerAmount": "999",
                                      "makerToken": "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
                                      "nonce": "1657069278",
                                      "nonceBucket": "0",
                                      "taker": "0x0000000000000000000000000000000000000000",
                                      "takerAmount": "1000",
                                      "takerToken": "0x42d6622deCe394b54999Fbd73D108123806f6a18",
                                      "txOrigin": "0xE06fFA8146bBdECcBaaF72B6043b29091071AEB8",
                                      "verifyingContract": "0x5315e44798395d4a952530d131249fe00f554565",
                                    }
                              `);
            });
        });
    });
});
