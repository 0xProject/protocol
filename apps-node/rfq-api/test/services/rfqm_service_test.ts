// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { TooManyRequestsError } from '@0x/api-utils';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import {
    eip712SignHashWithKey,
    ethSignHashWithKey,
    MetaTransaction,
    OtcOrder,
    SignatureType,
} from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import { constants } from 'ethersv5';
import { Producer } from 'sqs-producer';
import { anything, capture, instance, mock, spy, verify, when } from 'ts-mockito';

import { Integrator } from '../../src/config';
import {
    DEFAULT_MIN_EXPIRY_DURATION_MS,
    ETH_DECIMALS,
    ONE_MINUTE_MS,
    ONE_SECOND_MS,
    ZERO,
} from '../../src/core/constants';
import { RfqmV2JobEntity, RfqmV2QuoteEntity, RfqmV2TransactionSubmissionEntity } from '../../src/entities';
import {
    RfqmJobStatus,
    RfqmOrderTypes,
    RfqmTransactionSubmissionStatus,
    RfqmTransactionSubmissionType,
} from '../../src/entities/types';
import { FeeService } from '../../src/services/fee_service';
import { RfqmService } from '../../src/services/rfqm_service';
import { RfqMakerBalanceCacheService } from '../../src/services/rfq_maker_balance_cache_service';
import {
    ApprovalResponse,
    OtcOrderSubmitRfqmSignedQuoteParams,
    SubmitRfqmSignedQuoteWithApprovalParams,
} from '../../src/services/types';
import {
    Approval,
    ExecuteMetaTransactionApproval,
    ExecuteMetaTransactionEip712Context,
    FeeModelVersion,
    GaslessApprovalTypes,
    GaslessTypes,
    IndicativeQuote,
    PermitApproval,
    PermitEip712Context,
} from '../../src/core/types';
import { CacheClient } from '../../src/utils/cache_client';
import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { otcOrderToStoredOtcOrder, RfqmDbUtils } from '../../src/utils/rfqm_db_utils';
import { HealthCheckStatus } from '../../src/utils/rfqm_health_check';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { RfqMakerManager } from '../../src/utils/rfq_maker_manager';
import { TokenMetadataManager } from '../../src/utils/TokenMetadataManager';
import { MOCK_EXECUTE_META_TRANSACTION_APPROVAL, MOCK_EXECUTE_META_TRANSACTION_HASH } from '../constants';
import * as SignatureUtils from '../../src/utils/signature_utils';

// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-loss-of-precision
const NEVER_EXPIRES = new BigNumber(9999999999999999);
const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';
const MOCK_TOKEN = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const MOCK_GAS_PRICE = new BigNumber(100000000000);
const MOCK_MM_URI = 'https://mm-address';
const WORKER_FULL_BALANCE_WEI = new BigNumber(1).shiftedBy(ETH_DECIMALS);
const MOCK_INTEGRATOR: Integrator = {
    apiKeys: ['an-integrator-id'],
    integratorId: 'an-integrator-id',
    allowedChainIds: [1337],
    label: 'Test',
    plp: false,
    rfqm: true,
    rfqt: true,
    gaslessRfqtVip: true,
};

const buildRfqmServiceForUnitTest = (
    overrides: {
        chainId?: number;
        feeService?: FeeService;
        feeModelVersion?: FeeModelVersion;
        rfqBlockchainUtils?: RfqBlockchainUtils;
        dbUtils?: RfqmDbUtils;
        producer?: Producer;
        quoteServerClient?: QuoteServerClient;
        cacheClient?: CacheClient;
        rfqMakerBalanceCacheService?: RfqMakerBalanceCacheService;
        rfqMakerManager?: RfqMakerManager;
        tokenMetadataManager?: TokenMetadataManager;
        gaslessRfqtVipRolloutPercentage?: number;
    } = {},
): RfqmService => {
    const contractAddresses = getContractAddressesForChainOrThrow(1);
    const feeServiceMock = mock(FeeService);
    when(feeServiceMock.getGasPriceEstimationAsync()).thenResolve(MOCK_GAS_PRICE);
    when(feeServiceMock.calculateFeeAsync(anything(), anything())).thenResolve({
        feeWithDetails: {
            token: '0xToken',
            amount: new BigNumber(300),
            type: 'fixed',
            details: {
                feeModelVersion: 1,
                kind: 'default',
                gasFeeAmount: new BigNumber(100),
                gasPrice: MOCK_GAS_PRICE,
                zeroExFeeAmount: new BigNumber(200),
                tradeSizeBps: 4,
                feeTokenBaseUnitPriceUsd: new BigNumber(30),
                takerTokenBaseUnitPriceUsd: null,
                makerTokenBaseUnitPriceUsd: new BigNumber(20),
            },
            breakdown: {
                gas: {
                    amount: new BigNumber(100),
                    details: {
                        gasPrice: MOCK_GAS_PRICE,
                        estimatedGas: new BigNumber(1),
                    },
                },
                zeroEx: {
                    amount: new BigNumber(200),
                    details: {
                        kind: 'volume',
                        tradeSizeBps: 4,
                    },
                },
            },
            conversionRates: {
                nativeTokenBaseUnitPriceUsd: new BigNumber(30),
                feeTokenBaseUnitPriceUsd: new BigNumber(30),
                takerTokenBaseUnitPriceUsd: null,
                makerTokenBaseUnitPriceUsd: new BigNumber(20),
            },
        },
    });
    const feeServiceInstance = instance(feeServiceMock);

    const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
    when(rfqBlockchainUtilsMock.getAccountBalanceAsync(MOCK_WORKER_REGISTRY_ADDRESS)).thenResolve(
        WORKER_FULL_BALANCE_WEI,
    );
    when(rfqBlockchainUtilsMock.getAllowanceAsync(anything(), anything(), anything())).thenResolve(
        new BigNumber(constants.MaxUint256.toString()),
        new BigNumber(0),
        new BigNumber(0),
    );
    when(rfqBlockchainUtilsMock.getGaslessApprovalAsync(anything(), anything(), anything())).thenResolve(
        null,
        MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
    );
    when(rfqBlockchainUtilsMock.computeEip712Hash(anything())).thenReturn(MOCK_EXECUTE_META_TRANSACTION_HASH);
    const dbUtilsMock = mock(RfqmDbUtils);
    const sqsMock = mock(Producer);
    when(sqsMock.queueSize()).thenResolve(0);
    const quoteServerClientMock = mock(QuoteServerClient);
    const cacheClientMock = mock(CacheClient);
    when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve([]);
    const rfqMakerBalanceCacheService = mock(RfqMakerBalanceCacheService);
    const rfqMakerManagerMock = mock(RfqMakerManager);
    when(rfqMakerManagerMock.getRfqtV2MakerUrisForPair(anything(), anything(), anything())).thenReturn([MOCK_MM_URI]);

    const tokenMetadataManagerMock = mock(TokenMetadataManager);
    when(tokenMetadataManagerMock.getTokenDecimalsAsync(anything())).thenResolve(18);
    const tokenMetadataManager = instance(tokenMetadataManagerMock);

    return new RfqmService(
        overrides.chainId || 1337,
        overrides.feeService || feeServiceInstance,
        overrides.feeModelVersion || 0,
        contractAddresses,
        MOCK_WORKER_REGISTRY_ADDRESS,
        overrides.rfqBlockchainUtils || instance(rfqBlockchainUtilsMock),
        overrides.dbUtils || dbUtilsMock,
        overrides.producer || sqsMock,
        overrides.quoteServerClient || quoteServerClientMock,
        DEFAULT_MIN_EXPIRY_DURATION_MS,
        overrides.cacheClient || instance(cacheClientMock),
        overrides.rfqMakerBalanceCacheService || rfqMakerBalanceCacheService,
        overrides.rfqMakerManager || instance(rfqMakerManagerMock),
        overrides.tokenMetadataManager || tokenMetadataManager,
        overrides.gaslessRfqtVipRolloutPercentage || 0,
    );
};

