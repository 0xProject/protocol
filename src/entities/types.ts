import { BigNumber } from '@0x/utils';

export enum RfqmJobStatus {
    // Transaction has been enqueued and will be processed once a worker is available
    PendingEnqueued = 'pending_enqueued',
    // Transaction has passed initial validation. Last look will be executed and transaction will be submitted if last look is accepted.
    PendingProcessing = 'pending_processing',
    // For v1 orders, the last look has been approved. For v2 orders, the market maker has signed the order.
    PendingLastLookAccepted = 'pending_last_look_accepted',
    // Transaction has passed initial verification and has been submitted to the mem pool
    PendingSubmitted = 'pending_submitted',

    // Eth Call made before transaction submission was unsuccessful
    FailedEthCallFailed = 'failed_eth_call_failed',
    // Transaction has expired prior to eth call or worker is not available to make an eth call
    FailedExpired = 'failed_expired',
    // Market Maker declined the last look
    FailedLastLookDeclined = 'failed_last_look_declined',
    // [RFQM v2] Balance checks executed before obtaining market maker signature failed
    FailedPresignValidationFailed = 'failed_presign_validation_failed',
    // Transaction was reverted more than 3 blocks ago
    FailedRevertedConfirmed = 'failed_reverted_confirmed',
    // Transaction was reverted less than 3 blocks ago
    FailedRevertedUnconfirmed = 'failed_reverted_unconfirmed',
    // Obtaining the market maker's signature for a v2 order failed.
    // This is NOT a status for the case where the market maker intentionally declined to sign.
    FailedSignFailed = 'failed_sign_failed',
    // Submitting the transaction to the network was unsuccessful
    FailedSubmitFailed = 'failed_submit_failed',
    // Transaction does not contain call data
    FailedValidationNoCallData = 'failed_validation_no_call_data',
    // Transaction does not include a maker URI
    FailedValidationNoMakerUri = 'failed_validation_no_maker_uri',
    // Job has been submitted with no taker signuature
    FailedValidationNoTakerSignature = 'failed_validation_no_taker_signature',
    // Transaction does not contain an order
    FailedValidationNoOrder = 'failed_validation_no_order',
    // Transaction does not contain a fee
    FailedValidationNoFee = 'failed_validation_no_fee',

    // Transaction has succeeded with 3 subsequent blocks
    SucceededConfirmed = 'succeeded_confirmed',
    // Transaction was successfully mined and filled
    SucceededUnconfirmed = 'succeeded_unconfirmed',
}

/**
 * Determines whether or not a given `RfqmJobStatus` indicates
 * the associated job has been processed to completion or not.
 *
 * Returns `true` if the status indicates the associated job is
 * resolved and should not be retried; returns `false` if the
 * associated job is in an incomplete state and should be retried.
 */
function isJobResolved(status: RfqmJobStatus): boolean {
    switch (status) {
        case RfqmJobStatus.FailedEthCallFailed:
        case RfqmJobStatus.FailedExpired:
        case RfqmJobStatus.FailedLastLookDeclined:
        case RfqmJobStatus.FailedPresignValidationFailed:
        case RfqmJobStatus.FailedRevertedConfirmed:
        case RfqmJobStatus.FailedSignFailed:
        case RfqmJobStatus.FailedSubmitFailed:
        case RfqmJobStatus.FailedValidationNoCallData:
        case RfqmJobStatus.FailedValidationNoFee:
        case RfqmJobStatus.FailedValidationNoMakerUri:
        case RfqmJobStatus.FailedValidationNoOrder:
        case RfqmJobStatus.FailedValidationNoTakerSignature:
        case RfqmJobStatus.SucceededConfirmed:
            return true;
        case RfqmJobStatus.FailedRevertedUnconfirmed:
        case RfqmJobStatus.PendingEnqueued:
        case RfqmJobStatus.PendingLastLookAccepted:
        case RfqmJobStatus.PendingProcessing:
        case RfqmJobStatus.PendingSubmitted:
        case RfqmJobStatus.SucceededUnconfirmed:
            return false;
        default:
            ((_x: never) => {
                throw new Error('unreachable');
            })(status);
    }
}

/**
 * `RfqmJobStatus` values which should be considered incomplete
 * and should be retried.
 */
export const UnresolvedRfqmJobStatuses = Object.values(RfqmJobStatus).filter((v) => !isJobResolved(v));

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
