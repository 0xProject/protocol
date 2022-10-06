// tslint:disable custom-no-magic-numbers max-file-line-count
import { RfqMakerAssetOfferings } from '@0x/asset-swapper/lib/src/types';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { OtcOrder } from '@0x/protocol-utils';
import { Signature, SignatureType } from '@0x/protocol-utils/lib/src/signature_utils';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';

import { Integrator } from '../../src/config';
import { NULL_ADDRESS, ONE_SECOND_MS } from '../../src/constants';
import { RfqMaker } from '../../src/entities';
import { QuoteRequestor } from '../../src/quoteRequestor/QuoteRequestor';
import { RfqtService } from '../../src/services/RfqtService';
import { IndicativeQuote } from '../../src/types';
import { ConfigManager } from '../../src/utils/config_manager';
import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { RfqMakerDbUtils } from '../../src/utils/rfq_maker_db_utils';
import { RfqMakerManager } from '../../src/utils/rfq_maker_manager';

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

// TODO (rhinodavid): Find a better way to initialize mocked classes
// tslint:disable: no-object-literal-type-assertion
const mockQuoteRequestor = jest.mocked(new QuoteRequestor({} as RfqMakerAssetOfferings, {} as AxiosInstance));
const mockRfqMakerManager = jest.mocked(new RfqMakerManager({} as ConfigManager, {} as RfqMakerDbUtils, 0));
const mockQuoteServerClient = jest.mocked(new QuoteServerClient({} as AxiosInstance));
// tslint:enable: no-object-literal-type-assertion
const mockContractAddresses = getContractAddressesForChainOrThrow(1337);

