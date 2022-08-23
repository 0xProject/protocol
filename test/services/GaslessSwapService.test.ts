import { AssetSwapperContractAddresses as ContractAddresses } from '@0x/asset-swapper';
import { MetaTransaction } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { Producer } from 'sqs-producer';

import { Integrator } from '../../src/config';
import { GaslessSwapService } from '../../src/services/GaslessSwapService';
import { RfqmFeeService } from '../../src/services/rfqm_fee_service';
import { RfqmService } from '../../src/services/rfqm_service';
import { RfqMakerBalanceCacheService } from '../../src/services/rfq_maker_balance_cache_service';
import { FetchIndicativeQuoteResponse } from '../../src/services/types';
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
                fetchIndicativeQuoteAsync: jest.fn(),
            };
        }),
    };
});

jest.mock('../../src/utils/MetaTransactionClient', () => {
    return {
        getQuoteAsync: jest.fn(),
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

describe('GaslessSwapService', () => {
    describe('fetchPriceAsync', () => {
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
        const quote: FetchIndicativeQuoteResponse = {
            buyAmount: new BigNumber(1800054805473),
            sellAmount: new BigNumber(1000000000000000000000),
            buyTokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            sellTokenAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
            gas: new BigNumber(1043459),
            price: new BigNumber(1800.054805),
        };

        it('gets an RFQ price if both RFQ and AMM available', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce({ metaTransaction, quote });
            mockRfqmService.fetchIndicativeQuoteAsync = jest.fn().mockResolvedValueOnce(quote);

            const gaslessSwapServce = new GaslessSwapService(
                mockRfqmService,
                new URL('https://hokiesports.com/quote'),
                {} as AxiosInstance,
            );

            const result = await gaslessSwapServce.fetchPriceAsync({
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
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce({ metaTransaction, quote });
            mockRfqmService.fetchIndicativeQuoteAsync = jest.fn().mockResolvedValueOnce(null);

            const gaslessSwapServce = new GaslessSwapService(
                mockRfqmService,
                new URL('https://hokiesports.com/quote'),
                {} as AxiosInstance,
            );

            const result = await gaslessSwapServce.fetchPriceAsync({
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

        it('returns `null` if no liquidty is available', async () => {
            getMetaTransactionQuoteAsyncMock.mockResolvedValueOnce(null);
            mockRfqmService.fetchIndicativeQuoteAsync = jest.fn().mockResolvedValueOnce(null);

            const gaslessSwapServce = new GaslessSwapService(
                mockRfqmService,
                new URL('https://hokiesports.com/quote'),
                {} as AxiosInstance,
            );

            const result = await gaslessSwapServce.fetchPriceAsync({
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

            const gaslessSwapServce = new GaslessSwapService(
                mockRfqmService,
                new URL('https://hokiesports.com/quote'),
                {} as AxiosInstance,
            );

            await expect(() =>
                gaslessSwapServce.fetchPriceAsync({
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
});
