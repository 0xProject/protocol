// tslint:disable:max-file-line-count
import { ERC20BridgeSource, rfqtMocker } from '@0x/asset-swapper';
import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { ERC20TokenContract, WETH9Contract } from '@0x/contract-wrappers';
import { expect } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, web3Factory } from '@0x/dev-utils';
import { Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import 'mocha';
import * as request from 'supertest';

import { AppDependencies, getAppAsync, getDefaultAppDependenciesAsync } from '../src/app';
import * as config from '../src/config';
import { SWAP_PATH } from '../src/constants';

import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { ganacheZrxWethOrder1, rfqtIndicativeQuoteResponse } from './utils/mocks';

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
const excludedSources = [
    ERC20BridgeSource.Uniswap,
    ERC20BridgeSource.UniswapV2,
    ERC20BridgeSource.UniswapV2Eth,
    ERC20BridgeSource.Kyber,
    ERC20BridgeSource.LiquidityProvider,
    ERC20BridgeSource.Eth2Dai,
    ERC20BridgeSource.MultiBridge,
];
const DEFAULT_EXCLUDED_SOURCES = excludedSources.join(',');
const DEFAULT_SELL_AMOUNT = new BigNumber(100000000000000000);
let DEFAULT_RFQT_RESPONSE_DATA;

describe(SUITE_NAME, () => {
    let contractAddresses: ContractAddresses;
    let makerAddress: string;
    let takerAddress: string;

    before(async () => {
        // start the 0x-api app
        await setupDependenciesAsync(SUITE_NAME);

        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: config.ETHEREUM_RPC_URL,
        };
        provider = web3Factory.getRpcProvider(ganacheConfigs);
        web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);
        await blockchainLifecycle.startAsync();
        accounts = await web3Wrapper.getAvailableAddressesAsync();
        contractAddresses = getContractAddressesForChainOrThrow(await web3Wrapper.getChainIdAsync());
        [makerAddress, takerAddress] = accounts;

        // start the 0x-api app
        dependencies = await getDefaultAppDependenciesAsync(provider, config);
        ({ app, server } = await getAppAsync({ ...dependencies }, config));

        DEFAULT_RFQT_RESPONSE_DATA = {
            endpoint: 'https://mock-rfqt1.club',
            responseCode: 200,
            requestApiKey: 'koolApiKey1',
            requestParams: {
                sellToken: contractAddresses.etherToken,
                buyToken: contractAddresses.zrxToken,
                sellAmount: DEFAULT_SELL_AMOUNT.toString(),
                buyAmount: undefined,
                takerAddress,
            },
        };
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

    context('with maker allowances set', async () => {
        beforeEach(async () => {
            const zrxToken = new ERC20TokenContract(contractAddresses.zrxToken, provider);
            await zrxToken
                .approve(contractAddresses.erc20Proxy, MAX_UINT256)
                .sendTransactionAsync({ from: makerAddress });
        });

        context('getting a quote from an RFQ-T provider', async () => {
            it('should succeed when taker has balances and amounts', async () => {
                const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                await wethContract.deposit().sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                await wethContract
                    .approve(contractAddresses.erc20Proxy, DEFAULT_SELL_AMOUNT)
                    .sendTransactionAsync({ from: takerAddress });

                return rfqtMocker.withMockedRfqtFirmQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: ganacheZrxWethOrder1,
                        },
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`,
                            )
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);

                        const responseJson = JSON.parse(appResponse.text);
                        expect(responseJson.orders.length).to.equal(1);
                        expect(responseJson.orders[0]).to.eql(ganacheZrxWethOrder1);
                    },
                );
            });
            it('should not include an RFQ-T order when intentOnFilling === false', async () => {
                const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                await wethContract.deposit().sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                await wethContract
                    .approve(contractAddresses.erc20Proxy, DEFAULT_SELL_AMOUNT)
                    .sendTransactionAsync({ from: takerAddress });

                return rfqtMocker.withMockedRfqtIndicativeQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: rfqtIndicativeQuoteResponse,
                        },
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=false&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`,
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
            it('should not include an RFQ-T order when intentOnFilling is omitted', async () => {
                const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                await wethContract.deposit().sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                await wethContract
                    .approve(contractAddresses.erc20Proxy, DEFAULT_SELL_AMOUNT)
                    .sendTransactionAsync({ from: takerAddress });

                return rfqtMocker.withMockedRfqtIndicativeQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: rfqtIndicativeQuoteResponse,
                        },
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`,
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
            it('should fail when taker address is not supplied', async () => {
                const appResponse = await request(app)
                    .get(
                        `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`,
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

                const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                await wethContract
                    .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });

                const appResponse = await request(app)
                    .get(
                        `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&buyAmount=${buyAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`,
                    )
                    .set('0x-api-key', 'koolApiKey1')
                    .expect(HttpStatus.BAD_REQUEST)
                    .expect('Content-Type', /json/);
                const validationErrors = appResponse.body.validationErrors;
                expect(validationErrors.length).to.eql(1);
                expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
            });
            it('should succeed when taker can not actually fill but we skip validation', async () => {
                const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                await wethContract
                    .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });

                return rfqtMocker.withMockedRfqtFirmQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: ganacheZrxWethOrder1,
                        },
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`,
                            )
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);
                        const responseJson = JSON.parse(appResponse.text);
                        expect(responseJson.orders.length).to.equal(1);
                        expect(responseJson.orders[0]).to.eql(ganacheZrxWethOrder1);
                    },
                );
            });
            it('should fail when bad api key used', async () => {
                const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                await wethContract.deposit().sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                await wethContract
                    .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });

                // this RFQ-T mock should never actually get hit b/c of the bad api key
                // but in the case in which the bad api key was _not_ blocked
                // this would cause the API to respond with RFQ-T liquidity
                return rfqtMocker.withMockedRfqtFirmQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: ganacheZrxWethOrder1,
                            requestApiKey: 'badApiKey',
                        },
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`,
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
            it.skip('should fail validation when taker can not actually fill', async () => {
                const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                await wethContract
                    .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });

                return rfqtMocker.withMockedRfqtFirmQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: ganacheZrxWethOrder1,
                        },
                    ],
                    async () => {
                        await request(app)
                            .get(
                                `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`,
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
                        },
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/price?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`,
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
                );
            });
            it('should fail silently when RFQ-T provider gives an error response', async () => {
                return rfqtMocker.withMockedRfqtIndicativeQuotes(
                    [
                        {
                            ...DEFAULT_RFQT_RESPONSE_DATA,
                            responseData: {},
                            responseCode: 500,
                        },
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/price?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`,
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
        });
    });

    context('without maker allowances set', async () => {
        beforeEach(async () => {
            const zrxToken = new ERC20TokenContract(contractAddresses.zrxToken, provider);
            await zrxToken
                .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                .sendTransactionAsync({ from: makerAddress });
        });

        it('should not return order if maker allowances are not set', async () => {
            const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
            await wethContract
                .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                .sendTransactionAsync({ from: takerAddress });

            return rfqtMocker.withMockedRfqtFirmQuotes(
                [
                    {
                        ...DEFAULT_RFQT_RESPONSE_DATA,
                        responseData: ganacheZrxWethOrder1,
                    },
                ],
                async () => {
                    const appResponse = await request(app)
                        .get(
                            `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`,
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
    });
});
