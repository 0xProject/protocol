// tslint:disable:max-file-line-count
import { ERC20BridgeSource, rfqtMocker, SignedOrder } from '@0x/asset-swapper';
import { quoteRequestorHttpClient } from '@0x/asset-swapper/lib/src/utils/quote_requestor';
import { ContractAddresses } from '@0x/contract-addresses';
import { WETH9Contract } from '@0x/contract-wrappers';
import { DummyERC20TokenContract } from '@0x/contracts-erc20';
import { expect } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, web3Factory } from '@0x/dev-utils';
import { signatureUtils } from '@0x/order-utils';
import { Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import 'mocha';
import * as request from 'supertest';

import { AppDependencies, getAppAsync, getDefaultAppDependenciesAsync } from '../src/app';
import {
    defaultHttpServiceWithRateLimiterConfig,
    PROTOCOL_FEE_MULTIPLIER,
    RFQT_PROTOCOL_FEE_GAS_PRICE_MAX_PADDING_MULTIPLIER,
} from '../src/config';
import { SWAP_PATH as BASE_SWAP_PATH } from '../src/constants';

import { CONTRACT_ADDRESSES } from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { ganacheZrxWethOrderExchangeProxy, rfqtIndicativeQuoteResponse } from './utils/mocks';

let app: Express.Application;
let server: Server;

let web3Wrapper: Web3Wrapper;
let provider: Web3ProviderEngine;
let accounts: string[];
let blockchainLifecycle: BlockchainLifecycle;

let dependencies: AppDependencies;

// tslint:disable-next-line:custom-no-magic-numbers
const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
const SUITE_NAME = 'rfqt tests';

const EXCLUDED_SOURCES = Object.values(ERC20BridgeSource).filter(s => s !== ERC20BridgeSource.Native);
const DEFAULT_SELL_AMOUNT = new BigNumber(100000000000000000);
const DEFAULT_QUERY = `buyToken=ZRX&sellToken=WETH&excludedSources=${EXCLUDED_SOURCES.join(',')}&gasPrice=1`;

describe(SUITE_NAME, () => {
    const contractAddresses: ContractAddresses = CONTRACT_ADDRESSES;
    let makerAddress: string;
    let takerAddress: string;
    let wethContract: WETH9Contract;
    let zrxToken: DummyERC20TokenContract;

    before(async () => {
        // start the 0x-api app
        await setupDependenciesAsync(SUITE_NAME);

        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl,
        };
        provider = web3Factory.getRpcProvider(ganacheConfigs);
        web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);
        await blockchainLifecycle.startAsync();
        accounts = await web3Wrapper.getAvailableAddressesAsync();
        [makerAddress, takerAddress] = accounts;
        wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
        zrxToken = new DummyERC20TokenContract(contractAddresses.zrxToken, provider);

        // start the 0x-api app
        dependencies = await getDefaultAppDependenciesAsync(provider, defaultHttpServiceWithRateLimiterConfig);
        ({ app, server } = await getAppAsync({ ...dependencies }, defaultHttpServiceWithRateLimiterConfig));
    });

    after(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err?: Error) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('v1', async () => {
        const SWAP_PATH = `${BASE_SWAP_PATH}`;
        let DEFAULT_RFQT_RESPONSE_DATA: object;
        let signedOrder: SignedOrder;
        before(async () => {
            const flashWalletAddress = CONTRACT_ADDRESSES.exchangeProxyFlashWallet;
            DEFAULT_RFQT_RESPONSE_DATA = {
                endpoint: 'https://mock-rfqt1.club',
                responseCode: 200,
                requestApiKey: 'koolApiKey1',
                requestParams: {
                    sellTokenAddress: contractAddresses.etherToken,
                    buyTokenAddress: contractAddresses.zrxToken,
                    sellAmountBaseUnits: DEFAULT_SELL_AMOUNT.toString(),
                    takerAddress: flashWalletAddress,
                    comparisonPrice: undefined,
                },
            };
            const order: SignedOrder = {
                ...ganacheZrxWethOrderExchangeProxy,
                takerAddress: flashWalletAddress,
                makerAssetAmount: new BigNumber(ganacheZrxWethOrderExchangeProxy.makerAssetAmount),
                takerAssetAmount: new BigNumber(ganacheZrxWethOrderExchangeProxy.takerAssetAmount),
                takerFee: new BigNumber(ganacheZrxWethOrderExchangeProxy.takerFee),
                makerFee: new BigNumber(ganacheZrxWethOrderExchangeProxy.makerFee),
                expirationTimeSeconds: new BigNumber(ganacheZrxWethOrderExchangeProxy.expirationTimeSeconds),
                salt: new BigNumber(ganacheZrxWethOrderExchangeProxy.salt),
            };
            signedOrder = await signatureUtils.ecSignOrderAsync(provider, order, order.makerAddress);
            signedOrder = JSON.parse(JSON.stringify(signedOrder));
        });

        context('with maker allowances set', async () => {
            beforeEach(async () => {
                await zrxToken
                    .approve(contractAddresses.erc20Proxy, MAX_UINT256)
                    .sendTransactionAsync({ from: makerAddress });
            });

            context('getting a quote from an RFQ-T provider', async () => {
                it('should succeed when taker has balances and amounts', async () => {
                    await wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: { signedOrder },
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.OK)
                                .expect('Content-Type', /json/);

                            const responseJson = JSON.parse(appResponse.text);
                            expect(responseJson.orders.length).to.equal(1);
                            expect(responseJson.orders[0]).to.eql(signedOrder);
                        },
                        quoteRequestorHttpClient,
                    );
                });

                it('should pad protocol fee for firm quotes with RFQT orders', async () => {
                    await wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: { signedOrder },
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.OK)
                                .expect('Content-Type', /json/);

                            const responseJson = appResponse.body;
                            expect(responseJson.orders.length).to.equal(1);
                            expect(responseJson.gasPrice).to.equal('1');
                            expect(responseJson.protocolFee).to.equal(
                                PROTOCOL_FEE_MULTIPLIER.times(
                                    RFQT_PROTOCOL_FEE_GAS_PRICE_MAX_PADDING_MULTIPLIER,
                                ).toString(),
                            );
                            expect(responseJson.value).to.equal(
                                PROTOCOL_FEE_MULTIPLIER.times(
                                    RFQT_PROTOCOL_FEE_GAS_PRICE_MAX_PADDING_MULTIPLIER,
                                ).toString(),
                            );
                        },
                        quoteRequestorHttpClient,
                    );
                });
                it('should not include an RFQ-T order when intentOnFilling === false', async () => {
                    await wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: rfqtIndicativeQuoteResponse,
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=false&skipValidation=true`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.BAD_REQUEST)
                                .expect('Content-Type', /json/);

                            const validationErrors = appResponse.body.validationErrors;
                            expect(validationErrors.length).to.eql(1);
                            expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                        },
                        quoteRequestorHttpClient,
                    );
                });
                it('should not include an RFQ-T order when intentOnFilling is omitted', async () => {
                    await wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: rfqtIndicativeQuoteResponse,
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&skipValidation=true`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.BAD_REQUEST)
                                .expect('Content-Type', /json/);

                            const validationErrors = appResponse.body.validationErrors;
                            expect(validationErrors.length).to.eql(1);
                            expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                        },
                    );
                });
                it('should fail when taker address is not supplied for a firm quote', async () => {
                    const appResponse = await request(app)
                        .get(
                            `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&intentOnFilling=true`,
                        )
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);

                    const validationErrors = appResponse.body.validationErrors;
                    expect(validationErrors.length).to.eql(1);
                    expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                });
                it("should fail when it's a buy order and those are disabled (which is the default)", async () => {
                    const buyAmount = new BigNumber(100000000000000000);

                    await wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    const appResponse = await request(app)
                        .get(
                            `${SWAP_PATH}/quote?${DEFAULT_QUERY}&buyAmount=${buyAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&skipValidation=true`,
                        )
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);
                    const validationErrors = appResponse.body.validationErrors;
                    expect(validationErrors.length).to.eql(1);
                    expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                });
                it('should succeed when taker can not actually fill but we skip validation', async () => {
                    await wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: { signedOrder },
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&skipValidation=true`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.OK)
                                .expect('Content-Type', /json/);
                            const responseJson = JSON.parse(appResponse.text);
                            expect(responseJson.orders.length).to.equal(1);
                            expect(responseJson.orders[0]).to.eql(signedOrder);
                        },
                        quoteRequestorHttpClient,
                    );
                });
                it('should fail when bad api key used', async () => {
                    await wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    // this RFQ-T mock should never actually get hit b/c of the bad api key
                    // but in the case in which the bad api key was _not_ blocked
                    // this would cause the API to respond with RFQ-T liquidity
                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: signedOrder,
                                requestApiKey: 'badApiKey',
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&skipValidation=true`,
                                )
                                .set('0x-api-key', 'badApiKey')
                                .expect(HttpStatus.BAD_REQUEST)
                                .expect('Content-Type', /json/);
                            const validationErrors = appResponse.body.validationErrors;
                            expect(validationErrors.length).to.eql(1);
                            expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                        },
                    );
                });
                it('should fail validation when taker can not actually fill', async () => {
                    await wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: signedOrder,
                            } as any,
                        ],
                        async () => {
                            await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.BAD_REQUEST)
                                .expect('Content-Type', /json/);
                        },
                    );
                });
                it('should get an indicative quote from an RFQ-T provider', async () => {
                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: rfqtIndicativeQuoteResponse,
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/price?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.OK)
                                .expect('Content-Type', /json/);

                            const responseJson = JSON.parse(appResponse.text);
                            expect(responseJson.buyAmount).to.equal('100000000000000000');
                            expect(responseJson.price).to.equal('1');
                            expect(responseJson.sellAmount).to.equal('100000000000000000');
                            expect(responseJson.sources).to.deep.include.members([{ name: '0x', proportion: '1' }]);
                        },
                        quoteRequestorHttpClient,
                    );
                });
                it('should succeed when taker address is not supplied for an indicative quote', async () => {
                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: rfqtIndicativeQuoteResponse,
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/price?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&skipValidation=true`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.OK)
                                .expect('Content-Type', /json/);
                            const responseJson = JSON.parse(appResponse.text);
                            expect(responseJson.buyAmount).to.equal('100000000000000000');
                            expect(responseJson.price).to.equal('1');
                            expect(responseJson.sellAmount).to.equal('100000000000000000');
                            expect(responseJson.sources).to.deep.include.members([{ name: '0x', proportion: '1' }]);
                        },
                        quoteRequestorHttpClient,
                    );
                });
                it('should fail silently when RFQ-T provider gives an error response', async () => {
                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: {},
                                responseCode: 500,
                            } as any,
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/price?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.BAD_REQUEST)
                                .expect('Content-Type', /json/);

                            const validationErrors = appResponse.body.validationErrors;
                            expect(validationErrors.length).to.eql(1);
                            expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                        },
                        quoteRequestorHttpClient,
                    );
                });
            });
        });

        context('without maker allowances set', async () => {
            beforeEach(async () => {
                await zrxToken
                    .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                    .sendTransactionAsync({ from: makerAddress });
            });

            it('should not return order if maker allowances are not set', async () => {
                await wethContract
                    .approve(contractAddresses.exchangeProxyAllowanceTarget, new BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });

                return rfqtMocker.withMockedRfqtFirmQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: signedOrder,
                        } as any,
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/quote?${DEFAULT_QUERY}&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&skipValidation=true`,
                            )
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);

                        const validationErrors = appResponse.body.validationErrors;
                        expect(validationErrors.length).to.eql(1);
                        expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    },
                    quoteRequestorHttpClient,
                );
            });
        });
    });
});
