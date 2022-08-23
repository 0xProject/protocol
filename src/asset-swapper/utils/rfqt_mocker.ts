import axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { MockedRfqQuoteResponse } from '../types';

export enum RfqtQuoteEndpoint {
    Indicative = 'price',
    Firm = 'quote',
}

/**
 * A helper utility for testing which mocks out
 * requests to RFQ-t providers
 */
export const rfqtMocker = {
    /**
     * A helper utility for testing which mocks out
     * requests to RFQ-t providers
     */
    withMockedRfqtQuotes: async (
        mockedResponses: MockedRfqQuoteResponse[],
        quoteType: RfqtQuoteEndpoint,
        afterResponseCallback: () => Promise<void>,
        axiosClient: AxiosInstance = axios,
    ): Promise<void> => {
        const mockedAxios = new AxiosMockAdapter(axiosClient);
        try {
            // Mock out RFQT responses
            for (const mockedResponse of mockedResponses) {
                const { endpoint, requestApiKey, requestParams, responseData, responseCode } = mockedResponse;
                const requestHeaders = {
                    Accept: 'application/json, text/plain, */*',
                    '0x-api-key': requestApiKey,
                    '0x-integrator-id': requestApiKey,
                };
                mockedAxios
                    .onGet(`${endpoint}/${quoteType}`, { params: requestParams }, requestHeaders)
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
