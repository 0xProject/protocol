// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { RfqOrder } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { SubmitRequest } from '@0x/quote-server';
import { BigNumber } from '@0x/utils';
import Axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import * as HttpStatus from 'http-status-codes';

import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { CONTRACT_ADDRESSES } from '../constants';

const makerUri = 'https://some-market-maker.xyz';
describe('QuoteServerClient', () => {
    const axiosInstance = Axios.create();
    const axiosMock = new AxiosMockAdapter(axiosInstance);

    afterEach(() => {
        axiosMock.reset();
    });

    describe('confirmLastLookAsync', () => {
        it('should reject last look if invalid takerTokenFillableAmount passed', async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                orderHash: 'someOrderHash',
                takerTokenFillAmount: new BigNumber('1225'),
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '100',
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                proceedWithFill: true,
                takerTokenFillAmount: '1223', // takerTokenFillableAmount is less than what was passed into the request.
                signedOrderHash: 'someOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(false);
        });

        it('should reject last look if valid negative response', async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                orderHash: 'someOrderHash',
                takerTokenFillAmount: new BigNumber('1225'),
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '100',
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                proceedWithFill: false,
                takerTokenFillAmount: '1225',
                signedOrderHash: 'someSignedOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(false);
        });

        it('should confirm last look if valid positive response', async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                takerTokenFillAmount: new BigNumber('1225'),
                orderHash: 'someOrderHash',
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '100',
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                takerTokenFillAmount: '1225',
                proceedWithFill: true,
                signedOrderHash: 'someOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(true);
        });

        it('should reject last look if invalid response', async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                takerTokenFillAmount: new BigNumber('1225'),
                orderHash: 'someOrderHash',
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '100',
                    type: 'invalid',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                proceedWithFill: true,
                takerTokenFillAmount: '1225',
                signedOrderHash: 'someOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(false);
        });

        it(`should reject last look if fee doesn't match`, async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                takerTokenFillAmount: new BigNumber('1225'),
                orderHash: 'someOrderHash',
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '101', // not what we expected above
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                proceedWithFill: true,
                takerTokenFillAmount: '1225',
                signedOrderHash: 'someOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(false);
        });
    });
});
