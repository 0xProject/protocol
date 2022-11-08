import { WETH9Contract } from '@0x/contract-wrappers';
import { DummyERC20TokenContract } from '@0x/contracts-erc20';
import { assertRoughlyEquals, expect, getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, Web3ProviderEngine, Web3Wrapper } from '@0x/dev-utils';
import { isNativeSymbolOrAddress } from '@0x/token-metadata';
import { ObjectMap } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';
import 'mocha';
import supertest from 'supertest';

import { AppDependencies, getAppAsync, getDefaultAppDependenciesAsync } from '../src/app';
import { BUY_SOURCE_FILTER_BY_CHAIN_ID, ChainId, ERC20BridgeSource, LimitOrderFields } from '../src/asset-swapper';
import * as config from '../src/config';
import { AFFILIATE_FEE_TRANSFORMER_GAS, GAS_LIMIT_BUFFER_MULTIPLIER, SWAP_PATH } from '../src/constants';
import { getDBConnectionAsync } from '../src/db_connection';
import { ValidationErrorCodes, ValidationErrorItem, ValidationErrorReasons } from '../src/errors';
import { logger } from '../src/logger';
import { GetSwapQuoteResponse, SignedLimitOrder } from '../src/types';

import {
    CHAIN_ID,
    CONTRACT_ADDRESSES,
    ETHEREUM_RPC_URL,
    ETH_TOKEN_ADDRESS,
    getProvider,
    MATCHA_AFFILIATE_ADDRESS,
    MATCHA_AFFILIATE_ENCODED_PARTIAL_ORDER_DATA,
    MAX_INT,
    MAX_MINT_AMOUNT,
    NULL_ADDRESS,
    SYMBOL_TO_ADDRESS,
    // UNKNOWN_TOKEN_ADDRESS,
    WETH_TOKEN_ADDRESS,
    ZRX_TOKEN_ADDRESS,
} from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { constructRoute, httpGetAsync } from './utils/http_utils';
import { liquiditySources0xOnly } from './utils/mocks';
import { MockOrderWatcher } from './utils/mock_order_watcher';
import { getRandomSignedLimitOrderAsync } from './utils/orders';

// Force reload of the app avoid variables being polluted between test suites
// Warning: You probably don't want to move this
delete require.cache[require.resolve('../src/app')];

const SUITE_NAME = 'Swap API';
const EXCLUDED_SOURCES = BUY_SOURCE_FILTER_BY_CHAIN_ID[ChainId.Mainnet].sources.filter(
    (s) => s !== ERC20BridgeSource.Native,
);
const DEFAULT_QUERY_PARAMS = {
    buyToken: 'ZRX',
    sellToken: 'WETH',
    excludedSources: EXCLUDED_SOURCES.join(','),
};
const MAKER_WETH_AMOUNT = new BigNumber('1000000000000000000');
const ONE_THOUSAND_IN_BASE = new BigNumber('1000000000000000000000');

