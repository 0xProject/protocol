// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { TooManyRequestsError } from '@0x/api-utils';
import {
    FillQuoteTransformerOrderType,
    ProtocolFeeUtils,
    QuoteRequestor,
    SignatureType,
    SignedNativeOrder,
} from '@0x/asset-swapper';
import { ONE_SECOND_MS } from '@0x/asset-swapper/lib/src/utils/market_operation_utils/constants';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { expect } from '@0x/contracts-test-utils';
import { MetaTransaction, RfqOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { Producer } from 'sqs-producer';
import { anything, instance, mock, when } from 'ts-mockito';

import { Integrator } from '../../src/config';
import { ETH_DECIMALS, ONE_MINUTE_MS } from '../../src/constants';
import { RfqmJobEntity, RfqmTransactionSubmissionEntity } from '../../src/entities';
import { RfqmJobStatus, RfqmOrderTypes } from '../../src/entities/RfqmJobEntity';
import { RfqmTransactionSubmissionStatus } from '../../src/entities/RfqmTransactionSubmissionEntity';
import { MetaTransactionSubmitRfqmSignedQuoteResponse, RfqmService, RfqmTypes } from '../../src/services/rfqm_service';
import { CacheClient } from '../../src/utils/cache_client';
import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { RfqmDbUtils } from '../../src/utils/rfqm_db_utils';
import { HealthCheckStatus } from '../../src/utils/rfqm_health_check';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';

const NEVER_EXPIRES = new BigNumber(9999999999999999);
const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';
const MOCK_GAS_PRICE = new BigNumber(100);
const MOCK_MAKER_URI = 'http://localhost:3333';
const TEST_RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS = 500;
const WORKER_FULL_BALANCE_WEI = new BigNumber(1).shiftedBy(ETH_DECIMALS);
const MOCK_INTEGRATOR: Integrator = {
    apiKeys: ['an-integrator-id'],
    integratorId: 'an-integrator-id',
    label: 'Test',
    plp: false,
    rfqm: true,
    rfqt: true,
};

const buildRfqmServiceForUnitTest = (
    overrides: {
        quoteRequestor?: QuoteRequestor;
        protocolFeeUtils?: ProtocolFeeUtils;
        rfqBlockchainUtils?: RfqBlockchainUtils;
        dbUtils?: RfqmDbUtils;
        producer?: Producer;
        quoteServerClient?: QuoteServerClient;
        cacheClient?: CacheClient;
    } = {},
): RfqmService => {
    const contractAddresses = getContractAddressesForChainOrThrow(1);
    const quoteRequestorMock = mock(QuoteRequestor);
    when(
        quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
            anything(),
        ),
    ).thenResolve([
        {
            makerToken: contractAddresses.zrxToken,
            makerAmount: new BigNumber(101),
            takerToken: contractAddresses.etherToken,
            takerAmount: new BigNumber(100),
            expiry: NEVER_EXPIRES,
            makerUri: MOCK_MAKER_URI,
        },
    ]);

    const quoteRequestorInstance = instance(quoteRequestorMock);
    const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
    when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(MOCK_GAS_PRICE);
    const protocolFeeUtilsInstance = instance(protocolFeeUtilsMock);
    const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
    when(rfqBlockchainUtilsMock.getAccountBalanceAsync(MOCK_WORKER_REGISTRY_ADDRESS)).thenResolve(
        WORKER_FULL_BALANCE_WEI,
    );
    const dbUtilsMock = mock(RfqmDbUtils);
    const sqsMock = mock(Producer);
    when(sqsMock.queueSize()).thenResolve(0);
    const quoteServerClientMock = mock(QuoteServerClient);

    const cacheClientMock = mock(CacheClient);

    return new RfqmService(
        overrides.quoteRequestor || quoteRequestorInstance,
        overrides.protocolFeeUtils || protocolFeeUtilsInstance,
        contractAddresses,
        MOCK_WORKER_REGISTRY_ADDRESS,
        overrides.rfqBlockchainUtils || instance(rfqBlockchainUtilsMock),
        overrides.dbUtils || dbUtilsMock,
        overrides.producer || sqsMock,
        overrides.quoteServerClient || quoteServerClientMock,
        TEST_RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS,
        overrides.cacheClient || cacheClientMock,
    );
};

