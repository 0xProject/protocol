import { tokenUtils } from '@0x/dev-utils';
import { FillQuoteTransformerOrderType, SignatureType } from '@0x/protocol-utils';
import { TakerRequestQueryParams } from '@0x/quote-server';
import { StatusCodes } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';
import _ = require('lodash');
import 'mocha';

import { constants } from '../src/constants';
import { MarketOperation, MockedRfqtFirmQuoteResponse, MockedRfqtIndicativeQuoteResponse } from '../src/types';
import { NULL_ADDRESS } from '../src/utils/market_operation_utils/constants';
import { QuoteRequestor, quoteRequestorHttpClient } from '../src/utils/quote_requestor';
import { rfqtMocker } from '../src/utils/rfqt_mocker';

import { chaiSetup } from './utils/chai_setup';

chaiSetup.configure();
const expect = chai.expect;

function makeThreeMinuteExpiry(): BigNumber {
    const expiry = new Date(Date.now());
    expiry.setMinutes(expiry.getMinutes() + 3);
    return new BigNumber(Math.round(expiry.valueOf() / constants.ONE_SECOND_MS));
}

describe('QuoteRequestor', async () => {
    const [makerToken, takerToken, otherToken1] = tokenUtils.getDummyERC20TokenAddresses();
    const validSignature = { v: 28, r: '0x', s: '0x', signatureType: SignatureType.EthSign };

    describe('requestRfqtFirmQuotesAsync for firm quotes', async () => {
        it('should return successful RFQT requests', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const txOrigin = takerAddress;
            const apiKey = 'my-ko0l-api-key';

            // Set up RFQT responses
            // tslint:disable-next-line:array-type
            const mockedRequests: MockedRfqtFirmQuoteResponse[] = [];
            const expectedParams: TakerRequestQueryParams = {
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

            return rfqtMocker.withMockedRfqtFirmQuotes(
                mockedRequests,
                async () => {
                    const qr = new QuoteRequestor({
                        'https://1337.0.0.1': [[makerToken, takerToken]],
                        'https://420.0.0.1': [[makerToken, takerToken]],
                        'https://421.0.0.1': [[makerToken, takerToken]],
                        'https://421.1.0.1': [[makerToken, takerToken]],
                        'https://422.0.0.1': [[makerToken, takerToken]],
                        'https://423.0.0.1': [[makerToken, takerToken]],
                        'https://424.0.0.1': [[makerToken, takerToken]],
                        'https://425.0.0.1': [[makerToken, takerToken]],
                        'https://426.0.0.1': [] /* Shouldn't ping an RFQ-T provider when they don't support the requested asset pair. */,
                        'https://37.0.0.1': [[makerToken, takerToken]],
                    });
                    const resp = await qr.requestRfqtFirmQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Sell,
                        undefined,
                        {
                            apiKey,
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                        },
                    );
                    expect(resp).to.deep.eq([normalizedSuccessfulOrder, normalizedSuccessfulOrder]);
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
            // tslint:disable-next-line:array-type
            const mockedRequests: MockedRfqtIndicativeQuoteResponse[] = [];
            const expectedParams: TakerRequestQueryParams = {
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

            mockedRequests.push({
                ...mockedDefaults,
                endpoint: 'https://1337.0.0.1',
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
                endpoint: 'https://37.0.0.1',
                responseData: successfulQuote1,
            });

            return rfqtMocker.withMockedRfqtIndicativeQuotes(
                mockedRequests,
                async () => {
                    const qr = new QuoteRequestor({
                        'https://1337.0.0.1': [[makerToken, takerToken]],
                        'https://420.0.0.1': [[makerToken, takerToken]],
                        'https://421.0.0.1': [[makerToken, takerToken]],
                        'https://422.0.0.1': [[makerToken, takerToken]],
                        'https://423.0.0.1': [[makerToken, takerToken]],
                        'https://424.0.0.1': [[makerToken, takerToken]],
                        'https://37.0.0.1': [[makerToken, takerToken]],
                    });
                    const resp = await qr.requestRfqtIndicativeQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Sell,
                        undefined,
                        {
                            apiKey,
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                        },
                    );
                    expect(resp.sort()).to.eql([successfulQuote1, successfulQuote1].sort());
                },
                quoteRequestorHttpClient,
            );
        });
        it('should return successful RFQT indicative quote requests (Buy)', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
            const apiKey = 'my-ko0l-api-key';

            // Set up RFQT responses
            // tslint:disable-next-line:array-type
            const mockedRequests: MockedRfqtIndicativeQuoteResponse[] = [];
            const expectedParams: TakerRequestQueryParams = {
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

            return rfqtMocker.withMockedRfqtIndicativeQuotes(
                mockedRequests,
                async () => {
                    const qr = new QuoteRequestor({ 'https://1337.0.0.1': [[makerToken, takerToken]] });
                    const resp = await qr.requestRfqtIndicativeQuotesAsync(
                        makerToken,
                        takerToken,
                        new BigNumber(10000),
                        MarketOperation.Buy,
                        undefined,
                        {
                            apiKey,
                            takerAddress,
                            txOrigin: takerAddress,
                            intentOnFilling: true,
                        },
                    );
                    expect(resp.sort()).to.eql([successfulQuote1].sort());
                },
                quoteRequestorHttpClient,
            );
        });
    });
});
