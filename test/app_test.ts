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
import { DEFAULT_PAGE, DEFAULT_PER_PAGE, SRA_PATH, SWAP_PATH } from '../src/constants';
import { SignedOrderEntity } from '../src/entities';

import * as orderFixture from './fixtures/order.json';
import { expect } from './utils/expect';
import { ganacheZrxWethOrder1 } from './utils/mocks';

let app: Express.Application;

let web3Wrapper: Web3Wrapper;
let provider: Web3ProviderEngine;
let accounts: string[];
let blockchainLifecycle: BlockchainLifecycle;

let dependencies: AppDependencies;

// tslint:disable-next-line:custom-no-magic-numbers
const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);

describe('app test', () => {
    before(async () => {
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
    it('should not be undefined', () => {
        expect(app).to.not.be.undefined();
    });
    it('should respond to GET /sra/orders', async () => {
        await request(app)
            .get(`${SRA_PATH}/orders`)
            .expect('Content-Type', /json/)
            .expect(HttpStatus.OK)
            .then(response => {
                expect(response.body.perPage).to.equal(DEFAULT_PER_PAGE);
                expect(response.body.page).to.equal(DEFAULT_PAGE);
                expect(response.body.total).to.equal(0);
                expect(response.body.records).to.deep.equal([]);
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
        await dependencies.connection.manager.save(orderModel);
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
        await dependencies.connection.manager.remove(orderModel);
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
    describe('should hit RFQ-T when apropriate', async () => {
        let contractAddresses: ContractAddresses;
        let makerAddress: string;
        let takerAddress: string;

        beforeEach(() => {
            contractAddresses = getContractAddressesForChainOrThrow(parseInt(process.env.CHAIN_ID || '1337', 10));
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
