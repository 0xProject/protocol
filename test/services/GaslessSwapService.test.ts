import { AssetSwapperContractAddresses as ContractAddresses } from '@0x/asset-swapper';
import { MetaTransaction, OtcOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import * as redis from 'redis';
import { Producer } from 'sqs-producer';

import { Integrator } from '../../src/config';
import { ZERO } from '../../src/constants';
import { GaslessSwapService } from '../../src/services/GaslessSwapService';
import { RfqmFeeService } from '../../src/services/rfqm_fee_service';
import { RfqmService } from '../../src/services/rfqm_service';
import { RfqMakerBalanceCacheService } from '../../src/services/rfq_maker_balance_cache_service';
import {
    ApprovalResponse,
    FetchIndicativeQuoteResponse,
    OtcOrderRfqmQuoteResponse,
    RfqmTypes,
} from '../../src/services/types';
import { CacheClient } from '../../src/utils/cache_client';
import { getQuoteAsync } from '../../src/utils/MetaTransactionClient';
import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { RfqmDbUtils } from '../../src/utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { RfqMakerManager } from '../../src/utils/rfq_maker_manager';

jest.mock('../../src/services/rfqm_service', () => {
    return {
        RfqmService: jest.fn().mockImplementation(() => {
            return {
                fetchFirmQuoteAsync: jest.fn(),
                fetchIndicativeQuoteAsync: jest.fn(),
                getGaslessApprovalResponseAsync: jest.fn(),
            };
        }),
    };
});

jest.mock('../../src/utils/MetaTransactionClient', () => {
    return {
        getQuoteAsync: jest.fn(),
    };
});

jest.mock('redis', () => {
    return {
        createClient: jest.fn().mockImplementation(() => {
            return {
                set: jest.fn(),
            };
        }),
    };
});

const getMetaTransactionQuoteAsyncMock = getQuoteAsync as jest.Mock<
    ReturnType<typeof getQuoteAsync>,
    Parameters<typeof getQuoteAsync>
>;

// tslint:disable: no-object-literal-type-assertion
const mockRfqmService = jest.mocked(
    new RfqmService(
        0,
        {} as RfqmFeeService,
        0,
        {} as ContractAddresses,
        '0x0',
        {} as RfqBlockchainUtils,
        {} as RfqmDbUtils,
        {} as Producer,
        {} as QuoteServerClient,
        0,
        {} as CacheClient,
        {} as RfqMakerBalanceCacheService,
        {} as RfqMakerManager,
        0,
    ),
);

const mockRedisClient: redis.RedisClientType = redis.createClient();

const gaslessSwapService = new GaslessSwapService(
    mockRfqmService,
    new URL('https://hokiesports.com/quote'),
    {} as AxiosInstance,
    mockRedisClient,
);

describe('GaslessSwapService', () => {
    const metaTransaction = new MetaTransaction({
        callData: '0x415565b',
        chainId: 137,
        verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
        expirationTimeSeconds: new BigNumber('1660868679'),
        feeAmount: new BigNumber(0),
        feeToken: '0x0000000000000000000000000000000000000000',
        maxGasPrice: new BigNumber(4294967296),
        minGasPrice: new BigNumber(1),
        salt: new BigNumber(32606650794224189614795510724011106220035660490560169776986607186708081701146),
        sender: '0x0000000000000000000000000000000000000000',
        signer: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        value: new BigNumber(0),
    });
    const price: FetchIndicativeQuoteResponse = {
        buyAmount: new BigNumber(1800054805473),
        sellAmount: new BigNumber(1000000000000000000000),
        buyTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        sellTokenAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        gas: new BigNumber(1043459),
        price: new BigNumber(1800.054805),
    };
    const expiry = new BigNumber(9999999999999999); // tslint:disable-line custom-no-magic-numbers
    const otcOrder = new OtcOrder({
        txOrigin: '0x0000000000000000000000000000000000000000',
        taker: '0x1111111111111111111111111111111111111111',
        maker: '0x2222222222222222222222222222222222222222',
        makerToken: '0x3333333333333333333333333333333333333333',
        takerToken: '0x4444444444444444444444444444444444444444',
        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
        chainId: 1337,
        verifyingContract: '0x0000000000000000000000000000000000000000',
    });
    const otcQuote: OtcOrderRfqmQuoteResponse = {
        buyAmount: new BigNumber(1800054805473),
        sellAmount: new BigNumber(1000000000000000000000),
        buyTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        sellTokenAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        gas: new BigNumber(1043459),
        price: new BigNumber(1800.054805),
        type: RfqmTypes.OtcOrder,
        order: otcOrder,
        orderHash: otcOrder.getHash(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchPriceAsync', () => {
        it('gets an RFQ price if both RFQ and AMM available', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce({ metaTransaction, price });
            mockRfqmService.fetchIndicativeQuoteAsync = jest.fn().mockResolvedValueOnce(price);

            const result = await gaslessSwapService.fetchPriceAsync({
                buyAmount: new BigNumber(1800054805473),
                buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                buyTokenDecimals: 6,
                integrator: {} as Integrator,
                sellToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                sellTokenDecimals: 18,
            });

            expect(result?.source).toEqual('rfq');
            expect(result).toMatchInlineSnapshot(`
                Object {
                  "buyAmount": "1800054805473",
                  "buyTokenAddress": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                  "gas": "1043459",
                  "price": "1800.054805",
                  "sellAmount": "1000000000000000000000",
                  "sellTokenAddress": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                  "source": "rfq",
                }
            `);
        });

        it('gets an AMM price if no RFQ liquidity is available', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce({ metaTransaction, price });
            mockRfqmService.fetchIndicativeQuoteAsync = jest.fn().mockResolvedValueOnce(null);

            const result = await gaslessSwapService.fetchPriceAsync({
                buyAmount: new BigNumber(1800054805473),
                buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                buyTokenDecimals: 6,
                integrator: {} as Integrator,
                sellToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                sellTokenDecimals: 18,
            });

            expect(result?.source).toEqual('amm');
            expect(result).toMatchInlineSnapshot(`
                Object {
                  "buyAmount": "1800054805473",
                  "buyTokenAddress": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                  "gas": "1043459",
                  "price": "1800.054805",
                  "sellAmount": "1000000000000000000000",
                  "sellTokenAddress": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                  "source": "amm",
                }
            `);
        });

        it('returns `null` if no liquidity is available', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce(null);
            mockRfqmService.fetchIndicativeQuoteAsync = jest.fn().mockResolvedValueOnce(null);

            const result = await gaslessSwapService.fetchPriceAsync({
                buyAmount: new BigNumber(1800054805473),
                buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                buyTokenDecimals: 6,
                integrator: {} as Integrator,
                sellToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                sellTokenDecimals: 18,
            });

            expect(result).toBeNull();
        });

        it('throws if a quote service fetch throws', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce(null);
            mockRfqmService.fetchIndicativeQuoteAsync = jest.fn().mockImplementationOnce(() => {
                throw new Error('rfqm quote threw up');
            });

            await expect(() =>
                gaslessSwapService.fetchPriceAsync({
                    buyAmount: new BigNumber(1800054805473),
                    buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                    buyTokenDecimals: 6,
                    integrator: {} as Integrator,
                    sellToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                    sellTokenDecimals: 18,
                }),
            ).rejects.toThrow('threw up');
        });
    });
    describe('fetchQuoteAsync', () => {
        it('fetches an RFQ quote', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce({ metaTransaction, price });
            mockRfqmService.fetchFirmQuoteAsync = jest.fn().mockResolvedValueOnce(otcQuote);

            const result = await gaslessSwapService.fetchQuoteAsync({
                buyAmount: new BigNumber(1800054805473),
                buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                buyTokenDecimals: 6,
                integrator: {} as Integrator,
                sellToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                sellTokenDecimals: 18,
                takerAddress: '0xtaker',
                checkApproval: false,
            });

            expect(result).not.toBeNull();
            expect(result?.type).toEqual(RfqmTypes.OtcOrder);
            expect(result).toMatchInlineSnapshot(`
                Object {
                  "buyAmount": "1800054805473",
                  "buyTokenAddress": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                  "gas": "1043459",
                  "order": OtcOrder {
                    "chainId": 1337,
                    "expiry": "10000000000000000",
                    "expiryAndNonce": "62771017353866807638357894232076664161023554444640345128970000000000000000",
                    "maker": "0x2222222222222222222222222222222222222222",
                    "makerAmount": "0",
                    "makerToken": "0x3333333333333333333333333333333333333333",
                    "nonce": "10000000000000000",
                    "nonceBucket": "0",
                    "taker": "0x1111111111111111111111111111111111111111",
                    "takerAmount": "0",
                    "takerToken": "0x4444444444444444444444444444444444444444",
                    "txOrigin": "0x0000000000000000000000000000000000000000",
                    "verifyingContract": "0x0000000000000000000000000000000000000000",
                  },
                  "orderHash": "0x69b784087387d37e2361a40146420a5a68b08375238a5ba0329f612d5673b2ea",
                  "price": "1800.054805",
                  "sellAmount": "1000000000000000000000",
                  "sellTokenAddress": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                  "type": "otc",
                }
            `);
        });

        it('fetches an AMM quote', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce({ metaTransaction, price });
            mockRfqmService.fetchFirmQuoteAsync = jest.fn().mockResolvedValueOnce(null);

            const result = await gaslessSwapService.fetchQuoteAsync({
                buyAmount: new BigNumber(1800054805473),
                buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                buyTokenDecimals: 6,
                integrator: {} as Integrator,
                sellToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                sellTokenDecimals: 18,
                takerAddress: '0xtaker',
                checkApproval: false,
            });

            expect(result).not.toBeNull();
            expect(result?.type).toEqual(RfqmTypes.MetaTransaction);
            if (result?.type !== RfqmTypes.MetaTransaction) {
                // Refine type for further assertions
                throw new Error('Result should be a meta transaction');
            }
            expect(result.metaTransaction.getHash()).toEqual(metaTransaction.getHash());
            expect(result).toMatchInlineSnapshot(`
                Object {
                  "approval": undefined,
                  "buyAmount": "1800054805473",
                  "buyTokenAddress": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                  "gas": "1043459",
                  "metaTransaction": MetaTransaction {
                    "callData": "0x415565b",
                    "chainId": 137,
                    "expirationTimeSeconds": "1660868679",
                    "feeAmount": "0",
                    "feeToken": "0x0000000000000000000000000000000000000000",
                    "maxGasPrice": "4294967296",
                    "minGasPrice": "1",
                    "salt": "32606650794224190000000000000000000000000000000000000000000000000000000000000",
                    "sender": "0x0000000000000000000000000000000000000000",
                    "signer": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
                    "value": "0",
                    "verifyingContract": "0xdef1c0ded9bec7f1a1670819833240f027b25eff",
                  },
                  "metaTransactionHash": "0x67959c62c5909706495b0f44519c7ab539710da1fa55e3f908fbde35da180e02",
                  "price": "1800.054805",
                  "sellAmount": "1000000000000000000000",
                  "sellTokenAddress": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                  "type": "metatransaction",
                }
            `);
        });

        it('stores a metatransaction hash', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce({ metaTransaction, price });
            mockRfqmService.fetchFirmQuoteAsync = jest.fn().mockResolvedValueOnce(null);

            await gaslessSwapService.fetchQuoteAsync({
                buyAmount: new BigNumber(1800054805473),
                buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                buyTokenDecimals: 6,
                integrator: {} as Integrator,
                sellToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                sellTokenDecimals: 18,
                takerAddress: '0xtaker',
                checkApproval: false,
            });

            expect(mockRedisClient.set).toBeCalledWith(`metaTransactionHash.${metaTransaction.getHash()}`, 0, {
                EX: 900,
            });
        });

        it('gets the approval object', async () => {
            const approvalResponse: ApprovalResponse = {
                isRequired: true,
            };
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce({ metaTransaction, price });
            mockRfqmService.fetchFirmQuoteAsync = jest.fn().mockResolvedValueOnce(null);
            mockRfqmService.getGaslessApprovalResponseAsync = jest.fn().mockResolvedValueOnce(approvalResponse);

            const result = await gaslessSwapService.fetchQuoteAsync({
                buyAmount: new BigNumber(1800054805473),
                buyToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                buyTokenDecimals: 6,
                integrator: {} as Integrator,
                sellToken: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
                sellTokenDecimals: 18,
                takerAddress: '0xtaker',
                checkApproval: true,
            });

            expect(result?.approval).not.toBeUndefined();
        });
    });
});
