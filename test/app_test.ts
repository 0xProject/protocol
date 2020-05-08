// tslint:disable:max-file-line-count
import { rfqtMocker } from '@0x/asset-swapper';
import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { ERC20TokenContract, WETH9Contract } from '@0x/contract-wrappers';
import { BlockchainLifecycle, web3Factory } from '@0x/dev-utils';
import { Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as HttpStatus from 'http-status-codes';
import 'mocha';
import * as request from 'supertest';

import { AppDependencies, getAppAsync, getDefaultAppDependenciesAsync } from '../src/app';
import * as config from '../src/config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE, META_TRANSACTION_PATH, SRA_PATH, SWAP_PATH } from '../src/constants';
import { getDBConnectionAsync } from '../src/db_connection';
import { SignedOrderEntity } from '../src/entities';
import { GeneralErrorCodes, generalErrorCodeToReason } from '../src/errors';

import * as orderFixture from './fixtures/order.json';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { expect } from './utils/expect';
import { ganacheZrxWethOrder1, rfqtIndicativeQuoteResponse } from './utils/mocks';

let app: Express.Application;

let web3Wrapper: Web3Wrapper;
let provider: Web3ProviderEngine;
let accounts: string[];
let blockchainLifecycle: BlockchainLifecycle;

let dependencies: AppDependencies;

// tslint:disable-next-line:custom-no-magic-numbers
const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);
const SUITE_NAME = 'app_test';

