import { WETH9Contract } from '@0x/contract-wrappers';
import { DummyERC20TokenContract } from '@0x/contracts-erc20';
import { assertRoughlyEquals, expect, randomAddress } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, Web3ProviderEngine, Web3Wrapper } from '@0x/dev-utils';
import { isNativeSymbolOrAddress } from '@0x/token-metadata';
import { BigNumber } from '@0x/utils';
import { Server } from 'http';
import * as HttpStatus from 'http-status-codes';
import 'mocha';
import supertest from 'supertest';

import { getAppAsync } from '../src/app';
import { getDefaultAppDependenciesAsync } from '../src/runners/utils';
import { AppDependencies } from '../src/types';
import { LimitOrderFields } from '../src/asset-swapper';
import * as config from '../src/config';
import { META_TRANSACTION_V1_PATH, META_TRANSACTION_V2_PATH } from '../src/constants';
import { getDBConnectionOrThrow } from '../src/db_connection';
import { ValidationErrorCodes, ValidationErrorItem, ValidationErrorReasons } from '../src/errors';
import { GetSwapQuoteResponse, SignedLimitOrder } from '../src/types';

import {
    CHAIN_ID,
    CONTRACT_ADDRESSES,
    ETHEREUM_RPC_URL,
    getProvider,
    MAX_INT,
    MAX_MINT_AMOUNT,
    NULL_ADDRESS,
    SYMBOL_TO_ADDRESS,
    WETH_TOKEN_ADDRESS,
    ZRX_TOKEN_ADDRESS,
} from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { httpPostAsync } from './utils/http_utils';
import { MockOrderWatcher } from './utils/mock_order_watcher';
import { getRandomSignedLimitOrderAsync } from './utils/orders';
import { StatusCodes } from 'http-status-codes';
import { decodeTransformERC20 } from './asset-swapper/test_utils/decoders';
import { decodeAffiliateFeeTransformerData } from '@0x/protocol-utils';

// Force reload of the app avoid variables being polluted between test suites
// Warning: You probably don't want to move this
delete require.cache[require.resolve('../src/app')];
delete require.cache[require.resolve('../src/runners/utils')];

const SUITE_NAME = 'Meta-transaction API';
const MAKER_WETH_AMOUNT = new BigNumber('1000000000000000000');
const ONE_THOUSAND_IN_BASE = new BigNumber('1000000000000000000000');

const ZERO_EX_SOURCE = { name: '0x', proportion: new BigNumber('1') };

const INTEGRATOR_ID = 'integrator';
const TAKER_ADDRESS = '0x70a9f34f9b34c64957b9c401a97bfed35b95049e';

