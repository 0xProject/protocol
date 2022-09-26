// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { pino } from '@0x/api-utils';
import { QuoteRequestor, SignatureType } from '@0x/asset-swapper';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { OtcOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import { BigNumber as EthersBigNumber, providers } from 'ethers';
import * as _ from 'lodash';
import { Producer } from 'sqs-producer';
import { anything, capture, deepEqual, instance, mock, spy, verify, when } from 'ts-mockito';

import { ETH_DECIMALS, GWEI_DECIMALS, ONE_SECOND_MS } from '../../src/constants';
import {
    MetaTransactionJobEntity,
    RfqmJobEntity,
    RfqmTransactionSubmissionEntity,
    RfqmV2JobEntity,
    RfqmV2QuoteEntity,
    RfqmV2TransactionSubmissionEntity,
} from '../../src/entities';
import { MetaTransactionJobConstructorOpts } from '../../src/entities/MetaTransactionJobEntity';
import {
    MetaTransactionSubmissionEntity,
    MetaTransactionSubmissionEntityConstructorOpts,
} from '../../src/entities/MetaTransactionSubmissionEntity';
import {
    RfqmJobStatus,
    RfqmOrderTypes,
    RfqmTransactionSubmissionStatus,
    RfqmTransactionSubmissionType,
    SubmissionContextStatus,
} from '../../src/entities/types';
import { logger } from '../../src/logger';
import { RfqMakerBalanceCacheService } from '../../src/services/rfq_maker_balance_cache_service';
import { WorkerService } from '../../src/services/WorkerService';
import { CacheClient } from '../../src/utils/cache_client';
import { GasStationAttendant } from '../../src/utils/GasStationAttendant';
import { GasStationAttendantEthereum } from '../../src/utils/GasStationAttendantEthereum';
import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { RfqmDbUtils } from '../../src/utils/rfqm_db_utils';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { RfqMakerManager } from '../../src/utils/rfq_maker_manager';
import { padSignature } from '../../src/utils/signature_utils';
import { SubmissionContext } from '../../src/utils/SubmissionContext';
import {
    MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
    MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
    MOCK_META_TRANSACTION,
} from '../constants';

// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-loss-of-precision
const NEVER_EXPIRES = new BigNumber(9999999999999999);
const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';
const MOCK_GAS_PRICE = new BigNumber(100);
const MOCK_MM_URI = 'https://mm-address';
const TEST_RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS = 50;
const WORKER_FULL_BALANCE_WEI = new BigNumber(1).shiftedBy(ETH_DECIMALS);
let loggerSpy: pino.Logger;

const buildWorkerServiceForUnitTest = (
    overrides: {
        cacheClient?: CacheClient;
        dbUtils?: RfqmDbUtils;
        rfqMakerBalanceCacheService?: RfqMakerBalanceCacheService;
        rfqMakerManager?: RfqMakerManager;
        gasStationAttendant?: GasStationAttendant;
        quoteServerClient?: QuoteServerClient;
        rfqBlockchainUtils?: RfqBlockchainUtils;
        initialMaxPriorityFeePerGasGwei?: number;
        enableAccessList?: boolean;
    } = {},
): WorkerService => {
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

    const gasStationAttendantMock = mock(GasStationAttendantEthereum);
    when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(MOCK_GAS_PRICE);
    const gasStationAttendantInstance = instance(gasStationAttendantMock);

    const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
    when(rfqBlockchainUtilsMock.getAccountBalanceAsync(MOCK_WORKER_REGISTRY_ADDRESS)).thenResolve(
        WORKER_FULL_BALANCE_WEI,
    );
    const sqsMock = mock(Producer);
    when(sqsMock.queueSize()).thenResolve(0);
    const quoteServerClientMock = mock(QuoteServerClient);

    const cacheClientMock = mock(CacheClient);
    const defaultDbUtilsMock = mock(RfqmDbUtils);
    const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
    const rfqMakerManagerMock = mock(RfqMakerManager);

    return new WorkerService(
        1,
        overrides.gasStationAttendant || gasStationAttendantInstance,
        MOCK_WORKER_REGISTRY_ADDRESS,
        overrides.rfqBlockchainUtils || instance(rfqBlockchainUtilsMock),
        overrides.dbUtils || instance(defaultDbUtilsMock),
        overrides.quoteServerClient || quoteServerClientMock,
        TEST_RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS,
        overrides.cacheClient || cacheClientMock,
        overrides.rfqMakerBalanceCacheService || instance(rfqMakerBalanceCacheServiceMock),
        overrides.rfqMakerManager || rfqMakerManagerMock,
        overrides.initialMaxPriorityFeePerGasGwei || 2,
        overrides.enableAccessList,
    );
};

const createMeaTrsanctionJobEntity = (
    opts: MetaTransactionJobConstructorOpts,
    id: string,
): MetaTransactionJobEntity => {
    const job = new MetaTransactionJobEntity(opts);
    job.id = id;
    return job;
};

const createMetaTransactionSubmissionEntity = (
    opts: MetaTransactionSubmissionEntityConstructorOpts,
    id: string,
): MetaTransactionSubmissionEntity => {
    const submission = new MetaTransactionSubmissionEntity(opts);
    submission.id = id;
    return submission;
};

const fakeClockMs = 1637722898000;
const fakeOneMinuteAgoS = fakeClockMs / ONE_SECOND_MS - 60;
const fakeFiveMinutesLater = fakeClockMs / ONE_SECOND_MS + 300;

const maker = '0xbb004090d26845b672f17c6da4b7d162df3bfc5e';
const orderHash = '0x112160fb0933ecde720f63b50b303ce64e52ded702bef78b9c20361f3652a462';

// This sig actually belongs to the maker above
const validEIP712Sig = {
    signatureType: SignatureType.EIP712,
    v: 28,
    r: '0xdc158f7b53b940863bc7b001552a90282e51033f29b73d44a2701bd16faa19d2',
    s: '0x55f6c5470e41b39a5ddeb63c22f8ba1d34748f93265715b9dc4a0f10138985a6',
};

// This is a real signature that had a missing byte
const missingByteSig = {
    r: '0x568b31076e1c65954adb1bccc723718b3460f1b699ce1252f8a83bda0d521005',
    s: '0x0307cc7f4161df812f7e5a651b23dbd33981c0410df0dd820a52f61be7a5ab',
    v: 28,
    signatureType: SignatureType.EthSign,
};

jest.setTimeout(ONE_SECOND_MS * 120);

describe('WorkerService', () => {
    beforeEach(() => {
        loggerSpy = spy(logger);
    });

    describe('workerBeforeLogicAsync', () => {
        it('calls `processJobAsync` with the correct arguments', async () => {
            const workerIndex = 0;
            const workerAddress = MOCK_WORKER_REGISTRY_ADDRESS;
            const jobId = 'jobId';
            const metaTransactionJob = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );
            const rfqmV2Job = new RfqmV2JobEntity({
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
                            new BigNumber(fakeFiveMinutesLater),
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
                workerAddress,
            });

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );

            const blockchainUtilsMock = mock(RfqBlockchainUtils);
            when(blockchainUtilsMock.getAccountBalanceAsync(workerAddress)).thenResolve(WORKER_FULL_BALANCE_WEI);

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2UnresolvedJobsAsync(workerAddress, anything())).thenResolve([rfqmV2Job]);
            when(dbUtilsMock.findUnresolvedMetaTransactionJobsAsync(workerAddress, anything())).thenResolve([
                metaTransactionJob,
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(dbUtilsMock),
                rfqBlockchainUtils: instance(blockchainUtilsMock),
                gasStationAttendant: instance(gasStationAttendantMock),
            });
            const spiedRfqmService = spy(rfqmService);
            when(spiedRfqmService.processJobAsync(anything(), anything(), anything())).thenResolve();

            await rfqmService.workerBeforeLogicAsync(workerIndex, workerAddress);
            verify(spiedRfqmService.processJobAsync(orderHash, workerAddress, 'rfqm_v2_job')).once();
            verify(spiedRfqmService.processJobAsync(jobId, workerAddress, 'meta_transaction_job')).once();
        });
    });

    describe('processJobAsync', () => {
        it('fails if no rfqm v2 job is found', async () => {
            // Return `undefined` for v1 and v2 job for orderhash
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobByOrderHashAsync('0xorderhash')).thenResolve(null);

            const rfqmService = buildWorkerServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            await rfqmService.processJobAsync('0xorderhash', '0xworkeraddress');
            expect(capture(loggerSpy.error).last()[0]).to.include({
                errorMessage: 'No job found for identifier',
            });
        });

        it('fails if a worker ends up with a job assigned to a different worker for a rfqm v2 job', async () => {
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobByOrderHashAsync('0xorderhash')).thenResolve(
                new RfqmV2JobEntity({
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
                    workerAddress: '0xwrongworkeraddress',
                }),
            );

            const rfqmService = buildWorkerServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            await rfqmService.processJobAsync('0xorderhash', '0xworkeraddress');
            expect(capture(loggerSpy.error).last()[0]).to.include({
                errorMessage: 'Worker was sent a job claimed by a different worker',
            });
        });

        it('fails if no meta-transaction job is found', async () => {
            const dbUtilsMock = mock(RfqmDbUtils);
            const jobId = 'jobId';
            when(dbUtilsMock.findMetaTransactionJobByIdAsync(jobId)).thenResolve(null);

            const rfqmService = buildWorkerServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            await rfqmService.processJobAsync(jobId, '0xworkeraddress', 'meta_transaction_job');
            expect(capture(loggerSpy.error).last()[0]).to.include({
                errorMessage: 'No job found for identifier',
            });
        });

        it('fails if a worker ends up with a job assigned to a different worker for a meta-transaction job', async () => {
            const jobId = 'jobId';
            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: 'inputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xwrongworkeraddress',
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    approvalSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                },
                jobId,
            );

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findMetaTransactionJobByIdAsync(jobId)).thenResolve(job);

            const rfqmService = buildWorkerServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

            await rfqmService.processJobAsync(jobId, '0xworkeraddress', 'meta_transaction_job');
            expect(capture(loggerSpy.error).last()[0]).to.include({
                errorMessage: 'Worker was sent a job claimed by a different worker',
            });
        });
    });

    describe('processApprovalAndTradeAsync', () => {
        it('throws if non-approval job is supplied to the method for a rfqm v2 job', async () => {
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

            const rfqmService = buildWorkerServiceForUnitTest();

            try {
                await rfqmService.processApprovalAndTradeAsync(job, '0xworkeraddress');
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain(
                    'Non-approval job should not be processed by `processApprovalAndTradeAsync`',
                );
            }
        });

        it('should not proceed to trade transaction if the status of approval transaction is not `SucceededConfirmed` for a rfqm v2 job', async () => {
            const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(nowS + 10),
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
                            new BigNumber(nowS + 10),
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
                approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                approvalSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
            });
            const mockPresubmitTransaction = new RfqmV2TransactionSubmissionEntity({
                createdAt: new Date(1233),
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                status: RfqmTransactionSubmissionStatus.Submitted,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
                type: RfqmTransactionSubmissionType.Approval,
            });
            const mockTransactionReceipt: providers.TransactionReceipt = {
                blockHash: '0xblockhash',
                blockNumber: 1,
                byzantium: true,
                confirmations: 3,
                contractAddress: '0xexchangeproxyaddress',
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                from: '0xworkeraddress',
                gasUsed: EthersBigNumber.from(10000),
                logs: [],
                logsBloom: '',
                status: 0,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
                transactionIndex: 0,
                type: 2,
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

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );

            const mockDbUtils = mock(RfqmDbUtils);
            // when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            when(
                mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    anything(),
                    RfqmTransactionSubmissionType.Approval,
                ),
            ).thenResolve([mockPresubmitTransaction]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });

            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.isValidOrderSignerAsync(anything(), anything())).thenResolve(true);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything())).thenResolve([new BigNumber(1000000000)]);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                '0xcalldata',
            );
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
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

            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            await rfqmService.processApprovalAndTradeAsync(job, '0xworkeraddress');
            expect(updateRfqmJobCalledArgs[0].status).to.equal(RfqmJobStatus.PendingProcessing);
            expect(updateRfqmJobCalledArgs[1].status).to.equal(RfqmJobStatus.PendingLastLookAccepted);
            expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1].status).to.equal(
                RfqmJobStatus.FailedRevertedConfirmed,
            );
            expect(job.status).to.equal(RfqmJobStatus.FailedRevertedConfirmed);
        });

        it('should proceed to trade transaction if the status of approval transaction is `SucceededConfirmed` for a rfqm v2 job', async () => {
            const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(nowS + 10),
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
                            new BigNumber(nowS + 10),
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
                approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                approvalSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
            });
            const mockPresubmitApprovalTransaction = new RfqmV2TransactionSubmissionEntity({
                createdAt: new Date(1233),
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                status: RfqmTransactionSubmissionStatus.Submitted,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
                type: RfqmTransactionSubmissionType.Approval,
            });
            const mockPresubmitTradeTransaction = new RfqmV2TransactionSubmissionEntity({
                createdAt: new Date(1233),
                from: '0xworkeraddress',
                maxFeePerGas: new BigNumber(100000),
                maxPriorityFeePerGas: new BigNumber(100),
                nonce: 0,
                orderHash: '0xorderhash',
                status: RfqmTransactionSubmissionStatus.Submitted,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
                type: RfqmTransactionSubmissionType.Trade,
            });
            const mockTransactionReceipt: providers.TransactionReceipt = {
                blockHash: '0xblockhash',
                blockNumber: 1,
                byzantium: true,
                confirmations: 3,
                contractAddress: '0xexchangeproxyaddress',
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                from: '0xworkeraddress',
                gasUsed: EthersBigNumber.from(10000),
                logs: [],
                logsBloom: '',
                status: 1,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xpresubmittransactionhash',
                transactionIndex: 0,
                type: 2,
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

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );

            const mockDbUtils = mock(RfqmDbUtils);
            // when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            when(
                mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    anything(),
                    RfqmTransactionSubmissionType.Approval,
                ),
            ).thenResolve([mockPresubmitApprovalTransaction]);
            when(
                mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    anything(),
                    RfqmTransactionSubmissionType.Trade,
                ),
            ).thenResolve([mockPresubmitTradeTransaction]);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([
                mockPresubmitTradeTransaction,
            ]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });

            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.isValidOrderSignerAsync(anything(), anything())).thenResolve(true);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything())).thenResolve([new BigNumber(1000000000)]);
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
            ).thenReturn('0xcalldata');
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                '0xcalldata',
            );
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
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

            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            await rfqmService.processApprovalAndTradeAsync(job, '0xworkeraddress');
            expect(updateRfqmJobCalledArgs[0].status).to.equal(RfqmJobStatus.PendingProcessing);
            expect(updateRfqmJobCalledArgs[1].status).to.equal(RfqmJobStatus.PendingLastLookAccepted);
            expect(updateRfqmJobCalledArgs[2].status).to.equal(RfqmJobStatus.PendingSubmitted);
            expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1].status).to.equal(
                RfqmJobStatus.SucceededConfirmed,
            );
            expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
        });

        it('throws if non-approval job is supplied to the method for a meta-transaction job', async () => {
            const jobId = 'jobId';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );

            const rfqmService = buildWorkerServiceForUnitTest();

            try {
                await rfqmService.processApprovalAndTradeAsync(job, '0xworkeraddress');
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain(
                    'Non-approval job should not be processed by `processApprovalAndTradeAsync`',
                );
            }
        });

        it('should not proceed to trade transaction if the status of approval transaction is not `SucceededConfirmed` for a meta-transaction job', async () => {
            const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
            const jobId = 'jobId';
            const transactionSubmissionId = 'submissionId';
            const inputToken = '0xinputToken';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS + 600),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken,
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    approvalSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                },
                jobId,
            );
            const mockTransaction = createMetaTransactionSubmissionEntity(
                {
                    from: '0xworkeraddress',
                    metaTransactionJobId: jobId,
                    maxFeePerGas: new BigNumber(100000),
                    maxPriorityFeePerGas: new BigNumber(100),
                    nonce: 0,
                    to: '0xexchangeproxyaddress',
                    transactionHash: '0xsignedtransactionhash',
                    type: RfqmTransactionSubmissionType.Approval,
                    status: RfqmTransactionSubmissionStatus.Submitted,
                },
                transactionSubmissionId,
            );
            const mockTransactionReceipt: providers.TransactionReceipt = {
                blockHash: '0xblockhash',
                blockNumber: 1,
                byzantium: true,
                confirmations: 3,
                contractAddress: '0xexchangeproxyaddress',
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                from: '0xworkeraddress',
                gasUsed: EthersBigNumber.from(10000),
                logs: [],
                logsBloom: '',
                status: 0,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xsignedtransactionhash',
                transactionIndex: 0,
                type: 2,
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
                transactions: ['0xsignedtransactionhash'],
            };
            const mockNonce = 0;

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );

            const mockDbUtils = mock(RfqmDbUtils);
            when(
                mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Approval),
            ).thenResolve([mockTransaction]);
            const updateRfqmJobCalledArgs: MetaTransactionJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.isValidOrderSignerAsync(anything(), anything())).thenResolve(true);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything())).thenResolve([new BigNumber(1000000000)]);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(inputToken, anything(), anything())).thenResolve(
                '0xcalldata',
            );
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                mockTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getBlockAsync('0xblockhash')).thenResolve(mockMinedBlock);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            await rfqmService.processApprovalAndTradeAsync(job, '0xworkeraddress');
            expect(updateRfqmJobCalledArgs[0].status).to.equal(RfqmJobStatus.PendingProcessing);
            expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1].status).to.equal(
                RfqmJobStatus.FailedRevertedConfirmed,
            );
            expect(job.status).to.equal(RfqmJobStatus.FailedRevertedConfirmed);
        });

        it('should proceed to trade transaction if the status of approval transaction is `SucceededConfirmed` for a meta-transaction job', async () => {
            const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
            const jobId = 'jobId';
            const transactionSubmissionId1 = 'submissionId1';
            const transactionSubmissionId2 = 'submissionId2';
            const inputToken = '0xinputToken';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS + 600),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken,
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    approvalSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                },
                jobId,
            );
            const mockApprovalTransaction = createMetaTransactionSubmissionEntity(
                {
                    from: '0xworkeraddress',
                    metaTransactionJobId: jobId,
                    maxFeePerGas: new BigNumber(100000),
                    maxPriorityFeePerGas: new BigNumber(100),
                    nonce: 0,
                    to: '0xexchangeproxyaddress',
                    transactionHash: '0xsignedtransactionhash1',
                    type: RfqmTransactionSubmissionType.Approval,
                    status: RfqmTransactionSubmissionStatus.Submitted,
                },
                transactionSubmissionId1,
            );
            const mockTradeTransaction = createMetaTransactionSubmissionEntity(
                {
                    from: '0xworkeraddress',
                    metaTransactionJobId: jobId,
                    maxFeePerGas: new BigNumber(100000),
                    maxPriorityFeePerGas: new BigNumber(100),
                    nonce: 0,
                    to: '0xexchangeproxyaddress',
                    transactionHash: '0xsignedtransactionhash2',
                    type: RfqmTransactionSubmissionType.Trade,
                    status: RfqmTransactionSubmissionStatus.Submitted,
                },
                transactionSubmissionId2,
            );
            const mockApprovalTransactionReceipt: providers.TransactionReceipt = {
                blockHash: '0xblockhash',
                blockNumber: 1,
                byzantium: true,
                confirmations: 3,
                contractAddress: '0xexchangeproxyaddress',
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                from: '0xworkeraddress',
                gasUsed: EthersBigNumber.from(10000),
                logs: [],
                logsBloom: '',
                status: 1,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xsignedtransactionhash1',
                transactionIndex: 0,
                type: 2,
            };
            const mockTradeTransactionReceipt: providers.TransactionReceipt = {
                blockHash: '0xblockhash',
                blockNumber: 1,
                byzantium: true,
                confirmations: 3,
                contractAddress: '0xexchangeproxyaddress',
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                from: '0xworkeraddress',
                gasUsed: EthersBigNumber.from(10000),
                logs: [],
                logsBloom: '',
                status: 1,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xsignedtransactionhash2',
                transactionIndex: 0,
                type: 2,
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
                transactions: ['0xsignedtransactionhash1', '0xsignedtransactionhash2'],
            };
            const mockNonce = 0;

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );

            const mockDbUtils = mock(RfqmDbUtils);
            when(
                mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Approval),
            ).thenResolve([mockApprovalTransaction]);
            when(
                mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Trade),
            ).thenResolve([mockTradeTransaction]);
            when(mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId)).thenResolve([mockTradeTransaction]);
            const updateRfqmJobCalledArgs: MetaTransactionJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.isValidOrderSignerAsync(anything(), anything())).thenResolve(true);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything())).thenResolve([new BigNumber(1000000000)]);
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(0);
            when(mockBlockchainUtils.generateMetaTransactionCallData(anything(), anything(), anything())).thenReturn(
                '0xcalldata',
            );
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                '0xcalldata',
            );
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash1']))).thenResolve([
                mockApprovalTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash2']))).thenResolve([
                mockTradeTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getBlockAsync('0xblockhash')).thenResolve(mockMinedBlock);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            await rfqmService.processApprovalAndTradeAsync(job, '0xworkeraddress');
            expect(updateRfqmJobCalledArgs[0].status).to.equal(RfqmJobStatus.PendingProcessing);
            expect(updateRfqmJobCalledArgs[1].status).to.equal(RfqmJobStatus.PendingSubmitted);
            expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1].status).to.equal(
                RfqmJobStatus.SucceededConfirmed,
            );
            expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
        });
    });

    describe('processTradeAsync', () => {
        it('should process a rfqm v2 job trade successfully', async () => {
            const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
            const job = new RfqmV2JobEntity({
                affiliateAddress: '',
                chainId: 1,
                createdAt: new Date(),
                expiry: new BigNumber(nowS + 10),
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
                            new BigNumber(nowS + 10),
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
                workerAddress: '0xworkeraddress',
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
                type: RfqmTransactionSubmissionType.Trade,
            });
            const mockTransactionReceipt: providers.TransactionReceipt = {
                blockHash: '0xblockhash',
                blockNumber: 1,
                byzantium: true,
                confirmations: 3,
                contractAddress: '0xexchangeproxyaddress',
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                from: '0xworkeraddress',
                gasUsed: EthersBigNumber.from(10000),
                logs: [],
                logsBloom: '',
                status: 1,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xsignedtransactionhash',
                transactionIndex: 0,
                type: 2,
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

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            when(
                mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    anything(),
                    RfqmTransactionSubmissionType.Trade,
                ),
            ).thenResolve([]);
            when(mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash')).thenResolve(
                _.cloneDeep(mockTransaction),
            );

            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
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
            ).thenReturn('0xcalldata');
            when(
                mockBlockchainUtils.estimateGasForFillTakerSignedOtcOrderAsync(
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                    anything(),
                ),
            ).thenResolve(0);
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
            when(
                mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
            ).thenReturn(mockTransactionRequest);
            when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve('0xsignedtransactionhash');
            when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                signedTransaction: 'signedTransaction',
                transactionHash: '0xsignedtransactionhash',
            });
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                mockTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getBlockAsync('0xblockhash')).thenResolve(mockMinedBlock);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            await rfqmService.processTradeAsync(job, '0xworkeraddress');
            expect(updateRfqmJobCalledArgs[0].status).to.equal(RfqmJobStatus.PendingProcessing);
            expect(updateRfqmJobCalledArgs[1].status).to.equal(RfqmJobStatus.PendingLastLookAccepted);
            expect(updateRfqmJobCalledArgs[2].status).to.equal(RfqmJobStatus.PendingSubmitted);
            expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1].status).to.equal(
                RfqmJobStatus.SucceededConfirmed,
            );
            expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
        });

        it('should process a meta-transaction job trade successfully', async () => {
            const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
            const jobId = 'jobId';
            const transactionSubmissionId = 'submissionId';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS + 600),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );

            const mockTransactionRequest: providers.TransactionRequest = {};
            const mockTransaction = createMetaTransactionSubmissionEntity(
                {
                    from: '0xworkeraddress',
                    metaTransactionJobId: jobId,
                    maxFeePerGas: new BigNumber(100000),
                    maxPriorityFeePerGas: new BigNumber(100),
                    nonce: 0,
                    to: '0xexchangeproxyaddress',
                    transactionHash: '0xsignedtransactionhash',
                    type: RfqmTransactionSubmissionType.Trade,
                },
                transactionSubmissionId,
            );
            const mockTransactionReceipt: providers.TransactionReceipt = {
                blockHash: '0xblockhash',
                blockNumber: 1,
                byzantium: true,
                confirmations: 3,
                contractAddress: '0xexchangeproxyaddress',
                cumulativeGasUsed: EthersBigNumber.from(1000),
                effectiveGasPrice: EthersBigNumber.from(1000),
                from: '0xworkeraddress',
                gasUsed: EthersBigNumber.from(10000),
                logs: [],
                logsBloom: '',
                status: 1,
                to: '0xexchangeproxyaddress',
                transactionHash: '0xsignedtransactionhash',
                transactionIndex: 0,
                type: 2,
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

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId)).thenResolve([]);
            const updateRfqmJobCalledArgs: MetaTransactionJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            when(
                mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Trade),
            ).thenResolve([]);
            when(
                mockDbUtils.findMetaTransactionSubmissionsByTransactionHashAsync(
                    '0xsignedtransactionhash',
                    RfqmTransactionSubmissionType.Trade,
                ),
            ).thenResolve([_.cloneDeep(mockTransaction)]);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
            when(mockBlockchainUtils.generateMetaTransactionCallData(anything(), anything(), anything())).thenReturn(
                '0xcalldata',
            );
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(0);
            when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
            when(
                mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
            ).thenReturn(mockTransactionRequest);
            when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve('0xsignedtransactionhash');
            when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                signedTransaction: 'signedTransaction',
                transactionHash: '0xsignedtransactionhash',
            });
            when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                mockTransactionReceipt,
            ]);
            when(mockBlockchainUtils.getBlockAsync('0xblockhash')).thenResolve(mockMinedBlock);
            when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            await rfqmService.processTradeAsync(job, '0xworkeraddress');
            expect(updateRfqmJobCalledArgs[0].status).to.equal(RfqmJobStatus.PendingProcessing);
            expect(updateRfqmJobCalledArgs[1].status).to.equal(RfqmJobStatus.PendingSubmitted);
            expect(updateRfqmJobCalledArgs[updateRfqmJobCalledArgs.length - 1].status).to.equal(
                RfqmJobStatus.SucceededConfirmed,
            );
            expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
        });
    });

    describe('validate job methods', () => {
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

            const result = WorkerService.validateRfqmV2Job(job, new Date(fakeClockMs));
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

            const result = WorkerService.validateRfqmV2Job(job, new Date(fakeClockMs));
            expect(result).to.equal(RfqmJobStatus.FailedValidationNoTakerSignature);
        });

        it('should return null for a valid, unexpired meta-transaction job', () => {
            const fakeInFiveMinutesS = fakeClockMs / ONE_SECOND_MS + 360;

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeInFiveMinutesS),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                'jobId',
            );

            const result = WorkerService.validateMetaTransactionJob(job, new Date(fakeClockMs));
            expect(result).to.equal(null);
        });

        it('should return a failed expired status for a meta-transaction job that expires', () => {
            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeClockMs / ONE_SECOND_MS),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                'jobId',
            );

            const result = WorkerService.validateMetaTransactionJob(job, new Date(fakeClockMs + 1000000));
            expect(result).to.equal(RfqmJobStatus.FailedExpired);
        });
    });

    describe('shouldResubmitTransaction', () => {
        it('should return false if new gas price < 10% greater than previous', async () => {
            const gasFees = { maxFeePerGas: new BigNumber(100), maxPriorityFeePerGas: new BigNumber(10) };
            const newGasPrice = new BigNumber(105);

            expect(WorkerService.shouldResubmitTransaction(gasFees, newGasPrice)).to.equal(false);
        });
        it('should return true if new gas price is 10% greater than previous', async () => {
            const gasFees = { maxFeePerGas: new BigNumber(100), maxPriorityFeePerGas: new BigNumber(10) };
            const newGasPrice = new BigNumber(110);

            expect(WorkerService.shouldResubmitTransaction(gasFees, newGasPrice)).to.equal(true);
        });
        it('should return true if new gas price > 10% greater than previous', async () => {
            const gasFees = { maxFeePerGas: new BigNumber(100), maxPriorityFeePerGas: new BigNumber(10) };
            const newGasPrice = new BigNumber(120);

            expect(WorkerService.shouldResubmitTransaction(gasFees, newGasPrice)).to.equal(true);
        });
    });

    describe('checkJobPreprocessingAsync', () => {
        it('should update job staus and throw error if job validation failed for a rfqm v2 job', async () => {
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
                lastLookResult: null,
                makerUri: 'http://foo.bar',
                makerSignature: null,
                order: {
                    order: {
                        chainId: '1',
                        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                            new BigNumber(fakeOneMinuteAgoS.toString()),
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
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
            });

            try {
                await rfqmService.checkJobPreprocessingAsync(job, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed validation');
                expect(job.status).to.deep.equal(RfqmJobStatus.FailedExpired);
            }
        });

        it('should throw error if there is no taker signature for a rfqm v2 job', async () => {
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
                takerSignature: null,
                updatedAt: new Date(),
                workerAddress: '',
            });

            const mockDbUtils = mock(RfqmDbUtils);
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
            });

            try {
                await rfqmService.checkJobPreprocessingAsync(job, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed validation');
                expect(job.status).to.deep.equal(RfqmJobStatus.FailedValidationNoTakerSignature);
            }
        });

        it('should update job staus to `PendingProcessing` if job status is `PendingEnqueued` for a rfqm v2 job', async () => {
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
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
            });

            await rfqmService.checkJobPreprocessingAsync(job, new Date(fakeClockMs));
            expect(job.status).to.deep.equal(RfqmJobStatus.PendingProcessing);
        });

        it('should update job staus and throw error if job validation failed for a meta-transaction job', async () => {
            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeOneMinuteAgoS),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                'jobId',
            );

            const mockDbUtils = mock(RfqmDbUtils);
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
            });

            try {
                await rfqmService.checkJobPreprocessingAsync(job, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed validation');
                expect(job.status).to.deep.equal(RfqmJobStatus.FailedExpired);
            }
        });

        it('should update job staus to `PendingProcessing` if job status is `PendingEnqueued` for a meta-transaction job', async () => {
            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                'jobId',
            );

            const mockDbUtils = mock(RfqmDbUtils);
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
            });

            await rfqmService.checkJobPreprocessingAsync(job, new Date(fakeClockMs));
            expect(job.status).to.deep.equal(RfqmJobStatus.PendingProcessing);
        });
    });

    describe('prepareApprovalAsync', () => {
        it('should throw exception if there are submitted transactions but job maker signature is null for a rfqm v2 job', async () => {
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
                type: RfqmTransactionSubmissionType.Trade,
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(
                mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    '0xorderhash',
                    RfqmTransactionSubmissionType.Approval,
                ),
            ).thenResolve([mockTransaction]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
            );
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            try {
                await rfqmService.prepareApprovalAsync(job, '0xtoken', MOCK_EXECUTE_META_TRANSACTION_APPROVAL, {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                });
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Encountered a job with submissions but no maker signature');
            }
        });

        it('should return generated calldata if there are submitted transactions for a rfqm v2 job', async () => {
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
                makerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
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
                type: RfqmTransactionSubmissionType.Trade,
            });

            const mockDbUtils = mock(RfqmDbUtils);
            when(
                mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    '0xorderhash',
                    RfqmTransactionSubmissionType.Approval,
                ),
            ).thenResolve([mockTransaction]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
            );
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const calldata = await rfqmService.prepareApprovalAsync(
                job,
                '0xtoken',
                MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
            );
            expect(calldata).to.deep.equal(MOCK_EXECUTE_META_TRANSACTION_CALLDATA);
        });

        it('should throw exception if eth_call failed for a rfqm v2 job', async () => {
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
                makerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
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
            when(
                mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    '0xorderhash',
                    RfqmTransactionSubmissionType.Approval,
                ),
            ).thenResolve([]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
            );
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenThrow(new Error('error'));
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            try {
                await rfqmService.prepareApprovalAsync(job, '0xtoken', MOCK_EXECUTE_META_TRANSACTION_APPROVAL, {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                });
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Eth call approval validation failed');
                expect(job.status).to.deep.equal(RfqmJobStatus.FailedEthCallFailed);
            }
        });

        it('should return correct calldata if there is no submitted transaction for a rfqm v2 job', async () => {
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
                makerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
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
            when(
                mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                    '0xorderhash',
                    RfqmTransactionSubmissionType.Approval,
                ),
            ).thenResolve([]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
            );
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(10);
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const calldata = await rfqmService.prepareApprovalAsync(
                job,
                '0xtoken',
                MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
            );
            expect(calldata).to.deep.equal(MOCK_EXECUTE_META_TRANSACTION_CALLDATA);
        });

        it('should return generated calldata if there are submitted transactions for a meta-transaction job', async () => {
            const jobId = 'jobId';
            const transactionSubmissionId = 'submissionId';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );

            const mockTransaction = createMetaTransactionSubmissionEntity(
                {
                    from: '0xworkeraddress',
                    metaTransactionJobId: jobId,
                    maxFeePerGas: new BigNumber(100000),
                    maxPriorityFeePerGas: new BigNumber(100),
                    nonce: 0,
                    to: '0xexchangeproxyaddress',
                    transactionHash: '0xsignedtransactionhash',
                    type: RfqmTransactionSubmissionType.Approval,
                },
                transactionSubmissionId,
            );

            const mockDbUtils = mock(RfqmDbUtils);
            when(
                mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Approval),
            ).thenResolve([mockTransaction]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
            );
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const calldata = await rfqmService.prepareApprovalAsync(
                job,
                '0xtoken',
                MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
            );
            expect(calldata).to.deep.equal(MOCK_EXECUTE_META_TRANSACTION_CALLDATA);
            verify(mockBlockchainUtils.estimateGasForAsync(anything())).never();
        });

        it('should throw exception if eth_call failed for a meta-transaction job', async () => {
            const jobId = 'jobId';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );

            const mockDbUtils = mock(RfqmDbUtils);
            when(
                mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Approval),
            ).thenResolve([]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
            );
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenThrow(new Error('error'));
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            try {
                await rfqmService.prepareApprovalAsync(job, '0xtoken', MOCK_EXECUTE_META_TRANSACTION_APPROVAL, {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                });
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Eth call approval validation failed');
                expect(job.status).to.deep.equal(RfqmJobStatus.FailedEthCallFailed);
            }
        });

        it('should return correct calldata if there is no submitted transaction for a meta-transaction job', async () => {
            const jobId = 'jobId';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );

            const mockDbUtils = mock(RfqmDbUtils);
            when(
                mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Approval),
            ).thenResolve([]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                MOCK_EXECUTE_META_TRANSACTION_CALLDATA,
            );
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(10);
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            const calldata = await rfqmService.prepareApprovalAsync(
                job,
                '0xtoken',
                MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
            );
            expect(calldata).to.deep.equal(MOCK_EXECUTE_META_TRANSACTION_CALLDATA);
        });
    });

    describe('preparerfqmV2TradeAsync', () => {
        it('updates the job and throws upon validation failure when `shouldCheckLastLook` is true', async () => {
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
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });
            const _job = _.cloneDeep(expiredJob);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const rfqmService = buildWorkerServiceForUnitTest({ dbUtils: instance(mockDbUtils) });

            try {
                await rfqmService.preparerfqmV2TradeAsync(expiredJob, '0xworkeraddress', true, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed validation');
                expect(expiredJob).to.deep.equal({ ..._job, status: RfqmJobStatus.FailedExpired });
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
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([new BigNumber(100)]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(5),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.preparerfqmV2TradeAsync(job, '0xworkeraddress', true, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Order failed pre-sign validation');
                expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.PendingProcessing,
                });
                expect(updateRfqmJobCalledArgs[1]).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedPresignValidationFailed,
                });
                expect(job).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedPresignValidationFailed,
                });
            }
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
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(undefined);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.preparerfqmV2TradeAsync(job, '0xworkeraddress', true, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Market Maker declined to sign');
                expect(job).to.deep.equal({
                    ..._job,
                    lastLookResult: false,
                    status: RfqmJobStatus.FailedLastLookDeclined,
                });
            }
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
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenReject(
                new Error('fake timeout'),
            );
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.preparerfqmV2TradeAsync(job, '0xworkeraddress', true, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed during market maker sign attempt');
                expect(job).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedSignFailed,
                });
            }
        });

        it('handles signer is not the maker', async () => {
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
            const invalidEIP712Sig = _.cloneDeep(validEIP712Sig);
            invalidEIP712Sig.r = '0xdc158f7b53b940863bc7b001552a90282e51033f29b73d44a2701bd16faa19d3';
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(invalidEIP712Sig);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.preparerfqmV2TradeAsync(job, '0xworkeraddress', true, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Invalid order signer address');
                expect(job.status).to.deep.equal(RfqmJobStatus.FailedSignFailed);
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
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(orderHash)).thenResolve([]);
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
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
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.preparerfqmV2TradeAsync(job, '0xworkeraddress', true, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Eth call validation failed');
                expect(job).to.deep.equal({
                    ..._job,
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
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(missingByteSig);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.isValidOrderSignerAsync(anything(), anything())).thenResolve(true);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
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
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            await rfqmService.preparerfqmV2TradeAsync(job, '0xworkeraddress', true, new Date(fakeClockMs));
            expect(job).to.deep.equal({
                ..._job,
                lastLookResult: true,
                makerSignature: padSignature(missingByteSig),
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
                type: RfqmTransactionSubmissionType.Trade,
            });
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([transaction]);
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
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
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            const calldata = await rfqmService.preparerfqmV2TradeAsync(
                job,
                '0xworkeraddress',
                true,
                new Date(fakeClockMs),
            );
            expect(job).to.deep.equal({
                ..._job,
                lastLookResult: true,
                makerSignature: validEIP712Sig,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
            expect(calldata).to.equal('0xvalidcalldata');
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
            // `prepareTradeAsync` will let the job continue to the submission step which
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
                type: RfqmTransactionSubmissionType.Trade,
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

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
            });

            await rfqmService.preparerfqmV2TradeAsync(expiredJob, '0xworkeraddress', true, new Date(fakeClockMs));
            expect(expiredJob.status).to.equal(RfqmJobStatus.PendingSubmitted);
        });

        it('successfully prepares a job when checking last look', async () => {
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
                workerAddress: '0xworkeraddress',
            });
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(orderHash)).thenResolve([]);
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(validEIP712Sig);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
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
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            const calldata = await rfqmService.preparerfqmV2TradeAsync(
                job,
                '0xworkeraddress',
                true,
                new Date(fakeClockMs),
            );
            expect(job).to.deep.equal({
                ..._job,
                lastLookResult: true,
                makerSignature: validEIP712Sig,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
            expect(calldata).to.equal('0xvalidcalldata');
            expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                ..._job,
                status: RfqmJobStatus.PendingProcessing,
            });
            expect(updateRfqmJobCalledArgs[1]).to.deep.equal({
                ..._job,
                lastLookResult: true,
                makerSignature: validEIP712Sig,
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
        });

        it('successfully prepares a job if no last look is necessary', async () => {
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
                status: RfqmJobStatus.PendingLastLookAccepted,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '0xworkeraddress',
            });
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(orderHash)).thenResolve([]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
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
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });
            const spiedRfqmService = spy(rfqmService);

            const calldata = await rfqmService.preparerfqmV2TradeAsync(
                job,
                '0xworkeraddress',
                false,
                new Date(fakeClockMs),
            );
            expect(job).to.deep.equal(_job);
            expect(calldata).to.equal('0xvalidcalldata');
            verify(spiedRfqmService.checkJobPreprocessingAsync(anything(), anything())).never();
            verify(spiedRfqmService.checkLastLookAsync(anything(), anything(), anything())).never();
        });
    });

    describe('prepareMetaTransactionTradeAsync', () => {
        it('updates the job and throws upon validation failure if `shouldValidateJob` is true', async () => {
            const jobId = 'jobId';
            const expiredJob = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeOneMinuteAgoS),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );

            const _job = _.cloneDeep(expiredJob);
            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId)).thenResolve([]);
            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                gasStationAttendant: instance(gasStationAttendantMock),
            });

            try {
                await rfqmService.prepareMetaTransactionTradeAsync(
                    expiredJob,
                    '0xworkeraddress',
                    true,
                    new Date(fakeClockMs),
                );
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed validation');
                expect(expiredJob).to.deep.equal({ ..._job, status: RfqmJobStatus.FailedExpired });
            }
        });

        it('handles an eth_call failure', async () => {
            const jobId = 'jobId';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );
            const _job = _.cloneDeep(job);

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId)).thenResolve([]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenReject(new Error('fake eth call failure'));

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                gasStationAttendant: instance(gasStationAttendantMock),
            });

            try {
                await rfqmService.prepareMetaTransactionTradeAsync(job, '0xworkeraddress', true, new Date(fakeClockMs));
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Eth call validation failed');
                expect(job).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedEthCallFailed,
                });
            }
        });

        it('skips the eth_call for jobs with existing submissions', async () => {
            const jobId = 'jobId';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingProcessing,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );
            const transaction = createMetaTransactionSubmissionEntity(
                {
                    from: '0xworkeraddress',
                    metaTransactionJobId: jobId,
                    maxFeePerGas: new BigNumber(100000),
                    maxPriorityFeePerGas: new BigNumber(100),
                    nonce: 0,
                    to: '0xexchangeproxyaddress',
                    transactionHash: '0xsignedtransactionhash',
                    type: RfqmTransactionSubmissionType.Trade,
                },
                'submissionId',
            );
            const _job = _.cloneDeep(job);

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );
            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId)).thenResolve([transaction]);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.generateMetaTransactionCallData(anything(), anything(), anything())).thenReturn(
                '0xvalidcalldata',
            );

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                gasStationAttendant: instance(gasStationAttendantMock),
            });

            const calldata = await rfqmService.prepareMetaTransactionTradeAsync(
                job,
                '0xworkeraddress',
                true,
                new Date(fakeClockMs),
            );
            expect(job).to.deep.equal(_job);
            expect(calldata).to.equal('0xvalidcalldata');
            verify(mockBlockchainUtils.estimateGasForAsync(anything())).never();
        });

        it('successfully prepares a job if `shouldValidateJob` is true', async () => {
            const jobId = 'jobId';

            const job = createMeaTrsanctionJobEntity(
                {
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(fakeFiveMinutesLater),
                    fee: {
                        amount: new BigNumber(0),
                        token: '',
                        type: 'fixed',
                    },
                    inputToken: '0xinputToken',
                    inputTokenAmount: new BigNumber(10),
                    integratorId: '0xintegrator',
                    metaTransaction: MOCK_META_TRANSACTION,
                    metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                    minOutputTokenAmount: new BigNumber(10),
                    outputToken: '0xoutputToken',
                    takerAddress: '0xtakerAddress',
                    takerSignature: {
                        signatureType: SignatureType.EthSign,
                        v: 1,
                        r: '',
                        s: '',
                    },
                    status: RfqmJobStatus.PendingEnqueued,
                    workerAddress: '0xworkeraddress',
                },
                jobId,
            );
            const _job = _.cloneDeep(job);

            const gasStationAttendantMock = mock(GasStationAttendantEthereum);
            when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                new BigNumber(10).shiftedBy(GWEI_DECIMALS),
            );
            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: MetaTransactionJobEntity[] = [];
            when(mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId)).thenResolve([]);
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(0);
            when(mockBlockchainUtils.generateMetaTransactionCallData(anything(), anything(), anything())).thenReturn(
                '0xvalidcalldata',
            );

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                gasStationAttendant: instance(gasStationAttendantMock),
            });

            const calldata = await rfqmService.prepareMetaTransactionTradeAsync(
                job,
                '0xworkeraddress',
                true,
                new Date(fakeClockMs),
            );
            expect(job).to.deep.equal({
                ..._job,
                status: RfqmJobStatus.PendingProcessing,
            });
            expect(calldata).to.equal('0xvalidcalldata');
            expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                ..._job,
                status: RfqmJobStatus.PendingProcessing,
            });
        });
    });

    describe('checkLastLookAsync', () => {
        it('should call `getMinOfBalancesAndAllowancesAsync` when `shouldCheckAllowance` is true and throws when balance check fails', async () => {
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
                status: RfqmJobStatus.PendingProcessing,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([new BigNumber(100)]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(5),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.checkLastLookAsync(job, '0xworkeraddress', true);
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Order failed pre-sign validation');
                expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedPresignValidationFailed,
                });
                expect(job).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedPresignValidationFailed,
                });
                verify(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).once();
                verify(mockBlockchainUtils.getTokenBalancesAsync(anything())).never();
            }
        });

        it('should call `getTokenBalancesAsync` when `shouldCheckAllowance` is false and throws when balance check fails', async () => {
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
                status: RfqmJobStatus.PendingProcessing,
                takerSignature: {
                    signatureType: SignatureType.EthSign,
                    v: 1,
                    r: '',
                    s: '',
                },
                updatedAt: new Date(),
                workerAddress: '',
            });
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getTokenBalancesAsync(anything())).thenResolve([new BigNumber(100)]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(5),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.checkLastLookAsync(job, '0xworkeraddress', false);
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Order failed pre-sign validation');
                expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedPresignValidationFailed,
                });
                expect(job).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedPresignValidationFailed,
                });

                verify(mockBlockchainUtils.getTokenBalancesAsync(anything())).once();
                verify(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).never();
            }
        });

        it('should throw when taker signature is not present', async () => {
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
                status: RfqmJobStatus.PendingProcessing,
                takerSignature: null,
                updatedAt: new Date(),
                workerAddress: '',
            });
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.checkLastLookAsync(job, '0xworkeraddress', true);
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Order failed pre-sign validation due to empty takerSignature');
                expect(updateRfqmJobCalledArgs[0]).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedPresignValidationFailed,
                });
                expect(job).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedPresignValidationFailed,
                });
            }
        });

        it('handles decline to sign', async () => {
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
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            when(mockDbUtils.findV2QuoteByOrderHashAsync('0xorderhash')).thenResolve(
                new RfqmV2QuoteEntity({
                    createdAt: new Date(),
                    chainId: job.chainId,
                    fee: job.fee,
                    makerUri: job.makerUri,
                    order: job.order,
                    orderHash: job.orderHash,
                }),
            );
            const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
            when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
            });
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(undefined);

            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const mockCacheClient = mock(CacheClient);

            const mockRfqMakerManager = mock(RfqMakerManager);
            when(mockRfqMakerManager.findMakerIdWithRfqmUri(job.makerUri)).thenReturn('makerId1');

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
                rfqMakerManager: instance(mockRfqMakerManager),
                cacheClient: instance(mockCacheClient),
            });

            try {
                await rfqmService.checkLastLookAsync(job, '0xworkeraddress', true);
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Market Maker declined to sign');
                expect(job).to.deep.equal({
                    ..._job,
                    lastLookResult: false,
                    status: RfqmJobStatus.FailedLastLookDeclined,
                });

                verify(
                    mockCacheClient.addMakerToCooldownAsync(
                        'makerId1',
                        anything(),
                        job.chainId,
                        job.order.order.makerToken,
                        job.order.order.takerToken,
                    ),
                ).once();

                verify(
                    mockDbUtils.writeV2LastLookRejectionCooldownAsync(
                        'makerId1',
                        job.chainId,
                        job.order.order.makerToken,
                        job.order.order.takerToken,
                        anything(),
                        anything(),
                        job.orderHash,
                    ),
                ).once();
            }
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
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync('0xorderhash')).thenResolve([]);
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenReject(
                new Error('fake timeout'),
            );
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.checkLastLookAsync(job, '0xworkeraddress', true);
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Job failed during market maker sign attempt');
                expect(job).to.deep.equal({
                    ..._job,
                    status: RfqmJobStatus.FailedSignFailed,
                });
            }
        });

        it('handles signer is not the maker', async () => {
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
            const invalidEIP712Sig = _.cloneDeep(validEIP712Sig);
            invalidEIP712Sig.r = '0xdc158f7b53b940863bc7b001552a90282e51033f29b73d44a2701bd16faa19d3';
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(invalidEIP712Sig);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(1000000000),
            ]);
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            try {
                await rfqmService.checkLastLookAsync(job, '0xworkeraddress', true);
                expect.fail();
            } catch (e) {
                expect(e.message).to.contain('Invalid order signer address');
                expect(job.status).to.deep.equal(RfqmJobStatus.FailedSignFailed);
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
            const _job = _.cloneDeep(job);

            const mockDbUtils = mock(RfqmDbUtils);
            when(mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(anything())).thenResolve([]);
            const mockQuoteServerClient = mock(QuoteServerClient);
            when(mockQuoteServerClient.signV2Async(anything(), anything(), anything())).thenResolve(missingByteSig);
            const mockBlockchainUtils = mock(RfqBlockchainUtils);
            when(mockBlockchainUtils.isValidOrderSignerAsync(anything(), anything())).thenResolve(true);
            when(mockBlockchainUtils.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
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
            const mockRfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
            when(mockRfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(1000000000),
            ]);

            const rfqmService = buildWorkerServiceForUnitTest({
                dbUtils: instance(mockDbUtils),
                quoteServerClient: instance(mockQuoteServerClient),
                rfqBlockchainUtils: instance(mockBlockchainUtils),
                rfqMakerBalanceCacheService: instance(mockRfqMakerBalanceCacheService),
            });

            await rfqmService.checkLastLookAsync(job, '0xworkeraddress', true);
            expect(job).to.deep.equal({
                ..._job,
                lastLookResult: true,
                makerSignature: padSignature(missingByteSig),
                status: RfqmJobStatus.PendingLastLookAccepted,
            });
        });
    });

    describe('submitToChainAsync', () => {
        describe('kind is `rfqm_v2_job`', () => {
            it('submits a transaction successfully when there is no previous transaction', async () => {
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const job = new RfqmV2JobEntity({
                    affiliateAddress: '',
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS + 600),
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
                                new BigNumber(nowS + 600),
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
                    type: RfqmTransactionSubmissionType.Trade,
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                        '0xorderhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([]);
                const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
                when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                    updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
                });
                const writeV2RfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
                when(mockDbUtils.writeV2RfqmTransactionSubmissionToDbAsync(anything())).thenCall(
                    async (transactionArg) => {
                        writeV2RfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                        return _.cloneDeep(mockTransaction);
                    },
                );
                when(
                    mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash'),
                ).thenResolve(_.cloneDeep(mockTransaction));
                const updateRfqmTransactionSubmissionsCalledArgs: RfqmTransactionSubmissionEntity[][] = [];
                when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                    updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
                });
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
                when(
                    mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
                ).thenReturn(mockTransactionRequest);
                when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                    signedTransaction: 'signedTransaction',
                    transactionHash: '0xsignedtransactionhash',
                });
                when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
                when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve(
                    '0xsignedtransactionhash',
                );
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
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                });

                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };
                await rfqmService.submitToChainAsync({
                    kind: job.kind,
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
                    calldata: '0xcalldata',
                    expiry: job.expiry,
                    identifier: job.orderHash,
                    submissionType: RfqmTransactionSubmissionType.Trade,
                    onSubmissionContextStatusUpdate: callback,
                });
                verify(mockBlockchainUtils.estimateGasForAsync(anything()));
                // eth_createAccessList should not be called when not enabled
                verify(mockBlockchainUtils.createAccessListForAsync(anything())).never();
                expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
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
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const job = new RfqmV2JobEntity({
                    affiliateAddress: '',
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS + 600),
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
                                new BigNumber(nowS + 600),
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
                    type: RfqmTransactionSubmissionType.Trade,
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
                    type: RfqmTransactionSubmissionType.Trade,
                });
                const mockTransactionReceipt: providers.TransactionReceipt = {
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                        '0xorderhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([mockPresubmitTransaction]);
                const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
                when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                    updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
                });
                const writeV2RfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
                when(mockDbUtils.writeV2RfqmTransactionSubmissionToDbAsync(anything())).thenCall(
                    async (transactionArg) => {
                        writeV2RfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                        return _.cloneDeep(mockTransaction);
                    },
                );
                when(
                    mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash'),
                ).thenResolve(_.cloneDeep(mockTransaction));
                const updateRfqmTransactionSubmissionsCalledArgs: RfqmV2TransactionSubmissionEntity[][] = [];
                when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                    updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
                });
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                // This mock response indicates that the presubmit transaction can't be found
                // on chain or in the mempool
                when(mockBlockchainUtils.getTransactionAsync('0xpresubmittransactionhash')).thenResolve(null);
                when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
                when(
                    mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
                ).thenReturn(mockTransactionRequest);
                when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                    signedTransaction: 'signedTransaction',
                    transactionHash: '0xsignedtransactionhash',
                });
                when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
                when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve(
                    '0xsignedtransactionhash',
                );
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
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                });

                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };
                await rfqmService.submitToChainAsync({
                    kind: job.kind,
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
                    calldata: '0xcalldata',
                    expiry: job.expiry,
                    identifier: job.orderHash,
                    submissionType: RfqmTransactionSubmissionType.Trade,
                    onSubmissionContextStatusUpdate: callback,
                });

                // eth_createAccessList should not be called when not enabled
                verify(mockBlockchainUtils.createAccessListForAsync(anything())).never();
                expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
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
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const job = new RfqmV2JobEntity({
                    affiliateAddress: '',
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS - 60),
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
                                new BigNumber(nowS - 60),
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
                    type: RfqmTransactionSubmissionType.Trade,
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
                    type: RfqmTransactionSubmissionType.Trade,
                });
                const mockTransactionReceipt: providers.TransactionReceipt = {
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                        '0xorderhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([mockPresubmitTransaction]);
                const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
                when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                    updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
                });
                const writeV2RfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
                when(mockDbUtils.writeV2RfqmTransactionSubmissionToDbAsync(anything())).thenCall(
                    async (transactionArg) => {
                        writeV2RfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                        return _.cloneDeep(mockTransaction);
                    },
                );
                when(
                    mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash'),
                ).thenResolve(_.cloneDeep(mockTransaction));
                const updateRfqmTransactionSubmissionsCalledArgs: RfqmV2TransactionSubmissionEntity[][] = [];
                when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                    updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
                });
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                // This mock response indicates that the presubmit transaction can't be found
                // on chain or in the mempool
                when(mockBlockchainUtils.getTransactionAsync('0xpresubmittransactionhash')).thenResolve(null);
                when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
                when(
                    mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
                ).thenReturn(mockTransactionRequest);
                when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                    signedTransaction: 'signedTransaction',
                    transactionHash: '0xsignedtransactionhash',
                });
                when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
                when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve(
                    '0xsignedtransactionhash',
                );
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
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                });
                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };

                try {
                    await rfqmService.submitToChainAsync({
                        kind: job.kind,
                        to: '0xexchangeproxyaddress',
                        from: '0xworkeraddress',
                        calldata: '0xcalldata',
                        expiry: job.expiry,
                        identifier: job.orderHash,
                        submissionType: RfqmTransactionSubmissionType.Trade,
                        onSubmissionContextStatusUpdate: callback,
                    });
                    expect.fail();
                } catch (e) {
                    expect(e.message).to.contain('Exceed expiry');
                    // eth_createAccessList should not be called when not enabled
                    verify(mockBlockchainUtils.createAccessListForAsync(anything())).never();
                    expect(job.status).to.equal(RfqmJobStatus.FailedExpired);
                }
            });

            it('recovers a PRESUBMIT transaction which actually submitted', async () => {
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const job = new RfqmV2JobEntity({
                    affiliateAddress: '',
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS + 600),
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
                                new BigNumber(nowS + 600),
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
                    type: RfqmTransactionSubmissionType.Trade,
                });
                const mockTransactionReceipt: providers.TransactionReceipt = {
                    blockHash: '0xblockhash',
                    blockNumber: 1,
                    byzantium: true,
                    confirmations: 3,
                    contractAddress: '0xexchangeproxyaddress',
                    cumulativeGasUsed: EthersBigNumber.from(1000),
                    effectiveGasPrice: EthersBigNumber.from(1000),
                    from: '0xworkeraddress',
                    gasUsed: EthersBigNumber.from(10000),
                    logs: [],
                    logsBloom: '',
                    status: 1,
                    to: '0xexchangeproxyaddress',
                    transactionHash: '0xpresubmittransactionhash',
                    transactionIndex: 0,
                    type: 2,
                };
                const mockTransactionResponse: providers.TransactionResponse = {
                    chainId: 1,
                    confirmations: 0,
                    data: '',
                    from: '0xworkeraddress',
                    gasLimit: EthersBigNumber.from(1000000),
                    hash: '0xpresubmittransactionhash',
                    nonce: 0,
                    type: 2,
                    value: EthersBigNumber.from(0),
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                        '0xorderhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([mockPresubmitTransaction]);
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
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenReject(
                    new Error('estimateGasForAsync called during recovery'),
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
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                });
                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };

                await rfqmService.submitToChainAsync({
                    kind: job.kind,
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
                    calldata: '0xcalldata',
                    expiry: job.expiry,
                    identifier: job.orderHash,
                    submissionType: RfqmTransactionSubmissionType.Trade,
                    onSubmissionContextStatusUpdate: callback,
                });

                // eth_createAccessList should not be called when not enabled
                verify(mockBlockchainUtils.createAccessListForAsync(anything())).never();
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
                expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
            });

            it('finalizes a job to FAILED_EXPIRED once the expiration window has passed', async () => {
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const ninetySecondsAgo = nowS - 100;
                const job = new RfqmV2JobEntity({
                    affiliateAddress: '',
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(ninetySecondsAgo),
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
                                new BigNumber(ninetySecondsAgo.toString()),
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
                    type: RfqmTransactionSubmissionType.Trade,
                });

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                        '0xorderhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([mockTransaction]);
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
                when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xpresubmittransactionhash']))).thenResolve([]);
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                });
                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };

                try {
                    await rfqmService.submitToChainAsync({
                        kind: job.kind,
                        to: '0xexchangeproxyaddress',
                        from: '0xworkeraddress',
                        calldata: '0xcalldata',
                        expiry: job.expiry,
                        identifier: job.orderHash,
                        submissionType: RfqmTransactionSubmissionType.Trade,
                        onSubmissionContextStatusUpdate: callback,
                    });
                } catch (e) {
                    expect(e.message).to.contain('Exceed expiry');
                    // eth_createAccessList should not be called when not enabled
                    verify(mockBlockchainUtils.createAccessListForAsync(anything())).never();
                    expect(job.status).to.equal(RfqmJobStatus.FailedExpired);
                }
            });

            it('should call createAccessListForAsync and should not affect the overall method when RPC returns properly', async () => {
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const job = new RfqmV2JobEntity({
                    affiliateAddress: '',
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS + 600),
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
                                new BigNumber(nowS + 600),
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
                    type: RfqmTransactionSubmissionType.Trade,
                });
                const mockTransactionReceipt: providers.TransactionReceipt = {
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                        '0xorderhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([]);
                const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
                when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                    updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
                });
                const writeV2RfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
                when(mockDbUtils.writeV2RfqmTransactionSubmissionToDbAsync(anything())).thenCall(
                    async (transactionArg) => {
                        writeV2RfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                        return _.cloneDeep(mockTransaction);
                    },
                );
                when(
                    mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash'),
                ).thenResolve(_.cloneDeep(mockTransaction));
                const updateRfqmTransactionSubmissionsCalledArgs: RfqmTransactionSubmissionEntity[][] = [];
                when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                    updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
                });
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
                when(
                    mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
                ).thenReturn(mockTransactionRequest);
                when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                    signedTransaction: 'signedTransaction',
                    transactionHash: '0xsignedtransactionhash',
                });
                when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
                when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve(
                    '0xsignedtransactionhash',
                );
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
                when(mockBlockchainUtils.createAccessListForAsync(anything())).thenResolve({
                    accessList: {
                        '0x1234': ['0x0'],
                        '0x12345': ['0x1'],
                    },
                    gasEstimate: 1000,
                });
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                    enableAccessList: true,
                });
                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };

                await rfqmService.submitToChainAsync({
                    kind: job.kind,
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
                    calldata: '0xcalldata',
                    expiry: job.expiry,
                    identifier: job.orderHash,
                    submissionType: RfqmTransactionSubmissionType.Trade,
                    onSubmissionContextStatusUpdate: callback,
                });
                verify(mockBlockchainUtils.estimateGasForAsync(anything()));
                verify(mockBlockchainUtils.createAccessListForAsync(anything())).once();
                expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
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

            it('should call createAccessListForAsync and should not affect the overall method when RPC errors out', async () => {
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const job = new RfqmV2JobEntity({
                    affiliateAddress: '',
                    chainId: 1,
                    createdAt: new Date(),
                    expiry: new BigNumber(nowS + 600),
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
                                new BigNumber(nowS + 600),
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
                    type: RfqmTransactionSubmissionType.Trade,
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findV2TransactionSubmissionsByOrderHashAsync(
                        '0xorderhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([]);
                const updateRfqmJobCalledArgs: RfqmJobEntity[] = [];
                when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                    updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
                });
                const writeV2RfqmTransactionSubmissionToDbCalledArgs: RfqmTransactionSubmissionEntity[] = [];
                when(mockDbUtils.writeV2RfqmTransactionSubmissionToDbAsync(anything())).thenCall(
                    async (transactionArg) => {
                        writeV2RfqmTransactionSubmissionToDbCalledArgs.push(_.cloneDeep(transactionArg));
                        return _.cloneDeep(mockTransaction);
                    },
                );
                when(
                    mockDbUtils.findV2TransactionSubmissionByTransactionHashAsync('0xsignedtransactionhash'),
                ).thenResolve(_.cloneDeep(mockTransaction));
                const updateRfqmTransactionSubmissionsCalledArgs: RfqmTransactionSubmissionEntity[][] = [];
                when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                    updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
                });
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
                when(
                    mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
                ).thenReturn(mockTransactionRequest);
                when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                    signedTransaction: 'signedTransaction',
                    transactionHash: '0xsignedtransactionhash',
                });
                when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
                when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve(
                    '0xsignedtransactionhash',
                );
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
                when(mockBlockchainUtils.createAccessListForAsync(anything())).thenReject(new Error('error'));
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                    enableAccessList: true,
                });
                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };

                await rfqmService.submitToChainAsync({
                    kind: job.kind,
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
                    calldata: '0xcalldata',
                    expiry: job.expiry,
                    identifier: job.orderHash,
                    submissionType: RfqmTransactionSubmissionType.Trade,
                    onSubmissionContextStatusUpdate: callback,
                });
                verify(mockBlockchainUtils.estimateGasForAsync(anything()));
                verify(mockBlockchainUtils.createAccessListForAsync(anything())).once();
                expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
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
        });

        // Not all tests from test block 'kind is `rfqm_v2_job`' is included here as most of the tests are similiar.
        // The tests below specifically test if corresponding methods are called for job kind `meta_transaction_job`.
        describe('kind is `meta_transaction_job`', () => {
            it('submits a transaction successfully when there is no previous transaction', async () => {
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const jobId = 'jobId';
                const transactionSubmissionId = 'submissionId';
                const job = createMeaTrsanctionJobEntity(
                    {
                        chainId: 1,
                        createdAt: new Date(),
                        expiry: new BigNumber(nowS + 600),
                        fee: {
                            amount: new BigNumber(0),
                            token: '',
                            type: 'fixed',
                        },
                        inputToken: '0xinputToken',
                        inputTokenAmount: new BigNumber(10),
                        integratorId: '0xintegrator',
                        metaTransaction: MOCK_META_TRANSACTION,
                        metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                        minOutputTokenAmount: new BigNumber(10),
                        outputToken: '0xoutputToken',
                        takerAddress: '0xtakerAddress',
                        takerSignature: {
                            signatureType: SignatureType.EthSign,
                            v: 1,
                            r: '',
                            s: '',
                        },
                        status: RfqmJobStatus.PendingLastLookAccepted,
                        workerAddress: '0xworkeraddress',
                    },
                    jobId,
                );

                const mockTransactionRequest: providers.TransactionRequest = {};
                const mockTransaction = createMetaTransactionSubmissionEntity(
                    {
                        from: '0xworkeraddress',
                        metaTransactionJobId: jobId,
                        maxFeePerGas: new BigNumber(100000),
                        maxPriorityFeePerGas: new BigNumber(100),
                        nonce: 0,
                        to: '0xexchangeproxyaddress',
                        transactionHash: '0xsignedtransactionhash',
                        type: RfqmTransactionSubmissionType.Trade,
                    },
                    transactionSubmissionId,
                );
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Trade),
                ).thenResolve([]);
                const updateRfqmJobCalledArgs: MetaTransactionJobEntity[] = [];
                when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                    updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
                });
                const writeMetaTransactionSubmissionAsyncCalledArgs: MetaTransactionSubmissionEntity[] = [];
                when(mockDbUtils.writeMetaTransactionSubmissionAsync(anything())).thenCall(async (transactionArg) => {
                    writeMetaTransactionSubmissionAsyncCalledArgs.push(_.cloneDeep(transactionArg));
                    return _.cloneDeep(mockTransaction);
                });
                when(
                    mockDbUtils.findMetaTransactionSubmissionsByTransactionHashAsync(
                        '0xsignedtransactionhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([_.cloneDeep(mockTransaction)]);
                const updateRfqmTransactionSubmissionsCalledArgs: MetaTransactionSubmissionEntity[][] = [];
                when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                    updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
                });
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
                when(
                    mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
                ).thenReturn(mockTransactionRequest);
                when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                    signedTransaction: 'signedTransaction',
                    transactionHash: '0xsignedtransactionhash',
                });
                when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
                when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve(
                    '0xsignedtransactionhash',
                );
                when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                    mockTransactionReceipt,
                ]);
                when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                });

                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };
                await rfqmService.submitToChainAsync({
                    kind: job.kind,
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
                    calldata: '0xcalldata',
                    expiry: job.expiry,
                    identifier: job.id,
                    submissionType: RfqmTransactionSubmissionType.Trade,
                    onSubmissionContextStatusUpdate: callback,
                });
                verify(mockBlockchainUtils.estimateGasForAsync(anything()));
                // eth_createAccessList should not be called when not enabled
                verify(mockBlockchainUtils.createAccessListForAsync(anything())).never();
                expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
                expect(writeMetaTransactionSubmissionAsyncCalledArgs[0].status).to.equal(
                    RfqmTransactionSubmissionStatus.Presubmit,
                );
                expect(updateRfqmTransactionSubmissionsCalledArgs[0][0].status).to.equal(
                    RfqmTransactionSubmissionStatus.Submitted,
                );
                expect(updateRfqmTransactionSubmissionsCalledArgs[1][0].status).to.equal(
                    RfqmTransactionSubmissionStatus.SucceededConfirmed,
                );
            });

            it('recovers a PRESUBMIT transaction which actually submitted', async () => {
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const jobId = 'jobId';
                const transactionSubmissionId = 'submissionId';
                const job = createMeaTrsanctionJobEntity(
                    {
                        chainId: 1,
                        createdAt: new Date(),
                        expiry: new BigNumber(nowS + 600),
                        fee: {
                            amount: new BigNumber(0),
                            token: '',
                            type: 'fixed',
                        },
                        inputToken: '0xinputToken',
                        inputTokenAmount: new BigNumber(10),
                        integratorId: '0xintegrator',
                        metaTransaction: MOCK_META_TRANSACTION,
                        metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                        minOutputTokenAmount: new BigNumber(10),
                        outputToken: '0xoutputToken',
                        takerAddress: '0xtakerAddress',
                        takerSignature: {
                            signatureType: SignatureType.EthSign,
                            v: 1,
                            r: '',
                            s: '',
                        },
                        status: RfqmJobStatus.PendingLastLookAccepted,
                        workerAddress: '0xworkeraddress',
                    },
                    jobId,
                );

                const mockPresubmitTransaction = createMetaTransactionSubmissionEntity(
                    {
                        from: '0xworkeraddress',
                        metaTransactionJobId: jobId,
                        maxFeePerGas: new BigNumber(100000),
                        maxPriorityFeePerGas: new BigNumber(100),
                        nonce: 0,
                        status: RfqmTransactionSubmissionStatus.Presubmit,
                        to: '0xexchangeproxyaddress',
                        transactionHash: '0xpresubmittransactionhash',
                        type: RfqmTransactionSubmissionType.Trade,
                    },
                    transactionSubmissionId,
                );
                const mockTransactionReceipt: providers.TransactionReceipt = {
                    blockHash: '0xblockhash',
                    blockNumber: 1,
                    byzantium: true,
                    confirmations: 3,
                    contractAddress: '0xexchangeproxyaddress',
                    cumulativeGasUsed: EthersBigNumber.from(1000),
                    effectiveGasPrice: EthersBigNumber.from(1000),
                    from: '0xworkeraddress',
                    gasUsed: EthersBigNumber.from(10000),
                    logs: [],
                    logsBloom: '',
                    status: 1,
                    to: '0xexchangeproxyaddress',
                    transactionHash: '0xpresubmittransactionhash',
                    transactionIndex: 0,
                    type: 2,
                };
                const mockTransactionResponse: providers.TransactionResponse = {
                    chainId: 1,
                    confirmations: 0,
                    data: '',
                    from: '0xworkeraddress',
                    gasLimit: EthersBigNumber.from(1000000),
                    hash: '0xpresubmittransactionhash',
                    nonce: 0,
                    type: 2,
                    value: EthersBigNumber.from(0),
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Trade),
                ).thenResolve([mockPresubmitTransaction]);
                const updateRfqmTransactionSubmissionsCalledArgs: MetaTransactionSubmissionEntity[][] = [];
                when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                    updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
                });
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                // This mock response indicates that the transaction is present in the mempool
                when(mockBlockchainUtils.getTransactionAsync('0xpresubmittransactionhash')).thenResolve(
                    mockTransactionResponse,
                );
                when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenReject(
                    new Error('estimateGasForAsync called during recovery'),
                );
                when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xpresubmittransactionhash']))).thenResolve([
                    mockTransactionReceipt,
                ]);
                when(mockBlockchainUtils.getBlockAsync('0xblockhash')).thenResolve(mockMinedBlock);
                when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                });
                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };

                await rfqmService.submitToChainAsync({
                    kind: job.kind,
                    to: '0xexchangeproxyaddress',
                    from: '0xworkeraddress',
                    calldata: '0xcalldata',
                    expiry: job.expiry,
                    identifier: job.id,
                    submissionType: RfqmTransactionSubmissionType.Trade,
                    onSubmissionContextStatusUpdate: callback,
                });

                // eth_createAccessList should not be called when not enabled
                verify(mockBlockchainUtils.createAccessListForAsync(anything())).never();
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
                expect(job.status).to.equal(RfqmJobStatus.SucceededConfirmed);
            });

            it('throws exception if there are more than 1 transaction submissions with the same transaction hash', async () => {
                const nowS = Math.round(new Date().getTime() / ONE_SECOND_MS);
                const jobId = 'jobId';
                const transactionSubmissionId = 'submissionId';
                const job = createMeaTrsanctionJobEntity(
                    {
                        chainId: 1,
                        createdAt: new Date(),
                        expiry: new BigNumber(nowS + 600),
                        fee: {
                            amount: new BigNumber(0),
                            token: '',
                            type: 'fixed',
                        },
                        inputToken: '0xinputToken',
                        inputTokenAmount: new BigNumber(10),
                        integratorId: '0xintegrator',
                        metaTransaction: MOCK_META_TRANSACTION,
                        metaTransactionHash: MOCK_META_TRANSACTION.getHash(),
                        minOutputTokenAmount: new BigNumber(10),
                        outputToken: '0xoutputToken',
                        takerAddress: '0xtakerAddress',
                        takerSignature: {
                            signatureType: SignatureType.EthSign,
                            v: 1,
                            r: '',
                            s: '',
                        },
                        status: RfqmJobStatus.PendingLastLookAccepted,
                        workerAddress: '0xworkeraddress',
                    },
                    jobId,
                );

                const mockTransactionRequest: providers.TransactionRequest = {};
                const mockTransaction = createMetaTransactionSubmissionEntity(
                    {
                        from: '0xworkeraddress',
                        metaTransactionJobId: jobId,
                        maxFeePerGas: new BigNumber(100000),
                        maxPriorityFeePerGas: new BigNumber(100),
                        nonce: 0,
                        to: '0xexchangeproxyaddress',
                        transactionHash: '0xsignedtransactionhash',
                        type: RfqmTransactionSubmissionType.Trade,
                    },
                    transactionSubmissionId,
                );
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

                const gasStationAttendantMock = mock(GasStationAttendantEthereum);
                when(gasStationAttendantMock.getExpectedTransactionGasRateAsync()).thenResolve(
                    new BigNumber(10).shiftedBy(GWEI_DECIMALS),
                );
                const mockDbUtils = mock(RfqmDbUtils);
                when(
                    mockDbUtils.findMetaTransactionSubmissionsByJobIdAsync(jobId, RfqmTransactionSubmissionType.Trade),
                ).thenResolve([]);
                const updateRfqmJobCalledArgs: MetaTransactionJobEntity[] = [];
                when(mockDbUtils.updateRfqmJobAsync(anything())).thenCall(async (jobArg) => {
                    updateRfqmJobCalledArgs.push(_.cloneDeep(jobArg));
                });
                const writeMetaTransactionSubmissionAsyncCalledArgs: MetaTransactionSubmissionEntity[] = [];
                when(mockDbUtils.writeMetaTransactionSubmissionAsync(anything())).thenCall(async (transactionArg) => {
                    writeMetaTransactionSubmissionAsyncCalledArgs.push(_.cloneDeep(transactionArg));
                    return _.cloneDeep(mockTransaction);
                });
                when(
                    mockDbUtils.findMetaTransactionSubmissionsByTransactionHashAsync(
                        '0xsignedtransactionhash',
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([_.cloneDeep(mockTransaction), _.cloneDeep(mockTransaction)]);
                const updateRfqmTransactionSubmissionsCalledArgs: MetaTransactionSubmissionEntity[][] = [];
                when(mockDbUtils.updateRfqmTransactionSubmissionsAsync(anything())).thenCall(async (tranactionArg) => {
                    updateRfqmTransactionSubmissionsCalledArgs.push(_.cloneDeep(tranactionArg));
                });
                const mockBlockchainUtils = mock(RfqBlockchainUtils);
                when(mockBlockchainUtils.getNonceAsync('0xworkeraddress')).thenResolve(mockNonce);
                when(mockBlockchainUtils.estimateGasForAsync(anything())).thenResolve(100);
                when(
                    mockBlockchainUtils.transformTxDataToTransactionRequest(anything(), anything(), anything()),
                ).thenReturn(mockTransactionRequest);
                when(mockBlockchainUtils.signTransactionAsync(anything())).thenResolve({
                    signedTransaction: 'signedTransaction',
                    transactionHash: '0xsignedtransactionhash',
                });
                when(mockBlockchainUtils.getExchangeProxyAddress()).thenReturn('0xexchangeproxyaddress');
                when(mockBlockchainUtils.submitSignedTransactionAsync(anything())).thenResolve(
                    '0xsignedtransactionhash',
                );
                when(mockBlockchainUtils.getReceiptsAsync(deepEqual(['0xsignedtransactionhash']))).thenResolve([
                    mockTransactionReceipt,
                ]);
                when(mockBlockchainUtils.getCurrentBlockAsync()).thenResolve(4);
                const rfqmService = buildWorkerServiceForUnitTest({
                    dbUtils: instance(mockDbUtils),
                    gasStationAttendant: instance(gasStationAttendantMock),
                    rfqBlockchainUtils: instance(mockBlockchainUtils),
                });

                const callback = async (
                    newSubmissionContextStatus: SubmissionContextStatus,
                    oldSubmissionContextStatus?: SubmissionContextStatus,
                ): Promise<void> => {
                    if (newSubmissionContextStatus !== oldSubmissionContextStatus) {
                        const newJobStatus =
                            SubmissionContext.tradeSubmissionContextStatusToJobStatus(newSubmissionContextStatus);
                        job.status = newJobStatus;
                        await mockDbUtils.updateRfqmJobAsync(job);
                    }
                };

                try {
                    await rfqmService.submitToChainAsync({
                        kind: job.kind,
                        to: '0xexchangeproxyaddress',
                        from: '0xworkeraddress',
                        calldata: '0xcalldata',
                        expiry: job.expiry,
                        identifier: job.id,
                        submissionType: RfqmTransactionSubmissionType.Trade,
                        onSubmissionContextStatusUpdate: callback,
                    });
                    expect.fail();
                } catch (e) {
                    expect(e.message).to.contain('Transaction hash have been submitted not exactly once');
                }
            });
        });
    });
});
