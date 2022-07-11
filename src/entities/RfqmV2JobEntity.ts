import { BigNumber } from '@0x/asset-swapper';
import { Signature } from '@0x/protocol-utils';
import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { Approval } from '../types';

import { BigNumberTransformer } from './transformers';
import { RfqmJobStatus, StoredFee, StoredOtcOrder } from './types';

export type RfqmV2JobConstructorOpts = Pick<
    RfqmV2JobEntity,
    'chainId' | 'expiry' | 'fee' | 'makerUri' | 'order' | 'orderHash'
> &
    Partial<RfqmV2JobEntity>;

@Entity({ name: 'rfqm_v2_jobs' })
export class RfqmV2JobEntity {
    // Differentiator for different flavors of RFQM jobs
    public kind: 'rfqm_v2_job';

    @PrimaryColumn({ name: 'order_hash', type: 'varchar' })
    public orderHash: string;

    @Index()
    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
    public createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
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

    @Column({ name: 'fee', type: 'jsonb' })
    public fee: StoredFee;

    @Column({ name: 'order', type: 'jsonb' })
    public order: StoredOtcOrder;

    @Column({ name: 'worker_address', type: 'varchar', nullable: true })
    public workerAddress: string | null;

    @Column({ name: 'last_look_result', type: 'boolean', nullable: true })
    public lastLookResult: boolean | null;

    @Column({ name: 'affiliate_address', type: 'varchar', nullable: true })
    public affiliateAddress: string | null;

    // The taker's signature of the order hash.
    // Should be deleted upon job failure or last look rejection.
    @Column({ name: 'taker_signature', type: 'jsonb', nullable: true })
    public takerSignature: Signature | null;

    // The maker's signature of the order hash.
    // Should be deleted upon job failure.
    @Column({ name: 'maker_signature', type: 'jsonb', nullable: true })
    public makerSignature: Signature | null;

    // Whether the maker wrapped native token will be unwrapped to the native token
    // when passed to the taker
    @Column({ name: 'is_unwrap', type: Boolean })
    public isUnwrap: boolean;

    // When a market maker rejects a last look, the server queries the market maker
    // for a price for the same trade that was just rejected (same pair and size).
    // The difference between the rejected price and the new price is stored here.
    @Column({ name: 'll_reject_price_difference_bps', type: 'integer', nullable: true })
    public llRejectPriceDifferenceBps: number | null;

    // The optional approval object that contains the EIP-712 context (which includes
    // the message that the taker will sign). This is stored to help us prepare the
    // calldata for gasless approvals
    @Column({ name: 'approval', type: 'jsonb', nullable: true })
    public approval: Approval | null;

    // The signature for the approval.
    @Column({ name: 'approval_signature', type: 'jsonb', nullable: true })
    public approvalSignature: Signature | null;

    // TypeORM runs a validation check where it calls this initializer with no argument.
    // With no default `opts`, `opts` will be undefined and the validation will throw,
    // therefore, add this hacky default.
    // tslint:disable-next-line no-object-literal-type-assertion
    constructor(opts: RfqmV2JobConstructorOpts = {} as RfqmV2JobConstructorOpts) {
        this.kind = 'rfqm_v2_job';

        // allow createdAt overrides for testing
        if (opts.createdAt) {
            this.createdAt = opts.createdAt;
        }

        this.affiliateAddress = opts.affiliateAddress ?? null;
        this.approval = opts.approval ?? null;
        this.approvalSignature = opts.approvalSignature ?? null;
        this.chainId = opts.chainId;
        this.expiry = opts.expiry;
        this.fee = opts.fee;
        this.integratorId = opts.integratorId ?? null;
        this.isUnwrap = opts.isUnwrap ?? false;
        this.lastLookResult = opts.lastLookResult ?? null;
        this.llRejectPriceDifferenceBps = opts.llRejectPriceDifferenceBps ?? null;
        this.makerSignature = opts.makerSignature ?? null;
        this.makerUri = opts.makerUri;
        this.order = opts.order;
        this.orderHash = opts.orderHash;
        this.status = opts.status ?? RfqmJobStatus.PendingEnqueued;
        this.takerSignature = opts.takerSignature ?? null;
        this.updatedAt = opts.updatedAt ?? null;
        this.workerAddress = opts.workerAddress ?? null;
    }
}
