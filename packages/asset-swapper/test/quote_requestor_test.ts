import { tokenUtils } from '@0x/dev-utils';
import { RfqOrder } from '@0x/protocol-utils';
import { TakerRequestQueryParams } from '@0x/quote-server';
import { StatusCodes } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';
import 'mocha';

import { constants } from '../src/constants';
import { MarketOperation, MockedRfqtFirmQuoteResponse, MockedRfqtIndicativeQuoteResponse } from '../src/types';
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

    describe('requestRfqtFirmQuotesAsync for firm quotes', async () => {
        it('should return successful RFQT requests', async () => {
            const takerAddress = '0xd209925defc99488e3afff1174e48b4fa628302a';
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
                protocolVersion: '4',
            };
            // Successful response
            const successfulOrder1 = new RfqOrder({
                makerToken,
                takerToken,
                taker: takerAddress,
                // feeRecipientAddress: '0x0000000000000000000000000000000000000001',
                expiry: makeThreeMinuteExpiry(),
            });
            mockedRequests.push({
                endpoint: 'https://1337.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { signedOrder: successfulOrder1 },
                responseCode: StatusCodes.Success,
            });
            // Test out a bad response code, ensure it doesnt cause throw
            mockedRequests.push({
                endpoint: 'https://420.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { error: 'bad request' },
                responseCode: StatusCodes.InternalError,
            });
            // Test out a successful response code but an invalid order
            mockedRequests.push({
                endpoint: 'https://421.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { makerToken: '123' },
                responseCode: StatusCodes.Success,
            });
            // ensure that a non-JSON response doesn't throw an error when trying to parse
            mockedRequests.push({
                endpoint: 'https://421.1.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: 'this is not JSON!',
                responseCode: StatusCodes.Success,
            });
            // A successful response code and valid order, but for wrong maker asset data
            const wrongMakerTokenOrder = new RfqOrder({
                makerToken: otherToken1,
                expiry: makeThreeMinuteExpiry(),
                takerToken,
            });
            mockedRequests.push({
                endpoint: 'https://422.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { signedOrder: wrongMakerTokenOrder },
                responseCode: StatusCodes.Success,
            });
            // A successful response code and valid order, but for wrong taker asset data
            const wrongTakerTokenOrder = new RfqOrder({
                makerToken,
                expiry: makeThreeMinuteExpiry(),
                takerToken: otherToken1,
            });
            mockedRequests.push({
                endpoint: 'https://423.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { signedOrder: wrongTakerTokenOrder },
                responseCode: StatusCodes.Success,
            });
            // A successful response code and good order but its unsigned
            const unsignedOrder = new RfqOrder({
                makerToken,
                takerToken,
                expiry: makeThreeMinuteExpiry(),
                // feeRecipientAddress: '0x0000000000000000000000000000000000000002',
            });
            // delete unsignedOrder.signature;
            mockedRequests.push({
                endpoint: 'https://424.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { signedOrder: unsignedOrder },
                responseCode: StatusCodes.Success,
            });
            // A successful response code and good order but for the wrong takerAddress
            const orderWithNullTaker = new RfqOrder({
                makerToken,
                takerToken,
                expiry: makeThreeMinuteExpiry(),
                taker: constants.NULL_ADDRESS,
                // feeRecipientAddress: '0x0000000000000000000000000000000000000002',
            });
            mockedRequests.push({
                endpoint: 'https://425.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { signedOrder: orderWithNullTaker },
                responseCode: StatusCodes.Success,
            });

            // Another Successful response
            const successfulOrder2 = new RfqOrder({
                makerToken,
                takerToken,
                taker: takerAddress,
                expiry: makeThreeMinuteExpiry(),
            });
            mockedRequests.push({
                endpoint: 'https://37.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { signedOrder: successfulOrder2 },
                responseCode: StatusCodes.Success,
            });

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
                        'https://426.0.0.1': [] /* Shouldn't ping an RFQ-T
                    provider when they don't support the requested asset pair. */,
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
                    expect(resp.sort()).to.eql(
                        [{ signedOrder: successfulOrder1 }, { signedOrder: successfulOrder2 }].sort(),
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
            // tslint:disable-next-line:array-type
            const mockedRequests: MockedRfqtIndicativeQuoteResponse[] = [];
            const expectedParams: TakerRequestQueryParams = {
                sellTokenAddress: takerToken,
                buyTokenAddress: makerToken,
                sellAmountBaseUnits: '10000',
                comparisonPrice: undefined,
                takerAddress,
                protocolVersion: '4',
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
                endpoint: 'https://1337.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: successfulQuote1,
                responseCode: StatusCodes.Success,
            });
            // Test out a bad response code, ensure it doesnt cause throw
            mockedRequests.push({
                endpoint: 'https://420.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { error: 'bad request' },
                responseCode: StatusCodes.InternalError,
            });
            // Test out a successful response code but an invalid order
            mockedRequests.push({
                endpoint: 'https://421.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { makerToken: '123' },
                responseCode: StatusCodes.Success,
            });
            // A successful response code and valid response data, but for wrong maker asset data
            mockedRequests.push({
                endpoint: 'https://422.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { ...successfulQuote1, makerToken: otherToken1 },
                responseCode: StatusCodes.Success,
            });
            // A successful response code and valid response data, but for wrong taker asset data
            mockedRequests.push({
                endpoint: 'https://423.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: { ...successfulQuote1, takerToken: otherToken1 },
                responseCode: StatusCodes.Success,
            });
            // Another Successful response
            mockedRequests.push({
                endpoint: 'https://37.0.0.1',
                requestApiKey: apiKey,
                requestParams: expectedParams,
                responseData: successfulQuote1,
                responseCode: StatusCodes.Success,
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
        it('should return successful RFQT indicative quote requests', async () => {
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
