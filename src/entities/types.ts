import { BigNumber } from '@0x/utils';

import { ZeroExTransactionWithoutDomain } from '../types';

export interface TransactionEntityOpts {
    refHash: string;
    txHash?: string;
    signedTx?: string;
    takerAddress?: string;
    status: string;
    expectedMinedInSec: number;
    nonce?: number;
    gasPrice?: BigNumber;
    protocolFee?: BigNumber;
    blockNumber?: number;
    zeroExTransaction?: ZeroExTransactionWithoutDomain;
    zeroExTransactionSignature?: string;
    from?: string;
}
