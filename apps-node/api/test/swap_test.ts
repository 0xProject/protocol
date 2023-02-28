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

import { getAppAsync } from '../src/app';
import { getDefaultAppDependenciesAsync } from '../src/runners/utils';
import { AppDependencies } from '../src/types';
import { BUY_SOURCE_FILTER_BY_CHAIN_ID, ERC20BridgeSource, LimitOrderFields } from '../src/asset-swapper';
import * as config from '../src/config';
import { AFFILIATE_FEE_TRANSFORMER_GAS, GAS_LIMIT_BUFFER_MULTIPLIER, SWAP_PATH } from '../src/constants';
import { getDBConnectionOrThrow } from '../src/db_connection';
import { ValidationErrorCodes, ValidationErrorItem, ValidationErrorReasons } from '../src/errors';
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
    WETH_TOKEN_ADDRESS,
    ZRX_TOKEN_ADDRESS,
} from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { constructRoute, httpGetAsync } from './utils/http_utils';
import { MockOrderWatcher } from './utils/mock_order_watcher';
import { getRandomSignedLimitOrderAsync } from './utils/orders';
import { StatusCodes } from 'http-status-codes';
import { ChainId } from '@0x/contract-addresses';

// Force reload of the app avoid variables being polluted between test suites
// Warning: You probably don't want to move this
delete require.cache[require.resolve('../src/app')];
delete require.cache[require.resolve('../src/runners/utils')];

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

const ZERO_EX_SOURCE = { name: '0x', proportion: new BigNumber('1') };