describe(SUITE_NAME, () => {
    let app: Express.Application;
    let server: Server;
    let dependencies: AppDependencies;
    let accounts: string[];
    let takerAddress: string;
    let makerAdddress: string;
    const invalidTakerAddress = '0x0000000000000000000000000000000000000001';

    let blockchainLifecycle: BlockchainLifecycle;
    let provider: Web3ProviderEngine;

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        const connection = await getDBConnectionAsync();
        await connection.runMigrations();
        provider = getProvider();
        const web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

        const mockOrderWatcher = new MockOrderWatcher(connection);
        accounts = await web3Wrapper.getAvailableAddressesAsync();
        [, makerAdddress, takerAddress] = accounts;

        // Set up liquidity.
        await blockchainLifecycle.startAsync();

        const wethToken = new WETH9Contract(CONTRACT_ADDRESSES.etherToken, provider);
        const zrxToken = new DummyERC20TokenContract(CONTRACT_ADDRESSES.zrxToken, provider);
        // EP setup so maker address can take
        await zrxToken.mint(MAX_MINT_AMOUNT).awaitTransactionSuccessAsync({ from: takerAddress });
        await zrxToken.mint(MAX_MINT_AMOUNT).awaitTransactionSuccessAsync({ from: makerAdddress });
        await wethToken.deposit().awaitTransactionSuccessAsync({ from: takerAddress, value: MAKER_WETH_AMOUNT });
        await wethToken.deposit().awaitTransactionSuccessAsync({ from: makerAdddress, value: MAKER_WETH_AMOUNT });
        await wethToken
            .approve(CONTRACT_ADDRESSES.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: takerAddress });
        await wethToken
            .approve(CONTRACT_ADDRESSES.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: makerAdddress });
        await zrxToken
            .approve(CONTRACT_ADDRESSES.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: takerAddress });
        await zrxToken
            .approve(CONTRACT_ADDRESSES.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: makerAdddress });

        const limitOrders: Partial<LimitOrderFields>[] = [
            {
                makerToken: ZRX_TOKEN_ADDRESS,
                takerToken: WETH_TOKEN_ADDRESS,
                makerAmount: ONE_THOUSAND_IN_BASE,
                takerAmount: ONE_THOUSAND_IN_BASE,
                maker: makerAdddress,
            },
            {
                makerToken: ZRX_TOKEN_ADDRESS,
                takerToken: WETH_TOKEN_ADDRESS,
                makerAmount: ONE_THOUSAND_IN_BASE,
                takerAmount: ONE_THOUSAND_IN_BASE.multipliedBy(2),
                maker: makerAdddress,
            },
            {
                makerToken: ZRX_TOKEN_ADDRESS,
                takerToken: WETH_TOKEN_ADDRESS,
                makerAmount: MAX_MINT_AMOUNT,
                takerAmount: ONE_THOUSAND_IN_BASE.multipliedBy(3),
                maker: makerAdddress,
            },
            {
                makerToken: WETH_TOKEN_ADDRESS,
                takerToken: ZRX_TOKEN_ADDRESS,
                makerAmount: MAKER_WETH_AMOUNT,
                takerAmount: ONE_THOUSAND_IN_BASE,
                maker: makerAdddress,
            },
        ];
        const signPartialOrder = (order: Partial<LimitOrderFields>) => getRandomSignedLimitOrderAsync(provider, order);
        const signedOrders: SignedLimitOrder[] = await Promise.all(limitOrders.map(signPartialOrder));
        await mockOrderWatcher.postOrdersAsync(signedOrders);

        // start the 0x-api app
        dependencies = await getDefaultAppDependenciesAsync(provider, {
            ...config.defaultHttpServiceConfig,
            ethereumRpcUrl: ETHEREUM_RPC_URL,
        });
        ({ app, server } = await getAppAsync(
            { ...dependencies },
            { ...config.defaultHttpServiceConfig, ethereumRpcUrl: ETHEREUM_RPC_URL },
        ));
    });

    after(async () => {
        await blockchainLifecycle.revertAsync();
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

    describe(`/quote should handle valid token parameter permutations`, () => {
        const WETH_BUY_AMOUNT = MAKER_WETH_AMOUNT.div(10).toString();
        const ZRX_BUY_AMOUNT = ONE_THOUSAND_IN_BASE.div(10).toString();
        const parameterPermutations = [
            { buyToken: 'ZRX', sellToken: 'WETH', buyAmount: ZRX_BUY_AMOUNT },
            { buyToken: 'WETH', sellToken: 'ZRX', buyAmount: WETH_BUY_AMOUNT },
            { buyToken: ZRX_TOKEN_ADDRESS, sellToken: 'WETH', buyAmount: ZRX_BUY_AMOUNT },
            { buyToken: ZRX_TOKEN_ADDRESS, sellToken: WETH_TOKEN_ADDRESS, buyAmount: ZRX_BUY_AMOUNT },
            // { buyToken: 'ZRX', sellToken: UNKNOWN_TOKEN_ADDRESS, buyAmount: ZRX_BUY_AMOUNT },
            { buyToken: 'ZRX', sellToken: 'ETH', buyAmount: ZRX_BUY_AMOUNT },
            { buyToken: 'ETH', sellToken: 'ZRX', buyAmount: WETH_BUY_AMOUNT },
            { buyToken: 'ZRX', sellToken: ETH_TOKEN_ADDRESS, buyAmount: ZRX_BUY_AMOUNT },
            { buyToken: ETH_TOKEN_ADDRESS, sellToken: 'ZRX', buyAmount: WETH_BUY_AMOUNT },
        ];
        parameterPermutations.map((parameters) => {
            it(`should return a valid quote with ${JSON.stringify(parameters)}`, async () => {
                await quoteAndExpectAsync(app, parameters, {
                    buyAmount: new BigNumber(parameters.buyAmount),
                    sellTokenAddress: parameters.sellToken.startsWith('0x')
                        ? parameters.sellToken
                        : SYMBOL_TO_ADDRESS[parameters.sellToken],
                    buyTokenAddress: parameters.buyToken.startsWith('0x')
                        ? parameters.buyToken
                        : SYMBOL_TO_ADDRESS[parameters.buyToken],
                    allowanceTarget: isNativeSymbolOrAddress(parameters.sellToken, CHAIN_ID)
                        ? NULL_ADDRESS
                        : CONTRACT_ADDRESSES.exchangeProxy,
                });
            });
        });
    });

    describe('/price', async () => {
        it('should respond with 200 OK even if the the takerAddress cannot complete a trade', async () => {
            // The taker does not have an allowance
            await priceAndExpectAsync(
                app,
                {
                    takerAddress: invalidTakerAddress,
                    sellToken: 'WETH',
                    buyToken: 'ZRX',
                    sellAmount: '10000',
                },
                {},
            );
        });
    });

    describe('/quote', async () => {
        it("should respond with INSUFFICIENT_ASSET_LIQUIDITY when there's no liquidity (empty orderbook, sampling excluded, no RFQ)", async () => {
            await quoteAndExpectAsync(
                app,
                { buyAmount: '10000000000000000000000000000000' },
                {
                    validationErrors: [
                        {
                            code: ValidationErrorCodes.ValueOutOfRange,
                            field: 'buyAmount',
                            reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                        },
                    ],
                },
            );
        });
        it('should respect buyAmount', async () => {
            await quoteAndExpectAsync(app, { buyAmount: '1234' }, { buyAmount: new BigNumber(1234) });
        });
        it('should respect sellAmount', async () => {
            await quoteAndExpectAsync(app, { sellAmount: '1234' }, { sellAmount: new BigNumber(1234) });
        });
        it('should respect gasPrice', async () => {
            await quoteAndExpectAsync(
                app,
                { sellAmount: '1234', gasPrice: '150000000000' },
                { gasPrice: new BigNumber('150000000000') },
            );
        });
        it('should respect protocolFee for non RFQT orders', async () => {
            const gasPrice = new BigNumber('150000000000');
            const protocolFee = gasPrice.times(config.PROTOCOL_FEE_MULTIPLIER);
            await quoteAndExpectAsync(
                app,
                { sellAmount: '1234', gasPrice: '150000000000' },
                { gasPrice, protocolFee, value: protocolFee },
            );
        });
        it('should respect excludedSources', async () => {
            await quoteAndExpectAsync(
                app,
                {
                    sellAmount: '1234',
                    excludedSources: Object.values(ERC20BridgeSource).join(','),
                },
                {
                    validationErrors: [
                        {
                            code: ValidationErrorCodes.ValueOutOfRange,
                            field: 'excludedSources',
                            reason: 'Request excluded all sources',
                        },
                    ],
                },
            );
        });
        it('should respect includedSources', async () => {
            await quoteAndExpectAsync(
                app,
                {
                    sellAmount: '1234',
                    excludedSources: '',
                    includedSources: [ERC20BridgeSource.Native].join(','),
                },
                { sellAmount: new BigNumber(1234) },
            );
        });
        it('should return a ExchangeProxy transaction for sellToken=ETH', async () => {
            await quoteAndExpectAsync(
                app,
                {
                    sellToken: 'WETH',
                    sellAmount: '1234',
                },
                {
                    to: CONTRACT_ADDRESSES.exchangeProxy,
                },
            );
            await quoteAndExpectAsync(
                app,
                {
                    sellToken: 'ETH',
                    sellAmount: '1234',
                },
                {
                    to: CONTRACT_ADDRESSES.exchangeProxy,
                },
            );
        });
        // TODO: unskip when Docker Ganache snapshot has been updated
        it.skip('should not throw a validation error if takerAddress can complete the quote', async () => {
            // The maker has an allowance
            await quoteAndExpectAsync(
                app,
                {
                    takerAddress,
                    sellToken: 'WETH',
                    buyToken: 'ZRX',
                    sellAmount: '10000',
                },
                {
                    sellAmount: new BigNumber(10000),
                },
            );
        });
        it('should throw a validation error if takerAddress cannot complete the quote', async () => {
            // The taker does not have an allowance
            await quoteAndExpectAsync(
                app,
                {
                    takerAddress: invalidTakerAddress,
                    sellToken: 'WETH',
                    buyToken: 'ZRX',
                    sellAmount: '10000',
                },
                { generalUserError: true },
            );
        });

        describe('affiliate fees', () => {
            const sellQuoteParams = {
                ...DEFAULT_QUERY_PARAMS,
                sellAmount: getRandomInteger(1, 100000).toString(),
            };
            const buyQuoteParams = {
                ...DEFAULT_QUERY_PARAMS,
                buyAmount: getRandomInteger(1, 100000).toString(),
            };
            let sellQuoteWithoutFee: GetSwapQuoteResponse;
            let buyQuoteWithoutFee: GetSwapQuoteResponse;

            before(async () => {
                const sellQuoteRoute = constructRoute({
                    baseRoute: `${SWAP_PATH}/quote`,
                    queryParams: sellQuoteParams,
                });
                const sellQuoteResponse = await httpGetAsync({ route: sellQuoteRoute });
                sellQuoteWithoutFee = sellQuoteResponse.body;

                const buyQuoteRoute = constructRoute({
                    baseRoute: `${SWAP_PATH}/quote`,
                    queryParams: buyQuoteParams,
                });
                const buyQuoteResponse = await httpGetAsync({ route: buyQuoteRoute });
                buyQuoteWithoutFee = buyQuoteResponse.body;
            });
            it('can add a buy token affiliate fee to a sell quote', async () => {
                const feeRecipient = randomAddress();
                const buyTokenPercentageFee = new BigNumber(0.05);
                await quoteAndExpectAsync(
                    app,
                    {
                        ...sellQuoteParams,
                        feeRecipient,
                        buyTokenPercentageFee: buyTokenPercentageFee.toString(),
                    },
                    _.omit(
                        {
                            ...sellQuoteWithoutFee,
                            buyAmount: new BigNumber(sellQuoteWithoutFee.buyAmount).dividedBy(
                                buyTokenPercentageFee.plus(1),
                            ),
                            estimatedGas: new BigNumber(sellQuoteWithoutFee.estimatedGas).plus(
                                AFFILIATE_FEE_TRANSFORMER_GAS,
                            ),
                            gas: new BigNumber(sellQuoteWithoutFee.gas).plus(
                                AFFILIATE_FEE_TRANSFORMER_GAS.times(GAS_LIMIT_BUFFER_MULTIPLIER),
                            ),
                            price: new BigNumber(sellQuoteWithoutFee.price).dividedBy(buyTokenPercentageFee.plus(1)),
                            guaranteedPrice: new BigNumber(sellQuoteWithoutFee.guaranteedPrice).dividedBy(
                                buyTokenPercentageFee.plus(1),
                            ),
                        },
                        'data',
                    ),
                );
            });
            it('can add a buy token affiliate fee to a buy quote', async () => {
                const feeRecipient = randomAddress();
                const buyTokenPercentageFee = new BigNumber(0.05);
                await quoteAndExpectAsync(
                    app,
                    {
                        ...buyQuoteParams,
                        feeRecipient,
                        buyTokenPercentageFee: buyTokenPercentageFee.toString(),
                    },
                    _.omit(
                        {
                            ...buyQuoteWithoutFee,
                            estimatedGas: new BigNumber(buyQuoteWithoutFee.estimatedGas).plus(
                                AFFILIATE_FEE_TRANSFORMER_GAS,
                            ),
                            gas: new BigNumber(buyQuoteWithoutFee.gas).plus(
                                AFFILIATE_FEE_TRANSFORMER_GAS.times(GAS_LIMIT_BUFFER_MULTIPLIER),
                            ),
                            price: new BigNumber(buyQuoteWithoutFee.price).times(buyTokenPercentageFee.plus(1)),
                            guaranteedPrice: new BigNumber(buyQuoteWithoutFee.guaranteedPrice).times(
                                buyTokenPercentageFee.plus(1),
                            ),
                        },
                        ['data', 'sellAmount'],
                    ),
                );
            });
            it('validation error if both percentage and positive slippage fee enabled', async () => {
                await quoteAndExpectAsync(
                    app,
                    {
                        ...sellQuoteParams,
                        feeType: 'POSITIVE_SLIPPAGE',
                        buyTokenPercentageFee: '0.9',
                    },
                    {
                        validationErrors: [
                            {
                                code: ValidationErrorCodes.UnsupportedOption,
                                field: 'buyTokenPercentageFee',
                                reason: ValidationErrorReasons.MultipleFeeTypesUsed,
                            },
                            {
                                code: ValidationErrorCodes.UnsupportedOption,
                                field: 'feeType',
                                reason: ValidationErrorReasons.MultipleFeeTypesUsed,
                            },
                        ],
                    },
                );
            });
            it('validation error if given a non-zero sell token fee', async () => {
                const feeRecipient = randomAddress();
                await quoteAndExpectAsync(
                    app,
                    {
                        ...sellQuoteParams,
                        feeRecipient,
                        sellTokenPercentageFee: '0.01',
                    },
                    {
                        validationErrors: [
                            {
                                code: ValidationErrorCodes.UnsupportedOption,
                                field: 'sellTokenPercentageFee',
                                reason: ValidationErrorReasons.ArgumentNotYetSupported,
                            },
                        ],
                    },
                );
            });
            it('validation error if given an invalid percentage', async () => {
                const feeRecipient = randomAddress();
                await quoteAndExpectAsync(
                    app,
                    {
                        ...sellQuoteParams,
                        feeRecipient,
                        buyTokenPercentageFee: '1.01',
                    },
                    {
                        validationErrors: [
                            {
                                code: ValidationErrorCodes.ValueOutOfRange,
                                field: 'buyTokenPercentageFee',
                                reason: ValidationErrorReasons.PercentageOutOfRange,
                            },
                        ],
                    },
                );
            });
        });

        describe('affiliate address', () => {
            it('encodes affiliate address into quote call data', async () => {
                const sellQuoteParams = {
                    ...DEFAULT_QUERY_PARAMS,
                    sellAmount: getRandomInteger(1, 100000).toString(),
                    affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
                };
                const buyQuoteParams = {
                    ...DEFAULT_QUERY_PARAMS,
                    buyAmount: getRandomInteger(1, 100000).toString(),
                    affiliateAddress: MATCHA_AFFILIATE_ADDRESS,
                };

                for (const params of [sellQuoteParams, buyQuoteParams]) {
                    const quoteRoute = constructRoute({
                        baseRoute: `${SWAP_PATH}/quote`,
                        queryParams: params,
                    });
                    const quoteResponse = await httpGetAsync({ route: quoteRoute });
                    expect(quoteResponse.body.data).to.include(MATCHA_AFFILIATE_ENCODED_PARTIAL_ORDER_DATA);
                }
            });
        });
    });
});

