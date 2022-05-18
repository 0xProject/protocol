// tslint:disable: custom-no-magic-numbers
import { BigNumber } from '@0x/utils';
import Axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import * as HttpStatus from 'http-status-codes';

import { ZeroExApiClient } from '../../src/utils/ZeroExApiClient';

let axiosClient: AxiosInstance;
let axiosMock: AxiosMockAdapter;

describe('ZeroExApiClient', () => {
    beforeAll(() => {
        axiosClient = Axios.create();
        axiosMock = new AxiosMockAdapter(axiosClient);
    });

    afterEach(() => {
        axiosMock.reset();
    });

    describe('fetchAmmQuoteAsync', () => {
        it('returns the AMM quote from 0x API', async () => {
            const zeroExApiClient = new ZeroExApiClient(axiosClient, 'api-key-for-rfq', {
                chainId: 1,
                zeroExClientBaseUrl: 'http://0x-chain-id-1',
            });

            axiosMock.onGet('http://0x-chain-id-1/swap/v1/quote').replyOnce(HttpStatus.OK, {
                buyAmount: '2040568023',
                sellAmount: '1000000000000000000',
                estimatedGas: '126183',
                expectedSlippage: '-0.0004065694347781162427479482993648',
                decodedUniqueId: 'a-quoteid-with-timestamp',
            });

            const ammQuote = await zeroExApiClient.fetchAmmQuoteAsync({
                makerToken: 'tokenB',
                takerToken: 'tokenA',
                takerAmount: new BigNumber('1000000000000000000'),
                affiliateAddress: 'rfq-affiliate-address',
            });

            expect(axiosMock.history.get[0].headers['0x-api-key']).toBe('api-key-for-rfq');
            expect(axiosMock.history.get[0].params).toEqual({
                buyToken: 'tokenB',
                sellToken: 'tokenA',
                sellAmount: '1000000000000000000',
                affiliateAddress: 'rfq-affiliate-address',
                excludedSources: '0x',
            });
            expect(ammQuote?.makerAmount.toString()).toEqual('2040568023');
            expect(ammQuote?.takerAmount.toString()).toEqual('1000000000000000000');
            expect(ammQuote?.estimatedGasWei.toString()).toEqual('126183');
            expect(ammQuote?.expectedSlippage.toString()).toEqual('-0.0004065694347781162427479482993648');
            expect(ammQuote?.decodedUniqueId).toEqual('a-quoteid-with-timestamp');
        });

        it('returns null when 0x API returns an error', async () => {
            const zeroExApiClient = new ZeroExApiClient(axiosClient, 'api-key-for-rfq', {
                chainId: 1,
                zeroExClientBaseUrl: 'http://0x-chain-id-1',
            });

            axiosMock.onGet('http://0x-chain-id-1/swap/v1/quote').replyOnce(HttpStatus.INTERNAL_SERVER_ERROR);

            const ammQuote = await zeroExApiClient.fetchAmmQuoteAsync({
                makerToken: 'tokenB',
                takerToken: 'tokenA',
                takerAmount: new BigNumber('1000000000000000000'),
            });
            expect(ammQuote).toEqual(null);
        });

        it('returns null when 0x API returns unexpected response body', async () => {
            const zeroExApiClient = new ZeroExApiClient(axiosClient, 'api-key-for-rfq', {
                chainId: 1,
                zeroExClientBaseUrl: 'http://0x-chain-id-1',
            });

            axiosMock.onGet('http://0x-chain-id-1/swap/v1/quote').replyOnce(HttpStatus.OK, {
                // Missing buyAmount
                sellAmount: '1000000000000000000',
                estimatedGas: '126183',
                expectedSlippage: '-0.0004065694347781162427479482993648',
                decodedUniqueId: 'a-quoteid-with-timestamp',
            });

            const ammQuote = await zeroExApiClient.fetchAmmQuoteAsync({
                makerToken: 'tokenB',
                takerToken: 'tokenA',
                takerAmount: new BigNumber('1000000000000000000'),
            });
            expect(ammQuote).toEqual(null);
        });
    });
});
