// tslint:disable:max-file-line-count

import { ERC20BridgeSource } from '@0x/asset-swapper';
import { WETH9Contract } from '@0x/contract-wrappers';
import { DummyERC20TokenContract } from '@0x/contracts-erc20';
import { assertRoughlyEquals, expect, getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, Web3ProviderEngine } from '@0x/dev-utils';
import { ObjectMap } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';
import 'mocha';

// Force reload of the app avoid variables being polluted between test suites
delete require.cache[require.resolve('../src/app')];
import { AppDependencies, getAppAsync, getDefaultAppDependenciesAsync } from '../src/app';
import * as config from '../src/config';
import { AFFILIATE_FEE_TRANSFORMER_GAS, GAS_LIMIT_BUFFER_MULTIPLIER, SWAP_PATH } from '../src/constants';
import { ValidationErrorCodes, ValidationErrorItem, ValidationErrorReasons } from '../src/errors';
import { logger } from '../src/logger';
import { GetSwapQuoteResponse } from '../src/types';
import { isETHSymbolOrAddress } from '../src/utils/token_metadata_utils';

import {
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
    UNKNOWN_TOKEN_ADDRESS,
    UNKNOWN_TOKEN_ASSET_DATA,
    WETH_ASSET_DATA,
    WETH_TOKEN_ADDRESS,
    ZRX_ASSET_DATA,
    ZRX_TOKEN_ADDRESS,
} from './constants';
import { resetState } from './test_setup';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { constructRoute, httpGetAsync } from './utils/http_utils';
import { MAKER_WETH_AMOUNT, MeshTestUtils } from './utils/mesh_test_utils';
import { liquiditySources0xOnly } from './utils/mocks';

const SUITE_NAME = 'Swap API';
const EXCLUDED_SOURCES = Object.values(ERC20BridgeSource).filter(s => s !== ERC20BridgeSource.Native);
const DEFAULT_QUERY_PARAMS = {
    buyToken: 'ZRX',
    sellToken: 'WETH',
    excludedSources: EXCLUDED_SOURCES.join(','),
};

const ONE_THOUSAND_IN_BASE = new BigNumber('1000000000000000000000');

