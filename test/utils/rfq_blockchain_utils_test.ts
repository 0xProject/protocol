// tslint:disable:custom-no-magic-numbers no-unused-expression
import { SupportedProvider } from '@0x/subproviders';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import { providers, Wallet } from 'ethers';
import { anything, instance, mock, spy, when } from 'ts-mockito';

import { EXECUTE_META_TRANSACTION_EIP_712_TYPES } from '../../src/constants';
import { EIP_712_REGISTRY } from '../../src/eip712registry';
import { GaslessApprovalTypes } from '../../src/types';
import { BalanceChecker } from '../../src/utils/balance_checker';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';

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

            return expect(await rfqBlockchainUtils.createAccessListForAsync({ data: CALLDATA, from: FROM })).to.eql({
                accessList: {
                    [ACCESS_LIST_ADDR_1]: [STORAGE_KEY_1],
                    [ACCESS_LIST_ADDR_2]: [STORAGE_KEY_2],
                },
                gasEstimate: 25882,
            });
        });

        it('throws exception on failed eth_createAccessList RPC call', async () => {
            when(ethersProvider.send(anything(), anything())).thenReject(new Error('RPC error'));

            try {
                await rfqBlockchainUtils.createAccessListForAsync({ data: CALLDATA, from: FROM });
                expect.fail();
            } catch (e) {
                expect(e.message).to.include('createAccessListForAsync');
            }
        });

        it('throws exception on malformed RPC response', async () => {
            when(ethersProvider.send(anything(), anything())).thenResolve(1);

            try {
                await rfqBlockchainUtils.createAccessListForAsync({ data: CALLDATA, from: FROM });
                expect.fail();
            } catch (e) {
                expect(e.message).to.include('createAccessListForAsync');
            }
        });
    });

    describe('getGaslessApprovalAsync', () => {
        it('returns null if a token does not exist in EIP-712 registry', async () => {
            expect(await rfqBlockchainUtils.getGaslessApprovalAsync(12345, 'random', '0x1234')).to.be.null;
            expect(await rfqBlockchainUtils.getGaslessApprovalAsync(137, 'random', '0x1234')).to.be.null;
        });

        it('returns the correct approval object', async () => {
            when(ethersProvider._isProvider).thenReturn(true);
            const spiedBlockchainUtils = spy(rfqBlockchainUtils);
            when(spiedBlockchainUtils.getMetaTransactionNonceAsync(anything(), anything())).thenResolve(
                new BigNumber('0x1'),
            );
            const approval = await rfqBlockchainUtils.getGaslessApprovalAsync(
                137,
                '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
                FROM,
            );
            expect(approval).to.eql({
                kind: GaslessApprovalTypes.ExecuteMetaTransaction,
                eip712: {
                    types: EXECUTE_META_TRANSACTION_EIP_712_TYPES,
                    primaryType: 'MetaTransaction',
                    domain: EIP_712_REGISTRY[137]['0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3'].domain,
                    message: {
                        nonce: 1,
                        from: FROM,
                        functionSignature:
                            '0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                    },
                },
            });
        });
    });
});
