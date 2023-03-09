import axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import * as _ from 'lodash';
import { AltMockedRfqQuoteResponse, MockedRfqQuoteResponse } from '../altMmTypes';

export enum RfqQuoteEndpoint {
    Indicative = 'price',
    Firm = 'quote',
}

export const testHelpers = {
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
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .reply(mockedResponse.callback as any);
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
