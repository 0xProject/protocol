import { BigNumber } from '@0x/asset-swapper';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { BigNumberTransformer } from './transformers';

export interface StoredFee {
    token: string;
    amount: string;
    type: 'fixed' | 'bps';
}

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

export enum RfqmOrderTypes {
    V4Rfq = 'v4Rfq',
}

export interface V4RfqStoredOrder {
    type: RfqmOrderTypes.V4Rfq;
    order: V4StringRfqOrderFields;
}

export interface V4RfqStoredOrder {
    type: RfqmOrderTypes.V4Rfq;
    order: V4StringRfqOrderFields;
}

export type StoredOrder = V4RfqStoredOrder;

export interface V4StringRfqOrderFields {
    txOrigin: string;
    maker: string;
    taker: string;
    makerToken: string;
    takerToken: string;
    makerAmount: string;
    takerAmount: string;
    pool: string;
    expiry: string;
    salt: string;
    chainId: string;
    verifyingContract: string;
}

export type RfqmJobConstructorOpts = Pick<RfqmJobEntity, 'calldata' | 'chainId' | 'expiry' | 'makerUri' | 'orderHash'> &
    Partial<RfqmJobEntity>;

@Entity({ name: 'rfqm_jobs' })
export class RfqmJobEntity {
    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    @Column({ name: 'metatransaction_hash', type: 'varchar', nullable: true, unique: true })
    public metaTransactionHash: string | null;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
    public updatedAt: Date | null;

    // The expiration time of the job, in unix seconds
    @Column({ name: 'expiry', type: 'numeric', transformer: BigNumberTransformer })
    public expiry: BigNumber;

    @Column({ name: 'chain_id', type: 'integer' })
    public chainId: number;

    @Column({ name: 'integrator_id', type: 'varchar', nullable: true })
    public integratorId: string | null;

    @Column({ name: 'maker_uri', type: 'varchar' })
    public makerUri: string;

    @Index()
    @Column({ name: 'status', type: 'varchar' })
    public status: RfqmJobStatus;

    @Column({ name: 'calldata', type: 'varchar' })
    public calldata: string;

    @Column({ name: 'fee', type: 'jsonb', nullable: true })
    public fee: StoredFee | null;

    @Column({ name: 'order', type: 'jsonb', nullable: true })
    public order: StoredOrder | null;

    @Column({ name: 'metadata', type: 'jsonb', nullable: true })
    public metadata: object | null;

    @Column({ name: 'is_completed', type: 'boolean', nullable: false, default: () => false })
    public isCompleted: boolean;

    @Column({ name: 'worker_address', type: 'varchar', nullable: true })
    public workerAddress: string | null;

    @Column({ name: 'last_look_result', type: 'boolean', nullable: true })
    public lastLookResult: boolean | null;

    @Column({ name: 'affiliate_address', type: 'varchar', nullable: true })
    public affiliateAddress: string | null;

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqmJobConstructorOpts = {} as RfqmJobConstructorOpts) {
        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.affiliateAddress = opts.affiliateAddress || null;
        this.calldata = opts.calldata;
        this.chainId = opts.chainId;
        this.expiry = opts.expiry;
        this.fee = opts.fee || null;
        this.integratorId = opts.integratorId || null;
        this.isCompleted = opts.isCompleted || false;
        this.lastLookResult = opts.lastLookResult || null;
        this.makerUri = opts.makerUri;
        this.metadata = opts.metadata || null;
        this.metaTransactionHash = opts.metaTransactionHash || null;
        this.order = opts.order || null;
        this.orderHash = opts.orderHash;
        this.status = opts.status || RfqmJobStatus.PendingEnqueued;
        this.updatedAt = opts.updatedAt || null;
        this.workerAddress = opts.workerAddress || null;
    }
}