describe('Rfqt Service', () => {
    beforeEach(() => {
        mockQuoteRequestor.requestRfqtFirmQuotesAsync.mockClear();
        mockQuoteRequestor.requestRfqtIndicativeQuotesAsync.mockClear();
        mockQuoteServerClient.batchGetPriceV2Async.mockClear();
        mockRfqMakerManager.getRfqtV2MakersForPair.mockClear();
    });
    describe('v1', () => {
        describe('getV1PricesAsync', () => {
            it('passes through calls to QuoteRequestor::requestRfqtIndicativeQuotesAsync', async () => {
                const rfqtService = new RfqtService(
                    0,
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    mockContractAddresses,
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
                    Array [
                      "0xmakertoken",
                      "0xtakertoken",
                      "111",
                      "Buy",
                      "666",
                      Object {
                        "altRfqAssetOfferings": Object {
                          "alt-mm": Array [
                            Object {
                              "baseAsset": "0xbaseasset",
                              "baseAssetDecimals": 420,
                              "id": "id",
                              "quoteAsset": "0xquoteasset",
                              "quoteAssetDecimals": 69,
                            },
                          ],
                        },
                        "integrator": Object {
                          "allowedChainIds": Array [],
                          "apiKeys": Array [],
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
                    mockContractAddresses,
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
                    Array [
                      "0xmakertoken",
                      "0xtakertoken",
                      "111",
                      "Buy",
                      "666",
                      Object {
                        "altRfqAssetOfferings": Object {
                          "alt-mm": Array [
                            Object {
                              "baseAsset": "0xbaseasset",
                              "baseAssetDecimals": 420,
                              "id": "id",
                              "quoteAsset": "0xquoteasset",
                              "quoteAssetDecimals": 69,
                            },
                          ],
                        },
                        "integrator": Object {
                          "allowedChainIds": Array [],
                          "apiKeys": Array [],
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
                const request = {
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    intentOnFilling: true,
                    makerToken: '0x1',
                    marketOperation: MarketOperation.Buy,
                    takerAddress: '0x0',
                    takerToken: '0x2',
                    txOrigin: '0xtakeraddress',
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    mockContractAddresses,
                );

                await rfqtService.getV2PricesAsync(request);

                expect(mockQuoteServerClient.batchGetPriceV2Async.mock.calls[0]).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      "maker.uri",
                    ],
                    Object {
                      "allowedChainIds": Array [
                        1337,
                      ],
                      "apiKeys": Array [],
                      "integratorId": "integrator-id",
                      "label": "test integrator",
                      "plp": false,
                      "rfqm": false,
                      "rfqt": true,
                    },
                    Object {
                      "buyAmountBaseUnits": "1000",
                      "buyTokenAddress": "0x1",
                      "chainId": "1337",
                      "feeAmount": "0",
                      "feeToken": "0x0b1ba0af832d7c05fd64161e0db78e85978e8082",
                      "integratorId": "integrator-id",
                      "sellTokenAddress": "0x2",
                      "takerAddress": "0x0",
                      "txOrigin": "0xtakeraddress",
                    },
                    [Function],
                  ]
                `);
            });
            it('transforms the API request into a quote server client request for sells', async () => {
                const request = {
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    intentOnFilling: true,
                    makerToken: '0x1',
                    marketOperation: MarketOperation.Sell,
                    takerAddress: '0x0',
                    takerToken: '0x2',
                    txOrigin: '0xtakeraddress',
                };

                mockRfqMakerManager.getRfqtV2MakersForPair = jest.fn().mockReturnValue([maker]);

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    mockContractAddresses,
                );

                await rfqtService.getV2PricesAsync(request);

                expect(mockQuoteServerClient.batchGetPriceV2Async.mock.calls[0]).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      "maker.uri",
                    ],
                    Object {
                      "allowedChainIds": Array [
                        1337,
                      ],
                      "apiKeys": Array [],
                      "integratorId": "integrator-id",
                      "label": "test integrator",
                      "plp": false,
                      "rfqm": false,
                      "rfqt": true,
                    },
                    Object {
                      "buyTokenAddress": "0x1",
                      "chainId": "1337",
                      "feeAmount": "0",
                      "feeToken": "0x0b1ba0af832d7c05fd64161e0db78e85978e8082",
                      "integratorId": "integrator-id",
                      "sellAmountBaseUnits": "1000",
                      "sellTokenAddress": "0x2",
                      "takerAddress": "0x0",
                      "txOrigin": "0xtakeraddress",
                    },
                    [Function],
                  ]
              `);
            });
            it('gets prices', async () => {
                const request = {
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    intentOnFilling: true,
                    makerToken: '0x1',
                    marketOperation: MarketOperation.Sell,
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

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    mockContractAddresses,
                );

                const result = await rfqtService.getV2PricesAsync(request);
                expect(result.length).toEqual(1);
                expect(result[0].makerId).toEqual('maker-id');
                expect(result[0]).toMatchInlineSnapshot(`
                  Object {
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
        });
        describe('getV2QuotesAsync', () => {
            const makerToken = '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE';
            const makerAddress = '0x79b7a69d90c82E014Bf0315e164208119B510FA0';
            const takerToken = '0x42d6622deCe394b54999Fbd73D108123806f6a18';
            const takerAddress = '0xE06fFA8146bBdECcBaaF72B6043b29091071AEB8';
            const fakeNow = new Date(1657069278103);
            const expiry = new BigNumber(fakeNow.getTime() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);

            it('filters out quotes with no signatures', async () => {
                const request = {
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    intentOnFilling: true,
                    makerToken,
                    marketOperation: MarketOperation.Buy,
                    takerAddress,
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

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    mockContractAddresses,
                );

                const result = await rfqtService.getV2QuotesAsync(request);

                expect(result.length).toEqual(0);
            });

            it("doesn't blow up if a sign request fails", async () => {
                const request = {
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    intentOnFilling: true,
                    makerToken,
                    marketOperation: MarketOperation.Buy,
                    takerAddress,
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

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    mockContractAddresses,
                );

                const result = await rfqtService.getV2QuotesAsync(request);

                expect(result.length).toEqual(0);
            });

            it('gets creates orders with unique nonces', async () => {
                const request = {
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    intentOnFilling: true,
                    makerToken,
                    marketOperation: MarketOperation.Buy,
                    takerAddress,
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

                const signature: Signature = { r: 'r', v: 21, s: 's', signatureType: SignatureType.EIP712 };
                mockQuoteServerClient.signV2Async = jest.fn().mockResolvedValue(signature);

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    mockContractAddresses,
                );

                const result = await rfqtService.getV2QuotesAsync(request, fakeNow);

                const [{ nonce: nonce1 }, { nonce: nonce2 }] = [
                    OtcOrder.parseExpiryAndNonce(result[0].order.expiryAndNonce),
                    OtcOrder.parseExpiryAndNonce(result[1].order.expiryAndNonce),
                ];

                expect(nonce1.toString()).not.toEqual(nonce2.toString());
            });

            it('gets a signed quote', async () => {
                const request = {
                    assetFillAmount: new BigNumber(1000),
                    chainId: 1337,
                    integrator,
                    intentOnFilling: true,
                    makerToken,
                    marketOperation: MarketOperation.Buy,
                    takerAddress: NULL_ADDRESS,
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

                const rfqtService = new RfqtService(
                    1337, // tslint:disable-line: custom-no-magic-numbers
                    mockRfqMakerManager,
                    mockQuoteRequestor,
                    mockQuoteServerClient,
                    mockContractAddresses,
                );

                const result = await rfqtService.getV2QuotesAsync(request, fakeNow);

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