interface SwapAssertion extends GetSwapQuoteResponse {
    validationErrors: ValidationErrorItem[];
    revertErrorReason: string;
    generalUserError: boolean;
}

async function requestAndExpectAsync(
    app: Express.Application,
    endpoint: 'price' | 'quote',
    queryParams: ObjectMap<string>,
    swapAssertions: Partial<SwapAssertion>,
): Promise<supertest.Response> {
    const route = constructRoute({
        baseRoute: `${SWAP_PATH}/${endpoint}`,
        queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            ...queryParams,
        },
    });
    const response = await httpGetAsync({ app, route });
    expect(response.type).to.be.eq('application/json');
    if (swapAssertions.revertErrorReason) {
        expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
        expect(response.body.code).to.eq(105);
        expect(response.body.reason).to.be.eql(swapAssertions.revertErrorReason);
        return response;
    }
    if (swapAssertions.validationErrors) {
        expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
        expect(response.body.code).to.eq(100);
        expect(response.body.validationErrors).to.be.eql(swapAssertions.validationErrors);
        return response;
    }
    if (swapAssertions.generalUserError) {
        expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
        return response;
    }
    if (response.status !== HttpStatus.OK) {
        logger.warn(response.body);
    }
    expect(response.status).to.be.eq(HttpStatus.OK);
    return response;
}

