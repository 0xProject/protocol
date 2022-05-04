import { RfqMakerAssetOfferings } from '@0x/asset-swapper/lib/src/types';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';

import { QuoteRequestor } from '../../src/quoteRequestor/quoteRequestor';
import { RfqtService } from '../../src/services/RfqtService';

jest.mock('../../src/quoteRequestor/quoteRequestor', () => ({
    QuoteRequestor: jest.fn().mockImplementation(() => {
        return {
            requestRfqtIndicativeQuotesAsync: jest.fn().mockResolvedValue([]),
            requestRfqtFirmQuotesAsync: jest.fn().mockResolvedValue([]),
        };
    }),
}));

// TODO (rhinodavid): Find a better way to initialize mocked classes
// tslint:disable-next-line: no-object-literal-type-assertion
const mockQuoteRequestor = jest.mocked(new QuoteRequestor({} as RfqMakerAssetOfferings, {} as AxiosInstance));

describe('Rfqt Service', () => {
    beforeEach(() => {
        mockQuoteRequestor.requestRfqtFirmQuotesAsync.mockReset();
        mockQuoteRequestor.requestRfqtIndicativeQuotesAsync.mockReset();
    });
    describe('v1', () => {
        describe('getV1PricesAsync', () => {
            it('passes through calls to QuoteRequestor::requestRfqtIndicativeQuotesAsync', async () => {
                const rfqtService = new RfqtService(mockQuoteRequestor);

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
                        "takerAddress": "0x0000000000000000000000000000000000000000",
                        "txOrigin": "0xtakeraddress",
                      },
                    ]
                `);
            });
        });
        describe('getV1QuotesAsync', () => {
            it('passes through calls to QuoteRequestor::requestRfqtFirmQuotesAsync', async () => {
                const rfqtService = new RfqtService(mockQuoteRequestor);

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
                        "txOrigin": "0xtakeraddress",
                      },
                    ]
                `);
            });
        });
    });
});
