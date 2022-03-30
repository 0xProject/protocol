// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { pino } from '@0x/api-utils';
import { ProtocolFeeUtils, QuoteRequestor, SignatureType } from '@0x/asset-swapper';
import { ONE_SECOND_MS } from '@0x/asset-swapper/lib/src/utils/market_operation_utils/constants';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { expect } from '@0x/contracts-test-utils';
import { OtcOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { BigNumber as EthersBigNumber, providers } from 'ethers';
import * as _ from 'lodash';
import { Producer } from 'sqs-producer';
import { anything, capture, deepEqual, instance, mock, spy, verify, when } from 'ts-mockito';

import { ETH_DECIMALS } from '../../src/constants';
import {
    RfqmJobEntity,
    RfqmTransactionSubmissionEntity,
    RfqmV2JobEntity,
    RfqmV2TransactionSubmissionEntity,
} from '../../src/entities';
import { RfqmJobStatus, RfqmOrderTypes, RfqmTransactionSubmissionStatus } from '../../src/entities/types';
import { logger } from '../../src/logger';
import { RfqmService } from '../../src/services/rfqm_service';
import { CacheClient } from '../../src/utils/cache_client';
import { QuoteRequestorManager } from '../../src/utils/quote_requestor_manager';
import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { RfqmDbUtils } from '../../src/utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { RfqMakerManager } from '../../src/utils/rfq_maker_manager';

const NEVER_EXPIRES = new BigNumber(9999999999999999);
const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';
const MOCK_GAS_PRICE = new BigNumber(100);
const MOCK_MM_URI = 'https://mm-address';
const TEST_RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS = 50;
const WORKER_FULL_BALANCE_WEI = new BigNumber(1).shiftedBy(ETH_DECIMALS);
let loggerSpy: pino.Logger;

const buildQuoteRequestorManager = (quoteRequestorInstance: QuoteRequestor): QuoteRequestorManager => {
    const quoteRequestorManagerMock = mock(QuoteRequestorManager);
    const quoteRequestorManagerInstance = instance(quoteRequestorManagerMock);
    when(quoteRequestorManagerMock.getInstance()).thenReturn(quoteRequestorInstance);

    return quoteRequestorManagerInstance;
};

const buildRfqmServiceForUnitTest = (
    overrides: {
        cacheClient?: CacheClient;
        dbUtils?: RfqmDbUtils;
        rfqMakerManager?: RfqMakerManager;
        producer?: Producer;
        protocolFeeUtils?: ProtocolFeeUtils;
        quoteRequestorManager?: QuoteRequestorManager;
        quoteServerClient?: QuoteServerClient;
        rfqBlockchainUtils?: RfqBlockchainUtils;
        initialMaxPriorityFeePerGasGwei?: number;
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
            makerUri: MOCK_MM_URI,
        },
    ]);

    const quoteRequestorInstance = instance(quoteRequestorMock);
    const quoteRequestorManagerInstance = buildQuoteRequestorManager(quoteRequestorInstance);
    const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
    when(protocolFeeUtilsMock.getGasPriceEstimationOrThrowAsync()).thenResolve(MOCK_GAS_PRICE);
    const protocolFeeUtilsInstance = instance(protocolFeeUtilsMock);
    const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
    when(rfqBlockchainUtilsMock.getAccountBalanceAsync(MOCK_WORKER_REGISTRY_ADDRESS)).thenResolve(
        WORKER_FULL_BALANCE_WEI,
    );
    const sqsMock = mock(Producer);
    when(sqsMock.queueSize()).thenResolve(0);
    const quoteServerClientMock = mock(QuoteServerClient);

    const cacheClientMock = mock(CacheClient);
    const defaultDbUtilsMock = mock(RfqmDbUtils);
    const rfqMakerManagerMock = mock(RfqMakerManager);

    return new RfqmService(
        1,
        overrides.quoteRequestorManager || quoteRequestorManagerInstance,
        overrides.protocolFeeUtils || protocolFeeUtilsInstance,
        contractAddresses,
        MOCK_WORKER_REGISTRY_ADDRESS,
        overrides.rfqBlockchainUtils || instance(rfqBlockchainUtilsMock),
        overrides.dbUtils || instance(defaultDbUtilsMock),
        overrides.producer || sqsMock,
        overrides.quoteServerClient || quoteServerClientMock,
        TEST_RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS,
        overrides.cacheClient || cacheClientMock,
        overrides.rfqMakerManager || rfqMakerManagerMock,
        overrides.initialMaxPriorityFeePerGasGwei || 2,
    );
};

const fakeClockMs = 1637722898000;
const fakeOneMinuteAgoS = fakeClockMs / ONE_SECOND_MS - 60;
const fakeFiveMinutesLater = fakeClockMs / ONE_SECOND_MS + 300;

const validEIP712Sig = {
    signatureType: SignatureType.EIP712,
    v: 28,
    r: '0xdc158f7b53b940863bc7b001552a90282e51033f29b73d44a2701bd16faa19d2',
    s: '0x55f6c5470e41b39a5ddeb63c22f8ba1d34748f93265715b9dc4a0f10138985a6',
};
const maker = '0xbb004090d26845b672f17c6da4b7d162df3bfc5e';
const orderHash = '0x112160fb0933ecde720f63b50b303ce64e52ded702bef78b9c20361f3652a462';

