import { tokenUtils } from '@0x/dev-utils';
import { ETH_TOKEN_ADDRESS, FillQuoteTransformerOrderType, SignatureType } from '@0x/protocol-utils';
import { TakerRequestQueryParamsUnnested, V4RFQIndicativeQuote } from '@0x/quote-server';
import { StatusCodes } from '@0x/types';
import { BigNumber, logUtils } from '@0x/utils';
import Axios from 'axios';
import * as chai from 'chai';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import _ = require('lodash');
import 'mocha';

import { constants, KEEP_ALIVE_TTL } from '../../src/asset-swapper/constants';
import {
    AltMockedRfqQuoteResponse,
    AltQuoteModel,
    AltQuoteRequestData,
    AltQuoteSide,
    AltRfqMakerAssetOfferings,
    MarketOperation,
    MockedRfqQuoteResponse,
} from '../../src/asset-swapper/types';
import { NULL_ADDRESS } from '../../src/asset-swapper/utils/market_operation_utils/constants';
import { QuoteRequestor } from '../../src/asset-swapper/utils/quote_requestor';

import { chaiSetup } from './utils/chai_setup';
import { RfqQuoteEndpoint, testHelpers } from './utils/test_helpers';

const quoteRequestorHttpClient = Axios.create({
    httpAgent: new HttpAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
    httpsAgent: new HttpsAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
});

chaiSetup.configure();
const expect = chai.expect;
const ALT_MM_API_KEY = 'averysecurekey';
const ALT_PROFILE = 'acoolprofile';
const ALT_RFQ_CREDS = {
    altRfqApiKey: ALT_MM_API_KEY,
    altRfqProfile: ALT_PROFILE,
};

const CREATED_STATUS_CODE = 201;

function makeThreeMinuteExpiry(): BigNumber {
    const expiry = new Date(Date.now());
    expiry.setMinutes(expiry.getMinutes() + 3);
    return new BigNumber(Math.round(expiry.valueOf() / constants.ONE_SECOND_MS));
}

