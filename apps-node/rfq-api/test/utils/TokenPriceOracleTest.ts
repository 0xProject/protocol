import Axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import * as HttpStatus from 'http-status-codes';

import { TokenPriceOracle } from '../../src/utils/TokenPriceOracle';

let axiosClient: AxiosInstance;
let axiosMock: AxiosMockAdapter;

describe('TokenPriceOracle', () => {
    beforeAll(() => {
        axiosClient = Axios.create();
        axiosMock = new AxiosMockAdapter(axiosClient);
    });

    afterEach(() => {
        axiosMock.reset();
        jest.useRealTimers();
    });

    describe('batchFetchTokenPriceAsync', () => {
        it('returns the price in USD for all requested tokens', async () => {
            const fakeDefinedFiResponseForUSDC = {
                data: {
                    getPrice: {
                        priceUsd: 1.1,
                    },
                },
            };
            const fakeDefinedUSDCResponseForETH = {
                data: {
                    getPrice: {
                        priceUsd: 3000.01,
                    },
                },
            };
            axiosMock
                .onPost('https://api.defined.fi')
                .replyOnce(HttpStatus.OK, fakeDefinedFiResponseForUSDC)
                .onPost('https://api.defined.fi')
                .replyOnce(HttpStatus.OK, fakeDefinedUSDCResponseForETH);

            const tokenPriceOracle = new TokenPriceOracle(axiosClient, 'fakeApiKey', 'https://api.defined.fi');
            const result = await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xUSDCContractAddress', tokenDecimals: 18 },
                { chainId: 3, tokenAddress: '0xWETHContractAddress', tokenDecimals: 18 },
            ]);
            expect(axiosMock.history.post[0].headers['x-api-key']).toBe('fakeApiKey');

            const expectedGraphqlQuery = `
                query getPrice {
                    getPrice(address: "0xUSDCContractAddress", networkId: 1) {
                        priceUsd
                    }
                }
            `;
            const actualGraphQlQuery = JSON.parse(axiosMock.history.post[0].data).query;
            // Strip out all indentations before comparing the body
            expect(actualGraphQlQuery.replace(/^\s+/gm, '')).toBe(expectedGraphqlQuery.replace(/^\s+/gm, ''));

            expect(result[0]?.toNumber()).toBe(1.1e-18);
            expect(result[1]?.toNumber()).toBe(3000.01e-18);
        });

        it('returns null when no price is returned', async () => {
            const fakeDefinedFiResponseForUSDC = {
                data: {
                    getPrice: {}, // no price returned
                },
            };
            const fakeDefinedUSDCResponseForETH = {
                data: {
                    getPrice: {}, // no price returned
                },
            };
            axiosMock
                .onPost('https://api.defined.fi')
                .replyOnce(HttpStatus.OK, fakeDefinedFiResponseForUSDC)
                .onPost('https://api.defined.fi')
                .replyOnce(HttpStatus.OK, fakeDefinedUSDCResponseForETH);

            const tokenPriceOracle = new TokenPriceOracle(axiosClient, 'fakeApiKey', 'https://api.defined.fi');
            const result = await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xUSDCContractAddress', tokenDecimals: 18, isNoResponseCritical: true },
                { chainId: 3, tokenAddress: '0xWETHContractAddress', tokenDecimals: 18, isNoResponseCritical: false },
            ]);
            expect(axiosMock.history.post[0].headers['x-api-key']).toBe('fakeApiKey');

            const expectedGraphqlQuery = `
                query getPrice {
                    getPrice(address: "0xUSDCContractAddress", networkId: 1) {
                        priceUsd
                    }
                }
            `;
            const actualGraphQlQuery = JSON.parse(axiosMock.history.post[0].data).query;
            // Strip out all indentations before comparing the body
            expect(actualGraphQlQuery.replace(/^\s+/gm, '')).toBe(expectedGraphqlQuery.replace(/^\s+/gm, ''));

            expect(result[0]).toBe(null);
            expect(result[1]).toBe(null);
        });

        it("returns null priceInUsd when it couldn't fetch the price", async () => {
            const tokenPriceOracle = new TokenPriceOracle(axiosClient, 'fakeApiKey', 'https://api.defined.fi');

            // Test the case when server returns non-200 response
            axiosMock.onPost('https://api.defined.fi').replyOnce(HttpStatus.INTERNAL_SERVER_ERROR);
            let result = await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xUSDCContractAddress', tokenDecimals: 18 },
            ]);
            expect(result[0]).toBe(null);

            // Test the case when server returns 200 but with unexpected response's body
            //
            // This is an actual response captured from defined.fi when we provide an invalid
            // token address to their getPrice endpoint
            const fakeDefinedResponseForInvalidToken = {
                data: {
                    getPrice: null,
                },
                errors: [
                    {
                        path: ['getPrice'],
                        data: null,
                        errorType: 'TypeError',
                        errorInfo: null,
                        locations: [
                            {
                                line: 2,
                                column: 1,
                                sourceName: null,
                            },
                        ],
                        message: "Cannot read property 'price' of undefined",
                    },
                ],
            };
            axiosMock.onPost('https://api.defined.fi').replyOnce(HttpStatus.OK, fakeDefinedResponseForInvalidToken);
            result = await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xInvalidContractAddress', tokenDecimals: 18 },
            ]);
            expect(result[0]).toBe(null);
        });

        it('caches the result', async () => {
            const tokenPriceOracle = new TokenPriceOracle(axiosClient, 'fakeApiKey', 'https://api.defined.fi');

            const fakeDefinedFiResponseForUSDC = {
                data: {
                    getPrice: {
                        priceUsd: 1.1,
                    },
                },
            };
            const fakeDefinedFiResponseForUSDCChanged = {
                data: {
                    getPrice: {
                        priceUsd: 2.1,
                    },
                },
            };

            axiosMock
                .onPost('https://api.defined.fi')
                .replyOnce(HttpStatus.OK, fakeDefinedFiResponseForUSDC)
                .onPost('https://api.defined.fi')
                .replyOnce(HttpStatus.OK, fakeDefinedFiResponseForUSDCChanged);

            let result = await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xUSDCContractAddress', tokenDecimals: 18 },
            ]);
            expect(result[0]?.toNumber()).toBe(1.1e-18);

            // Make another token price fetch request, the price should still be 1.1 because it didn't make another request to
            // defined.fi API
            result = await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xUSDCContractAddress', tokenDecimals: 18 },
            ]);
            // TokenPriceOracle shouldn't make another request to api.defined.fi
            expect(axiosMock.history.post).toHaveLength(1);
            expect(result[0]?.toNumber()).toBe(1.1e-18);
        });

        it('invalidates cache after configured TTL', async () => {
            // Set Cache TTL to 5 seconds
            const tokenPriceOracle = new TokenPriceOracle(axiosClient, 'fakeApiKey', 'https://api.defined.fi', 5000);

            const fakeDefinedFiResponseForUSDC = {
                data: {
                    getPrice: {
                        priceUsd: 1.1,
                    },
                },
            };
            const fakeDefinedFiResponseForUSDCChanged = {
                data: {
                    getPrice: {
                        priceUsd: 2.1,
                    },
                },
            };

            axiosMock
                .onPost('https://api.defined.fi')
                .replyOnce(HttpStatus.OK, fakeDefinedFiResponseForUSDC)
                .onPost('https://api.defined.fi')
                .replyOnce(HttpStatus.OK, fakeDefinedFiResponseForUSDCChanged);

            let result = await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xUSDCContractAddress', tokenDecimals: 18 },
            ]);
            expect(result[0]?.toNumber()).toBe(1.1e-18);

            // Fast forward the system time 5.1 seconds
            jest.useFakeTimers().setSystemTime(Date.now() + 5100);

            // Make another token price fetch request, the price should be 2.1 now since the cache is invalidated
            // so the TokenPriceOracle fetched the price from upstream again.
            result = await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xUSDCContractAddress', tokenDecimals: 18 },
            ]);
            expect(axiosMock.history.post).toHaveLength(2);
            expect(result[0]?.toNumber()).toBe(2.1e-18);
        });

        it('uses custom endpoint if provided', async () => {
            axiosMock.onPost('https://custom-endpoint.local').replyOnce(HttpStatus.OK, {
                data: {
                    getPrice: {
                        priceUsd: 1.1,
                    },
                },
            });

            const tokenPriceOracle = new TokenPriceOracle(
                axiosClient,
                'fakeApiKey',
                'https://custom-endpoint.local',
                5000,
            );
            await tokenPriceOracle.batchFetchTokenPriceAsync([
                { chainId: 1, tokenAddress: '0xUSDCContractAddress', tokenDecimals: 18 },
            ]);
            expect(axiosMock.history.post[0].url).toBe('https://custom-endpoint.local');
        });
    });
});
