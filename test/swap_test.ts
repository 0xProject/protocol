import { ERC20BridgeSource } from '@0x/asset-swapper';
import { WETH9Contract } from '@0x/contract-wrappers';
import { DummyERC20TokenContract } from '@0x/contracts-erc20';
import {
    assertRoughlyEquals,
    constants,
    expect,
    getRandomFloat,
    getRandomInteger,
    randomAddress,
} from '@0x/contracts-test-utils';
import { BlockchainLifecycle, web3Factory, Web3ProviderEngine } from '@0x/dev-utils';
import { ObjectMap } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';
import 'mocha';

import * as config from '../src/config';
import {
    AFFILIATE_FEE_TRANSFORMER_GAS,
    GAS_LIMIT_BUFFER_MULTIPLIER,
    ONE,
    SWAP_PATH as BASE_SWAP_PATH,
} from '../src/constants';
import { ValidationErrorCodes, ValidationErrorItem, ValidationErrorReasons } from '../src/errors';
import { logger } from '../src/logger';
import { GetSwapQuoteResponse } from '../src/types';

import {
    CONTRACT_ADDRESSES,
    MAX_INT,
    MAX_MINT_AMOUNT,
    SYMBOL_TO_ADDRESS,
    UNKNOWN_TOKEN_ADDRESS,
    UNKNOWN_TOKEN_ASSET_DATA,
    WETH_ASSET_DATA,
    WETH_TOKEN_ADDRESS,
    ZRX_ASSET_DATA,
    ZRX_TOKEN_ADDRESS,
} from './constants';
import { setupApiAsync, setupMeshAsync, teardownApiAsync, teardownMeshAsync } from './utils/deployment';
import { constructRoute, httpGetAsync } from './utils/http_utils';
import { MAKER_WETH_AMOUNT, MeshTestUtils } from './utils/mesh_test_utils';
import { liquiditySources0xOnly } from './utils/mocks';

const SUITE_NAME = '/swap/v1';
const SWAP_PATH = `${BASE_SWAP_PATH}/v1`;

const EXCLUDED_SOURCES = Object.values(ERC20BridgeSource).filter(s => s !== ERC20BridgeSource.Native);
const DEFAULT_QUERY_PARAMS = {
    buyToken: 'ZRX',
    sellToken: 'WETH',
    excludedSources: EXCLUDED_SOURCES.join(','),
};

const ONE_THOUSAND_IN_BASE = new BigNumber('1000000000000000000000');