describe(SUITE_NAME, () => {
    let app: Express.Application;
    let server: Server;
    let dependencies: AppDependencies;
    let accounts: string[];
    let takerAddress: string;
    let makerAddress: string;
    const invalidTakerAddress = '0x0000000000000000000000000000000000000001';

    let blockchainLifecycle: BlockchainLifecycle;
    let provider: Web3ProviderEngine;

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        const connection = await getDBConnectionOrThrow();
        await connection.runMigrations();
        provider = getProvider();
        const web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

        const mockOrderWatcher = new MockOrderWatcher(connection);
        accounts = await web3Wrapper.getAvailableAddressesAsync();
        [, makerAddress, takerAddress] = accounts;

        // Set up liquidity.
        await blockchainLifecycle.startAsync();

        const wethToken = new WETH9Contract(CONTRACT_ADDRESSES.etherToken, provider);
        const zrxToken = new DummyERC20TokenContract(CONTRACT_ADDRESSES.zrxToken, provider);
        // EP setup so maker address can take
        await zrxToken.mint(MAX_MINT_AMOUNT).awaitTransactionSuccessAsync({ from: takerAddress });
        await zrxToken.mint(MAX_MINT_AMOUNT).awaitTransactionSuccessAsync({ from: makerAddress });
        await wethToken.deposit().awaitTransactionSuccessAsync({ from: takerAddress, value: MAKER_WETH_AMOUNT });
        await wethToken.deposit().awaitTransactionSuccessAsync({ from: makerAddress, value: MAKER_WETH_AMOUNT });
        await wethToken
            .approve(CONTRACT_ADDRESSES.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: takerAddress });
        await wethToken
            .approve(CONTRACT_ADDRESSES.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: makerAddress });
        await zrxToken
            .approve(CONTRACT_ADDRESSES.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: takerAddress });
        await zrxToken
            .approve(CONTRACT_ADDRESSES.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: makerAddress });

        const limitOrders: Partial<LimitOrderFields>[] = [
            {
                makerToken: ZRX_TOKEN_ADDRESS,
                takerToken: WETH_TOKEN_ADDRESS,
                makerAmount: ONE_THOUSAND_IN_BASE,
                takerAmount: ONE_THOUSAND_IN_BASE,
                maker: makerAddress,
            },
            {
                makerToken: ZRX_TOKEN_ADDRESS,
                takerToken: WETH_TOKEN_ADDRESS,
                makerAmount: ONE_THOUSAND_IN_BASE,
                takerAmount: ONE_THOUSAND_IN_BASE.multipliedBy(2),
                maker: makerAddress,
            },
            {
                makerToken: ZRX_TOKEN_ADDRESS,
                takerToken: WETH_TOKEN_ADDRESS,
                makerAmount: MAX_MINT_AMOUNT,
                takerAmount: ONE_THOUSAND_IN_BASE.multipliedBy(3),
                maker: makerAddress,
            },
            {
                makerToken: WETH_TOKEN_ADDRESS,
                takerToken: ZRX_TOKEN_ADDRESS,
                makerAmount: MAKER_WETH_AMOUNT,
                takerAmount: ONE_THOUSAND_IN_BASE,
                maker: makerAddress,
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
            it(`should return a valid quote for ${JSON.stringify(parameters)}`, async () => {
                const response = await requestSwap(app, 'quote', parameters);
                expectCorrectQuoteResponse(response, {
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
                    sources: [ZERO_EX_SOURCE],
                });
            });
        });
    });

    describe('/price', async () => {
        it('should respond with 200 OK even if the the takerAddress cannot complete a trade', async () => {
            // The taker does not have an allowance
            const swapResponse = await requestSwap(app, 'price', {
                takerAddress: invalidTakerAddress,
                sellToken: 'WETH',
                buyToken: 'ZRX',
                sellAmount: '10000',
            });
            expect(swapResponse.statusCode).eq(HttpStatus.StatusCodes.OK);
        });
    });

    describe('/quote', async () => {
        it("should respond with INSUFFICIENT_ASSET_LIQUIDITY when there's no liquidity (empty orderbook, sampling excluded, no RFQ)", async () => {
            const response = await requestSwap(app, 'quote', { buyAmount: '10000000000000000000000000000000' });
            expectSwapError(response, {
                validationErrors: [
                    {
                        code: ValidationErrorCodes.ValueOutOfRange,
                        description:
                            'We are not able to fulfill an order for this token pair at the requested amount due to a lack of liquidity',
                        field: 'buyAmount',
                        reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                    },
                ],
            });
        });

        it('should handle wrapping of native token', async () => {
            const response = await requestSwap(app, 'quote', {
                sellToken: 'ETH',
                buyToken: 'WETH',
                sellAmount: '10000000',
            });
            expectCorrectQuoteResponse(response, {
                sellTokenAddress: ETH_TOKEN_ADDRESS,
                buyTokenAddress: WETH_TOKEN_ADDRESS,
                buyAmount: new BigNumber('10000000'),
            });
        });

        it('should handle unwrapping of native token', async () => {
            const response = await requestSwap(app, 'quote', {
                sellToken: 'WETH',
                buyToken: 'ETH',
                sellAmount: '10000000',
            });
            expectCorrectQuoteResponse(response, {
                sellTokenAddress: WETH_TOKEN_ADDRESS,
                buyTokenAddress: ETH_TOKEN_ADDRESS,
                buyAmount: new BigNumber('10000000'),
            });
        });

        it('should respect buyAmount', async () => {
            const response = await requestSwap(app, 'quote', { buyAmount: '1234' });
            expectCorrectQuoteResponse(response, { buyAmount: new BigNumber(1234) });
        });

        it('should respect sellAmount', async () => {
            const response = await requestSwap(app, 'quote', { sellAmount: '1234' });
            expectCorrectQuoteResponse(response, { sellAmount: new BigNumber(1234) });
        });

        it('should respect gasPrice', async () => {
            const response = await requestSwap(app, 'quote', { sellAmount: '1234', gasPrice: '150000000000' });
            expectCorrectQuoteResponse(response, { gasPrice: new BigNumber('150000000000') });
        });

        it('should respect protocolFee for non RFQT orders', async () => {
            const gasPrice = new BigNumber('150000000000');
            const protocolFee = gasPrice.times(config.PROTOCOL_FEE_MULTIPLIER);

            const response = await requestSwap(app, 'quote', { sellAmount: '1234', gasPrice: '150000000000' });
            expectCorrectQuoteResponse(response, { gasPrice, protocolFee, value: protocolFee });
        });

        it('should throw an error when requested to exclude all sources', async () => {
            const response = await requestSwap(app, 'quote', {
                sellAmount: '1234',
                excludedSources: Object.values(ERC20BridgeSource).join(','),
            });
            expectSwapError(response, {
                validationErrors: [
                    {
                        code: ValidationErrorCodes.ValueOutOfRange,
                        field: 'excludedSources',
                        reason: 'Request excluded all sources',
                    },
                ],
            });
        });

        it('should not use a source that is in excludedSources', async () => {
            // TODO: When non-native source is supported for this test, it should test whether the
            // proportion of Native in response.sources is 0 instead of checking whether it failed
            // because of INSUFFICIENT_ASSET_LIQUIDITY

            const response = await requestSwap(app, 'quote', {
                sellAmount: '1234',
                excludedSources: `${ERC20BridgeSource.Native}`,
            });
            expectSwapError(response, {
                validationErrors: [
                    {
                        code: ValidationErrorCodes.ValueOutOfRange,
                        description:
                            'We are not able to fulfill an order for this token pair at the requested amount due to a lack of liquidity',
                        field: 'sellAmount',
                        reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                    },
                ],
            });
        });

        it('should not use source that is not in includedSources', async () => {
            // TODO: When non-native source is supported for this test, it should test whether the
            // proportion of Native in response.sources is 0 instead of checking whether it failed
            // because of INSUFFICIENT_ASSET_LIQUIDITY
            const response = await requestSwap(app, 'quote', {
                sellAmount: '1234',
                excludedSources: '',
                includedSources: `${ERC20BridgeSource.UniswapV2}`,
            });
            expectSwapError(response, {
                validationErrors: [
                    {
                        code: ValidationErrorCodes.ValueOutOfRange,
                        description:
                            'We are not able to fulfill an order for this token pair at the requested amount due to a lack of liquidity',
                        field: 'sellAmount',
                        reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                    },
                ],
            });
        });

        it('should respect includedSources', async () => {
            const response = await requestSwap(app, 'quote', {
                sellAmount: '1234',
                excludedSources: '',
                includedSources: [ERC20BridgeSource.Native].join(','),
            });
            expectCorrectQuoteResponse(response, { sellAmount: new BigNumber(1234) });
        });

        it('should return a ExchangeProxy transaction for sellToken=WETH', async () => {
            const response = await requestSwap(app, 'quote', {
                sellToken: 'WETH',
                sellAmount: '1234',
            });
            expectCorrectQuoteResponse(response, {
                to: CONTRACT_ADDRESSES.exchangeProxy,
            });
        });

        it('should include debugData when debug=true', async () => {
            const response = await requestSwap(app, 'quote', {
                sellToken: 'WETH',
                sellAmount: '1234',
                debug: 'true',
            });
            expectCorrectQuoteResponse(response, {
                debugData: {
                    samplerGasUsage: 130_000, // approximate: +- 50%
                    blockNumber: 100, // approximate: +- 50%
                },
            });
        });

        it('should return a ExchangeProxy transaction for sellToken=ETH', async () => {
            const response = await requestSwap(app, 'quote', {
                sellToken: 'WETH',
                sellAmount: '1234',
            });
            expectCorrectQuoteResponse(response, {
                to: CONTRACT_ADDRESSES.exchangeProxy,
            });
        });

        // TODO: unskip when Docker Ganache snapshot has been updated
        it.skip('should not throw a validation error if takerAddress can complete the quote', async () => {
            // The maker has an allowance
            const response = await requestSwap(app, 'quote', {
                takerAddress,
                sellToken: 'WETH',
                buyToken: 'ZRX',
                sellAmount: '10000',
            });

            expectCorrectQuoteResponse(response, {
                sellAmount: new BigNumber(10000),
            });
        });

        it('should throw a validation error if takerAddress cannot complete the quote', async () => {
            // The taker does not have an allowance
            const response = await requestSwap(app, 'quote', {
                takerAddress: invalidTakerAddress,
                sellToken: 'WETH',
                buyToken: 'ZRX',
                sellAmount: '10000',
            });

            expectSwapError(response, { generalUserError: true });
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

                const response = await requestSwap(app, 'quote', {
                    ...sellQuoteParams,
                    feeRecipient,
                    buyTokenPercentageFee: buyTokenPercentageFee.toString(),
                });

                expectCorrectQuoteResponse(
                    response,
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
                        'decodedUniqueId',
                    ),
                );
            });

            it('can add a buy token affiliate fee to a buy quote', async () => {
                const feeRecipient = randomAddress();
                const buyTokenPercentageFee = new BigNumber(0.05);

                const response = await requestSwap(app, 'quote', {
                    ...buyQuoteParams,
                    feeRecipient,
                    buyTokenPercentageFee: buyTokenPercentageFee.toString(),
                });

                expectCorrectQuoteResponse(
                    response,
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
                        'data',
                        'sellAmount',
                        'orders',
                        'decodedUniqueId',
                    ),
                );
            });

            it('validation error if given a non-zero sell token fee', async () => {
                const feeRecipient = randomAddress();
                const response = await requestSwap(app, 'quote', {
                    ...sellQuoteParams,
                    feeRecipient,
                    sellTokenPercentageFee: '0.01',
                });

                expectSwapError(response, {
                    validationErrors: [
                        {
                            code: ValidationErrorCodes.UnsupportedOption,
                            field: 'sellTokenPercentageFee',
                            reason: ValidationErrorReasons.ArgumentNotYetSupported,
                        },
                    ],
                });
            });

            it('validation error if given an invalid percentage', async () => {
                const feeRecipient = randomAddress();
                const response = await requestSwap(app, 'quote', {
                    ...sellQuoteParams,
                    feeRecipient,
                    buyTokenPercentageFee: '1.01',
                });

                expectSwapError(response, {
                    validationErrors: [
                        {
                            code: ValidationErrorCodes.ValueOutOfRange,
                            field: 'buyTokenPercentageFee',
                            reason: ValidationErrorReasons.PercentageOutOfRange,
                        },
                    ],
                });
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

interface SwapErrors {
    validationErrors?: ValidationErrorItem[];
    revertErrorReason?: string;
    generalUserError?: boolean;
}

async function requestSwap(
    app: Express.Application,
    endpoint: 'price' | 'quote',
    queryParams: ObjectMap<string>,
): Promise<supertest.Response> {
    const route = constructRoute({
        baseRoute: `${SWAP_PATH}/${endpoint}`,
        queryParams: {
            // NOTE: consider removing default params
            ...DEFAULT_QUERY_PARAMS,
            ...queryParams,
        },
    });
    return await httpGetAsync({ app, route });
}

async function expectSwapError(swapResponse: supertest.Response, swapErrors: SwapErrors) {
    expect(swapResponse.type).to.be.eq('application/json');
    expect(swapResponse.statusCode).not.eq(StatusCodes.OK);

    if (swapErrors.revertErrorReason) {
        expect(swapResponse.status).to.be.eq(StatusCodes.BAD_REQUEST);
        expect(swapResponse.body.code).to.eq(105);
        expect(swapResponse.body.reason).to.be.eql(swapErrors.revertErrorReason);
        return swapResponse;
    }
    if (swapErrors.validationErrors) {
        expect(swapResponse.status).to.be.eq(StatusCodes.BAD_REQUEST);
        expect(swapResponse.body.code).to.eq(100);
        expect(swapResponse.body.validationErrors).to.be.deep.eq(swapErrors.validationErrors);
        return swapResponse;
    }
    if (swapErrors.generalUserError) {
        expect(swapResponse.status).to.be.eq(StatusCodes.BAD_REQUEST);
        return swapResponse;
    }
}

const PRECISION = 2;
function expectCorrectQuoteResponse(
    response: supertest.Response,
    expectedResponse: Partial<GetSwapQuoteResponse>,
): void {
    expect(response.type).to.be.eq('application/json');
    expect(response.statusCode).eq(StatusCodes.OK);
    const quoteResponse = response.body as GetSwapQuoteResponse;

    for (const prop of Object.keys(expectedResponse)) {
        const property = prop as keyof GetSwapQuoteResponse;
        if (BigNumber.isBigNumber(expectedResponse[property])) {
            assertRoughlyEquals(quoteResponse[property], expectedResponse[property], PRECISION);
            continue;
        }

        if (prop === 'sources' && expectedResponse.sources !== undefined) {
            const expectedSources = expectedResponse.sources.map((source) => ({
                ...source,
                proportion: source.proportion.toString(),
            }));
            expect(quoteResponse.sources).to.deep.include.members(expectedSources);
            continue;
        }

        if (prop === 'debugData') {
            const { samplerGasUsage, blockNumber, ...rest } = quoteResponse[property];
            const {
                samplerGasUsage: expectedSamplerGasUsage,
                blockNumber: expectedBlockNumber,
                ...expectedRest
            } = expectedResponse[property];
            expect(samplerGasUsage).gt(expectedSamplerGasUsage * 0.5, 'samplerGasUsage is too low');
            expect(samplerGasUsage).lt(expectedSamplerGasUsage * 1.5, 'samplerGasUsage is too high');
            expect(blockNumber).gt(expectedBlockNumber * 0.5, 'blockNumber is too low');
            expect(blockNumber).lt(expectedBlockNumber * 1.5, 'blockNumber is too high');
            expect(rest).to.be.deep.eq(expectedRest);
            continue;
        }

        expect(quoteResponse[property], property).to.deep.eq(expectedResponse[property]);
    }
}
