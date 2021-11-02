import { BigNumber } from '@0x/utils';

export enum RfqmJobStatus {
    // Transaction has been enqueued and will be processed once a worker is available
    PendingEnqueued = 'pending_enqueued',
    // Transaction has passed initial validation. Last look will be executed and transaction will be submitted if last look is accepted.
    PendingProcessing = 'pending_processing',
    // Last look has been accepted, awaiting submission
    PendingLastLookAccepted = 'pending_last_look_accepted',
    // Transaction has passed initial verification and has been submitted to the mem pool
    PendingSubmitted = 'pending_submitted',

    // Eth Call made before transaction submission was unsuccessful
    FailedEthCallFailed = 'failed_eth_call_failed',
    // Transaction has expired prior to eth call or worker is not available to make an eth call
    FailedExpired = 'failed_expired',
    // Market Maker declined the last look
    FailedLastLookDeclined = 'failed_last_look_declined',
    // Transaction was reverted more than 3 blocks ago
    FailedRevertedConfirmed = 'failed_reverted_confirmed',
    // Transaction was reverted less than 3 blocks ago
    FailedRevertedUnconfirmed = 'failed_reverted_unconfirmed',
    // Submitting the transaction to the network was unsuccessful
    FailedSubmitFailed = 'failed_submit_failed',
    // Transaction does not contain call data
    FailedValidationNoCallData = 'failed_validation_no_call_data',
    // Transaction does not include a maker URI
    FailedValidationNoMakerUri = 'failed_validation_no_maker_uri',
    // Transaction does not contain an order
    FailedValidationNoOrder = 'failed_validation_no_order',
    // Transaction does not contain a fee
    FailedValidationNoFee = 'failed_validation_no_fee',

    // Transaction has succeeded with 3 subsequent blocks
    SucceededConfirmed = 'succeeded_confirmed',
    // Transaction was successfully mined and filled
    SucceededUnconfirmed = 'succeeded_unconfirmed',
}

export enum RfqmTransactionSubmissionStatus {
    DroppedAndReplaced = 'dropped_and_replaced',
    Presubmit = 'presubmit', // Transaction created but not yet broadcast
    RevertedConfirmed = 'reverted_confirmed',
    RevertedUnconfirmed = 'reverted_unconfirmed',
    Submitted = 'submitted',
    SucceededConfirmed = 'succeeded_confirmed',
    SucceededUnconfirmed = 'succeeded_unconfirmed',
}

export interface StoredFee {
    token: string;
    amount: string;
    type: 'fixed' | 'bps';
}

export interface TransactionEntityOpts {
    refHash: string;
    apiKey?: string;
    txHash?: string;
    takerAddress?: string;
    status: string;
    expectedMinedInSec: number;
    to: string;
    data?: string;
    value?: BigNumber;
    from?: string;
    nonce?: number;
    gasPrice?: BigNumber;
    gas?: number | null;
    gasUsed?: number | null;
    blockNumber?: number;
    // Ethereum tx status, 1 == success, 0 == failure
    txStatus?: number | null;
}

export enum RfqmOrderTypes {
    V4Rfq = 'v4Rfq',
    Otc = 'otc',
}