describe('QuoteRequestor', async () => {
    const [makerToken, takerToken, otherToken1] = tokenUtils.getDummyERC20TokenAddresses();
    const validSignature = { v: 28, r: '0x', s: '0x', signatureType: SignatureType.EthSign };

    const altRfqAssetOfferings: AltRfqMakerAssetOfferings = {
        'https://132.0.0.1': [
            {
                id: 'XYZ-123',
                baseAsset: makerToken,
                quoteAsset: takerToken,
                baseAssetDecimals: 2,
                quoteAssetDecimals: 3,
            },
        ],
    };

    describe('requestRfqmFirmQuotesAsync for firm quotes', async () => {
        it('should return successful RFQM requests', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const txOrigin = takerAddress;
            const apiKey = 'my-ko0l-api-key';

            // Set up RFQM responses
            const mockedRequests: MockedRfqQuoteResponse[] = [];
            const altMockedRequests: AltMockedRfqQuoteResponse[] = [];

            const expectedParams: TakerRequestQueryParamsUnnested = {
                sellTokenAddress: takerToken,
                buyTokenAddress: makerToken,
                sellAmountBaseUnits: '10000',
                comparisonPrice: undefined,
                takerAddress,
                txOrigin,
                isLastLook: 'true', // the major difference between RFQ-T and RFQ-M
                protocolVersion: '4',
                feeAmount: '1000000000',
                feeToken: ETH_TOKEN_ADDRESS,
                feeType: 'fixed',
            };
            const mockedDefaults = {
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseCode: StatusCodes.Success,
            };
            const validSignedOrder = {
                makerToken,
                takerToken,
                makerAmount: new BigNumber('1000'),
                takerAmount: new BigNumber('1000'),
                maker: takerAddress,
                taker: takerAddress,
                pool: '0x',
                salt: '0',
                chainId: 1,
                verifyingContract: takerAddress,
                txOrigin,
                expiry: makeThreeMinuteExpiry(),
                signature: validSignature,
            };
            // request is to sell 10000 units of the base token
            // 10 units at 3 decimals
            const altFirmRequestData = {
                market: 'XYZ-123',
                model: AltQuoteModel.Firm,
                profile: ALT_PROFILE,
                side: AltQuoteSide.Sell,
                meta: {
                    txOrigin,
                    taker: takerAddress,
                    client: apiKey,
                },
                value: '10',
            };
            const altFirmResponse = {
                ...altFirmRequestData,
                id: 'random_id',
                price: new BigNumber(10 / 100).toString(),
                status: 'active',
                data: {
                    '0xv4order': validSignedOrder,
                },
            };

            // [GOOD] Successful response
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://1337.0.0.1',
                responseData: {
                    signedOrder: validSignedOrder,
                },
            });
            // [GOOD] Another Successful response
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://37.0.0.1',
                responseData: { signedOrder: validSignedOrder },
            });
            // [BAD] Test out a bad response code, ensure it doesnt cause throw
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://420.0.0.1',
                responseData: { error: 'bad request' },
                responseCode: StatusCodes.InternalError,
            });
            // [BAD] Test out a successful response code but a partial order
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://421.0.0.1',
                responseData: { signedOrder: { makerToken: '123' } },
            });
            // [BAD] A successful response code and invalid response data (encoding)
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://421.1.0.1',
                responseData: 'this is not JSON!',
            });
            // [BAD] A successful response code and valid order, but for wrong maker asset data
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://422.0.0.1',
                responseData: { signedOrder: { ...validSignedOrder, makerToken: '0x1234' } },
            });
            // [BAD] A successful response code and valid order, but for wrong taker asset data
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://423.0.0.1',
                responseData: { signedOrder: { ...validSignedOrder, takerToken: '0x1234' } },
            });
            // [BAD] A successful response code and good order but its unsigned
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://424.0.0.1',
                responseData: { signedOrder: _.omit(validSignedOrder, ['signature']) },
            });
            // [BAD] A successful response code and good order but for the wrong txOrigin
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://425.0.0.1',
                responseData: { signedOrder: { ...validSignedOrder, txOrigin: NULL_ADDRESS } },
            });
            // [GOOD] A successful response code and order from an alt RFQ implementation
            altMockedRequests.push({
                endpoint: 'https://132.0.0.1',
                mmApiKey: ALT_MM_API_KEY,
                responseCode: CREATED_STATUS_CODE,
                requestData: altFirmRequestData,
                responseData: altFirmResponse,
            });

            const normalizedSuccessfulOrder = {
                order: {
                    ..._.omit(validSignedOrder, ['signature']),
                    makerAmount: new BigNumber(validSignedOrder.makerAmount),
                    takerAmount: new BigNumber(validSignedOrder.takerAmount),
                    expiry: new BigNumber(validSignedOrder.expiry),
                    salt: new BigNumber(validSignedOrder.salt),
                },
                signature: validSignedOrder.signature,
                type: FillQuoteTransformerOrderType.Rfq,
            };

            return testHelpers.withMockedRfqQuotes(
                mockedRequests,
                altMockedRequests,
                RfqQuoteEndpoint.Firm,
                async () => {
                    const qr = new QuoteRequestor(
                        {}, // No RFQ-T asset offerings
                        {
                            'https://1337.0.0.1': [[makerToken, takerToken]],
                            'https://420.0.0.1': [[makerToken, takerToken]],
                            'https://421.0.0.1': [[makerToken, takerToken]],
                            'https://421.1.0.1': [[makerToken, takerToken]],
                            'https://422.0.0.1': [[makerToken, takerToken]],
                            'https://423.0.0.1': [[makerToken, takerToken]],
                            'https://424.0.0.1': [[makerToken, takerToken]],
                            'https://425.0.0.1': [[makerToken, takerToken]],
                            'https://426.0.0.1':
                                [] /* Shouldn't ping an RFQ provider when they don't support the requested asset pair. */,
                            'https://37.0.0.1': [[makerToken, takerToken]],
                        },
                        quoteRequestorHttpClient,
                        ALT_RFQ_CREDS,
                    );
                    const resp = await qr.requestRfqmFirmQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Sell,
                        undefined,
                        {
                            integrator: {
                                integratorId: apiKey,
                                label: 'foo',
                            },
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                            altRfqAssetOfferings,
                            isLastLook: true,
                            fee: {
                                amount: new BigNumber('1000000000'),
                                token: ETH_TOKEN_ADDRESS,
                                type: 'fixed',
                            },
                        },
                    );
                    expect(resp).to.deep.eq([
                        normalizedSuccessfulOrder,
                        normalizedSuccessfulOrder,
                        normalizedSuccessfulOrder,
                    ]);
                },
                quoteRequestorHttpClient,
            );
        });
    });
    describe('requestRfqtFirmQuotesAsync for firm quotes', async () => {
        it('should return successful RFQT requests', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const txOrigin = takerAddress;
            const apiKey = 'my-ko0l-api-key';

            // Set up RFQT responses
            const mockedRequests: MockedRfqQuoteResponse[] = [];
            const altMockedRequests: AltMockedRfqQuoteResponse[] = [];

            const expectedParams: TakerRequestQueryParamsUnnested = {
                sellTokenAddress: takerToken,
                buyTokenAddress: makerToken,
                sellAmountBaseUnits: '10000',
                comparisonPrice: undefined,
                takerAddress,
                txOrigin,
                protocolVersion: '4',
            };
            const mockedDefaults = {
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseCode: StatusCodes.Success,
            };
            const validSignedOrder = {
                makerToken,
                takerToken,
                makerAmount: new BigNumber('1000'),
                takerAmount: new BigNumber('1000'),
                maker: takerAddress,
                taker: takerAddress,
                pool: '0x',
                salt: '0',
                chainId: 1,
                verifyingContract: takerAddress,
                txOrigin,
                expiry: makeThreeMinuteExpiry(),
                signature: validSignature,
            };
            // request is to sell 10000 units of the base token
            // 10 units at 3 decimals
            const altFirmRequestData = {
                market: 'XYZ-123',
                model: AltQuoteModel.Firm,
                profile: ALT_PROFILE,
                side: AltQuoteSide.Sell,
                meta: {
                    txOrigin,
                    taker: takerAddress,
                    client: apiKey,
                },
                value: '10',
            };
            const altFirmResponse = {
                ...altFirmRequestData,
                id: 'random_id',
                price: new BigNumber(10 / 100).toString(),
                status: 'active',
                data: {
                    '0xv4order': validSignedOrder,
                },
            };

            // Successful response
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://1337.0.0.1',
                responseData: {
                    signedOrder: validSignedOrder,
                },
            });
            // Another Successful response
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://37.0.0.1',
                responseData: { signedOrder: validSignedOrder },
            });
            // Test out a bad response code, ensure it doesnt cause throw
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://420.0.0.1',
                responseData: { error: 'bad request' },
                responseCode: StatusCodes.InternalError,
            });
            // Test out a successful response code but a partial order
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://421.0.0.1',
                responseData: { signedOrder: { makerToken: '123' } },
            });
            // A successful response code and invalid response data (encoding)
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://421.1.0.1',
                responseData: 'this is not JSON!',
            });
            // A successful response code and valid order, but for wrong maker asset data
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://422.0.0.1',
                responseData: { signedOrder: { ...validSignedOrder, makerToken: '0x1234' } },
            });
            // A successful response code and valid order, but for wrong taker asset data
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://423.0.0.1',
                responseData: { signedOrder: { ...validSignedOrder, takerToken: '0x1234' } },
            });
            // A successful response code and good order but its unsigned
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://424.0.0.1',
                responseData: { signedOrder: _.omit(validSignedOrder, ['signature']) },
            });
            // A successful response code and good order but for the wrong txOrigin
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://425.0.0.1',
                responseData: { signedOrder: { ...validSignedOrder, txOrigin: NULL_ADDRESS } },
            });
            // A successful response code and order from an alt RFQ implementation
            altMockedRequests.push({
                endpoint: 'https://132.0.0.1',
                mmApiKey: ALT_MM_API_KEY,
                responseCode: CREATED_STATUS_CODE,
                requestData: altFirmRequestData,
                responseData: altFirmResponse,
            });

            const normalizedSuccessfulOrder = {
                order: {
                    ..._.omit(validSignedOrder, ['signature']),
                    makerAmount: new BigNumber(validSignedOrder.makerAmount),
                    takerAmount: new BigNumber(validSignedOrder.takerAmount),
                    expiry: new BigNumber(validSignedOrder.expiry),
                    salt: new BigNumber(validSignedOrder.salt),
                },
                signature: validSignedOrder.signature,
                type: FillQuoteTransformerOrderType.Rfq,
            };

            return testHelpers.withMockedRfqQuotes(
                mockedRequests,
                altMockedRequests,
                RfqQuoteEndpoint.Firm,
                async () => {
                    const qr = new QuoteRequestor(
                        {
                            'https://1337.0.0.1': [[makerToken, takerToken]],
                            'https://420.0.0.1': [[makerToken, takerToken]],
                            'https://421.0.0.1': [[makerToken, takerToken]],
                            'https://421.1.0.1': [[makerToken, takerToken]],
                            'https://422.0.0.1': [[makerToken, takerToken]],
                            'https://423.0.0.1': [[makerToken, takerToken]],
                            'https://424.0.0.1': [[makerToken, takerToken]],
                            'https://425.0.0.1': [[makerToken, takerToken]],
                            'https://426.0.0.1':
                                [] /* Shouldn't ping an RFQ-T provider when they don't support the requested asset pair. */,
                            'https://37.0.0.1': [[makerToken, takerToken]],
                        },
                        {},
                        quoteRequestorHttpClient,
                        ALT_RFQ_CREDS,
                    );
                    const resp = await qr.requestRfqtFirmQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Sell,
                        undefined,
                        {
                            integrator: {
                                integratorId: apiKey,
                                label: 'foo',
                            },
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                            altRfqAssetOfferings,
                        },
                    );
                    expect(resp).to.deep.eq([
                        normalizedSuccessfulOrder,
                        normalizedSuccessfulOrder,
                        normalizedSuccessfulOrder,
                    ]);
                },
                quoteRequestorHttpClient,
            );
        });
    });
    describe('requestRfqmIndicativeQuotesAsync for Indicative quotes', async () => {
        it('should return successful RFQM requests', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const apiKey = 'my-ko0l-api-key';

            // Set up RFQ responses
            const mockedRequests: MockedRfqQuoteResponse[] = [];
            const expectedParams: TakerRequestQueryParamsUnnested = {
                sellTokenAddress: takerToken,
                buyTokenAddress: makerToken,
                sellAmountBaseUnits: '10000',
                comparisonPrice: undefined,
                takerAddress,
                txOrigin: takerAddress,
                isLastLook: 'true', // the major difference between RFQ-T and RFQ-M
                protocolVersion: '4',
                feeAmount: '1000000000',
                feeToken: ETH_TOKEN_ADDRESS,
                feeType: 'fixed',
            };
            const mockedDefaults = {
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseCode: StatusCodes.Success,
            };

            // [GOOD] Successful response
            const successfulQuote1 = {
                makerToken,
                takerToken,
                makerAmount: new BigNumber(expectedParams.sellAmountBaseUnits),
                takerAmount: new BigNumber(expectedParams.sellAmountBaseUnits),
                expiry: makeThreeMinuteExpiry(),
            };

            const goodMMUri1 = 'https://1337.0.0.1';
            const goodMMUri2 = 'https://37.0.0.1';

            mockedRequests.push({
                ...mockedDefaults,
                endpoint: goodMMUri1,
                responseData: successfulQuote1,
            });
            // [GOOD] Another Successful response
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: goodMMUri2,
                responseData: successfulQuote1,
            });

            // [BAD] Test out a bad response code, ensure it doesnt cause throw
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://420.0.0.1',
                responseData: { error: 'bad request' },
                responseCode: StatusCodes.InternalError,
            });
            // [BAD] Test out a successful response code but an invalid order
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://421.0.0.1',
                responseData: { makerToken: '123' },
            });
            // [BAD] A successful response code and valid response data, but for wrong maker asset data
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://422.0.0.1',
                responseData: { ...successfulQuote1, makerToken: otherToken1 },
            });
            // [BAD] A successful response code and valid response data, but for wrong taker asset data
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://423.0.0.1',
                responseData: { ...successfulQuote1, takerToken: otherToken1 },
            });

            const assetOfferings: { [k: string]: [[string, string]] } = {
                'https://420.0.0.1': [[makerToken, takerToken]],
                'https://421.0.0.1': [[makerToken, takerToken]],
                'https://422.0.0.1': [[makerToken, takerToken]],
                'https://423.0.0.1': [[makerToken, takerToken]],
                'https://424.0.0.1': [[makerToken, takerToken]],
            };
            assetOfferings[goodMMUri1] = [[makerToken, takerToken]];
            assetOfferings[goodMMUri2] = [[makerToken, takerToken]];

            return testHelpers.withMockedRfqQuotes(
                mockedRequests,
                [],
                RfqQuoteEndpoint.Indicative,
                async () => {
                    const qr = new QuoteRequestor(
                        {}, // No RFQ-T asset offerings
                        assetOfferings,
                        quoteRequestorHttpClient,
                    );
                    const resp = await qr.requestRfqmIndicativeQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Sell,
                        undefined,
                        {
                            integrator: {
                                integratorId: apiKey,
                                label: 'foo',
                            },
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                            isLastLook: true,
                            fee: {
                                type: 'fixed',
                                token: ETH_TOKEN_ADDRESS,
                                amount: new BigNumber('1000000000'),
                            },
                        },
                    );
                    expect(resp.sort()).to.eql(
                        [
                            { ...successfulQuote1, makerUri: goodMMUri1 },
                            { ...successfulQuote1, makerUri: goodMMUri2 },
                        ].sort(),
                    );
                },
                quoteRequestorHttpClient,
            );
        });
    });
    describe('requestRfqtIndicativeQuotesAsync for Indicative quotes', async () => {
        it('should optionally accept a "comparisonPrice" parameter', async () => {
            const response = QuoteRequestor.makeQueryParameters(
                otherToken1, // tx origin
                otherToken1, // taker
                MarketOperation.Sell,
                makerToken,
                takerToken,
                new BigNumber(1000),
                new BigNumber(300.2),
            );
            expect(response.comparisonPrice).to.eql('300.2');
        });
        it('should return successful RFQT requests', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const apiKey = 'my-ko0l-api-key';

            // Set up RFQT responses
            const mockedRequests: MockedRfqQuoteResponse[] = [];
            const expectedParams: TakerRequestQueryParamsUnnested = {
                sellTokenAddress: takerToken,
                buyTokenAddress: makerToken,
                sellAmountBaseUnits: '10000',
                comparisonPrice: undefined,
                takerAddress,
                txOrigin: takerAddress,
                protocolVersion: '4',
            };
            const mockedDefaults = {
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseCode: StatusCodes.Success,
            };

            // Successful response
            const successfulQuote1 = {
                makerToken,
                takerToken,
                makerAmount: new BigNumber(expectedParams.sellAmountBaseUnits),
                takerAmount: new BigNumber(expectedParams.sellAmountBaseUnits),
                expiry: makeThreeMinuteExpiry(),
            };

            const goodMMUri1 = 'https://1337.0.0.1';
            const goodMMUri2 = 'https://37.0.0.1';

            mockedRequests.push({
                ...mockedDefaults,
                endpoint: goodMMUri1,
                responseData: successfulQuote1,
            });
            // Test out a bad response code, ensure it doesnt cause throw
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://420.0.0.1',
                responseData: { error: 'bad request' },
                responseCode: StatusCodes.InternalError,
            });
            // Test out a successful response code but an invalid order
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://421.0.0.1',
                responseData: { makerToken: '123' },
            });
            // A successful response code and valid response data, but for wrong maker asset data
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://422.0.0.1',
                responseData: { ...successfulQuote1, makerToken: otherToken1 },
            });
            // A successful response code and valid response data, but for wrong taker asset data
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://423.0.0.1',
                responseData: { ...successfulQuote1, takerToken: otherToken1 },
            });
            // Another Successful response
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: goodMMUri2,
                responseData: successfulQuote1,
            });

            const assetOfferings: { [k: string]: [[string, string]] } = {
                'https://420.0.0.1': [[makerToken, takerToken]],
                'https://421.0.0.1': [[makerToken, takerToken]],
                'https://422.0.0.1': [[makerToken, takerToken]],
                'https://423.0.0.1': [[makerToken, takerToken]],
                'https://424.0.0.1': [[makerToken, takerToken]],
            };
            assetOfferings[goodMMUri1] = [[makerToken, takerToken]];
            assetOfferings[goodMMUri2] = [[makerToken, takerToken]];

            return testHelpers.withMockedRfqQuotes(
                mockedRequests,
                [],
                RfqQuoteEndpoint.Indicative,
                async () => {
                    const qr = new QuoteRequestor(assetOfferings, {}, quoteRequestorHttpClient);
                    const resp = await qr.requestRfqtIndicativeQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Sell,
                        undefined,
                        {
                            integrator: {
                                integratorId: apiKey,
                                label: 'foo',
                            },
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                        },
                    );
                    expect(resp.sort()).to.eql(
                        [
                            { ...successfulQuote1, makerUri: goodMMUri1 },
                            { ...successfulQuote1, makerUri: goodMMUri2 },
                        ].sort(),
                    );
                },
                quoteRequestorHttpClient,
            );
        });
        it('should only return RFQT requests that meet the timeout', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const apiKey = 'my-ko0l-api-key';
            const maxTimeoutMs = 10;
            const exceedTimeoutMs = maxTimeoutMs + 50;

            // Set up RFQT responses
            const mockedRequests: MockedRfqQuoteResponse[] = [];
            const expectedParams: TakerRequestQueryParamsUnnested = {
                sellTokenAddress: takerToken,
                buyTokenAddress: makerToken,
                sellAmountBaseUnits: '10000',
                comparisonPrice: undefined,
                takerAddress,
                txOrigin: takerAddress,
                protocolVersion: '4',
            };
            const mockedDefaults = {
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseCode: StatusCodes.Success,
            };

            // Successful response
            const successfulQuote1 = {
                makerToken,
                takerToken,
                makerAmount: new BigNumber(expectedParams.sellAmountBaseUnits),
                takerAmount: new BigNumber(expectedParams.sellAmountBaseUnits),
                expiry: makeThreeMinuteExpiry(),
            };

            // One good request
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://1337.0.0.1',
                responseData: successfulQuote1,
            });

            // One request that will timeout
            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://420.0.0.1',
                responseData: successfulQuote1,
                callback: async () => {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            resolve([StatusCodes.Success, successfulQuote1]);
                        }, exceedTimeoutMs);
                    });
                },
            });

            return testHelpers.withMockedRfqQuotes(
                mockedRequests,
                [],
                RfqQuoteEndpoint.Indicative,
                async () => {
                    const qr = new QuoteRequestor(
                        {
                            'https://1337.0.0.1': [[makerToken, takerToken]],
                            'https://420.0.0.1': [[makerToken, takerToken]],
                        },
                        {},
                        quoteRequestorHttpClient,
                    );
                    const resp = await qr.requestRfqtIndicativeQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Sell,
                        undefined,
                        {
                            integrator: {
                                integratorId: apiKey,
                                label: 'foo',
                            },
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                            makerEndpointMaxResponseTimeMs: maxTimeoutMs,
                        },
                    );
                    expect(resp.sort()).to.eql([{ ...successfulQuote1, makerUri: 'https://1337.0.0.1' }].sort()); // notice only one result, despite two requests made
                },
                quoteRequestorHttpClient,
            );
        });
        it('should return successful RFQT indicative quote requests (Buy)', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const apiKey = 'my-ko0l-api-key';

            // Set up RFQT responses
            const mockedRequests: MockedRfqQuoteResponse[] = [];
            const expectedParams: TakerRequestQueryParamsUnnested = {
                sellTokenAddress: takerToken,
                buyTokenAddress: makerToken,
                buyAmountBaseUnits: '10000',
                comparisonPrice: undefined,
                takerAddress,
                txOrigin: takerAddress,
                protocolVersion: '4',
            };
            // Successful response
            const successfulQuote1 = {
                makerToken,
                takerToken,
                makerAmount: new BigNumber(expectedParams.buyAmountBaseUnits),
                takerAmount: new BigNumber(expectedParams.buyAmountBaseUnits),
                expiry: makeThreeMinuteExpiry(),
            };
            mockedRequests.push({
                endpoint: 'https://1337.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: successfulQuote1,
                responseCode: StatusCodes.Success,
            });

            return testHelpers.withMockedRfqQuotes(
                mockedRequests,
                [],
                RfqQuoteEndpoint.Indicative,
                async () => {
                    const qr = new QuoteRequestor(
                        { 'https://1337.0.0.1': [[makerToken, takerToken]] },
                        {},
                        quoteRequestorHttpClient,
                    );
                    const resp = await qr.requestRfqtIndicativeQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Buy,
                        undefined,
                        {
                            integrator: {
                                integratorId: apiKey,
                                label: 'foo',
                            },
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                        },
                    );
                    expect(resp.sort()).to.eql([{ ...successfulQuote1, makerUri: 'https://1337.0.0.1' }].sort());
                },
                quoteRequestorHttpClient,
            );
        });
        it('should be able to handle and filter RFQ offerings', () => {
            const tests: [string[] | undefined, string[]][] = [
                [['https://top.maker'], []],
                [undefined, ['https://foo.bar/', 'https://lorem.ipsum/']],
                [['https://lorem.ipsum/'], ['https://lorem.ipsum/']],
            ];
            for (const test of tests) {
                const [apiKeyWhitelist, results] = test;
                const response = QuoteRequestor.getTypedMakerUrlsAndWhitelist(
                    {
                        integrator: {
                            integratorId: 'foo',
                            label: 'bar',
                            whitelistIntegratorUrls: apiKeyWhitelist,
                        },
                        altRfqAssetOfferings: {},
                    },
                    {
                        'https://foo.bar/': [
                            [
                                '0xA6cD4cb8c62aCDe44739E3Ed0F1d13E0e31f2d94',
                                '0xF45107c0200a04A8aB9C600cc52A3C89AE5D0489',
                            ],
                        ],
                        'https://lorem.ipsum/': [
                            [
                                '0xA6cD4cb8c62aCDe44739E3Ed0F1d13E0e31f2d94',
                                '0xF45107c0200a04A8aB9C600cc52A3C89AE5D0489',
                            ],
                        ],
                    },
                );
                const typedUrls = response.map((typed) => typed.url);
                expect(typedUrls).to.eql(results);
            }
        });

        it('should return successful alt indicative quotes', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const txOrigin = '0xf209925defc99488e3afff1174e48b4fa628302a';
            const apiKey = 'my-ko0l-api-key';

            // base token has 2 decimals
            // quote token has 3 decimals
            const baseToken = makerToken;
            const quoteToken = takerToken;

            // Set up RFQT responses
            const altMockedRequests: AltMockedRfqQuoteResponse[] = [];
            const altScenarios: {
                successfulQuote: V4RFQIndicativeQuote;
                requestedMakerToken: string;
                requestedTakerToken: string;
                requestedAmount: BigNumber;
                requestedOperation: MarketOperation;
            }[] = [];

            // SCENARIO 1
            // buy, base asset specified
            // requesting to buy 100 units (10000 base units) of the base token
            // returning a price of 0.01, which should mean 10000 maker, 1000 taker amount
            const buyAmountAltRequest: AltQuoteRequestData = {
                market: 'XYZ-123',
                model: AltQuoteModel.Indicative,
                profile: ALT_PROFILE,
                side: AltQuoteSide.Sell,
                meta: {
                    txOrigin,
                    taker: takerAddress,
                    client: apiKey,
                },
                amount: '100',
            };
            // Successful response
            const buyAmountAltResponse = {
                ...buyAmountAltRequest,
                id: 'random_id',
                price: new BigNumber(0.01).toString(),
                status: 'live',
            };
            const successfulBuyAmountQuote: V4RFQIndicativeQuote = {
                makerToken: baseToken,
                takerToken: quoteToken,
                makerAmount: new BigNumber(10000),
                takerAmount: new BigNumber(1000),
                expiry: new BigNumber(0),
            };
            altMockedRequests.push({
                endpoint: 'https://132.0.0.1',
                mmApiKey: ALT_MM_API_KEY,
                responseCode: CREATED_STATUS_CODE,
                requestData: buyAmountAltRequest,
                responseData: buyAmountAltResponse,
            });
            altScenarios.push({
                successfulQuote: successfulBuyAmountQuote,
                requestedMakerToken: baseToken,
                requestedTakerToken: quoteToken,
                requestedAmount: new BigNumber(10000),
                requestedOperation: MarketOperation.Buy,
            });

            // SCENARIO 2
            // alt buy, quote asset specified
            // user is requesting to sell 1 unit of the quote token, or 1000 base units
            // returning a price of 0.01, which should mean 10000 maker amount, 1000 taker amount
            const buyValueAltRequest: AltQuoteRequestData = {
                market: 'XYZ-123',
                model: AltQuoteModel.Indicative,
                profile: ALT_PROFILE,
                side: AltQuoteSide.Sell,
                meta: {
                    txOrigin,
                    taker: takerAddress,
                    client: apiKey,
                },
                value: '1',
            };
            // Successful response
            const buyValueAltResponse = {
                ...buyValueAltRequest,
                id: 'random_id',
                price: new BigNumber(0.01).toString(),
                status: 'live',
            };
            const successfulBuyValueQuote: V4RFQIndicativeQuote = {
                makerToken: baseToken,
                takerToken: quoteToken,
                makerAmount: new BigNumber(10000),
                takerAmount: new BigNumber(1000),
                expiry: new BigNumber(0),
            };
            altMockedRequests.push({
                endpoint: 'https://132.0.0.1',
                mmApiKey: ALT_MM_API_KEY,
                responseCode: CREATED_STATUS_CODE,
                requestData: buyValueAltRequest,
                responseData: buyValueAltResponse,
            });
            altScenarios.push({
                successfulQuote: successfulBuyValueQuote,
                requestedMakerToken: baseToken,
                requestedTakerToken: quoteToken,
                requestedAmount: new BigNumber(1000),
                requestedOperation: MarketOperation.Sell,
            });

            // SCENARIO 3
            // alt sell, base asset specified
            // user is requesting to sell 100 units (10000 base units) of the base token
            // returning a price of 0.01, which should mean 10000 taker amount, 1000 maker amount
            const sellAmountAltRequest: AltQuoteRequestData = {
                market: 'XYZ-123',
                model: AltQuoteModel.Indicative,
                profile: ALT_PROFILE,
                side: AltQuoteSide.Buy,
                meta: {
                    txOrigin,
                    taker: takerAddress,
                    client: apiKey,
                },
                amount: '100',
            };
            // Successful response
            const sellAmountAltResponse = {
                ...sellAmountAltRequest,
                id: 'random_id',
                price: new BigNumber(0.01).toString(),
                status: 'live',
            };
            const successfulSellAmountQuote: V4RFQIndicativeQuote = {
                makerToken: quoteToken,
                takerToken: baseToken,
                makerAmount: new BigNumber(1000),
                takerAmount: new BigNumber(10000),
                expiry: new BigNumber(0),
            };
            altMockedRequests.push({
                endpoint: 'https://132.0.0.1',
                mmApiKey: ALT_MM_API_KEY,
                responseCode: CREATED_STATUS_CODE,
                requestData: sellAmountAltRequest,
                responseData: sellAmountAltResponse,
            });
            altScenarios.push({
                successfulQuote: successfulSellAmountQuote,
                requestedMakerToken: quoteToken,
                requestedTakerToken: baseToken,
                requestedAmount: new BigNumber(10000),
                requestedOperation: MarketOperation.Sell,
            });

            // SCENARIO 4
            // alt sell, quote asset specified
            // user is requesting to buy 1 unit (1000 base units) of the quote token
            // returning a price of 0.01, which should mean 10000 taker amount, 1000 maker amount
            const sellValueAltRequest: AltQuoteRequestData = {
                market: 'XYZ-123',
                model: AltQuoteModel.Indicative,
                profile: ALT_PROFILE,
                side: AltQuoteSide.Buy,
                meta: {
                    txOrigin,
                    taker: takerAddress,
                    client: apiKey,
                },
                value: '1',
            };
            // Successful response
            const sellValueAltResponse = {
                ...sellValueAltRequest,
                id: 'random_id',
                price: new BigNumber(0.01).toString(),
                status: 'live',
            };
            const successfulSellValueQuote: V4RFQIndicativeQuote = {
                makerToken: quoteToken,
                takerToken: baseToken,
                makerAmount: new BigNumber(1000),
                takerAmount: new BigNumber(10000),
                expiry: new BigNumber(0),
            };
            altMockedRequests.push({
                endpoint: 'https://132.0.0.1',
                mmApiKey: ALT_MM_API_KEY,
                responseCode: CREATED_STATUS_CODE,
                requestData: sellValueAltRequest,
                responseData: sellValueAltResponse,
            });
            altScenarios.push({
                successfulQuote: successfulSellValueQuote,
                requestedMakerToken: quoteToken,
                requestedTakerToken: baseToken,
                requestedAmount: new BigNumber(1000),
                requestedOperation: MarketOperation.Buy,
            });

            let scenarioCounter = 1;
            for (const altScenario of altScenarios) {
                logUtils.log(`Alt MM indicative scenario ${scenarioCounter}`);
                scenarioCounter += 1;
                await testHelpers.withMockedRfqQuotes(
                    [],
                    altMockedRequests,
                    RfqQuoteEndpoint.Indicative,
                    async () => {
                        const qr = new QuoteRequestor({}, {}, quoteRequestorHttpClient, ALT_RFQ_CREDS);
                        const resp = await qr.requestRfqtIndicativeQuotesAsync(
                            altScenario.requestedMakerToken,
                            altScenario.requestedTakerToken,
                            altScenario.requestedAmount,
                            altScenario.requestedOperation,
                            undefined,
                            {
                                integrator: {
                                    integratorId: apiKey,
                                    label: 'foo',
                                },
                                takerAddress,
                                txOrigin,
                                intentOnFilling: true,
                                altRfqAssetOfferings,
                            },
                        );
                        // hack to get the expiry right, since it's dependent on the current timestamp
                        const expected = { ...altScenario.successfulQuote, expiry: resp[0].expiry };
                        expect(resp.sort()).to.eql([expected].sort());
                    },
                    quoteRequestorHttpClient,
                );
            }
        });
    });
});