async function priceAndExpectAsync(
    app: Express.Application,
    queryParams: ObjectMap<string>,
    swapAssertions: Partial<SwapAssertion>,
): Promise<void> {
    await requestAndExpectAsync(app, 'price', queryParams, swapAssertions);
}

async function quoteAndExpectAsync(
    app: Express.Application,
    queryParams: ObjectMap<string>,
    swapAssertions: Partial<SwapAssertion>,
): Promise<void> {
    const response = await requestAndExpectAsync(app, 'quote', queryParams, swapAssertions);
    expectCorrectQuote(response.body, swapAssertions);
}

const PRECISION = 2;
function expectCorrectQuote(quoteResponse: GetSwapQuoteResponse, assertions: Partial<SwapAssertion>): void {
    try {
        for (const prop of Object.keys(assertions)) {
            const property = prop as keyof GetSwapQuoteResponse;
            if (BigNumber.isBigNumber(assertions[property as keyof SwapAssertion])) {
                assertRoughlyEquals(quoteResponse[property], assertions[property], PRECISION);
            } else {
                expect(quoteResponse[property], property).to.eql(assertions[property]);
            }
        }
        // Only have 0x liquidity for now.
        expect(quoteResponse.sources).to.be.eql(liquiditySources0xOnly);
    } catch (err) {
        console.log(`should return a valid quote matching ${assertions}`);
    }
}
