import { InsufficientAssetLiquidityError, MockedRfqQuoteResponse } from '@0x/asset-swapper';
import { AltMockedRfqQuoteResponse } from '@0x/asset-swapper/lib/src/types';
import { BigNumber } from '@0x/utils';
import axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import * as _ from 'lodash';

export enum RfqQuoteEndpoint {
    Indicative = 'price',
    Firm = 'quote',
}

export const testHelpers = {
    expectInsufficientLiquidityErrorAsync: async (
        expect: Chai.ExpectStatic,
        functionWhichTriggersErrorAsync: () => Promise<void>,
        expectedAmountAvailableToFill: BigNumber,
    ): Promise<void> => {
        let wasErrorThrown = false;
        try {
            await functionWhichTriggersErrorAsync();
        } catch (e) {
            wasErrorThrown = true;
            expect(e).to.be.instanceOf(InsufficientAssetLiquidityError);
            if (expectedAmountAvailableToFill) {
                expect(e.amountAvailableToFill).to.be.bignumber.equal(expectedAmountAvailableToFill);
            } else {
                expect(e.amountAvailableToFill).to.equal(undefined);
            }
        }

        expect(wasErrorThrown).to.equal(true);
    },
    /**
     * A helper utility for testing which mocks out
     * requests to RFQ-T/M providers
     */
    withMockedRfqQuotes: async (
        standardMockedResponses: MockedRfqQuoteResponse[],
        altMockedResponses: AltMockedRfqQuoteResponse[],
        quoteType: RfqQuoteEndpoint,
        afterResponseCallback: () => Promise<void>,
        axiosClient: AxiosInstance = axios,
    ): Promise<void> => {
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockedAxios = new AxiosMockAdapter(axiosClient, { onNoMatch: 'throwException' } as any);
        try {
            // Mock out Standard RFQ-T/M responses
            for (const mockedResponse of standardMockedResponses) {
                const { endpoint, requestApiKey, requestParams, responseData, responseCode } = mockedResponse;
                const requestHeaders = {
                    Accept: 'application/json, text/plain, */*',
                    '0x-api-key': requestApiKey,
                    '0x-integrator-id': requestApiKey,
                };
                if (mockedResponse.callback !== undefined) {
                    mockedAxios
                        .onGet(`${endpoint}/${quoteType}`, { params: requestParams }, requestHeaders)
                        .reply(mockedResponse.callback);
                } else {
                    mockedAxios
                        .onGet(`${endpoint}/${quoteType}`, { params: requestParams }, requestHeaders)
                        .replyOnce(responseCode, responseData);
                }
            }
            // Mock out Alt RFQ-T/M responses
            for (const mockedResponse of altMockedResponses) {
                const { endpoint, /* mmApiKey, */ requestData, responseData, responseCode } = mockedResponse;
                // Commented out during copy-paste
                // const requestHeaders = {
                //     Accept: 'application/json, text/plain, */*',
                //     'Content-Type': 'application/json;charset=utf-8',
                //     Authorization: `Bearer ${mmApiKey}`,
                // };
                mockedAxios
                    .onPost(
                        `${endpoint}/quotes`,
                        // hack to get AxiosMockAdapter to recognize the match
                        // b/t the mock data and the request data
                        {
                            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            asymmetricMatch: (x: any) => {
                                return _.isEqual(requestData, x);
                            },
                        },
                        // commented out to avoid over-specifying what the mock will match on.
                        // requestHeaders,
                    )
                    .replyOnce(responseCode, responseData);
            }
            // Perform the callback function, e.g. a test validation
            await afterResponseCallback();
        } finally {
            // Ensure we always restore axios afterwards
            mockedAxios.restore();
        }
    },
};