describe('RfqmService HTTP Logic', () => {
    describe('submitTakerSignedOtcOrderAsync', () => {
        it('should fail if there is already a pending trade for the taker and taker token', async () => {
            const expiry = new BigNumber(Date.now() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
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
            const existingJob = new RfqmV2JobEntity({
                chainId: 1337,
                expiry,
                makerUri: '',
                orderHash: '0x00',
                fee: {
                    token: '0xToken',
                    amount: '100',
                    type: 'fixed',
                },
                order: otcOrderToStoredOtcOrder(otcOrder),
                workflow: 'rfqm',
            });

            const quote = new RfqmV2QuoteEntity({
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
                order: {
                    order: existingJob.order.order,
                    type: RfqmOrderTypes.Otc,
                },
                orderHash: '',
                isUnwrap: false,
                workflow: 'rfqm',
            });

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobsWithStatusesAsync(anything())).thenResolve([existingJob]);
            when(dbUtilsMock.findV2QuoteByOrderHashAsync(otcOrder.getHash())).thenResolve(quote);
            const params: OtcOrderSubmitRfqmSignedQuoteParams = {
                type: GaslessTypes.OtcOrder,
                order: otcOrder,
                signature: {
                    r: '',
                    s: '',
                    signatureType: SignatureType.EthSign,
                    v: 1,
                },
            };
            const metatransactionMock = mock(MetaTransaction);
            when(metatransactionMock.getHash()).thenReturn('0xmetatransactionhash');
            when(metatransactionMock.expirationTimeSeconds).thenReturn(NEVER_EXPIRES);

            const service = buildRfqmServiceForUnitTest({
                chainId: 1,
                dbUtils: instance(dbUtilsMock),
                feeModelVersion: 0,
            });

            expect(service.submitTakerSignedOtcOrderAsync(params)).to.be.rejectedWith(
                TooManyRequestsError,
                'a pending trade for this taker and takertoken already exists',
            ); // tslint:disable-line no-unused-expression
        });

        it('should allow two trades by the same taker with different taker tokens', async () => {
            const takerPrivateKey = '0xe13ae9fa0166b501a2ab50e7b6fbb65819add7376da9b4fbb3bf3ae48cd9dcd3';
            const takerAddress = '0x4e2145eDC29f27E126154B9c716Df70c429C291B';
            const expiry = new BigNumber(Date.now() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
            const existingOtcOrder = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: takerAddress,
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x4444444444444444444444444444444444444444',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
                chainId: 1337,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const newOtcOrder = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: takerAddress,
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x9999999999999999999999999999999999999999',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
                chainId: 1337,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const existingJob = new RfqmV2JobEntity({
                chainId: 1337,
                expiry,
                makerUri: '',
                orderHash: '0x00',
                fee: {
                    token: '0xToken',
                    amount: '100',
                    type: 'fixed',
                },
                order: otcOrderToStoredOtcOrder(existingOtcOrder),
                workflow: 'rfqm',
            });

            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobsWithStatusesAsync(anything())).thenResolve([existingJob]);
            when(dbUtilsMock.findV2QuoteByOrderHashAsync(newOtcOrder.getHash())).thenResolve({
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
                order: otcOrderToStoredOtcOrder(newOtcOrder),
                orderHash: '',
                isUnwrap: false,
                takerSpecifiedSide: null,
                makerSignature: null,
                workflow: 'rfqm',
            });
            const metatransactionMock = mock(MetaTransaction);
            when(metatransactionMock.getHash()).thenReturn('0xmetatransactionhash');
            when(metatransactionMock.expirationTimeSeconds).thenReturn(NEVER_EXPIRES);
            const blockchainUtilsMock = mock(RfqBlockchainUtils);
            when(blockchainUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(10000),
            ]);
            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(10000),
            ]);

            const service = buildRfqmServiceForUnitTest({
                chainId: 1,
                dbUtils: instance(dbUtilsMock),
                rfqBlockchainUtils: instance(blockchainUtilsMock),
                rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                feeModelVersion: 0,
            });

            const submitParams: OtcOrderSubmitRfqmSignedQuoteParams = {
                type: GaslessTypes.OtcOrder,
                order: newOtcOrder,
                signature: ethSignHashWithKey(newOtcOrder.getHash(), takerPrivateKey),
            };
            const result = await service.submitTakerSignedOtcOrderAsync(submitParams);
            expect(result.type).to.equal('otc');
        });
    });

    describe('submitTakerSignedOtcOrderWithApprovalAsync', () => {
        it('should fail if approval params generate an invalid calldata', async () => {
            const takerAddress = '0x4e2145eDC29f27E126154B9c716Df70c429C291B';
            const expiry = new BigNumber(Date.now() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
            const otcOrder = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: '0x1111111111111111111111111111111111111111',
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x4444444444444444444444444444444444444444',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
                chainId: 1,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const eip712Context: ExecuteMetaTransactionEip712Context = {
                types: {
                    EIP712Domain: [
                        { name: 'name', type: 'string' },
                        { name: 'version', type: 'string' },
                        { name: 'verifyingContract', type: 'address' },
                        { name: 'salt', type: 'bytes32' },
                    ],
                    MetaTransaction: [
                        { name: 'nonce', type: 'uint256' },
                        { name: 'from', type: 'address' },
                        { name: 'functionSignature', type: 'bytes' },
                    ],
                },
                primaryType: 'MetaTransaction',
                domain: {},
                message: {
                    nonce: expiry.toNumber(),
                    from: takerAddress,
                    functionSignature: '',
                },
            };
            const submitParams: SubmitRfqmSignedQuoteWithApprovalParams<ExecuteMetaTransactionApproval> = {
                approval: {
                    type: GaslessApprovalTypes.ExecuteMetaTransaction,
                    eip712: eip712Context,
                    signature: {
                        r: '',
                        s: '',
                        v: 28,
                        signatureType: SignatureType.EIP712,
                    },
                },
                trade: {
                    type: GaslessTypes.OtcOrder,
                    order: otcOrder,
                    signature: {
                        r: '',
                        s: '',
                        v: 28,
                        signatureType: SignatureType.EthSign,
                    },
                },
                kind: GaslessTypes.OtcOrder,
            };
            const blockchainUtilsMock = mock(RfqBlockchainUtils);
            when(blockchainUtilsMock.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                '0xinvalidcalldata',
            );
            when(blockchainUtilsMock.estimateGasForAsync(anything())).thenReject();
            const service = buildRfqmServiceForUnitTest({
                chainId: 1,
                feeModelVersion: 0,
                rfqBlockchainUtils: instance(blockchainUtilsMock),
            });
            try {
                await service.submitTakerSignedOtcOrderWithApprovalAsync(submitParams);
                expect.fail('should fail eth call approval validation');
            } catch (e) {
                expect(e.message).to.contain('Eth call approval validation failed');
                verify(blockchainUtilsMock.generateApprovalCalldataAsync(anything(), anything(), anything())).once();
                verify(blockchainUtilsMock.estimateGasForAsync(anything())).thrice();
            }
        });
        it('should proceed with trade submission if approval is empty', async () => {
            const takerPrivateKey = '0xe13ae9fa0166b501a2ab50e7b6fbb65819add7376da9b4fbb3bf3ae48cd9dcd3';
            const takerAddress = '0x4e2145eDC29f27E126154B9c716Df70c429C291B';
            const expiry = new BigNumber(Date.now() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
            const otcOrder = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: takerAddress,
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x4444444444444444444444444444444444444444',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
                chainId: 1,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobsWithStatusesAsync(anything())).thenResolve([]);
            when(dbUtilsMock.findV2QuoteByOrderHashAsync(otcOrder.getHash())).thenResolve({
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
                order: otcOrderToStoredOtcOrder(otcOrder),
                orderHash: '',
                isUnwrap: false,
                takerSpecifiedSide: null,
                makerSignature: null,
                workflow: 'rfqm',
            });
            const blockchainUtilsMock = mock(RfqBlockchainUtils);
            when(blockchainUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).thenResolve([
                new BigNumber(10000),
            ]);
            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(10000),
            ]);
            const service = buildRfqmServiceForUnitTest({
                chainId: 1,
                feeModelVersion: 0,
                dbUtils: instance(dbUtilsMock),
                rfqBlockchainUtils: instance(blockchainUtilsMock),
                rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
            });
            const submitParams: SubmitRfqmSignedQuoteWithApprovalParams<Approval> = {
                kind: GaslessTypes.OtcOrder,
                trade: {
                    type: GaslessTypes.OtcOrder,
                    order: otcOrder,
                    signature: ethSignHashWithKey(otcOrder.getHash(), takerPrivateKey),
                },
            };
            const result = await service.submitTakerSignedOtcOrderWithApprovalAsync(submitParams);
            expect(result.type).to.equal('otc');
            verify(dbUtilsMock.writeV2JobAsync(anything())).once();
        });
        it('should save job with executeMetaTransaction params to DB', async () => {
            const takerPrivateKey = '0xe13ae9fa0166b501a2ab50e7b6fbb65819add7376da9b4fbb3bf3ae48cd9dcd3';
            const takerAddress = '0x4e2145eDC29f27E126154B9c716Df70c429C291B';
            const expiry = new BigNumber(Date.now() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
            const otcOrder = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: takerAddress,
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x4444444444444444444444444444444444444444',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
                chainId: 1,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const eip712Context: ExecuteMetaTransactionEip712Context = {
                types: {
                    EIP712Domain: [
                        { name: 'name', type: 'string' },
                        { name: 'version', type: 'string' },
                        { name: 'verifyingContract', type: 'address' },
                        { name: 'salt', type: 'bytes32' },
                    ],
                    MetaTransaction: [
                        { name: 'nonce', type: 'uint256' },
                        { name: 'from', type: 'address' },
                        { name: 'functionSignature', type: 'bytes' },
                    ],
                },
                primaryType: 'MetaTransaction',
                domain: {},
                message: {
                    from: takerAddress,
                    functionSignature: '',
                    nonce: expiry.toNumber(),
                },
            };
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobsWithStatusesAsync(anything())).thenResolve([]);
            when(dbUtilsMock.findV2QuoteByOrderHashAsync(otcOrder.getHash())).thenResolve({
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
                order: otcOrderToStoredOtcOrder(otcOrder),
                orderHash: '',
                isUnwrap: false,
                takerSpecifiedSide: null,
                makerSignature: null,
                workflow: 'rfqm',
            });
            const blockchainUtilsMock = mock(RfqBlockchainUtils);
            when(blockchainUtilsMock.getTokenBalancesAsync(anything())).thenResolve([new BigNumber(10000)]);
            when(blockchainUtilsMock.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                '0xvalidcalldata',
            );
            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(10000),
            ]);
            const service = buildRfqmServiceForUnitTest({
                chainId: 1,
                feeModelVersion: 0,
                dbUtils: instance(dbUtilsMock),
                rfqBlockchainUtils: instance(blockchainUtilsMock),
                rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
            });
            const submitParams: SubmitRfqmSignedQuoteWithApprovalParams<ExecuteMetaTransactionApproval> = {
                trade: {
                    type: GaslessTypes.OtcOrder,
                    order: otcOrder,
                    signature: ethSignHashWithKey(otcOrder.getHash(), takerPrivateKey),
                },
                approval: {
                    type: GaslessApprovalTypes.ExecuteMetaTransaction,
                    eip712: eip712Context,
                    signature: eip712SignHashWithKey(otcOrder.getHash(), takerPrivateKey),
                },
                kind: GaslessTypes.OtcOrder,
            };
            const result = await service.submitTakerSignedOtcOrderWithApprovalAsync(submitParams);
            expect(result.type).to.equal('otc');
            verify(blockchainUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).never();
            verify(dbUtilsMock.writeV2JobAsync(anything())).once();
        });
        it('should save job with permit params to DB', async () => {
            const takerPrivateKey = '0xe13ae9fa0166b501a2ab50e7b6fbb65819add7376da9b4fbb3bf3ae48cd9dcd3';
            const takerAddress = '0x4e2145eDC29f27E126154B9c716Df70c429C291B';
            const expiry = new BigNumber(Date.now() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
            const otcOrder = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: takerAddress,
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x4444444444444444444444444444444444444444',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
                chainId: 1,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const eip712Context: PermitEip712Context = {
                types: {
                    EIP712Domain: [
                        { name: 'name', type: 'string' },
                        { name: 'version', type: 'string' },
                        { name: 'verifyingContract', type: 'address' },
                        { name: 'salt', type: 'bytes32' },
                    ],
                    Permit: [
                        { name: 'owner', type: 'address' },
                        { name: 'spender', type: 'address' },
                        { name: 'value', type: 'uint256' },
                        { name: 'nonce', type: 'uint256' },
                        { name: 'deadline', type: 'uint256' },
                    ],
                },
                primaryType: 'Permit',
                domain: {},
                message: {
                    deadline: '12345',
                    owner: takerAddress,
                    spender: '0x0000000000000000000000000000000000000000',
                    value: '0xffffffffffffffffffffffffffffffffffffffff',
                    nonce: expiry.toNumber(),
                },
            };
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findV2JobsWithStatusesAsync(anything())).thenResolve([]);
            when(dbUtilsMock.findV2QuoteByOrderHashAsync(otcOrder.getHash())).thenResolve({
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
                order: otcOrderToStoredOtcOrder(otcOrder),
                orderHash: '',
                isUnwrap: false,
                takerSpecifiedSide: null,
                makerSignature: null,
                workflow: 'rfqm',
            });
            const blockchainUtilsMock = mock(RfqBlockchainUtils);
            when(blockchainUtilsMock.getTokenBalancesAsync(anything())).thenResolve([new BigNumber(10000)]);
            when(blockchainUtilsMock.generateApprovalCalldataAsync(anything(), anything(), anything())).thenResolve(
                '0xvalidcalldata',
            );
            when(blockchainUtilsMock.estimateGasForAsync(anything())).thenResolve(10);
            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(10000),
            ]);
            const service = buildRfqmServiceForUnitTest({
                chainId: 1,
                feeModelVersion: 0,
                dbUtils: instance(dbUtilsMock),
                rfqBlockchainUtils: instance(blockchainUtilsMock),
                rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
            });
            const submitParams: SubmitRfqmSignedQuoteWithApprovalParams<PermitApproval> = {
                trade: {
                    type: GaslessTypes.OtcOrder,
                    order: otcOrder,
                    signature: ethSignHashWithKey(otcOrder.getHash(), takerPrivateKey),
                },
                approval: {
                    type: GaslessApprovalTypes.Permit,
                    eip712: eip712Context,
                    signature: eip712SignHashWithKey(otcOrder.getHash(), takerPrivateKey),
                },
                kind: GaslessTypes.OtcOrder,
            };
            const result = await service.submitTakerSignedOtcOrderWithApprovalAsync(submitParams);
            expect(result.type).to.equal('otc');
            verify(blockchainUtilsMock.getMinOfBalancesAndAllowancesAsync(anything())).never();
            verify(dbUtilsMock.writeV2JobAsync(anything())).once();
        });
    });

    describe('fetchIndicativeQuoteAsync', () => {
        describe('sells', () => {
            it('should fetch indicative quote', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);

                const quote: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    feeModelVersion: 0,
                });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(1.01);
            });

            it('should round price to six decimal places', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(111),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(333),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    feeModelVersion: 0,
                });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(333),
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }

                expect(res.price.toNumber()).to.equal(0.3333333);
            });

            it('should only return an indicative quote that is 100% filled when selling', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote1: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(55),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(50),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quote2: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(105),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote1,
                    quote2,
                ]);
                const service = buildRfqmServiceForUnitTest({ quoteServerClient: instance(quoteServerClientMock) });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.05);
            });

            it('should return null if no quotes are valid', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const partialFillQuote: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(55),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(50),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    partialFillQuote,
                ]);
                const service = buildRfqmServiceForUnitTest({ quoteServerClient: instance(quoteServerClientMock) });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });
                expect(res).to.equal(null);
            });

            // TODO: we may want to reintroduce this test very soon. However, if not addressed by June 2022, remove
            it.skip('should return an indicative quote that can fill more than 100%', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const worseQuote: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const betterQuote: IndicativeQuote = {
                    maker: '0xmaker2',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(222),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(200),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    worseQuote,
                    betterQuote,
                ]);
                const service = buildRfqmServiceForUnitTest({ quoteServerClient: instance(quoteServerClientMock) });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(200);
                expect(res.price.toNumber()).to.equal(1.11);
            });

            it('should ignore quotes that are for the wrong pair', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const worseQuote: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const betterQuote: IndicativeQuote = {
                    maker: '0xmaker2',
                    makerToken: '0x1111111111111111111111111111111111111111',
                    makerAmount: new BigNumber(111),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    worseQuote,
                    betterQuote,
                ]);
                const service = buildRfqmServiceForUnitTest({ quoteServerClient: instance(quoteServerClientMock) });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.01); // Worse pricing wins because better pricing is for wrong pair
            });

            it('should ignore quotes that expire within 3 minutes', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const inOneMinute = (Date.now() + ONE_MINUTE_MS) / ONE_SECOND_MS;
                const expiresSoon: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(111),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: new BigNumber(inOneMinute),
                    makerUri: MOCK_MM_URI,
                };
                const neverExpires: IndicativeQuote = {
                    maker: '0xmaker2',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    expiresSoon,
                    neverExpires,
                ]);
                const service = buildRfqmServiceForUnitTest({ quoteServerClient: instance(quoteServerClientMock) });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.01); // Worse pricing wins because better pricing expires too soon
            });
        });

        describe('buys', () => {
            it('should fetch indicative quote when buying', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(100),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(80),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);
                const service = buildRfqmServiceForUnitTest({ quoteServerClient: instance(quoteServerClientMock) });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.buyAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(0.8);
            });

            it('should only return an indicative quote that is 100% filled when buying', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const overFillQuoteGoodPricing: IndicativeQuote = {
                    maker: '0xmaker',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(160),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(80),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const partialFillQuoteGoodPricing: IndicativeQuote = {
                    maker: '0xmaker2',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(80),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(40),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const fullQuote: IndicativeQuote = {
                    maker: '0xmaker3',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(100),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(80),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };
                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    overFillQuoteGoodPricing,
                    partialFillQuoteGoodPricing,
                    fullQuote,
                ]);
                const service = buildRfqmServiceForUnitTest({ quoteServerClient: instance(quoteServerClientMock) });

                const res = await service.fetchIndicativeQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.buyAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(0.8);
            });
        });
    });

    describe('fetchFirmQuoteAsync', () => {
        const takerAddress = '0xf003A9418DE2620f935181259C0Fa1595E871234';

        it('should use an affiliate address provided in the quote request even if one is present in configuration', async () => {
            const sellAmount = new BigNumber(100);
            const contractAddresses = getContractAddressesForChainOrThrow(1);
            const quote: IndicativeQuote = {
                maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                makerToken: contractAddresses.zrxToken,
                makerAmount: new BigNumber(101),
                takerToken: contractAddresses.etherToken,
                takerAmount: new BigNumber(100),
                expiry: NEVER_EXPIRES,
                makerUri: MOCK_MM_URI,
            };

            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
            when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve([]);

            // Mock out the dbUtils
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
            const dbUtils = instance(dbUtilsMock);

            const quoteServerClientMock = mock(QuoteServerClient);
            when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([quote]);
            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(150),
            ]);

            const service = buildRfqmServiceForUnitTest({
                quoteServerClient: instance(quoteServerClientMock),
                dbUtils,
                cacheClient: instance(cacheClientMock),
                rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
            });

            await service.fetchFirmQuoteAsync({
                affiliateAddress: '0xaffiliateAddress',
                buyToken: contractAddresses.zrxToken,
                buyTokenDecimals: 18,
                checkApproval: false,
                integrator: { ...MOCK_INTEGRATOR, affiliateAddress: '0xaffiliateAddressNotThisOne' },
                sellAmount,
                sellToken: contractAddresses.etherToken,
                sellTokenDecimals: 18,
                takerAddress,
            });

            const writeV2QuoteArgs = capture(dbUtilsMock.writeV2QuoteAsync).last();
            expect(writeV2QuoteArgs[0]['affiliateAddress']).to.equal('0xaffiliateAddress');
        });

        it('should use a configured affiliate address when none is provide in the quote request', async () => {
            const sellAmount = new BigNumber(100);
            const contractAddresses = getContractAddressesForChainOrThrow(1);
            const quote: IndicativeQuote = {
                maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                makerToken: contractAddresses.zrxToken,
                makerAmount: new BigNumber(101),
                takerToken: contractAddresses.etherToken,
                takerAmount: new BigNumber(100),
                expiry: NEVER_EXPIRES,
                makerUri: MOCK_MM_URI,
            };

            const cacheClientMock = mock(CacheClient);
            when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
            when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve([]);

            // Mock out the dbUtils
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
            const dbUtils = instance(dbUtilsMock);

            const quoteServerClientMock = mock(QuoteServerClient);
            when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([quote]);
            const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
            when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                new BigNumber(150),
            ]);

            const service = buildRfqmServiceForUnitTest({
                quoteServerClient: instance(quoteServerClientMock),
                dbUtils,
                cacheClient: instance(cacheClientMock),
                rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
            });

            await service.fetchFirmQuoteAsync({
                buyToken: contractAddresses.zrxToken,
                buyTokenDecimals: 18,
                checkApproval: false,
                integrator: { ...MOCK_INTEGRATOR, affiliateAddress: '0xaffiliateAddress' },
                sellAmount,
                sellToken: contractAddresses.etherToken,
                sellTokenDecimals: 18,
                takerAddress,
            });

            const writeV2QuoteArgs = capture(dbUtilsMock.writeV2QuoteAsync).last();
            expect(writeV2QuoteArgs[0]['affiliateAddress']).to.equal('0xaffiliateAddress');
        });

        describe('sells', () => {
            it('should fetch a firm quote', async () => {
                const sellAmount = new BigNumber(100);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };

                const cacheClientMock = mock(CacheClient);
                when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve(
                    [],
                );

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);
                const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                    new BigNumber(150),
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    dbUtils,
                    cacheClient: instance(cacheClientMock),
                    rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                });

                const { quote: res } = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount,
                    checkApproval: false,
                });

                expect(res).to.exist; // tslint:disable-line: no-unused-expression
                expect(res?.type).to.equal(GaslessTypes.OtcOrder);

                expect(res?.sellAmount).to.equal(sellAmount);
                expect(res?.price.toNumber()).to.equal(1.01);
                expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });

            // TODO: we may want to reintroduce this test very soon. However, if not addressed by June 2022, remove
            it.skip('should scale a firm quote if MM returns too much', async () => {
                const sellAmount = new BigNumber(100);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(202),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(200),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };

                const cacheClientMock = mock(CacheClient);
                when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve(
                    [],
                );

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);
                const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                    new BigNumber(150),
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    dbUtils,
                    cacheClient: instance(cacheClientMock),
                    rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                });

                const { quote: res } = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount,
                    checkApproval: false,
                });

                expect(res).to.exist; // tslint:disable-line: no-unused-expression
                expect(res?.type).to.equal(GaslessTypes.OtcOrder);
                expect(res?.sellAmount).to.equal(sellAmount);
                expect(res?.buyAmount.toNumber()).to.equal(101); // result is scaled
                expect(res?.price.toNumber()).to.equal(1.01);
                expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });

            it('should round price to six decimal places', async () => {
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(111),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(333),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };

                const cacheClientMock = mock(CacheClient);
                when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve(
                    [],
                );

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);
                const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                    new BigNumber(150),
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    dbUtils,
                    cacheClient: instance(cacheClientMock),
                    rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                });

                const { quote: res } = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(333),
                    checkApproval: false,
                });

                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }

                expect(res.price.toNumber()).to.equal(0.3333333);
            });

            it('should not call `getGaslessApprovalResponseAsync` if checkApproval is false', async () => {
                const sellAmount = new BigNumber(100);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };

                const cacheClientMock = mock(CacheClient);
                when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve(
                    [],
                );

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);
                const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                    new BigNumber(150),
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    dbUtils,
                    cacheClient: instance(cacheClientMock),
                    rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                });
                const spiedService = spy(service);
                when(spiedService.getGaslessApprovalResponseAsync(anything(), anything(), anything())).thenThrow(
                    new Error('`getGaslessApprovalResponseAsync` should not be called'),
                );

                const { quote: res } = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount,
                    checkApproval: false,
                });

                expect(res).to.exist; // tslint:disable-line: no-unused-expression
                expect(res?.type).to.equal(GaslessTypes.OtcOrder);

                expect(res?.sellAmount).to.equal(sellAmount);
                expect(res?.price.toNumber()).to.equal(1.01);
                expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);
                expect(res?.approval).to.equal(undefined);
            });

            it('should return the correct approval if checkApproval is true', async () => {
                const sellAmount = new BigNumber(100);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(101),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };

                const cacheClientMock = mock(CacheClient);
                when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve(
                    [],
                );

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);
                const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                    new BigNumber(150),
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    dbUtils,
                    cacheClient: instance(cacheClientMock),
                    rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                });
                const approval: ApprovalResponse = {
                    isRequired: true,
                    isGaslessAvailable: true,
                    type: MOCK_EXECUTE_META_TRANSACTION_APPROVAL.kind,
                    eip712: MOCK_EXECUTE_META_TRANSACTION_APPROVAL.eip712,
                };
                const spiedService = spy(service);
                when(spiedService.getGaslessApprovalResponseAsync(anything(), anything(), anything())).thenResolve(
                    approval,
                );

                const { quote: res } = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount,
                    checkApproval: true,
                });

                expect(res).to.exist; // tslint:disable-line: no-unused-expression
                expect(res?.type).to.equal(GaslessTypes.OtcOrder);

                expect(res?.sellAmount).to.equal(sellAmount);
                expect(res?.price.toNumber()).to.equal(1.01);
                expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);
                expect(res?.approval).to.eql(approval);
            });

            describe('Gasless RFQt VIP', () => {
                it('should fetch a firm quote', async () => {
                    const sellAmount = new BigNumber(100);
                    const contractAddresses = getContractAddressesForChainOrThrow(1);
                    const quote: IndicativeQuote = {
                        maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                        makerToken: contractAddresses.zrxToken,
                        makerAmount: new BigNumber(101),
                        takerToken: contractAddresses.etherToken,
                        takerAmount: new BigNumber(100),
                        expiry: NEVER_EXPIRES,
                        makerUri: MOCK_MM_URI,
                    };
                    const makerSignature = {
                        r: '',
                        s: '',
                        v: 28,
                        signatureType: SignatureType.EthSign,
                    };

                    const cacheClientMock = mock(CacheClient);
                    when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                    when(
                        cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything()),
                    ).thenResolve([]);

                    // Mock out the dbUtils
                    const dbUtilsMock = mock(RfqmDbUtils);
                    when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                    const dbUtils = instance(dbUtilsMock);

                    const quoteServerClientMock = mock(QuoteServerClient);
                    when(
                        quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything(), anything()),
                    ).thenResolve([quote]);
                    when(
                        quoteServerClientMock.signV2Async(
                            quote.makerUri,
                            anything(),
                            anything(),
                            anything(),
                            anything(),
                        ),
                    ).thenResolve(makerSignature);
                    const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                    when(
                        rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything()),
                    ).thenResolve([new BigNumber(150)]);

                    const service = buildRfqmServiceForUnitTest({
                        quoteServerClient: instance(quoteServerClientMock),
                        dbUtils,
                        cacheClient: instance(cacheClientMock),
                        rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                        gaslessRfqtVipRolloutPercentage: 100,
                    });

                    // bypass smart contract wallet check
                    when(spy(SignatureUtils).getSignerFromHash(anything(), anything())).thenReturn(
                        '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    );

                    const { quote: res } = await service.fetchFirmQuoteAsync({
                        integrator: MOCK_INTEGRATOR,
                        takerAddress,
                        buyToken: contractAddresses.zrxToken,
                        sellToken: contractAddresses.etherToken,
                        buyTokenDecimals: 18,
                        sellTokenDecimals: 18,
                        sellAmount,
                        checkApproval: false,
                    });

                    expect(res).to.exist; // tslint:disable-line: no-unused-expression
                    expect(res?.type).to.equal(GaslessTypes.OtcOrder);

                    expect(res?.sellAmount).to.equal(sellAmount);
                    expect(res?.price.toNumber()).to.equal(1.01);
                    expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);

                    // verify that Gasless RFQt VIP specific params are written into the DB
                    const [quoteOpts] = capture(dbUtilsMock.writeV2QuoteAsync).last();
                    expect(quoteOpts.makerSignature).to.equal(makerSignature);
                    expect(quoteOpts.workflow).to.equal('gasless-rfqt');
                });

                it('should throw if maker signature cannot be fetched', async () => {
                    const sellAmount = new BigNumber(100);
                    const contractAddresses = getContractAddressesForChainOrThrow(1);
                    const quote: IndicativeQuote = {
                        maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                        makerToken: contractAddresses.zrxToken,
                        makerAmount: new BigNumber(101),
                        takerToken: contractAddresses.etherToken,
                        takerAmount: new BigNumber(100),
                        expiry: NEVER_EXPIRES,
                        makerUri: MOCK_MM_URI,
                    };

                    const cacheClientMock = mock(CacheClient);
                    when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                    when(
                        cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything()),
                    ).thenResolve([]);

                    // Mock out the dbUtils
                    const dbUtilsMock = mock(RfqmDbUtils);
                    when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                    const dbUtils = instance(dbUtilsMock);

                    const quoteServerClientMock = mock(QuoteServerClient);
                    when(
                        quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything(), anything()),
                    ).thenResolve([quote]);
                    when(
                        quoteServerClientMock.signV2Async(
                            quote.makerUri,
                            anything(),
                            anything(),
                            anything(),
                            anything(),
                        ),
                    ).thenThrow();
                    const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                    when(
                        rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything()),
                    ).thenResolve([new BigNumber(150)]);

                    const service = buildRfqmServiceForUnitTest({
                        quoteServerClient: instance(quoteServerClientMock),
                        dbUtils,
                        cacheClient: instance(cacheClientMock),
                        rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                        gaslessRfqtVipRolloutPercentage: 100,
                    });

                    try {
                        await service.fetchFirmQuoteAsync({
                            integrator: MOCK_INTEGRATOR,
                            takerAddress,
                            buyToken: contractAddresses.zrxToken,
                            sellToken: contractAddresses.etherToken,
                            buyTokenDecimals: 18,
                            sellTokenDecimals: 18,
                            sellAmount,
                            checkApproval: false,
                        });
                        expect.fail('Firm quote should not be returned if MM fails to sign');
                    } catch (e) {
                        expect(e.message).to.contain('market maker sign failure');
                    }
                });

                it('should only fetch RFQm quote if checkApproval is true', async () => {
                    const sellAmount = new BigNumber(100);
                    const contractAddresses = getContractAddressesForChainOrThrow(1);
                    const quote: IndicativeQuote = {
                        maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                        makerToken: contractAddresses.zrxToken,
                        makerAmount: new BigNumber(101),
                        takerToken: contractAddresses.etherToken,
                        takerAmount: new BigNumber(100),
                        expiry: NEVER_EXPIRES,
                        makerUri: MOCK_MM_URI,
                    };

                    const cacheClientMock = mock(CacheClient);
                    when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                    when(
                        cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything()),
                    ).thenResolve([]);

                    // Mock out the dbUtils
                    const dbUtilsMock = mock(RfqmDbUtils);
                    when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                    const dbUtils = instance(dbUtilsMock);

                    const quoteServerClientMock = mock(QuoteServerClient);
                    when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                        quote,
                    ]);
                    const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                    when(
                        rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything()),
                    ).thenResolve([new BigNumber(150)]);

                    const service = buildRfqmServiceForUnitTest({
                        quoteServerClient: instance(quoteServerClientMock),
                        dbUtils,
                        cacheClient: instance(cacheClientMock),
                        rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                        gaslessRfqtVipRolloutPercentage: 100,
                    });
                    const approval: ApprovalResponse = {
                        isRequired: true,
                        isGaslessAvailable: true,
                        type: MOCK_EXECUTE_META_TRANSACTION_APPROVAL.kind,
                        eip712: MOCK_EXECUTE_META_TRANSACTION_APPROVAL.eip712,
                    };
                    const spiedService = spy(service);
                    when(spiedService.getGaslessApprovalResponseAsync(anything(), anything(), anything())).thenResolve(
                        approval,
                    );

                    const { quote: res } = await service.fetchFirmQuoteAsync({
                        integrator: MOCK_INTEGRATOR,
                        takerAddress,
                        buyToken: contractAddresses.zrxToken,
                        sellToken: contractAddresses.etherToken,
                        buyTokenDecimals: 18,
                        sellTokenDecimals: 18,
                        sellAmount,
                        checkApproval: true,
                    });

                    expect(res).to.exist; // tslint:disable-line: no-unused-expression
                    expect(res?.type).to.equal(GaslessTypes.OtcOrder);

                    expect(res?.sellAmount).to.equal(sellAmount);
                    expect(res?.price.toNumber()).to.equal(1.01);
                    expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);
                    expect(res?.approval).to.eql(approval);

                    // verify that the workflow is `rfqm`
                    const [quoteOpts] = capture(dbUtilsMock.writeV2QuoteAsync).last();
                    expect(quoteOpts.makerSignature).to.not.exist;
                    expect(quoteOpts.workflow).to.equal('rfqm');
                });
            });
        });

        describe('buys', () => {
            it('should fetch a firm quote', async () => {
                const buyAmount = new BigNumber(100);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(100),
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(80),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };

                const cacheClientMock = mock(CacheClient);
                when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve(
                    [],
                );

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);
                const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                    new BigNumber(150),
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    dbUtils,
                    cacheClient: instance(cacheClientMock),
                    rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                });

                const { quote: res } = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                    checkApproval: false,
                });

                expect(res).to.exist; // tslint:disable-line: no-unused-expression
                expect(res?.type).to.equal(GaslessTypes.OtcOrder);
                expect(res?.buyAmount.toNumber()).to.equal(buyAmount.toNumber());
                expect(res?.price.toNumber()).to.equal(0.8);
                expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });

            // TODO: we may want to reintroduce this test very soon. However, if not addressed by June 2022, remove
            it.skip('should scale a firm quote to desired buyAmount if MM returns too much', async () => {
                const buyAmount = new BigNumber(100);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const quote: IndicativeQuote = {
                    maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    makerToken: contractAddresses.zrxToken,
                    makerAmount: new BigNumber(125), // more than buyAmount
                    takerToken: contractAddresses.etherToken,
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                    makerUri: MOCK_MM_URI,
                };

                const cacheClientMock = mock(CacheClient);
                when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                when(cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything())).thenResolve(
                    [],
                );

                // Mock out the dbUtils
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                const dbUtils = instance(dbUtilsMock);

                const quoteServerClientMock = mock(QuoteServerClient);
                when(quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything())).thenResolve([
                    quote,
                ]);
                const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                when(rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything())).thenResolve([
                    new BigNumber(150),
                ]);

                const service = buildRfqmServiceForUnitTest({
                    quoteServerClient: instance(quoteServerClientMock),
                    dbUtils,
                    cacheClient: instance(cacheClientMock),
                    rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                });

                const { quote: res } = await service.fetchFirmQuoteAsync({
                    integrator: MOCK_INTEGRATOR,
                    takerAddress,
                    buyToken: contractAddresses.zrxToken,
                    sellToken: contractAddresses.etherToken,
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                    checkApproval: false,
                });

                expect(res).to.exist; // tslint:disable-line: no-unused-expression
                expect(res?.type).to.equal(GaslessTypes.OtcOrder);
                expect(res?.buyAmount.toNumber()).to.equal(buyAmount.toNumber());
                expect(res?.sellAmount.toNumber()).to.equal(80); // result is scaled
                expect(res?.price.toNumber()).to.equal(0.8);
                expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });

            describe('Gasless RFQt VIP', () => {
                it('should fetch a firm quote', async () => {
                    const buyAmount = new BigNumber(100);
                    const contractAddresses = getContractAddressesForChainOrThrow(1);
                    const quote: IndicativeQuote = {
                        maker: '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                        makerToken: contractAddresses.zrxToken,
                        makerAmount: new BigNumber(100),
                        takerToken: contractAddresses.etherToken,
                        takerAmount: new BigNumber(80),
                        expiry: NEVER_EXPIRES,
                        makerUri: MOCK_MM_URI,
                    };
                    const makerSignature = {
                        r: '',
                        s: '',
                        v: 28,
                        signatureType: SignatureType.EthSign,
                    };

                    const cacheClientMock = mock(CacheClient);
                    when(cacheClientMock.getNextOtcOrderBucketAsync(1337)).thenResolve(420);
                    when(
                        cacheClientMock.getMakersInCooldownForPairAsync(anything(), anything(), anything()),
                    ).thenResolve([]);

                    // Mock out the dbUtils
                    const dbUtilsMock = mock(RfqmDbUtils);
                    when(dbUtilsMock.writeV2QuoteAsync(anything())).thenResolve();
                    const dbUtils = instance(dbUtilsMock);

                    const quoteServerClientMock = mock(QuoteServerClient);
                    when(
                        quoteServerClientMock.batchGetPriceV2Async(anything(), anything(), anything(), anything()),
                    ).thenResolve([quote]);
                    when(
                        quoteServerClientMock.signV2Async(
                            quote.makerUri,
                            anything(),
                            anything(),
                            anything(),
                            anything(),
                        ),
                    ).thenResolve(makerSignature);

                    const rfqMakerBalanceCacheServiceMock = mock(RfqMakerBalanceCacheService);
                    when(
                        rfqMakerBalanceCacheServiceMock.getERC20OwnerBalancesAsync(anything(), anything()),
                    ).thenResolve([new BigNumber(150)]);

                    const service = buildRfqmServiceForUnitTest({
                        quoteServerClient: instance(quoteServerClientMock),
                        dbUtils,
                        cacheClient: instance(cacheClientMock),
                        rfqMakerBalanceCacheService: instance(rfqMakerBalanceCacheServiceMock),
                        gaslessRfqtVipRolloutPercentage: 100,
                    });

                    // bypass smart contract wallet check
                    when(spy(SignatureUtils).getSignerFromHash(anything(), anything())).thenReturn(
                        '0x64B92f5d9E5b5f20603de8498385c3a3d3048E22',
                    );

                    const { quote: res } = await service.fetchFirmQuoteAsync({
                        integrator: MOCK_INTEGRATOR,
                        takerAddress,
                        buyToken: contractAddresses.zrxToken,
                        sellToken: contractAddresses.etherToken,
                        buyTokenDecimals: 18,
                        sellTokenDecimals: 18,
                        buyAmount: new BigNumber(100),
                        checkApproval: false,
                    });

                    expect(res).to.exist; // tslint:disable-line: no-unused-expression
                    expect(res?.type).to.equal(GaslessTypes.OtcOrder);
                    expect(res?.buyAmount.toNumber()).to.equal(buyAmount.toNumber());
                    expect(res?.price.toNumber()).to.equal(0.8);
                    expect(res?.orderHash).to.match(/^0x[0-9a-fA-F]+/);

                    // verify that Gasless RFQt VIP specific params are written into the DB
                    const [quoteOpts] = capture(dbUtilsMock.writeV2QuoteAsync).last();
                    expect(quoteOpts.makerSignature).to.equal(makerSignature);
                    expect(quoteOpts.workflow).to.equal('gasless-rfqt');
                });
            });
        });
    });

    describe('getGaslessApprovalResponseAsync', () => {
        it('returns correct approval field', async () => {
            const service = buildRfqmServiceForUnitTest();

            let approval = await service.getGaslessApprovalResponseAsync(
                MOCK_WORKER_REGISTRY_ADDRESS,
                MOCK_TOKEN,
                new BigNumber(100),
            );
            expect(approval).to.eql({ isRequired: false });

            approval = await service.getGaslessApprovalResponseAsync(
                MOCK_WORKER_REGISTRY_ADDRESS,
                MOCK_TOKEN,
                new BigNumber(100),
            );
            expect(approval).to.eql({ isRequired: true, isGaslessAvailable: false });

            approval = await service.getGaslessApprovalResponseAsync(
                MOCK_WORKER_REGISTRY_ADDRESS,
                MOCK_TOKEN,
                new BigNumber(100),
            );
            expect(approval).to.eql({
                isRequired: true,
                isGaslessAvailable: true,
                type: MOCK_EXECUTE_META_TRANSACTION_APPROVAL.kind,
                hash: MOCK_EXECUTE_META_TRANSACTION_HASH,
                eip712: MOCK_EXECUTE_META_TRANSACTION_APPROVAL.eip712,
            });
        });
    });

    describe('runHealthCheckAsync', () => {
        it('returns active pairs', async () => {
            const dbUtilsMock = mock(RfqmDbUtils);
            when(dbUtilsMock.findRfqmWorkerHeartbeatsAsync(1337)).thenResolve([]);

            const rfqMakerManagerMock = mock(RfqMakerManager);
            when(rfqMakerManagerMock.getRfqmV2MakerOfferings()).thenReturn({
                'https://mock-rfqm1.club': [
                    ['0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c', '0x0b1ba0af832d7c05fd64161e0db78e85978e8082'],
                ],
            });

            const service = buildRfqmServiceForUnitTest({
                dbUtils: instance(dbUtilsMock),
                rfqMakerManager: instance(rfqMakerManagerMock),
            });

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
        describe('v2', () => {
            const expiry = new BigNumber(Date.now() + 1_000_000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
            const chainId = 1337;
            const otcOrder = new OtcOrder({
                txOrigin: '0x0000000000000000000000000000000000000000',
                taker: '0x1111111111111111111111111111111111111111',
                maker: '0x2222222222222222222222222222222222222222',
                makerToken: '0x3333333333333333333333333333333333333333',
                takerToken: '0x4444444444444444444444444444444444444444',
                expiryAndNonce: OtcOrder.encodeExpiryAndNonce(expiry, ZERO, expiry),
                chainId,
                verifyingContract: '0x0000000000000000000000000000000000000000',
            });
            const BASE_JOB = new RfqmV2JobEntity({
                chainId,
                expiry,
                makerUri: '',
                orderHash: '0x00',
                fee: {
                    token: '0xToken',
                    amount: '100',
                    type: 'fixed',
                },
                order: otcOrderToStoredOtcOrder(otcOrder),
                workflow: 'rfqm',
            });
            it('should return failed for jobs that have sat in queue past expiry', async () => {
                const expired = new BigNumber(Date.now() - 10000).dividedBy(ONE_SECOND_MS).decimalPlaces(0);
                const oldJob = new RfqmV2JobEntity({ ...BASE_JOB, expiry: expired });
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(oldJob);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const jobStatus = await service.getStatusAsync('0x00');

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
                const newJob = BASE_JOB; // BASE_JOB has a valid expiry
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(newJob);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const jobStatus = await service.getStatusAsync('0x00');

                if (jobStatus === null) {
                    expect.fail('Status should exist');
                    throw new Error();
                }
                expect(jobStatus.status).to.equal('pending');
            });

            it('should return pending for jobs in processing', async () => {
                const job = new RfqmV2JobEntity({ ...BASE_JOB, status: RfqmJobStatus.PendingProcessing });
                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const jobStatus = await service.getStatusAsync('0x00');

                if (jobStatus === null) {
                    expect.fail('Status should exist');
                    throw new Error();
                }
                expect(jobStatus.status).to.equal('pending');
            });

            it('should return submitted with transaction submissions for submitted jobs', async () => {
                const now = Date.now();
                const transaction1Time = now + 10;
                const transaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    status: RfqmJobStatus.PendingSubmitted,
                });

                const submission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 0,
                });
                const submission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 1,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([submission1, submission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const jobStatus = await service.getStatusAsync('0x00');

                if (jobStatus === null) {
                    expect.fail('Status should exist');
                    throw new Error();
                }

                if (jobStatus.status !== 'submitted') {
                    expect.fail('Status should be submitted');
                    throw new Error();
                }
                expect(jobStatus.transactions).to.have.length(2);
                expect(jobStatus.transactions).to.deep.include({
                    hash: '0x01',
                    timestamp: +transaction1Time.valueOf(),
                });
                expect(jobStatus.transactions).to.deep.include({
                    hash: '0x02',
                    timestamp: +transaction2Time.valueOf(),
                });
            });

            it('should return succeeded for a successful job, with the succeeded job', async () => {
                const now = Date.now();
                const transaction1Time = now + 10;
                const transaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    status: RfqmJobStatus.SucceededUnconfirmed,
                });

                const submission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 0,
                });
                const submission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 1,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([submission1, submission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const jobStatus = await service.getStatusAsync('0x00');

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
                const transaction1Time = now + 10;
                const transaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    status: RfqmJobStatus.SucceededConfirmed,
                });

                const submission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 0,
                });
                const submission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 1,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([submission1, submission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const jobStatus = await service.getStatusAsync('0x00');

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
                const transaction1Time = now + 10;
                const transaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    status: RfqmJobStatus.SucceededUnconfirmed,
                });

                const submission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 0,
                });
                const submission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    status: RfqmTransactionSubmissionStatus.RevertedUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 1,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([submission1, submission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                try {
                    await service.getStatusAsync('0x00');
                    expect.fail();
                } catch (e) {
                    expect(e.message).to.contain('Expected exactly one successful transaction submission');
                }
            });

            it('should throw if the job is successful but there are multiple successful transactions', async () => {
                const now = Date.now();
                const transaction1Time = now + 10;
                const transaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    status: RfqmJobStatus.SucceededUnconfirmed,
                });

                const submission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 0,
                });
                const submission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(transaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 1,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([submission1, submission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                try {
                    await service.getStatusAsync('0x00');
                    expect.fail();
                } catch (e) {
                    expect(e.message).to.contain('Expected exactly one successful transaction submission');
                }
            });

            it('should return submitted with approval and trade transaction submissions for submitted jobs', async () => {
                const now = Date.now();
                const approvalTransaction1Time = now + 3;
                const approvalTransaction2Time = now + 7;
                const tradeTransaction1Time = now + 10;
                const tradeTransaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    status: RfqmJobStatus.PendingSubmitted,
                });

                const approvalSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 0,
                });
                const approvalSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 1,
                });
                const tradeSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x03',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 2,
                });
                const tradeSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x04',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 3,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Approval,
                    ),
                ).thenResolve([approvalSubmission1, approvalSubmission2]);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([tradeSubmission1, tradeSubmission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const orderStatus = await service.getStatusAsync('0x00');

                if (orderStatus === null) {
                    expect.fail('Status should exist');
                    throw new Error();
                }

                if (orderStatus.status !== 'submitted') {
                    expect.fail('Status should be submitted');
                    throw new Error();
                }
                expect(orderStatus.approvalTransactions).to.have.length(2);
                expect(orderStatus.approvalTransactions).to.deep.include({
                    hash: '0x01',
                    timestamp: +approvalTransaction1Time.valueOf(),
                });
                expect(orderStatus.approvalTransactions).to.deep.include({
                    hash: '0x02',
                    timestamp: +approvalTransaction2Time.valueOf(),
                });
                expect(orderStatus.transactions).to.have.length(2);
                expect(orderStatus.transactions).to.deep.include({
                    hash: '0x03',
                    timestamp: +tradeTransaction1Time.valueOf(),
                });
                expect(orderStatus.transactions).to.deep.include({
                    hash: '0x04',
                    timestamp: +tradeTransaction2Time.valueOf(),
                });
            });

            it('should return failed with approval and trade transaction submissions for failed jobs', async () => {
                const now = Date.now();
                const approvalTransaction1Time = now + 3;
                const approvalTransaction2Time = now + 7;
                const tradeTransaction1Time = now + 10;
                const tradeTransaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    status: RfqmJobStatus.FailedExpired,
                });

                const approvalSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 0,
                });
                const approvalSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 1,
                });
                const tradeSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x03',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 2,
                });
                const tradeSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x04',
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 3,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Approval,
                    ),
                ).thenResolve([approvalSubmission1, approvalSubmission2]);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([tradeSubmission1, tradeSubmission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const orderStatus = await service.getStatusAsync('0x00');

                if (orderStatus === null) {
                    expect.fail('Status should exist');
                    throw new Error();
                }

                if (orderStatus.status !== 'failed') {
                    expect.fail('Status should be failed');
                    throw new Error();
                }
                expect(orderStatus.approvalTransactions).to.have.length(2);
                expect(orderStatus.approvalTransactions).to.deep.include({
                    hash: '0x01',
                    timestamp: +approvalTransaction1Time.valueOf(),
                });
                expect(orderStatus.approvalTransactions).to.deep.include({
                    hash: '0x02',
                    timestamp: +approvalTransaction2Time.valueOf(),
                });
                expect(orderStatus.transactions).to.have.length(2);
                expect(orderStatus.transactions).to.deep.include({
                    hash: '0x03',
                    timestamp: +tradeTransaction1Time.valueOf(),
                });
                expect(orderStatus.transactions).to.deep.include({
                    hash: '0x04',
                    timestamp: +tradeTransaction2Time.valueOf(),
                });
            });

            it('should return declined for a job that was declined on the last look', async () => {
                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    status: RfqmJobStatus.FailedLastLookDeclined,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                //what is this dummy first attempt?
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve();
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const jobStatus = await service.getStatusAsync('0x00');

                if (jobStatus === null) {
                    expect.fail('Status should exist');
                    throw new Error();
                }

                expect(jobStatus.status).to.eq('failed');
                if (jobStatus.status == 'failed') {
                    expect(jobStatus.reason).to.eq('last_look_declined');
                }
            });

            it('should return succeeded for a successful job, with the succeeded job and include correct `transactions` and `approvalTransactions`', async () => {
                const now = Date.now();
                const approvalTransaction1Time = now + 3;
                const approvalTransaction2Time = now + 7;
                const tradeTransaction1Time = now + 10;
                const tradeTransaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    status: RfqmJobStatus.SucceededUnconfirmed,
                });

                const approvalSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 0,
                });
                const approvalSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 1,
                });
                const tradeSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x03',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 2,
                });
                const tradeSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x04',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 3,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Approval,
                    ),
                ).thenResolve([approvalSubmission1, approvalSubmission2]);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([tradeSubmission1, tradeSubmission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const orderStatus = await service.getStatusAsync('0x00');

                if (orderStatus === null) {
                    expect.fail('Status should exist');
                    throw new Error();
                }

                if (orderStatus.status !== 'succeeded') {
                    expect.fail('Status should be succeeded');
                    throw new Error();
                }

                if (!orderStatus.approvalTransactions) {
                    expect.fail('Approval transactions not present');
                    throw new Error();
                }

                expect(orderStatus.approvalTransactions[0]).to.contain({
                    hash: '0x02',
                    timestamp: +approvalTransaction2Time.valueOf(),
                });
                expect(orderStatus.transactions[0]).to.contain({
                    hash: '0x04',
                    timestamp: +tradeTransaction2Time.valueOf(),
                });
            });

            it('should return confirmed for a successful confirmed job and include correct `transactions` and `approvalTransactions`', async () => {
                const now = Date.now();
                const approvalTransaction1Time = now + 3;
                const approvalTransaction2Time = now + 7;
                const tradeTransaction1Time = now + 10;
                const tradeTransaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    status: RfqmJobStatus.SucceededConfirmed,
                });

                const approvalSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 0,
                });
                const approvalSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 1,
                });
                const tradeSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x03',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 2,
                });
                const tradeSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x04',
                    status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 3,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Approval,
                    ),
                ).thenResolve([approvalSubmission1, approvalSubmission2]);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([tradeSubmission1, tradeSubmission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                const orderStatus = await service.getStatusAsync('0x00');

                if (orderStatus === null) {
                    expect.fail('Status should exist');
                    throw new Error();
                }

                if (orderStatus.status !== 'confirmed') {
                    expect.fail('Status should be confirmed');
                    throw new Error();
                }

                if (!orderStatus.approvalTransactions) {
                    expect.fail('Approval transactions not present');
                    throw new Error();
                }

                expect(orderStatus.approvalTransactions[0]).to.contain({
                    hash: '0x02',
                    timestamp: +approvalTransaction2Time.valueOf(),
                });
                expect(orderStatus.transactions[0]).to.contain({
                    hash: '0x04',
                    timestamp: +tradeTransaction2Time.valueOf(),
                });
            });

            it('should throw if the job is successful but there are no successful transactions for approval', async () => {
                const now = Date.now();
                const approvalTransaction1Time = now + 3;
                const approvalTransaction2Time = now + 7;
                const tradeTransaction1Time = now + 10;
                const tradeTransaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    status: RfqmJobStatus.SucceededUnconfirmed,
                });

                const approvalSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 0,
                });
                const approvalSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    status: RfqmTransactionSubmissionStatus.RevertedUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 1,
                });
                const tradeSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x03',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 2,
                });
                const tradeSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x04',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 3,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Approval,
                    ),
                ).thenResolve([approvalSubmission1, approvalSubmission2]);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([tradeSubmission1, tradeSubmission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                try {
                    await service.getStatusAsync('0x00');
                    expect.fail();
                } catch (e) {
                    expect(e.message).to.contain('Expected exactly one successful transaction submission');
                }
            });

            it('should throw if the job is successful but there are multiple successful transactions for approval', async () => {
                const now = Date.now();
                const approvalTransaction1Time = now + 3;
                const approvalTransaction2Time = now + 7;
                const tradeTransaction1Time = now + 10;
                const tradeTransaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    status: RfqmJobStatus.SucceededUnconfirmed,
                });

                const approvalSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 0,
                });
                const approvalSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x02',
                    status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 1,
                });
                const tradeSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x03',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 2,
                });
                const tradeSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x04',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 3,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Approval,
                    ),
                ).thenResolve([approvalSubmission1, approvalSubmission2]);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([tradeSubmission1, tradeSubmission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                try {
                    await service.getStatusAsync('0x00');
                    expect.fail();
                } catch (e) {
                    expect(e.message).to.contain('Expected exactly one successful transaction submission');
                }
            });

            it('should throw if the job is successful but the successful transaciton has no hash for approval', async () => {
                const now = Date.now();
                const approvalTransaction1Time = now + 3;
                const approvalTransaction2Time = now + 7;
                const tradeTransaction1Time = now + 10;
                const tradeTransaction2Time = now + 20;

                const job = new RfqmV2JobEntity({
                    ...BASE_JOB,
                    approval: MOCK_EXECUTE_META_TRANSACTION_APPROVAL,
                    status: RfqmJobStatus.SucceededUnconfirmed,
                });

                const approvalSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x01',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 0,
                });
                const approvalSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(approvalTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '',
                    status: RfqmTransactionSubmissionStatus.SucceededConfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Approval,
                    nonce: 1,
                });
                const tradeSubmission1 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction1Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x03',
                    status: RfqmTransactionSubmissionStatus.DroppedAndReplaced,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 2,
                });
                const tradeSubmission2 = new RfqmV2TransactionSubmissionEntity({
                    createdAt: new Date(tradeTransaction2Time),
                    orderHash: job.orderHash,
                    transactionHash: '0x04',
                    status: RfqmTransactionSubmissionStatus.SucceededUnconfirmed,
                    from: job.order.order.txOrigin,
                    to: job.order.order.verifyingContract,
                    type: RfqmTransactionSubmissionType.Trade,
                    nonce: 3,
                });

                const dbUtilsMock = mock(RfqmDbUtils);
                when(dbUtilsMock.findV2JobByOrderHashAsync(anything())).thenResolve(job);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Approval,
                    ),
                ).thenResolve([approvalSubmission1, approvalSubmission2]);
                when(
                    dbUtilsMock.findV2TransactionSubmissionsByOrderHashAsync(
                        job.orderHash,
                        RfqmTransactionSubmissionType.Trade,
                    ),
                ).thenResolve([tradeSubmission1, tradeSubmission2]);
                const service = buildRfqmServiceForUnitTest({ dbUtils: instance(dbUtilsMock) });

                try {
                    await service.getStatusAsync('0x00');
                    expect.fail();
                } catch (e) {
                    expect(e.message).to.contain('does not have a hash');
                }
            });
        });
    });
});
