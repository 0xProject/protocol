import { SupportedProvider } from '@0x/subproviders';
import { BigNumber } from '@0x/utils';
import { providers, Wallet } from 'ethersv5';
import { anything, instance, mock, spy, when } from 'ts-mockito';

import { EXECUTE_META_TRANSACTION_EIP_712_TYPES, PERMIT_EIP_712_TYPES } from '../../src/core/constants';
import { EIP_712_REGISTRY } from '../../src/eip712registry';
import { GaslessApprovalTypes } from '../../src/core/types';
import { BalanceChecker } from '../../src/utils/balance_checker';
import { extractEIP712DomainType } from '../../src/utils/Eip712Utils';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';
import { NULL_ADDRESS } from '@0x/utils';

let supportedProvider: SupportedProvider;
let balancerChecker: BalanceChecker;
let ethersProvider: providers.JsonRpcProvider;
let ethersWallet: Wallet;
let rfqBlockchainUtils: RfqBlockchainUtils;

const ACCESS_LIST_ADDR_1 = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const STORAGE_KEY_1 = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ACCESS_LIST_ADDR_2 = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const STORAGE_KEY_2 = '0x3617319a054d772f909f7c479a2cebe5066e836a939412e32403c99029b92eff';
const CALLDATA = '0xd0e30db0';
const PROXY_ADDR = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';
const PERMIT_AND_CALL_ADDR = NULL_ADDRESS;
const FROM = '0xdef1c0ded9bec7f1a1670819833240f027b25ef1';

describe('RfqBlockchainUtils', () => {
    beforeEach(() => {
        supportedProvider = mock<SupportedProvider>();
        balancerChecker = mock(BalanceChecker);
        ethersProvider = mock(providers.JsonRpcProvider);
        ethersWallet = mock(Wallet);
        rfqBlockchainUtils = new RfqBlockchainUtils(
            instance(supportedProvider),
            PROXY_ADDR,
            PERMIT_AND_CALL_ADDR,
            instance(balancerChecker),
            instance(ethersProvider),
            instance(ethersWallet),
        );
    });

    describe('createAccessListForAsync', () => {
        it('returns correct TxAccessListWithGas object', async () => {
            when(ethersProvider.send(anything(), anything())).thenResolve({
                accessList: [
                    {
                        address: ACCESS_LIST_ADDR_1,
                        storageKeys: [STORAGE_KEY_1],
                    },
                    {
                        address: ACCESS_LIST_ADDR_2,
                        storageKeys: [STORAGE_KEY_2],
                    },
                ],
                gasUsed: '0x651a',
            });

            expect(await rfqBlockchainUtils.createAccessListForAsync({ data: CALLDATA, from: FROM })).toEqual({
                accessList: {
                    [ACCESS_LIST_ADDR_1]: [STORAGE_KEY_1],
                    [ACCESS_LIST_ADDR_2]: [STORAGE_KEY_2],
                },
                gasEstimate: 25882,
            });
        });

        it('throws exception on failed eth_createAccessList RPC call', async () => {
            when(ethersProvider.send(anything(), anything())).thenReject(new Error('RPC error'));

            await expect(async () => {
                await rfqBlockchainUtils.createAccessListForAsync({ data: CALLDATA, from: FROM });
            }).rejects.toThrow('createAccessListForAsync');
        });

        it('throws exception on malformed RPC response', async () => {
            when(ethersProvider.send(anything(), anything())).thenResolve(1);

            await expect(async () => {
                await rfqBlockchainUtils.createAccessListForAsync({ data: CALLDATA, from: FROM });
            }).rejects.toThrow('createAccessListForAsync');
        });
    });

    describe('getGaslessApprovalAsync', () => {
        it('returns null if a token does not exist in EIP-712 registry', async () => {
            expect(await rfqBlockchainUtils.getGaslessApprovalAsync(12345, 'random', '0x1234')).toBeNull();
            expect(await rfqBlockchainUtils.getGaslessApprovalAsync(137, 'random', '0x1234')).toBeNull();
        });

        it('returns the correct approval object for executeMetaTransaction::approve', async () => {
            // Given
            const executeMetaTxToken = '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3'; // BAL
            const { domain } = EIP_712_REGISTRY[137][executeMetaTxToken];
            when(ethersProvider._isProvider).thenReturn(true);
            const spiedBlockchainUtils = spy(rfqBlockchainUtils);
            when(spiedBlockchainUtils.getMetaTransactionNonceAsync(anything(), anything())).thenResolve(
                new BigNumber('0x1'),
            );

            // When
            const approval = await rfqBlockchainUtils.getGaslessApprovalAsync(137, executeMetaTxToken, FROM);

            // Then
            expect(approval).toEqual({
                kind: GaslessApprovalTypes.ExecuteMetaTransaction,
                eip712: {
                    types: {
                        ...extractEIP712DomainType(domain),
                        ...EXECUTE_META_TRANSACTION_EIP_712_TYPES,
                    },
                    primaryType: 'MetaTransaction',
                    domain,
                    message: {
                        nonce: 1,
                        from: FROM,
                        functionSignature:
                            '0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                    },
                },
            });
        });

        it('returns the correct approval object for permit', async () => {
            // Given
            const permitToken = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'; // USDC
            const { domain } = EIP_712_REGISTRY[137][permitToken];
            when(ethersProvider._isProvider).thenReturn(true);
            const spiedBlockchainUtils = spy(rfqBlockchainUtils);
            when(spiedBlockchainUtils.getPermitNonceAsync(anything(), anything())).thenResolve(new BigNumber('0x1'));

            // When
            const approval = await rfqBlockchainUtils.getGaslessApprovalAsync(137, permitToken, FROM, 0);

            // Then
            expect(approval).toEqual({
                kind: GaslessApprovalTypes.Permit,
                eip712: {
                    types: {
                        ...extractEIP712DomainType(domain),
                        ...PERMIT_EIP_712_TYPES,
                    },
                    primaryType: 'Permit',
                    domain,
                    message: {
                        owner: FROM,
                        spender: PROXY_ADDR,
                        value: '115792089237316195423570985008687907853269984665640564039457584007913129639935', // infinite approval
                        nonce: 1,
                        deadline: '600', // 10 minutes from 0
                    },
                },
            });
        });
    });
});
