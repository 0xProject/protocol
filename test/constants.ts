import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { IZeroExRfqOrderFilledEventArgs } from '@0x/contract-wrappers';
import { web3Factory, Web3ProviderEngine } from '@0x/dev-utils';
import { ETH_TOKEN_ADDRESS, MetaTransaction } from '@0x/protocol-utils';
import { ObjectMap } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { LogWithDecodedArgs } from 'ethereum-types';
import { providers } from 'ethers';

import { EXECUTE_META_TRANSACTION_EIP_712_TYPES, PERMIT_EIP_712_TYPES } from '../src/core/constants';
import { ExecuteMetaTransactionApproval, Fee, GaslessApprovalTypes, PermitApproval } from '../src/core/types';

export const CHAIN_ID = 1337;
// tslint:disable-next-line:custom-no-magic-numbers
export const MAX_INT = new BigNumber(2).pow(256).minus(1);
export const MAX_MINT_AMOUNT = new BigNumber('10000000000000000000000');
export const CONTRACT_ADDRESSES: ContractAddresses = getContractAddressesForChainOrThrow(CHAIN_ID);
export { ETH_TOKEN_ADDRESS };
export const ZRX_TOKEN_ADDRESS = CONTRACT_ADDRESSES.zrxToken;
export const WETH_TOKEN_ADDRESS = CONTRACT_ADDRESSES.etherToken;
export const UNKNOWN_TOKEN_ADDRESS = '0xbe0037eaf2d64fe5529bca93c18c9702d3930376';
export const SYMBOL_TO_ADDRESS: ObjectMap<string> = {
    ZRX: ZRX_TOKEN_ADDRESS,
    WETH: WETH_TOKEN_ADDRESS,
    ETH: ETH_TOKEN_ADDRESS,
};
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const AFFILIATE_DATA_SELECTOR = '869584cd';

export const MATCHA_AFFILIATE_ADDRESS = '0x86003b044f70dac0abc80ac8957305b6370893ed';
export const MATCHA_AFFILIATE_ENCODED_PARTIAL_ORDER_DATA =
    '869584cd00000000000000000000000086003b044f70dac0abc80ac8957305b6370893ed0000000000000000000000000000000000000000000000';

export const WORKER_TEST_ADDRESS = '0xE834EC434DABA538cd1b9Fe1582052B880BD7e63';
export const WORKER_TEST_PRIVATE_KEY = '0xff12e391b79415e941a94de3bf3a9aee577aed0731e297d5cfa0b8a1e02fa1d0';

const ganacheConfigs = {
    shouldUseInProcessGanache: false,
    shouldAllowUnlimitedContractSize: true,
    shouldUseFakeGasEstimate: false,
};