describe(SUITE_NAME, () => {
    let meshUtils: MeshTestUtils;
    let accounts: string[];
    let takerAddress: string;
    const invalidTakerAddress: string = '0x0000000000000000000000000000000000000001';

    let blockchainLifecycle: BlockchainLifecycle;
    let provider: Web3ProviderEngine;

    before(async () => {
        await setupApiAsync(SUITE_NAME);
        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: config.ETHEREUM_RPC_URL,
        };
        provider = web3Factory.getRpcProvider(ganacheConfigs);

        const web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

        accounts = await web3Wrapper.getAvailableAddressesAsync();
        [, /* makerAdddress, */ takerAddress] = accounts;

        // Set up liquidity.
        await blockchainLifecycle.startAsync();
        await setupMeshAsync(SUITE_NAME);
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
        await teardownMeshAsync(SUITE_NAME);
        await teardownApiAsync(SUITE_NAME);
    });
    describe('/quote', () => {
        it("with INSUFFICIENT_ASSET_LIQUIDITY when there's no liquidity (empty orderbook, sampling excluded, no RFQ)", async () => {
            await quoteAndExpectAsync(
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
            ];
            for (const parameters of parameterPermutations) {
                it(`should return a valid quote with ${JSON.stringify(parameters)}`, async () => {
                    await quoteAndExpectAsync(parameters, {
                        buyAmount: new BigNumber(parameters.buyAmount),
                        sellTokenAddress: parameters.sellToken.startsWith('0x')
                            ? parameters.sellToken
                            : SYMBOL_TO_ADDRESS[parameters.sellToken],
                        buyTokenAddress: parameters.buyToken.startsWith('0x')
                            ? parameters.buyToken
                            : SYMBOL_TO_ADDRESS[parameters.buyToken],
                        allowanceTarget: CONTRACT_ADDRESSES.exchangeProxyAllowanceTarget,
                    });
                });
            }
        });

        it('should respect buyAmount', async () => {
            await quoteAndExpectAsync({ buyAmount: '1234' }, { buyAmount: new BigNumber(1234) });
        });
        it('should respect sellAmount', async () => {
            await quoteAndExpectAsync({ sellAmount: '1234' }, { sellAmount: new BigNumber(1234) });
        });
        it('should respect gasPrice', async () => {
            await quoteAndExpectAsync(
                { sellAmount: '1234', gasPrice: '150000000000' },
                { gasPrice: new BigNumber('150000000000') },
            );
        });
        it('should respect excludedSources', async () => {
            await quoteAndExpectAsync(
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
        it('should return a ExchangeProxy transaction for sellToken=ETH', async () => {
            await quoteAndExpectAsync(
                {
                    sellToken: 'WETH',
                    sellAmount: '1234',
                },
                {
                    to: CONTRACT_ADDRESSES.exchangeProxy,
                },
            );
            await quoteAndExpectAsync(
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
        it('should not return estimatedGasTokenRefund: 0 if there are not gas tokens in our wallet', async () => {
            await quoteAndExpectAsync(
                {
                    sellAmount: '1234',
                },
                {
                    estimatedGasTokenRefund: constants.ZERO_AMOUNT,
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
                const buyTokenPercentageFee = getRandomFloat(0, 1);
                await quoteAndExpectAsync(
                    {
                        ...sellQuoteParams,
                        feeRecipient,
                        buyTokenPercentageFee: buyTokenPercentageFee.toString(),
                    },
                    _.omit(
                        {
                            ...sellQuoteWithoutFee,
                            buyAmount: new BigNumber(sellQuoteWithoutFee.buyAmount).dividedBy(
                                ONE.plus(buyTokenPercentageFee),
                            ),
                            estimatedGas: new BigNumber(sellQuoteWithoutFee.estimatedGas).plus(
                                AFFILIATE_FEE_TRANSFORMER_GAS,
                            ),
                            gas: new BigNumber(sellQuoteWithoutFee.gas).plus(
                                AFFILIATE_FEE_TRANSFORMER_GAS.times(GAS_LIMIT_BUFFER_MULTIPLIER),
                            ),
                            price: new BigNumber(sellQuoteWithoutFee.price).dividedBy(ONE.plus(buyTokenPercentageFee)),
                            guaranteedPrice: new BigNumber(sellQuoteWithoutFee.guaranteedPrice).dividedBy(
                                ONE.plus(buyTokenPercentageFee),
                            ),
                        },
                        'data',
                    ),
                );
            });
            it('can add a buy token affiliate fee to a buy quote', async () => {
                const feeRecipient = randomAddress();
                const buyTokenPercentageFee = getRandomFloat(0, 1);
                await quoteAndExpectAsync(
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
                            price: new BigNumber(buyQuoteWithoutFee.price).times(ONE.plus(buyTokenPercentageFee)),
                            guaranteedPrice: new BigNumber(buyQuoteWithoutFee.guaranteedPrice).times(
                                ONE.plus(buyTokenPercentageFee),
                            ),
                        },
                        ['data', 'sellAmount'],
                    ),
                );
            });
            it('validation error if given a non-zero sell token fee', async () => {
                const feeRecipient = randomAddress();
                await quoteAndExpectAsync(
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
    });
});

interface QuoteAssertion extends GetSwapQuoteResponse {
    validationErrors: ValidationErrorItem[];
    revertErrorReason: string;
}

async function quoteAndExpectAsync(
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
    const response = await httpGetAsync({ route });
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

const PRECISION = 4;
function expectCorrectQuote(quoteResponse: GetSwapQuoteResponse, quoteAssertions: Partial<QuoteAssertion>): void {
    for (const property of Object.keys(quoteAssertions)) {
        if (BigNumber.isBigNumber(quoteAssertions[property])) {
            assertRoughlyEquals(quoteResponse[property], quoteAssertions[property], PRECISION);
        } else {
            expect(quoteResponse[property], property).to.eql(quoteAssertions[property]);
        }
    }
    // Only have 0x liquidity for now.
    expect(quoteResponse.sources).to.be.eql(liquiditySources0xOnly);
}