describe('RfqmService', () => {
    it('should validate jobs and mark them as expired', () => {
        const in_five_minutes = Math.floor(Date.now() / ONE_SECOND_MS + 360).toString();
        const one_minute_ago = Math.floor(Date.now() / ONE_SECOND_MS - 60).toString();
        const partialOrder = {
            chainId: '1',
            maker: '',
            makerAmount: '',
            taker: '',
            takerAmount: '',
            makerToken: '',
            pool: '',
            salt: '',
            takerToken: '',
            txOrigin: '',
            verifyingContract: '',
        };
        const partialJob = {
            chainId: 1,
            affiliateAddress: '',
            createdAt: new Date(),
            expiry: new BigNumber(in_five_minutes),
            integratorId: '',
            isCompleted: false,
            lastLookResult: null,
            metadata: null,
            status: RfqmJobStatus.PendingEnqueued,
            updatedAt: new Date(),
            workerAddress: '',
            orderHash: '',
            metaTransactionHash: '',
            calldata: '0x000',
            makerUri: 'http://foo.bar',
        };

        // First test, order not expired
        let response = RfqmService.validateJob({
            ...partialJob,
            fee: {
                type: 'fixed',
                amount: '0',
                token: '',
            },
            order: {
                type: RfqmOrderTypes.V4Rfq,
                order: {
                    ...partialOrder,
                    expiry: in_five_minutes,
                },
            },
        });
        expect(response).to.eql(null);

        response = RfqmService.validateJob({
            ...partialJob,
            fee: {
                type: 'fixed',
                amount: '0',
                token: '',
            },
            order: {
                type: RfqmOrderTypes.V4Rfq,
                order: {
                    ...partialOrder,
                    expiry: one_minute_ago,
                },
            },
        });
        expect(response).to.eql(RfqmJobStatus.FailedExpired);
    });

    describe('submitMetaTransactionSignedQuoteAsync', () => {
        it('should fail if there is already a pending trade for the taker and taker token', async () => {
            const existingOrder = {
                chainId: '1',
                expiry: NEVER_EXPIRES.toString(),
                maker: '',
                makerAmount: '',
                makerToken: '',
                pool: '',
                salt: '',
                taker: '0xtaker',
                takerAmount: '',
                takerToken: '0xtakertoken',
                txOrigin: '',
                verifyingContract: '',
            };
            const existingJob: RfqmJobEntity = {
                affiliateAddress: '',
                calldata: '0x000',
                chainId: 1,
                createdAt: new Date(),
                expiry: NEVER_EXPIRES,
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                isCompleted: false,
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                metadata: null,
                metaTransactionHash: '',
                order: {
                    order: existingOrder,
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            };

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobsWithStatusesAsync(anything())).thenResolve([existingJob]);
            when(dbUtilsMock.findQuoteByMetaTransactionHashAsync('0xmetatransactionhash')).thenResolve({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                makerUri: 'http://foo.bar',
                metaTransactionHash: '0xmetatransactionhash',
                order: {
                    order: existingOrder,
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '',
            });
            const metatransactionMock = mock(MetaTransaction);
            when(metatransactionMock.getHash()).thenReturn('0xmetatransactionhash');
            when(metatransactionMock.expirationTimeSeconds).thenReturn(NEVER_EXPIRES);
            const dbUtils = instance(dbUtilsMock);

            const service = buildRfqmServiceForUnitTest({
                dbUtils,
            });

            expect(
                service.submitMetaTransactionSignedQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    metaTransaction: instance(metatransactionMock),
                    signature: {
                        r: '',
                        s: '',
                        signatureType: SignatureType.EthSign,
                        v: 1,
                    },
                    type: RfqmTypes.MetaTransaction,
                }),
            ).to.be.rejectedWith(TooManyRequestsError, 'a pending trade for this taker and takertoken already exists'); // tslint:disable-line no-unused-expression
        });

        it('should allow two trades by the same taker with different taker tokens', async () => {
            const existingOrder = {
                chainId: '1',
                expiry: NEVER_EXPIRES.toString(),
                maker: '',
                makerAmount: '',
                makerToken: '',
                pool: '',
                salt: '',
                taker: '0xtaker',
                takerAmount: '',
                takerToken: '0xtakertoken1',
                txOrigin: '',
                verifyingContract: '',
            };
            const existingJob: RfqmJobEntity = {
                affiliateAddress: '',
                calldata: '0x000',
                chainId: 1,
                createdAt: new Date(),
                expiry: NEVER_EXPIRES,
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                isCompleted: false,
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                metadata: null,
                metaTransactionHash: '',
                order: {
                    order: existingOrder,
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            };

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobsWithStatusesAsync(anything())).thenResolve([existingJob]);
            when(dbUtilsMock.findQuoteByMetaTransactionHashAsync('0xmetatransactionhash')).thenResolve({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                makerUri: 'http://foo.bar',
                metaTransactionHash: '0xmetatransactionhash',
                order: {
                    order: { ...existingOrder, takerToken: '0xtakertoken2' },
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '',
            });
            const metatransactionMock = mock(MetaTransaction);
            when(metatransactionMock.getHash()).thenReturn('0xmetatransactionhash');
            when(metatransactionMock.expirationTimeSeconds).thenReturn(NEVER_EXPIRES);
            const dbUtils = instance(dbUtilsMock);

            const service = buildRfqmServiceForUnitTest({
                dbUtils,
            });

            expect(
                service.submitMetaTransactionSignedQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    metaTransaction: instance(metatransactionMock),
                    signature: {
                        r: '',
                        s: '',
                        signatureType: SignatureType.EthSign,
                        v: 1,
                    },
                    type: RfqmTypes.MetaTransaction,
                }),
            ).to.eventually.satisfy((t: MetaTransactionSubmitRfqmSignedQuoteResponse) => t.type === 'metatransaction'); // tslint:disable-line no-unused-expression
        });
    });

    describe('fetchIndicativeQuoteAsync', () => {
        describe('sells', async () => {
            it('should fetch indicative quote', async () => {
                // Given
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const service = buildRfqmServiceForUnitTest();

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(1.01);
            });

            it('should round price to six decimal places', async () => {
                // Given
                const contractAddresses = getContractAddressesForChainOrThrow(1);

                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        makerToken: contractAddresses.zrxToken,
                        makerAmount: new BigNumber(111),
                        takerToken: contractAddresses.etherToken,
                        takerAmount: new BigNumber(333),
                        expiry: NEVER_EXPIRES,
                        makerUri: MOCK_MAKER_URI,
                    },
                ]);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                });

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(333),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }

                expect(res.price.toNumber()).to.equal(0.3333333);
            });

            it('should only return an indicative quote that is 100% filled when selling', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const partialFillQuote = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(55),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(50),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const fullQuote = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(105),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([partialFillQuote, fullQuote]);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                });

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.05);
            });

            it('should return null if no quotes are valid', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const partialFillQuote = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(55),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(50),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([partialFillQuote]);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                });

                // Expect
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });
                expect(res).to.eq(null);
            });

            it('should return an indicative quote that can fill more than 100%', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const worsePricing = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const betterPricing = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(222),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(200),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([worsePricing, betterPricing]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                });

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(200);
                expect(res.price.toNumber()).to.equal(1.11);
            });

            it('should ignore quotes that are for the wrong pair', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const worsePricing = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const wrongPair = {
                    makerToken: '0x1111111111111111111111111111111111111111',
                    makerAmount: new BigNumber(111),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([worsePricing, wrongPair]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                });

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.01); // Worse pricing wins because better pricing is for wrong pair
            });

            it('should ignore quotes that expire within 3 minutes', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const inOneMinute = (Date.now() + ONE_MINUTE_MS) / ONE_SECOND_MS;
                const expiresSoon = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(111),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: new BigNumber(inOneMinute),
                    makerUri: MOCK_MAKER_URI,
                };
                const expiresNever = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([expiresSoon, expiresNever]);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                });

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.01); // Worse pricing wins because better pricing expires too soon
            });
        });

        describe('buys', async () => {
            it('should fetch indicative quote when buying', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        makerToken: contractAddresses.zrxToken,
                        makerAmount: new BigNumber(125),
                        takerToken: contractAddresses.etherToken,
                        takerAmount: new BigNumber(100),
                        expiry: NEVER_EXPIRES,
                        makerUri: MOCK_MAKER_URI,
                    },
                ]);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                });

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.buyAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(0.8);
            });

            it('should only return an indicative quote that is 100% filled when buying', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const partialFillQuoteBadPricing = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(80),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const partialFillQuoteGoodPricing = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(80),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(40),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const fullQuote = {
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(125),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MAKER_URI,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([partialFillQuoteBadPricing, partialFillQuoteGoodPricing, fullQuote]);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                });

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.buyAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(0.8);
            });
        });
    });

    describe('fetchFirmQuoteAsync', () => {
        const takerAddress = '0xf003A9418DE2620f935181259C0Fa1595E871234';
        const EMPTY_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const INVALID_SIGNATURE = {
            signatureType: SignatureType.Invalid,
            v: 1,
            r: EMPTY_BYTES32,
            s: EMPTY_BYTES32,
        };
        const MOCK_META_TX = new MetaTransaction();

        describe('sells', () => {
            const sellAmount = new BigNumber(100);
            it('should fetch a firm quote', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const makerUri = 'https://rfqm.somemaker.xyz';
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmFirmQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        order: new RfqOrder({
                            chainId: 1337,
                            makerToken: contractAddresses.zrxToken,
                            makerAmount: new BigNumber(101),
                            takerToken: contractAddresses.etherToken,
                            takerAmount: new BigNumber(100),
                            expiry: NEVER_EXPIRES,
                        }),
                        type: FillQuoteTransformerOrderType.Rfq,
                        signature: INVALID_SIGNATURE,
                    },
                ]);
                when(quoteRequestorMock.getMakerUriForSignature(anything())).thenReturn(makerUri);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                // Mock out the blockchain utils
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                when(
                    rfqBlockchainUtilsMock.generateMetaTransaction(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenReturn(MOCK_META_TX);
                const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeRfqmQuoteToDbAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                    rfqBlockchainUtils,
                    dbUtils,
                });

                // When
                const res = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount,
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount).to.eq(sellAmount);
                expect(res.price.toNumber()).to.equal(1.01);
                expect(res.metaTransactionHash).to.match(/^0x[0-9a-fA-F]+/);
                expect(res.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });

            it('should scale a firm quote if MM returns too much', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const makerUri = 'https://rfqm.somemaker.xyz';
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmFirmQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        order: new RfqOrder({
                            chainId: 1337,
                            makerToken: contractAddresses.zrxToken,
                            makerAmount: new BigNumber(202),
                            takerToken: contractAddresses.etherToken,
                            takerAmount: new BigNumber(200), // returns more than sellAmount
                            expiry: NEVER_EXPIRES,
                        }),
                        type: FillQuoteTransformerOrderType.Rfq,
                        signature: INVALID_SIGNATURE,
                    },
                ]);
                when(quoteRequestorMock.getMakerUriForSignature(anything())).thenReturn(makerUri);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                // Mock out the blockchain utils
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                when(
                    rfqBlockchainUtilsMock.generateMetaTransaction(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenReturn(MOCK_META_TX);
                const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeRfqmQuoteToDbAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                    rfqBlockchainUtils,
                    dbUtils,
                });

                // When
                const res = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount,
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount).to.eq(sellAmount);
                expect(res.buyAmount.toNumber()).to.eq(101); // result is scaled
                expect(res.price.toNumber()).to.equal(1.01);
                expect(res.metaTransactionHash).to.match(/^0x[0-9a-fA-F]+/);
                expect(res.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });

            it('should round price to six decimal places', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const makerUri = 'https://rfqm.somemaker.xyz';
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmFirmQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        order: new RfqOrder({
                            chainId: 1337,
                            makerToken: contractAddresses.zrxToken,
                            makerAmount: new BigNumber(111),
                            takerToken: contractAddresses.etherToken,
                            takerAmount: new BigNumber(333),
                            expiry: NEVER_EXPIRES,
                        }),
                        type: FillQuoteTransformerOrderType.Rfq,
                        signature: INVALID_SIGNATURE,
                    },
                ]);
                when(quoteRequestorMock.getMakerUriForSignature(anything())).thenReturn(makerUri);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                // Mock out the blockchain utils
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                when(
                    rfqBlockchainUtilsMock.generateMetaTransaction(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenReturn(MOCK_META_TX);
                const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeRfqmQuoteToDbAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                    rfqBlockchainUtils,
                    dbUtils,
                });

                // When
                const res = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(333),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }

                expect(res.price.toNumber()).to.equal(0.3333333);
            });
        });

        describe('buys', () => {
            const buyAmount = new BigNumber(100);
            it('should fetch a firm quote', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const makerUri = 'https://rfqm.somemaker.xyz';
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmFirmQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        order: new RfqOrder({
                            chainId: 1337,
                            makerToken: contractAddresses.zrxToken,
                            makerAmount: new BigNumber(100),
                            takerToken: contractAddresses.etherToken,
                            takerAmount: new BigNumber(80),
                            expiry: NEVER_EXPIRES,
                        }),
                        type: FillQuoteTransformerOrderType.Rfq,
                        signature: INVALID_SIGNATURE,
                    },
                ]);
                when(quoteRequestorMock.getMakerUriForSignature(anything())).thenReturn(makerUri);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                // Mock out the blockchain utils
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                when(
                    rfqBlockchainUtilsMock.generateMetaTransaction(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenReturn(MOCK_META_TX);
                const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeRfqmQuoteToDbAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                    rfqBlockchainUtils,
                    dbUtils,
                });

                // When
                const res = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }

                expect(res.buyAmount.toNumber()).to.eq(buyAmount.toNumber());
                expect(res.price.toNumber()).to.equal(0.8);
                expect(res.metaTransactionHash).to.match(/^0x[0-9a-fA-F]+/);
                expect(res.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });

            it('should scale a firm quote to desired buyAmount if MM returns too much', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const makerUri = 'https://rfqm.somemaker.xyz';
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmFirmQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        order: new RfqOrder({
                            chainId: 1337,
                            makerToken: contractAddresses.zrxToken,
                            makerAmount: new BigNumber(125), // more than buyAmount
                            takerToken: contractAddresses.etherToken,
                            takerAmount: new BigNumber(100),
                            expiry: NEVER_EXPIRES,
                        }),
                        type: FillQuoteTransformerOrderType.Rfq,
                        signature: INVALID_SIGNATURE,
                    },
                ]);
                when(quoteRequestorMock.getMakerUriForSignature(anything())).thenReturn(makerUri);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                // Mock out the blockchain utils
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                when(
                    rfqBlockchainUtilsMock.generateMetaTransaction(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenReturn(MOCK_META_TX);
                const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeRfqmQuoteToDbAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                    rfqBlockchainUtils,
                    dbUtils,
                });

                // When
                const res = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }

                expect(res.buyAmount.toNumber()).to.eq(buyAmount.toNumber());
                expect(res.sellAmount.toNumber()).to.eq(80); // result is scaled
                expect(res.price.toNumber()).to.equal(0.8);
                expect(res.metaTransactionHash).to.match(/^0x[0-9a-fA-F]+/);
                expect(res.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });

            it('should ignore quotes that are for the wrong chain', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                // Given
                const makerUri = 'https://rfqm.somemaker.xyz';
                const quoteRequestorMock = mock(QuoteRequestor);

                const worsePrice: SignedNativeOrder = {
                    order: new RfqOrder({
                        chainId: 1337,
                        makerToken: contractAddresses.zrxToken,
                        makerAmount: new BigNumber(100),
                        takerToken: contractAddresses.etherToken,
                        takerAmount: new BigNumber(101),
                        expiry: NEVER_EXPIRES,
                    }),
                    type: FillQuoteTransformerOrderType.Rfq,
                    signature: INVALID_SIGNATURE,
                };

                const wrongChain: SignedNativeOrder = {
                    order: new RfqOrder({
                        chainId: 1,
                        makerToken: contractAddresses.zrxToken,
                        makerAmount: new BigNumber(100),
                        takerToken: contractAddresses.etherToken,
                        takerAmount: new BigNumber(5),
                        expiry: NEVER_EXPIRES,
                    }),
                    type: FillQuoteTransformerOrderType.Rfq,
                    signature: INVALID_SIGNATURE,
                };

                when(
                    quoteRequestorMock.requestRfqmFirmQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([worsePrice, wrongChain]);
                when(quoteRequestorMock.getMakerUriForSignature(anything())).thenReturn(makerUri);

                const quoteRequestorInstance = instance(quoteRequestorMock);

                // Mock out the blockchain utils
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                when(
                    rfqBlockchainUtilsMock.generateMetaTransaction(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenReturn(MOCK_META_TX);
                const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeRfqmQuoteToDbAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const service = buildRfqmServiceForUnitTest({
                    quoteRequestor: quoteRequestorInstance,
                    rfqBlockchainUtils,
                    dbUtils,
                });

                // When
                const res = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }

                expect(res.price.toNumber()).to.equal(1.01); // Worse pricing wins because better pricing is for wrong chain
            });
        });
    });

    describe('runHealthCheckAsync', () => {
        it('returns active pairs', async () => {
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findRfqmWorkerHeartbeatsAsync()).thenResolve([]);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            const result = await service.runHealthCheckAsync();

            expect(result.pairs).to.have.key(
                '0x0b1ba0af832d7c05fd64161e0db78e85978e8082-0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c',
            );
            expect(
                result.pairs['0x0b1ba0af832d7c05fd64161e0db78e85978e8082-0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c'],
            ).to.equal(HealthCheckStatus.Operational);
        });
    });

    describe('status', () => {
        it("should return null when the specified order isn't found", async () => {
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve();
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            const jobStatus = await service.getOrderStatusAsync('0x00');

            expect(jobStatus).to.equal(null);
        });

        it('should return failed for jobs that have sat in queue past expiry', async () => {
            const oldJob = new RfqmJobEntity({
                calldata: '',
                chainId: 1337,
                expiry: new BigNumber(Date.now() - 10000).dividedBy(ONE_SECOND_MS).decimalPlaces(0),
                makerUri: '',
                orderHash: '0x00',
            });
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve(oldJob);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            const jobStatus = await service.getOrderStatusAsync('0x00');

            if (jobStatus === null) {
                expect.fail('Status should exist');
                throw new Error();
            }
            expect(jobStatus.status).to.equal('failed');

            if (jobStatus.status !== 'failed') {
                expect.fail('Status should be failed');
                throw new Error();
            }
            expect(jobStatus.transactions).to.have.length(0); // tslint:disable-line no-unused-expression
        });

        it('should return pending for unexpired enqueued jobs', async () => {
            const newJob = new RfqmJobEntity({
                calldata: '',
                chainId: 1337,
                expiry: new BigNumber(Date.now() + 10000).dividedBy(ONE_SECOND_MS).decimalPlaces(0),
                makerUri: '',
                orderHash: '0x00',
            });
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve(newJob);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            const jobStatus = await service.getOrderStatusAsync('0x00');

            if (jobStatus === null) {
                expect.fail('Status should exist');
                throw new Error();
            }
            expect(jobStatus.status).to.equal('pending');
        });

        it('should return pending for jobs in processing', async () => {
            const job = new RfqmJobEntity({
                calldata: '',
                chainId: 1337,
                expiry: new BigNumber(Date.now() + 10000),
                makerUri: '',
                orderHash: '0x00',
                status: RfqmJobStatus.PendingProcessing,
            });
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve(job);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            const jobStatus = await service.getOrderStatusAsync('0x00');

            if (jobStatus === null) {
                expect.fail('Status should exist');
                throw new Error();
            }
            expect(jobStatus.status).to.equal('pending');
        });

        it('should return submitted with transaction submissions for submitted jobs', async () => {
            const now = Date.now();
            const jobExpiryTime = new BigNumber(now + 10000);
            const transaction1Time = now + 10;
            const transaction2Time = now + 20;

            const job = new RfqmJobEntity({
                calldata: '',
                chainId: 1337,
                expiry: jobExpiryTime,
                makerUri: '',
                orderHash: '0x00',
                status: RfqmJobStatus.PendingSubmitted,
            });

            const submission1 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction1Time),
                orderHash: '0x00',
                transactionHash: '0x01',
            });
            const submission2 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction2Time),
                orderHash: '0x00',
                transactionHash: '0x02',
            });

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve(job);
            when(dbUtilsMock.findRfqmTransactionSubmissionsByOrderHashAsync('0x00')).thenResolve([
                submission1,
                submission2,
            ]);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            const jobStatus = await service.getOrderStatusAsync('0x00');

            if (jobStatus === null) {
                expect.fail('Status should exist');
                throw new Error();
            }

            if (jobStatus.status !== 'submitted') {
                expect.fail('Status should be submitted');
                throw new Error();
            }
            expect(jobStatus.transactions).to.have.length(2);
            expect(jobStatus.transactions).to.deep.include({ hash: '0x01', timestamp: +transaction1Time.valueOf() });
            expect(jobStatus.transactions).to.deep.include({ hash: '0x02', timestamp: +transaction2Time.valueOf() });
        });

        it('should return succeeded for a successful job, with the succeeded job', async () => {
            const now = Date.now();
            const jobExpiryTime = new BigNumber(now + 10000);
            const transaction1Time = now + 10;
            const transaction2Time = now + 20;

            const job = new RfqmJobEntity({
                calldata: '',
                chainId: 1337,
                expiry: jobExpiryTime,
                makerUri: '',
                orderHash: '0x00',
                status: RfqmJobStatus.SucceededUnconfirmed,
            });

            const submission1 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction1Time),
                orderHash: '0x00',
                transactionHash: '0x01',
                status: RfqmTransactionSubmissionStatus.RevertedUnconfirmed,
            });
            const submission2 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction2Time),
                orderHash: '0x00',
                transactionHash: '0x02',
                status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
            });

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve(job);
            when(dbUtilsMock.findRfqmTransactionSubmissionsByOrderHashAsync('0x00')).thenResolve([
                submission1,
                submission2,
            ]);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            const jobStatus = await service.getOrderStatusAsync('0x00');

            if (jobStatus === null) {
                expect.fail('Status should exist');
                throw new Error();
            }

            if (jobStatus.status !== 'succeeded') {
                expect.fail('Status should be succeeded');
                throw new Error();
            }
            expect(jobStatus.transactions[0]).to.contain({ hash: '0x02', timestamp: +transaction2Time.valueOf() });
        });

        it('should return confirmed for a successful confirmed job', async () => {
            const now = Date.now();
            const jobExpiryTime = new BigNumber(now + 10000);
            const transaction1Time = now + 10;
            const transaction2Time = now + 20;

            const job = new RfqmJobEntity({
                calldata: '',
                chainId: 1337,
                expiry: jobExpiryTime,
                makerUri: '',
                orderHash: '0x00',
                status: RfqmJobStatus.SucceededConfirmed,
            });

            const submission1 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction1Time),
                orderHash: '0x00',
                transactionHash: '0x01',
                status: RfqmTransactionSubmissionStatus.RevertedConfirmed,
            });
            const submission2 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction2Time),
                orderHash: '0x00',
                transactionHash: '0x02',
                status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
            });

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve(job);
            when(dbUtilsMock.findRfqmTransactionSubmissionsByOrderHashAsync('0x00')).thenResolve([
                submission1,
                submission2,
            ]);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            const jobStatus = await service.getOrderStatusAsync('0x00');

            if (jobStatus === null) {
                expect.fail('Status should exist');
                throw new Error();
            }

            if (jobStatus.status !== 'confirmed') {
                expect.fail('Status should be confirmed');
                throw new Error();
            }
            expect(jobStatus.transactions[0]).to.contain({ hash: '0x02', timestamp: +transaction2Time.valueOf() });
        });

        it('should throw if the job is successful but there are no successful transactions', async () => {
            const now = Date.now();
            const jobExpiryTime = new BigNumber(now + 10000);
            const transaction1Time = now + 10;
            const transaction2Time = now + 20;

            const job = new RfqmJobEntity({
                calldata: '',
                chainId: 1337,
                expiry: jobExpiryTime,
                makerUri: '',
                orderHash: '0x00',
                status: RfqmJobStatus.SucceededUnconfirmed,
            });

            const submission1 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction1Time),
                orderHash: '0x00',
                transactionHash: '0x01',
                status: RfqmTransactionSubmissionStatus.RevertedUnconfirmed,
            });
            const submission2 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction2Time),
                orderHash: '0x00',
                transactionHash: '0x02',
                status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
            });

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve(job);
            when(dbUtilsMock.findRfqmTransactionSubmissionsByOrderHashAsync('0x00')).thenResolve([
                submission1,
                submission2,
            ]);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            expect(async () => {
                await service.getOrderStatusAsync('0x00');
            }).to.throw; // tslint:disable-line no-unused-expression
        });

        it('should throw if the job is successful but there are multiple successful transactions', async () => {
            const now = Date.now();
            const jobExpiryTime = new BigNumber(now + 10000);
            const transaction1Time = now + 10;
            const transaction2Time = now + 20;

            const job = new RfqmJobEntity({
                calldata: '',
                chainId: 1337,
                expiry: jobExpiryTime,
                makerUri: '',
                orderHash: '0x00',
                status: RfqmJobStatus.SucceededUnconfirmed,
            });

            const submission1 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction1Time),
                orderHash: '0x00',
                transactionHash: '0x01',
                status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
            });
            const submission2 = new RfqmTransactionSubmissionEntity({
                createdAt: new Date(transaction2Time),
                orderHash: '0x00',
                transactionHash: '0x02',
                status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
            });

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync(anything())).thenResolve(job);
            when(dbUtilsMock.findRfqmTransactionSubmissionsByOrderHashAsync('0x00')).thenResolve([
                submission1,
                submission2,
            ]);
            const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            expect(async () => {
                await service.getOrderStatusAsync('0x00');
            }).to.throw; // tslint:disable-line no-unused-expression
        });
    });
    describe('shouldResubmitTransaction', () => {
        it('should say no if new gas price < 10% greater than previous', async () => {
            const oldGasPrice = new BigNumber(10);
            const newGasPrice = oldGasPrice.multipliedBy(1.09);

            expect(RfqmService.shouldResubmitTransaction(oldGasPrice, newGasPrice)).to.equal(false);
        });
        it('should say yes if new gas price is 10% greater than previous', async () => {
            const oldGasPrice = new BigNumber(10);
            const newGasPrice = oldGasPrice.multipliedBy(1.1);

            expect(RfqmService.shouldResubmitTransaction(oldGasPrice, newGasPrice)).to.equal(true);
        });
        it('should say yes if new gas price > 10% greater than previous', async () => {
            const oldGasPrice = new BigNumber(10);
            const newGasPrice = oldGasPrice.multipliedBy(1.11);

            expect(RfqmService.shouldResubmitTransaction(oldGasPrice, newGasPrice)).to.equal(true);
        });
    });
    describe('isBlockConfirmed', () => {
        it('should say no if receipt block is under 3 blocks deep', async () => {
            const receiptBlock = 100;
            const currentBlock = 102;

            expect(RfqmService.isBlockConfirmed(currentBlock, receiptBlock)).to.equal(false);
        });
        it('should say yes if the receipt block is at least 3 blocks deep', async () => {
            const receiptBlock = 100;
            const currentBlock = 103;

            expect(RfqmService.isBlockConfirmed(currentBlock, receiptBlock)).to.equal(true);
        });
    });
});