export const getProvider = (): Web3ProviderEngine => {
    return web3Factory.getRpcProvider(ganacheConfigs);
};
export const TEST_RFQ_ORDER_FILLED_EVENT_LOG: providers.Log = {
    address: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    blockHash: '0x4c9f6904bd33f57204a8451de0891b448a7be065c1704e5b6905f382cb31b040',
    blockNumber: 11598119,
    data: '0xf70ec34e807d08cb83757ec62fffd9e0d22db6b4b97f46b78adcf47682c4cccb000000000000000000000000e89bc18cee87c9af8b472635a152704b96dafb8f0000000000000000000000009016cc2122b52ff5d9937c0c1422b78d7e81ceea0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000e44a075a36f7e7010000000000000000000000000000000000000000000000000000000000000000',
    logIndex: 74,
    removed: false,
    topics: ['0x829fa99d94dc4636925b38632e625736a614c154d55006b7ab6bea979c210c32'],
    transactionHash: '0x2b723137d9328fbe5e64bc2729ef5b1d846bb1d242ae2f3c016b9f70715aa818',
    transactionIndex: 70,
};
export const TEST_RFQ_ORDER_FILLED_EVENT_TAKER_AMOUNT = new BigNumber('10000000000000000');
export const TEST_DECODED_RFQ_ORDER_FILLED_EVENT_LOG: LogWithDecodedArgs<IZeroExRfqOrderFilledEventArgs> = {
    blockHash: '0x4c9f6904bd33f57204a8451de0891b448a7be065c1704e5b6905f382cb31b040',
    address: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
    logIndex: 74,
    data: '0xf70ec34e807d08cb83757ec62fffd9e0d22db6b4b97f46b78adcf47682c4cccb000000000000000000000000e89bc18cee87c9af8b472635a152704b96dafb8f0000000000000000000000009016cc2122b52ff5d9937c0c1422b78d7e81ceea0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000000000000000000000000000e44a075a36f7e7010000000000000000000000000000000000000000000000000000000000000000',
    topics: ['0x829fa99d94dc4636925b38632e625736a614c154d55006b7ab6bea979c210c32'],
    blockNumber: 11598119,
    args: {
        orderHash: '0xf70ec34e807d08cb83757ec62fffd9e0d22db6b4b97f46b78adcf47682c4cccb',
        maker: '0xe89bc18cee87c9af8b472635a152704b96dafb8f',
        taker: '0x9016cc2122b52ff5d9937c0c1422b78d7e81ceea',
        makerToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
        takerToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        takerTokenFilledAmount: TEST_RFQ_ORDER_FILLED_EVENT_TAKER_AMOUNT,
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        makerTokenFilledAmount: new BigNumber(16449968672974825217),
        pool: '0x0000000000000000000000000000000000000000000000000000000000000000',
    },
    transactionIndex: 70,
    transactionHash: '0x2b723137d9328fbe5e64bc2729ef5b1d846bb1d242ae2f3c016b9f70715aa818',
    event: 'RfqOrderFilled',
};
export const MOCK_EXECUTE_META_TRANSACTION_APPROVAL: ExecuteMetaTransactionApproval = {
    kind: GaslessApprovalTypes.ExecuteMetaTransaction,
    eip712: {
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'verifyingContract', type: 'address' },
                { name: 'salt', type: 'bytes32' },
            ],
            ...EXECUTE_META_TRANSACTION_EIP_712_TYPES,
        },
        primaryType: 'MetaTransaction',
        domain: {
            name: 'Fake Token',
            version: '1',
            verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
            salt: '0x5a17000000000000000000000000000000000000000000000000000000000000',
        },
        message: {
            nonce: 1,
            from: WORKER_TEST_ADDRESS,
            functionSignature:
                '0x095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        },
    },
};
export const MOCK_EXECUTE_META_TRANSACTION_CALLDATA =
    '0x0c53c51c000000000000000000000000e834ec434daba538cd1b9fe1582052b880bd7e6300000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000044095ea7b3000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000';

export const MOCK_PERMIT_APPROVAL: PermitApproval = {
    kind: GaslessApprovalTypes.Permit,
    eip712: {
        types: {
            EIP712Domain: [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'verifyingContract', type: 'address' },
                { name: 'salt', type: 'bytes32' },
            ],
            ...PERMIT_EIP_712_TYPES,
        },
        primaryType: 'Permit',
        domain: {
            name: 'Fake Token',
            version: '1',
            verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
            salt: '0x5a17000000000000000000000000000000000000000000000000000000000000',
        },
        message: {
            owner: '0x9016cc2122b52ff5d9937c0c1422b78d7e81ceea',
            spender: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
            value: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
            nonce: 1,
            deadline: '123456789',
        },
    },
};

export const MOCK_PERMIT_CALLDATA =
    '0xd505accf0000000000000000000000009016cc2122b52ff5d9937c0c1422b78d7e81ceea000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000075bcd15000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

export const MOCK_META_TRANSACTION = new MetaTransaction({
    signer: '0xabcdef',
    sender: '0xabcdef',
    minGasPrice: new BigNumber(0),
    maxGasPrice: new BigNumber(1),
    expirationTimeSeconds: new BigNumber(2),
    salt: new BigNumber(3),
    callData: '0x1234567890',
    value: new BigNumber(4),
    feeToken: '0xdef',
    feeAmount: new BigNumber(5),
    chainId: 1,
    verifyingContract: '0xdef1',
});

export const MOCK_STORED_META_TRANSACTION = {
    signer: '0xabcdef',
    sender: '0xabcdef',
    minGasPrice: '0',
    maxGasPrice: '1',
    expirationTimeSeconds: '2',
    salt: '3',
    callData: '0x1234567890',
    value: '4',
    feeToken: '0xdef',
    feeAmount: '5',
    chainId: '1',
    verifyingContract: '0xdef1',
};

export const MOCK_FEE: Fee = {
    type: 'fixed',
    token: '0xtoken',
    amount: new BigNumber(0),
};

export const MOCK_STORED_FEE = {
    type: 'fixed',
    token: '0xtoken',
    amount: '0',
    details: undefined,
};
