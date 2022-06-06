import { SupportedProvider } from '@0x/subproviders';
import { expect } from 'chai';
import { providers, Wallet } from 'ethers';
import { anything, instance, mock, when } from 'ts-mockito';

import { BalanceChecker } from '../../src/utils/balance_checker';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';

let supportedProvider: SupportedProvider;
let balancerChecker: BalanceChecker;
let ethersProvider: providers.JsonRpcProvider;
let ethersWallet: Wallet;

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
    });

    describe('createAccessListForExchangeProxyCallAsync', () => {
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

            const rfqBlockchainUtils: RfqBlockchainUtils = new RfqBlockchainUtils(
                instance(supportedProvider),
                PROXY_ADDR,
                instance(balancerChecker),
                instance(ethersProvider),
                instance(ethersWallet),
            );

            return expect(await rfqBlockchainUtils.createAccessListForExchangeProxyCallAsync(CALLDATA, FROM)).to.eql({
                accessList: {
                    [ACCESS_LIST_ADDR_1]: [STORAGE_KEY_1],
                    [ACCESS_LIST_ADDR_2]: [STORAGE_KEY_2],
                },
                gasEstimate: 38823,
            });
        });

        it('throws exception on failed eth_createAccessList RPC call', async () => {
            when(ethersProvider.send(anything(), anything())).thenReject(new Error('RPC error'));
            const rfqBlockchainUtils: RfqBlockchainUtils = new RfqBlockchainUtils(
                instance(supportedProvider),
                PROXY_ADDR,
                instance(balancerChecker),
                instance(ethersProvider),
                instance(ethersWallet),
            );

            try {
                await rfqBlockchainUtils.createAccessListForExchangeProxyCallAsync(CALLDATA, FROM);
                expect.fail();
            } catch (e) {
                expect(e.message).to.include('createAccessListForExchangeProxyCallAsync');
            }
        });

        it('throws exception on malformed RPC response', async () => {
            when(ethersProvider.send(anything(), anything())).thenResolve(1);
            const rfqBlockchainUtils: RfqBlockchainUtils = new RfqBlockchainUtils(
                instance(supportedProvider),
                PROXY_ADDR,
                instance(balancerChecker),
                instance(ethersProvider),
                instance(ethersWallet),
            );

            try {
                await rfqBlockchainUtils.createAccessListForExchangeProxyCallAsync(CALLDATA, FROM);
                expect.fail();
            } catch (e) {
                expect(e.message).to.include('createAccessListForExchangeProxyCallAsync');
            }
        });
    });
});