const onChainBilling = 'on-chain';
const offChainBilling = 'off-chain';

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

    describe('v2 /price', async () => {
        it('should respond with 200 OK even if the the takerAddress cannot complete a trade', async () => {
            // The taker does not have an allowance
            const swapResponse = await requestSwap(app, 'price', 'v2', {
                takerAddress: invalidTakerAddress,
                sellToken: 'WETH',
                buyToken: 'ZRX',
                sellAmount: '10000',
                integratorId: 'integrator',
                metaTransactionVersion: 'v1',
            });
            expect(swapResponse.statusCode).eq(HttpStatus.StatusCodes.OK);
        });
    });

    describe('v2 /quote', async () => {
        it('should handle valid request body permutations', async () => {
            const WETH_BUY_AMOUNT = MAKER_WETH_AMOUNT.div(10).toString();
            const ZRX_BUY_AMOUNT = ONE_THOUSAND_IN_BASE.div(10).toString();
            const bodyPermutations = [
                {
                    buyToken: 'ZRX',
                    sellToken: 'WETH',
                    buyAmount: ZRX_BUY_AMOUNT,
                    integratorId: INTEGRATOR_ID,
                    takerAddress: TAKER_ADDRESS,
                },
                {
                    buyToken: 'ZRX',
                    sellToken: 'WETH',
                    buyAmount: ZRX_BUY_AMOUNT,
                    integratorId: INTEGRATOR_ID,
                    takerAddress: TAKER_ADDRESS,
                    feeConfigs: {
                        integratorFee: {
                            type: 'volume',
                            volumePercentage: '0.1',
                            billingType: onChainBilling as 'on-chain',
                            feeRecipient: randomAddress(),
                        },
                        zeroExFee: {
                            type: 'integrator_share',
                            integratorSharePercentage: '0.2',
                            billingType: onChainBilling as 'on-chain',
                            feeRecipient: randomAddress(),
                        },
                        gasFee: {
                            type: 'gas',
                            billingType: onChainBilling as 'on-chain',
                            feeRecipient: randomAddress(),
                        },
                    },
                },
                {
                    buyToken: 'WETH',
                    sellToken: 'ZRX',
                    buyAmount: WETH_BUY_AMOUNT,
                    integratorId: INTEGRATOR_ID,
                    takerAddress: TAKER_ADDRESS,
                    feeConfigs: {
                        integratorFee: {
                            type: 'volume',
                            volumePercentage: '0.1',
                            billingType: onChainBilling as 'on-chain',
                            feeRecipient: randomAddress(),
                        },
                        zeroExFee: {
                            type: 'integrator_share',
                            integratorSharePercentage: '0.2',
                            billingType: offChainBilling as 'off-chain',
                            feeRecipient: null,
                        },
                    },
                },
                {
                    buyToken: ZRX_TOKEN_ADDRESS,
                    sellToken: 'WETH',
                    buyAmount: ZRX_BUY_AMOUNT,
                    integratorId: INTEGRATOR_ID,
                    takerAddress: TAKER_ADDRESS,
                    feeConfigs: {
                        integratorFee: {
                            type: 'volume',
                            volumePercentage: '0.1',
                            billingType: onChainBilling as 'on-chain',
                            feeRecipient: randomAddress(),
                        },
                        gasFee: {
                            type: 'gas',
                            billingType: onChainBilling as 'on-chain',
                            feeRecipient: randomAddress(),
                        },
                    },
                },
                {
                    buyToken: ZRX_TOKEN_ADDRESS,
                    sellToken: WETH_TOKEN_ADDRESS,
                    buyAmount: ZRX_BUY_AMOUNT,
                    integratorId: INTEGRATOR_ID,
                    takerAddress: TAKER_ADDRESS,
                    feeConfigs: {
                        integratorFee: {
                            type: 'volume',
                            volumePercentage: '0.1',
                            billingType: onChainBilling as 'on-chain',
                            feeRecipient: randomAddress(),
                        },
                    },
                },
                {
                    buyToken: ZRX_TOKEN_ADDRESS,
                    sellToken: WETH_TOKEN_ADDRESS,
                    buyAmount: ZRX_BUY_AMOUNT,
                    integratorId: INTEGRATOR_ID,
                    takerAddress: TAKER_ADDRESS,
                    feeConfigs: {
                        gasFee: { type: 'gas', billingType: offChainBilling as 'off-chain', feeRecipient: null },
                    },
                },
            ];

            for (const body of bodyPermutations) {
                const response = await requestSwap(app, 'quote', 'v2', {
                    ...body,
                    metaTransactionVersion: 'v1',
                });
                expectCorrectQuoteResponse(response, {
                    buyAmount: new BigNumber(body.buyAmount),
                    sellTokenAddress: body.sellToken.startsWith('0x')
                        ? body.sellToken
                        : SYMBOL_TO_ADDRESS[body.sellToken],
                    buyTokenAddress: body.buyToken.startsWith('0x') ? body.buyToken : SYMBOL_TO_ADDRESS[body.buyToken],
                    allowanceTarget: isNativeSymbolOrAddress(body.sellToken, CHAIN_ID)
                        ? NULL_ADDRESS
                        : CONTRACT_ADDRESSES.exchangeProxy,
                    sources: [ZERO_EX_SOURCE],
                });
            }
        });

        it("should respond with INSUFFICIENT_ASSET_LIQUIDITY when there's no liquidity", async () => {
            const response = await requestSwap(app, 'quote', 'v2', {
                buyToken: ZRX_TOKEN_ADDRESS,
                sellToken: WETH_TOKEN_ADDRESS,
                buyAmount: '10000000000000000000000000000000',
                integratorId: 'integrator',
                takerAddress: TAKER_ADDRESS,
                metaTransactionVersion: 'v1',
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        volumePercentage: '0.1',
                        billingType: onChainBilling,
                        feeRecipient: randomAddress(),
                    },
                },
            });
            expectSwapError(response, {
                validationErrors: [
                    {
                        code: ValidationErrorCodes.ValueOutOfRange,
                        field: 'buyAmount',
                        reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                    },
                ],
            });
        });

        it('should respect buyAmount', async () => {
            const response = await requestSwap(app, 'quote', 'v2', {
                buyToken: 'ZRX',
                sellToken: 'WETH',
                buyAmount: '1234',
                integratorId: INTEGRATOR_ID,
                takerAddress: TAKER_ADDRESS,
                metaTransactionVersion: 'v1',
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        volumePercentage: '0.1',
                        billingType: onChainBilling,
                        feeRecipient: randomAddress(),
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        integratorSharePercentage: '0.2',
                        billingType: offChainBilling,
                        feeRecipient: null,
                    },
                    gasFee: { type: 'gas', billingType: offChainBilling, feeRecipient: null },
                },
            });
            expectCorrectQuoteResponse(response, { buyAmount: new BigNumber(1234) });
        });

        it('should respect sellAmount', async () => {
            const response = await requestSwap(app, 'quote', 'v2', {
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: '1234',
                integratorId: INTEGRATOR_ID,
                takerAddress: TAKER_ADDRESS,
                metaTransactionVersion: 'v1',
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        volumePercentage: '0.1',
                        billingType: onChainBilling,
                        feeRecipient: randomAddress(),
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        integratorSharePercentage: '0.2',
                        billingType: offChainBilling,
                        feeRecipient: null,
                    },
                },
            });
            expectCorrectQuoteResponse(response, { sellAmount: new BigNumber(1234) });
        });

        it('should returns the correct trade kind', async () => {
            const response = await requestSwap(app, 'quote', 'v2', {
                buyToken: 'ZRX',
                sellToken: 'WETH',
                sellAmount: '1234',
                integratorId: INTEGRATOR_ID,
                takerAddress: TAKER_ADDRESS,
                metaTransactionVersion: 'v1',
                feeConfigs: {
                    integratorFee: {
                        type: 'volume',
                        volumePercentage: '0.1',
                        billingType: onChainBilling,
                        feeRecipient: randomAddress(),
                    },
                    zeroExFee: {
                        type: 'integrator_share',
                        integratorSharePercentage: '0.2',
                        billingType: onChainBilling,
                        feeRecipient: randomAddress(),
                    },
                },
            });
            expect(response.body.trade.kind).to.eql('metatransaction');
        });

        describe('fee', async () => {
            describe('integrator', async () => {
                it('should throw error if fee config kind is invalid', async () => {
                    const response = await requestSwap(app, 'quote', 'v2', {
                        buyToken: 'ZRX',
                        sellToken: 'WETH',
                        sellAmount: '1234',
                        integratorId: INTEGRATOR_ID,
                        takerAddress: TAKER_ADDRESS,
                        metaTransactionVersion: 'v1',
                        feeConfigs: {
                            integratorFee: {
                                type: 'random',
                                volumePercentage: '0.1',
                                billingType: onChainBilling,
                                feeRecipient: randomAddress(),
                            },
                        },
                    });

                    expectSwapError(response, {
                        validationErrors: [
                            {
                                field: 'feeConfigs',
                                code: ValidationErrorCodes.IncorrectFormat,
                                reason: ValidationErrorReasons.InvalidGaslessFeeType,
                            },
                        ],
                    });
                });

                it('should throw error if volumePercentage is out of range', async () => {
                    const response = await requestSwap(app, 'quote', 'v2', {
                        buyToken: 'ZRX',
                        sellToken: 'WETH',
                        sellAmount: '1234',
                        integratorId: INTEGRATOR_ID,
                        takerAddress: TAKER_ADDRESS,
                        metaTransactionVersion: 'v1',
                        feeConfigs: {
                            integratorFee: {
                                type: 'volume',
                                volumePercentage: '1000',
                                billingType: onChainBilling,
                                feeRecipient: randomAddress(),
                            },
                        },
                    });

                    expectSwapError(response, {
                        validationErrors: [
                            {
                                field: 'feeConfigs',
                                code: ValidationErrorCodes.ValueOutOfRange,
                                reason: ValidationErrorReasons.PercentageOutOfRange,
                            },
                        ],
                    });
                });

                it('should returns correct integrator fee', async () => {
                    const feeRecipient = randomAddress();
                    const response = await requestSwap(app, 'quote', 'v2', {
                        buyToken: 'ZRX',
                        sellToken: 'WETH',
                        sellAmount: '1234',
                        integratorId: INTEGRATOR_ID,
                        takerAddress: TAKER_ADDRESS,
                        metaTransactionVersion: 'v1',
                        feeConfigs: {
                            integratorFee: {
                                type: 'volume',
                                volumePercentage: '0.1',
                                billingType: onChainBilling,
                                feeRecipient,
                            },
                        },
                    });

                    const { sellAmount, trade, fees } = response.body;
                    const callArgs = decodeTransformERC20(trade.metaTransaction.callData);
                    expect(sellAmount).to.eql('1234');
                    expect(fees.integratorFee).to.eql({
                        type: 'volume',
                        feeToken: WETH_TOKEN_ADDRESS,
                        billingType: onChainBilling,
                        feeRecipient,
                        feeAmount: '123',
                        volumePercentage: '0.1',
                    });
                    expect(decodeAffiliateFeeTransformerData(callArgs.transformations[0].data).fees).to.eql([
                        { token: WETH_TOKEN_ADDRESS, amount: new BigNumber(123), recipient: feeRecipient },
                    ]);
                });
            });

            describe('0x', async () => {
                it('should throw error if kind is invalid', async () => {
                    const response = await requestSwap(app, 'quote', 'v2', {
                        buyToken: 'ZRX',
                        sellToken: 'WETH',
                        sellAmount: '1234',
                        integratorId: INTEGRATOR_ID,
                        takerAddress: TAKER_ADDRESS,
                        metaTransactionVersion: 'v1',
                        feeConfigs: {
                            zeroExFee: {
                                type: 'random',
                                volumePercentage: '0.1',
                                billingType: onChainBilling,
                                feeRecipient: randomAddress(),
                            },
                        },
                    });

                    expectSwapError(response, {
                        validationErrors: [
                            {
                                field: 'feeConfigs',
                                code: ValidationErrorCodes.IncorrectFormat,
                                reason: ValidationErrorReasons.InvalidGaslessFeeType,
                            },
                        ],
                    });
                });

                it('should throw error if volumePercentage is out of range', async () => {
                    const response = await requestSwap(app, 'quote', 'v2', {
                        buyToken: 'ZRX',
                        sellToken: 'WETH',
                        sellAmount: '1234',
                        integratorId: INTEGRATOR_ID,
                        takerAddress: TAKER_ADDRESS,
                        metaTransactionVersion: 'v1',
                        feeConfigs: {
                            zeroExFee: {
                                type: 'volume',
                                volumePercentage: '1000',
                                billingType: onChainBilling,
                                feeRecipient: randomAddress(),
                            },
                        },
                    });

                    expectSwapError(response, {
                        validationErrors: [
                            {
                                field: 'feeConfigs',
                                code: ValidationErrorCodes.ValueOutOfRange,
                                reason: ValidationErrorReasons.PercentageOutOfRange,
                            },
                        ],
                    });
                });

                it('should throw error if integrator fee config is empty and 0x fee kind is integrator_share', async () => {
                    const response = await requestSwap(app, 'quote', 'v2', {
                        buyToken: 'ZRX',
                        sellToken: 'WETH',
                        sellAmount: '1234',
                        integratorId: INTEGRATOR_ID,
                        takerAddress: TAKER_ADDRESS,
                        metaTransactionVersion: 'v1',
                        feeConfigs: {
                            zeroExFee: {
                                type: 'integrator_share',
                                integratorSharePercentage: '1000',
                                billingType: onChainBilling,
                                feeRecipient: randomAddress(),
                            },
                        },
                    });

                    expectSwapError(response, {
                        validationErrors: [
                            {
                                field: 'feeConfigs',
                                code: ValidationErrorCodes.IncorrectFormat,
                                reason: ValidationErrorReasons.InvalidGaslessFeeType,
                            },
                        ],
                    });

                    it('should throw error if integratorSharePercentage is out of range', async () => {
                        const response = await requestSwap(app, 'quote', 'v2', {
                            buyToken: 'ZRX',
                            sellToken: 'WETH',
                            sellAmount: '1234',
                            integratorId: INTEGRATOR_ID,
                            takerAddress: TAKER_ADDRESS,
                            metaTransactionVersion: 'v1',
                            feeConfigs: {
                                integratorFee: {
                                    type: 'volume',
                                    volumePercentage: '0.1',
                                    billingType: onChainBilling,
                                    feeRecipient: randomAddress(),
                                },
                                zeroExFee: {
                                    type: 'integrator_share',
                                    integratorSharePercentage: '1000',
                                    billingType: onChainBilling,
                                    feeRecipient: randomAddress(),
                                },
                            },
                        });

                        expectSwapError(response, {
                            validationErrors: [
                                {
                                    field: 'feeConfigs',
                                    code: ValidationErrorCodes.ValueOutOfRange,
                                    reason: ValidationErrorReasons.PercentageOutOfRange,
                                },
                            ],
                        });
                    });
                });

                it('should returns correct 0x fee', async () => {
                    const feeRecipient = randomAddress();
                    const response = await requestSwap(app, 'quote', 'v2', {
                        buyToken: 'ZRX',
                        sellToken: 'WETH',
                        sellAmount: '1234',
                        integratorId: INTEGRATOR_ID,
                        takerAddress: TAKER_ADDRESS,
                        metaTransactionVersion: 'v1',
                        feeConfigs: {
                            zeroExFee: {
                                type: 'volume',
                                volumePercentage: '0.2',
                                billingType: onChainBilling,
                                feeRecipient,
                            },
                        },
                    });

                    const { sellAmount, trade, fees } = response.body;
                    const callArgs = decodeTransformERC20(trade.metaTransaction.callData);
                    expect(sellAmount).to.eql('1234');
                    expect(fees.zeroExFee).to.eql({
                        type: 'volume',
                        feeToken: WETH_TOKEN_ADDRESS,
                        billingType: onChainBilling,
                        feeRecipient,
                        feeAmount: '246',
                        volumePercentage: '0.2',
                    });
                    expect(decodeAffiliateFeeTransformerData(callArgs.transformations[0].data).fees).to.eql([
                        { token: WETH_TOKEN_ADDRESS, amount: new BigNumber(246), recipient: feeRecipient },
                    ]);
                });
            });

            describe('gas', async () => {
                it('should throw error if kind is invalid', async () => {
                    const response = await requestSwap(app, 'quote', 'v2', {
                        buyToken: 'ZRX',
                        sellToken: 'WETH',
                        sellAmount: '1234',
                        integratorId: INTEGRATOR_ID,
                        takerAddress: TAKER_ADDRESS,
                        metaTransactionVersion: 'v1',
                        feeConfigs: {
                            gasFee: { type: 'random', billingType: onChainBilling, feeRecipient: randomAddress() },
                        },
                    });

                    expectSwapError(response, {
                        validationErrors: [
                            {
                                field: 'feeConfigs',
                                code: ValidationErrorCodes.IncorrectFormat,
                                reason: ValidationErrorReasons.InvalidGaslessFeeType,
                            },
                        ],
                    });
                });
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
    version: 'v1' | 'v2',
    body: {
        buyToken: string;
        buyAmount?: string;
        sellToken: string;
        sellAmount?: string;
        takerAddress: string;
        slippagePercentage?: string;
        integratorId: string;
        quoteUniqueId?: string;
        metaTransactionVersion?: 'v1' | 'v2';
        feeConfigs?: {
            integratorFee?: {
                type: string;
                volumePercentage: string;
                billingType: 'on-chain' | 'off-chain';
                feeRecipient: string;
            };
            zeroExFee?:
                | {
                      type: string;
                      volumePercentage: string;
                      billingType: 'on-chain' | 'off-chain';
                      feeRecipient: string | null;
                  }
                | {
                      type: string;
                      integratorSharePercentage: string;
                      billingType: 'on-chain' | 'off-chain';
                      feeRecipient: string | null;
                  };
            gasFee?: {
                type: string;
                feeRecipient: string | null;
                billingType: 'on-chain' | 'off-chain';
            };
        };
    },
): Promise<supertest.Response> {
    const metaTransactionPath = version === 'v1' ? META_TRANSACTION_V1_PATH : META_TRANSACTION_V2_PATH;
    const route = `${metaTransactionPath}/${endpoint}`;

    return await httpPostAsync({ app, route, body });
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
        expect(swapResponse.body.validationErrors).to.be.eql(swapErrors.validationErrors);
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

        expect(quoteResponse[property], property).to.eql(expectedResponse[property]);
    }
}