describe(SUITE_NAME, () => {
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

        dependencies = await getDefaultAppDependenciesAsync(provider, config);

        // start the 0x-api app
        app = await getAppAsync({ ...dependencies }, config);
    });
    after(async () => {
        await teardownDependenciesAsync(SUITE_NAME);
    });
    it('should respond to GET /sra/orders', async () => {
        await request(app)
            .get(`${SRA_PATH}/orders`)
            .expect('Content-Type', /json/)
            .expect(HttpStatus.OK)
            .then(response => {
                expect(response.body.perPage).to.equal(DEFAULT_PER_PAGE);
                expect(response.body.page).to.equal(DEFAULT_PAGE);
                expect(response.body.total).to.be.an('number');
                expect(response.body.records).to.be.an('array');
            });
    });
    it('should return InvalidAPIKey error if invalid UUID supplied as API Key', async () => {
        await request(app)
            .post(`${META_TRANSACTION_PATH}/submit`)
            .set('0x-api-key', 'foobar')
            .expect('Content-Type', /json/)
            .expect(HttpStatus.BAD_REQUEST)
            .then(response => {
                expect(response.body.code).to.equal(GeneralErrorCodes.InvalidAPIKey);
                expect(response.body.reason).to.equal(generalErrorCodeToReason[GeneralErrorCodes.InvalidAPIKey]);
            });
    });
    it('should normalize addresses to lowercase', async () => {
        const metaData = {
            hash: '123',
            remainingFillableTakerAssetAmount: '1',
        };
        const expirationTimeSeconds = (new Date().getTime() / 1000 + 600).toString(); // tslint:disable-line:custom-no-magic-numbers
        const orderModel = new SignedOrderEntity({
            ...metaData,
            ...orderFixture,
            expirationTimeSeconds,
        });

        const apiOrderResponse = { chainId: config.CHAIN_ID, ...orderFixture, expirationTimeSeconds };
        const dbConnection = await getDBConnectionAsync();
        await dbConnection.manager.save(orderModel);
        await request(app)
            .get(`${SRA_PATH}/orders?makerAddress=${orderFixture.makerAddress.toUpperCase()}`)
            .expect('Content-Type', /json/)
            .expect(HttpStatus.OK)
            .then(response => {
                expect(response.body.perPage).to.equal(DEFAULT_PER_PAGE);
                expect(response.body.page).to.equal(DEFAULT_PAGE);
                expect(response.body.total).to.equal(1);
                expect(response.body.records[0].order).to.deep.equal(apiOrderResponse);
            });
        await dbConnection.manager.remove(orderModel);
    });
    describe('should respond to GET /swap/quote', () => {
        it("with INSUFFICIENT_ASSET_LIQUIDITY when there's no liquidity (empty orderbook, sampling excluded, no RFQ)", async () => {
            await request(app)
                .get(
                    `${SWAP_PATH}/quote?buyToken=DAI&sellToken=WETH&buyAmount=100000000000000000&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider`,
                )
                .expect(HttpStatus.BAD_REQUEST)
                .expect('Content-Type', /json/)
                .then(response => {
                    const responseJson = JSON.parse(response.text);
                    expect(responseJson.reason).to.equal('Validation Failed');
                    expect(responseJson.validationErrors.length).to.equal(1);
                    expect(responseJson.validationErrors[0].field).to.equal('buyAmount');
                    expect(responseJson.validationErrors[0].reason).to.equal('INSUFFICIENT_ASSET_LIQUIDITY');
                });
        });
    });
    describe('should hit RFQ-T when appropriate', async () => {
        let contractAddresses: ContractAddresses;
        let makerAddress: string;
        let takerAddress: string;

        beforeEach(async () => {
            contractAddresses = getContractAddressesForChainOrThrow(
                process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID, 10) : await web3Wrapper.getChainIdAsync(),
            );
            [makerAddress, takerAddress] = accounts;
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
                    const sellAmount = new BigNumber(100000000000000000);

                    const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                    await wethContract.deposit().sendTransactionAsync({ value: sellAmount, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.erc20Proxy, sellAmount)
                        .sendTransactionAsync({ from: takerAddress });

                    const mockedApiParams = {
                        sellToken: contractAddresses.etherToken,
                        buyToken: contractAddresses.zrxToken,
                        sellAmount: sellAmount.toString(),
                        buyAmount: undefined,
                        takerAddress,
                    };
                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                endpoint: 'https://mock-rfqt1.club',
                                responseData: ganacheZrxWethOrder1,
                                responseCode: 200,
                                requestApiKey: 'koolApiKey1',
                                requestParams: mockedApiParams,
                            },
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider`,
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
                    const sellAmount = new BigNumber(100000000000000000);

                    const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                    await wethContract.deposit().sendTransactionAsync({ value: sellAmount, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.erc20Proxy, sellAmount)
                        .sendTransactionAsync({ from: takerAddress });

                    const mockedApiParams = {
                        sellToken: contractAddresses.etherToken,
                        buyToken: contractAddresses.zrxToken,
                        sellAmount: sellAmount.toString(),
                        buyAmount: undefined,
                        takerAddress,
                    };
                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                endpoint: 'https://mock-rfqt1.club',
                                responseData: rfqtIndicativeQuoteResponse,
                                responseCode: 200,
                                requestApiKey: 'koolApiKey1',
                                requestParams: mockedApiParams,
                            },
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=false&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider&skipValidation=true`,
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
                    const sellAmount = new BigNumber(100000000000000000);

                    const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                    await wethContract.deposit().sendTransactionAsync({ value: sellAmount, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.erc20Proxy, sellAmount)
                        .sendTransactionAsync({ from: takerAddress });

                    const mockedApiParams = {
                        sellToken: contractAddresses.etherToken,
                        buyToken: contractAddresses.zrxToken,
                        sellAmount: sellAmount.toString(),
                        buyAmount: undefined,
                        takerAddress,
                    };
                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                endpoint: 'https://mock-rfqt1.club',
                                responseData: rfqtIndicativeQuoteResponse,
                                responseCode: 200,
                                requestApiKey: 'koolApiKey1',
                                requestParams: mockedApiParams,
                            },
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider&skipValidation=true`,
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
                    const sellAmount = new BigNumber(100000000000000000);

                    const appResponse = await request(app)
                        .get(
                            `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&intentOnFilling=true&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider`,
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
                            `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&buyAmount=${buyAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider&skipValidation=true`,
                        )
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);
                    const validationErrors = appResponse.body.validationErrors;
                    expect(validationErrors.length).to.eql(1);
                    expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                });
                it('should succeed when taker can not actually fill but we skip validation', async () => {
                    const sellAmount = new BigNumber(100000000000000000);

                    const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                    await wethContract
                        .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    const mockedApiParams = {
                        sellToken: contractAddresses.etherToken,
                        buyToken: contractAddresses.zrxToken,
                        sellAmount: sellAmount.toString(),
                        buyAmount: undefined,
                        takerAddress,
                    };
                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                endpoint: 'https://mock-rfqt1.club',
                                responseData: ganacheZrxWethOrder1,
                                responseCode: 200,
                                requestApiKey: 'koolApiKey1',
                                requestParams: mockedApiParams,
                            },
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider&skipValidation=true`,
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
                    const sellAmount = new BigNumber(100000000000000000);

                    const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                    await wethContract.deposit().sendTransactionAsync({ value: sellAmount, from: takerAddress });
                    await wethContract
                        .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    // this RFQ-T mock should never actually get hit b/c of the bad api key
                    // but in the case in which the bad api key was _not_ blocked
                    // this would cause the API to respond with RFQ-T liquidity
                    const mockedApiParams = {
                        sellToken: contractAddresses.etherToken,
                        buyToken: contractAddresses.zrxToken,
                        sellAmount: sellAmount.toString(),
                        buyAmount: undefined,
                        takerAddress,
                    };
                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                endpoint: 'https://mock-rfqt1.club',
                                responseData: ganacheZrxWethOrder1,
                                responseCode: 200,
                                requestApiKey: 'badApiKey',
                                requestParams: mockedApiParams,
                            },
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider&skipValidation=true`,
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
                    const sellAmount = new BigNumber(100000000000000000);

                    const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                    await wethContract
                        .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });

                    const mockedApiParams = {
                        sellToken: contractAddresses.etherToken,
                        buyToken: contractAddresses.zrxToken,
                        sellAmount: sellAmount.toString(),
                        buyAmount: undefined,
                        takerAddress,
                    };
                    return rfqtMocker.withMockedRfqtFirmQuotes(
                        [
                            {
                                endpoint: 'https://mock-rfqt1.club',
                                responseData: ganacheZrxWethOrder1,
                                responseCode: 200,
                                requestApiKey: 'koolApiKey1',
                                requestParams: mockedApiParams,
                            },
                        ],
                        async () => {
                            await request(app)
                                .get(
                                    `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.BAD_REQUEST)
                                .expect('Content-Type', /json/);
                        },
                    );
                });
                it('should get an indicative quote from an RFQ-T provider', async () => {
                    const sellAmount = new BigNumber(100000000000000000);

                    const mockedApiParams = {
                        sellToken: contractAddresses.etherToken,
                        buyToken: contractAddresses.zrxToken,
                        sellAmount: sellAmount.toString(),
                        buyAmount: undefined,
                        takerAddress,
                    };
                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                endpoint: 'https://mock-rfqt1.club',
                                responseData: rfqtIndicativeQuoteResponse,
                                responseCode: 200,
                                requestApiKey: 'koolApiKey1',
                                requestParams: mockedApiParams,
                            },
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/price?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider`,
                                )
                                .set('0x-api-key', 'koolApiKey1')
                                .expect(HttpStatus.OK)
                                .expect('Content-Type', /json/);

                            const responseJson = JSON.parse(appResponse.text);
                            delete responseJson.gas;
                            delete responseJson.gasPrice;
                            delete responseJson.protocolFee;
                            delete responseJson.value;
                            expect(responseJson).to.eql({
                                buyAmount: '100000000000000000',
                                price: '1',
                                sellAmount: '100000000000000000',
                                sources: [
                                    {
                                        name: '0x',
                                        proportion: '1',
                                    },
                                    {
                                        name: 'Uniswap',
                                        proportion: '0',
                                    },
                                    {
                                        name: 'Eth2Dai',
                                        proportion: '0',
                                    },
                                    {
                                        name: 'Kyber',
                                        proportion: '0',
                                    },
                                    {
                                        name: 'Curve_USDC_DAI',
                                        proportion: '0',
                                    },
                                    {
                                        name: 'Curve_USDC_DAI_USDT',
                                        proportion: '0',
                                    },
                                    {
                                        name: 'Curve_USDC_DAI_USDT_TUSD',
                                        proportion: '0',
                                    },
                                    {
                                        name: 'Curve_USDC_DAI_USDT_BUSD',
                                        proportion: '0',
                                    },
                                    {
                                        name: 'Curve_USDC_DAI_USDT_SUSD',
                                        proportion: '0',
                                    },
                                    {
                                        name: 'LiquidityProvider',
                                        proportion: '0',
                                    },
                                ],
                            });
                        },
                    );
                });
                it('should fail silently when RFQ-T provider gives an error response', async () => {
                    const sellAmount = new BigNumber(100000000000000000);

                    const mockedApiParams = {
                        sellToken: contractAddresses.etherToken,
                        buyToken: contractAddresses.zrxToken,
                        sellAmount: sellAmount.toString(),
                        buyAmount: undefined,
                        takerAddress,
                    };
                    return rfqtMocker.withMockedRfqtIndicativeQuotes(
                        [
                            {
                                endpoint: 'https://mock-rfqt1.club',
                                responseData: {},
                                responseCode: 500,
                                requestApiKey: 'koolApiKey1',
                                requestParams: mockedApiParams,
                            },
                        ],
                        async () => {
                            const appResponse = await request(app)
                                .get(
                                    `${SWAP_PATH}/price?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider`,
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
                const sellAmount = new BigNumber(100000000000000000);

                const wethContract = new WETH9Contract(contractAddresses.etherToken, provider);
                await wethContract
                    .approve(contractAddresses.erc20Proxy, new BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });

                const mockedApiParams = {
                    sellToken: contractAddresses.etherToken,
                    buyToken: contractAddresses.zrxToken,
                    sellAmount: sellAmount.toString(),
                    buyAmount: undefined,
                    takerAddress,
                };
                return rfqtMocker.withMockedRfqtFirmQuotes(
                    [
                        {
                            endpoint: 'https://mock-rfqt1.club',
                            responseData: ganacheZrxWethOrder1,
                            responseCode: 200,
                            requestApiKey: 'koolApiKey1',
                            requestParams: mockedApiParams,
                        },
                    ],
                    async () => {
                        const appResponse = await request(app)
                            .get(
                                `${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${sellAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider&skipValidation=true`,
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
});