describe('RfqmService Worker Logic', () => {
    beforeEach(() => {
        loggerSpy = spy(logger);
    });
    describe('processJobAsync', () => {
        it('fails if no job is found', async () => {
            // Return `undefined` for v1 and v2 job for orderhash
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync('0xorderhash')).thenResolve(undefined);
            when(dbUtilsMock.findV2JobByOrderHashAsync('0xorderhash')).thenResolve(undefined);

            const rfqmService = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            await rfqmService.processJobAsync('0xorderhash', '0xworkeraddress');
            expect(capture(loggerSpy.error).last()[0]).to.include({
                errorMessage: 'No job found for order hash',
            });
        });

        it('fails if two jobs are found', async () => {
            // Return a job for both v1 and v2 for orderhash
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync('0xorderhash')).thenResolve(new RfqmJobEntity());
            when(dbUtilsMock.findV2JobByOrderHashAsync('0xorderhash')).thenResolve(new RfqmV2JobEntity());

            const rfqmService = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            await rfqmService.processJobAsync('0xorderhash', '0xworkeraddress');
            expect(capture(loggerSpy.error).last()[0]).to.include({
                errorMessage: 'Found more than one job for order hash',
            });
        });

        it('fails if a worker ends up with a job assigned to a different worker', async () => {
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findJobByOrderHashAsync('0xorderhash')).thenResolve(
                new RfqmJobEntity({
                    affiliateAddress: '',
                    calldata: '0x000',
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeOneMinuteAgoS),
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
                        order: {
                            chainId: '1',
                            expiry: fakeOneMinuteAgoS.toString(),
                            maker: '',
                            makerAmount: '',
                            makerToken: '',
                            pool: '',
                            salt: '',
                            taker: '',
                            takerAmount: '',
                            takerToken: '',
                            txOrigin: '',
                            verifyingContract: '',
                        },
                        type: RfqmOrderTypes.V4Rfq,
                    },
                    orderHash: '0xorderhash',
                    status: RfqmJobStatus.PendingEnqueued,
                    updatedAt: new Date(),
                    workerAddress: '0xwrongworkeraddress',
                }),
            );

            const rfqmService = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            await rfqmService.processJobAsync('0xorderhash', '0xworkeraddress');
            expect(capture(loggerSpy.error).last()[0]).to.include({
                errorMessage: 'Worker was sent a job claimed by a different worker',
            });
        });
    });

    describe('prepareV1JobAsync', () => {
        it('updates the job and throws upon validation failure', async () => {
            const expiredJob = new RfqmJobEntity({
                affiliateAddress: '',
                calldata: '0x000',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeOneMinuteAgoS),
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
                    order: {
                        chainId: '1',
                        expiry: fakeOneMinuteAgoS.toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        pool: '',
                        salt: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            });
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findRfqmTransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push({ ...jobArg });
            });
            const rfqmService = buildRfqmServiceForUnitTest({ dbUtils: instance(mockDbUtils) });

            // Not the best way to do this, but I don't have confidence that
            // chai-as-promised is acting as advertised.
            try {
                await rfqmService.prepareV1JobAsync(expiredJob, '0xworkeraddress', new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed validation');
                expect(updateRfqmJobCalledArgs).to.deep.equal([
                    { ...expiredJob, status: RfqmJobStatus.FailedExpired, isCompleted: true },
                ]);
            }
        });

        it('handles an eth call failure', async () => {
            const job = new RfqmJobEntity({
                affiliateAddress: '',
                calldata: '0xcalldata',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
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
                    order: {
                        chainId: '1',
                        expiry: fakeFiveMinutesLater.toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        pool: '',
                        salt: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findRfqmTransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            // ts-mockito is a subpar library which doesn't cover call verification
            // when the arguments are objects, so for this test and a few others
            // we'll manually implement the argument capturing behavior while
            // expanding the object into a new one such that deep equality
            // works correctly (note this only does one level of comparison but
            // that's good enough for this case).
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push({ ...jobArg });
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(
                mockBlockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(job.calldata, '0xworkeraddress'),
            ).thenReject(new Error('eth call failure message'));
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            // Not the best way to do this, but I don't have confidence that
            // chai-as-promised is acting as advertised.
            try {
                await rfqmService.prepareV1JobAsync(job, '0xworkeraddress', new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('eth_call');
                expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                    ...job,
                    status: RfqmJobStatus.PendingProcessing,
                    isCompleted: false,
                });
                expect(updateRfqmJobCalledArgs[1]).to.deep.equal({
                    ...job,
                    status: RfqmJobStatus.FailedEthCallFailed,
                    isCompleted: true,
                });
            }
        });

        it('handles a last look rejection', async () => {
            const job = new RfqmJobEntity({
                affiliateAddress: '',
                calldata: '0x000',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
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
                    order: {
                        chainId: '1',
                        expiry: fakeFiveMinutesLater.toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        pool: '',
                        salt: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findRfqmTransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });

            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.confirmLastLookAsync(job.makerUri, anything())).thenResolve(false);
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
            });

            try {
                await rfqmService.prepareV1JobAsync(job, '0xworkeraddress', new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('rejected last look');
                expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1].calldata).to.equal('');
            }
        });

        it('successfully prepares a job', async () => {
            const job = new RfqmJobEntity({
                affiliateAddress: '',
                calldata: '0x000',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
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
                    order: {
                        chainId: '1',
                        expiry: fakeFiveMinutesLater.toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        pool: '',
                        salt: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findRfqmTransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(
                mockBlockchainUtils.decodeMetaTransactionCallDataAndValidateAsync(job.calldata, '0xworkeraddress'),
            ).thenResolve([new BigNumber(0), new BigNumber(0)]);
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.confirmLastLookAsync(job.makerUri, anything())).thenResolve(true);
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                quoteServerClient: instance(mockQuoteServerClient),
            });

            const result = await rfqmService.prepareV1JobAsync(job, '0xworkeraddress', new Date(fakeClockMs));
            expect(result.job).to.deep.equal({
                ...job,
                lastLookResult: true,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
            expect(result.calldata).to.equal(job.calldata);
            expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                ...job,
                isCompleted: false,
                status: RfqmJobStatus.PendingProcessing,
            });
            expect(updateRfqmJobCalledArgs[1]).to.deep.equal({
                ...job,
                isCompleted: false,
                lastLookResult: true,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
        });
    });

    describe('prepareV2JobAsync', () => {
        it('updates the job and throws upon validation failure', async () => {
            const expiredJob = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeOneMinuteAgoS),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeOneMinuteAgoS.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            });
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const rfqmService = buildRfqmServiceForUnitTest({ dbUtils: instance(mockDbUtils) });

            try {
                await rfqmService.prepareV2JobAsync(expiredJob, '0xworkeraddress');
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed validation');
                expect(updateRfqmJobCalledArgs).to.deep.equal([{ ...expiredJob, status: RfqmJobStatus.FailedExpired }]);
            }
        });

        it('handles a balance check failure', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                makerSignature: null,
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingEnqueued,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(5),
                new BigNumber(100),
            ]);
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            expect(rfqmService.prepareV2JobAsync(job, '0xworkeraddress', new Date(fakeClockMs)))
                .to.be.eventually.rejectedWith('Order failed pre-sign validation')
                .then(() => {
                    expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                        ...job,
                        status: RfqmJobStatus.PendingProcessing,
                    });
                    expect(updateRfqmJobCalledArgs[1]).to.deep.equal({
                        ...job,
                        status: RfqmJobStatus.FailedPresignValidationFailed,
                    });
                });
        });

        it('handles a decline to sign', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                makerSignature: null,
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingEnqueued,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(undefined);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
                new BigNumber(1000000000),
            ]);
            const rfqmService = buildRfqmServiceForUnitTest({
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
            });

            expect(rfqmService.prepareV2JobAsync(job, '0xworkeraddress', new Date(fakeClockMs)))
                .to.eventually.be.rejectedWith('Market Maker declined to sign')
                .then(() => {
                    expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1]).to.deep.equal({
                        ...job,
                        lastLookResult: false,
                        status: RfqmJobStatus.FailedLastLookDeclined,
                    });
                });
        });

        it('handles a signature failure', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                makerSignature: null,
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingEnqueued,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenReject(
                new Error('fake timeout'),
            );

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
                new BigNumber(1000000000),
            ]);
            const rfqmService = buildRfqmServiceForUnitTest({
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
            });

            try {
                await rfqmService.prepareV2JobAsync(job, '0xworkeraddress', new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed during market maker sign attempt');
                expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1]).to.deep.equal({
                    ...job,
                    status: RfqmJobStatus.FailedSignFailed,
                });
            }
        });

        it('handles an eth_call failure', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                makerSignature: null,
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker,
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash,
                status: RfqmJobStatus.PendingEnqueued,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(orderHash)).thenResolve([]);
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
                new BigNumber(1000000000),
            ]);
            when(
                mockBlockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenReject(new Error('fake eth call failure'));
            const rfqmService = buildRfqmServiceForUnitTest({
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
            });

            try {
                await rfqmService.prepareV2JobAsync(job, '0xworkeraddress', new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Eth call validation failed');
                expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1]).to.deep.equal({
                    ...job,
                    lastLookResult: true,
                    makerSignature: validEIP712Sig,
                    status: RfqmJobStatus.FailedEthCallFailed,
                });
            }
        });

        it('updates market maker signatures missing bytes', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                makerSignature: null,
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker,
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash,
                status: RfqmJobStatus.PendingEnqueued,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
                new BigNumber(1000000000),
            ]);
            when(
                mockBlockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenResolve(0);
            when(
                mockBlockchainUtils.generateTakerSignedOtcOrderCallData(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenReturn('0xvalidcalldata');
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                quoteServerClient: instance(mockQuoteServerClient),
            });

            const result = await rfqmService.prepareV2JobAsync(job, '0xworkeraddress', new Date(fakeClockMs));
            expect(result.job).to.deep.equal({
                ...job,
                lastLookResult: true,
                makerSignature: validEIP712Sig,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
        });

        it('skips the eth_call for jobs with existing submissions', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: true,
                makerUri: 'http://foo.bar',
                makerSignature: validEIP712Sig,
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingLastLookAccepted,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });
            const transaction = new RfqmV2TransactionSubmissionEntity({
                orderHash,
                to: '0xexchangeproxyaddress',
                from: '0xworkeraddress',
                transactionHash: '0xsignedtransactionhash',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 21,
            });

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([transaction]);
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
                new BigNumber(1000000000),
            ]);
            when(
                mockBlockchainUtils.generateTakerSignedOtcOrderCallData(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenReturn('0xvalidcalldata');
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                quoteServerClient: instance(mockQuoteServerClient),
            });

            const result = await rfqmService.prepareV2JobAsync(job, '0xworkeraddress', new Date(fakeClockMs));
            expect(result.job).to.deep.equal({
                ...job,
                lastLookResult: true,
                makerSignature: validEIP712Sig,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
            expect(result.calldata).to.equal('0xvalidcalldata');
            verify(
                mockBlockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).never();
        });

        it('lets expired jobs with existing submissions fall through', async () => {
            // If the job isn't in a terminal status but there are existing submissions,
            // `prepareV2JobAsync` will let the job continue to the submission step which
            // will allow the worker to check receipts for those submissions.
            const expiredJob = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeOneMinuteAgoS),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: true,
                makerUri: 'http://foo.bar',
                makerSignature: {
                    r: '',
                    s: '',
                    signatureType: SignatureType.EthSign,
                    v: 1,
                },
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeOneMinuteAgoS.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingSubmitted,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });
            const transaction = new RfqmV2TransactionSubmissionEntity({
                orderHash: '0xorderhash',
                to: '0xexchangeproxyaddress',
                from: '0xworkeraddress',
                transactionHash: '0xsignedtransactionhash',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 21,
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([transaction]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(
                mockBlockchainUtils.generateTakerSignedOtcOrderCallData(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenReturn('0xvalidcalldata');
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const result = await rfqmService.prepareV2JobAsync(expiredJob, '0xworkeraddress', new Date(fakeClockMs));
            expect(result.job.status).to.equal(RfqmJobStatus.PendingSubmitted);
        });

        it('successfully prepares a job', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                makerSignature: null,
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker,
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash,
                status: RfqmJobStatus.PendingEnqueued,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(orderHash)).thenResolve([]);
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
                new BigNumber(1000000000),
            ]);
            when(
                mockBlockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenResolve(0);
            when(
                mockBlockchainUtils.generateTakerSignedOtcOrderCallData(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenReturn('0xvalidcalldata');
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                quoteServerClient: instance(mockQuoteServerClient),
            });

            const result = await rfqmService.prepareV2JobAsync(job, '0xworkeraddress', new Date(fakeClockMs));
            expect(result.job).to.deep.equal({
                ...job,
                lastLookResult: true,
                makerSignature: validEIP712Sig,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
            expect(result.calldata).to.equal('0xvalidcalldata');
            expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                ...job,
                status: RfqmJobStatus.PendingProcessing,
            });
            expect(updateRfqmJobCalledArgs[1]).to.deep.equal({
                ...job,
                lastLookResult: true,
                makerSignature: validEIP712Sig,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
        });
    });

    describe('submitJobToChainAsync', () => {
        it('submits a v1 transaction', async () => {
            const job = new RfqmJobEntity({
                affiliateAddress: '',
                calldata: '0xcalldata',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                isCompleted: false,
                lastLookResult: true,
                makerUri: 'http://foo.bar',
                metadata: null,
                metaTransactionHash: '',
                order: {
                    order: {
                        chainId: '1',
                        expiry: fakeFiveMinutesLater.toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        pool: '',
                        salt: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingLastLookAccepted,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockTransactionRequest: providers.TransactionRequest = {};
            const mockTransaction = new RfqmTransactionSubmissionEntity({
                orderHash: '0xorderhash',
                to: '0xexchangeproxyaddress',
                from: '0xworkeraddress',
                transactionHash: '0xsignedtransactionhash',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
            });
            const mockTransactionReceipt: providers.TransactionReceipt = {
                to: '0xto',
                from: '0xfrom',
                contractAddress: '0xexchangeproxyaddress',
                transactionIndex: 0,
                gasUsed: EthersBigNumber.from(10000),
                logsBloom: '',
                blockHash: '0xblockhash',
                transactionHash: '0xsignedtransactionhash',
                logs: [],
                blockNumber: 1,
                confirmations: 3,
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                byzantium: true,
                type: 2,
                status: 1,
            };
            const mockNonce = 0;

            const mockProtocolFeeUtils = mock(ProtocolFeeUtils);
            when(mockProtocolFeeUtils.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(10));
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findRfqmTransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const writeRfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
            when(mockDbUtils.writeRfqmTransactionSubmissionToDbAsync(anything())).thenCall(async (transactionArg) => {
                writeRfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                return _.cloneDeep(mockTransaction);
            });
            when(
                mockDbUtils.findRfqmTransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash'),
            ).thenResolve(_.cloneDeep(mockTransaction));
            const updateRfqmTransactionSubmissionsCalledArgs: RfqmTransactionSubmissionEntity[][] = [];
            when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(mockBlockchainUtils.estimateGasForExchangeProxyCallAsync(anything(), '0xworkeraddress')).thenResolve(
                100,
            );
            when(mockBlockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(anything())).thenReturn(
                new BigNumber(123),
            );
            when(
                mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
            ).thenReturn(mockTransactionRequest);
            when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                signedTransaction: 'signedTransaction',
                transactionHash: '0xsignedtransactionhash',
            });
            when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
            when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve('0xsignedtransactionhash');
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                mockTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
            when(mockBlockchainUtils.getDecodedRfqOrderFillEventLogFromLogs(anything())).thenReturn({
                event: '',
                logIndex: null,
                transactionIndex: null,
                transactionHash: '',
                blockHash: '',
                address: '',
                data: '',
                blockNumber: 0,
                topics: [],
                args: {
                    maker: '',
                    makerToken: '',
                    makerTokenFilledAmount: new BigNumber(1234),
                    orderHash: '',
                    pool: '',
                    taker: '',
                    takerToken: '',
                    takerTokenFilledAmount: new BigNumber(5),
                },
            });
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                protocolFeeUtils: instance(mockProtocolFeeUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const result = await rfqmService.submitJobToChainAsync(
                job,
                '0xworkeraddress',
                '0xcalldata',
                new Date(fakeClockMs),
            );
            expect(result).to.equal(RfqmJobStatus.SucceededConfirmed);
            expect(writeRfqmTransactionSubmissionToDbCalledArgs[0].status).to.equal(
                RfqmTransactionSubmissionStatus.Presubmit,
            );
            expect(updateRfqmTransactionSubmissionsCalledArgs[0][0].status).to.equal(
                RfqmTransactionSubmissionStatus.Submitted,
            );
            expect(updateRfqmTransactionSubmissionsCalledArgs[1][0].status).to.equal(
                RfqmTransactionSubmissionStatus.SucceededConfirmed,
            );
        });

        it('submits a v2 transaction', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: true,
                makerUri: 'http://foo.bar',
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingLastLookAccepted,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockTransactionRequest: providers.TransactionRequest = {};
            const mockTransaction = new RfqmV2TransactionSubmissionEntity({
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                to: '0xexchangeproxyaddress',
                transactionHash: '0xsignedtransactionhash',
            });
            const mockTransactionReceipt: providers.TransactionReceipt = {
                to: '0xto',
                from: '0xfrom',
                contractAddress: '0xexchangeproxyaddress',
                transactionIndex: 0,
                gasUsed: EthersBigNumber.from(10000),
                logsBloom: '',
                blockHash: '0xblockhash',
                transactionHash: '0xsignedtransactionhash',
                logs: [],
                blockNumber: 1,
                confirmations: 3,
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                byzantium: true,
                type: 2,
                status: 1,
            };
            const mockNonce = 0;

            const mockProtocolFeeUtils = mock(ProtocolFeeUtils);
            when(mockProtocolFeeUtils.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(10));
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const writeV2RfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
            when(mockDbUtils.writeV2RfqmTransactionSubmissionToDbAsync(anything())).thenCall(async (transactionArg) => {
                writeV2RfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                return _.cloneDeep(mockTransaction);
            });
            when(mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash')).thenResolve(
                _.cloneDeep(mockTransaction),
            );
            const updateRfqmTransactionSubmissionsCalledArgs: RfqmTransactionSubmissionEntity[][] = [];
            when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(mockBlockchainUtils.estimateGasForExchangeProxyCallAsync(anything(), '0xworkeraddress')).thenResolve(
                100,
            );
            when(mockBlockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(anything())).thenReturn(
                new BigNumber(123),
            );
            when(
                mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
            ).thenReturn(mockTransactionRequest);
            when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                signedTransaction: 'signedTransaction',
                transactionHash: '0xsignedtransactionhash',
            });
            when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
            when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve('0xsignedtransactionhash');
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                mockTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
            when(mockBlockchainUtils.getDecodedRfqOrderFillEventLogFromLogs(anything())).thenReturn({
                event: '',
                logIndex: null,
                transactionIndex: null,
                transactionHash: '',
                blockHash: '',
                address: '',
                data: '',
                blockNumber: 0,
                topics: [],
                args: {
                    maker: '',
                    makerToken: '',
                    makerTokenFilledAmount: new BigNumber(1234),
                    orderHash: '',
                    pool: '',
                    taker: '',
                    takerToken: '',
                    takerTokenFilledAmount: new BigNumber(5),
                },
            });
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                protocolFeeUtils: instance(mockProtocolFeeUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const result = await rfqmService.submitJobToChainAsync(
                job,
                '0xworkeraddress',
                '0xcalldata',
                new Date(fakeClockMs),
            );
            expect(result).to.equal(RfqmJobStatus.SucceededConfirmed);
            expect(writeV2RfqmTransactionSubmissionToDbCalledArgs[0].status).to.equal(
                RfqmTransactionSubmissionStatus.Presubmit,
            );
            expect(updateRfqmTransactionSubmissionsCalledArgs[0][0].status).to.equal(
                RfqmTransactionSubmissionStatus.Submitted,
            );
            expect(updateRfqmTransactionSubmissionsCalledArgs[1][0].status).to.equal(
                RfqmTransactionSubmissionStatus.SucceededConfirmed,
            );
        });

        it("ignores an existing PRESUBMIT transaction which isn't found in the mempool or on chain", async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: true,
                makerUri: 'http://foo.bar',
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingLastLookAccepted,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockPresubmitTransaction = new RfqmV2TransactionSubmissionEntity({
                createdAt: new Date(1233),
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                status: RfqmTransactionSubmissionStatus.Presubmit,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
            });

            const mockTransactionRequest: providers.TransactionRequest = {};
            const mockTransaction = new RfqmV2TransactionSubmissionEntity({
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                to: '0xexchangeproxyaddress',
                transactionHash: '0xsignedtransactionhash',
            });
            const mockTransactionReceipt: providers.TransactionReceipt = {
                to: '0xto',
                from: '0xfrom',
                contractAddress: '0xexchangeproxyaddress',
                transactionIndex: 0,
                gasUsed: EthersBigNumber.from(10000),
                logsBloom: '',
                blockHash: '0xblockhash',
                transactionHash: '0xsignedtransactionhash',
                logs: [],
                blockNumber: 1,
                confirmations: 3,
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                byzantium: true,
                type: 2,
                status: 1,
            };
            const mockNonce = 0;

            const mockProtocolFeeUtils = mock(ProtocolFeeUtils);
            when(mockProtocolFeeUtils.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(10));
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([
                mockPresubmitTransaction,
            ]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const writeV2RfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
            when(mockDbUtils.writeV2RfqmTransactionSubmissionToDbAsync(anything())).thenCall(async (transactionArg) => {
                writeV2RfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                return _.cloneDeep(mockTransaction);
            });
            when(mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash')).thenResolve(
                _.cloneDeep(mockTransaction),
            );
            const updateRfqmTransactionSubmissionsCalledArgs: RfqmV2TransactionSubmissionEntity[][] = [];
            when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            // This mock response indicates that the presubmit transaction can't be found
            // on chain or in the mempool
            when(mockBlockchainUtils.getTransactionAsync('0xpresubmittransactionhash')).thenResolve(null);
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(mockBlockchainUtils.estimateGasForExchangeProxyCallAsync(anything(), '0xworkeraddress')).thenResolve(
                100,
            );
            when(mockBlockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(anything())).thenReturn(
                new BigNumber(123),
            );
            when(
                mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
            ).thenReturn(mockTransactionRequest);
            when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                signedTransaction: 'signedTransaction',
                transactionHash: '0xsignedtransactionhash',
            });
            when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
            when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve('0xsignedtransactionhash');
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                mockTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
            when(mockBlockchainUtils.getDecodedRfqOrderFillEventLogFromLogs(anything())).thenReturn({
                event: '',
                logIndex: null,
                transactionIndex: null,
                transactionHash: '',
                blockHash: '',
                address: '',
                data: '',
                blockNumber: 0,
                topics: [],
                args: {
                    maker: '',
                    makerToken: '',
                    makerTokenFilledAmount: new BigNumber(1234),
                    orderHash: '',
                    pool: '',
                    taker: '',
                    takerToken: '',
                    takerTokenFilledAmount: new BigNumber(5),
                },
            });
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                protocolFeeUtils: instance(mockProtocolFeeUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const result = await rfqmService.submitJobToChainAsync(
                job,
                '0xworkeraddress',
                '0xcalldata',
                new Date(fakeClockMs),
            );

            expect(result).to.equal(RfqmJobStatus.SucceededConfirmed);
            // Expectations are the same as if the presubmit transaction never existed
            expect(writeV2RfqmTransactionSubmissionToDbCalledArgs[0].status).to.equal(
                RfqmTransactionSubmissionStatus.Presubmit,
            );
            expect(updateRfqmTransactionSubmissionsCalledArgs[0][0].status).to.equal(
                RfqmTransactionSubmissionStatus.Submitted,
            );
            expect(updateRfqmTransactionSubmissionsCalledArgs[1][0].status).to.equal(
                RfqmTransactionSubmissionStatus.SucceededConfirmed,
            );
        });

        it("marks a PRESUBMIT job as expired when existing transactions aren't found in \
        the mempool or on chain and the expiration time has passed", async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeOneMinuteAgoS),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: true,
                makerUri: 'http://foo.bar',
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingLastLookAccepted,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockPresubmitTransaction = new RfqmV2TransactionSubmissionEntity({
                createdAt: new Date(1233),
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                status: RfqmTransactionSubmissionStatus.Presubmit,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
            });

            const mockTransactionRequest: providers.TransactionRequest = {};
            const mockTransaction = new RfqmV2TransactionSubmissionEntity({
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                to: '0xexchangeproxyaddress',
                transactionHash: '0xsignedtransactionhash',
            });
            const mockTransactionReceipt: providers.TransactionReceipt = {
                to: '0xto',
                from: '0xfrom',
                contractAddress: '0xexchangeproxyaddress',
                transactionIndex: 0,
                gasUsed: EthersBigNumber.from(10000),
                logsBloom: '',
                blockHash: '0xblockhash',
                transactionHash: '0xsignedtransactionhash',
                logs: [],
                blockNumber: 1,
                confirmations: 3,
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                byzantium: true,
                type: 2,
                status: 1,
            };
            const mockNonce = 0;

            const mockProtocolFeeUtils = mock(ProtocolFeeUtils);
            when(mockProtocolFeeUtils.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(10));
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([
                mockPresubmitTransaction,
            ]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const writeV2RfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
            when(mockDbUtils.writeV2RfqmTransactionSubmissionToDbAsync(anything())).thenCall(async (transactionArg) => {
                writeV2RfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                return _.cloneDeep(mockTransaction);
            });
            when(mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash')).thenResolve(
                _.cloneDeep(mockTransaction),
            );
            const updateRfqmTransactionSubmissionsCalledArgs: RfqmV2TransactionSubmissionEntity[][] = [];
            when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            // This mock response indicates that the presubmit transaction can't be found
            // on chain or in the mempool
            when(mockBlockchainUtils.getTransactionAsync('0xpresubmittransactionhash')).thenResolve(null);
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(mockBlockchainUtils.estimateGasForExchangeProxyCallAsync(anything(), '0xworkeraddress')).thenResolve(
                100,
            );
            when(mockBlockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(anything())).thenReturn(
                new BigNumber(123),
            );
            when(
                mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
            ).thenReturn(mockTransactionRequest);
            when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                signedTransaction: 'signedTransaction',
                transactionHash: '0xsignedtransactionhash',
            });
            when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
            when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve('0xsignedtransactionhash');
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                mockTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
            when(mockBlockchainUtils.getDecodedRfqOrderFillEventLogFromLogs(anything())).thenReturn({
                event: '',
                logIndex: null,
                transactionIndex: null,
                transactionHash: '',
                blockHash: '',
                address: '',
                data: '',
                blockNumber: 0,
                topics: [],
                args: {
                    maker: '',
                    makerToken: '',
                    makerTokenFilledAmount: new BigNumber(1234),
                    orderHash: '',
                    pool: '',
                    taker: '',
                    takerToken: '',
                    takerTokenFilledAmount: new BigNumber(5),
                },
            });
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                protocolFeeUtils: instance(mockProtocolFeeUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const result = await rfqmService.submitJobToChainAsync(
                job,
                '0xworkeraddress',
                '0xcalldata',
                new Date(fakeClockMs),
            );

            expect(result).to.equal(RfqmJobStatus.FailedExpired);
        });

        it('recovers a PRESUBMIT transaction which actually submitted', async () => {
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeFiveMinutesLater),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: true,
                makerUri: 'http://foo.bar',
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeFiveMinutesLater.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingLastLookAccepted,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockPresubmitTransaction = new RfqmV2TransactionSubmissionEntity({
                createdAt: new Date(1233),
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                status: RfqmTransactionSubmissionStatus.Presubmit,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
            });
            const mockTransactionReceipt: providers.TransactionReceipt = {
                blockHash: '0xblockhash',
                blockNumber: 1,
                byzantium: true,
                confirmations: 3,
                contractAddress: '0xexchangeproxyaddress',
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                from: '0xfrom',
                gasUsed: EthersBigNumber.from(10000),
                logs: [],
                logsBloom: '',
                status: 1,
                to: '0xto',
                transactionHash: '0xpresubmittransactionhash',
                transactionIndex: 0,
                type: 2,
            };
            const mockTransactionResponse: providers.TransactionResponse = {
                chainId: 1,
                confirmations: 0,
                data: '',
                from: '0xfrom',
                gasLimit: EthersBigNumber.from(1000000),
                hash: '0xpresubmittransactionhash',
                nonce: 0,
                type: 2,
                value: EthersBigNumber.from(0),
                wait: (_confirmations: number | undefined) => Promise.resolve(mockTransactionReceipt),
            };
            const mockMinedBlock: providers.Block = {
                _difficulty: EthersBigNumber.from(2),
                difficulty: 2,
                extraData: '',
                gasLimit: EthersBigNumber.from(1000),
                gasUsed: EthersBigNumber.from(1000),
                hash: '0xblockhash',
                miner: '0xminer',
                nonce: '0x000',
                number: 21,
                parentHash: '0xparentblockhash',
                timestamp: 12345,
                transactions: ['0xpresubmittransactionhash'],
            };
            const mockNonce = 0;

            const mockProtocolFeeUtils = mock(ProtocolFeeUtils);
            when(mockProtocolFeeUtils.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(10));
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([
                mockPresubmitTransaction,
            ]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const updateRfqmTransactionSubmissionsCalledArgs: RfqmV2TransactionSubmissionEntity[][] = [];
            when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            // This mock response indicates that the transaction is present in the mempool
            when(mockBlockchainUtils.getTransactionAsync('0xpresubmittransactionhash')).thenResolve(
                mockTransactionResponse,
            );
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(mockBlockchainUtils.estimateGasForExchangeProxyCallAsync(anything(), '0xworkeraddress')).thenReject(
                new Error('estimateGasForExchangeProxyCallAsync called during recovery'),
            );
            when(mockBlockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(anything())).thenReturn(
                new BigNumber(123),
            );
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xpresubmittransactionhash']))).thenResolve([
                mockTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getBlockAsync('0xblockhash')).thenResolve(mockMinedBlock);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
            when(mockBlockchainUtils.getDecodedRfqOrderFillEventLogFromLogs(anything())).thenReturn({
                event: '',
                logIndex: null,
                transactionIndex: null,
                transactionHash: '',
                blockHash: '',
                address: '',
                data: '',
                blockNumber: 0,
                topics: [],
                args: {
                    maker: '',
                    makerToken: '',
                    makerTokenFilledAmount: new BigNumber(1234),
                    orderHash: '',
                    pool: '',
                    taker: '',
                    takerToken: '',
                    takerTokenFilledAmount: new BigNumber(5),
                },
            });
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                protocolFeeUtils: instance(mockProtocolFeeUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            await rfqmService.submitJobToChainAsync(job, '0xworkeraddress', '0xcalldata', new Date(fakeClockMs));

            // Logic should first check to see if the transaction was actually sent.
            // If it was (and it is being mock so in this test) then the logic first
            // updates the status of the transaction to "Submitted"
            expect(updateRfqmTransactionSubmissionsCalledArgs[0][0].status).to.equal(
                RfqmTransactionSubmissionStatus.Submitted,
            );
            // The logic then enters the watch loop. On the first check, a transaction
            // receipt exists for this transaction and it will be marked "confirmed"
            expect(updateRfqmTransactionSubmissionsCalledArgs[1][0].status).to.equal(
                RfqmTransactionSubmissionStatus.SucceededConfirmed,
            );
            expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1].status).to.equal(
                RfqmJobStatus.SucceededConfirmed,
            );
        });

        it('finalizes a job to FAILED_EXPIRED once the expiration window has passed', async () => {
            const nowMs = Date.now();
            const nowS = Math.round(nowMs / ONE_SECOND_MS);
            const oneMinuteAgoS = nowS - 60;
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(oneMinuteAgoS),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: true,
                makerUri: 'http://foo.bar',
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(oneMinuteAgoS.toString()),
                            new BigNumber(1),
                            new BigNumber(1),
                        ).toString(),
                        maker: '0xmaker',
                        makerAmount: '1000000',
                        makerToken: '0xmakertoken',
                        taker: '0xtaker',
                        takerAmount: '10000000',
                        takerToken: '0xtakertoken',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '0xorderhash',
                status: RfqmJobStatus.PendingSubmitted,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockTransaction = new RfqmV2TransactionSubmissionEntity({
                createdAt: new Date(1233),
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                status: RfqmTransactionSubmissionStatus.Submitted,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
            });

            const mockProtocolFeeUtils = mock(ProtocolFeeUtils);
            when(mockProtocolFeeUtils.getGasPriceEstimationOrThrowAsync()).thenResolve(new BigNumber(10));
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([
                mockTransaction,
            ]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.estimateGasForExchangeProxyCallAsync(anything(), '0xworkeraddress')).thenResolve(
                100,
            );
            when(mockBlockchainUtils.getTakerTokenFillAmountFromMetaTxCallData(anything())).thenReturn(
                new BigNumber(123),
            );
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xpresubmittransactionhash']))).thenResolve([]);
            const rfqmService = buildRfqmServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                protocolFeeUtils: instance(mockProtocolFeeUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const finalStatus = await rfqmService.submitJobToChainAsync(job, '0xworkeraddress', '0xcalldata');

            expect(finalStatus).to.equal(RfqmJobStatus.FailedExpired);
        });
    });

    describe('validateJob', () => {
        it('should return null for valid, unexpired jobs', () => {
            const fakeInFiveMinutesS = fakeClockMs / ONE_SECOND_MS + 360;

            const job = new RfqmJobEntity({
                affiliateAddress: '',
                calldata: '0x000',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeInFiveMinutesS),
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
                    order: {
                        chainId: '1',
                        expiry: fakeInFiveMinutesS.toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        pool: '',
                        salt: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const result = RfqmService.validateJob(job, new Date(fakeClockMs));
            expect(result).to.equal(null);
        });

        it('should return Failed Expired for expired jobs', () => {
            const job = new RfqmJobEntity({
                affiliateAddress: '',
                calldata: '0x000',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeOneMinuteAgoS),
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
                    order: {
                        chainId: '1',
                        expiry: fakeOneMinuteAgoS.toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        pool: '',
                        salt: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.V4Rfq,
                },
                orderHash: '',
                status: RfqmJobStatus.PendingEnqueued,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const result = RfqmService.validateJob(job, new Date(fakeClockMs));
            expect(result).to.equal(RfqmJobStatus.FailedExpired);
        });

        it('should return null for valid, unexpired v2 jobs', () => {
            const fakeInFiveMinutesS = fakeClockMs / ONE_SECOND_MS + 360;

            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeInFiveMinutesS),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            /* expiry */ new BigNumber(fakeInFiveMinutesS),
                            /* nonceBucket */ new BigNumber(21),
                            /* nonce */ new BigNumber(0),
                        ).toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '',
                status: RfqmJobStatus.PendingEnqueued,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });

            const result = RfqmService.validateJob(job, new Date(fakeClockMs));
            expect(result).to.equal(null);
        });

        it('should return a No Taker Signature status for v2 jobs with no taker signature', () => {
            const fakeInFiveMinutesS = fakeClockMs / ONE_SECOND_MS + 360;

            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(fakeInFiveMinutesS),
                fee: {
                    amount: '0',
                    token: '',
                    type: 'fixed',
                },
                integratorId: '',
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            /* expiry */ new BigNumber(fakeInFiveMinutesS),
                            /* nonceBucket */ new BigNumber(21),
                            /* nonce */ new BigNumber(0),
                        ).toString(),
                        maker: '',
                        makerAmount: '',
                        makerToken: '',
                        taker: '',
                        takerAmount: '',
                        takerToken: '',
                        txOrigin: '',
                        verifyingContract: '',
                    },
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '',
                status: RfqmJobStatus.PendingEnqueued,
                takerSignature: null,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const result = RfqmService.validateJob(job, new Date(fakeClockMs));
            expect(result).to.equal(RfqmJobStatus.FailedValidationNoTakerSignature);
        });
    });

    describe('shouldResubmitTransaction', () => {
        it('should return false if new gas price < 10% greater than previous', async () => {
            const gasFees = { maxFeePerGas: new BigNumber(100), maxPriorityFeePerGas: new BigNumber(10) };
            const newGasPrice = new BigNumber(105);

            expect(RfqmService.shouldResubmitTransaction(gasFees, newGasPrice)).to.equal(false);
        });
        it('should return true if new gas price is 10% greater than previous', async () => {
            const gasFees = { maxFeePerGas: new BigNumber(100), maxPriorityFeePerGas: new BigNumber(10) };
            const newGasPrice = new BigNumber(110);

            expect(RfqmService.shouldResubmitTransaction(gasFees, newGasPrice)).to.equal(true);
        });
        it('should return true if new gas price > 10% greater than previous', async () => {
            const gasFees = { maxFeePerGas: new BigNumber(100), maxPriorityFeePerGas: new BigNumber(10) };
            const newGasPrice = new BigNumber(120);

            expect(RfqmService.shouldResubmitTransaction(gasFees, newGasPrice)).to.equal(true);
        });
    });
});
