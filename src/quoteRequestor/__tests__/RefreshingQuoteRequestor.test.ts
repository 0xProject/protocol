import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'stream';

import { ConfigManager } from '../../utils/config_manager';
import { RfqMakerDbUtils } from '../../utils/rfq_maker_db_utils';
import { RfqMakerManager } from '../../utils/rfq_maker_manager';
import { QuoteRequestor } from '../QuoteRequestor';
import { RefreshingQuoteRequestor } from '../RefreshingQuoteRequestor';

jest.mock('axios');

const mockRequestRfqtIndicativeQuotesAsync = jest.fn().mockResolvedValue([]);
const mockRequestRfqtFirmQuotesAsync = jest.fn().mockResolvedValue([]);
jest.mock('../QuoteRequestor', () => {
    return {
        QuoteRequestor: jest.fn().mockImplementation((..._args) => {
            return {
                requestRfqtIndicativeQuotesAsync: mockRequestRfqtIndicativeQuotesAsync,
                requestRfqtFirmQuotesAsync: mockRequestRfqtFirmQuotesAsync,
            };
        }),
    };
});

jest.mock('../../utils/rfq_maker_manager', () => {
    return {
        RfqMakerManager: jest.fn().mockImplementation((..._args) => {
            const rmm = new EventEmitter() as unknown as jest.MockedObject<RfqMakerManager>;
            rmm.getRfqtV1MakerOfferings = jest.fn().mockReturnValue([]);
            return rmm;
        }),
    };
});

// TODO (rhinodavid): Find a better way to initialize mocked classes
const mockRfqMakerManager = jest.mocked(
    // tslint:disable-next-line: no-object-literal-type-assertion custom-no-magic-numbers
    new RfqMakerManager({} as ConfigManager, {} as RfqMakerDbUtils, /* chainId */ 1337),
);
const mockAxiosInstance = jest.mocked(axios.create()) as unknown as jest.MockedObject<AxiosInstance>;

describe('RefreshingQuoteRequestor', () => {
    it('refreshes the quote requestor instance on new pairs', () => {
        new RefreshingQuoteRequestor(mockRfqMakerManager, mockAxiosInstance); // tslint:disable-line: no-unused-expression

        expect(QuoteRequestor).toBeCalledTimes(1);

        mockRfqMakerManager.emit(RfqMakerManager.REFRESHED_EVENT);

        expect(QuoteRequestor).toBeCalledTimes(2);
    });

    describe('requestRfqtIndicativeQuotesAsync', () => {
        it('passes through arguments to quote requestor', async () => {
            const refreshingQuoteRequestor = new RefreshingQuoteRequestor(mockRfqMakerManager, mockAxiosInstance);

            await refreshingQuoteRequestor.requestRfqtIndicativeQuotesAsync(
                '0xmakertoken',
                '0xtakertoken',
                /* assetFillAmount */ new BigNumber(100),
                MarketOperation.Buy,
                /* comparisonPrice */ undefined,
                {
                    integrator: {
                        allowedChainIds: [],
                        apiKeys: [],
                        integratorId: 'uuid-integrator-id',
                        label: 'integrator',
                        plp: false,
                        rfqm: false,
                        rfqt: true,
                    },
                    intentOnFilling: false,
                    isIndicative: true,
                    takerAddress: '0xtakeraddress',
                    txOrigin: '0xtxorign',
                },
            );

            const args = mockRequestRfqtIndicativeQuotesAsync.mock.calls[0];
            expect(args).toMatchInlineSnapshot(`
                Array [
                  "0xmakertoken",
                  "0xtakertoken",
                  "100",
                  "Buy",
                  undefined,
                  Object {
                    "integrator": Object {
                      "allowedChainIds": Array [],
                      "apiKeys": Array [],
                      "integratorId": "uuid-integrator-id",
                      "label": "integrator",
                      "plp": false,
                      "rfqm": false,
                      "rfqt": true,
                    },
                    "intentOnFilling": false,
                    "isIndicative": true,
                    "takerAddress": "0xtakeraddress",
                    "txOrigin": "0xtxorign",
                  },
                ]
            `);
        });
    });

    describe('requestRfqtFirmQuotesAsync', () => {
        it('passes through arguments to quote requestor', async () => {
            const refreshingQuoteRequestor = new RefreshingQuoteRequestor(mockRfqMakerManager, mockAxiosInstance);

            await refreshingQuoteRequestor.requestRfqtFirmQuotesAsync(
                '0xmakertoken',
                '0xtakertoken',
                /* assetFillAmount */ new BigNumber(100),
                MarketOperation.Buy,
                /* comparisonPrice */ undefined,
                {
                    integrator: {
                        allowedChainIds: [],
                        apiKeys: [],
                        integratorId: 'uuid-integrator-id',
                        label: 'integrator',
                        plp: false,
                        rfqm: false,
                        rfqt: true,
                    },
                    intentOnFilling: true,
                    takerAddress: '0xtakeraddress',
                    txOrigin: '0xtxorign',
                },
            );

            const args = mockRequestRfqtFirmQuotesAsync.mock.calls[0];
            expect(args).toMatchInlineSnapshot(`
                Array [
                  "0xmakertoken",
                  "0xtakertoken",
                  "100",
                  "Buy",
                  undefined,
                  Object {
                    "integrator": Object {
                      "allowedChainIds": Array [],
                      "apiKeys": Array [],
                      "integratorId": "uuid-integrator-id",
                      "label": "integrator",
                      "plp": false,
                      "rfqm": false,
                      "rfqt": true,
                    },
                    "intentOnFilling": true,
                    "takerAddress": "0xtakeraddress",
                    "txOrigin": "0xtxorign",
                  },
                ]
            `);
        });
    });
});
