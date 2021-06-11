// tslint:disable:max-file-line-count
import {
    ERC20BridgeSource,
    MockedRfqQuoteResponse,
    RfqOrder,
    RfqOrderFields,
    rfqtMocker,
    RfqtQuoteEndpoint,
    Signature,
} from '@0x/asset-swapper';
import { ContractAddresses } from '@0x/contract-addresses';
import { WETH9Contract } from '@0x/contract-wrappers';
import { DummyERC20TokenContract } from '@0x/contracts-erc20';
import { expect } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, Web3Wrapper } from '@0x/dev-utils';
import { Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber } from '@0x/utils';
import Axios from 'axios';
import { Agent as HttpAgent, Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import { Agent as HttpsAgent } from 'https';
import * as _ from 'lodash';
import 'mocha';
import * as request from 'supertest';

import { AppDependencies, getAppAsync, getDefaultAppDependenciesAsync } from '../src/app';
import {
    defaultHttpServiceWithRateLimiterConfig,
    PROTOCOL_FEE_MULTIPLIER,
    RFQT_PROTOCOL_FEE_GAS_PRICE_MAX_PADDING_MULTIPLIER,
} from '../src/config';
import { SWAP_PATH as BASE_SWAP_PATH } from '../src/constants';

import { CONTRACT_ADDRESSES, ETHEREUM_RPC_URL, getProvider, NULL_ADDRESS } from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { ganacheZrxWethRfqOrderExchangeProxy, rfqtIndicativeQuoteResponse } from './utils/mocks';

// Force reload of the app avoid variables being polluted between test suites
delete require.cache[require.resolve('../src/app')];

// tslint:disable-next-line: custom-no-magic-numbers
const KEEP_ALIVE_TTL = 5 * 60 * 1000;

const quoteRequestorHttpClient = Axios.create({
    httpAgent: new HttpAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
    httpsAgent: new HttpsAgent({ keepAlive: true, timeout: KEEP_ALIVE_TTL }),
});

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

const EXCLUDED_SOURCES = Object.values(ERC20BridgeSource).filter((s) => s !== ERC20BridgeSource.Native);
const DEFAULT_SELL_AMOUNT = new BigNumber(100000000000000000);
const DEFAULT_QUERY = `buyToken=ZRX&sellToken=WETH&excludedSources=${EXCLUDED_SOURCES.join(',')}&gasPrice=1`;

describe.skip(SUITE_NAME, () => {
    const contractAddresses: ContractAddresses = CONTRACT_ADDRESSES;
    let makerAddress: string;
    let takerAddress: string;
    let wethContract: WETH9Contract;
    let zrxToken: DummyERC20TokenContract;

    before(async () => {
        // start the 0x-api app
        await setupDependenciesAsync(SUITE_NAME);
        provider = getProvider();
        web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);
        await blockchainLifecycle.startAsync();
        accounts = await web3Wrapper.getAvailableAddressesAsync();
        [makerAddress, takerAddress] = accounts;
        wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
        zrxToken = new DummyERC20TokenContract(contractAddresses.zrxToken, provider);

        // start the 0x-api app
        dependencies = await getDefaultAppDependenciesAsync(provider, {
            ...defaultHttpServiceWithRateLimiterConfig,
            ethereumRpcUrl: ETHEREUM_RPC_URL,
        });
        ({ app, server } = await getAppAsync(
            { ...dependencies },
            { ...defaultHttpServiceWithRateLimiterConfig, ethereumRpcUrl: ETHEREUM_RPC_URL },
        ));
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
        let DEFAULT_RFQT_RESPONSE_DATA: Partial<MockedRfqQuoteResponse>;
        let signedOrder: RfqOrderFields & { signature: Signature };
        before(async () => {
            DEFAULT_RFQT_RESPONSE_DATA = {
                endpoint: 'https://mock-rfqt1.club',
                responseCode: 200,
                requestApiKey: 'koolApiKey1',
                requestParams: {
                    txOrigin: takerAddress,
                    takerAddress: NULL_ADDRESS,
                    buyTokenAddress: contractAddresses.zrxToken,
                    sellTokenAddress: contractAddresses.etherToken,
                    protocolVersion: '4',
                    sellAmountBaseUnits: DEFAULT_SELL_AMOUNT.toString(),
                    comparisonPrice: undefined,
                },
            };
            const order = new RfqOrder({ ...ganacheZrxWethRfqOrderExchangeProxy, txOrigin: takerAddress });
            const signature = await order.getSignatureWithProviderAsync(provider);
            signedOrder = { ...order, signature };
            signedOrder = JSON.parse(JSON.stringify(signedOrder));
        });

        context('with maker allowances set', async () => {
            beforeEach(async () => {
                await zrxToken
                    .approve(contractAddresses.exchangeProxy, MAX_UINT256)
                    .sendTransactionAsync({ from: makerAddress });
            });

            context('getting a quote from an RFQ-T provider', async () => {
                // TODO try again after updating ganache snapshot
                it.skip('should succeed when taker has balances and amounts', async () => {
                    await wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.exchangeProxy, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: { signedOrder },
                            } as any,
                        ],
                        RfqtQuoteEndpoint.Firm,
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
                            expect(responseJson.orders[0].fillData.order).to.eql(_.omit(signedOrder, 'signature'));
                            expect(responseJson.orders[0].fillData.signature).to.eql(signedOrder.signature);
                        },
                        quoteRequestorHttpClient,
                    );
                });

                // TODO try again after updating ganache snapshot
                it.skip('should pad protocol fee for firm quotes with RFQT orders', async () => {
                    await wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.exchangeProxy, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: { signedOrder },
                            } as any,
                        ],
                        RfqtQuoteEndpoint.Firm,
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
                        .approve(contractAddresses.exchangeProxy, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: rfqtIndicativeQuoteResponse,
                            } as any,
                        ],
                        RfqtQuoteEndpoint.Indicative,
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
                        .approve(contractAddresses.exchangeProxy, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: rfqtIndicativeQuoteResponse,
                            } as any,
                        ],
                        RfqtQuoteEndpoint.Indicative,
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
                        .approve(contractAddresses.exchangeProxy, new BigNumber(0))
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
                        .approve(contractAddresses.exchangeProxy, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: { signedOrder },
                            } as any,
                        ],
                        RfqtQuoteEndpoint.Firm,
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
                            expect(responseJson.orders[0].fillData.order).to.eql(_.omit(signedOrder, 'signature'));
                            expect(responseJson.orders[0].fillData.signature).to.eql(signedOrder.signature);
                        },
                        quoteRequestorHttpClient,
                    );
                });
                it('should fail when bad api key used', async () => {
                    await wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.exchangeProxy, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    // this RFQ-T mock should never actually get hit b/c of the bad api key
                    // but in the case in which the bad api key was _not_ blocked
                    // this would cause the API to respond with RFQ-T liquidity
                    return rfqtMocker.withMockedRfqtQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: signedOrder,
                                requestApiKey: 'badApiKey',
                            } as any,
                        ],
                        RfqtQuoteEndpoint.Firm,
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
                        .approve(contractAddresses.exchangeProxy, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    return rfqtMocker.withMockedRfqtQuotes(
                        [
                            {
                                ...DEFAULT_RFQT_RESPONSE_DATA,
                                responseData: signedOrder,
                            } as any,
                        ],
                        RfqtQuoteEndpoint.Firm,
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
                    const mock = {
                        ...DEFAULT_RFQT_RESPONSE_DATA,
                        responseData: rfqtIndicativeQuoteResponse,
                    };
                    return rfqtMocker.withMockedRfqtQuotes(
                        [mock as any],
                        RfqtQuoteEndpoint.Indicative,
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
                    const mock = {
                        ...DEFAULT_RFQT_RESPONSE_DATA,
                        responseData: rfqtIndicativeQuoteResponse,
                    };
                    mock.requestParams!.txOrigin = NULL_ADDRESS;
                    return rfqtMocker.withMockedRfqtQuotes(
                        [mock as any],
                        RfqtQuoteEndpoint.Indicative,
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
                    const mock = {
                        ...DEFAULT_RFQT_RESPONSE_DATA,
                        responseData: {},
                        responseCode: 500,
                    };
                    mock.requestParams!.txOrigin = NULL_ADDRESS;
                    return rfqtMocker.withMockedRfqtQuotes(
                        [mock as any],
                        RfqtQuoteEndpoint.Indicative,
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
                    .approve(contractAddresses.exchangeProxy, new BigNumber(0))
                    .sendTransactionAsync({ from: makerAddress });
            });

            it('should not return order if maker allowances are not set', async () => {
                await wethContract
                    .approve(contractAddresses.exchangeProxy, new BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });

                return rfqtMocker.withMockedRfqtQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: signedOrder,
                        } as any,
                    ],
                    RfqtQuoteEndpoint.Firm,
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
