import { ValidationErrorCodes } from '@0x/api-utils';
import { ethSignHashWithKey, MetaTransaction, OtcOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import Redis from 'ioredis';
import { mapValues } from 'lodash';
import { Producer } from 'sqs-producer';
import * as supertest from 'supertest';

import { MOCK_META_TRANSACTION_TRADE } from '../../../test/constants';
import { Integrator } from '../../config';
import { TX_RELAY_V1_PATH, ZERO_G_ALIAS_PATH, ZERO_G_PATH } from '../../core/constants';
import { GaslessTypes } from '../../core/types';
import { TruncatedFees } from '../../core/types/meta_transaction_fees';
import { errorHandler } from '../../middleware/error_handling';
import { createTxRelayV1Router, createZeroGRouter } from '../../routers/GaslessSwapRouter';
import { GaslessSwapService } from '../../services/GaslessSwapService';
import { RfqmService } from '../../services/rfqm_service';
import {
    FetchIndicativeQuoteResponse,
    LiquiditySource,
    MetaTransactionV1QuoteResponse,
    MetaTransactionV2QuoteResponse,
    OtcOrderRfqmQuoteResponse,
    SubmitMetaTransactionSignedQuoteResponse,
    SubmitMetaTransactionV2SignedQuoteResponse,
} from '../../services/types';
import { ConfigManager } from '../../utils/config_manager';
import { RfqmDbUtils } from '../../utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../../utils/rfq_blockchain_utils';

jest.mock('../../services/GaslessSwapService', () => {
    return {
        GaslessSwapService: jest.fn().mockImplementation(() => {
            return {
                fetchPriceAsync: jest.fn(),
                fetchQuoteAsync: jest.fn(),
                processSubmitAsync: jest.fn(),
                getTokenDecimalsAsync: jest.fn().mockResolvedValue(18),
            };
        }),
    };
});

jest.mock('../../utils/config_manager', () => {
    return {
        ConfigManager: jest.fn().mockImplementation(() => {
            return {
                getRfqmApiKeyWhitelist: jest.fn().mockReturnValue(new Set(['integrator-api-key'])),
                getIntegratorIdForApiKey: jest.fn().mockReturnValue('integrator-id'),
                getIntegratorByIdOrThrow: jest.fn().mockImplementation((id) => {
                    if (id !== 'integrator-id') {
                        throw new Error();
                    }
                    const integrator: Integrator = {
                        apiKeys: ['integrator-api-key'],
                        allowedChainIds: [420, 1337],
                        integratorId: 'integrator-id',
                        label: 'test integrator',
                        rfqm: true,
                    };
                    return integrator;
                }),
            };
        }),
    };
});

const mockGaslessSwapService = jest.mocked(
    new GaslessSwapService(
        0,
        {} as RfqmService,
        new URL('http://meta.transaction.service'),
        {} as AxiosInstance,
        {} as Redis,
        {} as RfqmDbUtils,
        {} as RfqBlockchainUtils,
        {} as Producer,
    ),
);
const mockConfigManager = jest.mocked(new ConfigManager());

const testChainId = 1337;

/**
 * Verifies the proper response to a request using a mocked `GaslessSwapService`.
 *
 * Each case sets up its own little Express app to avoid coupiling this
 * test to the upstream router.
 */
describe('GaslessSwapHandlers', () => {
    const takerAddress = '0x4c42a706410f1190f97d26fe3c999c90070aa40f';
    const takerPrivateKey = '0xd2c2349e10170e4219d9febd1c663ea5c7334f79c38d25f4f52c85af796c7c05';
    const feeRecipient = '0x5fb321349ace5303c82f0d1d491041e042f2ad22';
    const app = express()
        .use(express.json())
        .use(ZERO_G_PATH, createZeroGRouter(new Map([[testChainId, mockGaslessSwapService]]), mockConfigManager))
        .use(ZERO_G_ALIAS_PATH, createZeroGRouter(new Map([[testChainId, mockGaslessSwapService]]), mockConfigManager))
        .use(
            TX_RELAY_V1_PATH,
            createTxRelayV1Router(new Map([[testChainId, mockGaslessSwapService]]), mockConfigManager),
        )
        .use(errorHandler);

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('parameter verification', () => {
        it('throws if a required parameter is missing', async () => {
            const response = await supertest(app)
                .get(`${ZERO_G_ALIAS_PATH}/price`)
                .query({ makerToken: '0xmakertoken' })
                .set('Accept', 'application/json');

            expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.RequiredField);
            expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
        });

        it('throws if the chain ID is invalid', async () => {
            const response = await supertest(app)
                .get(`${ZERO_G_ALIAS_PATH}/price`)
                .set('Content-type', 'application/json')
                .set('0x-api-key', 'integrator-api-key')
                .set('0x-chain-id', '420')
                .query({
                    buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                    sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    buyAmount: 1000,
                    takerAddress,
                    intentOnFilling: 'false',
                    skipValidation: 'true',
                });

            expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.FieldInvalid);
            expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
        });

        describe('zero-g', () => {
            it('throws if the `slippagePercentage` is out of range for /price', async () => {
                const response = await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 2.1,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `slippagePercentage` is out of range for /quote', async () => {
                const response = await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 0.00001,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `slippagePercentage` is invalid for /quote', async () => {
                const response = await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 'invalid',
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.IncorrectFormat);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });
        });

        describe('tx relay v1', () => {
            it('throws if the `priceImpactProtectionPercentage` is out of range for /price', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        priceImpactProtectionPercentage: 1.01,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `priceImpactProtectionPercentage` is out of range for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        priceImpactProtectionPercentage: 0,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `priceImpactProtectionPercentage` is invalid for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        priceImpactProtectionPercentage: 'invalid',
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.IncorrectFormat);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `slippagePercentage` is out of range for /price', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 1.01,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `slippagePercentage` is out of range for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 0,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `slippagePercentage` is invalid for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 'invalid',
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.IncorrectFormat);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `acceptedTypes` is invalid for /price', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        acceptedTypes: 'metatransaction,random',
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.IncorrectFormat);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `acceptedTypes` is invalid for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        acceptedTypes: 'metatransaction,random',
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.IncorrectFormat);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `feeType` is invalid for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 0.1,
                        feeType: 'invalid',
                        feeSellTokenPercentage: 0.1,
                        feeRecipient,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `feeSellTokenPercentage` is undefined when `feeType` is provided for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 0.01,
                        feeType: 'volume',
                        feeRecipient,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.RequiredField);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `feeSellTokenPercentage` is out of range for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 0.1,
                        feeType: 'volume',
                        feeSellTokenPercentage: 1.01,
                        feeRecipient,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `feeSellTokenPercentage` is out of range for /price', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 0.1,
                        feeType: 'volume',
                        feeSellTokenPercentage: 1.01,
                        feeRecipient,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.ValueOutOfRange);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });

            it('throws if the `feeRecipient` is undefined when `feeType` is provided for /quote', async () => {
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        slippagePercentage: 0.1,
                        feeType: 'volume',
                        feeSellTokenPercentage: 0.05,
                    });

                expect(response.body.validationErrors[0].code).toEqual(ValidationErrorCodes.RequiredField);
                expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
            });
        });
    });

    describe('getPriceAsync', () => {
        describe('zero-g', () => {
            it('responds with an error if the underlying service call fails', async () => {
                mockGaslessSwapService.fetchPriceAsync.mockRejectedValueOnce(new Error('The service blew up'));

                const response = await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        intentOnFilling: 'false',
                        skipValidation: 'true',
                    });

                expect(response.statusCode).toEqual(HttpStatus.INTERNAL_SERVER_ERROR);
            });

            it('passes calls on to Gasless Swap Service', async () => {
                mockGaslessSwapService.fetchPriceAsync.mockResolvedValue(null);

                await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        intentOnFilling: 'false',
                        skipValidation: 'true',
                    });

                expect(mockGaslessSwapService.fetchPriceAsync.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      {
                        "acceptedTypes": [
                          "metatransaction",
                          "otc",
                        ],
                        "affiliateAddress": undefined,
                        "buyAmount": "1000",
                        "buyToken": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
                        "buyTokenDecimals": 18,
                        "feeRecipient": undefined,
                        "feeSellTokenPercentage": undefined,
                        "feeType": undefined,
                        "integrator": {
                          "allowedChainIds": [
                            420,
                            1337,
                          ],
                          "apiKeys": [
                            "integrator-api-key",
                          ],
                          "integratorId": "integrator-id",
                          "label": "test integrator",
                          "rfqm": true,
                        },
                        "priceImpactProtectionPercentage": undefined,
                        "sellAmount": undefined,
                        "sellToken": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                        "sellTokenDecimals": 18,
                        "slippagePercentage": undefined,
                        "takerAddress": "0x4c42a706410f1190f97d26fe3c999c90070aa40f",
                      },
                      "zero_g",
                    ]
                `);
            });

            it('returns returns an RFQ Price', async () => {
                const price: FetchIndicativeQuoteResponse & { liquiditySource: 'rfq' } = {
                    allowanceTarget: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
                    buyAmount: new BigNumber(1000),
                    sellAmount: new BigNumber(2000),
                    buyTokenAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                    sellTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    gas: new BigNumber(1043459),
                    price: new BigNumber(2),
                    liquiditySource: 'rfq',
                };

                mockGaslessSwapService.fetchPriceAsync.mockResolvedValue(price);

                const response = await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        intentOnFilling: 'false',
                        skipValidation: 'true',
                    });

                expect(response.body).toStrictEqual({ ...convertBigNumbersToJson(price), liquidityAvailable: true });
                expect(response.statusCode).toEqual(HttpStatus.OK);
            });

            it('returns returns an AMM Price', async () => {
                const price: FetchIndicativeQuoteResponse & { liquiditySource: 'amm' } = {
                    allowanceTarget: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
                    buyAmount: new BigNumber(1000),
                    sellAmount: new BigNumber(2000),
                    buyTokenAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                    sellTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    gas: new BigNumber(1043459),
                    price: new BigNumber(2),
                    liquiditySource: 'amm',
                };

                mockGaslessSwapService.fetchPriceAsync.mockResolvedValue(price);

                const response = await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        intentOnFilling: 'false',
                        skipValidation: 'true',
                    });

                expect(response.body).toStrictEqual({ ...convertBigNumbersToJson(price), liquidityAvailable: true });
                expect(response.statusCode).toEqual(HttpStatus.OK);
            });
        });

        describe('tx relay v1', () => {
            it('passes calls on to Gasless Swap Service', async () => {
                mockGaslessSwapService.fetchPriceAsync.mockResolvedValue(null);

                await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        feeType: 'volume',
                        priceImpactProtectionPercentage: 0.2,
                        feeSellTokenPercentage: 0.1,
                        feeRecipient,
                    });

                expect(mockGaslessSwapService.fetchPriceAsync.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      {
                        "acceptedTypes": [
                          "metatransaction",
                        ],
                        "affiliateAddress": undefined,
                        "buyAmount": "1000",
                        "buyToken": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
                        "buyTokenDecimals": 18,
                        "feeRecipient": "0x5fb321349ace5303c82f0d1d491041e042f2ad22",
                        "feeSellTokenPercentage": "0.1",
                        "feeType": "volume",
                        "integrator": {
                          "allowedChainIds": [
                            420,
                            1337,
                          ],
                          "apiKeys": [
                            "integrator-api-key",
                          ],
                          "integratorId": "integrator-id",
                          "label": "test integrator",
                          "rfqm": true,
                        },
                        "priceImpactProtectionPercentage": "0.2",
                        "sellAmount": undefined,
                        "sellToken": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                        "sellTokenDecimals": 18,
                        "slippagePercentage": undefined,
                        "takerAddress": "0x4c42a706410f1190f97d26fe3c999c90070aa40f",
                      },
                      "tx_relay",
                    ]
                `);
            });

            it('returns returns a meta-transaction price', async () => {
                const price: FetchIndicativeQuoteResponse & { sources: LiquiditySource[]; fees?: TruncatedFees } = {
                    allowanceTarget: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
                    buyAmount: new BigNumber(1000),
                    sellAmount: new BigNumber(2000),
                    buyTokenAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                    sellTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    price: new BigNumber(2),
                    estimatedPriceImpact: null,
                    sources: [
                        {
                            name: 'QuickSwap',
                            proportion: new BigNumber(0.2308),
                        },
                        {
                            name: 'DODO_V2',
                            proportion: new BigNumber(0.07692),
                        },
                        {
                            name: 'Uniswap_V3',
                            proportion: new BigNumber(0.6923),
                        },
                    ],
                    fees: {
                        integratorFee: {
                            feeType: 'volume',
                            feeToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                            feeAmount: new BigNumber(100),
                        },
                        zeroExFee: {
                            feeType: 'integrator_share',
                            feeToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                            feeAmount: new BigNumber(10),
                        },
                        gasFee: {
                            feeType: 'gas',
                            feeToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                            feeAmount: new BigNumber(1),
                        },
                    },
                };

                mockGaslessSwapService.fetchPriceAsync.mockResolvedValue(price);

                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/price`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        priceImpactProtectionPercentage: 0.2,
                    });

                expect(response.body).toStrictEqual({ ...convertBigNumbersToJson(price), liquidityAvailable: true });
                expect(response.statusCode).toEqual(HttpStatus.OK);
            });
        });
    });

    describe('getQuoteAsync', () => {
        describe('zero-g', () => {
            it('passes calls on to Gasless Swap Service', async () => {
                mockGaslessSwapService.fetchQuoteAsync.mockResolvedValue(null);

                await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        intentOnFilling: 'false',
                        skipValidation: 'true',
                    });

                expect(mockGaslessSwapService.fetchQuoteAsync.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      {
                        "acceptedTypes": [
                          "metatransaction",
                          "otc",
                        ],
                        "affiliateAddress": undefined,
                        "buyAmount": "1000",
                        "buyToken": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
                        "buyTokenDecimals": 18,
                        "checkApproval": false,
                        "feeRecipient": undefined,
                        "feeSellTokenPercentage": undefined,
                        "feeType": undefined,
                        "integrator": {
                          "allowedChainIds": [
                            420,
                            1337,
                          ],
                          "apiKeys": [
                            "integrator-api-key",
                          ],
                          "integratorId": "integrator-id",
                          "label": "test integrator",
                          "rfqm": true,
                        },
                        "priceImpactProtectionPercentage": undefined,
                        "sellAmount": undefined,
                        "sellToken": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                        "sellTokenDecimals": 18,
                        "slippagePercentage": undefined,
                        "takerAddress": "0x4c42a706410f1190f97d26fe3c999c90070aa40f",
                      },
                      "zero_g",
                    ]
                `);
            });

            it('returns an RFQ quote', async () => {
                const quote: OtcOrderRfqmQuoteResponse & { liquiditySource: 'rfq' } = {
                    buyAmount: new BigNumber('1800054805473'),
                    buyTokenAddress: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                    gas: new BigNumber('1043459'),
                    order: new OtcOrder({
                        chainId: 1337,
                        expiryAndNonce: new BigNumber(
                            '62771017353866807638357894232076664161023554444640345128970000000000000000',
                        ),
                        maker: '0x2222222222222222222222222222222222222222',
                        makerAmount: new BigNumber('0'),
                        makerToken: '0x3333333333333333333333333333333333333333',
                        taker: '0x1111111111111111111111111111111111111111',
                        takerAmount: new BigNumber('0'),
                        takerToken: '0x4444444444444444444444444444444444444444',
                        txOrigin: '0x0000000000000000000000000000000000000000',
                        verifyingContract: '0x0000000000000000000000000000000000000000',
                    }),
                    orderHash: '0x69b784087387d37e2361a40146420a5a68b08375238a5ba0329f612d5673b2ea',
                    price: new BigNumber('1800.054805'),
                    sellAmount: new BigNumber('1000000000000000000000'),
                    sellTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    type: GaslessTypes.OtcOrder,
                    liquiditySource: 'rfq',
                };
                mockGaslessSwapService.fetchQuoteAsync.mockResolvedValue(quote);

                const response = await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1800054805473,
                        takerAddress,
                        intentOnFilling: 'true',
                        skipValidation: 'true',
                    });

                expect(response.body).toStrictEqual({ ...convertBigNumbersToJson(quote), liquidityAvailable: true });
                expect(response.statusCode).toEqual(HttpStatus.OK);
            });

            it('returns an AMM quote', async () => {
                const quote: MetaTransactionV1QuoteResponse & { liquiditySource: 'amm' } = {
                    buyAmount: new BigNumber('1800054805473'),
                    buyTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    gas: new BigNumber('1043459'),
                    metaTransaction: new MetaTransaction({
                        callData:
                            '0x415565b00000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000000017b9e2a304f00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000940000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000860000000000000000000000000000000000000000000000000000000000000086000000000000000000000000000000000000000000000000000000000000007c000000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000052000000000000000000000000000000002517569636b5377617000000000000000000000000000000000000000000000000000000000000008570b55cfac18858000000000000000000000000000000000000000000000000000000039d0b9efd1000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000002517569636b53776170000000000000000000000000000000000000000000000000000000000000042b85aae7d60c42c00000000000000000000000000000000000000000000000000000001c94ebec37000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000b446f646f5632000000000000000000000000000000000000000000000000000000000000000000042b85aae7d60c42c00000000000000000000000000000000000000000000000000000001db5156c13000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000400000000000000000000000005333eb1e32522f1893b7c9fea3c263807a02d561000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000012556e69737761705633000000000000000000000000000000000000000000000000000000000000190522016f044a05b0000000000000000000000000000000000000000000000000000000b08217af9400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000060000000000000000000000000e592427a0aece92de3edee1f18e0157c058615640000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012556e697377617056330000000000000000000000000000000000000000000000000000000000000c829100b78224ef50000000000000000000000000000000000000000000000000000000570157389f000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000427ceb23fd6bc0add59e62ac25578270cff1b9f6190001f41bfd67037b42cf73acf2047067bd4f2c47d9bfd6000bb82791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f619000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd0000000000000000000000008c611defbd838a13de3a5923693c58a7c1807c6300000000000000000000000000000000000000000000005b89d96b4863067a6b',
                        chainId: 137,
                        expirationTimeSeconds: new BigNumber('9990868679'),
                        feeAmount: new BigNumber('0'),
                        feeToken: '0x0000000000000000000000000000000000000000',
                        maxGasPrice: new BigNumber('4294967296'),
                        minGasPrice: new BigNumber('1'),
                        salt: new BigNumber(
                            '32606650794224190000000000000000000000000000000000000000000000000000000000000',
                        ),
                        sender: '0x0000000000000000000000000000000000000000',
                        signer: '0x4c42a706410f1190f97d26fe3c999c90070aa40f',
                        value: new BigNumber('0'),
                        verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
                    }),
                    metaTransactionHash: '0xde5a11983edd012047dd3107532f007a73ae488bfb354f35b8a40580e2a775a1',
                    price: new BigNumber('1800.054805'),
                    sellAmount: new BigNumber('1000000000000000000000'),
                    sellTokenAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                    type: GaslessTypes.MetaTransaction,
                    liquiditySource: 'amm',
                };
                mockGaslessSwapService.fetchQuoteAsync.mockResolvedValue(quote);

                const response = await supertest(app)
                    .get(`${ZERO_G_ALIAS_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1800054805473,
                        takerAddress,
                        intentOnFilling: 'true',
                        skipValidation: 'true',
                    });

                expect(response.body).toStrictEqual({ ...convertBigNumbersToJson(quote), liquidityAvailable: true });
                expect(response.statusCode).toEqual(HttpStatus.OK);
            });
        });

        describe('tx relay v1', () => {
            it('passes calls on to Gasless Swap Service', async () => {
                mockGaslessSwapService.fetchQuoteAsync.mockResolvedValue(null);

                await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1000,
                        takerAddress,
                        priceImpactProtectionPercentage: 0.2,
                        acceptedTypes: 'metatransaction',
                        feeType: 'volume',
                        feeSellTokenPercentage: 0.1,
                        feeRecipient,
                    });

                expect(mockGaslessSwapService.fetchQuoteAsync.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      {
                        "acceptedTypes": [
                          "metatransaction",
                        ],
                        "affiliateAddress": undefined,
                        "buyAmount": "1000",
                        "buyToken": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
                        "buyTokenDecimals": 18,
                        "checkApproval": false,
                        "feeRecipient": "0x5fb321349ace5303c82f0d1d491041e042f2ad22",
                        "feeSellTokenPercentage": "0.1",
                        "feeType": "volume",
                        "integrator": {
                          "allowedChainIds": [
                            420,
                            1337,
                          ],
                          "apiKeys": [
                            "integrator-api-key",
                          ],
                          "integratorId": "integrator-id",
                          "label": "test integrator",
                          "rfqm": true,
                        },
                        "priceImpactProtectionPercentage": "0.2",
                        "sellAmount": undefined,
                        "sellToken": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                        "sellTokenDecimals": 18,
                        "slippagePercentage": undefined,
                        "takerAddress": "0x4c42a706410f1190f97d26fe3c999c90070aa40f",
                      },
                      "tx_relay",
                    ]
                `);
            });

            it('returns a meta-transaction quote', async () => {
                const quote: MetaTransactionV2QuoteResponse = {
                    buyAmount: new BigNumber('1800054805473'),
                    buyTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    trade: {
                        type: GaslessTypes.MetaTransaction,
                        hash: '0xde5a11983edd012047dd3107532f007a73ae488bfb354f35b8a40580e2a775a1',
                        eip712: MOCK_META_TRANSACTION_TRADE.eip712,
                    },
                    price: new BigNumber('1800.054805'),
                    estimatedPriceImpact: new BigNumber(10),
                    sellAmount: new BigNumber('1000000000000000000000'),
                    sellTokenAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                    sources: [
                        {
                            name: 'QuickSwap',
                            proportion: new BigNumber(0.2308),
                        },
                        {
                            name: 'DODO_V2',
                            proportion: new BigNumber(0.07692),
                        },
                        {
                            name: 'Uniswap_V3',
                            proportion: new BigNumber(0.6923),
                        },
                    ],
                    fees: {
                        integratorFee: {
                            feeType: 'volume',
                            feeToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                            feeAmount: new BigNumber(100),
                        },
                        zeroExFee: {
                            feeType: 'integrator_share',
                            feeToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                            feeAmount: new BigNumber(10),
                        },
                        gasFee: {
                            feeType: 'gas',
                            feeToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                            feeAmount: new BigNumber(1),
                        },
                    },
                };
                mockGaslessSwapService.fetchQuoteAsync.mockResolvedValue(quote);
                const response = await supertest(app)
                    .get(`${TX_RELAY_V1_PATH}/quote`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .query({
                        buyToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
                        sellToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        buyAmount: 1800054805473,
                        takerAddress,
                    });

                expect(response.body).toStrictEqual({ ...convertBigNumbersToJson(quote), liquidityAvailable: true });
                expect(response.statusCode).toEqual(HttpStatus.OK);
            });
        });
    });

    describe('processSubmitAsync', () => {
        describe('zero-g', () => {
            it('returns a metatransaction result', async () => {
                const metaTransaction = new MetaTransaction({
                    callData:
                        '0x415565b00000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000000017b9e2a304f00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000940000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000860000000000000000000000000000000000000000000000000000000000000086000000000000000000000000000000000000000000000000000000000000007c000000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000052000000000000000000000000000000002517569636b5377617000000000000000000000000000000000000000000000000000000000000008570b55cfac18858000000000000000000000000000000000000000000000000000000039d0b9efd1000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000002517569636b53776170000000000000000000000000000000000000000000000000000000000000042b85aae7d60c42c00000000000000000000000000000000000000000000000000000001c94ebec37000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000b446f646f5632000000000000000000000000000000000000000000000000000000000000000000042b85aae7d60c42c00000000000000000000000000000000000000000000000000000001db5156c13000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000400000000000000000000000005333eb1e32522f1893b7c9fea3c263807a02d561000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000012556e69737761705633000000000000000000000000000000000000000000000000000000000000190522016f044a05b0000000000000000000000000000000000000000000000000000000b08217af9400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000060000000000000000000000000e592427a0aece92de3edee1f18e0157c058615640000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012556e697377617056330000000000000000000000000000000000000000000000000000000000000c829100b78224ef50000000000000000000000000000000000000000000000000000000570157389f000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000427ceb23fd6bc0add59e62ac25578270cff1b9f6190001f41bfd67037b42cf73acf2047067bd4f2c47d9bfd6000bb82791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f619000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd0000000000000000000000008c611defbd838a13de3a5923693c58a7c1807c6300000000000000000000000000000000000000000000005b89d96b4863067a6b',
                    chainId: 137,
                    expirationTimeSeconds: new BigNumber('9990868679'),
                    feeAmount: new BigNumber('0'),
                    feeToken: '0x0000000000000000000000000000000000000000',
                    maxGasPrice: new BigNumber('4294967296'),
                    minGasPrice: new BigNumber('1'),
                    salt: new BigNumber(
                        '32606650794224190000000000000000000000000000000000000000000000000000000000000',
                    ),
                    sender: '0x0000000000000000000000000000000000000000',
                    signer: '0x4c42a706410f1190f97d26fe3c999c90070aa40f',
                    value: new BigNumber('0'),
                    verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
                });
                const submitResult: SubmitMetaTransactionSignedQuoteResponse = {
                    metaTransactionHash: '0xde5a11983edd012047dd3107532f007a73ae488bfb354f35b8a40580e2a775a1',
                    type: GaslessTypes.MetaTransaction,
                };

                mockGaslessSwapService.processSubmitAsync.mockResolvedValue(submitResult);

                const response = await supertest(app)
                    .post(`${ZERO_G_ALIAS_PATH}/submit`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .send({
                        kind: GaslessTypes.MetaTransaction,
                        trade: {
                            metaTransaction,
                            type: GaslessTypes.MetaTransaction,
                            signature: ethSignHashWithKey(metaTransaction.getHash(), takerPrivateKey),
                        },
                    });

                expect(mockGaslessSwapService.processSubmitAsync.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      {
                        "kind": "metatransaction",
                        "trade": {
                          "metaTransaction": MetaTransaction {
                            "callData": "0x415565b00000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000000017b9e2a304f00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000940000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000860000000000000000000000000000000000000000000000000000000000000086000000000000000000000000000000000000000000000000000000000000007c000000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000052000000000000000000000000000000002517569636b5377617000000000000000000000000000000000000000000000000000000000000008570b55cfac18858000000000000000000000000000000000000000000000000000000039d0b9efd1000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000002517569636b53776170000000000000000000000000000000000000000000000000000000000000042b85aae7d60c42c00000000000000000000000000000000000000000000000000000001c94ebec37000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000b446f646f5632000000000000000000000000000000000000000000000000000000000000000000042b85aae7d60c42c00000000000000000000000000000000000000000000000000000001db5156c13000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000400000000000000000000000005333eb1e32522f1893b7c9fea3c263807a02d561000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000012556e69737761705633000000000000000000000000000000000000000000000000000000000000190522016f044a05b0000000000000000000000000000000000000000000000000000000b08217af9400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000060000000000000000000000000e592427a0aece92de3edee1f18e0157c058615640000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012556e697377617056330000000000000000000000000000000000000000000000000000000000000c829100b78224ef50000000000000000000000000000000000000000000000000000000570157389f000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000427ceb23fd6bc0add59e62ac25578270cff1b9f6190001f41bfd67037b42cf73acf2047067bd4f2c47d9bfd6000bb82791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f619000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd0000000000000000000000008c611defbd838a13de3a5923693c58a7c1807c6300000000000000000000000000000000000000000000005b89d96b4863067a6b",
                            "chainId": 137,
                            "expirationTimeSeconds": "9990868679",
                            "feeAmount": "0",
                            "feeToken": "0x0000000000000000000000000000000000000000",
                            "maxGasPrice": "4294967296",
                            "minGasPrice": "1",
                            "salt": "32606650794224190000000000000000000000000000000000000000000000000000000000000",
                            "sender": "0x0000000000000000000000000000000000000000",
                            "signer": "0x4c42a706410f1190f97d26fe3c999c90070aa40f",
                            "value": "0",
                            "verifyingContract": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                          },
                          "signature": {
                            "r": "0x7247ed156081c767781834b122d4e9317f3cc2d5ed529cb74aaaa11d8b5a93f8",
                            "s": "0x19a0b795609483b9fcbc42b574e4401401308b4c24347b0bda8a2cf2332efd78",
                            "signatureType": 3,
                            "v": 28,
                          },
                          "type": "metatransaction",
                        },
                      },
                      "integrator-id",
                    ]
                `);
                expect(response.statusCode).toEqual(HttpStatus.CREATED);
                expect(response.body).toEqual(submitResult);
            });
        });

        describe('tx relay v1', () => {
            it('returns a metatransaction result', async () => {
                const submitResult: SubmitMetaTransactionV2SignedQuoteResponse = {
                    tradeHash: MOCK_META_TRANSACTION_TRADE.trade.getHash(),
                    type: GaslessTypes.MetaTransactionV2,
                };

                mockGaslessSwapService.processSubmitAsync.mockResolvedValue(submitResult);

                const response = await supertest(app)
                    .post(`${TX_RELAY_V1_PATH}/submit`)
                    .set('Content-type', 'application/json')
                    .set('0x-api-key', 'integrator-api-key')
                    .set('0x-chain-id', '1337')
                    .send({
                        trade: {
                            eip712: MOCK_META_TRANSACTION_TRADE.eip712,
                            type: GaslessTypes.MetaTransaction,
                            signature: ethSignHashWithKey(MOCK_META_TRANSACTION_TRADE.trade.getHash(), takerPrivateKey),
                        },
                    });

                expect(mockGaslessSwapService.processSubmitAsync.mock.calls[0]).toMatchInlineSnapshot(`
                    [
                      {
                        "kind": "metatransaction",
                        "trade": {
                          "signature": {
                            "r": "0x9ed53353434ba81d32abd013352770fc99c49be7262c31781f294bc0dc33a353",
                            "s": "0x1052fbf1a355758755df27ace672116c1e4808c35232c5da22fbf06a95b99fc0",
                            "signatureType": 3,
                            "v": 28,
                          },
                          "trade": MetaTransaction {
                            "callData": "0x415565b00000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000000017b9e2a304f00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000940000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000860000000000000000000000000000000000000000000000000000000000000086000000000000000000000000000000000000000000000000000000000000007c000000000000000000000000000000000000000000000003635c9adc5dea000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000500000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000000000000003400000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000000000000000000000000000052000000000000000000000000000000002517569636b5377617000000000000000000000000000000000000000000000000000000000000008570b55cfac18858000000000000000000000000000000000000000000000000000000039d0b9efd1000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000000000002517569636b53776170000000000000000000000000000000000000000000000000000000000000042b85aae7d60c42c00000000000000000000000000000000000000000000000000000001c94ebec37000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000a5e0829caced8ffdd4de3c43696c57f7d7a678ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000030000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000b446f646f5632000000000000000000000000000000000000000000000000000000000000000000042b85aae7d60c42c00000000000000000000000000000000000000000000000000000001db5156c13000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000400000000000000000000000005333eb1e32522f1893b7c9fea3c263807a02d561000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000012556e69737761705633000000000000000000000000000000000000000000000000000000000000190522016f044a05b0000000000000000000000000000000000000000000000000000000b08217af9400000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000060000000000000000000000000e592427a0aece92de3edee1f18e0157c058615640000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012556e697377617056330000000000000000000000000000000000000000000000000000000000000c829100b78224ef50000000000000000000000000000000000000000000000000000000570157389f000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000427ceb23fd6bc0add59e62ac25578270cff1b9f6190001f41bfd67037b42cf73acf2047067bd4f2c47d9bfd6000bb82791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f619000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000000869584cd0000000000000000000000008c611defbd838a13de3a5923693c58a7c1807c6300000000000000000000000000000000000000000000005b89d96b4863067a6b",
                            "chainId": 1337,
                            "expirationTimeSeconds": "9990868679",
                            "feeAmount": "0",
                            "feeToken": "0x0000000000000000000000000000000000000000",
                            "maxGasPrice": "4294967296",
                            "minGasPrice": "1",
                            "salt": "32606650794224190000000000000000000000000000000000000000000000000000000000000",
                            "sender": "0x0000000000000000000000000000000000000000",
                            "signer": "0x4c42a706410f1190f97d26fe3c999c90070aa40f",
                            "value": "0",
                            "verifyingContract": "0x5315e44798395d4a952530d131249fe00f554565",
                          },
                          "type": "metatransaction",
                        },
                      },
                      "integrator-id",
                    ]
                `);
                expect(response.statusCode).toEqual(HttpStatus.CREATED);
                expect(response.body).toEqual(submitResult);
            });
        });
    });
});

/**
 * Deeply transforms object keys from BigNumber to JSON
 */
// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertBigNumbersToJson(x: Record<string, any>): Record<string, any> {
    return mapValues(x, (v) => {
        if (v instanceof BigNumber) {
            return v.toJSON();
        }
        if (v instanceof Array) {
            const jsonArray = [];
            for (const item of v) {
                jsonArray.push(convertBigNumbersToJson(item));
            }
            return jsonArray;
        }
        if (v instanceof Object) {
            return convertBigNumbersToJson(v);
        }
        return v;
    });
}
