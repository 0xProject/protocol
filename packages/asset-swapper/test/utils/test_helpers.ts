import { BigNumber } from '@0x/utils';
import axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { InsufficientAssetLiquidityError } from '../../src/errors';
import { MockedRfqtQuoteResponse } from '../../src/types';

export enum RfqtQuoteEndpoint {
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
                expect(e.amountAvailableToFill).to.be.undefined();
            }
        }

        expect(wasErrorThrown).to.be.true();
    },
    /**
     * A helper utility for testing which mocks out
     * requests to RFQ-t providers
     */
    withMockedRfqtQuotes: async (
        mockedResponses: MockedRfqtQuoteResponse[],
        quoteType: RfqtQuoteEndpoint,
        afterResponseCallback: () => Promise<void>,
        axiosClient: AxiosInstance = axios,
    ): Promise<void> => {
        const mockedAxios = new AxiosMockAdapter(axiosClient);
        try {
            // Mock out RFQT responses
            for (const mockedResponse of mockedResponses) {
                const { endpoint, requestApiKey, requestParams, responseData, responseCode } = mockedResponse;
                const requestHeaders = { Accept: 'application/json, text/plain, */*', '0x-api-key': requestApiKey };
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