// Enable this test with SRA v4. Currently we cannot access V4 orders on Mesh.
describe.skip(SUITE_NAME, () => {
    let app: Express.Application;
    let server: Server;
    let dependencies: AppDependencies;
    let meshUtils: MeshTestUtils;
    let accounts: string[];
    let takerAddress: string;
    const invalidTakerAddress: string = '0x0000000000000000000000000000000000000001';

    let blockchainLifecycle: BlockchainLifecycle;
    let provider: Web3ProviderEngine;

    before(async () => {
        const shouldStartMesh = true;
        await setupDependenciesAsync(SUITE_NAME, shouldStartMesh);
        provider = getProvider();

        // start the 0x-api app
        dependencies = await getDefaultAppDependenciesAsync(provider, {
            ...config.defaultHttpServiceConfig,
            ethereumRpcUrl: ETHEREUM_RPC_URL,
        });
        ({ app, server } = await getAppAsync(
            { ...dependencies },
            { ...config.defaultHttpServiceConfig, ethereumRpcUrl: ETHEREUM_RPC_URL },
        ));

        const web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

        accounts = await web3Wrapper.getAvailableAddressesAsync();
        [, /* makerAdddress, */ takerAddress] = accounts;

        // Set up liquidity.
        await blockchainLifecycle.startAsync();
        meshUtils = new MeshTestUtils(provider);
        await meshUtils.setupUtilsAsync();
        await meshUtils.addPartialOrdersAsync([
            {
                makerAssetData: ZRX_ASSET_DATA,
                takerAssetData: WETH_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
            {
                makerAssetData: ZRX_ASSET_DATA,
                takerAssetData: WETH_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                // tslint:disable:custom-no-magic-numbers
                takerAssetAmount: ONE_THOUSAND_IN_BASE.multipliedBy(2),
            },
            {
                makerAssetData: ZRX_ASSET_DATA,
                takerAssetData: WETH_ASSET_DATA,
                makerAssetAmount: MAX_MINT_AMOUNT,
                // tslint:disable:custom-no-magic-numbers
                takerAssetAmount: ONE_THOUSAND_IN_BASE.multipliedBy(3),
            },
            {
                makerAssetData: WETH_ASSET_DATA,
                takerAssetData: ZRX_ASSET_DATA,
                makerAssetAmount: MAKER_WETH_AMOUNT,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
            {
                makerAssetData: ZRX_ASSET_DATA,
                takerAssetData: UNKNOWN_TOKEN_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
        ]);
        const wethToken = new WETH9Contract(CONTRACT_ADDRESSES.etherToken, provider);
        const zrxToken = new DummyERC20TokenContract(CONTRACT_ADDRESSES.zrxToken, provider);
        // EP setup so maker address can take
        await zrxToken.mint(MAX_MINT_AMOUNT).awaitTransactionSuccessAsync({ from: takerAddress });
        await wethToken.deposit().awaitTransactionSuccessAsync({ from: takerAddress, value: MAKER_WETH_AMOUNT });
        await wethToken
            .approve(CONTRACT_ADDRESSES.exchangeProxyAllowanceTarget, MAX_INT)
            .awaitTransactionSuccessAsync({ from: takerAddress });
        await zrxToken
            .approve(CONTRACT_ADDRESSES.exchangeProxyAllowanceTarget, MAX_INT)
            .awaitTransactionSuccessAsync({ from: takerAddress });
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
        await resetState();
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('/quote', () => {
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

        describe(`valid token parameter permutations`, async () => {
            const parameterPermutations = [
                { buyToken: 'ZRX', sellToken: 'WETH', buyAmount: '1000' },
                { buyToken: 'WETH', sellToken: 'ZRX', buyAmount: '1000' },
                { buyToken: ZRX_TOKEN_ADDRESS, sellToken: 'WETH', buyAmount: '1000' },
                { buyToken: ZRX_TOKEN_ADDRESS, sellToken: WETH_TOKEN_ADDRESS, buyAmount: '1000' },
                { buyToken: 'ZRX', sellToken: UNKNOWN_TOKEN_ADDRESS, buyAmount: '1000' },
                { buyToken: 'ZRX', sellToken: 'ETH', buyAmount: '1000' },
                { buyToken: 'ETH', sellToken: 'ZRX', buyAmount: '1000' },
                { buyToken: 'ZRX', sellToken: ETH_TOKEN_ADDRESS, buyAmount: '1000' },
                { buyToken: ETH_TOKEN_ADDRESS, sellToken: 'ZRX', buyAmount: '1000' },
            ];
            for (const parameters of parameterPermutations) {
                it(`should return a valid quote with ${JSON.stringify(parameters)}`, async () => {
                    await quoteAndExpectAsync(app, parameters, {
                        buyAmount: new BigNumber(parameters.buyAmount),
                        sellTokenAddress: parameters.sellToken.startsWith('0x')
                            ? parameters.sellToken
                            : SYMBOL_TO_ADDRESS[parameters.sellToken],
                        buyTokenAddress: parameters.buyToken.startsWith('0x')
                            ? parameters.buyToken
                            : SYMBOL_TO_ADDRESS[parameters.buyToken],
                        allowanceTarget: isETHSymbolOrAddress(parameters.sellToken)
                            ? NULL_ADDRESS
                            : CONTRACT_ADDRESSES.exchangeProxy,
                    });
                });
            }
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
        it('should not throw a validation error if takerAddress can complete the quote', async () => {
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
                {
                    revertErrorReason: 'SpenderERC20TransferFromFailedError',
                },
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

interface QuoteAssertion extends GetSwapQuoteResponse {
    validationErrors: ValidationErrorItem[];
    revertErrorReason: string;
}

async function quoteAndExpectAsync(
    app: Express.Application,
    queryParams: ObjectMap<string>,
    quoteAssertions: Partial<QuoteAssertion>,
): Promise<void> {
    const route = constructRoute({
        baseRoute: `${SWAP_PATH}/quote`,
        queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            ...queryParams,
        },
    });
    const response = await httpGetAsync({ app, route });
    expect(response.type).to.be.eq('application/json');
    if (quoteAssertions.revertErrorReason) {
        expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
        expect(response.body.code).to.eq(105);
        expect(response.body.reason).to.be.eql(quoteAssertions.revertErrorReason);
        return;
    }
    if (quoteAssertions.validationErrors) {
        expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
        expect(response.body.code).to.eq(100);
        expect(response.body.validationErrors).to.be.eql(quoteAssertions.validationErrors);
        return;
    }
    if (response.status !== HttpStatus.OK) {
        logger.warn(response.body);
    }
    expect(response.status).to.be.eq(HttpStatus.OK);
    expectCorrectQuote(response.body, quoteAssertions);
}

const PRECISION = 2;
function expectCorrectQuote(quoteResponse: GetSwapQuoteResponse, quoteAssertions: Partial<QuoteAssertion>): void {
    for (const property of Object.keys(quoteAssertions)) {
        if (BigNumber.isBigNumber(quoteAssertions[property as keyof QuoteAssertion])) {
            assertRoughlyEquals((quoteResponse as any)[property], (quoteAssertions as any)[property], PRECISION);
        } else {
            expect((quoteResponse as any)[property], property).to.eql((quoteAssertions as any)[property]);
        }
    }
    // Only have 0x liquidity for now.
    expect(quoteResponse.sources).to.be.eql(liquiditySources0xOnly);
}
